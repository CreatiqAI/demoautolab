import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AddressSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, components?: any) => void;
  placeholder?: string;
  required?: boolean;
}

const AddressAutocompleteSimple: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Type address like 'Nadayu28' or 'KLCC'...",
  required = false
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<any>(null);

  // Initialize Google Places API with reliable AutocompleteService
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        try {
          // Use AutocompleteService (reliable and well-documented)
          autocompleteService.current = new window.google.maps.places.AutocompleteService();
          setIsGoogleMapsLoaded(true);
        } catch (error) {
          console.error('Error initializing Google Maps:', error);
        }
        return;
      }

      // Load Google Maps API if not already loaded
      if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
        const script = document.createElement('script');
        const apiKey = 'AIzaSyDZJ6_oq2uAI4FnA3Lj2nuiV8GFkKOMtXU';
        
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initMap`;
        script.async = true;
        script.defer = true;
        
        // Create a global callback function
        (window as any).initMap = () => {
          try {
            autocompleteService.current = new window.google.maps.places.AutocompleteService();
            setIsGoogleMapsLoaded(true);
          } catch (error) {
            console.error('Error in callback:', error);
          }
        };
        
        script.onerror = () => {
          console.error('Failed to load Google Maps API - check your API key and billing settings');
        };
        
        document.head.appendChild(script);
      }
    };

    initializeGoogleMaps();
  }, []);

  const searchAddresses = async (query: string) => {
    if (!query.trim() || query.length < 3 || !autocompleteService.current) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // Use only establishment type to avoid mixing issues
      const request = {
        input: query,
        componentRestrictions: { country: 'MY' },
        types: ['establishment']
      };

      autocompleteService.current.getPlacePredictions(request, (predictions: any[], status: string) => {
        if (status === 'OK' && predictions && predictions.length > 0) {
          const formattedSuggestions = predictions.map(prediction => ({
            place_id: prediction.place_id,
            description: prediction.description,
            main_text: prediction.structured_formatting?.main_text || prediction.description,
            secondary_text: prediction.structured_formatting?.secondary_text || ''
          }));
          setSuggestions(formattedSuggestions);
        } else {
          // Fallback: search for addresses/geocode
          const geocodeRequest = {
            input: query,
            componentRestrictions: { country: 'MY' },
            types: ['geocode']
          };

          autocompleteService.current.getPlacePredictions(geocodeRequest, (geocodePredictions: any[], geocodeStatus: string) => {
            if (geocodeStatus === 'OK' && geocodePredictions) {
              const formattedSuggestions = geocodePredictions.map(prediction => ({
                place_id: prediction.place_id,
                description: prediction.description,
                main_text: prediction.structured_formatting?.main_text || prediction.description,
                secondary_text: prediction.structured_formatting?.secondary_text || ''
              }));
              setSuggestions(formattedSuggestions);
            } else {
              setSuggestions([]);
            }
          });
        }
        setLoading(false);
      });
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setLoading(false);
      setSuggestions([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    if (newValue.length >= 3) {
      searchAddresses(newValue);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectAddress = (suggestion: AddressSuggestion) => {
    onChange(suggestion.description);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow clicks on suggestions
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div className="relative">
      <Label htmlFor="address">
        Address {required && '*'}
      </Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id="address"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={isGoogleMapsLoaded ? placeholder : "Loading address search..."}
          disabled={!isGoogleMapsLoaded}
          className="pr-10"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {loading ? (
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      
      {!isGoogleMapsLoaded && (
        <p className="text-xs text-muted-foreground mt-1">
          Loading Google Maps for address search...
        </p>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion.place_id}
              variant="ghost"
              className="w-full justify-start p-3 h-auto text-left hover:bg-gray-50"
              onClick={() => selectAddress(suggestion)}
            >
              <MapPin className="h-4 w-4 text-muted-foreground mr-3 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {suggestion.main_text}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {suggestion.secondary_text}
                </p>
              </div>
            </Button>
          ))}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && !loading && value.length >= 3 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3">
          <p className="text-sm text-muted-foreground">No addresses found. Try a different search term.</p>
        </div>
      )}
    </div>
  );
};

export default AddressAutocompleteSimple;