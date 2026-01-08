import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShoppingBag,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Star,
  Crown,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  BarChart3
} from 'lucide-react';

interface DashboardStats {
  todayRevenue: number;
  yesterdayRevenue: number;
  todayOrders: number;
  yesterdayOrders: number;
  todayNewCustomers: number;
  recentOrders: any[];
  failedPayments: number;
  lowStockAlerts: number;
  pendingMerchantApplications: number;
  pendingReviews: number;
  readyToShipOrders: number;
  pendingOrders: number;
  processingOrders: number;
  todayBestSeller: { name: string; count: number; revenue: number } | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    yesterdayRevenue: 0,
    todayOrders: 0,
    yesterdayOrders: 0,
    todayNewCustomers: 0,
    recentOrders: [],
    failedPayments: 0,
    lowStockAlerts: 0,
    pendingMerchantApplications: 0,
    pendingReviews: 0,
    readyToShipOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    todayBestSeller: null
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Fetch orders using the same pattern as Orders.tsx
      let ordersData: any[] = [];

      const { data: functionData, error: functionError } = await (supabase.rpc as any)('get_admin_orders');

      if (!functionError && functionData) {
        ordersData = functionData;
      } else {
        const { data: viewData, error: viewError } = await supabase
          .from('admin_orders_enhanced' as any)
          .select('*')
          .order('created_at', { ascending: false });

        if (!viewError && viewData) {
          ordersData = viewData;
        } else {
          const { data: basicData } = await supabase
            .from('orders' as any)
            .select('*')
            .order('created_at', { ascending: false });

          if (basicData) {
            ordersData = basicData;
          }
        }
      }

      // Fetch products
      let productsData: any[] = [];
      try {
        const { data } = await supabase
          .from('component_library' as any)
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (data) productsData = data;
      } catch (error) {
        console.warn('Component library table may not exist:', error);
      }

      // Fetch customers
      let customersData: any[] = [];
      try {
        const { data } = await supabase
          .from('customer_profiles' as any)
          .select('*')
          .order('created_at', { ascending: false });

        if (data) customersData = data;
      } catch (error) {
        console.warn('Customer profiles table may not exist:', error);
      }

      // Calculate time-based metrics (Today vs Yesterday)
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

      // Today's orders (only successful payments)
      const todayOrders = ordersData.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate >= todayStart && (o.payment_state === 'SUCCESS' || o.payment_state === 'APPROVED');
      });

      // Yesterday's orders (only successful payments)
      const yesterdayOrders = ordersData.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate >= yesterdayStart && orderDate < todayStart && (o.payment_state === 'SUCCESS' || o.payment_state === 'APPROVED');
      });

      const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      const yesterdayRevenue = yesterdayOrders.reduce((sum, order) => sum + (order.total || 0), 0);

      // Today's new customers
      const todayCustomers = customersData.filter(c => {
        const created = new Date(c.created_at);
        return created >= todayStart;
      });

      // Calculate urgent actions
      const failedPayments = ordersData.filter(o =>
        o.payment_state === 'FAILED' || o.payment_state === 'PENDING'
      ).length;

      const lowStockAlerts = productsData.filter(p =>
        p.stock_level <= (p.reorder_level || 10)
      ).length;

      const readyToShipOrders = ordersData.filter(o =>
        o.status === 'READY_FOR_DELIVERY' || o.status === 'PACKING'
      ).length;

      const pendingOrders = ordersData.filter(o =>
        o.status === 'PENDING' || o.status === 'PAYMENT_PENDING'
      ).length;

      const processingOrders = ordersData.filter(o =>
        o.status === 'PROCESSING' || o.status === 'PICKING'
      ).length;

      // Fetch pending merchant applications
      let pendingMerchants = 0;
      try {
        const { count } = await supabase
          .from('premium_partnerships' as any)
          .select('*', { count: 'exact', head: true })
          .eq('subscription_status', 'PENDING')
          .eq('admin_approved', false);
        pendingMerchants = count || 0;
      } catch (error) {
        console.warn('Premium partnerships table may not exist:', error);
      }

      // Fetch pending reviews
      let pendingReviews = 0;
      try {
        const { count } = await supabase
          .from('product_reviews' as any)
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        pendingReviews = count || 0;
      } catch (error) {
        console.warn('Product reviews table may not exist:', error);
      }

      // Calculate today's best seller
      const todayProductSales: { [key: string]: { name: string; count: number; revenue: number } } = {};

      for (const order of todayOrders) {
        // Items are in order.order_items (not order.items!)
        let items = order.order_items;

        // If items is a string (JSONB stored as string), parse it
        if (typeof items === 'string') {
          try {
            items = JSON.parse(items);
          } catch (e) {
            console.error('Failed to parse items:', e);
          }
        }

        if (items && Array.isArray(items)) {
          for (const item of items) {
            const key = item.component_name || 'Unknown';
            if (!todayProductSales[key]) {
              todayProductSales[key] = { name: key, count: 0, revenue: 0 };
            }
            todayProductSales[key].count += item.quantity || 1;
            todayProductSales[key].revenue += (item.unit_price || 0) * (item.quantity || 1);
          }
        }
      }

      const todayBestSeller = Object.values(todayProductSales)
        .sort((a, b) => b.count - a.count)[0] || null; // Sort by quantity, not revenue

      setStats({
        todayRevenue,
        yesterdayRevenue,
        todayOrders: todayOrders.length,
        yesterdayOrders: yesterdayOrders.length,
        todayNewCustomers: todayCustomers.length,
        recentOrders: ordersData.slice(0, 8), // Show 8 most recent orders
        failedPayments,
        lowStockAlerts,
        pendingMerchantApplications: pendingMerchants,
        pendingReviews,
        readyToShipOrders,
        pendingOrders,
        processingOrders,
        todayBestSeller
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const calculatePercentageChange = (today: number, yesterday: number) => {
    if (yesterday === 0) return today > 0 ? 100 : 0;
    return ((today - yesterday) / yesterday) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Today's business overview • {new Date().toLocaleDateString('en-MY', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Last updated: {formatTime(lastUpdated)}
          </span>
          <Button variant="outline" size="sm" onClick={fetchDashboardStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Today's Performance vs Yesterday */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.todayRevenue)}</div>
            <div className="flex items-center text-xs mt-1">
              {stats.todayRevenue >= stats.yesterdayRevenue ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600 font-medium">
                    {calculatePercentageChange(stats.todayRevenue, stats.yesterdayRevenue).toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                  <span className="text-red-600 font-medium">
                    {Math.abs(calculatePercentageChange(stats.todayRevenue, stats.yesterdayRevenue)).toFixed(1)}%
                  </span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayOrders}</div>
            <div className="flex items-center text-xs mt-1">
              {stats.todayOrders >= stats.yesterdayOrders ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600 font-medium">
                    {calculatePercentageChange(stats.todayOrders, stats.yesterdayOrders).toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                  <span className="text-red-600 font-medium">
                    {Math.abs(calculatePercentageChange(stats.todayOrders, stats.yesterdayOrders)).toFixed(1)}%
                  </span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs yesterday ({stats.yesterdayOrders})</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayNewCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Seller Today</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {stats.todayBestSeller ? stats.todayBestSeller.name : 'No sales yet'}
            </div>
            {stats.todayBestSeller && (
              <p className="text-xs text-muted-foreground mt-1">
                {stats.todayBestSeller.count} units • {formatCurrency(stats.todayBestSeller.revenue)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid - Left: Order Pipeline & Recent Orders, Right: Needs Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Order Pipeline */}
          <div>
            <h3 className="text-lg font-semibold mb-3">📦 Order Pipeline</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate('/admin/orders?filter=pending')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingOrders}</div>
                  <p className="text-xs text-muted-foreground mt-1">Awaiting payment confirmation</p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate('/admin/orders?filter=processing')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Processing</CardTitle>
                  <Package className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.processingOrders}</div>
                  <p className="text-xs text-muted-foreground mt-1">Being prepared</p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-green-200 bg-green-50"
                onClick={() => navigate('/admin/warehouse-operations')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ready to Ship</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.readyToShipOrders}</div>
                  <p className="text-xs text-green-600 mt-1">Can be shipped now</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Orders */}
          <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Latest Orders</CardTitle>
            <CardDescription>Most recent 8 orders</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/orders')}>
            View All Orders
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No orders yet</p>
            ) : (
              stats.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="border rounded-lg p-3 hover:shadow-md hover:bg-gray-50 transition-all cursor-pointer"
                  onClick={() => navigate(`/admin/orders?expand=${order.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <p className="text-sm font-semibold">#{order.order_no}</p>
                      <Badge
                        variant={
                          order.payment_state === 'SUCCESS' ? 'default' :
                          order.payment_state === 'FAILED' ? 'destructive' :
                          'secondary'
                        }
                        className="text-xs"
                      >
                        {order.status?.toLowerCase().replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {order.customer_name || 'Customer'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(order.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-primary ml-3">{formatCurrency(order.total)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
        </div>

        {/* Right Column - 1/3 width - Needs Attention */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <h3 className="text-lg font-semibold mb-3">⚠️ Needs Attention</h3>
            <div className="space-y-3">
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-red-200 bg-red-50"
                onClick={() => navigate('/admin/orders?filter=failed')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.failedPayments}</div>
                  <p className="text-xs text-red-600 mt-1">Need attention</p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-orange-200 bg-orange-50"
                onClick={() => navigate('/admin/inventory-alerts')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                  <Package className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{stats.lowStockAlerts}</div>
                  <p className="text-xs text-orange-600 mt-1">Items need reorder</p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-yellow-200 bg-yellow-50"
                onClick={() => navigate('/admin/premium-partners')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Merchant Apps</CardTitle>
                  <Crown className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.pendingMerchantApplications}</div>
                  <p className="text-xs text-yellow-600 mt-1">Awaiting approval</p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-purple-200 bg-purple-50"
                onClick={() => navigate('/admin/review-moderation')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reviews</CardTitle>
                  <Star className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{stats.pendingReviews}</div>
                  <p className="text-xs text-purple-600 mt-1">Pending moderation</p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow border-blue-200 bg-blue-50"
                onClick={() => navigate('/admin/warehouse-operations')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ready to Ship</CardTitle>
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.readyToShipOrders}</div>
                  <p className="text-xs text-blue-600 mt-1">Orders ready</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
