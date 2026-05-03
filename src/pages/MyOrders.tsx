import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, ArrowLeft, Package, Truck, CheckCircle, Clock, XCircle, CreditCard, Receipt, ShoppingBag, Lock, Unlock, Calendar, TrendingUp, ExternalLink, RotateCcw, MessageCircle, Ban, AlertTriangle, Loader2, FileDown, Printer, X, MapPin } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/useCartDB';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

declare global {
  interface Window {
    html2pdf: any;
  }
}

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
  const { addToCart } = useCart();
  const [reorderingId, setReorderingId] = useState<string | null>(null);
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
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<CustomerOrder | null>(null);
  const [timeFilter, setTimeFilter] = useState('6months');
  const { toast } = useToast();

  // Load HTML2PDF library
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.async = true;
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Cancellable statuses - before shipment
  const CANCELLABLE_STATUSES = ['PROCESSING', 'PACKING'];

  // Time-filtered orders
  const filteredRecentOrders = (() => {
    const base = timeFilter === 'all' && hasExtendedAccess ? [...recentOrders, ...archivedOrders] : recentOrders;
    if (timeFilter === '6months' || timeFilter === 'all') return base;
    const now = new Date();
    return base.filter(order => {
      const orderDate = new Date(order.created_at);
      if (timeFilter === '7days') { const c = new Date(now); c.setDate(c.getDate() - 7); return orderDate >= c; }
      if (timeFilter === '30days') { const c = new Date(now); c.setDate(c.getDate() - 30); return orderDate >= c; }
      if (timeFilter === '3months') { const c = new Date(now); c.setMonth(c.getMonth() - 3); return orderDate >= c; }
      return true;
    });
  })();

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;

    setCancellingOrder(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'CANCELLED',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Order Cancelled",
        description: `Order #${selectedOrder.order_no} has been cancelled successfully.`,
      });

      setShowCancelDialog(false);
      setIsViewDialogOpen(false);
      fetchMyOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCancellingOrder(false);
    }
  };

  const convertToWords = (num: number): string => {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

    if (num === 0) return 'ZERO';

    function convertLessThanOneThousand(n: number): string {
      if (n === 0) return '';
      if (n < 20) return ones[n] || '';

      const digit = n % 10;
      const ten = Math.floor(n / 10) % 10;
      const hundred = Math.floor(n / 100);

      let result = '';
      if (hundred > 0) result += (ones[hundred] || '') + ' HUNDRED ';

      const tensAndOnes = n % 100;
      if (tensAndOnes < 20 && tensAndOnes > 0) {
        result += ones[tensAndOnes] || '';
      } else {
        if (ten >= 2) result += (tens[ten] || '');
        if (digit > 0) result += (ten >= 2 ? ' ' : '') + (ones[digit] || '');
      }

      return result.trim();
    }

    const wholeNum = Math.round(num);
    if (wholeNum === 0) return 'ZERO';

    const million = Math.floor(wholeNum / 1000000);
    const thousand = Math.floor((wholeNum % 1000000) / 1000);
    const remainder = wholeNum % 1000;

    let result = '';
    if (million > 0) {
      const millionPart = convertLessThanOneThousand(million);
      if (millionPart) result += millionPart + ' MILLION ';
    }
    if (thousand > 0) {
      const thousandPart = convertLessThanOneThousand(thousand);
      if (thousandPart) result += thousandPart + ' THOUSAND ';
    }
    if (remainder > 0) {
      const remainderPart = convertLessThanOneThousand(remainder);
      if (remainderPart) result += remainderPart;
    }

    return result.trim() || 'ZERO';
  };

  const openInvoiceModal = (order: CustomerOrder) => {
    setSelectedOrderForInvoice(order);
    setIsInvoiceModalOpen(true);
  };

  const closeInvoiceModal = () => {
    setIsInvoiceModalOpen(false);
    setSelectedOrderForInvoice(null);
  };

  const printInvoice = () => {
    window.print();
  };

  const downloadInvoicePDF = () => {
    if (!selectedOrderForInvoice) return;

    const invoiceBody = document.getElementById('customerInvoiceBody');
    const opt = {
      margin: 0.1,
      filename: `invoice-${selectedOrderForInvoice.order_no}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    if (window.html2pdf) {
      window.html2pdf().from(invoiceBody).set(opt).save();
    } else {
      toast({
        title: "Error",
        description: "PDF library not loaded. Please try again.",
        variant: "destructive"
      });
    }
  };

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
              ordersData = ordersWithItems;
            }
          } catch (error) {
            // Gracefully handle any errors - display orders without images
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

  // Reorder a previous order. Looks up current stock + price for each item
  // and adds the smaller of (ordered qty, available stock) to cart. Items
  // that are completely out of stock are skipped with a warning.
  const handleReorder = async (order: CustomerOrder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please log in to reorder.', variant: 'destructive' });
      return;
    }
    if (!order.order_items?.length) return;
    setReorderingId(order.id);
    try {
      const skus = order.order_items.map(i => i.component_sku);
      const { data: components } = await supabase
        .from('component_library' as any)
        .select('component_sku, name, normal_price, merchant_price, stock_level, default_image_url, is_active')
        .in('component_sku', skus);
      const compMap = new Map<string, any>(
        ((components as any[] | null) ?? []).map(c => [c.component_sku, c])
      );

      let added = 0;
      const limited: string[] = [];   // items added at less than requested qty
      const outOfStock: string[] = [];
      const removed: string[] = [];   // SKU no longer in catalog or inactive

      for (const item of order.order_items) {
        const comp = compMap.get(item.component_sku);
        if (!comp || !comp.is_active) {
          removed.push(item.component_name);
          continue;
        }
        const available = Math.max(0, Number(comp.stock_level) || 0);
        if (available <= 0) {
          outOfStock.push(item.component_name);
          continue;
        }
        const qty = Math.min(item.quantity, available);
        if (qty < item.quantity) limited.push(`${item.component_name} (${qty}/${item.quantity})`);
        await addToCart({
          component_sku: item.component_sku,
          name: comp.name || item.component_name,
          // Use the price the user previously paid as the displayed price.
          // The cart/checkout will recompute with current pricing rules.
          normal_price: Number(comp.normal_price) || item.unit_price,
          quantity: qty,
          product_name: item.product_context || item.component_name,
          component_image: comp.default_image_url || item.component_image || undefined,
        });
        added++;
      }

      // Surface the outcome with appropriate variant
      if (added === 0) {
        toast({
          title: 'Could not reorder',
          description: outOfStock.length > 0
            ? `All items are out of stock: ${outOfStock.join(', ')}`
            : `None of the items are available anymore.`,
          variant: 'destructive',
        });
      } else if (limited.length > 0 || outOfStock.length > 0 || removed.length > 0) {
        const parts: string[] = [`${added} item${added === 1 ? '' : 's'} added to cart`];
        if (limited.length) parts.push(`Stock-limited: ${limited.join(', ')}`);
        if (outOfStock.length) parts.push(`Out of stock: ${outOfStock.join(', ')}`);
        if (removed.length) parts.push(`No longer available: ${removed.join(', ')}`);
        toast({
          title: 'Added with warnings',
          description: parts.join(' · '),
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Reorder added to cart',
          description: `${added} item${added === 1 ? '' : 's'} added at current stock.`,
        });
      }
    } catch (err: any) {
      toast({ title: 'Reorder failed', description: err?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setReorderingId(null);
    }
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

  // For self-pickup orders with OUT_FOR_DELIVERY, display as READY_FOR_COLLECTION
  const getDisplayStatus = (status: string, deliveryMethod?: string): string => {
    if (status === 'OUT_FOR_DELIVERY' && deliveryMethod === 'self-pickup') return 'READY_FOR_COLLECTION';
    return status;
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      'PROCESSING': 'Processing',
      'PACKING': 'Packing',
      'OUT_FOR_DELIVERY': 'Out for Delivery',
      'READY_FOR_COLLECTION': 'Ready for Collection',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled',
      'PAYMENT_FAILED': 'Payment Failed',
    };
    return labels[status] || status.toLowerCase().replace(/_/g, ' ');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-3 w-3" />;
      case 'OUT_FOR_DELIVERY':
        return <Truck className="h-3 w-3" />;
      case 'READY_FOR_COLLECTION':
        return <MapPin className="h-3 w-3" />;
      case 'PACKING':
        return <Package className="h-3 w-3" />;
      case 'CANCELLED':
      case 'PAYMENT_FAILED':
        return <XCircle className="h-3 w-3" />;
      case 'PROCESSING':
        return <Clock className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'OUT_FOR_DELIVERY':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'READY_FOR_COLLECTION':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'PACKING':
        return 'bg-amber-100 text-amber-700 border-amber-200';
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
      <div className="bg-gray-50 flex flex-col">
        <Header />
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
          <div className="text-center px-4 sm:px-6 max-w-sm mx-auto">
            <div className="w-14 sm:w-16 h-14 sm:h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <ShoppingBag className="h-7 sm:h-8 w-7 sm:w-8 text-gray-400" />
            </div>
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Sign In Required</h1>
            <p className="text-sm sm:text-[15px] text-gray-500 mb-5 sm:mb-6">Please log in to view your order history.</p>
            <Button asChild variant="hero" className="mt-2 text-[13px] h-10 px-6 w-full sm:w-auto">
              <Link to="/auth">
                Sign In
              </Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 flex flex-col">
      <Header />

      <main className="container mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-8 min-h-[calc(100vh-80px)]">
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Shop
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-5">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">My Orders</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Track your order history and delivery status</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/my-insights')}>
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />My Insights
          </Button>
          <Select value={timeFilter} onValueChange={(v) => {
            if (v === 'all' && !hasExtendedAccess) { setShowUpgradeDialog(true); return; }
            setTimeFilter(v);
          }}>
            <SelectTrigger className="w-full sm:w-44 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="3months">Last 3 months</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="all" disabled={!hasExtendedAccess}>
                <span className="flex items-center gap-1.5">
                  All time {!hasExtendedAccess && <Lock className="h-3 w-3 text-muted-foreground" />}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Orders Yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                You haven't placed any orders yet. Start shopping to see your order history here.
              </p>
              <Button asChild>
                <Link to="/catalog">Browse Catalog</Link>
              </Button>
            </CardContent>
          </Card>
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

            {/* Recent Orders */}
            {filteredRecentOrders.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {timeFilter === '7days' ? 'Last 7 Days' : timeFilter === '30days' ? 'Last 30 Days' : timeFilter === '3months' ? 'Last 3 Months' : timeFilter === 'all' ? 'All Orders' : 'Last 6 Months'}
                  </h3>
                  <Badge variant="secondary" className="text-xs">{filteredRecentOrders.length}</Badge>
                </div>
                <div className="space-y-2">
                  {filteredRecentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white border rounded-lg px-3 sm:px-5 py-3 sm:py-4 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => openViewDialog(order)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                            <h3 className="font-semibold text-sm sm:text-base text-gray-900">#{order.order_no}</h3>
                            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[11px] sm:text-xs font-medium border ${getStatusColor(getDisplayStatus(order.status, order.delivery_method))} flex items-center gap-1`}>
                              {getStatusIcon(getDisplayStatus(order.status, order.delivery_method))}
                              {getStatusLabel(getDisplayStatus(order.status, order.delivery_method))}
                            </span>
                            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[11px] sm:text-xs font-medium border ${getPaymentColor(order.payment_state)}`}>
                              {order.payment_state.toLowerCase().replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 sm:gap-1.5">
                            <Clock className="h-3 sm:h-3.5 w-3 sm:w-3.5 flex-shrink-0" />
                            <span className="truncate">{formatDate(order.created_at)}</span>
                            <span className="text-gray-300 mx-0.5 sm:mx-1">|</span>
                            <span className="flex-shrink-0">{order.order_items.length} items ({order.order_items.reduce((t, i) => t + i.quantity, 0)} pcs)</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm sm:text-base text-gray-900">{formatCurrency(order.total)}</span>
                          <Eye className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : recentOrders.length > 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">No orders found in this time period.</p>
                <Button variant="link" size="sm" className="mt-1" onClick={() => setTimeFilter('6months')}>Show all recent orders</Button>
              </div>
            ) : null}

            {/* Archived Orders (Older than 6 Months) — hidden when "all time" filter is active */}
            {archivedOrders.length > 0 && timeFilter !== 'all' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Archived Orders (Older than 6 Months)</h3>
                    <Badge variant="secondary" className="text-xs">{archivedOrders.length}</Badge>
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

                <div className="space-y-2">
                  {archivedOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`relative bg-white border rounded-lg px-3 sm:px-5 py-3 sm:py-4 transition-all ${
                        hasExtendedAccess ? 'hover:shadow-sm cursor-pointer' : 'opacity-50'
                      }`}
                      onClick={() => hasExtendedAccess && openViewDialog(order)}
                    >
                      {!hasExtendedAccess && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg z-10">
                          <div className="text-center">
                            <Lock className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                            <p className="text-xs font-medium text-gray-600">Upgrade to View</p>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                            <h3 className="font-semibold text-sm sm:text-base text-gray-900">#{order.order_no}</h3>
                            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[11px] sm:text-xs font-medium border ${getStatusColor(getDisplayStatus(order.status, order.delivery_method))} flex items-center gap-1`}>
                              {getStatusIcon(getDisplayStatus(order.status, order.delivery_method))}
                              {getStatusLabel(getDisplayStatus(order.status, order.delivery_method))}
                            </span>
                            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[11px] sm:text-xs font-medium border ${getPaymentColor(order.payment_state)}`}>
                              {order.payment_state.toLowerCase().replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 sm:gap-1.5">
                            <Clock className="h-3 sm:h-3.5 w-3 sm:w-3.5 flex-shrink-0" />
                            <span className="truncate">{formatDate(order.created_at)}</span>
                            <span className="text-gray-300 mx-0.5 sm:mx-1">|</span>
                            <span className="flex-shrink-0">{order.order_items.length} items ({order.order_items.reduce((t, i) => t + i.quantity, 0)} pcs)</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm sm:text-base text-gray-900">{formatCurrency(order.total)}</span>
                          {hasExtendedAccess && <Eye className="h-4 w-4 text-gray-400" />}
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
        <DialogContent className="max-w-4xl mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">Unlock Complete Order History</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Choose a plan to access your orders older than 6 months</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 py-3 sm:py-4">
            {accessPlans.map((plan) => (
              <Card key={plan.id} className="relative hover:shadow-lg transition-shadow">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">{plan.plan_name}</CardTitle>
                  <CardDescription>
                    {plan.duration_months
                      ? `${plan.duration_months} ${plan.duration_months === 1 ? 'month' : 'months'} access`
                      : 'Lifetime access'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="mb-3 sm:mb-4">
                    <div className="text-2xl sm:text-3xl font-bold text-green-600">
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

          <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
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
      {/* Order Detail Drawer — slides from right */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isViewDialogOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsViewDialogOpen(false)}
      />
      <div
        className={`fixed top-0 right-0 h-full w-full sm:max-w-md bg-white text-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isViewDialogOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedOrder && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">#{selectedOrder.order_no}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Order details</p>
              </div>
              <button onClick={() => setIsViewDialogOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">

              {/* Status banner — prominent and user-friendly */}
              <div className={`mx-4 sm:mx-6 mt-4 sm:mt-6 rounded-lg px-3 sm:px-4 py-3 ${
                selectedOrder.status === 'COMPLETED' ? 'bg-green-50 border border-green-200' :
                selectedOrder.status === 'CANCELLED' ? 'bg-red-50 border border-red-200' :
                selectedOrder.status === 'PAYMENT_FAILED' ? 'bg-red-50 border border-red-200' :
                selectedOrder.status === 'READY_FOR_COLLECTION' || (selectedOrder.status === 'OUT_FOR_DELIVERY' && selectedOrder.delivery_method === 'self-pickup') ? 'bg-indigo-50 border border-indigo-200' :
                selectedOrder.status === 'OUT_FOR_DELIVERY' ? 'bg-blue-50 border border-blue-200' :
                'bg-amber-50 border border-amber-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    selectedOrder.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                    selectedOrder.status === 'READY_FOR_COLLECTION' || (selectedOrder.status === 'OUT_FOR_DELIVERY' && selectedOrder.delivery_method === 'self-pickup') ? 'bg-indigo-500 text-white' :
                    selectedOrder.status === 'OUT_FOR_DELIVERY' ? 'bg-blue-500 text-white' :
                    selectedOrder.status === 'CANCELLED' || selectedOrder.status === 'PAYMENT_FAILED' ? 'bg-red-500 text-white' :
                    'bg-amber-500 text-white'
                  }`}>
                    {getStatusIcon(getDisplayStatus(selectedOrder.status, selectedOrder.delivery_method))}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{(() => {
                      const ds = getDisplayStatus(selectedOrder.status, selectedOrder.delivery_method);
                      return ds === 'PROCESSING' ? 'Your order is being prepared' :
                      ds === 'PACKING' ? 'Your order is being packed' :
                      ds === 'READY_FOR_COLLECTION' ? 'Your order is ready for collection' :
                      ds === 'OUT_FOR_DELIVERY' ? 'Your order is on the way' :
                      ds === 'COMPLETED' && selectedOrder.delivery_method === 'self-pickup' ? 'Your order has been collected' :
                      ds === 'COMPLETED' ? 'Your order has been delivered' :
                      ds === 'CANCELLED' ? 'This order was cancelled' :
                      'Payment failed';
                    })()
                    }</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(selectedOrder.status === 'READY_FOR_COLLECTION' || (selectedOrder.status === 'OUT_FOR_DELIVERY' && selectedOrder.delivery_method === 'self-pickup'))
                        ? '17, Jalan 7/95B, Cheras Utama, 56100 Cheras, KL'
                        : selectedOrder.status === 'OUT_FOR_DELIVERY' && selectedOrder.courier_tracking_number
                        ? `Tracking: ${selectedOrder.courier_tracking_number}`
                        : formatDate(selectedOrder.updated_at)
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Meta — Created / Payment / Status */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 px-4 sm:px-6 py-4 sm:py-6">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">Ordered on</p>
                  <p className="text-sm text-gray-900">{new Date(selectedOrder.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">Payment</p>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border ${getPaymentColor(selectedOrder.payment_state)}`}>
                    {selectedOrder.payment_state === 'SUCCESS' ? 'Paid' : selectedOrder.payment_state.toLowerCase()}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">Status</p>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border ${getStatusColor(getDisplayStatus(selectedOrder.status, selectedOrder.delivery_method))}`}>
                    {getStatusLabel(getDisplayStatus(selectedOrder.status, selectedOrder.delivery_method))}
                  </span>
                </div>
              </div>

              {/* Timeline */}
              {selectedOrder.payment_state === 'SUCCESS' && !['PAYMENT_FAILED', 'CANCELLED'].includes(selectedOrder.status) && (
                <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <p className="text-[11px] text-muted-foreground mb-3">Timeline</p>
                  <div className="relative pl-6 space-y-5">
                    <div className="absolute left-[9px] top-1 bottom-1 w-px bg-gray-200" />
                    {(selectedOrder.delivery_method === 'self-pickup' ? [
                      { key: 'PROCESSING', label: 'Order received', desc: 'Payment confirmed and order placed' },
                      { key: 'PACKING', label: 'Packing in progress', desc: 'Items being packed' },
                      { key: 'READY_FOR_COLLECTION', label: 'Ready for collection', desc: 'Collect at: 17, Jalan 7/95B, Cheras Utama, 56100 KL' },
                      { key: 'COMPLETED', label: 'Collected', desc: 'Order has been collected' },
                    ] : [
                      { key: 'PROCESSING', label: 'Order received', desc: 'Payment confirmed and order placed' },
                      { key: 'PACKING', label: 'Packing in progress', desc: 'Items being packed for delivery' },
                      { key: 'OUT_FOR_DELIVERY', label: 'Shipped', desc: selectedOrder.courier_tracking_number ? `${selectedOrder.courier_provider === 'JNT' ? 'J&T Express' : selectedOrder.courier_provider || 'Courier'} · ${selectedOrder.courier_tracking_number}` : 'On the way to you' },
                      { key: 'COMPLETED', label: 'Delivered', desc: 'Order has been delivered' },
                    ]).map((step) => {
                      const statusOrder = selectedOrder.delivery_method === 'self-pickup'
                        ? ['PROCESSING', 'PACKING', 'READY_FOR_COLLECTION', 'COMPLETED']
                        : ['PROCESSING', 'PACKING', 'OUT_FOR_DELIVERY', 'COMPLETED'];
                      // Map OUT_FOR_DELIVERY to READY_FOR_COLLECTION for self-pickup (backward compat)
                      const effectiveStatus = selectedOrder.delivery_method === 'self-pickup' && selectedOrder.status === 'OUT_FOR_DELIVERY' ? 'READY_FOR_COLLECTION' : selectedOrder.status;
                      const currentIdx = statusOrder.indexOf(effectiveStatus);
                      const stepIdx = statusOrder.indexOf(step.key);
                      const done = stepIdx <= currentIdx;
                      const isCurrent = step.key === effectiveStatus;
                      return (
                        <div key={step.key} className="relative flex items-start gap-3">
                          <div className={`absolute -left-6 w-[18px] h-[18px] rounded-full flex items-center justify-center ${
                            done ? 'bg-green-500' : 'bg-white border-2 border-gray-300'
                          }`}>
                            {done && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm leading-tight ${done ? 'text-gray-900' : 'text-gray-400'} ${isCurrent ? 'font-medium' : ''}`}>
                              {step.label}
                            </p>
                            <p className={`text-xs mt-0.5 ${done ? 'text-muted-foreground' : 'text-gray-300'}`}>{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {selectedOrder.courier_tracking_number && selectedOrder.courier_provider === 'JNT' && (
                    <a href={`https://www.jtexpress.my/tracking?billcode=${selectedOrder.courier_tracking_number}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline mt-4 ml-6">
                      <ExternalLink className="h-3 w-3" /> Track on J&T Express
                    </a>
                  )}
                </div>
              )}

              {/* Delivery */}
              <div className="px-4 sm:px-6 py-4 sm:py-6 border-t">
                <p className="text-[11px] text-muted-foreground mb-3">Delivery</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Method</span>
                    <span className="text-gray-900 capitalize">{selectedOrder.delivery_method.replace('-', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee</span>
                    <span className="text-gray-900">{selectedOrder.delivery_fee === 0 ? <span className="text-green-600">Free</span> : formatCurrency(selectedOrder.delivery_fee)}</span>
                  </div>
                  {selectedOrder.delivery_address && selectedOrder.delivery_method !== 'self-pickup' && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-0.5">Address</p>
                      <p className="text-sm text-gray-900">{selectedOrder.delivery_address.address}</p>
                      {selectedOrder.delivery_address.notes && <p className="text-xs text-muted-foreground mt-1">Note: {selectedOrder.delivery_address.notes}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="px-4 sm:px-6 py-4 sm:py-6 border-t">
                <p className="text-[11px] text-muted-foreground mb-3">Items ({selectedOrder.order_items.length})</p>
                <div className="space-y-4">
                  {selectedOrder.order_items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      {item.component_image ? (
                        <img src={item.component_image} alt={item.component_name} className="w-11 h-11 rounded-lg border object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Package className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 leading-tight">{item.component_name}</p>
                        <p className="text-xs text-muted-foreground">{item.product_context || item.component_sku}</p>
                      </div>
                      <p className="text-xs text-muted-foreground flex-shrink-0">{item.quantity}x</p>
                      <p className="text-xs sm:text-sm text-gray-900 flex-shrink-0 w-16 sm:w-20 text-right">{formatCurrency(item.total_price)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment */}
              <div className="px-4 sm:px-6 py-4 sm:py-6 border-t">
                <p className="text-[11px] text-muted-foreground mb-3">Payment</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(selectedOrder.subtotal)}</span></div>
                  {selectedOrder.voucher_code && selectedOrder.voucher_discount && (
                    <div className="flex justify-between text-green-600"><span>Voucher ({selectedOrder.voucher_code})</span><span>-{formatCurrency(selectedOrder.voucher_discount)}</span></div>
                  )}
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(selectedOrder.discount)}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{selectedOrder.delivery_fee === 0 ? 'Free' : formatCurrency(selectedOrder.delivery_fee)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">SST (6%)</span><span>{formatCurrency(selectedOrder.tax)}</span></div>
                  <div className="flex justify-between pt-3 mt-2 border-t font-medium"><span>Total</span><span>{formatCurrency(selectedOrder.total)}</span></div>
                  <p className="text-xs text-muted-foreground pt-1">via {selectedOrder.payment_method.replace('-', ' ')}</p>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="px-4 sm:px-6 py-4 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{selectedOrder.notes}</p>
                </div>
              )}
            </div>

            {/* Footer actions — pinned at bottom */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t bg-white flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => handleReorder(selectedOrder, e)}
                disabled={reorderingId === selectedOrder.id || !selectedOrder.order_items?.length}
              >
                {reorderingId === selectedOrder.id ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                )}
                Reorder
              </Button>
              {selectedOrder.payment_state === 'SUCCESS' && (
                <Button variant="outline" size="sm" onClick={() => openInvoiceModal(selectedOrder)}>
                  <FileDown className="h-3.5 w-3.5 mr-1.5" /> Invoice
                </Button>
              )}
              {(selectedOrder.payment_state === 'PENDING' || selectedOrder.payment_state === 'FAILED') && (
                <Button size="sm" onClick={() => { setIsViewDialogOpen(false); navigate('/payment-gateway', { state: { orderData: { orderId: selectedOrder.id, orderNumber: selectedOrder.order_no, total: selectedOrder.total, paymentMethod: selectedOrder.payment_method, customerName: selectedOrder.customer_name, customerEmail: selectedOrder.customer_email || '' } } }); }}>
                  <CreditCard className="h-3.5 w-3.5 mr-1.5" /> {selectedOrder.payment_state === 'FAILED' ? 'Retry Payment' : 'Pay Now'}
                </Button>
              )}
              {selectedOrder.status !== 'CANCELLED' && CANCELLABLE_STATUSES.includes(selectedOrder.status) && (
                <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setShowCancelDialog(true)}>
                  <Ban className="h-3.5 w-3.5 mr-1.5" /> Cancel
                </Button>
              )}
              {selectedOrder.payment_state === 'SUCCESS' && ['COMPLETED'].includes(selectedOrder.status) && (() => { const d = Math.floor((Date.now() - new Date(selectedOrder.updated_at).getTime()) / 86400000); return d <= 7; })() && (
                <a href={`https://wa.me/60342977668?text=${encodeURIComponent(`Hi, I need help with a return for Order #${selectedOrder.order_no}`)}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm"><MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Return</Button>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Order Confirmation */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Cancel Order?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel order <strong>#{selectedOrder?.order_no}</strong>?
              This action cannot be undone. If you've already made a payment, please contact our admin for a refund.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancellingOrder}>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              disabled={cancellingOrder}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancellingOrder ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Order'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoice Modal */}
      {isInvoiceModalOpen && selectedOrderForInvoice && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeInvoiceModal(); }}
        >
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto shadow-xl mx-2 sm:mx-0">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
              <h2 className="text-base font-semibold">Invoice Preview</h2>
              <button onClick={closeInvoiceModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div id="customer-invoice-content">
              <div id="customerInvoiceBody" className="p-3 sm:p-5 bg-white">
                <div style={{ padding: '10px', fontFamily: 'Arial, sans-serif', width: '100%', margin: '0 auto', fontSize: '9px', display: 'flex', flexDirection: 'column', minHeight: '95vh' }}>
                  <div style={{ flex: '0 0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div>
                        <h2 style={{ margin: '0', fontSize: '16px' }}>AUTO LABS SDN BHD</h2>
                        <p style={{ margin: '2px 0', fontSize: '9px' }}>17, Jalan 7/95B, Cheras Utama</p>
                        <p style={{ margin: '2px 0', fontSize: '9px' }}>56100 Cheras, Wilayah Persekutuan Kuala Lumpur</p>
                        <p style={{ margin: '2px 0', fontSize: '9px' }}>Tel: 03-4297 7668</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ border: '1px solid #000', padding: '5px 15px', display: 'inline-block' }}>
                          <h2 style={{ margin: '0', textAlign: 'center', fontSize: '14px' }}>INVOICE</h2>
                          <p style={{ margin: '3px 0', fontSize: '9px' }}><strong>Order ID: </strong>{selectedOrderForInvoice.order_no}</p>
                        </div>
                        <p style={{ margin: '5px 0 2px', fontSize: '9px' }}><strong>Date: </strong>{new Date(selectedOrderForInvoice.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p style={{ margin: '2px 0', fontSize: '9px' }}><strong>A/C Code: </strong>DMKT78C</p>
                        <p style={{ margin: '2px 0', fontSize: '9px' }}>
                          {selectedOrderForInvoice.payment_state === 'SUCCESS'
                            ? <><strong>Term: </strong>Cash / <span style={{ textDecoration: 'line-through' }}>Credit</span></>
                            : <><strong>Term: </strong><span style={{ textDecoration: 'line-through' }}>Cash</span> / Credit</>
                          }
                        </p>
                        <p style={{ margin: '2px 0', fontSize: '9px' }}><strong>Salesman: </strong>TECH</p>
                        <p style={{ margin: '2px 0', fontSize: '9px' }}><strong>Served By: </strong>HTL</p>
                      </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <p style={{ margin: '2px 0', fontSize: '9px' }}><strong>Bill To: </strong>{selectedOrderForInvoice.customer_name}</p>
                      <p style={{ margin: '2px 0', fontSize: '9px' }}>{selectedOrderForInvoice.delivery_address?.address || 'No address provided'}</p>
                      <p style={{ margin: '2px 0', fontSize: '9px' }}><strong>Attention: </strong>{selectedOrderForInvoice.customer_name}</p>
                      <p style={{ margin: '2px 0', fontSize: '9px' }}><strong>Tel: </strong>{selectedOrderForInvoice.customer_phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5px' }}>
                      <thead>
                        <tr><td colSpan={8} style={{ borderTop: '1px solid #000', padding: '0' }} /></tr>
                        <tr>
                          <th style={{ padding: '3px', textAlign: 'left', fontSize: '9px', fontWeight: 'bold' }}>No.</th>
                          <th style={{ padding: '3px', textAlign: 'left', fontSize: '9px', fontWeight: 'bold' }}>Stock Code</th>
                          <th style={{ padding: '3px', textAlign: 'left', fontSize: '9px', fontWeight: 'bold' }}>Description</th>
                          <th style={{ padding: '3px', textAlign: 'center', fontSize: '9px', fontWeight: 'bold' }}>Qty</th>
                          <th style={{ padding: '3px', textAlign: 'center', fontSize: '9px', fontWeight: 'bold' }}>U.O.M</th>
                          <th style={{ padding: '3px', textAlign: 'right', fontSize: '9px', fontWeight: 'bold' }}>Unit Price</th>
                          <th style={{ padding: '3px', textAlign: 'right', fontSize: '9px', fontWeight: 'bold' }}>Discount</th>
                          <th style={{ padding: '3px', textAlign: 'right', fontSize: '9px', fontWeight: 'bold' }}>Amount</th>
                        </tr>
                        <tr><td colSpan={8} style={{ borderBottom: '1px solid #000', padding: '0' }} /></tr>
                      </thead>
                      <tbody>
                        {selectedOrderForInvoice.order_items.map((item, index) => (
                          <tr key={item.id}>
                            <td style={{ fontSize: '9px', padding: '2px 3px' }}>{index + 1}</td>
                            <td style={{ fontSize: '9px', padding: '2px 3px' }}>{item.component_sku}</td>
                            <td style={{ fontSize: '9px', padding: '2px 3px' }}>{item.component_name}</td>
                            <td style={{ fontSize: '9px', textAlign: 'center', padding: '2px 3px' }}>{item.quantity}</td>
                            <td style={{ fontSize: '9px', textAlign: 'center', padding: '2px 3px' }}>Unit</td>
                            <td style={{ fontSize: '9px', textAlign: 'right', padding: '2px 3px' }}>RM {item.unit_price.toFixed(2)}</td>
                            <td style={{ fontSize: '9px', textAlign: 'center', padding: '2px 3px' }} />
                            <td style={{ fontSize: '9px', textAlign: 'right', padding: '2px 3px' }}>RM {item.total_price.toFixed(2)}</td>
                          </tr>
                        ))}
                        {Array.from({ length: Math.max(0, 12 - selectedOrderForInvoice.order_items.length) }, (_, i) => (
                          <tr key={`filler-${i}`}><td colSpan={8} style={{ fontSize: '9px', padding: '2px 3px' }}>&nbsp;</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ flex: '0 0 auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5px' }}>
                      <tbody><tr>
                        <td colSpan={7} style={{ textAlign: 'right', padding: '3px', fontSize: '9px', fontWeight: 'bold' }}>TOTAL</td>
                        <td style={{ textAlign: 'right', padding: '3px', fontSize: '9px', fontWeight: 'bold', borderTop: '1px solid #000' }}>RM {selectedOrderForInvoice.total.toFixed(2)}</td>
                      </tr></tbody>
                    </table>
                    <div style={{ marginTop: '5px' }}>
                      <hr style={{ borderTop: '1px solid #000', borderBottom: 'none', margin: '0' }} />
                      <p style={{ fontSize: '10px', margin: '5px 0', fontWeight: 'bold' }}>RINGGIT MALAYSIA {convertToWords(selectedOrderForInvoice.total)} ONLY</p>
                      <p style={{ fontSize: '9px', marginTop: '5px' }}>Note:</p>
                      <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '8px' }}>
                        <li>Please issue all payment in the name of <strong>AUTO LABS SDN BHD</strong></li>
                        <li>All items remain the property of the company until fully paid</li>
                        <li>No return or exchange of goods after inspection</li>
                        <li>All prices are subject to 10% service tax</li>
                        <li>Stock borrowed for more than seven (7) days will be billed in full of <strong>AUTO LABS SDN BHD</strong></li>
                      </ol>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                      <div><p style={{ borderTop: '1px solid #000', display: 'inline-block', paddingTop: '3px', fontSize: '9px' }}>Received By</p></div>
                      <div><p style={{ borderTop: '1px solid #000', display: 'inline-block', paddingTop: '3px', fontSize: '9px' }}>Company Chop & Signature</p></div>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '10px', fontStyle: 'italic', fontSize: '8px' }}><p>This is a computer generated copy.<br />No signature is required.</p></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t p-3 sm:p-4 flex flex-wrap justify-center gap-2 sm:gap-3">
              <Button onClick={printInvoice}><Printer className="h-4 w-4 mr-2" />Print Invoice</Button>
              <Button onClick={downloadInvoicePDF} variant="outline"><FileDown className="h-4 w-4 mr-2" />Download PDF</Button>
              <Button onClick={closeInvoiceModal} variant="outline">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
