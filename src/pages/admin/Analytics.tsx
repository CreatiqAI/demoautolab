import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Users,
  Package,
  Crown,
  BarChart3,
  PieChart,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Star
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('revenue');
  const [data, setData] = useState<any>({
    revenue: [],
    sales: [],
    customers: [],
    orders: [],
    inventory: [],
    merchants: []
  });
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all data
      const [ordersData, customersData, productsData, merchantsData] = await Promise.all([
        fetchOrders(),
        fetchCustomers(),
        fetchProducts(),
        fetchMerchants()
      ]);

      // Process analytics
      processRevenueAnalytics(ordersData);
      processSalesAnalytics(ordersData);
      processCustomerAnalytics(customersData, ordersData);
      processOrderAnalytics(ordersData);
      processInventoryAnalytics(productsData);
      processMerchantAnalytics(merchantsData);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data: functionData } = await (supabase.rpc as any)('get_admin_orders');
      if (functionData) return functionData;

      const { data } = await supabase
        .from('orders' as any)
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    } catch (error) {
      return [];
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data } = await supabase
        .from('customer_profiles' as any)
        .select('*');
      return data || [];
    } catch (error) {
      return [];
    }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await supabase
        .from('component_library' as any)
        .select('*');
      return data || [];
    } catch (error) {
      return [];
    }
  };

  const fetchMerchants = async () => {
    try {
      const { data } = await supabase
        .from('premium_partnerships' as any)
        .select('*');
      return data || [];
    } catch (error) {
      return [];
    }
  };

  const processRevenueAnalytics = (orders: any[]) => {
    // Only count orders with successful payments
    const successfulOrders = orders.filter(o => o.payment_state === 'SUCCESS' || o.payment_state === 'APPROVED');

    // Monthly revenue for last 12 months
    const monthlyRevenue: any[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthOrders = successfulOrders.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate.getMonth() === month.getMonth() &&
               orderDate.getFullYear() === month.getFullYear();
      });

      const revenue = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const b2cRevenue = monthOrders.filter(o => !o.is_merchant).reduce((sum, o) => sum + (o.total || 0), 0);
      const b2bRevenue = monthOrders.filter(o => o.is_merchant).reduce((sum, o) => sum + (o.total || 0), 0);

      monthlyRevenue.push({
        month: month.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' }),
        revenue: revenue,
        b2c: b2cRevenue,
        b2b: b2bRevenue,
        orders: monthOrders.length
      });
    }

    // Revenue by category
    const categoryRevenue: { [key: string]: number } = {};
    successfulOrders.forEach(order => {
      if (order.order_items && Array.isArray(order.order_items)) {
        order.order_items.forEach((item: any) => {
          const category = item.category || 'Other';
          categoryRevenue[category] = (categoryRevenue[category] || 0) + (item.unit_price * item.quantity || 0);
        });
      }
    });

    const categoryData = Object.entries(categoryRevenue).map(([name, value]) => ({
      name,
      value
    }));

    setData((prev: any) => ({
      ...prev,
      revenue: {
        monthly: monthlyRevenue,
        byCategory: categoryData,
        total: successfulOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        thisMonth: monthlyRevenue[monthlyRevenue.length - 1]?.revenue || 0,
        lastMonth: monthlyRevenue[monthlyRevenue.length - 2]?.revenue || 0
      }
    }));
  };

  const processSalesAnalytics = (orders: any[]) => {
    // Only count orders with successful payments
    const successfulOrders = orders.filter(o => o.payment_state === 'SUCCESS' || o.payment_state === 'APPROVED');

    // Top products
    const productSales: { [key: string]: { count: number; revenue: number } } = {};

    successfulOrders.forEach(order => {
      if (order.order_items && Array.isArray(order.order_items)) {
        order.order_items.forEach((item: any) => {
          const key = item.component_name || 'Unknown';
          if (!productSales[key]) {
            productSales[key] = { count: 0, revenue: 0 };
          }
          productSales[key].count += item.quantity || 1;
          productSales[key].revenue += (item.unit_price || 0) * (item.quantity || 1);
        });
      }
    });

    const topProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count) // Sort by quantity sold, not revenue
      .slice(0, 10);

    setData((prev: any) => ({
      ...prev,
      sales: {
        topProducts,
        totalUnits: Object.values(productSales).reduce((sum, p) => sum + p.count, 0)
      }
    }));
  };

  const processCustomerAnalytics = (customers: any[], orders: any[]) => {
    // Customer growth over time
    const monthlyCustomers: any[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const newCustomers = customers.filter(c => {
        const created = new Date(c.created_at);
        return created.getMonth() === month.getMonth() &&
               created.getFullYear() === month.getFullYear();
      });

      monthlyCustomers.push({
        month: month.toLocaleDateString('en-MY', { month: 'short' }),
        count: newCustomers.length
      });
    }

    // Customer segmentation
    const normal = customers.filter(c => c.customer_type !== 'merchant').length;
    const merchants = customers.filter(c => c.customer_type === 'merchant').length;

    // Top customers by spending
    const customerSpending: { [key: string]: number } = {};
    orders.forEach(order => {
      const customerId = order.customer_id || order.customer_name;
      if (customerId) {
        customerSpending[customerId] = (customerSpending[customerId] || 0) + (order.total || 0);
      }
    });

    const topCustomers = Object.entries(customerSpending)
      .map(([id, total]) => ({
        id,
        total,
        orders: orders.filter(o => o.customer_id === id || o.customer_name === id).length
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    setData((prev: any) => ({
      ...prev,
      customers: {
        growth: monthlyCustomers,
        segmentation: [
          { name: 'Normal Customers', value: normal },
          { name: 'Merchants', value: merchants }
        ],
        topCustomers,
        total: customers.length
      }
    }));
  };

  const processOrderAnalytics = (orders: any[]) => {
    // Only count orders with successful payments
    const successfulOrders = orders.filter(o => o.payment_state === 'SUCCESS' || o.payment_state === 'APPROVED');

    // Order status distribution
    const statusCounts: { [key: string]: number } = {};
    successfulOrders.forEach(order => {
      const status = order.status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const statusData = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value
    }));

    // Daily orders for last 30 days
    const dailyOrders: any[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);

      const dayOrders = successfulOrders.filter(o => {
        const orderDate = new Date(o.created_at);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === day.getTime();
      });

      dailyOrders.push({
        date: day.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      });
    }

    setData((prev: any) => ({
      ...prev,
      orders: {
        statusDistribution: statusData,
        daily: dailyOrders,
        total: successfulOrders.length,
        avgValue: successfulOrders.length > 0 ? successfulOrders.reduce((sum, o) => sum + (o.total || 0), 0) / successfulOrders.length : 0
      }
    }));
  };

  const processInventoryAnalytics = (products: any[]) => {
    const active = products.filter(p => p.is_active).length;
    const lowStock = products.filter(p => p.stock_quantity <= (p.reorder_level || 10)).length;
    const outOfStock = products.filter(p => p.stock_quantity === 0).length;

    const totalValue = products.reduce((sum, p) =>
      sum + (p.stock_quantity || 0) * (p.cost_price || 0), 0
    );

    setData((prev: any) => ({
      ...prev,
      inventory: {
        active,
        lowStock,
        outOfStock,
        totalValue,
        total: products.length
      }
    }));
  };

  const processMerchantAnalytics = (merchants: any[]) => {
    const professional = merchants.filter(m => m.subscription_plan === 'professional').length;
    const panel = merchants.filter(m => m.subscription_plan === 'panel').length;
    const pending = merchants.filter(m => !m.admin_approved).length;

    // Monthly recurring revenue
    const mrr = (professional * 99 / 12) + (panel * 350);
    const arr = (professional * 99) + (panel * 350 * 12);

    setData((prev: any) => ({
      ...prev,
      merchants: {
        segmentation: [
          { name: 'Professional', value: professional },
          { name: 'Panel', value: panel }
        ],
        total: merchants.length,
        pending,
        mrr,
        arr
      }
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics & Reports</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into your business performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="merchants">Merchants</TabsTrigger>
        </TabsList>

        {/* Revenue Analytics Tab */}
        <TabsContent value="revenue" className="space-y-6">
          {/* Revenue Overview Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.revenue?.total || 0)}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.revenue?.thisMonth || 0)}</div>
                {data.revenue?.lastMonth && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    {data.revenue.thisMonth > data.revenue.lastMonth ? (
                      <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                    )}
                    {Math.abs(((data.revenue.thisMonth - data.revenue.lastMonth) / data.revenue.lastMonth * 100)).toFixed(1)}% vs last month
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Month</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.revenue?.lastMonth || 0)}</div>
                <p className="text-xs text-muted-foreground">Previous month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Monthly</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.revenue?.monthly?.reduce((sum: number, m: any) => sum + m.revenue, 0) / 12 || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Last 12 months</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue for the last 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={data.revenue?.monthly || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Total Revenue" />
                  <Line type="monotone" dataKey="b2c" stroke="#3b82f6" strokeWidth={2} name="B2C Revenue" />
                  <Line type="monotone" dataKey="b2b" stroke="#8b5cf6" strokeWidth={2} name="B2B Revenue" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Category</CardTitle>
              <CardDescription>Distribution of revenue across product categories</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <RechartsPieChart>
                  <Pie
                    data={data.revenue?.byCategory || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(data.revenue?.byCategory || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Analytics Tab */}
        <TabsContent value="sales" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Units Sold</CardTitle>
                <Package className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{(data.sales?.totalUnits || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Across all products</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {(data.sales?.topProducts || []).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Products with sales</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Best Seller</CardTitle>
                <Star className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-purple-600 truncate">
                  {data.sales?.topProducts?.[0]?.name || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.sales?.topProducts?.[0]?.count || 0} units sold
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average per Product</CardTitle>
                <DollarSign className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {(data.sales?.topProducts || []).length > 0
                    ? Math.round((data.sales?.totalUnits || 0) / (data.sales?.topProducts || []).length)
                    : 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Units per product</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Products Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Top Selling Products
              </CardTitle>
              <CardDescription>Ranked by quantity sold (most popular items)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(data.sales?.topProducts || []).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No sales data available</p>
                ) : (
                  (data.sales?.topProducts || []).map((product: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-shadow bg-gradient-to-r from-gray-50 to-white"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {/* Rank Badge */}
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full font-bold text-white text-lg shadow-md ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                          index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                          index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                          'bg-gradient-to-br from-blue-400 to-blue-600'
                        }`}>
                          {index + 1}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base truncate">{product.name}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3 text-blue-600" />
                              <span className="text-sm font-medium text-blue-600">{product.count} units</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-green-600" />
                              <span className="text-sm font-medium text-green-600">{formatCurrency(product.revenue)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="text-right ml-4">
                        <p className="text-xs text-muted-foreground">Avg Price</p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(product.revenue / product.count)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Charts Side by Side */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Quantity Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Units Sold Comparison
                </CardTitle>
                <CardDescription>Quantity of units sold per product</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.sales?.topProducts || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#3b82f6" name="Units Sold" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Revenue Comparison
                </CardTitle>
                <CardDescription>Total revenue generated per product</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.sales?.topProducts || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customers Analytics Tab */}
        <TabsContent value="customers" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.customers?.total || 0}</div>
                <p className="text-xs text-muted-foreground">Registered</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New This Month</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.customers?.growth?.[data.customers.growth.length - 1]?.count || 0}
                </div>
                <p className="text-xs text-muted-foreground">New signups</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">B2C Customers</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.customers?.segmentation?.[0]?.value || 0}
                </div>
                <p className="text-xs text-muted-foreground">Normal customers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">B2B Merchants</CardTitle>
                <Crown className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.customers?.segmentation?.[1]?.value || 0}
                </div>
                <p className="text-xs text-muted-foreground">Merchant accounts</p>
              </CardContent>
            </Card>
          </div>

          {/* Customer Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Growth</CardTitle>
              <CardDescription>New customer acquisitions over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data.customers?.growth || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="New Customers" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Customer Segmentation */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Segmentation</CardTitle>
                <CardDescription>Distribution by account type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={data.customers?.segmentation || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(data.customers?.segmentation || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Customers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>By total spending</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(data.customers?.topCustomers || []).slice(0, 8).map((customer: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">Customer {customer.id}</p>
                          <p className="text-xs text-muted-foreground">{customer.orders} orders</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold">{formatCurrency(customer.total)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Orders Analytics Tab */}
        <TabsContent value="orders" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.orders?.total || 0}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.orders?.avgValue || 0)}</div>
                <p className="text-xs text-muted-foreground">Per order</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.orders?.daily?.[data.orders.daily.length - 1]?.orders || 0}
                </div>
                <p className="text-xs text-muted-foreground">New orders today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.orders?.daily?.[data.orders.daily.length - 1]?.revenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">From today's orders</p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Orders Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Orders (Last 30 Days)</CardTitle>
              <CardDescription>Order volume and revenue trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={data.orders?.daily || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} name="Orders" />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue (RM)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Order Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status Distribution</CardTitle>
              <CardDescription>Current orders by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={data.orders?.statusDistribution || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(data.orders?.statusDistribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>

                <div className="space-y-2">
                  {(data.orders?.statusDistribution || []).map((status: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <Badge variant="outline">{status.name}</Badge>
                      </div>
                      <span className="font-medium">{status.value} orders</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Analytics Tab */}
        <TabsContent value="inventory" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.inventory?.total || 0}</div>
                <p className="text-xs text-muted-foreground">SKUs in system</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Products</CardTitle>
                <Package className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{data.inventory?.active || 0}</div>
                <p className="text-xs text-muted-foreground">Currently active</p>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                <Package className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{data.inventory?.lowStock || 0}</div>
                <p className="text-xs text-orange-600">Need reorder</p>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                <Package className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{data.inventory?.outOfStock || 0}</div>
                <p className="text-xs text-red-600">Unavailable</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Inventory Summary</CardTitle>
                <CardDescription>Stock status and value</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">Total Inventory Value</p>
                <p className="text-2xl font-bold">{formatCurrency(data.inventory?.totalValue || 0)}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="font-medium">Well Stocked</p>
                    <p className="text-sm text-muted-foreground">Above reorder level</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {(data.inventory?.total || 0) - (data.inventory?.lowStock || 0) - (data.inventory?.outOfStock || 0)} items
                  </Badge>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="font-medium">Low Stock</p>
                    <p className="text-sm text-muted-foreground">At or below reorder level</p>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">
                    {data.inventory?.lowStock || 0} items
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Out of Stock</p>
                    <p className="text-sm text-muted-foreground">Zero inventory</p>
                  </div>
                  <Badge className="bg-red-100 text-red-800">
                    {data.inventory?.outOfStock || 0} items
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Merchants Analytics Tab */}
        <TabsContent value="merchants" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
                <Crown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.merchants?.total || 0}</div>
                <p className="text-xs text-muted-foreground">Partner accounts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{data.merchants?.pending || 0}</div>
                <p className="text-xs text-yellow-600">Awaiting approval</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(data.merchants?.mrr || 0)}</div>
                <p className="text-xs text-muted-foreground">MRR from subscriptions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Annual Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(data.merchants?.arr || 0)}</div>
                <p className="text-xs text-muted-foreground">ARR from subscriptions</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Merchant Plan Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Subscription Plans</CardTitle>
                <CardDescription>Distribution by tier</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={data.merchants?.segmentation || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(data.merchants?.segmentation || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#8b5cf6'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>By subscription tier</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {(data.merchants?.segmentation || []).map((plan: any, index: number) => {
                    const monthlyRevenue = plan.name === 'Professional'
                      ? plan.value * 99 / 12
                      : plan.value * 350;
                    const annualRevenue = plan.name === 'Professional'
                      ? plan.value * 99
                      : plan.value * 350 * 12;

                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge className={index === 0 ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                            {plan.name} ({plan.value} merchants)
                          </Badge>
                          <span className="text-sm font-medium">
                            {plan.name === 'Professional' ? 'RM 99/year' : 'RM 350/month'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Monthly Revenue:</span>
                          <span className="font-bold">{formatCurrency(monthlyRevenue)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Annual Revenue:</span>
                          <span className="font-bold">{formatCurrency(annualRevenue)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Merchant Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Merchant Program Metrics</CardTitle>
              <CardDescription>Key performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Merchant Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(data.merchants?.arr || 0)}</p>
                  <p className="text-xs text-muted-foreground">Annual recurring revenue</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Avg Revenue per Merchant</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency((data.merchants?.arr || 0) / (data.merchants?.total || 1))}
                  </p>
                  <p className="text-xs text-muted-foreground">Per year per merchant</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Growth Potential</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {data.merchants?.pending || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Applications pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
