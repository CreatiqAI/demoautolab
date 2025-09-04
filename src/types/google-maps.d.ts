declare global {
  interface Window {
    google: {
      maps: {
        places: {
          AutocompleteService: new() => google.maps.places.AutocompleteService;
          AutocompleteSuggestion: new() => google.maps.places.AutocompleteSuggestion;
          PlacesService: new(map: google.maps.Map) => google.maps.places.PlacesService;
          PlacesServiceStatus: {
            OK: string;
            ZERO_RESULTS: string;
            OVER_QUERY_LIMIT: string;
            REQUEST_DENIED: string;
            INVALID_REQUEST: string;
            NOT_FOUND: string;
            UNKNOWN_ERROR: string;
          };
        };
        Map: new(element: HTMLElement, options?: any) => google.maps.Map;
      };
    };
  }
}

declare namespace google.maps.places {
  interface AutocompleteService {
    getPlacePredictions(
      request: {
        input: string;
        componentRestrictions?: { country: string };
        types?: string[];
        fields?: string[];
      },
      callback: (predictions: AutocompletePrediction[] | null, status: string) => void
    ): void;
  }

  interface AutocompleteSuggestion {
    getPlacePredictions(
      request: {
        input: string;
        componentRestrictions?: { country: string };
        types?: string[];
        fields?: string[];
      },
      callback: (predictions: AutocompletePrediction[] | null, status: string) => void
    ): void;
  }

  interface AutocompletePrediction {
    place_id: string;
    description: string;
    structured_formatting?: {
      main_text: string;
      secondary_text?: string;
    };
  }

  interface PlacesService {
    getDetails(
      request: {
        placeId: string;
        fields: string[];
      },
      callback: (place: PlaceResult | null, status: string) => void
    ): void;
  }

  interface PlaceResult {
    formatted_address?: string;
    address_components?: AddressComponent[];
    geometry?: {
      location: {
        lat(): number;
        lng(): number;
      };
    };
  }

  interface AddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
  }
}

export {};