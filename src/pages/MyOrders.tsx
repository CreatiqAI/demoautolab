import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, ArrowLeft, Package, Truck, CheckCircle, Clock, XCircle, CreditCard, Receipt, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'react-router-dom';
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
  order_items: Array<{
    id: string;
    component_sku: string;
    component_name: string;
    product_context: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

export default function MyOrders() {
  const { user } = useAuth();
  const location = useLocation();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [expandOrderId, setExpandOrderId] = useState<string | null>(null);
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
        payment_state: order.payment_state || 'UNPAID',
        subtotal: order.subtotal || 0,
        tax: order.tax || 0,
        discount: order.discount || 0,
        shipping_fee: order.shipping_fee || 0,
        total: order.total || 0,
        status: order.status || 'PLACED',
        notes: order.notes || '',
        created_at: order.created_at,
        updated_at: order.updated_at,
        voucher_code: order.voucher_code || null,
        voucher_discount: order.voucher_discount || null,
        order_items: order.order_items || []
      }));

      setOrders(transformedOrders);
    } catch (error: any) {
      console.error('Error fetching customer orders:', error);
      setOrders([]);
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
      case 'DISPATCHED':
        return <Truck className="h-4 w-4" />;
      case 'PACKING':
        return <Package className="h-4 w-4" />;
      case 'CANCELLED':
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'DELIVERED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'DISPATCHED':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CANCELLED':
      case 'REJECTED':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'PACKING':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPaymentColor = (state: string) => {
    switch (state) {
      case 'APPROVED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'SUBMITTED':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const openViewDialog = (order: CustomerOrder) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
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
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group"
                onClick={() => openViewDialog(order)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Order Info */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-gray-100 group-hover:bg-lime-100 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                      <Receipt className="h-4 w-4 text-gray-500 group-hover:text-lime-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-heading font-bold text-gray-900 uppercase text-[15px]">#{order.order_no}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(order.status)} flex items-center gap-1`}>
                          {getStatusIcon(order.status)}
                          {order.status.toLowerCase().replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="text-center hidden sm:block">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-0.5">Items</p>
                      <p className="text-sm font-bold text-gray-900">
                        {order.order_items.length} <span className="text-gray-500 font-normal text-xs">({order.order_items.reduce((t, i) => t + i.quantity, 0)} pcs)</span>
                      </p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-0.5">Payment</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getPaymentColor(order.payment_state)}`}>
                        {order.payment_state.toLowerCase().replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-0.5">Total</p>
                      <p className="text-base font-heading font-bold text-gray-900 italic">{formatCurrency(order.total)}</p>
                    </div>
                    <button className="w-8 h-8 bg-gray-100 group-hover:bg-lime-600 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                      <Eye className="h-4 w-4 text-gray-500 group-hover:text-white" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* Order Details Modal */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-0 rounded-xl p-0">
          {selectedOrder && (
            <>
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 p-6 z-10">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-xl font-heading font-bold uppercase italic text-gray-900">
                        Order #{selectedOrder.order_no}
                      </DialogTitle>
                      <p className="text-[15px] text-gray-500 mt-1">{formatDate(selectedOrder.created_at)}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(selectedOrder.status)} flex items-center gap-1`}>
                        {getStatusIcon(selectedOrder.status)}
                        {selectedOrder.status.toLowerCase().replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="p-6 space-y-6">
                {/* Order & Delivery Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" /> Order Information
                    </h4>
                    <div className="space-y-2 text-[15px]">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Order ID</span>
                        <span className="font-medium text-gray-900">{selectedOrder.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Payment Method</span>
                        <span className="font-medium text-gray-900">{selectedOrder.payment_method.replace('-', ' ').toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Payment Status</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getPaymentColor(selectedOrder.payment_state)}`}>
                          {selectedOrder.payment_state.toLowerCase().replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-2">
                      <Truck className="h-4 w-4" /> Delivery
                    </h4>
                    <div className="space-y-2 text-[15px]">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Method</span>
                        <span className="font-medium text-gray-900">{selectedOrder.delivery_method.replace('-', ' ').toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Delivery Fee</span>
                        <span className="font-medium text-gray-900">
                          {selectedOrder.delivery_fee === 0 ? 'FREE' : formatCurrency(selectedOrder.delivery_fee)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Address */}
                {selectedOrder.delivery_address && selectedOrder.delivery_method !== 'self-pickup' && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-3">Delivery Address</h4>
                    <div className="text-[15px] text-gray-700">
                      <p>{selectedOrder.delivery_address.address}</p>
                      <p>{selectedOrder.delivery_address.city}, {selectedOrder.delivery_address.state} {selectedOrder.delivery_address.postcode}</p>
                      {selectedOrder.delivery_address.notes && (
                        <p className="mt-2 text-gray-500 italic">Note: {selectedOrder.delivery_address.notes}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Order Items */}
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-3">Order Items</h4>
                  <div className="space-y-2">
                    {selectedOrder.order_items.map((item) => (
                      <div key={item.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-[15px]">{item.component_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-500">
                              {item.component_sku}
                            </code>
                            {item.product_context && (
                              <span className="text-xs text-gray-400">from {item.product_context}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[15px] text-gray-500">{item.quantity} × {formatCurrency(item.unit_price)}</p>
                          <p className="font-bold text-gray-900">{formatCurrency(item.total_price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-gray-900 text-white rounded-lg p-4">
                  <h4 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Order Summary
                  </h4>
                  <div className="space-y-3 text-[15px]">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Subtotal</span>
                      <span>{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    {selectedOrder.voucher_code && selectedOrder.voucher_discount && (
                      <div className="flex justify-between text-lime-400">
                        <span>Voucher ({selectedOrder.voucher_code})</span>
                        <span>-{formatCurrency(selectedOrder.voucher_discount)}</span>
                      </div>
                    )}
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-lime-400">
                        <span>Discount</span>
                        <span>-{formatCurrency(selectedOrder.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Delivery Fee</span>
                      <span>{selectedOrder.delivery_fee === 0 ? 'FREE' : formatCurrency(selectedOrder.delivery_fee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">SST (6%)</span>
                      <span>{formatCurrency(selectedOrder.tax)}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-gray-700 text-lg">
                      <span className="font-bold">Total</span>
                      <span className="font-heading font-bold italic text-lime-400">{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Order Notes */}
                {selectedOrder.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <h4 className="text-xs font-medium uppercase tracking-wide text-yellow-700 mb-2">Order Notes</h4>
                    <p className="text-[15px] text-yellow-800">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
