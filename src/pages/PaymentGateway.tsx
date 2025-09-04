import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/index';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Shield, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  Loader2,
  Building2,
  Smartphone
} from 'lucide-react';
import Header from '@/components/Header';

interface OrderData {
  orderId: string;
  orderNumber: string;
  total: number;
  paymentMethod: string;
  customerName: string;
  customerEmail: string;
}

export default function PaymentGateway() {
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Get order data from navigation state
    const state = location.state as { orderData?: OrderData };
    if (state?.orderData) {
      setOrderData(state.orderData);
      setLoading(false);
    } else {
      // Redirect back if no order data
      toast({
        title: "Invalid Access",
        description: "Please complete your order first",
        variant: "destructive"
      });
      navigate('/cart');
    }
  }, [location.state, navigate, toast]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(amount);
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'fpx':
        return <Building2 className="h-5 w-5" />;
      case 'credit-card':
        return <CreditCard className="h-5 w-5" />;
      case 'touch-n-go':
      case 'grab-pay':
      case 'boost':
      case 'shopee-pay':
        return <Smartphone className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getPaymentMethodName = (method: string) => {
    const methods: { [key: string]: string } = {
      'fpx': 'FPX Online Banking',
      'credit-card': 'Credit/Debit Card',
      'touch-n-go': "Touch 'n Go eWallet",
      'grab-pay': 'GrabPay',
      'boost': 'Boost',
      'shopee-pay': 'ShopeePay'
    };
    return methods[method] || 'Payment Method';
  };

  const processPayment = async (success: boolean) => {
    if (!orderData) return;

    setProcessing(true);

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to call payment processing function
      const { data, error } = await supabase
        .rpc('process_payment_response', {
          p_order_id: orderData.orderId,
          p_payment_success: success,
          p_gateway_response: {
            timestamp: new Date().toISOString(),
            method: orderData.paymentMethod,
            amount: orderData.total,
            reference: `PAY-${Date.now()}`,
            success: success,
            message: success ? 'Payment processed successfully' : 'Payment processing failed'
          }
        });

      // If function doesn't exist, fall back to direct order update
      if (error?.code === '42883') { // Function does not exist
        console.warn('Payment processing function not found, updating order directly');
        
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            payment_state: success ? 'SUBMITTED' : 'REJECTED',
            status: success ? 'PENDING_VERIFICATION' : 'PLACED',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderData.orderId);
          
        if (updateError && success) {
          throw updateError;
        }
      } else if (error && success) {
        throw error;
      }

      if (success) {
        toast({
          title: "Payment Successful!",
          description: `Your payment for order ${orderData.orderNumber} has been processed successfully and is pending verification.`,
        });
        
        // Redirect to My Orders page
        navigate('/my-orders', { 
          state: { 
            expandOrderId: orderData.orderId,
            paymentSuccess: true 
          } 
        });
      } else {
        toast({
          title: "Payment Failed",
          description: "Your payment could not be processed. Please try again or use a different payment method.",
          variant: "destructive"
        });
        
        // Redirect back to cart with error state
        navigate('/cart', { 
          state: { 
            paymentFailed: true,
            orderNumber: orderData.orderNumber 
          } 
        });
      }

    } catch (error: any) {
      console.error('Payment processing error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "An unexpected error occurred during payment processing",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Payment Gateway Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/10"
              disabled={processing}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6" />
              <span className="text-lg font-semibold">Secure Payment Gateway</span>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Complete Your Payment</h1>
              <p className="text-blue-100">
                You're just one step away from completing your order
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Order Number:</span>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {orderData.orderNumber}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total Amount:</span>
                <span className="text-2xl">{formatPrice(orderData.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* Payment Method Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getPaymentIcon(orderData.paymentMethod)}
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getPaymentIcon(orderData.paymentMethod)}
                  <div>
                    <p className="font-medium">{getPaymentMethodName(orderData.paymentMethod)}</p>
                    <p className="text-sm text-muted-foreground">Secure payment processing</p>
                  </div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-medium">{orderData.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Email:</span>
                <span className="font-medium">{orderData.customerEmail}</span>
              </div>
              <div className="flex justify-between">
                <span>Order Number:</span>
                <span className="font-medium">{orderData.orderNumber}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount:</span>
                <span className="text-primary">{formatPrice(orderData.total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Fake Payment Gateway Simulation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Payment Gateway Simulation</CardTitle>
              <p className="text-center text-muted-foreground">
                This is a demo payment gateway. Choose your scenario:
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Security Notice */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Your payment is secure</span>
                </div>
                <p className="text-sm text-green-700">
                  All transactions are encrypted and processed securely through our payment partners.
                </p>
              </div>

              {/* Payment Action Buttons */}
              <div className="grid gap-4">
                <Button
                  className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
                  onClick={() => processPayment(true)}
                  disabled={processing}
                >
                  {processing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing Payment...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Submit Payment (Success)
                    </div>
                  )}
                </Button>
                
                <Button
                  variant="destructive"
                  className="w-full h-14 text-lg"
                  onClick={() => processPayment(false)}
                  disabled={processing}
                >
                  {processing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing Payment...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5" />
                      Simulate Payment Failure
                    </div>
                  )}
                </Button>
              </div>

              {/* Demo Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Demo Mode:</strong> This is a simulated payment gateway for testing purposes. 
                  No real payment will be processed. Choose "Submit Payment" to simulate a successful 
                  payment or "Simulate Payment Failure" to test error handling.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Security & Trust</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div className="p-4">
                  <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">SSL Encrypted</p>
                  <p className="text-xs text-muted-foreground">256-bit encryption</p>
                </div>
                <div className="p-4">
                  <CheckCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">PCI Compliant</p>
                  <p className="text-xs text-muted-foreground">Industry standards</p>
                </div>
                <div className="p-4">
                  <CreditCard className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">Secure Processing</p>
                  <p className="text-xs text-muted-foreground">Protected transactions</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}