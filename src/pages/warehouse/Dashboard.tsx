import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  PackageCheck,
  Truck,
  Printer,
  Eye,
  Play,
  Bell,
  Volume2,
  VolumeX,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import useSound from 'use-sound';

interface WarehouseOrder {
  id: string;
  order_no: string;
  customer_name: string;
  customer_phone: string;
  delivery_method: string;
  delivery_address: any;
  total: number;
  status: string;
  created_at: string;
  order_items: Array<{
    id: string;
    component_name: string;
    quantity: number;
  }>;
}

interface DashboardStats {
  newToday: number;
  packingToday: number;
  readyToday: number;
  shippedToday: number;
}

export default function WarehouseDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<WarehouseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    newToday: 0,
    packingToday: 0,
    readyToday: 0,
    shippedToday: 0
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const previousOrderCount = useRef(0);

  // Notification sound - using a simple beep URL
  const [playNotification] = useSound('/notification.mp3', {
    volume: 0.5,
    soundEnabled
  });

  // Fetch orders with real-time subscription
  useEffect(() => {
    fetchOrders();
    fetchStats();

    // Set up real-time subscription for new orders
    const channel = supabase
      .channel('warehouse-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: 'status=in.(PROCESSING,PACKING,READY_FOR_DELIVERY)'
        },
        (payload) => {
          console.log('Order change detected:', payload);

          // Play sound for new orders
          if (payload.eventType === 'INSERT' ||
              (payload.eventType === 'UPDATE' && payload.new.status === 'PROCESSING')) {
            if (soundEnabled) {
              try {
                playNotification();
              } catch (e) {
                // Fallback: browser notification sound
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleicvTqLp24Zv');
                audio.play().catch(() => {});
              }
            }

            toast({
              title: '🆕 New Order!',
              description: `Order ${payload.new.order_no} is ready for processing`,
            });
          }

          // Refresh orders
          fetchOrders();
          fetchStats();
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds as backup
    const refreshInterval = setInterval(() => {
      fetchOrders();
      fetchStats();
      setLastRefresh(new Date());
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
    };
  }, [soundEnabled]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_no,
          customer_name,
          customer_phone,
          delivery_method,
          delivery_address,
          total,
          status,
          created_at,
          order_items (
            id,
            component_name,
            quantity
          )
        `)
        .in('status', ['PROCESSING', 'PACKING', 'READY_FOR_DELIVERY'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check if new orders came in
      const newOrders = data || [];
      const processingCount = newOrders.filter(o => o.status === 'PROCESSING').length;

      if (processingCount > previousOrderCount.current && previousOrderCount.current > 0) {
        // New order detected via polling
        if (soundEnabled) {
          try {
            playNotification();
          } catch (e) {}
        }
      }
      previousOrderCount.current = processingCount;

      setOrders(newOrders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch orders',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select('status, created_at, updated_at')
        .gte('created_at', today.toISOString());

      if (error) throw error;

      const stats = {
        newToday: data?.filter(o => o.status === 'PROCESSING').length || 0,
        packingToday: data?.filter(o => o.status === 'PACKING').length || 0,
        readyToday: data?.filter(o => o.status === 'READY_FOR_DELIVERY').length || 0,
        shippedToday: data?.filter(o => o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERED').length || 0
      };

      setStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleStartPacking = async (order: WarehouseOrder) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'PACKING', updated_at: new Date().toISOString() })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Order ${order.order_no} moved to Packing`
      });

      fetchOrders();
      fetchStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleMarkReady = async (order: WarehouseOrder) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'READY_FOR_DELIVERY', updated_at: new Date().toISOString() })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Order ${order.order_no} is Ready for Delivery`
      });

      fetchOrders();
      fetchStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handlePrintInvoice = (order: WarehouseOrder) => {
    // Navigate to orders page with invoice modal open
    navigate(`/admin/orders?invoice=${order.id}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PROCESSING':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">New</Badge>;
      case 'PACKING':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Packing</Badge>;
      case 'READY_FOR_DELIVERY':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Ready</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const processingOrders = orders.filter(o => o.status === 'PROCESSING');
  const packingOrders = orders.filter(o => o.status === 'PACKING');
  const readyOrders = orders.filter(o => o.status === 'READY_FOR_DELIVERY');

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Warehouse Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time order monitoring • Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={soundEnabled ? 'text-green-600' : 'text-gray-400'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span className="ml-1">{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchOrders();
              fetchStats();
              setLastRefresh(new Date());
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/warehouse/scan')}
          >
            <Package className="h-4 w-4 mr-1" />
            Scan QR
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">New Orders</p>
                <p className="text-3xl font-bold text-blue-800">{stats.newToday}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Packing</p>
                <p className="text-3xl font-bold text-yellow-800">{stats.packingToday}</p>
              </div>
              <PackageCheck className="h-10 w-10 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Ready</p>
                <p className="text-3xl font-bold text-green-800">{stats.readyToday}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-indigo-200 bg-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-600 font-medium">Shipped Today</p>
                <p className="text-3xl font-bold text-indigo-800">{stats.shippedToday}</p>
              </div>
              <Truck className="h-10 w-10 text-indigo-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New Orders Column */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">New Orders ({processingOrders.length})</h2>
          </div>
          <div className="space-y-4">
            {processingOrders.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  No new orders
                </CardContent>
              </Card>
            ) : (
              processingOrders.map(order => (
                <Card key={order.id} className="border-blue-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{order.order_no}</CardTitle>
                        <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm mb-3">
                      <p className="text-muted-foreground">
                        {order.order_items?.length || 0} item(s) • RM {order.total.toFixed(2)}
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-red-600 hover:bg-red-700"
                        onClick={() => handlePrintInvoice(order)}
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Print
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleStartPacking(order)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start Packing
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Packing Column */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <PackageCheck className="h-5 w-5 text-yellow-600" />
            <h2 className="text-lg font-semibold">Packing ({packingOrders.length})</h2>
          </div>
          <div className="space-y-4">
            {packingOrders.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-muted-foreground">
                  <PackageCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  No orders being packed
                </CardContent>
              </Card>
            ) : (
              packingOrders.map(order => (
                <Card key={order.id} className="border-yellow-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{order.order_no}</CardTitle>
                        <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm mb-3">
                      <p className="text-muted-foreground">
                        {order.order_items?.length || 0} item(s) • RM {order.total.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.delivery_method === 'pickup' ? '📍 Self-Pickup' : '🚚 Delivery'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handlePrintInvoice(order)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleMarkReady(order)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark Ready
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Ready for Delivery Column */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold">Ready ({readyOrders.length})</h2>
          </div>
          <div className="space-y-4">
            {readyOrders.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Truck className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  No orders ready
                </CardContent>
              </Card>
            ) : (
              readyOrders.map(order => (
                <Card key={order.id} className="border-green-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{order.order_no}</CardTitle>
                        <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm mb-3">
                      <p className="text-muted-foreground">
                        {order.order_items?.length || 0} item(s) • RM {order.total.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.delivery_method === 'pickup' ? '📍 Self-Pickup' : '🚚 Delivery'}
                      </p>
                      {order.delivery_address && (
                        <p className="text-xs text-muted-foreground truncate">
                          📍 {order.delivery_address.city || order.delivery_address.address}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate('/admin/warehouse-operations?status=READY_FOR_DELIVERY')}
                    >
                      <Truck className="h-4 w-4 mr-1" />
                      Assign Courier
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-muted-foreground">Loading orders...</p>
          </div>
        </div>
      )}
    </div>
  );
}
