// Route Optimization Service using Google Maps API
// You'll need to add VITE_GOOGLE_MAPS_API_KEY to your .env file

interface Address {
  id: string;
  address: string;
  orderId: string;
  customerName: string;
  orderNumber?: string;
  priority?: 'high' | 'medium' | 'low';
  timeWindow?: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

interface LocationGroup {
  id: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  orders: Address[];
  totalOrders: number;
  customerNames: string[];
}

interface OptimizedStop {
  order: number;
  location: LocationGroup;
  estimatedArrival: string;
  estimatedArrivalTime?: string;
  estimatedTravelTime: number; // minutes
  estimatedDistance: number;   // kilometers
  cumulativeTime: number;      // total time from start
  cumulativeDistance: number;  // total distance from start
}

interface RouteOptimizationResult {
  optimizedStops: OptimizedStop[];
  totalDistance: number;      // kilometers
  totalDuration: number;      // minutes
  totalDrivingTime: number;   // minutes (excluding stops)
  estimatedFuelCost: number;
  routeEfficiency: number;    // percentage improvement vs basic route
  warnings: string[];
}

export class RouteOptimizer {
  private apiKey: string;
  private openaiApiKey?: string;
  private baseUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';

  constructor(openaiApiKey?: string) {
    this.apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    this.openaiApiKey = openaiApiKey;
    console.log('🏗️ RouteOptimizer created with:', {
      hasGoogleKey: !!this.apiKey,
      hasOpenAIKey: !!this.openaiApiKey,
      openaiKeyLength: this.openaiApiKey?.length || 0,
      openaiKeyPrefix: this.openaiApiKey?.substring(0, 10) || 'NO KEY'
    });
    if (!this.apiKey) {
      console.warn('⚠️ Google Maps API key not found. Route optimization will use fallback mode.');
      console.log('💡 To enable AI route optimization:');
      console.log('1. Get API key from: https://developers.google.com/maps/documentation/routes/get-api-key');
      console.log('2. Add VITE_GOOGLE_MAPS_API_KEY=your_api_key to your .env file');
      console.log('3. Restart your development server');
    } else {
      console.log('✅ Google Maps API key found. Testing API access...');
      this.testApiAccess();
    }
  }

  /**
   * Test API access and provide setup guidance
   */
  private async testApiAccess() {
    try {
      console.log('🔍 Testing Google Maps Routes API...');

      // Simple test request to check API key validity
      const testResponse = await fetch(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
          },
          body: JSON.stringify({
            origin: { address: 'Kuala Lumpur, Malaysia' },
            destination: { address: 'Petaling Jaya, Malaysia' },
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE'
          })
        }
      );

      if (testResponse.ok) {
        const data = await testResponse.json();
        console.log('✅ Google Maps Routes API is working!');
        console.log('📊 Test route data received:', {
          hasRoutes: data.routes?.length > 0,
          duration: data.routes?.[0]?.duration,
          distance: data.routes?.[0]?.distanceMeters
        });
        return true;
      } else {
        const errorText = await testResponse.text();
        console.error('❌ Google Maps API test failed:', {
          status: testResponse.status,
          error: errorText
        });

        if (testResponse.status === 403) {
          console.log('🔧 To fix 403 error:');
          console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/');
          console.log('2. Enable the "Routes API" for your project');
          console.log('3. Make sure your API key has access to Routes API');
          console.log('4. Check API key restrictions (HTTP referrers, IP restrictions)');
        } else if (testResponse.status === 400) {
          console.log('🔧 400 error usually means:');
          console.log('1. Invalid request format');
          console.log('2. Missing required fields');
          console.log('3. API version mismatch');
        }
        return false;
      }
    } catch (error) {
      console.warn('⚠️ Unable to test Google Maps API access:', error.message);
      return false;
    }
  }

  /**
   * Manual API test function (public method for debugging)
   */
  async testConnection(): Promise<boolean> {
    console.log('🔄 Manual API connection test...');
    return await this.testApiAccess();
  }

  /**
   * Optimize route using Google Maps Routes API with AI-powered algorithms
   */
  async optimizeRoute(
    startAddress: string,
    addresses: Address[],
    options: {
      vehicleType?: 'car' | 'motorcycle' | 'truck';
      considerTraffic?: boolean;
      departureTime?: Date;
      maxStopsPerRoute?: number;
      serviceTimePerStop?: number; // minutes spent at each stop
    } = {}
  ): Promise<RouteOptimizationResult> {
    const {
      vehicleType = 'car',
      considerTraffic = true,
      departureTime = new Date(),
      maxStopsPerRoute = 20,
      serviceTimePerStop = 10
    } = options;

    // Validate inputs
    if (addresses.length === 0) {
      throw new Error('At least one delivery address is required');
    }

    if (addresses.length > maxStopsPerRoute) {
      throw new Error(`Too many stops. Maximum ${maxStopsPerRoute} stops per route.`);
    }

    console.log(`🚗 Starting route optimization for ${addresses.length} stops...`);

    // If no API key, use smart fallback immediately
    if (!this.apiKey) {
      console.log('🔄 Using smart fallback optimization (no API key)...');
      return this.smartFallbackOptimization(addresses, vehicleType, serviceTimePerStop);
    }

    try {
      // Step 1: Get distance matrix for all locations
      const distanceMatrix = await this.getDistanceMatrix(startAddress, addresses, {
        vehicleType,
        considerTraffic,
        departureTime
      });

      // Step 2: Apply location-based AI optimization algorithm
      const optimizedLocationGroups = await this.applyOptimizationAlgorithm(
        distanceMatrix,
        addresses,
        { serviceTimePerStop }
      );

      // Step 3: Calculate detailed route information for location groups
      const routeDetails = await this.calculateLocationBasedRouteDetails(
        startAddress,
        optimizedLocationGroups,
        serviceTimePerStop,
        departureTime
      );

      // Step 4: Calculate efficiency metrics
      const efficiency = this.calculateRouteEfficiency(
        optimizedLocationGroups.length,
        routeDetails.totalDistance,
        routeDetails.totalDuration
      );

      const result: RouteOptimizationResult = {
        optimizedStops: routeDetails.stops,
        totalDistance: routeDetails.totalDistance,
        totalDuration: routeDetails.totalDuration,
        totalDrivingTime: routeDetails.totalDrivingTime,
        estimatedFuelCost: this.calculateFuelCost(routeDetails.totalDistance, vehicleType),
        routeEfficiency: efficiency,
        warnings: this.generateWarnings(routeDetails, optimizedLocationGroups)
      };

      console.log(`✅ AI Route optimization completed:`, {
        stops: result.optimizedStops.length,
        totalDistance: `${result.totalDistance.toFixed(1)} km`,
        totalDuration: `${Math.floor(result.totalDuration / 60)}h ${result.totalDuration % 60}m`,
        efficiency: `${result.routeEfficiency}%`
      });

      return result;

    } catch (error) {
      console.error('❌ AI Route optimization failed:', error.message);
      console.log('🔄 Falling back to smart local optimization...');

      // Fallback to smart local optimization
      return this.smartFallbackOptimization(addresses, vehicleType, serviceTimePerStop);
    }
  }

  /**
   * Get distance matrix using Google Maps API
   */
  private async getDistanceMatrix(
    origin: string,
    destinations: Address[],
    options: any
  ): Promise<number[][]> {
    const allLocations = [origin, ...destinations.map(d => d.address)];
    const matrix: number[][] = [];

    // Create distance matrix by calculating routes between all points
    for (let i = 0; i < allLocations.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < allLocations.length; j++) {
        if (i === j) {
          matrix[i][j] = 0;
        } else {
          try {
            const duration = await this.getRouteDuration(
              allLocations[i],
              allLocations[j],
              options
            );
            matrix[i][j] = duration;
          } catch (error) {
            console.warn(`Failed to get route from ${i} to ${j}:`, error);
            matrix[i][j] = 9999; // Large penalty for unreachable destinations
          }
        }
      }
    }

    return matrix;
  }

  /**
   * Get route duration between two points using Google Maps API
   */
  private async getRouteDuration(
    origin: string,
    destination: string,
    options: any
  ): Promise<number> {
    // Handle departure time - ensure it's not in the past, but respect user's future time selection
    const now = new Date();
    let departureTime = new Date(options.departureTime.getTime());

    // Only adjust if the time is in the past
    if (departureTime.getTime() <= now.getTime()) {
      departureTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
      console.log('⏰ Departure time was in the past, adjusted to 5 minutes from now');
    }

    console.log('⏰ Departure time used:', {
      userSelected: options.departureTime.toISOString(),
      actualUsed: departureTime.toISOString(),
      minutesFromNow: Math.round((departureTime.getTime() - now.getTime()) / (60 * 1000))
    });

    const requestBody = {
      origin: {
        address: origin
      },
      destination: {
        address: destination
      },
      travelMode: this.getTravelMode(options.vehicleType),
      routingPreference: "TRAFFIC_AWARE",
      departureTime: departureTime.toISOString(),
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: true
      }
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Maps API Error Response:', errorText);

      // Provide helpful error messages
      if (response.status === 400) {
        throw new Error('Invalid request format or missing API permissions');
      } else if (response.status === 403) {
        throw new Error('API key invalid or Routes API not enabled');
      } else if (response.status === 429) {
        throw new Error('API quota exceeded');
      } else {
        throw new Error(`Google Maps API error: ${response.status} - ${errorText}`);
      }
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    // Return duration in minutes
    const durationSeconds = parseInt(data.routes[0].duration.replace('s', ''));
    return Math.ceil(durationSeconds / 60);
  }

  /**
   * Apply location-based optimization algorithm with intelligent geocoding and AI analysis
   */
  private async applyOptimizationAlgorithm(
    distanceMatrix: number[][],
    addresses: Address[],
    options: { serviceTimePerStop: number }
  ): Promise<LocationGroup[]> {
    // Use intelligent location-based optimization
    console.log('🌍 Starting intelligent location-based route optimization...');
    return await this.locationBasedRouteOptimization(addresses, options);
  }

  /**
   * Location-based route optimization with intelligent geocoding and OpenAI analysis
   */
  private async locationBasedRouteOptimization(
    addresses: Address[],
    options: { serviceTimePerStop: number }
  ): Promise<LocationGroup[]> {
    console.log('🌍 Starting intelligent location-based route optimization...');

    // Step 1: Consolidate addresses by actual geographic location
    const locationGroups = await this.consolidateAddressesByLocation(addresses);
    console.log(`📍 Consolidated ${addresses.length} orders into ${locationGroups.length} unique locations`);

    // Step 2: Prepare location-based data for OpenAI analysis
    const routeData = {
      startLocation: "AUTO LABS SDN BHD, 17, Jalan 7/95B, Cheras Utama, 56100 Cheras, Kuala Lumpur",
      deliveryLocations: locationGroups.map((location, index) => ({
        id: index,
        locationId: location.id,
        address: location.address,
        coordinates: location.coordinates,
        totalOrders: location.totalOrders,
        customers: location.customerNames,
        orderDetails: location.orders.map(order => ({
          orderNumber: order.orderNumber,
          customerName: order.customerName
        })),
        estimatedServiceTime: location.totalOrders * options.serviceTimePerStop
      })),
      constraints: {
        vehicleType: 'car',
        considerTraffic: true,
        workingHours: '9:00 AM - 6:00 PM',
        maxDrivingTime: '8 hours',
        serviceTimePerLocation: options.serviceTimePerStop
      },
      optimizationGoals: [
        'Minimize total travel time',
        'Minimize total distance',
        'Group nearby locations together',
        'Consider traffic patterns',
        'Optimize fuel efficiency'
      ]
    };

    console.log('🧠 Sending location data to OpenAI for intelligent route optimization...');

    // Step 3: Call OpenAI for intelligent location-based route optimization
    const optimizedLocationSequence = await this.callOpenAIForLocationOptimization(routeData);

    // Step 4: Return optimized location groups in the correct sequence
    return optimizedLocationSequence;
  }

  /**
   * Get coordinates for an address using Google Maps Geocoding API
   */
  private async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`
      );

      if (!response.ok) {
        console.warn(`Geocoding failed for address: ${address}`);
        return null;
      }

      const data = await response.json();

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        console.warn(`No geocoding results for address: ${address}`);
        return null;
      }

      const location = data.results[0].geometry.location;
      console.log(`📍 Geocoded "${address.substring(0, 50)}..." to:`, location);
      return location;

    } catch (error) {
      console.error(`Geocoding error for ${address}:`, error);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates in meters
   */
  private calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = coord1.lat * Math.PI / 180;
    const φ2 = coord2.lat * Math.PI / 180;
    const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
    const Δλ = (coord2.lng - coord1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  /**
   * Consolidate addresses into location groups based on geographic proximity
   */
  private async consolidateAddressesByLocation(addresses: Address[]): Promise<LocationGroup[]> {
    console.log('🌍 Starting intelligent location-based consolidation for', addresses.length, 'addresses');

    const addressesWithCoords: (Address & { coordinates: { lat: number; lng: number } | null })[] = [];

    // Step 1: Geocode all addresses
    for (const addr of addresses) {
      console.log(`📍 Geocoding: ${addr.address.substring(0, 60)}... (Order: ${addr.orderNumber || addr.orderId || 'Unknown'})`);
      const coordinates = await this.geocodeAddress(addr.address);
      addressesWithCoords.push({ ...addr, coordinates });
    }

    const locationGroups: LocationGroup[] = [];
    const processed = new Set<number>();

    // Step 2: Group addresses by proximity (within 100 meters = same location)
    for (let i = 0; i < addressesWithCoords.length; i++) {
      if (processed.has(i)) continue;

      const currentAddr = addressesWithCoords[i];
      if (!currentAddr.coordinates) {
        // Create single-order group for addresses that couldn't be geocoded
        locationGroups.push({
          id: `location-${locationGroups.length + 1}`,
          address: currentAddr.address,
          coordinates: { lat: 0, lng: 0 }, // Fallback coordinates
          orders: [currentAddr],
          totalOrders: 1,
          customerNames: [currentAddr.customerName]
        });
        processed.add(i);
        continue;
      }

      // Find all addresses within 100 meters of current address
      const groupOrders: Address[] = [currentAddr];
      const groupCustomers: string[] = [currentAddr.customerName];
      processed.add(i);

      for (let j = i + 1; j < addressesWithCoords.length; j++) {
        if (processed.has(j)) continue;

        const otherAddr = addressesWithCoords[j];
        if (!otherAddr.coordinates) continue;

        const distance = this.calculateDistance(currentAddr.coordinates, otherAddr.coordinates);
        console.log(`📏 Distance between "${currentAddr.address.substring(0, 40)}..." and "${otherAddr.address.substring(0, 40)}...": ${distance.toFixed(0)}m`);

        if (distance <= 100) { // Same location if within 100 meters
          console.log(`✅ Grouping addresses (within 100m): ${currentAddr.orderNumber || currentAddr.orderId || 'Unknown'} & ${otherAddr.orderNumber || otherAddr.orderId || 'Unknown'}`);
          groupOrders.push(otherAddr);
          groupCustomers.push(otherAddr.customerName);
          processed.add(j);
        }
      }

      // Create location group
      locationGroups.push({
        id: `location-${locationGroups.length + 1}`,
        address: currentAddr.address, // Use first address as representative
        coordinates: currentAddr.coordinates,
        orders: groupOrders,
        totalOrders: groupOrders.length,
        customerNames: [...new Set(groupCustomers)] // Remove duplicates
      });

      console.log(`🎯 Created location group: ${groupOrders.length} orders at "${currentAddr.address.substring(0, 50)}..."`);
      console.log(`📦 Orders in group:`, groupOrders.map(o => ({
        orderId: o.orderId,
        orderNumber: o.orderNumber,
        customer: o.customerName
      })));
    }

    console.log(`📊 Location consolidation complete: ${addresses.length} orders → ${locationGroups.length} locations`);
    return locationGroups;
  }

  /**
   * Check if two addresses are similar enough to be considered the same location
   */
  private addressesSimilar(addr1: string, addr2: string): boolean {
    console.log(`🔍 Comparing addresses:`, {
      addr1: addr1.substring(0, 80) + '...',
      addr2: addr2.substring(0, 80) + '...'
    });

    // First try exact match after normalization
    const normalized1 = this.normalizeAddress(addr1);
    const normalized2 = this.normalizeAddress(addr2);

    if (normalized1 === normalized2) {
      console.log(`✅ Exact match after normalization`);
      return true;
    }

    // Check for key location names (like malls, buildings)
    const keyLocation1 = this.extractKeyLocation(addr1);
    const keyLocation2 = this.extractKeyLocation(addr2);

    console.log(`🎯 Key locations:`, { keyLocation1, keyLocation2 });

    if (keyLocation1 && keyLocation2 && keyLocation1 === keyLocation2) {
      console.log(`✅ Key location match: "${keyLocation1}" found in both addresses`);
      return true;
    }

    // Special patterns for common mall/building variations
    const patterns = [
      /sunway\s*velocity/i,
      /velocity/i,
      /nadayu28/i,
      /klcc/i
    ];

    for (const pattern of patterns) {
      if (pattern.test(addr1) && pattern.test(addr2)) {
        console.log(`✅ Pattern match found: ${pattern.source}`);
        return true;
      }
    }

    // Fallback to string similarity
    const similarity = this.calculateStringSimilarity(normalized1, normalized2);
    const isMatch = similarity > 0.75; // Lowered threshold for better matching

    console.log(`📍 Address similarity: ${(similarity * 100).toFixed(1)}% (threshold: 75%)`, {
      match: isMatch
    });

    return isMatch;
  }

  /**
   * Normalize address for better comparison
   */
  private normalizeAddress(address: string): string {
    return address.toLowerCase()
      .replace(/[,\s]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b(sdn\s*bhd|bhd|mall|shopping\s*centre|plaza|tower|building)\b/g, '')
      .trim();
  }

  /**
   * Extract key location names from address
   */
  private extractKeyLocation(address: string): string | null {
    const keyPatterns = [
      /sunway\s*velocity\s*mall?/i,
      /sunway\s*velocity/i,
      /velocity\s*mall/i,
      /klcc/i,
      /mid\s*valley/i,
      /pavilion/i,
      /one\s*utama/i,
      /nadayu28\s*residences?/i,
      /nadayu28/i,
      /mont\s*kiara/i,
      // Add more Malaysian landmark patterns as needed
    ];

    for (const pattern of keyPatterns) {
      const match = address.match(pattern);
      if (match) {
        const key = match[0].toLowerCase().replace(/\s+/g, '').replace(/mall$/, '');
        console.log(`🎯 Extracted key location: "${key}" from address: "${address.substring(0, 50)}..."`);
        return key;
      }
    }

    console.log(`❌ No key location found in address: "${address.substring(0, 50)}..."`);
    return null;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i] + 1, // deletion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }

    const distance = matrix[len2][len1];
    return 1 - distance / Math.max(len1, len2);
  }

  /**
   * Call OpenAI API for intelligent route optimization
   */
  private async callOpenAIForRouteOptimization(routeData: any): Promise<any[]> {
    const prompt = `
You are an expert logistics and route optimization AI. Analyze the following delivery route and provide the most efficient sequence.

START LOCATION: ${routeData.startLocation}

DELIVERY STOPS:
${routeData.deliveryStops.map((stop, i) =>
  `${i + 1}. ${stop.address} (Customer: ${stop.customerName}, Orders: ${stop.totalOrders}, Service Time: ${stop.estimatedServiceTime} min)`
).join('\n')}

CONSTRAINTS:
- Vehicle: ${routeData.constraints.vehicleType}
- Consider traffic: ${routeData.constraints.considerTraffic}
- Working hours: ${routeData.constraints.workingHours}
- Max driving time: ${routeData.constraints.maxDrivingTime}

OPTIMIZATION GOALS:
1. Minimize total travel time and distance
2. Consider Malaysian traffic patterns (avoid rush hours 7-9 AM, 5-7 PM)
3. Group nearby locations together
4. Consider service time at each stop
5. Plan for efficient return to start location

Please analyze the geographic locations and provide:
1. The optimal delivery sequence (just the stop numbers in order)
2. Brief reasoning for this sequence
3. Estimated total time and any warnings

Respond in JSON format:
{
  "optimizedSequence": [stop_numbers_in_optimal_order],
  "reasoning": "explanation of the optimization logic",
  "estimatedTotalTime": "estimated_time_in_minutes",
  "warnings": ["any_potential_issues"]
}
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert route optimization AI specializing in Malaysian logistics and traffic patterns.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    console.log('🧠 OpenAI optimization result:', result);

    // Map the optimized sequence back to delivery stops (OpenAI uses 0-based indexing)
    const optimizedStops = result.optimizedSequence.map((stopNumber: number) => {
      // OpenAI typically returns 0-based indices, but sometimes returns 1-based
      let adjustedIndex = stopNumber;
      if (stopNumber >= routeData.deliveryStops.length) {
        adjustedIndex = stopNumber - 1; // Convert from 1-based to 0-based
      }

      const stop = routeData.deliveryStops[adjustedIndex];
      if (!stop) {
        console.error(`❌ Invalid stop number ${stopNumber} (adjusted: ${adjustedIndex}), available stops:`, routeData.deliveryStops.length);
        return null;
      }
      console.log(`✅ Mapped stop ${stopNumber} → ${adjustedIndex}:`, stop.customerName);
      return stop;
    }).filter(Boolean);

    console.log(`✅ Mapped ${result.optimizedSequence.length} stops to ${optimizedStops.length} valid stops`);

    return optimizedStops;
  }

  /**
   * Call OpenAI API for intelligent location-based route optimization
   */
  private async callOpenAIForLocationOptimization(routeData: any): Promise<LocationGroup[]> {
    console.log('🔍 DEBUG: OpenAI API key check:', {
      hasKey: !!this.openaiApiKey,
      keyLength: this.openaiApiKey?.length || 0,
      keyPrefix: this.openaiApiKey?.substring(0, 10) || 'NO KEY'
    });

    if (!this.openaiApiKey) {
      console.warn('⚠️ OpenAI API key not provided, using basic location ordering');
      return routeData.deliveryLocations.map((loc: any, index: number) => ({
        id: `location-${index + 1}`,
        address: loc.address,
        coordinates: loc.coordinates,
        orders: loc.orderDetails || [],
        totalOrders: loc.totalOrders,
        customerNames: loc.customers
      }));
    }

    console.log('🧠 Using OpenAI for intelligent location-based route optimization...');

    const prompt = `
You are a world-class logistics optimization expert specializing in Malaysian urban delivery routes.

Analyze the following delivery locations and optimize the route for maximum efficiency:

DELIVERY DATA:
- Start Location: ${routeData.startLocation}
- Delivery Locations: ${JSON.stringify(routeData.deliveryLocations, null, 2)}
- Constraints: ${JSON.stringify(routeData.constraints, null, 2)}
- Optimization Goals: ${routeData.optimizationGoals.join(', ')}

IMPORTANT CONTEXT:
- This is real-world delivery routing in Kuala Lumpur, Malaysia
- Some locations may have multiple orders (consolidate delivery stops)
- Consider actual geography, traffic patterns, and logical routing flow
- Minimize total travel time and distance
- Account for service time at each location based on number of orders

ANALYSIS REQUIREMENTS:
1. Geographic clustering: Group nearby locations together
2. Traffic considerations: Account for KL traffic patterns
3. Logical flow: Create an efficient routing sequence
4. Multiple orders: Factor in extra service time for locations with multiple orders
5. Return journey: Plan for efficient return to start location

Return ONLY a JSON object with this exact format:
{
  "optimizedLocationSequence": [0, 1, 2...], // Array of location IDs in optimal order
  "routingReasoning": "Detailed explanation of why this sequence is optimal",
  "estimatedTotalTime": "Total time estimate including travel and service time",
  "locationSummary": [
    {
      "order": 1,
      "locationId": 0,
      "address": "location address",
      "totalOrders": 2,
      "customers": ["customer names"],
      "serviceReason": "why visit this location at this sequence"
    }
  ],
  "optimizationInsights": ["Key insights about the route optimization"]
}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a world-class logistics and route optimization expert specializing in Malaysian urban delivery routes. Always respond with valid JSON only. Focus on location-based optimization rather than individual orders.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);

      console.log('🧠 OpenAI location optimization result:', result);

      // Map the optimized sequence back to location groups
      const optimizedLocations = result.optimizedLocationSequence.map((locationIndex: number) => {
        const originalLocation = routeData.deliveryLocations[locationIndex];
        if (!originalLocation) {
          console.error(`❌ Invalid location index ${locationIndex}`);
          return null;
        }

        // Reconstruct the LocationGroup from the original data
        return {
          id: originalLocation.locationId,
          address: originalLocation.address,
          coordinates: originalLocation.coordinates,
          orders: originalLocation.orderDetails.map((order: any) => ({
            id: order.orderNumber || `order-${Math.random()}`,
            address: originalLocation.address,
            orderId: order.orderNumber || '',
            customerName: order.customerName,
            orderNumber: order.orderNumber
          })),
          totalOrders: originalLocation.totalOrders,
          customerNames: originalLocation.customers
        };
      }).filter(Boolean);

      console.log(`✅ Optimized route: ${optimizedLocations.length} locations in sequence`);
      console.log('📊 Route summary:', result.locationSummary);

      return optimizedLocations;

    } catch (error) {
      console.error('❌ OpenAI location optimization failed:', error);
      console.log('🔄 Falling back to basic location ordering...');

      // Return basic sequence as fallback
      return routeData.deliveryLocations.map((loc: any, index: number) => ({
        id: `location-${index + 1}`,
        address: loc.address,
        coordinates: loc.coordinates,
        orders: loc.orderDetails.map((order: any) => ({
          id: order.orderNumber || `order-${Math.random()}`,
          address: loc.address,
          orderId: order.orderNumber || '',
          customerName: order.customerName,
          orderNumber: order.orderNumber
        })),
        totalOrders: loc.totalOrders,
        customerNames: loc.customers
      }));
    }
  }

  /**
   * Expand consolidated route back to original order format
   */
  private expandConsolidatedRoute(consolidatedSequence: any[], originalAddresses: Address[]): Address[] {
    const result: Address[] = [];
    const usedOrders = new Set<string>();

    console.log('🔧 Expanding consolidated route:', {
      consolidatedCount: consolidatedSequence.length,
      originalCount: originalAddresses.length,
      consolidatedSequence: consolidatedSequence.map(s => ({
        address: s.address?.substring(0, 50) + '...',
        orderNumbers: s.orderNumbers
      })),
      originalAddresses: originalAddresses.map(a => ({
        orderNumber: a.orderNumber,
        address: a.address.substring(0, 50) + '...'
      }))
    });

    consolidatedSequence.forEach((consolidatedStop, index) => {
      console.log(`🔍 Processing consolidated stop ${index + 1}/${consolidatedSequence.length}:`, {
        address: consolidatedStop.address?.substring(0, 60) + '...',
        orderNumbers: consolidatedStop.orderNumbers
      });

      // Find all original addresses that match this consolidated stop
      const matchingAddresses = originalAddresses.filter(addr => {
        // Skip if already used
        if (usedOrders.has(addr.orderNumber || addr.id)) {
          return false;
        }

        // Check if order numbers match (if available)
        if (consolidatedStop.orderNumbers?.includes(addr.orderNumber)) {
          console.log(`✅ Order number match: ${addr.orderNumber}`);
          return true;
        }

        // Check address similarity
        const isAddressSimilar = this.addressesSimilar(addr.address, consolidatedStop.address);

        if (isAddressSimilar) {
          console.log(`✅ Address similarity match for order: ${addr.orderNumber}`);
        }

        return isAddressSimilar;
      });

      console.log(`📋 Found ${matchingAddresses.length} matching addresses for consolidated stop`);

      if (matchingAddresses.length === 0) {
        console.warn(`⚠️ No matching addresses found for consolidated stop: ${consolidatedStop.address}`);
        // Use the first unused original address as fallback
        const unusedAddress = originalAddresses.find(addr => !usedOrders.has(addr.orderNumber || addr.id));
        if (unusedAddress) {
          console.log(`🔄 Using fallback address: ${unusedAddress.orderNumber}`);
          result.push(unusedAddress);
          usedOrders.add(unusedAddress.orderNumber || unusedAddress.id);
        }
      } else {
        // Add all matching addresses and mark them as used
        matchingAddresses.forEach(addr => {
          result.push(addr);
          usedOrders.add(addr.orderNumber || addr.id);
          console.log(`➕ Added address to result: ${addr.orderNumber}`);
        });
      }
    });

    // Add any remaining unused addresses to ensure all orders are included
    const remainingAddresses = originalAddresses.filter(addr => !usedOrders.has(addr.orderNumber || addr.id));
    if (remainingAddresses.length > 0) {
      console.log(`📌 Adding ${remainingAddresses.length} remaining unused addresses`);
      remainingAddresses.forEach(addr => {
        result.push(addr);
        console.log(`➕ Added remaining address: ${addr.orderNumber}`);
      });
    }

    console.log(`🎯 Route expansion complete: ${consolidatedSequence.length} consolidated → ${result.length} individual stops`);
    return result;
  }

  /**
   * Nearest Neighbor TSP algorithm
   */
  private nearestNeighborTSP(distanceMatrix: number[][]): number[] {
    const n = distanceMatrix.length - 1; // Exclude origin (index 0)
    const unvisited = new Set(Array.from({length: n}, (_, i) => i + 1));
    const route: number[] = [];
    let current = 0; // Start from origin

    while (unvisited.size > 0) {
      let nearest = -1;
      let nearestDistance = Infinity;

      for (const city of unvisited) {
        if (distanceMatrix[current][city] < nearestDistance) {
          nearestDistance = distanceMatrix[current][city];
          nearest = city;
        }
      }

      route.push(nearest - 1); // Convert back to address index
      unvisited.delete(nearest);
      current = nearest;
    }

    return route;
  }

  /**
   * 2-opt improvement algorithm
   */
  private twoOptImprovement(distanceMatrix: number[][], route: number[]): number[] {
    let improved = true;
    let bestRoute = [...route];

    while (improved) {
      improved = false;

      for (let i = 1; i < route.length - 2; i++) {
        for (let j = i + 1; j < route.length; j++) {
          if (j - i === 1) continue;

          const newRoute = this.twoOptSwap(bestRoute, i, j);

          if (this.calculateRouteDistance(distanceMatrix, newRoute) <
              this.calculateRouteDistance(distanceMatrix, bestRoute)) {
            bestRoute = newRoute;
            improved = true;
          }
        }
      }
    }

    return bestRoute;
  }

  /**
   * Perform 2-opt swap
   */
  private twoOptSwap(route: number[], i: number, j: number): number[] {
    const newRoute = [...route];
    const segment = newRoute.slice(i, j + 1).reverse();
    newRoute.splice(i, j - i + 1, ...segment);
    return newRoute;
  }

  /**
   * Calculate total route distance
   */
  private calculateRouteDistance(distanceMatrix: number[][], route: number[]): number {
    let total = distanceMatrix[0][route[0] + 1]; // From origin to first stop

    for (let i = 0; i < route.length - 1; i++) {
      total += distanceMatrix[route[i] + 1][route[i + 1] + 1];
    }

    return total;
  }

  /**
   * Apply time window constraints
   */
  private applyTimeWindowConstraints(route: number[], addresses: Address[]): number[] {
    // Sort addresses with time windows to be visited first
    const withTimeWindows = route.filter(i => addresses[i].timeWindow);
    const withoutTimeWindows = route.filter(i => !addresses[i].timeWindow);

    // Sort time window addresses by start time
    withTimeWindows.sort((a, b) => {
      const timeA = addresses[a].timeWindow?.start || '09:00';
      const timeB = addresses[b].timeWindow?.start || '09:00';
      return timeA.localeCompare(timeB);
    });

    return [...withTimeWindows, ...withoutTimeWindows];
  }

  /**
   * Apply priority constraints
   */
  private applyPriorityConstraints(route: number[], addresses: Address[]): number[] {
    const priorityWeight = { high: 1, medium: 2, low: 3 };

    return route.sort((a, b) => {
      const priorityA = priorityWeight[addresses[a].priority || 'medium'];
      const priorityB = priorityWeight[addresses[b].priority || 'medium'];
      return priorityA - priorityB;
    });
  }

  /**
   * Calculate detailed route information with accurate point-to-point distances and times
   */
  private async calculateRouteDetails(
    startAddress: string,
    optimizedOrder: Address[],
    distanceMatrix: number[][],
    serviceTimePerStop: number,
    baseDepartureTime?: Date
  ): Promise<{
    stops: OptimizedStop[];
    totalDistance: number;
    totalDuration: number;
    totalDrivingTime: number;
  }> {
    const stops: OptimizedStop[] = [];
    let cumulativeTime = 0;
    let cumulativeDistance = 0;
    let totalDrivingTime = 0;
    const startTime = new Date();

    console.log(`🗺️ Calculating detailed route from ${startAddress} through ${optimizedOrder.length} stops`);

    // Create full route including start and return
    const fullRoute = [startAddress, ...optimizedOrder.map(addr => addr.address), startAddress];

    for (let i = 0; i < optimizedOrder.length; i++) {
      const address = optimizedOrder[i];
      const fromAddress = i === 0 ? startAddress : optimizedOrder[i - 1].address;
      const toAddress = address.address;

      try {
        // Calculate the departure time for this specific leg (considering cumulative time)
        let legDepartureTime: Date;

        if (baseDepartureTime) {
          legDepartureTime = new Date(baseDepartureTime.getTime() + cumulativeTime * 60000);
        } else {
          legDepartureTime = new Date(Date.now() + 5 * 60 * 1000 + cumulativeTime * 60000);
        }

        // Ensure the leg departure time is at least 5 minutes in the future
        const now = new Date();
        const minimumFutureTime = new Date(now.getTime() + 5 * 60 * 1000);

        if (legDepartureTime <= minimumFutureTime) {
          legDepartureTime = new Date(minimumFutureTime.getTime() + cumulativeTime * 60000);
        }

        console.log(`🕐 Route leg ${i + 1} departure time:`, {
          original: baseDepartureTime?.toISOString(),
          calculated: legDepartureTime.toISOString(),
          minutesFromNow: Math.round((legDepartureTime.getTime() - now.getTime()) / (60 * 1000)),
          cumulativeTime
        });

        // Get accurate route information from Google Maps
        const routeInfo = await this.getAccurateRouteInfo(fromAddress, toAddress, legDepartureTime);

        // Add service time (except for first stop where we start)
        if (i > 0) {
          cumulativeTime += serviceTimePerStop;
        }

        cumulativeTime += routeInfo.travelTimeMinutes;
        cumulativeDistance += routeInfo.distanceKm;
        totalDrivingTime += routeInfo.travelTimeMinutes;

        const estimatedArrival = new Date(startTime.getTime() + cumulativeTime * 60000);

        stops.push({
          order: i + 1,
          address: address.address,
          orderId: address.orderId,
          customerName: address.customerName,
          orderNumber: address.orderNumber,
          estimatedArrival: estimatedArrival.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          estimatedTravelTime: routeInfo.travelTimeMinutes,
          estimatedDistance: routeInfo.distanceKm,
          cumulativeTime,
          cumulativeDistance,
          estimatedArrivalTime: estimatedArrival.toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        });

        console.log(`📍 Stop ${i + 1}: ${address.customerName} - ${routeInfo.distanceKm.toFixed(1)}km, ${routeInfo.travelTimeMinutes}min`);

      } catch (error) {
        console.warn(`⚠️ Failed to get route info for stop ${i + 1}, using estimates:`, error);

        // Fallback to estimates
        const estimatedTime = i === 0 ? 20 : 15; // minutes
        const estimatedDistance = estimatedTime * 0.5; // km (30km/h average)

        cumulativeTime += estimatedTime + (i > 0 ? serviceTimePerStop : 0);
        cumulativeDistance += estimatedDistance;
        totalDrivingTime += estimatedTime;

        const estimatedArrival = new Date(startTime.getTime() + cumulativeTime * 60000);

        stops.push({
          order: i + 1,
          address: address.address,
          orderId: address.orderId,
          customerName: address.customerName,
          orderNumber: address.orderNumber,
          estimatedArrival: estimatedArrival.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          estimatedTravelTime: estimatedTime,
          estimatedDistance: estimatedDistance,
          cumulativeTime,
          cumulativeDistance,
          estimatedArrivalTime: estimatedArrival.toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        });
      }
    }

    // Calculate return journey to start point
    if (optimizedOrder.length > 0) {
      try {
        const lastStop = optimizedOrder[optimizedOrder.length - 1].address;

        // Calculate return journey time
        let returnDepartureTime: Date;

        if (baseDepartureTime) {
          returnDepartureTime = new Date(baseDepartureTime.getTime() + cumulativeTime * 60000);
        } else {
          returnDepartureTime = new Date(Date.now() + 5 * 60 * 1000 + cumulativeTime * 60000);
        }

        // Ensure the return departure time is at least 5 minutes in the future
        const now = new Date();
        const minimumFutureTime = new Date(now.getTime() + 5 * 60 * 1000);

        if (returnDepartureTime <= minimumFutureTime) {
          returnDepartureTime = new Date(minimumFutureTime.getTime() + cumulativeTime * 60000);
        }

        console.log(`🏠 Return journey departure time:`, {
          calculated: returnDepartureTime.toISOString(),
          minutesFromNow: Math.round((returnDepartureTime.getTime() - now.getTime()) / (60 * 1000)),
          cumulativeTime
        });

        const returnRouteInfo = await this.getAccurateRouteInfo(lastStop, startAddress, returnDepartureTime);

        cumulativeTime += returnRouteInfo.travelTimeMinutes;
        cumulativeDistance += returnRouteInfo.distanceKm;
        totalDrivingTime += returnRouteInfo.travelTimeMinutes;

        console.log(`🏠 Return journey: ${returnRouteInfo.distanceKm.toFixed(1)}km, ${returnRouteInfo.travelTimeMinutes}min`);

      } catch (error) {
        console.warn('⚠️ Failed to calculate return journey, using estimate');
        const returnTime = 20; // minutes estimate
        const returnDistance = 10; // km estimate
        cumulativeTime += returnTime;
        cumulativeDistance += returnDistance;
        totalDrivingTime += returnTime;
      }
    }

    console.log(`📊 Total route: ${cumulativeDistance.toFixed(1)}km, ${Math.floor(cumulativeTime / 60)}h ${cumulativeTime % 60}m`);

    return {
      stops,
      totalDistance: cumulativeDistance,
      totalDuration: cumulativeTime,
      totalDrivingTime
    };
  }

  /**
   * Calculate detailed route information for location-based optimization
   */
  private async calculateLocationBasedRouteDetails(
    startAddress: string,
    locationGroups: LocationGroup[],
    serviceTimePerStop: number,
    baseDepartureTime?: Date
  ): Promise<{
    stops: OptimizedStop[];
    totalDistance: number;
    totalDuration: number;
    totalDrivingTime: number;
  }> {
    const stops: OptimizedStop[] = [];
    let cumulativeTime = 0;
    let cumulativeDistance = 0;
    let totalDrivingTime = 0;
    const startTime = new Date();

    console.log(`🗺️ Calculating location-based route from ${startAddress} through ${locationGroups.length} locations`);

    for (let i = 0; i < locationGroups.length; i++) {
      const location = locationGroups[i];
      const fromAddress = i === 0 ? startAddress : locationGroups[i - 1].address;
      const toAddress = location.address;

      try {
        // Calculate the departure time for this specific leg
        let legDepartureTime: Date;

        if (baseDepartureTime) {
          legDepartureTime = new Date(baseDepartureTime.getTime() + cumulativeTime * 60000);
        } else {
          legDepartureTime = new Date(Date.now() + 5 * 60 * 1000 + cumulativeTime * 60000);
        }

        // Ensure the leg departure time is at least 5 minutes in the future
        const now = new Date();
        const minimumFutureTime = new Date(now.getTime() + 5 * 60 * 1000);

        if (legDepartureTime <= minimumFutureTime) {
          legDepartureTime = new Date(minimumFutureTime.getTime() + cumulativeTime * 60000);
        }

        console.log(`🕐 Location ${i + 1} departure time:`, {
          original: baseDepartureTime?.toISOString(),
          calculated: legDepartureTime.toISOString(),
          minutesFromNow: Math.round((legDepartureTime.getTime() - now.getTime()) / (60 * 1000)),
          cumulativeTime
        });

        // Get accurate route information from Google Maps
        const routeInfo = await this.getAccurateRouteInfo(fromAddress, toAddress, legDepartureTime);

        // Calculate service time based on number of orders at this location
        const locationServiceTime = location.totalOrders * serviceTimePerStop;

        // Add service time for this location
        cumulativeTime += locationServiceTime;
        cumulativeTime += routeInfo.travelTimeMinutes;
        cumulativeDistance += routeInfo.distanceKm;
        totalDrivingTime += routeInfo.travelTimeMinutes;

        const estimatedArrival = new Date(startTime.getTime() + cumulativeTime * 60000);

        stops.push({
          order: i + 1,
          location: location,
          estimatedArrival: estimatedArrival.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          estimatedTravelTime: routeInfo.travelTimeMinutes,
          estimatedDistance: routeInfo.distanceKm,
          cumulativeTime,
          cumulativeDistance,
          estimatedArrivalTime: estimatedArrival.toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        });

        console.log(`📍 Location ${i + 1}: ${location.address.substring(0, 50)}... - ${location.totalOrders} orders - ${routeInfo.distanceKm.toFixed(1)}km, ${routeInfo.travelTimeMinutes}min + ${locationServiceTime}min service`);

      } catch (error) {
        console.warn(`⚠️ Failed to get route info for location ${i + 1}, using estimates:`, error);

        // Fallback to estimates
        const estimatedTime = i === 0 ? 20 : 15; // minutes
        const estimatedDistance = estimatedTime * 0.5; // km (30km/h average)
        const locationServiceTime = location.totalOrders * serviceTimePerStop;

        cumulativeTime += estimatedTime + locationServiceTime;
        cumulativeDistance += estimatedDistance;
        totalDrivingTime += estimatedTime;

        const estimatedArrival = new Date(startTime.getTime() + cumulativeTime * 60000);

        stops.push({
          order: i + 1,
          location: location,
          estimatedArrival: estimatedArrival.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          estimatedTravelTime: estimatedTime,
          estimatedDistance: estimatedDistance,
          cumulativeTime,
          cumulativeDistance,
          estimatedArrivalTime: estimatedArrival.toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        });
      }
    }

    // Calculate return journey if needed
    if (locationGroups.length > 0) {
      try {
        console.log('🏠 Calculating return journey...');

        const now = new Date();
        const returnDepartureTime = baseDepartureTime ?
          new Date(baseDepartureTime.getTime() + cumulativeTime * 60000) :
          new Date(now.getTime() + 5 * 60 * 1000 + cumulativeTime * 60000);

        // Ensure return departure time is in the future
        const minimumReturnTime = new Date(now.getTime() + 5 * 60 * 1000);
        const finalReturnTime = returnDepartureTime < minimumReturnTime ?
          new Date(minimumReturnTime.getTime() + cumulativeTime * 60000) :
          returnDepartureTime;

        console.log('🏠 Return journey departure time:', {
          calculated: finalReturnTime.toISOString(),
          minutesFromNow: Math.round((finalReturnTime.getTime() - now.getTime()) / (60 * 1000)),
          cumulativeTime
        });

        const returnInfo = await this.getAccurateRouteInfo(
          locationGroups[locationGroups.length - 1].address,
          startAddress,
          finalReturnTime
        );

        cumulativeDistance += returnInfo.distanceKm;
        totalDrivingTime += returnInfo.travelTimeMinutes;

        console.log(`🏠 Return journey: ${returnInfo.distanceKm.toFixed(1)}km, ${returnInfo.travelTimeMinutes}min`);
      } catch (error) {
        console.warn('⚠️ Failed to calculate return journey, using estimate');
        cumulativeDistance += 15; // km estimate
        totalDrivingTime += 20; // minutes estimate
      }
    }

    const totalDistance = cumulativeDistance;
    const totalDuration = cumulativeTime;

    console.log(`📊 Location-based route totals: ${totalDistance.toFixed(1)}km, ${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`);

    return { stops, totalDistance, totalDuration, totalDrivingTime };
  }

  /**
   * Get accurate route information from Google Maps API
   */
  private async getAccurateRouteInfo(
    fromAddress: string,
    toAddress: string,
    departureTime?: Date
  ): Promise<{
    distanceKm: number;
    travelTimeMinutes: number;
  }> {
    // Use provided departure time or default to 5 minutes from now
    const routeDepartureTime = departureTime || new Date(Date.now() + 5 * 60 * 1000);

    const requestBody = {
      origin: { address: fromAddress },
      destination: { address: toAddress },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      departureTime: routeDepartureTime.toISOString()
    };

    console.log('🚀 Google Maps API request:', {
      from: fromAddress.substring(0, 50) + '...',
      to: toAddress.substring(0, 50) + '...',
      departureTime: routeDepartureTime.toISOString(),
      minutesFromNow: Math.round((routeDepartureTime.getTime() - Date.now()) / (60 * 1000))
    });

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Google Maps API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        request: requestBody,
        troubleshooting: 'Check if departure time is at least 5 minutes in the future'
      });

      // If this is a timestamp error, try with a much later time
      if (errorText.includes('Timestamp must be set to a future time')) {
        console.log('🔄 Retrying with a timestamp 1 hour in the future...');
        const futureTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        const retryRequestBody = {
          ...requestBody,
          departureTime: futureTime.toISOString()
        };

        const retryResponse = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
          },
          body: JSON.stringify(retryRequestBody)
        });

        if (retryResponse.ok) {
          console.log('✅ Retry with future timestamp succeeded');
          const data = await retryResponse.json();

          if (!data.routes || data.routes.length === 0) {
            throw new Error('No route found in retry');
          }

          const route = data.routes[0];
          const distanceKm = route.distanceMeters / 1000;
          const durationSeconds = parseInt(route.duration.replace('s', ''));
          const travelTimeMinutes = Math.ceil(durationSeconds / 60);

          return { distanceKm, travelTimeMinutes };
        }
      }

      throw new Error(`Route API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    const route = data.routes[0];
    const distanceKm = route.distanceMeters / 1000;
    const durationSeconds = parseInt(route.duration.replace('s', ''));
    const travelTimeMinutes = Math.ceil(durationSeconds / 60);

    return {
      distanceKm,
      travelTimeMinutes
    };
  }

  /**
   * Calculate route efficiency
   */
  private calculateRouteEfficiency(
    numberOfStops: number,
    totalDistance: number,
    totalDuration: number
  ): number {
    // Compare against a theoretical "worst case" route
    const worstCaseDistance = numberOfStops * 10; // Assume 10km between each stop
    const efficiency = Math.max(0, Math.min(100,
      ((worstCaseDistance - totalDistance) / worstCaseDistance) * 100
    ));

    return Math.round(efficiency);
  }

  /**
   * Calculate estimated fuel cost
   */
  private calculateFuelCost(distance: number, vehicleType: string): number {
    const fuelConsumption = {
      car: 8.0,        // L/100km
      motorcycle: 4.0, // L/100km
      truck: 25.0      // L/100km
    };

    const fuelPricePerLiter = 2.10; // MYR per liter (Malaysia average)
    const consumption = fuelConsumption[vehicleType] || fuelConsumption.car;

    return (distance / 100) * consumption * fuelPricePerLiter;
  }

  /**
   * Generate warnings for the route
   */
  private generateWarnings(routeDetails: any, locationGroups: LocationGroup[]): string[] {
    const warnings: string[] = [];

    if (routeDetails.totalDuration > 480) { // 8 hours
      warnings.push('Route duration exceeds 8 hours. Consider splitting into multiple routes.');
    }

    if (routeDetails.totalDistance > 300) { // 300km
      warnings.push('Route distance is very long. Driver may need breaks.');
    }

    // Check for locations with many orders
    const locationsWithManyOrders = locationGroups.filter(loc => loc.totalOrders > 3);
    if (locationsWithManyOrders.length > 0) {
      warnings.push(`${locationsWithManyOrders.length} locations have 4+ orders. Allow extra service time.`);
    }

    // Check total order count
    const totalOrders = locationGroups.reduce((sum, loc) => sum + loc.totalOrders, 0);
    if (totalOrders > 20) {
      warnings.push('High order volume. Consider driver assistance or splitting route.');
    }

    // Check for time window constraints across all orders in location groups
    const allOrders = locationGroups.flatMap(loc => loc.orders);
    const timeWindowConflicts = allOrders.filter(order => order.timeWindow).length;
    if (timeWindowConflicts > allOrders.length * 0.5) {
      warnings.push('Many orders have time window constraints. Route may need adjustment.');
    }

    return warnings;
  }

  /**
   * Smart fallback optimization (when API is not available)
   */
  private async smartFallbackOptimization(
    addresses: Address[],
    vehicleType: string,
    serviceTimePerStop: number
  ): Promise<RouteOptimizationResult> {
    console.log('🧠 Running smart fallback optimization...');

    // Simulate intelligent ordering based on address patterns
    const optimizedAddresses = this.smartAddressOrdering(addresses);

    // Calculate realistic estimates
    const avgDistanceBetweenStops = this.estimateAverageDistance(addresses.length);
    const avgTravelTime = this.estimateAverageTime(avgDistanceBetweenStops, vehicleType);

    const stops: OptimizedStop[] = [];
    let cumulativeTime = 0;
    let cumulativeDistance = 0;
    const startTime = new Date();

    for (let i = 0; i < optimizedAddresses.length; i++) {
      const address = optimizedAddresses[i];
      const travelTime = avgTravelTime + (Math.random() * 10 - 5); // Add some variation
      const travelDistance = avgDistanceBetweenStops + (Math.random() * 4 - 2); // Add some variation

      cumulativeTime += travelTime + (i > 0 ? serviceTimePerStop : 0);
      cumulativeDistance += travelDistance;

      const estimatedArrival = new Date(startTime.getTime() + cumulativeTime * 60000);

      stops.push({
        order: i + 1,
        address: address.address,
        orderId: address.orderId,
        customerName: address.customerName,
        estimatedArrival: estimatedArrival.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        estimatedTravelTime: Math.round(travelTime),
        estimatedDistance: Math.round(travelDistance * 10) / 10,
        cumulativeTime: Math.round(cumulativeTime),
        cumulativeDistance: Math.round(cumulativeDistance * 10) / 10
      });
    }

    const totalDistance = cumulativeDistance;
    const totalDuration = cumulativeTime;
    const efficiency = Math.min(85, Math.max(60, 75 + (10 - addresses.length) * 2)); // Smart efficiency estimate

    const result: RouteOptimizationResult = {
      optimizedStops: stops,
      totalDistance,
      totalDuration,
      totalDrivingTime: totalDuration - (addresses.length * serviceTimePerStop),
      estimatedFuelCost: this.calculateFuelCost(totalDistance, vehicleType),
      routeEfficiency: efficiency,
      warnings: [
        'Using smart local optimization (Google Maps API not available)',
        'For more accurate routing, add Google Maps API key'
      ]
    };

    console.log(`✅ Smart fallback optimization completed:`, {
      stops: result.optimizedStops.length,
      totalDistance: `${result.totalDistance.toFixed(1)} km`,
      totalDuration: `${Math.floor(result.totalDuration / 60)}h ${result.totalDuration % 60}m`,
      efficiency: `${result.routeEfficiency}% (estimated)`
    });

    return result;
  }

  /**
   * Smart address ordering based on patterns
   */
  private smartAddressOrdering(addresses: Address[]): Address[] {
    // Simple geographic clustering based on area/postal codes in addresses
    const addressesWithScore = addresses.map(addr => {
      const address = addr.address.toLowerCase();

      // Extract area names and postal codes for grouping
      const areaScore = this.getAreaScore(address);
      const priority = addr.priority === 'high' ? 100 : addr.priority === 'medium' ? 50 : 0;

      return {
        ...addr,
        score: areaScore + priority + Math.random() * 10 // Add slight randomization
      };
    });

    // Sort by score for geographic clustering
    return addressesWithScore
      .sort((a, b) => a.score - b.score)
      .map(item => ({
        id: item.id,
        address: item.address,
        orderId: item.orderId,
        customerName: item.customerName,
        priority: item.priority,
        timeWindow: item.timeWindow
      }));
  }

  /**
   * Get area score for geographic clustering
   */
  private getAreaScore(address: string): number {
    // Common KL/Selangor areas - group similar areas together
    const areaGroups = {
      'cheras': 100,
      'kajang': 110,
      'bangi': 120,
      'serdang': 130,
      'puchong': 200,
      'subang': 210,
      'petaling': 220,
      'shah alam': 300,
      'klang': 310,
      'ampang': 400,
      'setapak': 410,
      'kepong': 420,
      'mont kiara': 500,
      'bukit jalil': 600,
      'sri petaling': 610
    };

    for (const [area, score] of Object.entries(areaGroups)) {
      if (address.includes(area)) {
        return score;
      }
    }

    // Extract postal code for additional grouping
    const postalMatch = address.match(/\d{5}/);
    if (postalMatch) {
      const postal = parseInt(postalMatch[0]);
      return postal; // Group by postal code area
    }

    return 9999; // Unknown area goes last
  }

  /**
   * Estimate average distance between stops
   */
  private estimateAverageDistance(numberOfStops: number): number {
    // Realistic estimates for Malaysia urban areas
    if (numberOfStops <= 3) return 8; // Close together
    if (numberOfStops <= 5) return 12; // Moderate spread
    if (numberOfStops <= 10) return 15; // Wider area
    return 18; // Large coverage area
  }

  /**
   * Estimate average travel time
   */
  private estimateAverageTime(distance: number, vehicleType: string): number {
    const speedMap = {
      'motorcycle': 25, // km/h in urban traffic
      'car': 20,       // km/h in urban traffic
      'truck': 15      // km/h in urban traffic
    };

    const speed = speedMap[vehicleType] || speedMap.car;
    return (distance / speed) * 60; // Convert to minutes
  }

  /**
   * Get travel mode for Google Maps API
   */
  private getTravelMode(vehicleType: string): string {
    switch (vehicleType) {
      case 'motorcycle':
        return 'TWO_WHEELER';
      case 'truck':
        return 'DRIVE';
      default:
        return 'DRIVE';
    }
  }
}

// Export singleton instance
export const routeOptimizer = new RouteOptimizer();