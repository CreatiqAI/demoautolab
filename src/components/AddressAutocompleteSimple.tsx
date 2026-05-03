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

export interface ExtractedAddressComponents {
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface AddressAutocompleteProps {
  value: string;
  /**
   * Fired when the address text changes. The optional `components` param is
   * populated only when the user picks a Google suggestion — it contains
   * structured city / state / postcode etc. extracted from the Place's
   * address_components. Manual typing still fires onChange but with no
   * components, so callers can fall back to manual fields.
   */
  onChange: (address: string, components?: ExtractedAddressComponents) => void;
  placeholder?: string;
  required?: boolean;
  showLabel?: boolean;
  label?: string;
}

const AddressAutocompleteSimple: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Type address like 'Nadayu28' or 'KLCC'...",
  required = false,
  showLabel = true,
  label = 'Address',
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);

  // Initialize Google Places API with reliable AutocompleteService
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        try {
          autocompleteService.current = new window.google.maps.places.AutocompleteService();
          // PlacesService needs an HTMLElement (or a Map) to render attribution.
          // A throwaway div is enough since we never display anything.
          const attrDiv = document.createElement('div');
          placesService.current = new window.google.maps.places.PlacesService(attrDiv);
          setIsGoogleMapsLoaded(true);
        } catch (error) {
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
            const attrDiv = document.createElement('div');
            placesService.current = new window.google.maps.places.PlacesService(attrDiv);
            setIsGoogleMapsLoaded(true);
          } catch (error) {
          }
        };
        
        script.onerror = () => {
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

  // Pull city / state / postcode out of a Google place's address_components.
  // The Google component types we care about:
  //   - locality                       => city
  //   - administrative_area_level_1    => state (e.g. "Selangor", "Kuala Lumpur")
  //   - postal_code                    => postcode
  //   - country                        => country
  // Some Malaysian places use "administrative_area_level_2" for city when
  // locality is missing, so we fall back to that.
  const extractComponents = (placeDetails: any): ExtractedAddressComponents => {
    const out: ExtractedAddressComponents = {};
    const comps: any[] = placeDetails?.address_components || [];
    for (const c of comps) {
      const types: string[] = c.types || [];
      if (types.includes('postal_code')) out.postcode = c.long_name;
      else if (types.includes('locality')) out.city = c.long_name;
      else if (!out.city && types.includes('administrative_area_level_2')) out.city = c.long_name;
      else if (types.includes('administrative_area_level_1')) out.state = c.long_name;
      else if (types.includes('country')) out.country = c.long_name;
    }
    if (placeDetails?.geometry?.location) {
      out.latitude = typeof placeDetails.geometry.location.lat === 'function'
        ? placeDetails.geometry.location.lat()
        : placeDetails.geometry.location.lat;
      out.longitude = typeof placeDetails.geometry.location.lng === 'function'
        ? placeDetails.geometry.location.lng()
        : placeDetails.geometry.location.lng;
    }
    return out;
  };

  const selectAddress = (suggestion: AddressSuggestion) => {
    setSuggestions([]);
    setShowSuggestions(false);
    // Fire a synchronous onChange first with the address text, so the input
    // updates immediately. Then asynchronously enrich with components.
    onChange(suggestion.description);
    if (placesService.current) {
      placesService.current.getDetails(
        {
          placeId: suggestion.place_id,
          fields: ['address_components', 'geometry', 'formatted_address'],
        },
        (place: any, status: string) => {
          if (status !== 'OK' || !place) return;
          const components = extractComponents(place);
          // Fire onChange again, this time with components so the caller can
          // populate city / state / postcode automatically.
          onChange(suggestion.description, components);
        }
      );
    }
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
      {showLabel && (
        <Label htmlFor="address">
          {label} {required && '*'}
        </Label>
      )}
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