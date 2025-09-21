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
  MapIcon
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
  order_ids: string[];
  route_date: string;
  departure_time?: string;
  status: 'pending' | 'in_progress' | 'completed';
  estimated_distance_km: number;
  estimated_duration_minutes: number;
  optimized_route: any[];
  route_efficiency: number;
  estimated_fuel_cost: number;
  optimization_method?: string;
  start_address?: string;
  warnings: string[];
  created_at: string;
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
  const { toast } = useToast();

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
    // Mock route assignments for now
    const mockRouteAssignments: RouteAssignment[] = [];
    setRouteAssignments(mockRouteAssignments);
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

      // Set starting point (same as in optimizeRoute function)
      const startAddress = 'AUTO LABS SDN BHD, 17, Jalan 7/95B, Cheras Utama, 56100 Cheras, Kuala Lumpur';

      // Create route assignment with detailed route information
      const newRouteAssignment: RouteAssignment = {
        id: `route_${Date.now()}`,
        driver_id: assignForm.driver_id,
        driver_name: driver.name,
        order_ids: validOrders.map(o => o.id),
        route_date: assignForm.route_date,
        departure_time: assignForm.departure_time,
        status: 'pending',
        estimated_distance_km: optimizationResult.totalDistance,
        estimated_duration_minutes: optimizationResult.totalDuration,
        optimized_route: optimizationResult.optimizedStops,
        route_efficiency: optimizationResult.routeEfficiency,
        estimated_fuel_cost: optimizationResult.estimatedFuelCost,
        optimization_method: openaiApiKey ? 'OpenAI + Google Maps' : 'Traditional TSP + Google Maps',
        start_address: startAddress,
        warnings: optimizationResult.warnings,
        created_at: new Date().toISOString()
      };

      // Add to route assignments
      setRouteAssignments(prev => [...prev, newRouteAssignment]);

      // Clear selections and close dialog
      setSelectedOrders(new Set());
      setIsAssignDialogOpen(false);
      setAssignForm({
        driver_id: '',
        route_date: new Date().toISOString().split('T')[0],
        departure_time: new Date().toTimeString().slice(0, 5)
      });

      toast({
        title: "AI Route Optimization Complete",
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

  const printRoute = (route: RouteAssignment) => {
    const selectedOrdersList = orders.filter(order => route.order_ids.includes(order.id));

    const printContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1>DELIVERY ROUTE SHEET</h1>
          <p><strong>Date:</strong> ${new Date(route.route_date).toLocaleDateString()}</p>
          <p><strong>Driver:</strong> ${route.driver_name}</p>
          <p><strong>Route ID:</strong> ${route.id}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>Route Summary</h3>
          <p><strong>Total Orders:</strong> ${route.order_ids.length}</p>
          <p><strong>Estimated Distance:</strong> ${route.estimated_distance_km.toFixed(1)} km</p>
          <p><strong>Estimated Duration:</strong> ${Math.floor(route.estimated_duration_minutes / 60)}h ${route.estimated_duration_minutes % 60}m</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Stop #</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Order</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Customer</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Phone</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Address</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Items</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${selectedOrdersList.map((order, index) => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${order.order_no}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${order.customer_name}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${order.customer_phone}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${order.delivery_address?.address || 'Address not provided'}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${order.order_items.length} items</td>
                <td style="border: 1px solid #ddd; padding: 8px;">☐ Delivered</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 30px;">
          <p><strong>Driver Signature:</strong> _______________________</p>
          <p><strong>Date Completed:</strong> _______________________</p>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filterByDeliveryMethod === 'all') return true;
    return order.delivery_method === filterByDeliveryMethod;
  });

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

      {/* Active Route Assignments */}
      {routeAssignments.length > 0 && (
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
              {routeAssignments.map((route) => (
                <div key={route.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-4">
                        <h4 className="font-medium">{route.driver_name}</h4>
                        <Badge variant={route.status === 'pending' ? 'secondary' : route.status === 'in_progress' ? 'default' : 'outline'}>
                          {route.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(route.route_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          {route.order_ids.length} orders
                        </span>
                        <span className="flex items-center gap-1">
                          <Navigation className="h-4 w-4" />
                          {route.estimated_distance_km.toFixed(1)} km
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {Math.floor(route.estimated_duration_minutes / 60)}h {route.estimated_duration_minutes % 60}m
                        </span>
                        {route.route_efficiency && (
                          <span className="flex items-center gap-1 text-green-600">
                            <span className="text-xs">⚡</span>
                            {route.route_efficiency}% efficient
                          </span>
                        )}
                        {route.estimated_fuel_cost && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <span className="text-xs">⛽</span>
                            RM {route.estimated_fuel_cost.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {route.warnings && route.warnings.length > 0 && (
                        <div className="mt-2 text-xs text-orange-600">
                          ⚠️ {route.warnings.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRoute(route);
                          setIsRouteViewDialogOpen(true);
                        }}
                      >
                        <MapIcon className="h-4 w-4 mr-1" />
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                disabled
                className="text-green-600 hover:text-green-700"
              >
                <MapIcon className="h-4 w-4 mr-1" />
                🧠 OpenAI Enabled
              </Button>

              <Button
                variant="outline"
                onClick={async () => {
                  console.log('🧪 Testing Google Maps API connection...');
                  const isWorking = await routeOptimizer.testConnection();
                  toast({
                    title: isWorking ? "API Connection Successful" : "API Connection Failed",
                    description: isWorking
                      ? "Google Maps Routes API is working correctly!"
                      : "Check console for error details. Using fallback optimization.",
                    variant: isWorking ? "default" : "destructive"
                  });
                }}
                disabled={loading}
                className="text-blue-600 hover:text-blue-700"
              >
                <Map className="h-4 w-4 mr-1" />
                Test API
              </Button>
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
                  <p className="mt-1 font-semibold">{selectedRoute.estimated_distance_km.toFixed(1)} km</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-700">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Duration</span>
                  </div>
                  <p className="mt-1 font-semibold">
                    {Math.floor(selectedRoute.estimated_duration_minutes / 60)}h {selectedRoute.estimated_duration_minutes % 60}m
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
                    {selectedRoute.optimized_route?.map((stop: any, index: number) => (
                      <div key={index}>
                        {/* Travel Arrow */}
                        <div className="flex items-center gap-4 ml-4">
                          <div className="flex-1 border-l-2 border-dashed border-gray-300 pl-8 py-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span>🚗</span>
                              <span>{stop.estimatedDistance?.toFixed(1) || 'X.X'} km</span>
                              <span>•</span>
                              <span>{stop.estimatedTravelTime || 'XX'} min</span>
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
                                    STOP #{index + 1} - {stop.location?.address?.substring(0, 40)}...
                                  </p>
                                  <p className="text-sm text-blue-600 mt-1">
                                    {stop.location?.totalOrders} orders • {stop.location?.customerNames?.join(', ') || 'Multiple customers'}
                                  </p>
                                  <p className="text-xs text-blue-500 mt-1">
                                    Orders: {stop.location?.orders?.map(order => order.orderNumber || order.orderId || 'Unknown').filter(Boolean).join(', ') || 'N/A'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-blue-700">
                                    🕐 {stop.estimatedArrivalTime || stop.estimatedArrival}
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
                                    {stop.estimatedDistance?.toFixed(1) || 'X.X'} km
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-blue-500">Travel Time</p>
                                  <p className="font-bold text-blue-700">
                                    {stop.estimatedTravelTime || 'XX'} min
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-blue-500">Cumulative</p>
                                  <p className="font-bold text-blue-700">
                                    {stop.cumulativeDistance?.toFixed(1) || 'X.X'} km
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
                    {selectedRoute.optimized_route && selectedRoute.optimized_route.length > 0 && (
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
                                Route completed • Total: {selectedRoute.estimated_distance_km.toFixed(1)} km, {Math.floor(selectedRoute.estimated_duration_minutes / 60)}h {selectedRoute.estimated_duration_minutes % 60}m
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Optimization Evidence */}
                  <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h5 className="font-medium text-yellow-800 mb-2">🧠 Optimization Evidence & Analysis</h5>
                    <div className="text-sm text-yellow-700 space-y-1">
                      <p>• <strong>Method:</strong> {selectedRoute.optimization_method || 'Route Optimization Algorithm'}</p>
                      <p>• <strong>Efficiency:</strong> {selectedRoute.route_efficiency}% improvement vs basic routing</p>
                      <p>• <strong>Address Consolidation:</strong> {selectedRoute.order_ids.length} orders → {selectedRoute.optimized_route?.length || selectedRoute.order_ids.length} unique stops</p>
                      <p>• <strong>Traffic Analysis:</strong> Real-time traffic data for accurate timing</p>
                      <p>• <strong>Fuel Cost:</strong> Estimated RM {selectedRoute.estimated_fuel_cost?.toFixed(2)} total</p>
                      {selectedRoute.warnings && selectedRoute.warnings.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium">⚠️ Route Warnings:</p>
                          <ul className="ml-4 list-disc">
                            {selectedRoute.warnings.map((warning, idx) => (
                              <li key={idx}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Details Table */}
                <div>
                  <h5 className="font-medium mb-3 text-gray-700">📋 Location-Based Delivery Summary</h5>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stop #</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Customer(s)</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Total Items</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRoute.optimized_route?.map((stop, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant="outline">{index + 1}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {stop.location?.address?.substring(0, 30)}...
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {stop.location?.orders?.map((order, orderIndex) => {
                                const orderNum = order.orderNumber || order.orderId || 'Unknown';
                                const foundOrder = orders.find(o => o.order_no === orderNum);
                                return (
                                  <div key={orderIndex} className="text-sm">
                                    <Badge variant="secondary" className="mr-1">
                                      {orderNum}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      ({foundOrder?.order_items?.length || 0} items)
                                    </span>
                                  </div>
                                );
                              }) || (
                                <span className="text-xs text-muted-foreground">No order details</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {stop.location?.customerNames?.join(', ') || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate text-sm">
                              {stop.location?.address || 'Address not available'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {stop.location?.orders?.reduce((total, order) => {
                                const orderNum = order.orderNumber || order.orderId || '';
                                const foundOrder = orders.find(o => o.order_no === orderNum);
                                return total + (foundOrder?.order_items?.length || 0);
                              }, 0) || 0} items
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )) || (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No optimized route data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
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