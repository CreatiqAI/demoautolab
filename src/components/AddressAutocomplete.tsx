import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AddressSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface AddressComponents {
  street_number?: string;
  route?: string;
  locality?: string;
  administrative_area_level_1?: string;
  postal_code?: string;
  country?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, components?: AddressComponents) => void;
  placeholder?: string;
  required?: boolean;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
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
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  // Initialize Google Places API
  useEffect(() => {
    const initializeGoogleMaps = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        // Create a dummy map element for PlacesService (required by Google API)
        const mapDiv = document.createElement('div');
        const map = new window.google.maps.Map(mapDiv);
        placesService.current = new window.google.maps.places.PlacesService(map);
        setIsGoogleMapsLoaded(true);
        return;
      }

      // Load Google Maps API if not already loaded
      if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          autocompleteService.current = new window.google.maps.places.AutocompleteService();
          const mapDiv = document.createElement('div');
          const map = new window.google.maps.Map(mapDiv);
          placesService.current = new window.google.maps.places.PlacesService(map);
          setIsGoogleMapsLoaded(true);
        };
        script.onerror = () => {
          console.error('Failed to load Google Maps API');
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
      // First try establishment search
      const establishmentRequest = {
        input: query,
        componentRestrictions: { country: 'MY' },
        types: ['establishment']
      };

      autocompleteService.current.getPlacePredictions(establishmentRequest, (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
          setSuggestions(predictions.map(prediction => ({
            place_id: prediction.place_id,
            description: prediction.description,
            structured_formatting: {
              main_text: prediction.structured_formatting?.main_text || prediction.description,
              secondary_text: prediction.structured_formatting?.secondary_text || ''
            }
          })));
          setLoading(false);
        } else {
          // Fallback: try geocode search for addresses
          const geocodeRequest = {
            input: query,
            componentRestrictions: { country: 'MY' },
            types: ['geocode']
          };

          autocompleteService.current.getPlacePredictions(geocodeRequest, (geocodePredictions, geocodeStatus) => {
            if (geocodeStatus === window.google.maps.places.PlacesServiceStatus.OK && geocodePredictions) {
              setSuggestions(geocodePredictions.map(prediction => ({
                place_id: prediction.place_id,
                description: prediction.description,
                structured_formatting: {
                  main_text: prediction.structured_formatting?.main_text || prediction.description,
                  secondary_text: prediction.structured_formatting?.secondary_text || ''
                }
              })));
            } else {
              setSuggestions([]);
            }
            setLoading(false);
          });
        }
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
    if (!placesService.current) return;

    const request = {
      placeId: suggestion.place_id,
      fields: ['formatted_address', 'address_components', 'geometry']
    };

    placesService.current.getDetails(request, (place, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
        const formattedAddress = place.formatted_address || suggestion.description;
        
        // Parse address components
        const components: AddressComponents = {};
        if (place.address_components) {
          place.address_components.forEach(component => {
            const types = component.types;
            if (types.includes('street_number')) {
              components.street_number = component.long_name;
            } else if (types.includes('route')) {
              components.route = component.long_name;
            } else if (types.includes('locality')) {
              components.locality = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              components.administrative_area_level_1 = component.long_name;
            } else if (types.includes('postal_code')) {
              components.postal_code = component.long_name;
            } else if (types.includes('country')) {
              components.country = component.long_name;
            }
          });
        }

        onChange(formattedAddress, components);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    });
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
                  {suggestion.structured_formatting.main_text}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {suggestion.structured_formatting.secondary_text}
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

export default AddressAutocomplete;