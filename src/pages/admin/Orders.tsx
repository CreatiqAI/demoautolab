import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveDataTable, MobileTableCard, MobileTableRow } from '@/components/ui/responsive-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, Trash2, Download, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// HTML2PDF CDN integration
declare global {
  interface Window {
    html2pdf: any;
  }
}

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

// Active order statuses only (COMPLETED orders are shown in Archived Orders page)
const ORDER_STATUS_OPTIONS = [
  // Payment-related statuses
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'PAYMENT_PROCESSING', label: 'Payment Processing' },
  { value: 'PAYMENT_FAILED', label: 'Payment Failed' },
  { value: 'PENDING_PAYMENT_VERIFICATION', label: 'Pending Payment Verification' },
  { value: 'PAYMENT_VERIFIED', label: 'Payment Verified' },
  { value: 'PAYMENT_REJECTED', label: 'Payment Rejected' },

  // Order processing statuses
  { value: 'PLACED', label: 'Placed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'PENDING_VERIFICATION', label: 'Pending Verification' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'PACKING', label: 'Packing' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },

  // Final statuses
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
  const [selectedOrder] = useState<Order | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);
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

      // Use direct orders query with proper joins for reliability
      let ordersData: any[] = [];

      // Direct query with order items - more reliable than RPC functions
      const { data: ordersWithItems, error: ordersError } = await supabase
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
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.warn('❌ Direct orders query failed:', ordersError);

        // Fallback: Basic orders query without items
        const { data: basicData, error: basicError } = await supabase
          .from('orders' as any)
          .select('*')
          .order('created_at', { ascending: false });

        if (!basicError && basicData) {
          console.log('📦 Using basic orders data (no items):', basicData.length, 'orders');
          ordersData = basicData.map(order => ({
            ...order,
            order_items: [] // No items in fallback
          }));
        } else {
          console.error('❌ All order queries failed:', basicError);

          // Let's also try without ordering to see if that's the issue
          const { data: simpleData, error: simpleError } = await supabase
            .from('orders' as any)
            .select('*')
            .limit(10);

          if (!simpleError && simpleData) {
            console.log('📦 Using simple orders data:', simpleData.length, 'orders');
            ordersData = simpleData.map(order => ({
              ...order,
              order_items: []
            }));
          } else {
            console.error('❌ Even simple query failed:', simpleError);
            console.log('🔍 Let\'s check if orders table exists and has data...');

            // Check table existence and permissions
            const { count, error: countError } = await supabase
              .from('orders' as any)
              .select('*', { count: 'exact', head: true });


            throw new Error('Failed to fetch orders - check database connection and permissions');
          }
        }
      } else {
        ordersData = ordersWithItems;
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
        status: order.status || 'PLACED',
        notes: order.notes || '',
        created_at: order.created_at,
        updated_at: order.updated_at,
        voucher_code: order.voucher_code || null,
        voucher_discount: order.voucher_discount || null,
        order_items: order.order_items || []
      }));

      const statusCounts = transformedOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const completedOrders = transformedOrders.filter(o => o.status === 'COMPLETED');

      setOrders(transformedOrders);

    } catch (error: any) {
      console.error('❌ Error fetching orders:', error);
      setOrders([]);
      // Don't show error toast since this is expected when database isn't fully set up
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setLoading(true);
    try {
      // Direct table update approach
      const { error: directError } = await supabase
        .from('orders' as any)
        .update({
          status: editForm.status as any,
          payment_state: editForm.payment_state as any,
          notes: editForm.notes || null
        })
        .eq('id', selectedOrder.id);

      if (directError) throw directError;

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

  // Removed unused functions openEditDialog and openViewDialog

  const handleMarkComplete = async (order: Order) => {
    if (!confirm(`Mark order #${order.order_no} as completed? This will move it to the archived orders.`)) {
      return;
    }

    try {
      setLoading(true);
      // Attempting to mark order as complete

      // Update order status to COMPLETED (archived status)
      const { data, error } = await supabase
        .from('orders' as any)
        .update({
          status: 'COMPLETED',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)
        .select(); // Return updated data to verify the change

      console.log('📝 Update result:', { data, error });

      if (error) {
        throw new Error(`Failed to mark order as complete: ${error.message}`);
      }

      // Verify the update worked
      if (data && data.length > 0) {
        toast({
          title: "Order Completed",
          description: `Order #${order.order_no} has been marked as completed and moved to archive.`
        });
      } else {
        console.warn('⚠️ Update completed but no data returned');
        toast({
          title: "Order Status Updated",
          description: `Order #${order.order_no} status updated. Please refresh to see changes.`
        });
      }

      // Refresh the orders list to remove completed order from view
      fetchOrders();

    } catch (error: any) {
      console.error('❌ Mark complete error:', error);
      toast({
        title: "Failed to Complete Order",
        description: error.message || "Failed to mark order as complete",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    if (!confirm(`Are you sure you want to permanently delete order #${order.order_no}? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);

      // Direct deletion approach - delete order items first, then order
      console.log('Deleting order:', order.order_no, 'with ID:', order.id);

      // First delete order items
      const { error: itemsError } = await supabase
        .from('order_items' as any)
        .delete()
        .eq('order_id', order.id);

      if (itemsError) {
        console.warn('Could not delete order items:', itemsError);
      }

      // Then delete the order
      const { error: orderError } = await supabase
        .from('orders' as any)
        .delete()
        .eq('id', order.id);

      if (orderError) {
        throw new Error(`Failed to delete order: ${orderError.message}`);
      }


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
    // ALWAYS exclude completed orders from main orders view
    const isNotCompleted = order.status !== 'COMPLETED';

    // If this order is completed (archived), exclude it regardless of other filters
    if (!isNotCompleted) {
      return false;
    }

    const matchesSearch =
      order.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());

    // For status filter, only apply to non-completed orders
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Add this debug log to see filtering results

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount);
  };

  // Load HTML2PDF library
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.async = true;
    document.head.appendChild(script);
    
    return () => {
      // Cleanup script on unmount
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

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
      
      // Handle teens (10-19) separately
      const tensAndOnes = n % 100;
      if (tensAndOnes < 20 && tensAndOnes > 0) {
        result += ones[tensAndOnes] || '';
      } else {
        if (ten >= 2) result += (tens[ten] || '');
        if (digit > 0) result += (ten >= 2 ? ' ' : '') + (ones[digit] || '');
      }

      return result.trim();
    }

    // Round to nearest whole number for word conversion (standard practice for invoices)
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

  const generateInvoice = (order: Order) => {
    setSelectedOrderForInvoice(order);
    setIsInvoiceModalOpen(true);
  };

  const closeInvoiceModal = () => {
    setIsInvoiceModalOpen(false);
    setSelectedOrderForInvoice(null);
  };

  const printInvoiceAction = () => {
    window.print();
  };

  const downloadInvoicePDF = () => {
    if (!selectedOrderForInvoice) return;
    
    const invoiceBody = document.getElementById('invoiceBody');
    const orderIdElement = invoiceBody?.querySelector('#invoice-order-id-p') as HTMLElement;
    const orderId = orderIdElement ? orderIdElement.innerText.replace('Order ID: ', '').trim() : 'invoice';

    const opt = {
      margin: 0.1,
      filename: `invoice-${orderId}.pdf`,
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const getStatusLabel = (status: string): string => {
    const statusOption = ORDER_STATUS_OPTIONS.find(option => option.value === status);
    return statusOption ? statusOption.label : status.toLowerCase().replace(/_/g, ' ');
  };


  const getStatusBadgeStyle = (status: string) => {

    switch (status) {
      // Light green for success states
      case 'PAYMENT_VERIFIED':
      case 'VERIFIED':
      case 'DELIVERED':
        console.log('🟢 Green badge for:', status);
        return {
          backgroundColor: '#dcfce7', // green-100
          color: '#166534', // green-800
          borderColor: '#bbf7d0' // green-200
        };

      // Light yellow for intermediate states
      case 'PACKING':
      case 'PICKING': // Added this status from your logs
        console.log('🟡 Yellow badge for:', status);
        return {
          backgroundColor: '#fefce8', // yellow-100
          color: '#854d0e', // yellow-800
          borderColor: '#fef3c7' // yellow-200
        };

      // Light orange for dispatch states
      case 'DISPATCHED':
      case 'WAREHOUSE_ASSIGNED': // Added this status from your logs
        console.log('🟠 Orange badge for:', status);
        return {
          backgroundColor: '#fff7ed', // orange-100
          color: '#9a3412', // orange-800
          borderColor: '#fed7aa' // orange-200
        };

      // Light blue for pending payment states
      case 'PENDING_PAYMENT':
      case 'PENDING_PAYMENT_VERIFICATION':
      case 'PAYMENT_PROCESSING':
      case 'PENDING_VERIFICATION':
        return {
          backgroundColor: '#dbeafe', // blue-100
          color: '#1e40af', // blue-800
          borderColor: '#bfdbfe' // blue-200
        };

      // Light purple for processing states
      case 'PROCESSING':
        return {
          backgroundColor: '#f3e8ff', // violet-100
          color: '#6b21a8', // violet-800
          borderColor: '#ddd6fe' // violet-200
        };

      // Light red for error states
      case 'PAYMENT_FAILED':
      case 'PAYMENT_REJECTED':
      case 'CANCELLED':
      case 'REJECTED':
        return {
          backgroundColor: '#fef2f2', // red-100
          color: '#991b1b', // red-800
          borderColor: '#fecaca' // red-200
        };

      // Light gray for initial/archived states
      case 'PLACED':
      case 'COMPLETED':
        console.log('⚫ Gray badge for:', status);
        return {
          backgroundColor: '#f3f4f6', // gray-100
          color: '#1f2937', // gray-800
          borderColor: '#e5e7eb' // gray-200
        };

      default:
        return {
          backgroundColor: '#dbeafe', // blue-100
          color: '#1e40af', // blue-800
          borderColor: '#bfdbfe' // blue-200
        };
    }
  };

  const CustomStatusBadge = ({ status, children }: { status: string; children: React.ReactNode }) => {
    const style = getStatusBadgeStyle(status);
    return (
      <span
        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors"
        style={style}
      >
        {children}
      </span>
    );
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
        <h2 className="text-3xl font-bold tracking-tight">Active Orders</h2>
        <p className="text-muted-foreground">
          Manage active customer orders and fulfillment. Completed orders are moved to
          <Link to="/admin/archived-orders" className="text-blue-600 hover:text-blue-800 mx-1 underline">
            Archived Orders
          </Link>
          for record keeping.
        </p>
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
            <ResponsiveDataTable
              data={filteredOrders}
              onRowClick={(order) => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
              expandedRowId={expandedOrderId}
              expandedRowRender={(order) => (
                <div className="px-6 py-4 bg-gray-50 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Customer Information */}
                    <div>
                      <h4 className="font-medium mb-3 text-sm text-gray-900">Customer Information</h4>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium text-gray-600">Name:</span> <span className="text-gray-900">{order.customer_name}</span></div>
                        <div><span className="font-medium text-gray-600">Phone:</span> <span className="text-gray-900">{order.customer_phone}</span></div>
                        {order.customer_email && (
                          <div><span className="font-medium text-gray-600">Email:</span> <span className="text-gray-900">{order.customer_email}</span></div>
                        )}
                        <div><span className="font-medium text-gray-600">Payment Method:</span> <span className="text-gray-900 capitalize">{order.payment_method}</span></div>
                      </div>
                    </div>

                    {/* Delivery Information */}
                    <div>
                      <h4 className="font-medium mb-3 text-sm text-gray-900">Delivery Information</h4>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium text-gray-600">Method:</span> <span className="text-gray-900 capitalize">{order.delivery_method}</span></div>
                        <div><span className="font-medium text-gray-600">Fee:</span> <span className="text-gray-900">{order.delivery_fee === 0 ? 'FREE' : formatCurrency(order.delivery_fee)}</span></div>
                        {order.delivery_address && typeof order.delivery_address === 'object' && order.delivery_address.address && (
                          <div>
                            <span className="font-medium text-gray-600">Address:</span>
                            <div className="text-gray-900 mt-1 text-xs bg-white p-2 rounded border">
                              {order.delivery_address.address}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div>
                      <h4 className="font-medium mb-3 text-sm text-gray-900">Order Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">Subtotal:</span>
                          <span className="text-gray-900">{formatCurrency(order.subtotal)}</span>
                        </div>
                        {order.voucher_code && order.voucher_discount && (
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-600">Voucher ({order.voucher_code}):</span>
                            <span className="text-green-600">-{formatCurrency(order.voucher_discount)}</span>
                          </div>
                        )}
                        {order.discount > 0 && (
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-600">Discount:</span>
                            <span className="text-red-600">-{formatCurrency(order.discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">Delivery:</span>
                          <span className="text-gray-900">{order.delivery_fee === 0 ? 'FREE' : formatCurrency(order.delivery_fee)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">SST (6%):</span>
                          <span className="text-gray-900">{formatCurrency(order.tax)}</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t pt-2">
                          <span className="text-gray-900">Total:</span>
                          <span className="text-gray-900">{formatCurrency(order.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  {order.order_items && order.order_items.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-3 text-sm text-gray-900">Order Items ({order.order_items.length} items)</h4>
                      <div className="bg-white rounded-lg border overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-100 text-xs font-medium text-gray-600 border-b">
                          <div className="col-span-1">#</div>
                          <div className="col-span-2">SKU</div>
                          <div className="col-span-4">Component Name</div>
                          <div className="col-span-1 text-center">Qty</div>
                          <div className="col-span-2 text-right">Unit Price</div>
                          <div className="col-span-2 text-right">Total</div>
                        </div>
                        <div className="divide-y">
                          {order.order_items.map((item, itemIndex) => (
                            <div key={item.id} className="grid grid-cols-12 gap-4 px-4 py-3 text-sm">
                              <div className="col-span-1 text-gray-500">{itemIndex + 1}</div>
                              <div className="col-span-2">
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded">{item.component_sku}</code>
                              </div>
                              <div className="col-span-4">
                                <div className="font-medium text-gray-900">{item.component_name}</div>
                                {item.product_context && (
                                  <div className="text-xs text-gray-500 mt-1">{item.product_context}</div>
                                )}
                              </div>
                              <div className="col-span-1 text-center text-gray-900">{item.quantity}</div>
                              <div className="col-span-2 text-right text-gray-900">{formatCurrency(item.unit_price)}</div>
                              <div className="col-span-2 text-right font-medium text-gray-900">{formatCurrency(item.total_price)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex justify-end gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        generateInvoice(order);
                      }}
                      className="text-blue-700 border-blue-300 hover:bg-blue-100 hover:border-blue-400 hover:text-blue-800"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Invoice
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkComplete(order);
                      }}
                      className="text-green-700 border-green-300 hover:bg-green-100 hover:border-green-400 hover:text-green-800"
                    >
                      Mark Complete
                    </Button>
                  </div>
                </div>
              )}
              columns={[
                {
                  key: 'order_no',
                  header: 'Order',
                  render: (order) => (
                    <div>
                      <div className="font-medium">#{order.order_no}</div>
                      <div className="text-sm text-muted-foreground">{order.id.slice(0, 8)}</div>
                    </div>
                  ),
                  mobileRender: (order) => (
                    <div>
                      <div className="font-medium">#{order.order_no}</div>
                      <div className="text-xs text-muted-foreground">{order.id.slice(0, 8)}</div>
                    </div>
                  )
                },
                {
                  key: 'customer_name',
                  header: 'Customer',
                  render: (order) => (
                    <div>
                      <div className="font-medium">{order.customer_name}</div>
                      <div className="text-sm text-muted-foreground">{order.customer_phone}</div>
                    </div>
                  ),
                  mobileRender: (order) => (
                    <div>
                      <div className="font-medium">{order.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                    </div>
                  )
                },
                {
                  key: 'created_at',
                  header: 'Date',
                  render: (order) => formatDate(order.created_at),
                  mobileRender: (order) => (
                    <span className="text-sm">{formatDate(order.created_at)}</span>
                  )
                },
                {
                  key: 'total',
                  header: 'Total',
                  render: (order) => formatCurrency(order.total),
                  mobileRender: (order) => (
                    <span className="font-semibold">{formatCurrency(order.total)}</span>
                  )
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (order) => (
                    <CustomStatusBadge status={order.status}>
                      {getStatusLabel(order.status)}
                    </CustomStatusBadge>
                  ),
                  mobileRender: (order) => (
                    <CustomStatusBadge status={order.status}>
                      {getStatusLabel(order.status)}
                    </CustomStatusBadge>
                  )
                },
                {
                  key: 'payment_state',
                  header: 'Payment',
                  render: (order) => (
                    <Badge variant={getPaymentBadgeVariant(order.payment_state)}>
                      {order.payment_state.toLowerCase().replace('_', ' ')}
                    </Badge>
                  ),
                  mobileRender: (order) => (
                    <Badge variant={getPaymentBadgeVariant(order.payment_state)}>
                      {order.payment_state.toLowerCase().replace('_', ' ')}
                    </Badge>
                  )
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (order) => (
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateInvoice(order);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Generate Invoice"
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
                  ),
                  mobileRender: (order) => (
                    <div className="flex justify-end space-x-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateInvoice(order);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Generate Invoice"
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
                  ),
                  className: "text-right"
                }
              ]}
              mobileCardRender={(order, index) => (
                <MobileTableCard key={(order as any).id} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedOrderId(expandedOrderId === (order as any).id ? null : (order as any).id)}>
                  <MobileTableRow label="Order" value={
                    <div>
                      <div className="font-medium">#{(order as any).order_no}</div>
                      <div className="text-xs text-muted-foreground">{(order as any).id.slice(0, 8)}</div>
                    </div>
                  } />
                  <MobileTableRow label="Customer" value={
                    <div>
                      <div className="font-medium">{(order as any).customer_name}</div>
                      <div className="text-xs text-muted-foreground">{(order as any).customer_phone}</div>
                    </div>
                  } />
                  <MobileTableRow label="Date" value={
                    <span className="text-sm">{formatDate((order as any).created_at)}</span>
                  } />
                  <MobileTableRow label="Total" value={
                    <span className="font-semibold">{formatCurrency((order as any).total)}</span>
                  } />
                  <MobileTableRow label="Status" value={
                    <CustomStatusBadge status={(order as any).status}>
                      {getStatusLabel((order as any).status)}
                    </CustomStatusBadge>
                  } />
                  <MobileTableRow label="Payment" value={
                    <Badge variant={getPaymentBadgeVariant((order as any).payment_state)}>
                      {(order as any).payment_state.toLowerCase().replace('_', ' ')}
                    </Badge>
                  } />
                  <MobileTableRow label="Actions" value={
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateInvoice(order);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Generate Invoice"
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
                  } />
                  {expandedOrderId === order.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="space-y-4">
                        {/* Customer Information */}
                        <div>
                          <h4 className="font-medium mb-2 text-sm">Customer Information</h4>
                          <div className="text-xs space-y-1 bg-gray-50 p-2 rounded">
                            <p><strong>Name:</strong> {order.customer_name}</p>
                            <p><strong>Phone:</strong> {order.customer_phone}</p>
                            {order.customer_email && (
                              <p><strong>Email:</strong> {order.customer_email}</p>
                            )}
                          </div>
                        </div>

                        {/* Delivery Information */}
                        <div>
                          <h4 className="font-medium mb-2 text-sm">Delivery Information</h4>
                          <div className="text-xs space-y-1 bg-gray-50 p-2 rounded">
                            <p><strong>Method:</strong> <span className="capitalize">{order.delivery_method}</span></p>
                            {order.delivery_address && typeof order.delivery_address === 'object' && (
                              <div>
                                <p><strong>Address:</strong></p>
                                <div className="ml-2 text-muted-foreground bg-white p-1 rounded mt-1 text-xs">
                                  {order.delivery_address.address && <p className="whitespace-pre-line">{order.delivery_address.address}</p>}
                                  {order.delivery_address.street && <p>{order.delivery_address.street}</p>}
                                  {order.delivery_address.city && <p>{order.delivery_address.city}, {order.delivery_address.state} {order.delivery_address.postcode}</p>}
                                  {order.delivery_address.country && <p>{order.delivery_address.country}</p>}
                                  {order.delivery_address.notes && (
                                    <p className="mt-1 pt-1 border-t text-xs italic">Notes: {order.delivery_address.notes}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Order Items */}
                        {order.order_items && order.order_items.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2 text-sm">Order Items</h4>
                            <div className="space-y-2">
                              {order.order_items.map((item, itemIndex) => (
                                <div key={item.id} className="bg-gray-50 p-2 rounded text-xs">
                                  <div className="flex justify-between items-start mb-1">
                                    <div className="font-medium text-gray-900">{item.component_name}</div>
                                    <div className="font-semibold">{formatCurrency(item.total_price)}</div>
                                  </div>
                                  <div className="text-muted-foreground">
                                    <div>SKU: {item.component_sku}</div>
                                    <div>Qty: {item.quantity} × {formatCurrency(item.unit_price)}</div>
                                    {item.product_context && (
                                      <div className="text-xs mt-1 pl-2 border-l-2 border-gray-300">
                                        {item.product_context}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 pt-2 border-t border-gray-300 flex justify-between items-center">
                              <div className="text-xs text-gray-600">
                                {order.order_items.reduce((sum, item) => sum + item.quantity, 0)} items total
                              </div>
                              <div className="font-bold">{formatCurrency(order.total)}</div>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-2">
                          <button className="px-3 py-1 border border-gray-400 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 transition-colors">
                            Print List
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkComplete(order);
                            }}
                            className="px-3 py-1 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-800 transition-colors"
                          >
                            Mark Complete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </MobileTableCard>
              )}
              emptyMessage={
                searchTerm || statusFilter !== 'all'
                  ? 'No orders found matching your criteria.'
                  : 'No orders yet.'
              }
            />
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
                      <span className="ml-2">
                        <CustomStatusBadge status={selectedOrder.status}>
                          {getStatusLabel(selectedOrder.status)}
                        </CustomStatusBadge>
                      </span>
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
                  <div className="text-sm bg-gray-50 p-3 rounded">
                    <div><span className="font-medium">Name:</span> {selectedOrder.delivery_address.fullName || selectedOrder.customer_name}</div>
                    <div><span className="font-medium">Phone:</span> {selectedOrder.delivery_address.phoneNumber || selectedOrder.customer_phone}</div>
                    
                    {/* Handle new address format (single address field) */}
                    {selectedOrder.delivery_address.address && (
                      <div className="mt-2">
                        <span className="font-medium">Address:</span>
                        <div className="whitespace-pre-line mt-1">{selectedOrder.delivery_address.address}</div>
                      </div>
                    )}
                    
                    {/* Handle old address format (multiple fields) - for backward compatibility */}
                    {selectedOrder.delivery_address.city && selectedOrder.delivery_address.state && (
                      <div><span className="font-medium">Location:</span> {selectedOrder.delivery_address.city}, {selectedOrder.delivery_address.state} {selectedOrder.delivery_address.postcode}</div>
                    )}
                    
                    {selectedOrder.delivery_address.notes && (
                      <div className="mt-2 pt-2 border-t text-muted-foreground">
                        <span className="font-medium">Special Instructions:</span> {selectedOrder.delivery_address.notes}
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
                  {selectedOrder.voucher_code && selectedOrder.voucher_discount && (
                    <div className="flex justify-between text-green-600">
                      <span>Voucher ({selectedOrder.voucher_code}):</span>
                      <span>-{formatCurrency(selectedOrder.voucher_discount)}</span>
                    </div>
                  )}
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

      {/* Professional Invoice Modal */}
      {isInvoiceModalOpen && selectedOrderForInvoice && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeInvoiceModal();
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Invoice Preview</h2>
              <button
                onClick={closeInvoiceModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div id="invoice-content">
              <div id="invoiceBody" className="p-5 bg-white">
                <div style={{
                  padding: '10px',
                  fontFamily: 'Arial, sans-serif',
                  width: '100%',
                  margin: '0 auto',
                  fontSize: '9px',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '95vh'
                }}>
                  {/* Top Section */}
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
                          <p style={{ margin: '3px 0', fontSize: '9px' }} id="invoice-order-id-p">
                            <strong>Order ID: </strong>{selectedOrderForInvoice.order_no}
                          </p>
                        </div>
                        <p style={{ margin: '5px 0 2px', fontSize: '9px' }}>
                          <strong>Date: </strong>
                          {new Date(selectedOrderForInvoice.created_at).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric'
                          })}
                        </p>
                        <p style={{ margin: '2px 0', fontSize: '9px' }}><strong>A/C Code: </strong>DMKT78C</p>
                        <p style={{ margin: '2px 0', fontSize: '9px' }}>
                          {selectedOrderForInvoice.payment_state === 'APPROVED'
                            ? <><strong>Term: </strong>Cash / <span style={{ textDecoration: 'line-through' }}>Credit</span></>
                            : <><strong>Term: </strong><span style={{ textDecoration: 'line-through' }}>Cash</span> / Credit</>
                          }
                        </p>
                        <p style={{ margin: '2px 0', fontSize: '9px' }}><strong>Salesman: </strong>TECH</p>
                        <p style={{ margin: '2px 0', fontSize: '9px' }}><strong>Served By: </strong>HTL</p>
                      </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <p style={{ margin: '2px 0', fontSize: '9px' }}>
                        <strong>Bill To: </strong>{selectedOrderForInvoice.customer_name}
                      </p>
                      <p style={{ margin: '2px 0', fontSize: '9px' }}>
                        {selectedOrderForInvoice.delivery_address?.address || 
                         selectedOrderForInvoice.delivery_address?.street || 
                         'No address provided'}
                      </p>
                      <p style={{ margin: '2px 0', fontSize: '9px' }}>
                        <strong>Attention: </strong>{selectedOrderForInvoice.customer_name}
                      </p>
                      <p style={{ margin: '2px 0', fontSize: '9px' }}>
                        <strong>Tel: </strong>{selectedOrderForInvoice.customer_phone || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Middle Section (Table) */}
                  <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5px' }}>
                      <thead>
                        <tr><td colSpan={8} style={{ borderTop: '1px solid #000', padding: '0' }}></td></tr>
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
                        <tr><td colSpan={8} style={{ borderBottom: '1px solid #000', padding: '0' }}></td></tr>
                      </thead>
                      <tbody>
                        {selectedOrderForInvoice.order_items.map((item, index) => (
                          <tr key={item.id}>
                            <td style={{ fontSize: '9px', padding: '2px 3px' }}>{index + 1}</td>
                            <td style={{ fontSize: '9px', padding: '2px 3px' }}>{item.component_sku}</td>
                            <td style={{ fontSize: '9px', padding: '2px 3px' }}>{item.component_name}</td>
                            <td style={{ fontSize: '9px', textAlign: 'center', padding: '2px 3px' }}>{item.quantity}</td>
                            <td style={{ fontSize: '9px', textAlign: 'center', padding: '2px 3px' }}>Unit</td>
                            <td style={{ fontSize: '9px', textAlign: 'right', padding: '2px 3px' }}>
                              RM {item.unit_price.toFixed(2)}
                            </td>
                            <td style={{ fontSize: '9px', textAlign: 'center', padding: '2px 3px' }}></td>
                            <td style={{ fontSize: '9px', textAlign: 'right', padding: '2px 3px' }}>
                              RM {item.total_price.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        {/* Filler rows */}
                        {Array.from({ length: Math.max(0, 12 - selectedOrderForInvoice.order_items.length) }, (_, i) => (
                          <tr key={`filler-${i}`}>
                            <td colSpan={8} style={{ fontSize: '9px', padding: '2px 3px' }}>&nbsp;</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom Section */}
                  <div style={{ flex: '0 0 auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5px' }}>
                      <tbody>
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'right', padding: '3px', fontSize: '9px', fontWeight: 'bold' }}>
                            TOTAL
                          </td>
                          <td style={{ 
                            textAlign: 'right', 
                            padding: '3px', 
                            fontSize: '9px', 
                            fontWeight: 'bold', 
                            borderTop: '1px solid #000' 
                          }}>
                            RM {selectedOrderForInvoice.total.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div style={{ marginTop: '5px' }}>
                      <hr style={{ borderTop: '1px solid #000', borderBottom: 'none', margin: '0' }} />
                      <p style={{ fontSize: '10px', margin: '5px 0', fontWeight: 'bold' }}>
                        RINGGIT MALAYSIA {convertToWords(selectedOrderForInvoice.total)} ONLY
                      </p>
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
                      <div>
                        <p style={{ borderTop: '1px solid #000', display: 'inline-block', paddingTop: '3px', fontSize: '9px' }}>
                          Received By
                        </p>
                      </div>
                      <div>
                        <p style={{ borderTop: '1px solid #000', display: 'inline-block', paddingTop: '3px', fontSize: '9px' }}>
                          Company Chop & Signature
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '10px', fontStyle: 'italic', fontSize: '8px' }}>
                      <p>This is a computer generated copy.<br />No signature is required.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t p-4 flex justify-center gap-3">
              <Button onClick={printInvoiceAction} className="bg-red-600 hover:bg-red-700 text-white">
                Print Invoice
              </Button>
              <Button onClick={downloadInvoicePDF} variant="outline" className="border-red-600 text-red-600 hover:bg-red-50">
                Download PDF
              </Button>
              <Button onClick={closeInvoiceModal} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #invoice-content,
            #invoice-content * {
              visibility: visible;
            }
            #invoice-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              background: white;
            }
            .sticky {
              display: none;
            }
          }
        `
      }} />

    </div>
  );
}