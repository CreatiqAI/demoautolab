import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, ArrowLeft, Package, Truck, CheckCircle, Clock, XCircle, CreditCard, Receipt, ShoppingBag, Lock, Unlock, Calendar, TrendingUp, ExternalLink, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface CustomerOrder {
  id: string;
  order_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_method: string;
  delivery_address: any;
  delivery_fee: number;
  payment_method: string;
  payment_state: string;
  subtotal: number;
  tax: number;
  discount: number;
  shipping_fee: number;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  voucher_code: string | null;
  voucher_discount: number | null;
  // Courier tracking fields
  courier_provider: string | null;
  courier_tracking_number: string | null;
  order_items: Array<{
    id: string;
    component_sku: string;
    component_name: string;
    component_image: string | null;
    product_context: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

interface ExtendedAccessPlan {
  id: string;
  plan_name: string;
  duration_months: number | null;
  price: number;
  description: string;
}

export default function MyOrders() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [recentOrders, setRecentOrders] = useState<CustomerOrder[]>([]);
  const [archivedOrders, setArchivedOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [expandOrderId, setExpandOrderId] = useState<string | null>(null);
  const [hasExtendedAccess, setHasExtendedAccess] = useState(false);
  const [extendedAccessExpiry, setExtendedAccessExpiry] = useState<string | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [accessPlans, setAccessPlans] = useState<ExtendedAccessPlan[]>([]);
  const [purchasingPlan, setPurchasingPlan] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMyOrders();
  }, [user]);

  useEffect(() => {
    if (location.state?.expandOrderId) {
      setExpandOrderId(location.state.expandOrderId);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (expandOrderId && orders.length > 0) {
      const orderToExpand = orders.find(order => order.id === expandOrderId);
      if (orderToExpand) {
        setSelectedOrder(orderToExpand);
        setIsViewDialogOpen(true);
        setExpandOrderId(null);
      }
    }
  }, [expandOrderId, orders]);

  const fetchMyOrders = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let ordersData: any[] = [];

      // Check if user has extended access (if tables exist)
      try {
        const { data: accessData, error: accessError } = await supabase
          .from('order_history_access')
          .select('*, order_history_access_pricing(plan_name, duration_months)')
          .eq('customer_id', user.id)
          .eq('payment_status', 'PAID')
          .maybeSingle();

        // Only process if no error (table exists) and data was returned
        if (!accessError && accessData) {
          // Check if access is still valid
          if (!accessData.expires_at || new Date(accessData.expires_at) > new Date()) {
            setHasExtendedAccess(true);
            setExtendedAccessExpiry(accessData.expires_at);
          }
        }

        // Fetch access plans (if table exists)
        const { data: plansData, error: plansError } = await supabase
          .from('order_history_access_pricing')
          .select('*')
          .eq('is_active', true)
          .order('price', { ascending: true });

        if (!plansError && plansData) {
          setAccessPlans(plansData);
        }
      } catch (err) {
        // Tables don't exist yet - silently ignore, feature not yet implemented
      }

      const { data: ordersWithItems, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            component_sku,
            component_name,
            product_context,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!ordersError && ordersWithItems) {
        ordersData = ordersWithItems;

        // Fetch component images from component_library
        const allSkus = ordersWithItems
          .flatMap((order: any) => order.order_items || [])
          .map((item: any) => item.component_sku)
          .filter((sku: string) => sku); // Remove null/undefined

        if (allSkus.length > 0) {
          try {
            // Fetch all component images to avoid special character issues with .in() operator
            const { data: allComponents, error: componentsError } = await supabase
              .from('component_library')
              .select('component_sku, default_image_url');

            if (!componentsError && allComponents) {
              // Create a set of SKUs we need
              const uniqueSkus = new Set(allSkus);

              // Filter to only the components we need
              const relevantComponents = allComponents.filter((c: any) =>
                uniqueSkus.has(c.component_sku)
              );

              // Create a map of SKU to image
              const imageMap = new Map(
                relevantComponents.map((c: any) => [c.component_sku, c.default_image_url])
              );

              // Add images to order items
              ordersData = ordersWithItems.map((order: any) => ({
                ...order,
                order_items: (order.order_items || []).map((item: any) => ({
                  ...item,
                  component_image: imageMap.get(item.component_sku) || null
                }))
              }));
            } else {
              // If error fetching images, just use orders without images
              console.warn('Could not fetch component images:', componentsError);
              ordersData = ordersWithItems;
            }
          } catch (error) {
            // Gracefully handle any errors - display orders without images
            console.warn('Error fetching component images:', error);
            ordersData = ordersWithItems;
          }
        }
      } else {
        const { data: basicData, error: basicError } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!basicError && basicData) {
          ordersData = basicData.map(order => ({
            ...order,
            order_items: []
          }));
        }
      }

      const transformedOrders = ordersData.map((order: any) => ({
        id: order.id,
        order_no: order.order_no || `ORD-${order.id?.slice(0, 8)}`,
        customer_name: order.customer_name || 'You',
        customer_phone: order.customer_phone || '',
        customer_email: order.customer_email || '',
        delivery_method: order.delivery_method || 'Standard',
        delivery_address: order.delivery_address || {},
        delivery_fee: order.delivery_fee || order.shipping_fee || 0,
        payment_method: order.payment_method || 'Online',
        payment_state: order.payment_state || 'PENDING',
        subtotal: order.subtotal || 0,
        tax: order.tax || 0,
        discount: order.discount || 0,
        shipping_fee: order.shipping_fee || 0,
        total: order.total || 0,
        status: order.status || 'PROCESSING',
        notes: order.notes || '',
        created_at: order.created_at,
        updated_at: order.updated_at,
        voucher_code: order.voucher_code || null,
        voucher_discount: order.voucher_discount || null,
        courier_provider: order.courier_provider || null,
        courier_tracking_number: order.courier_tracking_number || null,
        order_items: order.order_items || []
      }));

      setOrders(transformedOrders);

      // Split orders into recent (6 months) and archived
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const recent = transformedOrders.filter(order =>
        new Date(order.created_at) >= sixMonthsAgo
      );

      const archived = transformedOrders.filter(order =>
        new Date(order.created_at) < sixMonthsAgo
      );

      setRecentOrders(recent);
      setArchivedOrders(archived);
    } catch (error: any) {
      console.error('Error fetching customer orders:', error);
      setOrders([]);
      setRecentOrders([]);
      setArchivedOrders([]);
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
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'DELIVERED':
        return <CheckCircle className="h-4 w-4" />;
      case 'OUT_FOR_DELIVERY':
        return <Truck className="h-4 w-4" />;
      case 'READY_FOR_DELIVERY':
        return <CheckCircle className="h-4 w-4" />;
      case 'PACKING':
      case 'PICKING':
        return <Package className="h-4 w-4" />;
      case 'CANCELLED':
      case 'PAYMENT_FAILED':
        return <XCircle className="h-4 w-4" />;
      case 'PROCESSING':
        return <Clock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'DELIVERED':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'OUT_FOR_DELIVERY':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'READY_FOR_DELIVERY':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'PACKING':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'PICKING':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CANCELLED':
      case 'PAYMENT_FAILED':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPaymentColor = (state: string) => {
    switch (state) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'FAILED':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'PROCESSING':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'PENDING':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const openViewDialog = (order: CustomerOrder) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  const handlePurchaseHistoryAccess = async (planId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase history access",
        variant: "destructive"
      });
      return;
    }

    try {
      setPurchasingPlan(true);

      // Call the purchase function
      const { data, error } = await supabase.rpc('purchase_order_history_access', {
        p_customer_id: user.id,
        p_pricing_plan_id: planId
      });

      if (error) throw error;

      if (!data || !data.success) {
        throw new Error(data?.message || 'Failed to initiate purchase');
      }

      // Close upgrade dialog
      setShowUpgradeDialog(false);

      // Redirect to payment gateway with access purchase data
      navigate('/payment-gateway', {
        state: {
          orderData: {
            orderId: data.access_id,
            orderNumber: `HIST-${data.access_id.slice(0, 8).toUpperCase()}`,
            total: data.amount,
            paymentMethod: 'fpx',
            customerName: user.email?.split('@')[0] || 'Customer',
            customerEmail: user.email || ''
          },
          isHistoryAccessPurchase: true
        }
      });

      toast({
        title: "Redirecting to Payment",
        description: "Complete payment to unlock your order history"
      });

    } catch (error: any) {
      console.error('Error purchasing history access:', error);
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to initiate purchase. Please try again.",
        variant: "destructive"
      });
    } finally {
      setPurchasingPlan(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-8 w-8 text-gray-400" />
            </div>
            <h1 className="text-xl font-heading font-bold uppercase italic text-gray-900 mb-2">Sign In Required</h1>
            <p className="text-[15px] text-gray-500 mb-6">Please log in to view your order history.</p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-lime-600 text-white font-bold uppercase tracking-wide text-[13px] hover:bg-lime-700 transition-all rounded-lg"
            >
              Sign In
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-1">
        {/* Back Button */}
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-lime-700 mb-6 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Shop
        </Link>

        {/* Page Header */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-heading font-bold text-gray-900 uppercase italic mb-2">My Orders</h1>
          <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">Track your order history and delivery status.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Package className="h-12 w-12 animate-pulse mx-auto mb-4 text-lime-600" />
              <p className="text-gray-500 text-[15px]">Loading orders...</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-xl p-8 text-center shadow-md">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-heading font-bold uppercase italic text-gray-900 mb-2">No Orders Yet</h3>
            <p className="text-[15px] text-gray-500 mb-6 max-w-md mx-auto">
              You haven't placed any orders yet. Start shopping to see your order history here.
            </p>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-lime-600 text-white font-bold uppercase tracking-wide text-[13px] hover:bg-lime-700 transition-all rounded-lg"
            >
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Extended Access Banner */}
            {hasExtendedAccess && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Unlock className="h-6 w-6 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-900">Extended History Access Active</h3>
                      <p className="text-sm text-green-700">
                        {extendedAccessExpiry
                          ? `Access until ${formatDate(extendedAccessExpiry)}`
                          : 'Lifetime access'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Orders (Last 6 Months) */}
            {recentOrders.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <h2 className="text-xl font-bold text-gray-900">Recent Orders (Last 6 Months)</h2>
                  <Badge variant="secondary">{recentOrders.length}</Badge>
                </div>
                <div className="grid gap-4">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`bg-white border-l-4 rounded-lg p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group ${
                        order.payment_state === 'SUCCESS'
                          ? 'border-l-green-500 hover:border-l-green-600'
                          : order.payment_state === 'FAILED'
                            ? 'border-l-red-500 hover:border-l-red-600'
                            : 'border-l-yellow-500 hover:border-l-yellow-600'
                      }`}
                      onClick={() => openViewDialog(order)}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Left Section - Order Info */}
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                            order.payment_state === 'SUCCESS'
                              ? 'bg-green-50 group-hover:bg-green-100'
                              : order.payment_state === 'FAILED'
                                ? 'bg-red-50 group-hover:bg-red-100'
                                : 'bg-yellow-50 group-hover:bg-yellow-100'
                          }`}>
                            <Receipt className={`h-5 w-5 ${
                              order.payment_state === 'SUCCESS'
                                ? 'text-green-600'
                                : order.payment_state === 'FAILED'
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-gray-900 text-lg">#{order.order_no}</h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide border ${getStatusColor(order.status)} flex items-center gap-1.5`}>
                                {getStatusIcon(order.status)}
                                {order.status.toLowerCase().replace('_', ' ')}
                              </span>
                              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide border ${getPaymentColor(order.payment_state)}`}>
                                {order.payment_state.toLowerCase().replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDate(order.created_at)}
                            </p>
                          </div>
                        </div>

                        {/* Right Section - Order Summary */}
                        <div className="flex items-center gap-6 md:gap-8">
                          <div className="text-center">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Items</p>
                            <p className="text-lg font-bold text-gray-900">
                              {order.order_items.length}
                            </p>
                            <p className="text-xs text-gray-400">
                              ({order.order_items.reduce((t, i) => t + i.quantity, 0)} pcs)
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Total</p>
                            <p className={`text-xl font-bold ${
                              order.payment_state === 'SUCCESS'
                                ? 'text-green-600'
                                : order.payment_state === 'FAILED'
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                            }`}>
                              {formatCurrency(order.total)}
                            </p>
                          </div>
                          <button className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                            order.payment_state === 'SUCCESS'
                              ? 'bg-green-100 group-hover:bg-green-600'
                              : order.payment_state === 'FAILED'
                                ? 'bg-red-100 group-hover:bg-red-600'
                                : 'bg-yellow-100 group-hover:bg-yellow-600'
                          }`}>
                            <Eye className={`h-5 w-5 transition-colors ${
                              order.payment_state === 'SUCCESS'
                                ? 'text-green-600 group-hover:text-white'
                                : order.payment_state === 'FAILED'
                                  ? 'text-red-600 group-hover:text-white'
                                  : 'text-yellow-600 group-hover:text-white'
                            }`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Archived Orders (Older than 6 Months) */}
            {archivedOrders.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-gray-600" />
                    <h2 className="text-xl font-bold text-gray-900">Archived Orders (Older than 6 Months)</h2>
                    <Badge variant="secondary">{archivedOrders.length}</Badge>
                  </div>
                  {!hasExtendedAccess && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowUpgradeDialog(true)}
                      className="flex items-center gap-2"
                    >
                      <Unlock className="h-4 w-4" />
                      Unlock Full History
                    </Button>
                  )}
                </div>

                {!hasExtendedAccess && (
                  <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 mb-4">
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <Lock className="h-6 w-6 text-orange-600 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-orange-900 mb-1">Limited Access</h3>
                          <p className="text-sm text-orange-700 mb-3">
                            You can only view orders from the last 6 months for free. Upgrade to access your complete order history.
                          </p>
                          <Button
                            size="sm"
                            onClick={() => setShowUpgradeDialog(true)}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            <TrendingUp className="h-4 w-4 mr-2" />
                            View Plans
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4">
                  {archivedOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`relative bg-white border-l-4 border-l-gray-400 rounded-lg p-5 shadow-sm transition-all duration-200 ${
                        hasExtendedAccess ? 'hover:shadow-md hover:border-l-gray-600 cursor-pointer group' : 'opacity-50'
                      }`}
                      onClick={() => hasExtendedAccess && openViewDialog(order)}
                    >
                      {/* Lock Overlay for Non-Extended Users */}
                      {!hasExtendedAccess && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg z-10">
                          <div className="text-center">
                            <Lock className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-gray-700">Upgrade to View</p>
                            <p className="text-xs text-gray-500 mt-1">Unlock full order history</p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Left Section - Order Info */}
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 bg-gray-50 group-hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                            <Receipt className="h-5 w-5 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-gray-900 text-lg">#{order.order_no}</h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide border ${getStatusColor(order.status)} flex items-center gap-1.5`}>
                                {getStatusIcon(order.status)}
                                {order.status.toLowerCase().replace('_', ' ')}
                              </span>
                              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide border ${getPaymentColor(order.payment_state)}`}>
                                {order.payment_state.toLowerCase().replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDate(order.created_at)}
                            </p>
                          </div>
                        </div>

                        {/* Right Section - Order Summary */}
                        <div className="flex items-center gap-6 md:gap-8">
                          <div className="text-center">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Items</p>
                            <p className="text-lg font-bold text-gray-900">
                              {order.order_items.length}
                            </p>
                            <p className="text-xs text-gray-400">
                              ({order.order_items.reduce((t, i) => t + i.quantity, 0)} pcs)
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Total</p>
                            <p className="text-xl font-bold text-gray-700">
                              {formatCurrency(order.total)}
                            </p>
                          </div>
                          {hasExtendedAccess && (
                            <button className="w-10 h-10 bg-gray-100 group-hover:bg-gray-600 rounded-lg flex items-center justify-center transition-all flex-shrink-0">
                              <Eye className="h-5 w-5 text-gray-600 group-hover:text-white transition-colors" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Unlock Complete Order History</DialogTitle>
            <DialogDescription>Choose a plan to access your orders older than 6 months</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            {accessPlans.map((plan) => (
              <Card key={plan.id} className="relative hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{plan.plan_name}</CardTitle>
                  <CardDescription>
                    {plan.duration_months
                      ? `${plan.duration_months} ${plan.duration_months === 1 ? 'month' : 'months'} access`
                      : 'Lifetime access'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-green-600">
                      {formatCurrency(plan.price)}
                    </div>
                    {plan.duration_months && (
                      <p className="text-sm text-gray-500">
                        {formatCurrency(plan.price / plan.duration_months)}/month
                      </p>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>

                  <Button
                    className="w-full"
                    onClick={() => handlePurchaseHistoryAccess(plan.id)}
                    disabled={purchasingPlan}
                  >
                    {purchasingPlan ? 'Processing...' : 'Purchase Access'}
                  </Button>

                  {plan.duration_months === null && (
                    <Badge className="absolute top-2 right-2 bg-yellow-500">Best Value</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">What's Included?</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>✓ Access to all historical orders beyond 6 months</li>
              <li>✓ Download order invoices and receipts</li>
              <li>✓ Complete transaction history for accounting</li>
              <li>✓ Track warranty and returns easily</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Details Modal */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-6xl bg-white border border-gray-200 rounded-lg p-0 max-h-[90vh] overflow-hidden">
          {selectedOrder && (
            <>
              {/* Dynamic Header Based on Payment Status */}
              <div className={`sticky top-0 text-white p-6 z-10 rounded-t-lg ${
                selectedOrder.payment_state === 'SUCCESS'
                  ? 'bg-green-600'
                  : selectedOrder.payment_state === 'FAILED'
                    ? 'bg-red-600'
                    : 'bg-yellow-600'
              }`}>
                <DialogHeader>
                  <DialogDescription className="sr-only">Order details and status information</DialogDescription>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <DialogTitle className="text-2xl font-bold mb-2">
                        Order #{selectedOrder.order_no}
                      </DialogTitle>
                      <div className="flex items-center gap-4 text-white/80 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(selectedOrder.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4" />
                          <span>{selectedOrder.order_items.length} item{selectedOrder.order_items.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border ${getStatusColor(selectedOrder.status)} flex items-center gap-1.5`}>
                        {getStatusIcon(selectedOrder.status)}
                        {selectedOrder.status.toLowerCase().replace('_', ' ')}
                      </span>
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase border ${getPaymentColor(selectedOrder.payment_state)}`}>
                        {selectedOrder.payment_state.toLowerCase()}
                      </span>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* LEFT COLUMN - Order Details (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Order & Delivery Info Cards */}
                  <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-600 mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Order Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span className="text-gray-600">Order Number</span>
                        <span className="font-semibold text-gray-900">{selectedOrder.order_no}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span className="text-gray-600">Payment Method</span>
                        <span className="font-semibold text-gray-900">{selectedOrder.payment_method.replace('-', ' ').toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Payment Status</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${getPaymentColor(selectedOrder.payment_state)}`}>
                          {selectedOrder.payment_state.toLowerCase().replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-600 mb-3 flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Delivery Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span className="text-gray-600">Method</span>
                        <span className="font-semibold text-gray-900">{selectedOrder.delivery_method.replace('-', ' ').toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Delivery Fee</span>
                        <span className="font-semibold text-gray-900">
                          {selectedOrder.delivery_fee === 0 ? (
                            <span className="text-green-600">FREE</span>
                          ) : (
                            formatCurrency(selectedOrder.delivery_fee)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Address */}
                {selectedOrder.delivery_address && selectedOrder.delivery_method !== 'self-pickup' && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-600 mb-3 flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Delivery Address
                    </h4>
                    <div className="text-sm text-gray-700">
                      <p className="font-semibold">{selectedOrder.delivery_address.address}</p>
                      <p className="mt-1">{selectedOrder.delivery_address.city}, {selectedOrder.delivery_address.state} {selectedOrder.delivery_address.postcode}</p>
                      {selectedOrder.delivery_address.notes && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-600 italic">
                            <span className="font-semibold">Note:</span> {selectedOrder.delivery_address.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Order Items - Scrollable */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    Order Items ({selectedOrder.order_items.length})
                  </h4>
                  <div className="max-h-64 overflow-y-auto space-y-3">
                    {selectedOrder.order_items.map((item) => (
                      <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex gap-3">
                        {/* Product Image */}
                        {item.component_image && (
                          <div className="w-16 h-16 bg-white border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={item.component_image}
                              alt={item.component_name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm mb-1">{item.component_name}</p>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <code className="text-xs bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-600">
                              {item.component_sku}
                            </code>
                            {item.product_context && (
                              <span className="text-xs text-gray-500">
                                From: {item.product_context}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-600">
                              <span className="font-semibold">{item.quantity}</span> × {formatCurrency(item.unit_price)}
                            </p>
                            <p className="font-bold text-sm text-gray-900">{formatCurrency(item.total_price)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    {selectedOrder.voucher_code && selectedOrder.voucher_discount && (
                      <div className="flex justify-between items-center text-green-600">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">VOUCHER</Badge>
                          {selectedOrder.voucher_code}
                        </span>
                        <span className="font-semibold">-{formatCurrency(selectedOrder.voucher_discount)}</span>
                      </div>
                    )}
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between items-center text-green-600">
                        <span>Discount</span>
                        <span className="font-semibold">-{formatCurrency(selectedOrder.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Delivery Fee</span>
                      <span className="font-semibold text-gray-900">
                        {selectedOrder.delivery_fee === 0 ? (
                          <span className="text-green-600">FREE</span>
                        ) : (
                          formatCurrency(selectedOrder.delivery_fee)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">SST (6%)</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(selectedOrder.tax)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-gray-300">
                      <span className="font-bold text-gray-900">GRAND TOTAL</span>
                      <span className="font-bold text-xl text-gray-900">{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Order Notes */}
                {selectedOrder.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Special Instructions
                    </h4>
                    <p className="text-sm text-gray-700 italic">{selectedOrder.notes}</p>
                  </div>
                )}

                  {/* Payment Retry Button */}
                  {(selectedOrder.payment_state === 'PENDING' || selectedOrder.payment_state === 'FAILED') && (
                    <div className={`border rounded-lg p-4 ${
                      selectedOrder.payment_state === 'FAILED'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <h4 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-3 flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {selectedOrder.payment_state === 'FAILED' ? 'Payment Failed' : 'Payment Required'}
                      </h4>
                      <p className="text-sm text-gray-700 mb-4">
                        {selectedOrder.payment_state === 'FAILED'
                          ? 'Your payment could not be processed. Please try again with a different payment method.'
                          : 'Your order is awaiting payment. Complete your payment to process this order.'}
                      </p>
                      <Button
                        onClick={() => {
                          setIsViewDialogOpen(false);
                          navigate('/payment-gateway', {
                            state: {
                              orderData: {
                                orderId: selectedOrder.id,
                                orderNumber: selectedOrder.order_no,
                                total: selectedOrder.total,
                                paymentMethod: selectedOrder.payment_method,
                                customerName: selectedOrder.customer_name,
                                customerEmail: selectedOrder.customer_email || ''
                              }
                            }
                          });
                        }}
                        className={`w-full text-white ${
                          selectedOrder.payment_state === 'FAILED'
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-yellow-600 hover:bg-yellow-700'
                        }`}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {selectedOrder.payment_state === 'FAILED' ? 'Retry Payment' : 'Complete Payment'}
                      </Button>
                    </div>
                  )}

                  {/* Request Return Button - Show for delivered orders within 7 days */}
                  {selectedOrder.payment_state === 'SUCCESS' &&
                   ['DELIVERED', 'COMPLETED'].includes(selectedOrder.status) &&
                   (() => {
                     const deliveryDate = new Date(selectedOrder.updated_at);
                     const daysSinceDelivery = Math.floor((Date.now() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
                     return daysSinceDelivery <= 7;
                   })() && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-3 flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Need to Return?
                      </h4>
                      <p className="text-sm text-gray-700 mb-4">
                        If there's an issue with your order, you can request a return within 7 days of delivery.
                      </p>
                      <Button
                        onClick={() => {
                          navigate(`/return-request?orderId=${selectedOrder.id}`);
                        }}
                        variant="outline"
                        className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Request Return
                      </Button>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN - Order Status Timeline (1/3 width) */}
                <div className="lg:col-span-1">
                  <div className="sticky top-6">
                    {selectedOrder.payment_state === 'SUCCESS' && selectedOrder.status !== 'PAYMENT_FAILED' && selectedOrder.status !== 'CANCELLED' ? (
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Truck className="h-4 w-4 text-green-600" />
                          Order Status Timeline
                        </h3>

                        {/* Status Steps */}
                        <div className="space-y-3">
                          {[
                            { key: 'PROCESSING', label: 'Processing', desc: 'Order received and being processed' },
                            { key: 'PICKING', label: 'Picking', desc: 'Items being picked from warehouse' },
                            { key: 'PACKING', label: 'Packing', desc: 'Items being packed for delivery' },
                            { key: 'READY_FOR_DELIVERY', label: 'Ready', desc: 'Package ready for dispatch' },
                            { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Package on the way' },
                            { key: 'DELIVERED', label: 'Delivered', desc: 'Package delivered' },
                            { key: 'COMPLETED', label: 'Completed', desc: 'Order completed' }
                          ].map((step, index) => {
                            const statusOrder = ['PROCESSING', 'PICKING', 'PACKING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'];
                            const currentIndex = statusOrder.indexOf(selectedOrder.status);
                            const stepIndex = statusOrder.indexOf(step.key);
                            const isCompleted = stepIndex < currentIndex || (stepIndex === currentIndex);
                            const isCurrent = step.key === selectedOrder.status;

                            return (
                              <div key={step.key} className="flex items-start gap-3">
                                <div className="flex flex-col items-center">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                                    isCurrent
                                      ? 'bg-green-600 border-green-600'
                                      : isCompleted
                                        ? 'bg-green-100 border-green-600'
                                        : 'bg-white border-gray-300'
                                  }`}>
                                    {isCompleted && (
                                      <svg className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-green-600'}`} fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                  {index < 6 && (
                                    <div className={`w-0.5 h-8 ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`} />
                                  )}
                                </div>
                                <div className="flex-1 pb-2">
                                  <p className={`text-sm font-semibold ${isCurrent ? 'text-green-700' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                                    {step.label}
                                    {isCurrent && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Current</span>}
                                  </p>
                                  <p className={`text-xs ${isCurrent ? 'text-green-600' : isCompleted ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {step.desc}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Tracking Information */}
                        {selectedOrder.courier_tracking_number && (
                          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="text-xs font-bold uppercase tracking-wide text-blue-700 mb-2 flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              Tracking Information
                            </h4>
                            <div className="space-y-2">
                              {selectedOrder.courier_provider && (
                                <p className="text-sm text-blue-800">
                                  <span className="font-medium">Courier:</span> {selectedOrder.courier_provider === 'JNT' ? 'J&T Express' : selectedOrder.courier_provider === 'LALAMOVE' ? 'Lalamove' : selectedOrder.courier_provider}
                                </p>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-blue-800 font-medium">Tracking:</span>
                                <code className="px-2 py-1 bg-white border border-blue-200 rounded text-blue-900 font-mono text-sm">
                                  {selectedOrder.courier_tracking_number}
                                </code>
                              </div>
                              {selectedOrder.courier_provider === 'JNT' && (
                                <a
                                  href={`https://www.jtexpress.my/tracking?billcode=${selectedOrder.courier_tracking_number}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium mt-2"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Track Parcel on J&T Express
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : selectedOrder.payment_state === 'FAILED' ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="text-center">
                          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-3">
                            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-semibold text-red-900 mb-2">Payment Failed</h3>
                          <p className="text-xs text-red-700 mb-4">
                            This order's payment could not be processed. Please retry payment to continue.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="text-center">
                          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-3">
                            <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-semibold text-yellow-900 mb-2">Awaiting Payment</h3>
                          <p className="text-xs text-yellow-700 mb-4">
                            Please complete payment to start processing your order.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
