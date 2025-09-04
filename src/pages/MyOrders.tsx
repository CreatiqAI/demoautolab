import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, ArrowLeft, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'react-router-dom';
import Header from '@/components/Header';

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

  // Handle order expansion from navigation state
  useEffect(() => {
    if (location.state?.expandOrderId) {
      setExpandOrderId(location.state.expandOrderId);
      // Clear the state so it doesn't persist on page refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Auto-open the order details modal when expandOrderId is set and orders are loaded
  useEffect(() => {
    if (expandOrderId && orders.length > 0) {
      const orderToExpand = orders.find(order => order.id === expandOrderId);
      if (orderToExpand) {
        setSelectedOrder(orderToExpand);
        setIsViewDialogOpen(true);
        setExpandOrderId(null); // Reset after opening
      }
    }
  }, [expandOrderId, orders]);

  const fetchMyOrders = async () => {
    if (!user) {
      console.log('No user found, skipping order fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let ordersData: any[] = [];
      
      // Try the new simplified function first
      const { data: myOrdersData, error: myOrdersError } = await supabase
        .rpc('get_my_orders');

      if (!myOrdersError && myOrdersData) {
        ordersData = myOrdersData;
      } else {
        console.warn('get_my_orders failed, trying get_customer_orders:', myOrdersError);

        // Try the parametrized customer orders function
        const { data: functionData, error: functionError } = await supabase
          .rpc('get_customer_orders', { customer_user_id: user.id });

        if (!functionError && functionData) {
          ordersData = functionData;
        } else {
          console.warn('get_customer_orders failed, trying direct query:', functionError);

          // Fallback: Try direct query with user_id
          const { data: directData, error: directError } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (!directError && directData) {
            ordersData = directData;
          } else {
            console.warn('Direct user_id query failed:', directError);
            ordersData = [];
          }
        }
      }

      // Transform data to match expected interface
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
        order_items: order.order_items || []
      }));

      setOrders(transformedOrders);
      
    } catch (error: any) {
      console.error('Error fetching customer orders:', error);
      setOrders([]);
      // Don't show error toast since this is expected when database isn't fully set up
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'DELIVERED':
        return 'default';
      case 'CANCELLED':
      case 'REJECTED':
        return 'destructive';
      case 'DISPATCHED':
        return 'secondary';
      case 'PACKING':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getPaymentBadgeVariant = (state: string) => {
    switch (state) {
      case 'APPROVED':
        return 'default';
      case 'REJECTED':
        return 'destructive';
      case 'SUBMITTED':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const openViewDialog = (order: CustomerOrder) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">My Orders</h1>
            <p className="text-muted-foreground mb-8">
              Please log in to view your order history.
            </p>
            <Link to="/auth">
              <Button>
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Orders</h1>
            <p className="text-muted-foreground">
              Track your order history and status
            </p>
          </div>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Shop
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
            <CardDescription>
              Your recent orders and their current status
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
                <p className="text-muted-foreground mb-6">
                  You haven't placed any orders yet. Start shopping to see your order history here.
                </p>
                <Link to="/catalog">
                  <Button>
                    Browse Catalog
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">#{order.order_no}</div>
                          <div className="text-sm text-muted-foreground">{order.id.slice(0, 8)}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(order.created_at)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}</div>
                          <div className="text-sm text-muted-foreground">
                            {order.order_items.reduce((total, item) => total + item.quantity, 0)} pieces
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(order.total)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {order.status.toLowerCase().replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPaymentBadgeVariant(order.payment_state)}>
                          {order.payment_state.toLowerCase().replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openViewDialog(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* View Order Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>
                Complete order information and items
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Order Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Order #:</span> {selectedOrder.order_no}</div>
                      <div><span className="font-medium">Date:</span> {formatDate(selectedOrder.created_at)}</div>
                      <div><span className="font-medium">Status:</span> 
                        <Badge className="ml-2" variant={getStatusBadgeVariant(selectedOrder.status)}>
                          {selectedOrder.status.toLowerCase().replace('_', ' ')}
                        </Badge>
                      </div>
                      <div><span className="font-medium">Payment:</span> 
                        <Badge className="ml-2" variant={getPaymentBadgeVariant(selectedOrder.payment_state)}>
                          {selectedOrder.payment_state.toLowerCase().replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Delivery</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Method:</span> {selectedOrder.delivery_method.replace('-', ' ').toUpperCase()}</div>
                      <div><span className="font-medium">Payment Method:</span> {selectedOrder.payment_method.replace('-', ' ').toUpperCase()}</div>
                      <div><span className="font-medium">Delivery Fee:</span> {selectedOrder.delivery_fee === 0 ? 'FREE' : formatCurrency(selectedOrder.delivery_fee)}</div>
                    </div>
                  </div>
                </div>

                {selectedOrder.delivery_address && selectedOrder.delivery_method !== 'self-pickup' && (
                  <div>
                    <h4 className="font-semibold mb-2">Delivery Address</h4>
                    <div className="text-sm">
                      <div>{selectedOrder.delivery_address.address}</div>
                      <div>{selectedOrder.delivery_address.city}, {selectedOrder.delivery_address.state} {selectedOrder.delivery_address.postcode}</div>
                      {selectedOrder.delivery_address.notes && (
                        <div className="mt-2 text-muted-foreground">
                          <span className="font-medium">Notes:</span> {selectedOrder.delivery_address.notes}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Order Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>From Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.order_items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.component_name}</TableCell>
                          <TableCell><code className="text-xs bg-gray-100 px-1 rounded">{item.component_sku}</code></TableCell>
                          <TableCell>
                            {item.product_context ? (
                              <span className="text-sm text-muted-foreground">{item.product_context}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.total_price)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="border-t pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span>-{formatCurrency(selectedOrder.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span>{selectedOrder.delivery_fee === 0 ? 'FREE' : formatCurrency(selectedOrder.delivery_fee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SST (6%):</span>
                      <span>{formatCurrency(selectedOrder.tax)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div>
                    <h4 className="font-semibold mb-2">Order Notes</h4>
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}