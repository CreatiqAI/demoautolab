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
import { Search, FileText, Download, Archive, Calendar, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ArchivedOrder {
  id: string;
  order_no: string;
  user_id: string | null;
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

export default function ArchivedOrders() {
  const [orders, setOrders] = useState<ArchivedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ArchivedOrder | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchArchivedOrders();
  }, []);

  const fetchArchivedOrders = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching archived orders...');

      let ordersData: any[] = [];

      // Fetch orders with COMPLETED status (uppercase - confirmed to work)
      console.log(`🔍 Fetching orders with status: "COMPLETED"`);
      const { data, error } = await supabase
        .from('orders' as any)
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
        .eq('status', 'COMPLETED')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        console.log(`✅ Found ${data.length} completed orders`);
        ordersData = data;
      } else if (error) {
        console.error(`❌ Failed to fetch completed orders:`, error);
        ordersData = [];
      } else {
        console.log(`⚠️ No completed orders found`);
        ordersData = [];
      }

      // Transform the data to match the expected interface
      const transformedOrders = ordersData.map((order: any) => ({
        id: order.id,
        order_no: order.order_no || `ORD-${order.id?.slice(0, 8)}`,
        user_id: order.user_id,
        customer_name: order.customer_name || 'Customer',
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
        status: order.status || 'COMPLETED',
        notes: order.notes || '',
        created_at: order.created_at,
        updated_at: order.updated_at,
        order_items: order.order_items || []
      }));

      setOrders(transformedOrders);

    } catch (error: any) {
      console.error('Error fetching archived orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateOrder = async (order: ArchivedOrder) => {
    if (!confirm(`Reactivate order #${order.order_no}? This will move it back to active orders with delivered status.`)) {
      return;
    }

    try {
      setLoading(true);

      // Update order status to DELIVERED (active status)
      // Note: Database enum uses UPPERCASE values (COMPLETED works, so DELIVERED should too)
      console.log('🔄 Attempting to reactivate order with status: DELIVERED (uppercase)');
      const updateData = {
        status: 'DELIVERED',
        updated_at: new Date().toISOString()
      };
      console.log('📝 Update data:', JSON.stringify(updateData));

      // Try the update
      const { error, data: updatedData } = await supabase
        .from('orders' as any)
        .update(updateData)
        .eq('id', order.id)
        .select();

      console.log('📊 Supabase response:', { error, updatedData });

      if (error) {
        console.error('❌ Update error details:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error hint:', error.hint);
        console.error('❌ Error details:', error.details);

        // Try alternative status values
        console.log('🔄 Trying alternative status values...');

        // Try each status value from the enum that might work for "active" orders
        const alternativeStatuses = ['PROCESSING', 'PACKING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY'];

        for (const altStatus of alternativeStatuses) {
          console.log(`🔍 Trying status: ${altStatus}`);
          const { error: altError, data: altData } = await supabase
            .from('orders' as any)
            .update({ status: altStatus, updated_at: new Date().toISOString() })
            .eq('id', order.id)
            .select();

          if (!altError) {
            console.log(`✅ Success with status: ${altStatus}`);
            toast({
              title: "Order Reactivated",
              description: `Order #${order.order_no} has been moved back to active orders with ${altStatus} status.`
            });
            fetchArchivedOrders();
            return; // Success, exit early
          } else {
            console.warn(`❌ ${altStatus} failed:`, altError.message);
          }
        }

        throw new Error(`Failed to reactivate order: ${error.message}`);
      }

      toast({
        title: "Order Reactivated",
        description: `Order #${order.order_no} has been moved back to active orders with delivered status.`
      });

      // Refresh the archived orders list
      fetchArchivedOrders();

    } catch (error: any) {
      console.error('Reactivate order error:', error);
      toast({
        title: "Failed to Reactivate Order",
        description: error.message || "Failed to reactivate order",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openViewDialog = (order: ArchivedOrder) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesDate = true;
    if (dateFilter) {
      const orderDate = new Date(order.updated_at).toDateString();
      const filterDate = new Date(dateFilter).toDateString();
      matchesDate = orderDate === filterDate;
    }

    return matchesSearch && matchesDate;
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Archived Orders</h2>
        <p className="text-muted-foreground">View and manage completed orders archive</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Completed Orders Archive
          </CardTitle>
          <CardDescription>
            Search through completed orders by order ID, customer name, or delivery date
          </CardDescription>

          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID, customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="relative max-w-sm">
              <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Filter by completion date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-8"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setDateFilter('');
              }}
              className="whitespace-nowrap"
            >
              Clear Filters
            </Button>
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
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Completed Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      {searchTerm || dateFilter
                        ? 'No archived orders found matching your criteria.'
                        : 'No completed orders in archive yet.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <React.Fragment key={order.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">#{order.order_no}</div>
                            <div className="text-sm text-muted-foreground">{order.id.slice(0, 8)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.customer_name}</div>
                            <div className="text-sm text-muted-foreground">{order.customer_phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(order.updated_at)}</TableCell>
                        <TableCell>{formatCurrency(order.total)}</TableCell>
                        <TableCell>
                          <Badge variant={getPaymentBadgeVariant(order.payment_state)}>
                            {order.payment_state.toLowerCase().replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openViewDialog(order);
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="View Details"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReactivateOrder(order);
                              }}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Reactivate Order"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedOrderId === order.id && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30">
                            <div className="p-6 space-y-6">
                              {/* Order Summary */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                  <h4 className="font-medium mb-2">Order Information</h4>
                                  <div className="text-sm space-y-1">
                                    <p><strong>Order #:</strong> {order.order_no}</p>
                                    <p><strong>Created:</strong> {formatDate(order.created_at)}</p>
                                    <p><strong>Completed:</strong> {formatDate(order.updated_at)}</p>
                                    <p><strong>Status:</strong> <Badge variant="default">Delivered</Badge></p>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-medium mb-2">Customer Information</h4>
                                  <div className="text-sm space-y-1">
                                    <p><strong>Name:</strong> {order.customer_name}</p>
                                    <p><strong>Phone:</strong> {order.customer_phone}</p>
                                    {order.customer_email && (
                                      <p><strong>Email:</strong> {order.customer_email}</p>
                                    )}
                                    <p><strong>Payment:</strong> {order.payment_method.replace('-', ' ').toUpperCase()}</p>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-medium mb-2">Order Summary</h4>
                                  <div className="text-sm space-y-1">
                                    <p><strong>Items:</strong> {order.order_items.reduce((sum, item) => sum + item.quantity, 0)} items</p>
                                    <p><strong>Subtotal:</strong> {formatCurrency(order.subtotal)}</p>
                                    <p><strong>Delivery:</strong> {order.delivery_fee === 0 ? 'FREE' : formatCurrency(order.delivery_fee)}</p>
                                    <p><strong>Total:</strong> <span className="font-semibold">{formatCurrency(order.total)}</span></p>
                                  </div>
                                </div>
                              </div>

                              {/* Order Items Summary */}
                              {order.order_items && order.order_items.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-3">Items Delivered ({order.order_items.length} items)</h4>
                                  <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="grid gap-2 max-h-60 overflow-y-auto">
                                      {order.order_items.map((item, index) => (
                                        <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                                          <div className="flex-1">
                                            <div className="font-medium text-sm">{item.component_name}</div>
                                            <div className="text-xs text-gray-600">SKU: {item.component_sku}</div>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-sm">Qty: {item.quantity}</div>
                                            <div className="text-sm font-medium">{formatCurrency(item.total_price)}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Notes */}
                              {order.notes && (
                                <div>
                                  <h4 className="font-medium mb-2">Notes</h4>
                                  <p className="text-sm bg-gray-50 p-3 rounded">{order.notes}</p>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Order Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Archived Order Details</DialogTitle>
            <DialogDescription>
              Complete information for this completed order
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Order Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Order #:</span> {selectedOrder.order_no}</div>
                    <div><span className="font-medium">Created:</span> {formatDate(selectedOrder.created_at)}</div>
                    <div><span className="font-medium">Completed:</span> {formatDate(selectedOrder.updated_at)}</div>
                    <div><span className="font-medium">Status:</span>
                      <Badge className="ml-2" variant="default">Delivered</Badge>
                    </div>
                    <div><span className="font-medium">Payment:</span>
                      <Badge className="ml-2" variant={getPaymentBadgeVariant(selectedOrder.payment_state)}>
                        {selectedOrder.payment_state.toLowerCase().replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Customer</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Name:</span> {selectedOrder.customer_name}</div>
                    <div><span className="font-medium">Phone:</span> {selectedOrder.customer_phone}</div>
                    {selectedOrder.customer_email && (
                      <div><span className="font-medium">Email:</span> {selectedOrder.customer_email}</div>
                    )}
                    <div><span className="font-medium">Payment Method:</span> {selectedOrder.payment_method.replace('-', ' ').toUpperCase()}</div>
                    <div><span className="font-medium">Delivery Method:</span> {selectedOrder.delivery_method.replace('-', ' ').toUpperCase()}</div>
                  </div>
                </div>
              </div>

              {selectedOrder.delivery_address && selectedOrder.delivery_method !== 'self-pickup' && (
                <div>
                  <h4 className="font-semibold mb-2">Delivery Address</h4>
                  <div className="text-sm bg-gray-50 p-3 rounded">
                    <div><span className="font-medium">Name:</span> {selectedOrder.delivery_address.fullName || selectedOrder.customer_name}</div>
                    <div><span className="font-medium">Phone:</span> {selectedOrder.delivery_address.phoneNumber || selectedOrder.customer_phone}</div>

                    {selectedOrder.delivery_address.address && (
                      <div className="mt-2">
                        <span className="font-medium">Address:</span>
                        <div className="whitespace-pre-line mt-1">{selectedOrder.delivery_address.address}</div>
                      </div>
                    )}

                    {selectedOrder.delivery_address.notes && (
                      <div className="mt-2 pt-2 border-t text-muted-foreground">
                        <span className="font-medium">Special Instructions:</span> {selectedOrder.delivery_address.notes}
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
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
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
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}