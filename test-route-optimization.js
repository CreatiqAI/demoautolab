// Simple test script to test route optimization with timestamp fix
import { RouteOptimizer } from './src/services/routeOptimizer.ts';

const API_KEY = 'AIzaSyDZJ6_oq2uAI4FnA3Lj2nuiV8GFkKOMtXU';

async function testRouteOptimization() {
  console.log('🚀 Testing Route Optimization with Timestamp Fix...');

  const routeOptimizer = new RouteOptimizer(API_KEY);

  // Test addresses in Kuala Lumpur
  const startAddress = 'AUTO LABS SDN BHD, 17, Jalan 7/95B, Cheras Utama, 56100 Cheras, Kuala Lumpur';
  const addresses = [
    {
      id: 'test1',
      address: '123 Jalan Bukit Bintang, Bukit Bintang, 55100 Kuala Lumpur, Malaysia',
      customerName: 'Ahmad Abdullah',
      orderNumber: 'ROUTE-TEST-001'
    },
    {
      id: 'test2',
      address: '456 Jalan Ampang, KLCC, 50450 Kuala Lumpur, Malaysia',
      customerName: 'Siti Nurhaliza',
      orderNumber: 'ROUTE-TEST-002'
    },
    {
      id: 'test3',
      address: '789 Jalan Sultan Ismail, Chow Kit, 50250 Kuala Lumpur, Malaysia',
      customerName: 'Raj Kumar',
      orderNumber: 'ROUTE-TEST-003'
    }
  ];

  try {
    console.log('📍 Starting address:', startAddress);
    console.log('🎯 Delivery addresses:', addresses.map(a => a.address));

    const result = await routeOptimizer.optimizeRoute(startAddress, addresses, {
      vehicleType: 'car',
      considerTraffic: true,
      departureTime: new Date(), // This should automatically be adjusted to 5+ minutes in the future
      maxStopsPerRoute: 25,
      serviceTimePerStop: 10
    });

    console.log('✅ Route optimization completed successfully!');
    console.log('📊 Results:', {
      totalDistance: `${result.totalDistance.toFixed(1)} km`,
      totalDuration: `${Math.floor(result.totalDuration / 60)}h ${result.totalDuration % 60}m`,
      efficiency: `${result.routeEfficiency}%`,
      fuelCost: `RM ${result.estimatedFuelCost.toFixed(2)}`,
      warnings: result.warnings
    });

    console.log('🗺️ Optimized stops:');
    result.optimizedStops.forEach((stop, index) => {
      console.log(`  ${index + 1}. ${stop.customerName} - ${stop.address} (${stop.estimatedArrivalTime})`);
    });

    return result;
  } catch (error) {
    console.error('❌ Route optimization failed:', error.message);
    console.error('🔍 Error details:', error);
    throw error;
  }
}

// Run the test
testRouteOptimization()
  .then(() => {
    console.log('🎉 Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });