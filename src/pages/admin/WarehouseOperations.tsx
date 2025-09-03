import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package,
  PackageCheck,
  Truck,
  CheckCircle,
  Clock,
  User,
  Phone,
  MapPin,
  Calendar,
  FileText,
  ArrowRight,
  Warehouse,
  ShoppingCart
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WarehouseOrder {
  id: string;
  order_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_method: string;
  delivery_address: any;
  estimated_delivery_date: string | null;
  processing_notes: string | null;
  internal_notes: string | null;
  total: number;
  status: string;
  created_at: string;
  warehouse_assigned_at: string | null;
  warehouse_assigned_to: string | null;
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

type OrderStatus = 
  | 'PROCESSING'
  | 'WAREHOUSE_ASSIGNED'
  | 'PICKING'
  | 'PACKING'
  | 'READY_FOR_DELIVERY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED';

const STATUS_WORKFLOW: { status: OrderStatus; label: string; description: string; icon: any; color: string }[] = [
  { status: 'PROCESSING', label: 'Processing', description: 'Order approved, ready for warehouse', icon: Clock, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { status: 'WAREHOUSE_ASSIGNED', label: 'Assigned', description: 'Assigned to warehouse team', icon: User, color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { status: 'PICKING', label: 'Picking', description: 'Items being picked from inventory', icon: Package, color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { status: 'PACKING', label: 'Packing', description: 'Items being packed for delivery', icon: PackageCheck, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { status: 'READY_FOR_DELIVERY', label: 'Ready', description: 'Ready for pickup/delivery', icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200' },
  { status: 'OUT_FOR_DELIVERY', label: 'Dispatched', description: 'Out for delivery', icon: Truck, color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { status: 'DELIVERED', label: 'Delivered', description: 'Successfully delivered', icon: CheckCircle, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
];

export default function WarehouseOperations() {
  const [orders, setOrders] = useState<WarehouseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<WarehouseOrder | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateNotes, setUpdateNotes] = useState('');
  const [newStatus, setNewStatus] = useState<OrderStatus>('PICKING');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchWarehouseOrders();
  }, []);

  const fetchWarehouseOrders = async () => {
    try {
      setLoading(true);
      
      // Try using the database function first
      let orderData = null;
      let error = null;

      try {
        const result = await supabase.rpc('get_warehouse_orders');
        orderData = result.data;
        error = result.error;
      } catch (functionError) {
        console.warn('get_warehouse_orders function not available, using direct query:', functionError);
        
        // Fallback to direct query
        const result = await supabase
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
          .in('status', ['PROCESSING', 'WAREHOUSE_ASSIGNED', 'PICKING', 'PACKING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY'])
          .order('created_at', { ascending: false });
          
        orderData = result.data;
        error = result.error;
      }

      if (error) throw error;

      console.log('✅ Warehouse orders data received:', orderData?.length || 0, 'orders');
      setOrders(orderData || []);
    } catch (error: any) {
      console.error('Error fetching warehouse orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch warehouse orders",
        variant: "destructive"
      });
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusInfo = (status: string) => {
    return STATUS_WORKFLOW.find(s => s.status === status) || STATUS_WORKFLOW[0];
  };

  const getOrdersByStatus = (status: OrderStatus) => {
    return orders.filter(order => order.status === status);
  };

  const assignToWarehouse = async (orderId: string) => {
    try {
      setIsUpdating(true);
      
      const adminUserStr = localStorage.getItem('admin_user');
      if (!adminUserStr) {
        throw new Error('Admin user not found');
      }

      const adminUser = JSON.parse(adminUserStr);
      if (!adminUser.id) {
        throw new Error('Admin user not found');
      }

      const { error } = await supabase
        .rpc('assign_to_warehouse', {
          p_order_id: orderId,
          p_warehouse_admin_id: adminUser.id,
          p_notes: updateNotes || 'Assigned to warehouse operations'
        });

      if (error) throw error;

      toast({
        title: "Order Assigned",
        description: "Order has been assigned to warehouse operations",
      });

      setUpdateNotes('');
      fetchWarehouseOrders();

    } catch (error: any) {
      console.error('Error assigning to warehouse:', error);
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign order to warehouse",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      setIsUpdating(true);
      
      const adminUserStr = localStorage.getItem('admin_user');
      if (!adminUserStr) {
        throw new Error('Admin user not found');
      }

      const adminUser = JSON.parse(adminUserStr);
      if (!adminUser.id) {
        throw new Error('Admin user not found');
      }

      const { error } = await supabase
        .rpc('update_order_status', {
          p_order_id: orderId,
          p_new_status: status,
          p_admin_id: adminUser.id,
          p_notes: updateNotes || `Status updated to ${status}`
        });

      if (error) throw error;

      const statusInfo = getStatusInfo(status);
      toast({
        title: "Status Updated",
        description: `Order status updated to ${statusInfo.label}`,
      });

      setUpdateNotes('');
      setSelectedOrder(null);
      fetchWarehouseOrders();

    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update order status",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const StatusCard = ({ status, count }: { status: OrderStatus; count: number }) => {
    const statusInfo = getStatusInfo(status);
    const Icon = statusInfo.icon;

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${statusInfo.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{statusInfo.label}</p>
                <p className="text-2xl font-bold">{count}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{statusInfo.description}</p>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Warehouse Operations</h1>
        <div className="flex justify-center py-8">
          <div className="text-center">Loading warehouse orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Warehouse Operations</h1>
          <p className="text-muted-foreground">
            Manage order fulfillment and warehouse operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
            <Warehouse className="h-3 w-3 mr-1" />
            {orders.length} Active Orders
          </Badge>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {STATUS_WORKFLOW.map(({ status }) => (
          <StatusCard key={status} status={status} count={getOrdersByStatus(status).length} />
        ))}
      </div>

      {/* Orders by Status Tabs */}
      <Tabs defaultValue="PROCESSING" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          {STATUS_WORKFLOW.map(({ status, label }) => (
            <TabsTrigger key={status} value={status} className="text-xs">
              {label} ({getOrdersByStatus(status).length})
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_WORKFLOW.map(({ status, label, description }) => (
          <TabsContent key={status} value={status}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {React.createElement(getStatusInfo(status).icon, { className: "h-5 w-5" })}
                  {label} Orders
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                {getOrdersByStatus(status).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No orders in {label.toLowerCase()} status</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Delivery</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getOrdersByStatus(status).map((order) => (
                          <React.Fragment key={order.id}>
                            <TableRow 
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                            >
                              <TableCell>
                                <div>
                                  <p className="font-medium">{order.order_no}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(order.created_at)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{order.customer_name}</p>
                                  <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <ShoppingCart className="h-4 w-4" />
                                  {order.order_items.length} items
                                </div>
                              </TableCell>
                              <TableCell>
                                <p className="capitalize">{order.delivery_method}</p>
                                {order.estimated_delivery_date && (
                                  <p className="text-xs text-muted-foreground">
                                    ETA: {formatDate(order.estimated_delivery_date)}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(order.total)}
                              </TableCell>
                              <TableCell className="text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(order);
                                  setNewStatus(getValidNextStatuses(order.status as OrderStatus)[0]?.status || 'PICKING');
                                }}
                              >
                                <ArrowRight className="h-4 w-4 mr-1" />
                                Process
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedOrderId === order.id && (
                            <TableRow>
                              <TableCell colSpan={6} className="bg-muted/30">
                                <div className="p-4 space-y-4">
                                  <div className="grid md:grid-cols-2 gap-4">
                                    {/* Delivery Address */}
                                    <div>
                                      <h4 className="font-medium mb-2 flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        Delivery Address
                                      </h4>
                                      {order.delivery_address ? (
                                        <div className="bg-gray-50 p-3 rounded-md text-sm">
                                          <p className="font-medium">{order.customer_name}</p>
                                          {order.customer_phone && (
                                            <p className="text-muted-foreground">{order.customer_phone}</p>
                                          )}
                                          <div className="mt-2 space-y-1">
                                            {order.delivery_address.address_line_1 && (
                                              <p>{order.delivery_address.address_line_1}</p>
                                            )}
                                            {order.delivery_address.address_line_2 && (
                                              <p>{order.delivery_address.address_line_2}</p>
                                            )}
                                            {order.delivery_address.city && order.delivery_address.postal_code && (
                                              <p>{order.delivery_address.postal_code} {order.delivery_address.city}</p>
                                            )}
                                            {order.delivery_address.state && (
                                              <p>{order.delivery_address.state}</p>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">No address provided</p>
                                      )}
                                    </div>

                                    {/* Warehouse Picking List */}
                                    <div>
                                      <h4 className="font-medium mb-2 flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        Picking List ({order.order_items.length} items)
                                      </h4>
                                      <div className="space-y-2">
                                        {order.order_items.map((item) => (
                                          <div key={item.id} className="bg-white border rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-3">
                                                <Badge variant="secondary" className="text-lg font-bold px-2 py-1">
                                                  {item.quantity}
                                                </Badge>
                                                <div>
                                                  <p className="font-mono font-bold text-sm text-blue-600">{item.component_sku}</p>
                                                  <p className="text-sm font-medium">{item.component_name}</p>
                                                  {item.product_context && (
                                                    <p className="text-xs text-muted-foreground">For: {item.product_context}</p>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="text-right text-sm text-muted-foreground">
                                                {formatCurrency(item.unit_price)} each
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Processing Notes */}
                                  {order.processing_notes && (
                                    <div>
                                      <h4 className="font-medium mb-2 flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Processing Notes
                                      </h4>
                                      <p className="text-sm text-muted-foreground bg-yellow-50 p-3 rounded-md">{order.processing_notes}</p>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>

      {/* Process Order Dialog */}
      <Dialog open={selectedOrder !== null} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Order - {selectedOrder?.order_no}</DialogTitle>
            <DialogDescription>
              Update order status and manage warehouse operations
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Current Status */}
              <div>
                <h4 className="font-medium mb-2">Current Status</h4>
                <Badge className={getStatusInfo(selectedOrder.status as OrderStatus).color}>
                  {getStatusInfo(selectedOrder.status as OrderStatus).label}
                </Badge>
              </div>

              {/* Status Update */}
              <div>
                <Label htmlFor="newStatus">New Status</Label>
                <Select 
                  value={newStatus} 
                  onValueChange={(value) => setNewStatus(value as OrderStatus)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getValidNextStatuses(selectedOrder.status as OrderStatus).map((statusOption) => (
                      <SelectItem key={statusOption.status} value={statusOption.status}>
                        <div className="flex items-center gap-2">
                          <statusOption.icon className="h-4 w-4" />
                          {statusOption.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Update Notes */}
              <div>
                <Label htmlFor="updateNotes">Update Notes</Label>
                <Textarea
                  id="updateNotes"
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  placeholder="Add notes about this status update..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-4">
                {newStatus !== selectedOrder.status && (
                  <Button
                    onClick={() => handleStatusUpdate(selectedOrder.id, newStatus, updateNotes)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Updating...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4" />
                        Update to {getStatusInfo(newStatus).label}
                      </div>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Missing functions that are referenced
const getValidNextStatuses = (currentStatus: string) => {
  const STATUS_WORKFLOW = [
    { status: 'PROCESSING', label: 'Processing', icon: Clock },
    { status: 'WAREHOUSE_ASSIGNED', label: 'Assigned', icon: User },
    { status: 'PICKING', label: 'Picking', icon: Package },
    { status: 'PACKING', label: 'Packing', icon: PackageCheck },
    { status: 'READY_FOR_DELIVERY', label: 'Ready', icon: CheckCircle },
    { status: 'OUT_FOR_DELIVERY', label: 'Dispatched', icon: Truck },
    { status: 'DELIVERED', label: 'Delivered', icon: CheckCircle }
  ];

  const statusIndex = STATUS_WORKFLOW.findIndex(s => s.status === currentStatus);
  return statusIndex >= 0 && statusIndex < STATUS_WORKFLOW.length - 1 
    ? [STATUS_WORKFLOW[statusIndex + 1]] 
    : [];
};

const handleStatusUpdate = async (orderId: string, newStatus: string, notes: string) => {
  // Implementation would go here
  console.log('Update status:', orderId, newStatus, notes);
};