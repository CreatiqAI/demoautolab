import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Calendar,
  Package,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Clock,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PendingOrder {
  id: string;
  order_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_method: string;
  delivery_address: any;
  payment_method: string;
  payment_state: string;
  total: number;
  status: string;
  created_at: string;
  payment_gateway_response: any;
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

interface VerificationData {
  estimatedDeliveryDate: string;
  processingNotes: string;
  verificationNotes: string;
}

export default function OrderVerification() {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<VerificationData>({
    estimatedDeliveryDate: '',
    processingNotes: '',
    verificationNotes: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch orders pending payment verification using the function
      const { data: orderData, error } = await supabase
        .rpc('get_orders_pending_verification');

      if (error) throw error;

      console.log('✅ Order verification data received:', orderData?.length || 0, 'orders');
      setOrders(orderData || []);
    } catch (error: any) {
      console.error('Error fetching pending orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pending orders",
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodDisplay = (method: string) => {
    const methods: { [key: string]: string } = {
      'fpx': 'FPX Online Banking',
      'credit-card': 'Credit/Debit Card',
      'touch-n-go': "Touch 'n Go eWallet",
      'grab-pay': 'GrabPay',
      'boost': 'Boost',
      'shopee-pay': 'ShopeePay'
    };
    return methods[method] || method;
  };

  const openVerificationDialog = (order: PendingOrder) => {
    setSelectedOrder(order);
    // Set default estimated delivery date to 3 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    setVerificationData({
      estimatedDeliveryDate: defaultDate.toISOString().split('T')[0],
      processingNotes: '',
      verificationNotes: ''
    });
  };

  const handleVerification = async (approved: boolean) => {
    if (!selectedOrder) return;

    if (approved && !verificationData.estimatedDeliveryDate) {
      toast({
        title: "Missing Information",
        description: "Please provide estimated delivery date before approving",
        variant: "destructive"
      });
      return;
    }

    setIsVerifying(true);

    try {
      // Use admin function to bypass RLS issues
      const verificationNotes = verificationData.verificationNotes || (approved ? 'Payment verified and approved' : 'Payment verification rejected');
      
      const { data: functionResult, error } = await supabase
        .rpc('admin_verify_payment', {
          p_order_id: selectedOrder.id,
          p_approved: approved,
          p_verification_notes: verificationNotes,
          p_estimated_delivery_date: approved ? verificationData.estimatedDeliveryDate : null,
          p_processing_notes: approved ? (verificationData.processingNotes || null) : null
        });

      if (error) {
        console.error('Payment verification error:', error);
        throw error;
      }

      console.log('✅ Payment verification result:', functionResult);
      
      if (!functionResult?.success) {
        throw new Error(functionResult?.message || 'Payment verification failed');
      }

      toast({
        title: approved ? "Payment Verified" : "Payment Rejected",
        description: functionResult.message,
      });

      // Reset form and close dialog
      setSelectedOrder(null);
      setVerificationData({
        estimatedDeliveryDate: '',
        processingNotes: '',
        verificationNotes: ''
      });

      // Refresh orders list
      fetchPendingOrders();

    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to process payment verification",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Payment Verification</h1>
        </div>
        <div className="flex justify-center py-8">
          <div className="text-center">Loading pending orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Verification</h1>
          <p className="text-muted-foreground">
            Verify payments and approve orders for processing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
            <Clock className="h-3 w-3 mr-1" />
            {orders.length} Pending
          </Badge>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">
              No orders pending payment verification at the moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Orders Pending Payment Verification</CardTitle>
            <CardDescription>
              Orders with submitted payments waiting for manual verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.order_no}</p>
                          <Badge variant="outline" className="text-xs">
                            {order.payment_state}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{order.customer_name}</p>
                          <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          {getPaymentMethodDisplay(order.payment_method)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(order.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openVerificationDialog(order)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Verify
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Payment Verification - {selectedOrder?.order_no}</DialogTitle>
                              <DialogDescription>
                                Review order details and verify the payment before approving for processing
                              </DialogDescription>
                            </DialogHeader>

                            {selectedOrder && (
                              <div className="grid gap-6">
                                {/* Customer & Delivery Information */}
                                <div className="grid md:grid-cols-2 gap-6">
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="flex items-center gap-2">
                                        <User className="h-5 w-5" />
                                        Customer Information
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{selectedOrder.customer_name}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span>{selectedOrder.customer_phone}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span>{selectedOrder.customer_email || 'N/A'}</span>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                        <span className="capitalize">{selectedOrder.delivery_method}</span>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        Delivery Address
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      {selectedOrder.delivery_address ? (
                                        <div className="bg-gray-50 p-3 rounded-md text-sm">
                                          <p className="font-medium">
                                            {selectedOrder.delivery_address.fullName || selectedOrder.customer_name}
                                          </p>
                                          <p className="text-muted-foreground">
                                            {selectedOrder.delivery_address.phoneNumber || selectedOrder.customer_phone}
                                          </p>
                                          <div className="mt-2 space-y-1">
                                            {/* Handle new address format (single address field) */}
                                            {selectedOrder.delivery_address.address && (
                                              <p className="whitespace-pre-line">{selectedOrder.delivery_address.address}</p>
                                            )}
                                            
                                            {/* Handle old address format (multiple fields) - for backward compatibility */}
                                            {selectedOrder.delivery_address.address_line_1 && (
                                              <p>{selectedOrder.delivery_address.address_line_1}</p>
                                            )}
                                            {selectedOrder.delivery_address.address_line_2 && (
                                              <p>{selectedOrder.delivery_address.address_line_2}</p>
                                            )}
                                            {selectedOrder.delivery_address.city && selectedOrder.delivery_address.postal_code && (
                                              <p>{selectedOrder.delivery_address.postal_code} {selectedOrder.delivery_address.city}</p>
                                            )}
                                            {selectedOrder.delivery_address.state && (
                                              <p>{selectedOrder.delivery_address.state}</p>
                                            )}
                                            
                                            {/* Show special delivery notes if available */}
                                            {selectedOrder.delivery_address.notes && (
                                              <div className="mt-2 pt-2 border-t border-gray-200">
                                                <p className="text-xs font-medium text-gray-600">Special Instructions:</p>
                                                <p className="text-xs text-gray-700 italic">{selectedOrder.delivery_address.notes}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">No address provided (Self-pickup)</p>
                                      )}
                                    </CardContent>
                                  </Card>
                                </div>

                                {/* Order Items */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                      <Package className="h-5 w-5" />
                                      Order Items ({selectedOrder.order_items.length} items)
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-2">
                                      {selectedOrder.order_items.map((item) => (
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
                                            <div className="text-right">
                                              <p className="text-sm text-muted-foreground">{formatCurrency(item.unit_price)} each</p>
                                              <p className="font-medium">{formatCurrency(item.total_price)}</p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    
                                    <Separator className="my-4" />
                                    
                                    <div className="flex justify-between items-center text-lg font-bold">
                                      <span>Total Amount:</span>
                                      <span className="text-primary">{formatCurrency(selectedOrder.total)}</span>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Payment Information */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                      <CreditCard className="h-5 w-5" />
                                      Payment Information
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                      <div>
                                        <Label>Payment Method</Label>
                                        <p className="font-medium">{getPaymentMethodDisplay(selectedOrder.payment_method)}</p>
                                      </div>
                                      <div>
                                        <Label>Payment State</Label>
                                        <Badge variant="outline" className="ml-2">
                                          {selectedOrder.payment_state}
                                        </Badge>
                                      </div>
                                      <div>
                                        <Label>Order Date</Label>
                                        <p>{formatDate(selectedOrder.created_at)}</p>
                                      </div>
                                      <div>
                                        <Label>Amount</Label>
                                        <p className="font-bold text-lg">{formatCurrency(selectedOrder.total)}</p>
                                      </div>
                                    </div>

                                    {selectedOrder.payment_gateway_response && (
                                      <div>
                                        <Label>Gateway Response</Label>
                                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                                          {JSON.stringify(selectedOrder.payment_gateway_response, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>

                                {/* Verification Form */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                      <FileText className="h-5 w-5" />
                                      Verification Details
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                      <div>
                                        <Label htmlFor="estimatedDelivery">Estimated Delivery Date *</Label>
                                        <Input
                                          id="estimatedDelivery"
                                          type="date"
                                          value={verificationData.estimatedDeliveryDate}
                                          onChange={(e) => setVerificationData(prev => ({
                                            ...prev,
                                            estimatedDeliveryDate: e.target.value
                                          }))}
                                          min={new Date().toISOString().split('T')[0]}
                                        />
                                      </div>
                                      <div>
                                        <Label>Order Total</Label>
                                        <div className="h-10 flex items-center font-bold text-lg text-primary">
                                          {formatCurrency(selectedOrder.total)}
                                        </div>
                                      </div>
                                    </div>

                                    <div>
                                      <Label htmlFor="processingNotes">Processing Notes</Label>
                                      <Textarea
                                        id="processingNotes"
                                        placeholder="Enter processing instructions, delivery notes, or special requirements..."
                                        value={verificationData.processingNotes}
                                        onChange={(e) => setVerificationData(prev => ({
                                          ...prev,
                                          processingNotes: e.target.value
                                        }))}
                                        rows={3}
                                      />
                                    </div>

                                    <div>
                                      <Label htmlFor="verificationNotes">Verification Notes</Label>
                                      <Textarea
                                        id="verificationNotes"
                                        placeholder="Optional notes about payment verification..."
                                        value={verificationData.verificationNotes}
                                        onChange={(e) => setVerificationData(prev => ({
                                          ...prev,
                                          verificationNotes: e.target.value
                                        }))}
                                        rows={2}
                                      />
                                    </div>

                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                      <div className="flex items-center gap-2 text-amber-800 mb-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span className="font-medium">Verification Required</span>
                                      </div>
                                      <p className="text-sm text-amber-700">
                                        Please verify that the payment has been received through your payment processor 
                                        before approving this order. Once approved, the order will move to processing status.
                                      </p>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                      <Button
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                        onClick={() => handleVerification(true)}
                                        disabled={isVerifying}
                                      >
                                        {isVerifying ? (
                                          <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Verifying...
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4" />
                                            Verify & Approve
                                          </div>
                                        )}
                                      </Button>
                                      
                                      <Button
                                        variant="destructive"
                                        className="flex-1"
                                        onClick={() => handleVerification(false)}
                                        disabled={isVerifying}
                                      >
                                        <div className="flex items-center gap-2">
                                          <XCircle className="h-4 w-4" />
                                          Reject Payment
                                        </div>
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}