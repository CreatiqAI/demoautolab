import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
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

interface LocationState {
  orderData?: OrderData;
  isHistoryAccessPurchase?: boolean;
  isSubscriptionRenewal?: boolean;
  subscriptionPlan?: 'professional' | 'panel';
  partnershipId?: string;
}

export default function PaymentGateway() {
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isHistoryAccessPurchase, setIsHistoryAccessPurchase] = useState(false);
  const [isSubscriptionRenewal, setIsSubscriptionRenewal] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<'professional' | 'panel' | null>(null);
  const [partnershipId, setPartnershipId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Get order data from navigation state
    const state = location.state as LocationState;
    if (state?.orderData) {
      setOrderData(state.orderData);
      setIsHistoryAccessPurchase(state.isHistoryAccessPurchase || false);
      setIsSubscriptionRenewal(state.isSubscriptionRenewal || false);
      setSubscriptionPlan(state.subscriptionPlan || null);
      setPartnershipId(state.partnershipId || null);
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

      // Skip order processing for subscription renewals
      if (!isSubscriptionRenewal) {
        // Try to call payment processing function with new payment states
        console.log('🔄 Calling process_payment_response RPC function...', {
          orderId: orderData.orderId,
          status: success ? 'SUCCESS' : 'FAILED'
        });

        const { data: rpcData, error } = await (supabase.rpc as any)('process_payment_response', {
          p_order_id: orderData.orderId,
          p_status: success ? 'SUCCESS' : 'FAILED',
          p_payment_details: {
            timestamp: new Date().toISOString(),
            method: orderData.paymentMethod,
            amount: orderData.total,
            reference: `PAY-${Date.now()}`,
            success: success,
            message: success ? 'Payment processed successfully' : 'Payment processing failed'
          }
        });

        console.log('📦 RPC function response:', { data: rpcData, error });

        // If function doesn't exist, fall back to direct order update
        if (error?.code === '42883') { // Function does not exist
          console.warn('⚠️ Payment processing function not found, updating order directly');

          if (success) {
            // For successful payment, update to SUCCESS and PROCESSING status
            const { data: updateData, error: updateError } = await supabase
              .from('orders')
              .update({
                payment_state: 'SUCCESS',
                status: 'PROCESSING', // Order moves to processing after successful payment
                payment_gateway_response: {
                  timestamp: new Date().toISOString(),
                  method: orderData.paymentMethod,
                  amount: orderData.total,
                  reference: `PAY-${Date.now()}`,
                  success: true,
                  message: 'Payment processed successfully'
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', orderData.orderId)
              .select();

            if (updateError) {
              console.error('❌ Order update error:', updateError);
              throw updateError;
            }

            console.log('✅ Order payment state updated to SUCCESS, status updated to PROCESSING', updateData);
          } else {
            // For failed payment, update to FAILED
            const { data: updateData, error: updateError } = await supabase
              .from('orders')
              .update({
                payment_state: 'FAILED',
                payment_gateway_response: {
                  timestamp: new Date().toISOString(),
                  method: orderData.paymentMethod,
                  amount: orderData.total,
                  reference: `PAY-${Date.now()}`,
                  success: false
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', orderData.orderId)
              .select();

            if (updateError) {
              console.error('Order update error:', updateError);
            }

            console.log('⚠️ Order payment state updated to FAILED', updateData);
          }
        } else if (error && success) {
          console.error('❌ Payment processing error:', error);
          throw error;
        } else if (!error && success) {
          console.log('✅ Payment processed successfully via RPC function');
        }

        // Verify the update was successful before proceeding
        if (success) {
          console.log('🔍 Verifying payment update in database...');
          const { data: verifyData, error: verifyError } = await supabase
            .from('orders')
            .select('payment_state, status, payment_gateway_response')
            .eq('id', orderData.orderId)
            .single();

          console.log('✅ Database verification result:', verifyData);

          if (verifyError) {
            console.error('❌ Error verifying payment update:', verifyError);
            throw new Error('Failed to verify payment update');
          }

          // Check if payment_state was actually updated to SUCCESS
          if (verifyData.payment_state !== 'SUCCESS') {
            console.error('❌ Payment state not updated! Current state:', verifyData.payment_state);
            throw new Error(`Payment update failed - payment state is still ${verifyData.payment_state}`);
          }

          console.log('✅ Payment verification successful - payment_state is SUCCESS');
        }
      }

      if (success) {
        // Handle success based on purchase type
        if (isSubscriptionRenewal) {
          // Handle subscription renewal
          if (!partnershipId || !subscriptionPlan) {
            throw new Error('Missing subscription renewal data');
          }

          // Calculate new end date
          const startDate = new Date();
          const endDate = new Date(startDate);

          if (subscriptionPlan === 'professional') {
            // Add 1 year for professional plan
            endDate.setFullYear(endDate.getFullYear() + 1);
          } else {
            // Add 1 month for panel plan
            endDate.setMonth(endDate.getMonth() + 1);
          }

          // Update premium_partnerships with new subscription dates
          const { error: renewalError } = await supabase
            .from('premium_partnerships')
            .update({
              subscription_status: 'ACTIVE',
              subscription_start_date: startDate.toISOString(),
              subscription_end_date: endDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', partnershipId);

          if (renewalError) {
            console.error('Error renewing subscription:', renewalError);
            throw renewalError;
          }

          toast({
            title: "Subscription Renewed!",
            description: `Your ${subscriptionPlan} subscription has been renewed successfully!`,
          });

          // Redirect to Merchant Console
          navigate('/merchant-console', {
            state: {
              renewalSuccess: true
            }
          });
        } else if (isHistoryAccessPurchase) {
          // Confirm history access payment
          const { error: confirmError } = await (supabase.rpc as any)('confirm_order_history_access_payment', {
            p_access_id: orderData.orderId,
            p_payment_success: true,
            p_payment_reference: `PAY-${Date.now()}`
          });

          if (confirmError) {
            console.error('Error confirming history access:', confirmError);
          }

          toast({
            title: "Payment Successful!",
            description: "Your extended order history access has been activated!",
          });

          // Redirect to My Orders page
          navigate('/my-orders', {
            state: {
              paymentSuccess: true,
              historyAccessActivated: true
            }
          });
        } else {
          // Regular order payment - mark cart for clearing using localStorage
          localStorage.setItem('clearCartAfterPayment', 'true');

          toast({
            title: "Payment Successful!",
            description: `Your payment for order ${orderData.orderNumber} has been processed successfully.`,
          });

          // Redirect to My Orders page
          navigate('/my-orders', {
            state: {
              expandOrderId: orderData.orderId,
              paymentSuccess: true
            }
          });
        }
      } else {
        // Handle failure based on purchase type
        if (isSubscriptionRenewal) {
          // Subscription renewal payment failed
          toast({
            title: "Payment Failed",
            description: "Your subscription renewal payment could not be processed. Please try again.",
            variant: "destructive"
          });

          navigate('/merchant-console');
        } else if (isHistoryAccessPurchase) {
          // Confirm history access payment failure
          await (supabase.rpc as any)('confirm_order_history_access_payment', {
            p_access_id: orderData.orderId,
            p_payment_success: false,
            p_payment_reference: `PAY-${Date.now()}`
          });

          toast({
            title: "Payment Failed",
            description: "Your payment could not be processed. Please try again from My Orders page.",
            variant: "destructive"
          });

          navigate('/my-orders');
        } else {
          // Regular order - redirect to My Orders to retry payment
          toast({
            title: "Payment Failed",
            description: "Your payment could not be processed. Please try again from My Orders page.",
            variant: "destructive"
          });

          // Redirect to My Orders page with the failed order expanded
          navigate('/my-orders', {
            state: {
              expandOrderId: orderData.orderId,
              paymentFailed: true
            }
          });
        }
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
              <h1 className="text-3xl font-bold mb-2">
                {isSubscriptionRenewal ? 'Renew Your Subscription' : 'Complete Your Payment'}
              </h1>
              <p className="text-blue-100">
                {isSubscriptionRenewal
                  ? 'Continue enjoying premium merchant benefits'
                  : "You're just one step away from completing your order"}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>{isSubscriptionRenewal ? 'Reference Number:' : 'Order Number:'}</span>
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

          {/* Order/Subscription Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{isSubscriptionRenewal ? 'Subscription Summary' : 'Order Summary'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSubscriptionRenewal ? (
                <>
                  <div className="flex justify-between">
                    <span>Business Name:</span>
                    <span className="font-medium">{orderData.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span className="font-medium">{orderData.customerEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Plan:</span>
                    <span className="font-medium capitalize">{subscriptionPlan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-medium">
                      {subscriptionPlan === 'professional' ? '1 Year' : '1 Month'}
                    </span>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}

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