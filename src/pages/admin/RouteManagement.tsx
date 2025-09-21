import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MapPin,
  Navigation,
  Truck,
  Clock,
  Route,
  User,
  Package,
  Printer,
  RefreshCw,
  Map,
  Calendar,
  Phone,
  MapIcon,
  CheckCircle,
  XCircle,
  RotateCcw,
  Eye,
  History,
  Trash2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { routeOptimizer, RouteOptimizer } from '@/services/routeOptimizer';

interface Order {
  id: string;
  order_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_method: string;
  delivery_address: any;
  total: number;
  status: string;
  created_at: string;
  order_items: Array<{
    id: string;
    component_sku: string;
    component_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle_type: string;
  license_plate: string;
  driver_type: 'local' | 'overstate';
  active: boolean;
}

interface RouteAssignment {
  id: string;
  driver_id: string;
  driver_name: string;
  route_date: string;
  departure_time: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  total_distance: number;
  total_duration: number;
  total_driving_time: number;
  estimated_fuel_cost: number;
  route_efficiency: number;
  optimization_method: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  cancelled_at?: string;
  notes?: string;
  stops: RouteStop[];
  orders: RouteOrder[];
}

interface RouteStop {
  id: string;
  route_assignment_id: string;
  stop_order: number;
  location_id: string;
  location_address: string;
  location_coordinates: { lat: number; lng: number };
  estimated_arrival_time?: string;
  actual_arrival_time?: string;
  estimated_travel_time: number;
  actual_travel_time?: number;
  estimated_distance: number;
  cumulative_time: number;
  cumulative_distance: number;
  status: 'pending' | 'arrived' | 'completed' | 'skipped';
}

interface RouteOrder {
  id: string;
  route_assignment_id: string;
  route_stop_id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  delivery_status: 'assigned' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned';
  delivered_at?: string;
  delivery_notes?: string;
  // Full order details with items
  order_details?: {
    id: string;
    total: number;
    status: string;
    delivery_address: any;
    order_items: Array<{
      id: string;
      component_sku: string;
      component_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
  };
}

export default function RouteManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routeAssignments, setRouteAssignments] = useState<RouteAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [filterByDeliveryMethod, setFilterByDeliveryMethod] = useState<string>('all');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isRouteViewDialogOpen, setIsRouteViewDialogOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteAssignment | null>(null);
  const [assignForm, setAssignForm] = useState({
    driver_id: '',
    route_date: new Date().toISOString().split('T')[0],
    departure_time: new Date().toTimeString().slice(0, 5) // HH:MM format
  });
  const [openaiApiKey] = useState(import.meta.env.VITE_OPENAI_API_KEY || '');
  const [activeTab, setActiveTab] = useState<'routes' | 'history'>('routes');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Debug: Check if OpenAI API key is loaded
  useEffect(() => {
    console.log('🔑 OpenAI API Key loaded:', openaiApiKey ? `${openaiApiKey.substring(0, 20)}...` : 'NOT FOUND');
    console.log('🌍 All env vars:', {
      VITE_OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY ? `${import.meta.env.VITE_OPENAI_API_KEY.substring(0, 20)}...` : 'NOT FOUND',
      VITE_GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? `${import.meta.env.VITE_GOOGLE_MAPS_API_KEY.substring(0, 20)}...` : 'NOT FOUND'
    });
  }, [openaiApiKey]);

  useEffect(() => {
    fetchData();
  }, []);

  // Test function for route optimization - can be called from browser console
  (window as any).testRouteOptimization = async () => {
    console.log('🧪 Testing route optimization with timestamp fix...');

    const testAddresses = [
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
      }
    ];

    try {
      const result = await optimizeRoute(orders.slice(0, 2), 'local');
      console.log('✅ Route optimization test successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Route optimization test failed:', error);
      throw error;
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchOrders(),
        fetchDrivers(),
        fetchRouteAssignments()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            component_sku,
            component_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('status', 'READY_FOR_DELIVERY')
        .in('delivery_method', ['local-driver', 'overstate-driver'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedOrders = (data || []).map((order: any) => ({
        id: order.id,
        order_no: order.order_no || `ORD-${order.id?.slice(0, 8)}`,
        customer_name: order.customer_name || 'Customer',
        customer_phone: order.customer_phone || '',
        customer_email: order.customer_email || '',
        delivery_method: order.delivery_method || 'local-driver',
        delivery_address: order.delivery_address || {},
        total: order.total || 0,
        status: order.status || 'READY_FOR_DELIVERY',
        created_at: order.created_at,
        order_items: order.order_items || []
      }));

      console.log(`Found ${transformedOrders.length} real orders ready for delivery`);
      setOrders(transformedOrders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders for route management",
        variant: "destructive"
      });
    }
  };

  const fetchDrivers = async () => {
    // Mock drivers for now - in real implementation, this would come from database
    const mockDrivers: Driver[] = [
      {
        id: 'driver1',
        name: 'Ahmad Abdullah',
        phone: '012-345-6789',
        vehicle_type: 'Van',
        license_plate: 'WA1234X',
        driver_type: 'local',
        active: true
      },
      {
        id: 'driver2',
        name: 'Lim Wei Ming',
        phone: '013-456-7890',
        vehicle_type: 'Motorcycle',
        license_plate: 'WB5678Y',
        driver_type: 'local',
        active: true
      },
      {
        id: 'driver3',
        name: 'Kumar Rajesh',
        phone: '014-567-8901',
        vehicle_type: 'Truck',
        license_plate: 'WC9012Z',
        driver_type: 'overstate',
        active: true
      }
    ];
    setDrivers(mockDrivers);
  };

  const fetchRouteAssignments = async () => {
    try {
      console.log('📦 Fetching route assignments from database...');

      // Fetch route assignments with related data
      const { data: routes, error: routesError } = await supabase
        .from('route_assignments')
        .select(`
          *,
          route_stops (
            *
          ),
          route_orders (
            *
          )
        `)
        .order('created_at', { ascending: false });

      if (routesError) {
        console.error('❌ Error fetching route assignments:', routesError);
        throw routesError;
      }

      console.log('✅ Fetched route assignments:', routes);

      // Now fetch full order details for each route
      const transformedRoutes: RouteAssignment[] = [];

      for (const route of routes || []) {
        // Get all order IDs for this route
        const orderIds = route.route_orders?.map((ro: any) => ro.order_id) || [];

        // Fetch full order details with items
        let fullOrderDetails: any[] = [];
        if (orderIds.length > 0) {
          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select(`
              id,
              order_no,
              customer_name,
              customer_phone,
              total,
              status,
              delivery_address,
              order_items (
                id,
                component_sku,
                component_name,
                quantity,
                unit_price,
                total_price
              )
            `)
            .in('id', orderIds);

          if (orderError) {
            console.error('❌ Error fetching order details:', orderError);
          } else {
            fullOrderDetails = orderData || [];
          }
        }

        // Transform route orders to include full order details
        const enhancedRouteOrders = (route.route_orders || []).map((routeOrder: any) => {
          const fullOrder = fullOrderDetails.find(order => order.id === routeOrder.order_id);
          return {
            ...routeOrder,
            order_details: fullOrder ? {
              id: fullOrder.id,
              total: fullOrder.total,
              status: fullOrder.status,
              delivery_address: fullOrder.delivery_address,
              order_items: fullOrder.order_items || []
            } : undefined
          };
        });

        // Transform route data to match interface
        transformedRoutes.push({
          id: route.id,
          driver_id: route.driver_id,
          driver_name: route.driver_name,
          route_date: route.route_date,
          departure_time: route.departure_time,
          status: route.status,
          total_distance: route.total_distance || 0,
          total_duration: route.total_duration || 0,
          total_driving_time: route.total_driving_time || 0,
          estimated_fuel_cost: route.estimated_fuel_cost || 0,
          route_efficiency: route.route_efficiency || 0,
          optimization_method: route.optimization_method || 'Unknown',
          created_at: route.created_at,
          updated_at: route.updated_at,
          completed_at: route.completed_at,
          cancelled_at: route.cancelled_at,
          notes: route.notes,
          stops: route.route_stops || [],
          orders: enhancedRouteOrders
        });
      }

      console.log('✅ Enhanced route assignments with order details:', transformedRoutes);
      setRouteAssignments(transformedRoutes);
    } catch (error) {
      console.error('❌ Error in fetchRouteAssignments:', error);
      toast({
        title: "Database Error",
        description: "Failed to fetch route assignments",
        variant: "destructive"
      });
    }
  };

  const handleOrderSelection = (orderId: string, checked: boolean) => {
    const newSelection = new Set(selectedOrders);
    if (checked) {
      newSelection.add(orderId);
    } else {
      newSelection.delete(orderId);
    }
    setSelectedOrders(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(filteredOrders.map(order => order.id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const optimizeRoute = async (
    selectedOrdersList: Order[],
    driverType: 'local' | 'overstate'
  ): Promise<{
    optimizedStops: any[];
    totalDistance: number;
    totalDuration: number;
    routeEfficiency: number;
    estimatedFuelCost: number;
    warnings: string[];
  }> => {
    try {
      // Prepare addresses for optimization
      const addresses = selectedOrdersList.map(order => ({
        id: order.id,
        address: order.delivery_address?.address || 'Address not provided',
        orderId: order.order_no,
        customerName: order.customer_name,
        orderNumber: order.order_no, // Add this field for proper display
        priority: 'medium' as const, // You can add priority logic based on order value/urgency
        timeWindow: undefined // You can add time windows if available in order data
      }));

      // Set starting point based on driver type
      const startAddress = driverType === 'local'
        ? 'AUTO LABS SDN BHD, 17, Jalan 7/95B, Cheras Utama, 56100 Cheras, Kuala Lumpur' // Your warehouse address
        : 'AUTO LABS SDN BHD, 17, Jalan 7/95B, Cheras Utama, 56100 Cheras, Kuala Lumpur'; // Same for now, but you can customize

      // Determine vehicle type based on number of orders
      const vehicleType = selectedOrdersList.length > 10 ? 'truck' :
                         selectedOrdersList.length > 5 ? 'car' : 'motorcycle';

      console.log(`🚗 Starting AI route optimization for ${addresses.length} deliveries:`, {
        startAddress,
        addresses: addresses.map(a => ({
          id: a.id,
          customer: a.customerName,
          address: a.address.substring(0, 50) + '...'
        }))
      });

      // Create RouteOptimizer instance with OpenAI API key if available
      const optimizer = openaiApiKey ? new RouteOptimizer(openaiApiKey) : routeOptimizer;

      // Create departure time from route date and time
      const departureTime = new Date(`${assignForm.route_date}T${assignForm.departure_time}:00`);

      console.log(`⏰ Departure time set:`, {
        date: assignForm.route_date,
        time: assignForm.departure_time,
        combined: departureTime.toISOString(),
        local: departureTime.toLocaleString(),
        isInFuture: departureTime > new Date()
      });

      // Call the AI route optimizer
      const result = await optimizer.optimizeRoute(startAddress, addresses, {
        vehicleType,
        considerTraffic: true,
        departureTime: departureTime,
        maxStopsPerRoute: 25,
        serviceTimePerStop: 10 // 10 minutes per delivery
      });

      console.log(`✅ AI Route optimization completed:`, {
        efficiency: `${result.routeEfficiency}%`,
        totalDistance: `${result.totalDistance.toFixed(1)} km`,
        totalTime: `${Math.floor(result.totalDuration / 60)}h ${result.totalDuration % 60}m`,
        fuelCost: `RM ${result.estimatedFuelCost.toFixed(2)}`
      });

      return {
        optimizedStops: result.optimizedStops,
        totalDistance: result.totalDistance,
        totalDuration: result.totalDuration,
        routeEfficiency: result.routeEfficiency,
        estimatedFuelCost: result.estimatedFuelCost,
        warnings: result.warnings
      };

    } catch (error) {
      console.error('❌ AI Route optimization failed:', error);

      // Fallback to simple optimization if AI fails
      console.log('🔄 Falling back to basic route optimization...');

      const fallbackStops = selectedOrdersList.map((order, index) => ({
        order: index + 1,
        address: order.delivery_address?.address || 'Address not provided',
        orderId: order.order_no,
        customerName: order.customer_name,
        estimatedArrival: new Date(Date.now() + (index + 1) * 45 * 60000).toLocaleTimeString(),
        estimatedTravelTime: 30 + Math.random() * 20,
        estimatedDistance: 8 + Math.random() * 12,
        cumulativeTime: (index + 1) * 45,
        cumulativeDistance: (index + 1) * 10
      }));

      return {
        optimizedStops: fallbackStops,
        totalDistance: fallbackStops.length * 10,
        totalDuration: fallbackStops.length * 45,
        routeEfficiency: 75,
        estimatedFuelCost: (fallbackStops.length * 10 * 0.15),
        warnings: ['AI optimization failed, using basic route planning']
      };
    }
  };

  const handleAssignToDriver = async () => {
    if (selectedOrders.size === 0) {
      toast({
        title: "No Orders Selected",
        description: "Please select at least one order to assign",
        variant: "destructive"
      });
      return;
    }

    if (!assignForm.driver_id) {
      toast({
        title: "No Driver Selected",
        description: "Please select a driver for the assignment",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // Get selected orders
      const selectedOrdersList = orders.filter(order => selectedOrders.has(order.id));

      // Validate addresses
      const validOrders = selectedOrdersList.filter(order =>
        order.delivery_address?.address &&
        order.delivery_address.address !== 'Address not provided'
      );

      if (validOrders.length === 0) {
        toast({
          title: "No Valid Addresses",
          description: "Selected orders don't have valid delivery addresses",
          variant: "destructive"
        });
        return;
      }

      if (validOrders.length !== selectedOrdersList.length) {
        toast({
          title: "Warning",
          description: `${selectedOrdersList.length - validOrders.length} orders excluded due to missing addresses`,
          variant: "destructive"
        });
      }

      // Find driver and determine type
      const driver = drivers.find(d => d.id === assignForm.driver_id);
      if (!driver) {
        toast({
          title: "Driver Not Found",
          description: "Selected driver not found",
          variant: "destructive"
        });
        return;
      }

      // Show optimization in progress
      toast({
        title: "Optimizing Route",
        description: `AI is analyzing ${validOrders.length} deliveries for optimal route...`
      });

      // Optimize the route using AI
      const optimizationResult = await optimizeRoute(validOrders, driver.driver_type);

      console.log('💾 Saving route assignment to database...');

      // Create route assignment in database
      const { data: routeAssignment, error: routeError } = await supabase
        .from('route_assignments')
        .insert({
          driver_id: assignForm.driver_id,
          driver_name: driver.name,
          route_date: assignForm.route_date,
          departure_time: assignForm.departure_time,
          status: 'assigned',
          total_distance: optimizationResult.totalDistance,
          total_duration: optimizationResult.totalDuration,
          total_driving_time: optimizationResult.totalDrivingTime || optimizationResult.totalDuration - (optimizationResult.optimizedStops.length * 10), // Estimate driving time
          estimated_fuel_cost: optimizationResult.estimatedFuelCost,
          route_efficiency: optimizationResult.routeEfficiency,
          optimization_method: openaiApiKey ? 'OpenAI + Google Maps' : 'Traditional TSP + Google Maps'
        })
        .select()
        .single();

      if (routeError) {
        console.error('❌ Error creating route assignment:', routeError);
        throw routeError;
      }

      console.log('✅ Route assignment created:', routeAssignment);

      // Create route stops
      const routeStops = optimizationResult.optimizedStops.map((stop, index) => {
        // Convert estimated arrival time to proper ISO timestamp if it exists
        let estimatedArrivalTime = null;
        if (stop.estimatedArrival && stop.estimatedArrival !== 'N/A') {
          try {
            // Try to parse the arrival time - if it's just a time string, combine with route date
            const timeString = stop.estimatedArrival;
            if (timeString.includes('AM') || timeString.includes('PM')) {
              // Parse 12-hour format and combine with route date
              const routeDateTime = new Date(`${assignForm.route_date} ${timeString}`);
              if (!isNaN(routeDateTime.getTime())) {
                estimatedArrivalTime = routeDateTime.toISOString();
              }
            } else if (timeString.includes('T') || timeString.includes('Z')) {
              // Already in ISO format
              estimatedArrivalTime = new Date(timeString).toISOString();
            }
          } catch (error) {
            console.warn('Could not parse estimated arrival time:', stop.estimatedArrival);
          }
        }

        return {
          route_assignment_id: routeAssignment.id,
          stop_order: index + 1,
          location_id: stop.location.id,
          location_address: stop.location.address,
          location_coordinates: stop.location.coordinates,
          estimated_arrival_time: estimatedArrivalTime,
          estimated_travel_time: stop.estimatedTravelTime || 0,
          estimated_distance: stop.estimatedDistance || 0,
          cumulative_time: stop.cumulativeTime || 0,
          cumulative_distance: stop.cumulativeDistance || 0,
          status: 'pending'
        };
      });

      const { data: createdStops, error: stopsError } = await supabase
        .from('route_stops')
        .insert(routeStops)
        .select();

      if (stopsError) {
        console.error('❌ Error creating route stops:', stopsError);
        throw stopsError;
      }

      console.log('✅ Route stops created:', createdStops);

      // Create route orders (map orders to stops)
      const routeOrders = [];
      for (let i = 0; i < optimizationResult.optimizedStops.length; i++) {
        const stop = optimizationResult.optimizedStops[i];
        const stopRecord = createdStops[i];

        // Map orders to this stop
        for (const order of stop.location.orders) {
          const originalOrder = validOrders.find(o => o.id === order.id || o.order_no === order.orderNumber);
          if (originalOrder) {
            routeOrders.push({
              route_assignment_id: routeAssignment.id,
              route_stop_id: stopRecord.id,
              order_id: originalOrder.id,
              order_number: originalOrder.order_no,
              customer_name: originalOrder.customer_name,
              customer_phone: originalOrder.customer_phone,
              delivery_status: 'assigned'
            });
          }
        }
      }

      const { data: createdOrders, error: ordersError } = await supabase
        .from('route_orders')
        .insert(routeOrders)
        .select();

      if (ordersError) {
        console.error('❌ Error creating route orders:', ordersError);
        throw ordersError;
      }

      console.log('✅ Route orders created:', createdOrders);

      // Update order statuses to 'OUT_FOR_DELIVERY'
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({ status: 'OUT_FOR_DELIVERY' })
        .in('id', validOrders.map(o => o.id));

      if (orderUpdateError) {
        console.warn('⚠️ Warning: Could not update order statuses:', orderUpdateError);
      }

      // Refresh data
      await fetchData();

      // Clear selections and close dialog
      setSelectedOrders(new Set());
      setIsAssignDialogOpen(false);
      setAssignForm({
        driver_id: '',
        route_date: new Date().toISOString().split('T')[0],
        departure_time: new Date().toTimeString().slice(0, 5)
      });

      toast({
        title: "Route Assignment Saved",
        description: `${validOrders.length} orders assigned to ${driver.name} • ${optimizationResult.routeEfficiency}% efficiency • RM ${optimizationResult.estimatedFuelCost.toFixed(2)} fuel cost`
      });

    } catch (error: any) {
      console.error('Error assigning route:', error);
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign route to driver",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Trip Management Functions
  const handleCompleteTrip = async (routeId: string) => {
    try {
      setLoading(true);
      console.log('✅ Completing trip:', routeId);

      const { error } = await supabase
        .from('route_assignments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', routeId);

      if (error) {
        console.error('❌ Error completing trip:', error);
        throw error;
      }

      // Update all associated orders to delivered status
      const { error: ordersError } = await supabase
        .from('route_orders')
        .update({ delivery_status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('route_assignment_id', routeId);

      if (ordersError) {
        console.warn('⚠️ Warning: Could not update route orders:', ordersError);
      }

      // Update order statuses in main orders table
      const route = routeAssignments.find(r => r.id === routeId);
      if (route && route.orders.length > 0) {
        const { error: mainOrdersError } = await supabase
          .from('orders')
          .update({ status: 'DELIVERED' })
          .in('id', route.orders.map(o => o.order_id));

        if (mainOrdersError) {
          console.warn('⚠️ Warning: Could not update main orders status:', mainOrdersError);
        }
      }

      await fetchData();

      toast({
        title: "Trip Completed",
        description: "Trip has been marked as completed and moved to history"
      });

    } catch (error: any) {
      console.error('Error completing trip:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete trip",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTrip = async (routeId: string, reason?: string) => {
    try {
      setLoading(true);
      console.log('❌ Cancelling trip:', routeId);

      const { error } = await supabase
        .from('route_assignments')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          notes: reason || 'Trip cancelled'
        })
        .eq('id', routeId);

      if (error) {
        console.error('❌ Error cancelling trip:', error);
        throw error;
      }

      // Revert order statuses back to READY_FOR_DELIVERY
      const route = routeAssignments.find(r => r.id === routeId);
      if (route && route.orders.length > 0) {
        const { error: ordersError } = await supabase
          .from('orders')
          .update({ status: 'READY_FOR_DELIVERY' })
          .in('id', route.orders.map(o => o.order_id));

        if (ordersError) {
          console.warn('⚠️ Warning: Could not revert order statuses:', ordersError);
        }
      }

      await fetchData();

      toast({
        title: "Trip Cancelled",
        description: "Trip has been cancelled and orders returned to available pool"
      });

    } catch (error: any) {
      console.error('Error cancelling trip:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel trip",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReassignTrip = async (routeId: string, newDriverId: string) => {
    try {
      setLoading(true);
      console.log('🔄 Reassigning trip:', routeId, 'to driver:', newDriverId);

      const newDriver = drivers.find(d => d.id === newDriverId);
      if (!newDriver) {
        throw new Error('Driver not found');
      }

      const { error } = await supabase
        .from('route_assignments')
        .update({
          driver_id: newDriverId,
          driver_name: newDriver.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', routeId);

      if (error) {
        console.error('❌ Error reassigning trip:', error);
        throw error;
      }

      await fetchData();

      toast({
        title: "Trip Reassigned",
        description: `Trip has been reassigned to ${newDriver.name}`
      });

    } catch (error: any) {
      console.error('Error reassigning trip:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reassign trip",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (routeId: string) => {
    try {
      setLoading(true);
      console.log('🗑️ Deleting trip:', routeId);

      const { error } = await supabase
        .from('route_assignments')
        .delete()
        .eq('id', routeId);

      if (error) {
        console.error('❌ Error deleting trip:', error);
        throw error;
      }

      await fetchData();

      toast({
        title: "Trip Deleted",
        description: "Trip has been permanently deleted from history"
      });

    } catch (error: any) {
      console.error('Error deleting trip:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete trip",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const printRoute = (route: RouteAssignment) => {
    const routeOrders = route.orders || [];
    const routeStops = route.stops || [];

    // Calculate total items across all orders
    const totalItems = routeOrders.reduce((total, order) => {
      return total + (order.order_details?.order_items?.length || 0);
    }, 0);

    const printContent = `
      <div style="font-family: Arial, sans-serif; padding: 15px; font-size: 12px; line-height: 1.3;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px;">
          <h1 style="margin: 0; font-size: 18px;">DELIVERY ROUTE SHEET</h1>
          <div style="margin-top: 8px; font-size: 11px;">
            <strong>Date:</strong> ${new Date(route.route_date).toLocaleDateString()} |
            <strong>Driver:</strong> ${route.driver_name} |
            <strong>Departure:</strong> ${route.departure_time} |
            <strong>Route:</strong> ${route.id.substring(0, 8)}...
          </div>
        </div>

        <!-- Quick Summary -->
        <div style="background: #f5f5f5; padding: 10px; margin-bottom: 15px; border-radius: 4px; font-size: 11px;">
          <strong>Summary:</strong> ${routeOrders.length} Orders • ${routeStops.length} Stops • ${totalItems} Items • ${route.total_distance.toFixed(1)} km • ${Math.floor(route.total_duration / 60)}h ${route.total_duration % 60}m
        </div>

        <!-- Route Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 15px;">
          <thead>
            <tr style="background-color: #e9ecef;">
              <th style="border: 1px solid #333; padding: 4px; text-align: center;">#</th>
              <th style="border: 1px solid #333; padding: 4px; text-align: left;">Address</th>
              <th style="border: 1px solid #333; padding: 4px; text-align: left;">Customer</th>
              <th style="border: 1px solid #333; padding: 4px; text-align: left;">Phone</th>
              <th style="border: 1px solid #333; padding: 4px; text-align: left;">Order#</th>
              <th style="border: 1px solid #333; padding: 4px; text-align: left;">Items</th>
              <th style="border: 1px solid #333; padding: 4px; text-align: center;">Time</th>
              <th style="border: 1px solid #333; padding: 4px; text-align: center;">✓</th>
            </tr>
          </thead>
          <tbody>
            ${routeStops.map((stop, stopIndex) => {
              const stopOrders = routeOrders.filter(order => order.route_stop_id === stop.id);

              return stopOrders.map((order, orderIndex) => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 4px; text-align: center; font-weight: bold;">${stopIndex + 1}${stopOrders.length > 1 ? String.fromCharCode(97 + orderIndex) : ''}</td>
                  <td style="border: 1px solid #ddd; padding: 4px; font-size: 9px; max-width: 120px;">${stop.location_address}</td>
                  <td style="border: 1px solid #ddd; padding: 4px; font-weight: bold;">${order.customer_name}</td>
                  <td style="border: 1px solid #ddd; padding: 4px;">${order.customer_phone || 'N/A'}</td>
                  <td style="border: 1px solid #ddd; padding: 4px; font-weight: bold;">${order.order_number}</td>
                  <td style="border: 1px solid #ddd; padding: 4px;">
                    ${order.order_details?.order_items?.map(item =>
                      `${item.quantity}x ${item.component_name.substring(0, 15)}${item.component_name.length > 15 ? '...' : ''}`
                    ).join('<br>') || 'No items'}
                  </td>
                  <td style="border: 1px solid #ddd; padding: 4px; text-align: center;">
                    ${stop.estimated_arrival_time ? new Date(stop.estimated_arrival_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '___:___'}
                  </td>
                  <td style="border: 1px solid #ddd; padding: 4px; text-align: center;">☐</td>
                </tr>
              `).join('');
            }).join('')}
          </tbody>
        </table>

        <!-- Driver Checklist & Sign-off -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
          <div style="border: 1px solid #333; padding: 8px; border-radius: 4px;">
            <h3 style="margin: 0 0 8px 0; font-size: 12px;">Pre-Departure Checklist</h3>
            <div style="font-size: 10px;">
              <p style="margin: 2px 0;">☐ Fuel Level OK</p>
              <p style="margin: 2px 0;">☐ Vehicle Inspection</p>
              <p style="margin: 2px 0;">☐ All Orders Loaded</p>
              <p style="margin: 2px 0;">☐ Route Reviewed</p>
            </div>
          </div>

          <div style="border: 1px solid #333; padding: 8px; border-radius: 4px;">
            <h3 style="margin: 0 0 8px 0; font-size: 12px;">Route Completion</h3>
            <div style="font-size: 10px;">
              <p style="margin: 2px 0;"><strong>Start:</strong> _________ <strong>End:</strong> _________</p>
              <p style="margin: 2px 0;"><strong>KM:</strong> _________ <strong>Fuel:</strong> _________</p>
              <p style="margin: 8px 0 2px 0;"><strong>Driver Signature:</strong></p>
              <div style="border-bottom: 1px solid #333; height: 20px; margin-top: 4px;"></div>
            </div>
          </div>
        </div>

        <!-- Footer Notes -->
        <div style="margin-top: 15px; font-size: 9px; color: #666; border-top: 1px solid #ddd; padding-top: 8px;">
          <p style="margin: 0;"><strong>Notes:</strong> Contact customer if not available. Mark items as delivered only after customer confirmation. Return undelivered items to warehouse.</p>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Route Sheet - ${route.driver_name} - ${route.route_date}</title>
            <meta charset="utf-8">
            <style>
              @media print {
                body { margin: 5px; font-size: 10px; }
                @page { margin: 0.5in; }
                table { page-break-inside: avoid; }
              }
              @media screen {
                body { background: #fff; max-width: 8.5in; margin: 0 auto; padding: 20px; }
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filterByDeliveryMethod === 'all') return true;
    return order.delivery_method === filterByDeliveryMethod;
  });

  // Get filtered route assignments
  const activeRoutes = routeAssignments.filter(route =>
    route.status === 'assigned' || route.status === 'in_progress'
  );

  const completedRoutes = routeAssignments.filter(route =>
    route.status === 'completed' || route.status === 'cancelled'
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Route Management</h2>
        <p className="text-muted-foreground">
          Manage and assign orders that are ready for delivery to local and overstate drivers for optimized route planning.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'routes' | 'history')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="routes" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Active Routes ({activeRoutes.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History ({completedRoutes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="routes" className="space-y-6">
          {/* Active Route Assignments */}
          {activeRoutes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  Active Route Assignments
                </CardTitle>
                <CardDescription>
                  Current routes assigned to drivers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeRoutes.map((route) => (
                    <div key={route.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge variant={route.status === 'assigned' ? 'secondary' : 'default'}>
                            {route.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <div>
                            <div className="font-medium">{route.driver_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(route.route_date).toLocaleDateString()} at {route.departure_time}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRoute(route);
                              setIsRouteViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Route
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => printRoute(route)}
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Print
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCompleteTrip(route.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelTrip(route.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Orders</div>
                          <div className="font-medium">{route.orders?.length || 0}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Distance</div>
                          <div className="font-medium">{route.total_distance.toFixed(1)} km</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Duration</div>
                          <div className="font-medium">{Math.round(route.total_duration)} min</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Trip History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Trip History
              </CardTitle>
              <CardDescription>
                Completed and cancelled trips
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedRoutes.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No trip history yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {completedRoutes.map((route) => (
                    <div key={route.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge variant={route.status === 'completed' ? 'default' : 'destructive'}>
                            {route.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <div>
                            <div className="font-medium">{route.driver_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(route.route_date).toLocaleDateString()} at {route.departure_time}
                            </div>
                            {route.completed_at && (
                              <div className="text-sm text-green-600">
                                Completed: {formatDate(route.completed_at)}
                              </div>
                            )}
                            {route.cancelled_at && (
                              <div className="text-sm text-red-600">
                                Cancelled: {formatDate(route.cancelled_at)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRoute(route);
                              setIsRouteViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Route
                          </Button>
                          {route.status === 'cancelled' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Re-enable orders for assignment
                                handleCancelTrip(route.id, 'Restored from history');
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restore
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTrip(route.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Orders</div>
                          <div className="font-medium">{route.orders?.length || 0}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Distance</div>
                          <div className="font-medium">{route.total_distance.toFixed(1)} km</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Duration</div>
                          <div className="font-medium">{Math.round(route.total_duration)} min</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Fuel Cost</div>
                          <div className="font-medium">RM {route.estimated_fuel_cost.toFixed(2)}</div>
                        </div>
                      </div>

                      {route.notes && (
                        <div className="mt-3 p-3 bg-muted rounded text-sm">
                          <div className="font-medium mb-1">Notes:</div>
                          {route.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      {/* Orders Available for Route Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Orders Ready for Delivery Assignment
          </CardTitle>
          <CardDescription>
            Orders with status "READY_FOR_DELIVERY" and delivery methods "local-driver" or "overstate-driver"
          </CardDescription>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm">
                  Select All ({selectedOrders.size} selected)
                </Label>
              </div>

              <Select value={filterByDeliveryMethod} onValueChange={setFilterByDeliveryMethod}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by delivery method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Delivery Methods</SelectItem>
                  <SelectItem value="local-driver">Local Driver</SelectItem>
                  <SelectItem value="overstate-driver">Overstate Driver</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">

              <Button
                variant="outline"
                onClick={fetchData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={() => setIsAssignDialogOpen(true)}
                disabled={selectedOrders.size === 0}
              >
                <Route className="h-4 w-4 mr-1" />
                Assign to Driver ({selectedOrders.size})
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading && orders.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Delivery Method</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      {filterByDeliveryMethod !== 'all'
                        ? `No orders found for ${filterByDeliveryMethod} delivery method.`
                        : 'No orders ready for delivery assignment.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.has(order.id)}
                          onCheckedChange={(checked) => handleOrderSelection(order.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">#{order.order_no}</div>
                          <div className="text-sm text-muted-foreground">{formatDate(order.created_at)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.customer_name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {order.customer_phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.delivery_method === 'local-driver' ? 'default' : 'secondary'}>
                          {order.delivery_method === 'local-driver' ? 'Local Driver' :
                           order.delivery_method === 'overstate-driver' ? 'Overstate Driver' :
                           order.delivery_method}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-sm">
                          <div className="flex items-start gap-1">
                            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span className="truncate">
                              {order.delivery_address?.address || 'Address not provided'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(order.total)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{order.order_items.length} items</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assign to Driver Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Orders to Driver</DialogTitle>
            <DialogDescription>
              Select a driver and date for the route assignment of {selectedOrders.size} selected orders.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="driver">Driver</Label>
              <Select
                value={assignForm.driver_id}
                onValueChange={(value) => setAssignForm({...assignForm, driver_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.filter(driver => driver.active).map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{driver.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {driver.driver_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {driver.vehicle_type} - {driver.license_plate}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="route_date">Route Date</Label>
                <Input
                  id="route_date"
                  type="date"
                  value={assignForm.route_date}
                  onChange={(e) => setAssignForm({...assignForm, route_date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="departure_time">Departure Time</Label>
                <Input
                  id="departure_time"
                  type="time"
                  value={assignForm.departure_time}
                  onChange={(e) => setAssignForm({...assignForm, departure_time: e.target.value})}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Route optimization will use traffic data for this time
                </p>
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded">
              <h4 className="font-medium text-sm mb-2">Selected Orders Summary:</h4>
              <div className="text-sm text-muted-foreground">
                <p>{selectedOrders.size} orders selected for route assignment</p>
                <p>Route will be automatically optimized for efficiency</p>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsAssignDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignToDriver}
                disabled={loading || !assignForm.driver_id}
              >
                {loading ? 'Assigning...' : 'Assign Route'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Route Details Dialog */}
      <Dialog open={isRouteViewDialogOpen} onOpenChange={setIsRouteViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Route Details</DialogTitle>
            <DialogDescription>
              Complete route information and delivery stops
            </DialogDescription>
          </DialogHeader>

          {selectedRoute && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Driver</span>
                  </div>
                  <p className="mt-1 font-semibold">{selectedRoute.driver_name}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <Navigation className="h-4 w-4" />
                    <span className="font-medium">Distance</span>
                  </div>
                  <p className="mt-1 font-semibold">{selectedRoute.total_distance?.toFixed(1) || '0.0'} km</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-700">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Duration</span>
                  </div>
                  <p className="mt-1 font-semibold">
                    {Math.floor((selectedRoute.total_duration || 0) / 60)}h {(selectedRoute.total_duration || 0) % 60}m
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    🗺️ Optimized Route Visualization
                    <span className="text-sm font-normal text-gray-500">
                      ({selectedRoute.optimization_method || 'Route Optimization'})
                    </span>
                  </h4>

                  {/* Route Overview */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">📍 Start:</span>
                        <p className="text-gray-600 mt-1">{selectedRoute.start_address || 'AUTO LABS SDN BHD, Cheras'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">🕐 Departure:</span>
                        <p className="text-gray-600 mt-1">
                          {selectedRoute.route_date} at {selectedRoute.departure_time || 'TBD'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step-by-Step Route */}
                  <div className="space-y-4">
                    {/* Starting Point */}
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        🏠
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="font-medium text-green-800">START - Warehouse</p>
                          <p className="text-sm text-green-600 mt-1">
                            {selectedRoute.start_address?.substring(0, 80) || 'AUTO LABS SDN BHD, 17, Jalan 7/95B, Cheras Utama, Kuala Lumpur'}
                          </p>
                          <p className="text-xs text-green-500 mt-1">
                            🕐 Departure: {selectedRoute.departure_time || 'TBD'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Route Steps */}
                    {selectedRoute.stops?.map((stop: any, index: number) => (
                      <div key={index}>
                        {/* Travel Arrow */}
                        <div className="flex items-center gap-4 ml-4">
                          <div className="flex-1 border-l-2 border-dashed border-gray-300 pl-8 py-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span>🚗</span>
                              <span>{stop.estimated_distance?.toFixed(1) || 'X.X'} km</span>
                              <span>•</span>
                              <span>{stop.estimated_travel_time || 'XX'} min</span>
                              <span>•</span>
                              <span className="text-blue-600">Traffic-aware route</span>
                            </div>
                          </div>
                        </div>

                        {/* Delivery Stop */}
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-medium text-blue-800">
                                    STOP #{index + 1} - {stop.location_address?.substring(0, 50)}
                                  </p>
                                  {(() => {
                                    // Get orders for this stop
                                    const stopOrders = selectedRoute.orders?.filter(order => order.route_stop_id === stop.id) || [];
                                    const customerNames = [...new Set(stopOrders.map(order => order.customer_name))];

                                    return (
                                      <>
                                        <p className="text-sm text-blue-600 mt-1">
                                          {stopOrders.length} order{stopOrders.length !== 1 ? 's' : ''} • {customerNames.slice(0, 2).join(', ')}{customerNames.length > 2 ? ` +${customerNames.length - 2} more` : ''}
                                        </p>
                                        <p className="text-xs text-blue-500 mt-1">
                                          Orders: {stopOrders.map(order => order.order_number).join(', ') || 'No orders'}
                                        </p>
                                      </>
                                    );
                                  })()}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-blue-700">
                                    🕐 {stop.estimated_arrival_time ? new Date(stop.estimated_arrival_time).toLocaleTimeString() : 'TBD'}
                                  </p>
                                  <p className="text-xs text-blue-500">
                                    ⏱️ Service: {(stop.location?.totalOrders || 1) * 10} min
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-blue-200">
                                <div className="text-center">
                                  <p className="text-xs text-blue-500">Distance</p>
                                  <p className="font-bold text-blue-700">
                                    {stop.estimated_distance?.toFixed(1) || 'X.X'} km
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-blue-500">Travel Time</p>
                                  <p className="font-bold text-blue-700">
                                    {stop.estimated_travel_time || 'XX'} min
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-blue-500">Cumulative</p>
                                  <p className="font-bold text-blue-700">
                                    {stop.cumulative_distance?.toFixed(1) || '0.0'} km
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No optimized route visualization available</p>
                        <p className="text-sm text-gray-400 mt-1">Route optimization data not found</p>
                      </div>
                    )}

                    {/* Return Journey */}
                    {selectedRoute.stops && selectedRoute.stops.length > 0 && (
                      <>
                        {/* Final Travel Arrow */}
                        <div className="flex items-center gap-4 ml-4">
                          <div className="flex-1 border-l-2 border-dashed border-gray-300 pl-8 py-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span>🚗</span>
                              <span>Return journey</span>
                              <span>•</span>
                              <span className="text-green-600">Back to warehouse</span>
                            </div>
                          </div>
                        </div>

                        {/* Return to Start */}
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            🏁
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                              <p className="font-medium text-green-800">END - Return to Warehouse</p>
                              <p className="text-sm text-green-600 mt-1">
                                Route completed • Total: {selectedRoute.total_distance?.toFixed(1) || '0.0'} km, {Math.floor((selectedRoute.total_duration || 0) / 60)}h {(selectedRoute.total_duration || 0) % 60}m
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                </div>

                {/* Order Details Table */}
                <div>
                  <h5 className="font-medium mb-3 text-gray-700">📋 Location-Based Delivery Summary</h5>
                  <div className="space-y-3">
                    {selectedRoute.stops?.map((stop, stopIndex) => {
                      // Get orders for this stop from the database
                      const stopOrders = selectedRoute.orders?.filter(order => order.route_stop_id === stop.id) || [];
                      const stopId = `stop-${stop.id}`;
                      const isExpanded = expandedOrders.has(stopId);

                      return (
                        <div key={stopIndex} className="border rounded-lg">
                          {/* Stop Header */}
                          <div
                            className="p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              const newExpanded = new Set(expandedOrders);
                              if (isExpanded) {
                                newExpanded.delete(stopId);
                              } else {
                                newExpanded.add(stopId);
                              }
                              setExpandedOrders(newExpanded);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Badge variant="outline" className="font-bold">
                                  Stop #{stopIndex + 1}
                                </Badge>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {stop.location_address?.substring(0, 60)}{stop.location_address && stop.location_address.length > 60 ? '...' : ''}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {stopOrders.length} order{stopOrders.length !== 1 ? 's' : ''} • {[...new Set(stopOrders.map(o => o.customer_name))].join(', ')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="secondary">
                                  {stopOrders.reduce((total, order) => {
                                    return total + (order.order_details?.order_items?.length || 0);
                                  }, 0)} items
                                </Badge>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-500" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Order Details */}
                          {isExpanded && (
                            <div className="p-4">
                              <div className="space-y-3">
                                {stopOrders.map((routeOrder, orderIndex) => {
                                  const fullOrder = routeOrder.order_details;
                                  const orderId = `order-${routeOrder.id}`;
                                  const isOrderExpanded = expandedOrders.has(orderId);

                                  return (
                                    <div key={orderIndex} className="border rounded bg-white">
                                      {/* Order Header */}
                                      <div
                                        className="p-3 bg-blue-50 border-b cursor-pointer hover:bg-blue-100"
                                        onClick={() => {
                                          const newExpanded = new Set(expandedOrders);
                                          if (isOrderExpanded) {
                                            newExpanded.delete(orderId);
                                          } else {
                                            newExpanded.add(orderId);
                                          }
                                          setExpandedOrders(newExpanded);
                                        }}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-3">
                                            <Badge variant="default" className="font-bold">
                                              {routeOrder.order_number}
                                            </Badge>
                                            <div>
                                              <p className="font-medium text-gray-900">
                                                {routeOrder.customer_name}
                                              </p>
                                              <p className="text-sm text-gray-600">
                                                {routeOrder.customer_phone || 'No phone'} • Status: {routeOrder.delivery_status}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <Badge variant="outline">
                                              {fullOrder?.order_items?.length || 0} items
                                            </Badge>
                                            {isOrderExpanded ? (
                                              <ChevronDown className="h-4 w-4 text-blue-600" />
                                            ) : (
                                              <ChevronRight className="h-4 w-4 text-blue-600" />
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Order Items Details */}
                                      {isOrderExpanded && fullOrder?.order_items && (
                                        <div className="p-3">
                                          <h6 className="font-medium text-gray-800 mb-2">Order Items:</h6>
                                          <div className="space-y-2">
                                            {fullOrder.order_items.map((item, itemIndex) => (
                                              <div key={itemIndex} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                                <div>
                                                  <p className="font-medium text-sm">{item.component_name}</p>
                                                  <p className="text-xs text-gray-600">SKU: {item.component_sku}</p>
                                                </div>
                                                <div className="text-right">
                                                  <p className="font-medium text-sm">Qty: {item.quantity}</p>
                                                  <p className="text-xs text-gray-600">RM {item.unit_price}</p>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                          <div className="mt-3 pt-2 border-t">
                                            <p className="font-bold text-right">
                                              Total: RM {fullOrder.total?.toFixed(2) || '0.00'}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }) || (
                      <div className="text-center text-muted-foreground py-8">
                        No route stops available
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => printRoute(selectedRoute)}
                >
                  <Printer className="h-4 w-4 mr-1" />
                  Print Route
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsRouteViewDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}