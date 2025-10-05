import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Users, Package, TrendingUp } from 'lucide-react';

interface DashboardStats {
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  totalRevenue: number;
  recentOrders: any[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    totalRevenue: 0,
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Fetch orders using the same pattern as Orders.tsx
      let ordersData: any[] = [];
      
      // Try the admin function first (same as Orders.tsx)
      const { data: functionData, error: functionError } = await (supabase.rpc as any)('get_admin_orders');

      if (!functionError && functionData) {
        ordersData = functionData;
      } else {
        console.warn('Admin function failed, trying fallback approach:', functionError);
        
        // Fallback: Try the enhanced admin view
        const { data: viewData, error: viewError } = await supabase
          .from('admin_orders_enhanced' as any)
          .select('*')
          .order('created_at', { ascending: false });

        if (!viewError && viewData) {
          ordersData = viewData;
        } else {
          console.warn('Admin view failed, trying basic query:', viewError);
          
          // Final fallback: Basic orders query
          const { data: basicData, error: basicError } = await supabase
            .from('orders' as any)
            .select('*')
            .order('created_at', { ascending: false });

          if (!basicError && basicData) {
            ordersData = basicData;
          }
        }
      }

      // Fetch products from component_library - handle case where table doesn't exist
      let productsData: any[] = [];
      try {
        const { data, error } = await supabase
          .from('component_library' as any)
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          productsData = data;
        }
      } catch (error) {
        console.warn('Component library table may not exist:', error);
      }

      // Fetch customers from customer_profiles - handle case where table doesn't exist
      let customersData: any[] = [];
      try {
        const { data, error } = await supabase
          .from('customer_profiles' as any)
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          customersData = data;
        }
      } catch (error) {
        console.warn('Customer profiles table may not exist:', error);
      }

      // Calculate stats from the actual data
      const totalRevenue = ordersData?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
      const recentOrders = ordersData?.slice(0, 5) || [];

      setStats({
        totalOrders: ordersData?.length || 0,
        totalCustomers: customersData?.length || 0,
        totalProducts: productsData?.length || 0,
        totalRevenue,
        recentOrders: recentOrders
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your store's performance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest orders from your customers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet</p>
            ) : (
              stats.recentOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="border rounded-lg p-4 mb-3 hover:shadow-md hover:bg-gray-50 transition-all cursor-pointer"
                  onClick={() => navigate(`/admin/orders?expand=${order.id}`)}
                >
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-semibold">#{order.order_no}</p>
                      <Badge 
                        variant={
                          order.status === 'DELIVERED' ? 'default' : 
                          order.status === 'PROCESSING' ? 'secondary' :
                          order.status === 'PENDING_PAYMENT_VERIFICATION' ? 'outline' :
                          order.status === 'OUT_FOR_DELIVERY' ? 'default' :
                          'outline'
                        }
                      >
                        {order.status.toLowerCase().replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-lg font-bold text-primary">{formatCurrency(order.total)}</p>
                  </div>
                  
                  {/* Details Grid */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Customer</p>
                      <p className="font-medium">{order.customer_name || 'Customer'}</p>
                    </div>
                    
                    <div>
                      <p className="text-muted-foreground">Date</p>
                      <p className="font-medium">{formatDate(order.created_at)}</p>
                    </div>
                    
                    {order.payment_method && (
                      <div>
                        <p className="text-muted-foreground">Payment</p>
                        <p className="font-medium capitalize">
                          {order.payment_method.replace(/-/g, ' ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}