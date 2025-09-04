import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import AddressAutocompleteSimple from './AddressAutocompleteSimple';
import { 
  Truck, 
  MapPin, 
  Car, 
  Package,
  CreditCard,
  Smartphone,
  Building2,
  Wallet
} from 'lucide-react';

interface CartItem {
  id: string;
  component_sku: string;
  name: string;
  normal_price: number;
  quantity: number;
  product_name: string;
  component_image?: string;
}

interface DeliveryMethod {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: any;
  areas?: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: any;
  fee?: number;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: CartItem[];
  onOrderSuccess?: (orderId?: string) => void; // Callback after successful order - now includes orderId
}

const deliveryMethods: DeliveryMethod[] = [
  {
    id: 'local-driver',
    name: 'Local Driver',
    description: 'Professional delivery within Selangor/KL area',
    price: 0,
    icon: Truck,
    areas: 'Selangor/KL Area'
  },
  {
    id: 'overstate-driver',
    name: 'OverState Driver',
    description: 'Delivery to other states in Malaysia',
    price: 15,
    icon: Car,
    areas: 'Other States'
  },
  {
    id: 'lalamove',
    name: 'Lalamove',
    description: 'Fast same-day delivery service',
    price: 10,
    icon: Package,
  },
  {
    id: 'self-pickup',
    name: 'Self Pickup',
    description: 'Collect from our store location',
    price: 0,
    icon: MapPin,
  }
];

const paymentMethods: PaymentMethod[] = [
  {
    id: 'fpx',
    name: 'FPX Online Banking',
    description: 'Pay directly from your bank account',
    icon: Building2,
  },
  {
    id: 'credit-card',
    name: 'Credit/Debit Card',
    description: 'Visa, MasterCard, American Express',
    icon: CreditCard,
  },
  {
    id: 'touch-n-go',
    name: 'Touch \'n Go eWallet',
    description: 'Pay with TNG Digital Wallet',
    icon: Smartphone,
  },
  {
    id: 'grab-pay',
    name: 'GrabPay',
    description: 'Pay with GrabPay Wallet',
    icon: Wallet,
  },
  {
    id: 'boost',
    name: 'Boost',
    description: 'Pay with Boost eWallet',
    icon: Smartphone,
  },
  {
    id: 'shopee-pay',
    name: 'ShopeePay',
    description: 'Pay with ShopeePay Wallet',
    icon: Wallet,
  }
];

const CheckoutModal = ({ isOpen, onClose, selectedItems, onOrderSuccess }: CheckoutModalProps) => {
  const [selectedDelivery, setSelectedDelivery] = useState('local-driver');
  const [selectedPayment, setSelectedPayment] = useState('fpx');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deliveryAddress, setDeliveryAddress] = useState({
    address: '',
    notes: ''
  });

  // Fetch customer profile when modal opens
  useEffect(() => {
    const fetchCustomerProfile = async () => {
      if (!isOpen || !user) return;
      
      try {
        const { data: profile, error } = await supabase
          .from('customer_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (error) {
          console.warn('No customer profile found:', error);
          return;
        }
        
        setCustomerProfile(profile);
        
        // Reset delivery address
        if (profile) {
          setDeliveryAddress({
            address: '',
            notes: ''
          });
        }
      } catch (error) {
        console.error('Error fetching customer profile:', error);
      }
    };
    
    fetchCustomerProfile();
  }, [isOpen, user]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(amount);
  };

  const getSubtotal = () => {
    return selectedItems.reduce((total, item) => total + (item.normal_price * item.quantity), 0);
  };

  const getDeliveryFee = () => {
    const method = deliveryMethods.find(m => m.id === selectedDelivery);
    return method?.price || 0;
  };

  const getTax = () => {
    // 6% SST for Malaysia
    return (getSubtotal() + getDeliveryFee()) * 0.06;
  };

  const getTotal = () => {
    return getSubtotal() + getDeliveryFee() + getTax();
  };

  const needsDeliveryAddress = selectedDelivery !== 'self-pickup';

  const handleAddressChange = (address: string, components?: any) => {
    setDeliveryAddress(prev => ({
      ...prev,
      address: address
    }));
  };

  const handleNotesChange = (value: string) => {
    setDeliveryAddress(prev => ({
      ...prev,
      notes: value
    }));
  };

  const isAddressComplete = () => {
    if (!needsDeliveryAddress) {
      // Even for self-pickup, we need customer profile with phone
      return customerProfile && (customerProfile.phone || customerProfile.phone_e164);
    }
    return deliveryAddress.address.trim().length > 0;
  };

  const handlePlaceOrder = async () => {
    if (!customerProfile) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile with phone number before placing order",
        variant: "destructive"
      });
      return;
    }

    if (!isAddressComplete()) {
      const message = needsDeliveryAddress 
        ? "Please fill in all required delivery address fields"
        : "Phone number is required from your profile";
      toast({
        title: "Information Required",
        description: message,
        variant: "destructive"
      });
      return;
    }

    setIsPlacingOrder(true);
    
    try {
      const subtotal = getSubtotal();
      const deliveryFee = getDeliveryFee();
      const tax = getTax();
      const total = getTotal();

      // Use customer profile information
      const customerName = customerProfile.full_name;
      const customerPhone = customerProfile.phone || customerProfile.phone_e164;
      const customerEmail = customerProfile.email || user?.email || '';

      // Prepare order data - user_id will be used to link with customer_profiles in the database function
      const orderData = {
        user_id: user?.id || null,  // This will be used to find customer_profile_id in the SQL function
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        delivery_method: selectedDelivery,
        delivery_address: needsDeliveryAddress ? {
          fullName: customerName,
          phoneNumber: customerPhone,
          address: deliveryAddress.address,
          notes: deliveryAddress.notes
        } : null,
        delivery_fee: deliveryFee,
        payment_method: selectedPayment,
        payment_state: 'UNPAID', // Will be updated after payment gateway
        subtotal: subtotal,
        tax: tax,
        discount: 0,
        shipping_fee: deliveryFee,
        total: total,
        status: 'PENDING_PAYMENT'
      };

      // Prepare order items - the SQL function will look up component_id by SKU
      const orderItems = selectedItems.map(item => ({
        component_sku: item.component_sku,
        component_name: item.name,
        product_context: item.product_name,
        quantity: item.quantity,
        unit_price: item.normal_price,
        total_price: item.normal_price * item.quantity
      }));

      // Use the database function to create order with automatic inventory deduction
      const { data: orderResult, error: orderError } = await supabase
        .rpc('create_order_with_items', {
          order_data: orderData,
          items_data: orderItems
        });

      if (orderError) throw orderError;

      // Check if order creation was successful
      if (!orderResult?.success) {
        throw new Error(orderResult?.message || 'Order creation failed');
      }

      // Success! Order created, now redirect to payment gateway
      const orderNumber = orderResult?.order_number || 'N/A';
      const orderId = orderResult?.order_id;
      
      toast({
        title: "Order Created!",
        description: `Your order ${orderNumber} has been created. Please complete payment to confirm your order.`
      });

      // Clear cart items and close modal
      if (onOrderSuccess) {
        onOrderSuccess(orderId); // Pass order ID to callback
      }
      onClose();

      // Redirect to payment gateway
      navigate('/payment-gateway', {
        state: {
          orderData: {
            orderId: orderId,
            orderNumber: orderNumber,
            total: total,
            paymentMethod: selectedPayment,
            customerName: customerName,
            customerEmail: customerEmail
          }
        }
      });

    } catch (error: any) {
      console.error('Error placing order:', error);
      toast({
        title: "Order Failed",
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Checkout</DialogTitle>
          <DialogDescription>
            Complete your purchase by providing delivery and payment information
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Order Summary & Forms */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    {item.component_image && (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={item.component_image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.component_sku}</p>
                      <p className="text-xs text-muted-foreground">From: {item.product_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">×{item.quantity}</p>
                      <p className="font-medium">{formatPrice(item.normal_price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Delivery Method */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedDelivery} onValueChange={setSelectedDelivery}>
                  {deliveryMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <div key={method.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value={method.id} id={method.id} />
                        <Icon className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <Label htmlFor={method.id} className="font-medium cursor-pointer">
                            {method.name}
                          </Label>
                          <p className="text-sm text-muted-foreground">{method.description}</p>
                          {method.areas && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {method.areas}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          {method.price === 0 ? (
                            <Badge variant="secondary">FREE</Badge>
                          ) : (
                            <p className="font-medium">+{formatPrice(method.price)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            {needsDeliveryAddress && (
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={customerProfile?.full_name || 'Not set'}
                        readOnly
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground mt-1">From your profile (fixed)</p>
                    </div>
                    <div>
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        value={customerProfile?.phone || customerProfile?.phone_e164 || 'Not set'}
                        readOnly
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground mt-1">From your profile (fixed)</p>
                    </div>
                  </div>
                  <div>
                    <AddressAutocompleteSimple
                      value={deliveryAddress.address}
                      onChange={handleAddressChange}
                      placeholder="Type address like 'Nadayu28', 'KLCC', or '1 Utama'..."
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Search will find Malaysian addresses automatically. Try typing building names, areas, or landmarks.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="notes">Special Instructions</Label>
                    <Textarea
                      id="notes"
                      value={deliveryAddress.notes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder="Any special delivery instructions..."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Self-pickup note */}
            {selectedDelivery === 'self-pickup' && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-blue-800">
                    <MapPin className="h-4 w-4" />
                    <div>
                      <p className="font-medium text-sm">Self Pickup Information</p>
                      <p className="text-xs">Your profile phone number ({customerProfile?.phone || 'not set'}) will be used for pickup coordination.</p>
                      {!customerProfile?.phone && (
                        <p className="text-xs text-red-600 mt-1">⚠️ Please update your profile with phone number before checkout.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Payment & Total */}
          <div className="space-y-6">
            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedPayment} onValueChange={setSelectedPayment}>
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <div key={method.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value={method.id} id={method.id} />
                        <Icon className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <Label htmlFor={method.id} className="font-medium cursor-pointer">
                            {method.name}
                          </Label>
                          <p className="text-sm text-muted-foreground">{method.description}</p>
                        </div>
                        {method.fee && (
                          <p className="text-sm font-medium">+{formatPrice(method.fee)}</p>
                        )}
                      </div>
                    );
                  })}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Order Total */}
            <Card>
              <CardHeader>
                <CardTitle>Order Total</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Subtotal ({selectedItems.length} items)</span>
                  <span>{formatPrice(getSubtotal())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Delivery Fee</span>
                  <span>{getDeliveryFee() === 0 ? 'FREE' : formatPrice(getDeliveryFee())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>SST (6%)</span>
                  <span>{formatPrice(getTax())}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(getTotal())}</span>
                </div>
                
                <Button 
                  className="w-full mt-4" 
                  size="lg"
                  onClick={handlePlaceOrder}
                  disabled={!isAddressComplete() || isPlacingOrder}
                >
                  {isPlacingOrder ? 'Placing Order...' : `Place Order - ${formatPrice(getTotal())}`}
                </Button>
                
                <div className="text-center mt-4">
                  <p className="text-xs text-muted-foreground">
                    🔒 Secure payment processing
                  </p>
                  <p className="text-xs text-muted-foreground">
                    SSL encrypted & PCI compliant
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;