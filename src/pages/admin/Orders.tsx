import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Eye, Search, Edit, Trash2, Download, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tables, Enums } from '@/integrations/supabase/types';

interface Order {
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

const ORDER_STATUS_OPTIONS = [
  { value: 'PLACED', label: 'Placed' },
  { value: 'PENDING_VERIFICATION', label: 'Pending Verification' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'PACKING', label: 'Packing' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REJECTED', label: 'Rejected' },
];

const PAYMENT_STATE_OPTIONS = [
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ON_CREDIT', label: 'On Credit' },
];

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const { toast } = useToast();

  const [editForm, setEditForm] = useState({
    status: '',
    payment_state: '',
    notes: ''
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    // Check for expand parameter in URL
    const expandOrderId = searchParams.get('expand');
    if (expandOrderId) {
      setExpandedOrderId(expandOrderId);
      // Remove the expand parameter from URL after setting it
      searchParams.delete('expand');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Try the updated admin function first
      const { data: functionData, error: functionError } = await supabase
        .rpc('get_admin_orders');

      if (!functionError && functionData) {
        // Transform the data to match the expected format
        const transformedOrders = functionData.map((order: any) => ({
          ...order,
          order_items: order.order_items || []
        }));
        setOrders(transformedOrders);
        return;
      }

      console.warn('Admin function failed, trying fallback approach:', functionError);

      // Fallback: Try the enhanced admin view
      const { data: viewData, error: viewError } = await supabase
        .from('admin_orders_enhanced')
        .select('*')
        .order('created_at', { ascending: false });

      if (!viewError && viewData) {
        // Transform the data to match expected format
        const transformedOrders = viewData.map((order: any) => ({
          ...order,
          order_items: order.order_items || []
        }));
        setOrders(transformedOrders);
        return;
      }

      console.warn('Admin view failed, trying basic query:', viewError);

      // Final fallback: Try a basic orders query
      const { data: basicData, error: basicError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            id,
            component_sku,
            component_name,
            product_context,
            quantity,
            unit_price,
            total_price
          )
        `)
        .order('created_at', { ascending: false });

      if (!basicError && basicData) {
        setOrders(basicData);
        return;
      }

      // If all approaches fail, try the most basic query
      const { data: mostBasicData, error: mostBasicError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!mostBasicError && mostBasicData) {
        // Manually fetch order items for each order
        const ordersWithItems = await Promise.all(
          mostBasicData.map(async (order) => {
            const { data: items } = await supabase
              .from('order_items')
              .select('*')
              .eq('order_id', order.id);
            
            return {
              ...order,
              order_items: items || []
            };
          })
        );
        
        setOrders(ordersWithItems);
        return;
      }

      throw new Error('All order fetching methods failed');
      
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders. Please check permissions and ensure the database schema is updated.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setLoading(true);
    try {
      // Try using the new helper function first
      const { data: updateResult, error: functionError } = await supabase
        .rpc('update_order_status', {
          order_id: selectedOrder.id,
          new_status: editForm.status,
          new_payment_state: editForm.payment_state,
          admin_notes: editForm.notes || null
        });

      if (functionError) {
        console.warn('Function update failed, trying direct update:', functionError);
        
        // Fallback to direct table update
        const { error: directError } = await supabase
          .from('orders')
          .update({
            status: editForm.status,
            payment_state: editForm.payment_state,
            notes: editForm.notes || null
          })
          .eq('id', selectedOrder.id);

        if (directError) throw directError;
      }

      toast({
        title: "Success",
        description: "Order updated successfully"
      });

      setIsEditDialogOpen(false);
      fetchOrders();
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update order",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (order: Order) => {
    setSelectedOrder(order);
    setEditForm({
      status: order.status,
      payment_state: order.payment_state,
      notes: order.notes || ''
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (order: Order) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  const handleDeleteOrder = async (order: Order) => {
    if (!confirm(`Are you sure you want to permanently delete order #${order.order_no}? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);

      // Use admin function directly (bypasses authentication/RLS issues)
      console.log('Deleting order via admin function:', order.order_no, 'with ID:', order.id);
      
      const { data: functionData, error: functionError } = await supabase
        .rpc('admin_delete_order_simple', { p_order_id: order.id });
        
      if (functionError) {
        console.error('Admin function error:', functionError);
        throw new Error(`Database function failed: ${functionError.message}`);
      }
      
      if (!functionData?.success) {
        console.error('Admin function returned failure:', functionData);
        throw new Error(functionData?.message || 'Deletion function returned false');
      }
      
      console.log('✅ Order deleted successfully via admin function:', functionData);

      toast({
        title: "Order Deleted Successfully",
        description: `Order #${order.order_no} has been permanently deleted.`
      });

      // Refresh the orders list
      fetchOrders();

    } catch (error: any) {
      console.error('Delete order error:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete order",
        variant: "destructive"
      });
      
      // Refresh the orders list in case the order was actually deleted
      console.log('Refreshing orders list after failed deletion...');
      fetchOrders();
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount);
  };

  const generatePDFInvoice = (order: Order) => {
    const invoice = `
AUTOLAB INVOICE
=====================================

Order Number: ${order.order_no}
Date: ${new Date(order.created_at).toLocaleDateString()}

CUSTOMER INFORMATION:
Name: ${order.customer_name}
Phone: ${order.customer_phone}
Email: ${order.customer_email || 'N/A'}

DELIVERY INFORMATION:
Method: ${order.delivery_method}
${order.delivery_address ? `
Address: ${JSON.stringify(order.delivery_address, null, 2).replace(/[{}",]/g, '').trim()}` : 'Self Pickup'}

ORDER ITEMS:
=====================================
${order.order_items.map(item => 
  `${item.component_name} (${item.component_sku})
  Quantity: ${item.quantity}
  Unit Price: ${formatCurrency(item.unit_price)}
  Total: ${formatCurrency(item.total_price)}
  ${item.product_context ? `From: ${item.product_context}` : ''}
  -------------------------------------`
).join('\n')}

PAYMENT SUMMARY:
=====================================
Subtotal: ${formatCurrency(order.subtotal)}
Delivery Fee: ${formatCurrency(order.delivery_fee)}
Tax (SST 6%): ${formatCurrency(order.tax)}
Discount: ${formatCurrency(order.discount)}
TOTAL: ${formatCurrency(order.total)}

Payment Method: ${order.payment_method}
Payment Status: ${order.payment_state}
Order Status: ${order.status}

${order.notes ? `Notes: ${order.notes}` : ''}

=====================================
Thank you for your business!
Autolab - Car Parts & More
Phone: +60 3-1234 5678
Email: support@autolab.my
=====================================
    `;

    // Create and download the text file as PDF alternative
    const blob = new Blob([invoice], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${order.order_no}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Invoice Downloaded",
      description: `Invoice for order ${order.order_no} has been downloaded as a text file.`
    });
  };

  const printInvoice = (order: Order) => {
    const invoice = `
AUTOLAB INVOICE

Order Number: ${order.order_no}
Date: ${new Date(order.created_at).toLocaleDateString()}

CUSTOMER INFORMATION:
Name: ${order.customer_name}
Phone: ${order.customer_phone}
Email: ${order.customer_email || 'N/A'}

DELIVERY INFORMATION:
Method: ${order.delivery_method}
${order.delivery_address ? `Address: ${JSON.stringify(order.delivery_address, null, 2).replace(/[{}",]/g, '').trim()}` : 'Self Pickup'}

ORDER ITEMS:
${order.order_items.map(item => 
  `${item.component_name} (${item.component_sku}) - Qty: ${item.quantity} - ${formatCurrency(item.total_price)}`
).join('\n')}

PAYMENT SUMMARY:
Subtotal: ${formatCurrency(order.subtotal)}
Delivery Fee: ${formatCurrency(order.delivery_fee)}
Tax (SST 6%): ${formatCurrency(order.tax)}
TOTAL: ${formatCurrency(order.total)}

Payment Method: ${order.payment_method}
Payment Status: ${order.payment_state}

Thank you for your business!
Autolab - Car Parts & More
    `;

    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`
      <html>
        <head>
          <title>Invoice ${order.order_no}</title>
          <style>
            body { font-family: monospace; white-space: pre-wrap; margin: 20px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>${invoice}</body>
      </html>
    `);
    printWindow?.document.close();
    printWindow?.print();
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
        <p className="text-muted-foreground">Manage customer orders and fulfillment</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
          <CardDescription>
            View and manage all customer orders
          </CardDescription>
          
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {ORDER_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'No orders found matching your criteria.' 
                        : 'No orders yet.'}
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
                        <TableCell>{formatDate(order.created_at)}</TableCell>
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
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                generatePDFInvoice(order);
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Download Invoice"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                printInvoice(order);
                              }}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Print Invoice"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteOrder(order);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete Order"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedOrderId === order.id && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30">
                            <div className="p-6 space-y-6">
                              {/* Order Details */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="font-medium mb-2">Customer Information</h4>
                                  <div className="text-sm space-y-1">
                                    <p><strong>Name:</strong> {order.customer_name}</p>
                                    <p><strong>Phone:</strong> {order.customer_phone}</p>
                                    {order.customer_email && (
                                      <p><strong>Email:</strong> {order.customer_email}</p>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-medium mb-2">Delivery Information</h4>
                                  <div className="text-sm space-y-1">
                                    <p><strong>Method:</strong> <span className="capitalize">{order.delivery_method}</span></p>
                                    {order.delivery_address && typeof order.delivery_address === 'object' && (
                                      <div>
                                        <p><strong>Full Address:</strong></p>
                                        <div className="ml-2 text-muted-foreground bg-gray-50 p-2 rounded mt-1">
                                          {order.delivery_address.street && <p>{order.delivery_address.street}</p>}
                                          {order.delivery_address.city && <p>{order.delivery_address.city}, {order.delivery_address.state} {order.delivery_address.postcode}</p>}
                                          {order.delivery_address.country && <p>{order.delivery_address.country}</p>}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Order Items for Warehouse */}
                              {order.order_items && order.order_items.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-3">📦 Components to Prepare ({order.order_items.length} types)</h4>
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm font-medium text-blue-800 mb-3">Warehouse Picking List:</p>
                                    <div className="space-y-3">
                                      {order.order_items.map((item) => (
                                        <div key={item.id} className="bg-white border rounded-lg p-3">
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-3 mb-2">
                                                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                                                  QTY: {item.quantity}
                                                </span>
                                                <span className="font-mono text-sm font-bold text-blue-600">
                                                  {item.component_sku}
                                                </span>
                                              </div>
                                              <p className="font-medium text-gray-800">{item.component_name}</p>
                                              {item.product_context && (
                                                <p className="text-xs text-gray-500 mt-1">Context: {item.product_context}</p>
                                              )}
                                            </div>
                                            <div className="text-right">
                                              <p className="text-sm text-gray-600">Unit: {formatCurrency(item.unit_price)}</p>
                                              <p className="font-semibold">{formatCurrency(item.total_price)}</p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    
                                    <div className="mt-4 pt-3 border-t border-blue-200">
                                      <div className="flex justify-between items-center">
                                        <span className="text-blue-800 font-medium">Order Total:</span>
                                        <span className="text-lg font-bold text-blue-900">{formatCurrency(order.total)}</span>
                                      </div>
                                    </div>
                                  </div>
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
                  <h4 className="font-semibold mb-2">Customer</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Name:</span> {selectedOrder.customer_name}</div>
                    <div><span className="font-medium">Phone:</span> {selectedOrder.customer_phone}</div>
                    {selectedOrder.customer_email && (
                      <div><span className="font-medium">Email:</span> {selectedOrder.customer_email}</div>
                    )}
                    <div><span className="font-medium">Payment:</span> {selectedOrder.payment_method.replace('-', ' ').toUpperCase()}</div>
                    <div><span className="font-medium">Delivery:</span> {selectedOrder.delivery_method.replace('-', ' ').toUpperCase()}</div>
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

              {selectedOrder.delivery_method === 'self-pickup' && (
                <div>
                  <h4 className="font-semibold mb-2">Pickup Information</h4>
                  <div className="text-sm">
                    <div>📍 Customer will collect from store</div>
                    <div className="text-muted-foreground">No delivery address required</div>
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

      {/* Edit Order Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order</DialogTitle>
            <DialogDescription>
              Update order status and payment information
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateOrder} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Order Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({...editForm, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_state">Payment Status</Label>
              <Select
                value={editForm.payment_state}
                onValueChange={(value) => setEditForm({...editForm, payment_state: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                rows={3}
                placeholder="Add notes about this order..."
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Order'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}