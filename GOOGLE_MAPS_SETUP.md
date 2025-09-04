# Google Maps API Setup

## Required API Key Configuration

The address autocomplete feature requires a valid Google Maps API key with the Places API enabled.

### 1. Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Places API (New)
   - Maps JavaScript API
   - Places API (Legacy) - for backward compatibility

### 2. Configure the API Key

Add your API key to your environment variables:

**For local development (.env file):**
```
VITE_GOOGLE_MAPS_API_KEY="your_api_key_here"
```

**For Vercel deployment:**
1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add `VITE_GOOGLE_MAPS_API_KEY` with your API key value

### 3. API Key Restrictions (Recommended)

For security, restrict your API key:

1. **Application restrictions:**
   - HTTP referrers (websites)
   - Add your domains (e.g., `yoursite.com/*`, `*.vercel.app/*`)

2. **API restrictions:**
   - Restrict key to: Places API (New), Maps JavaScript API, Places API (Legacy)

### 4. Billing

- Google Maps APIs require a billing account to be set up
- You get $200 free usage per month
- Make sure billing is enabled or the API will return `InvalidKey` errors

### 5. Common Issues

**InvalidKey Error:**
- Check if the API key is correct
- Ensure billing is enabled
- Verify the key isn't restricted to different domains

**Quota Exceeded:**
- Check your quota limits in Google Cloud Console
- Consider implementing rate limiting in your application

**AutocompleteService Deprecated Warning:**
- This is expected - the app now uses AutocompleteSuggestion when available
- Falls back to AutocompleteService for compatibility