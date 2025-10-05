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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AddressAutocompleteSimple from './AddressAutocompleteSimple';
import {
  Truck,
  MapPin,
  Car,
  Package,
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  Tag,
  Check,
  X,
  Loader2 as LoaderIcon
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

  // Voucher state
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [appliedVoucherId, setAppliedVoucherId] = useState<string | null>(null);
  const [voucherValidationMsg, setVoucherValidationMsg] = useState('');
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);

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

        // Fetch available vouchers for this customer and order amount
        if (profile?.id) {
          try {
            // Calculate order amount (subtotal + delivery fee)
            const subtotal = selectedItems.reduce((total, item) => total + (item.normal_price * item.quantity), 0);
            const deliveryFee = deliveryMethods.find(m => m.id === selectedDelivery)?.price || 0;
            const orderAmount = subtotal + deliveryFee;

            const { data: vouchers } = await supabase.rpc('get_available_vouchers_for_checkout', {
              p_customer_id: profile.id,
              p_order_amount: orderAmount
            });
            setAvailableVouchers(vouchers || []);
          } catch (voucherError) {
            console.error('Error fetching vouchers:', voucherError);
            setAvailableVouchers([]);
          }
        }

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
  }, [isOpen, user, selectedDelivery]); // Re-fetch vouchers when delivery method changes

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
    const baseTotal = getSubtotal() + getDeliveryFee() + getTax();
    return baseTotal - voucherDiscount;
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

  // Voucher validation function
  const handleValidateVoucher = async (code?: string) => {
    const codeToValidate = code || voucherCode;

    if (!codeToValidate.trim()) {
      setVoucherValidationMsg('Please select a voucher');
      return;
    }

    if (!customerProfile) {
      setVoucherValidationMsg('Customer profile not loaded');
      return;
    }

    setIsValidatingVoucher(true);
    setVoucherValidationMsg('');

    try {
      const orderAmount = getSubtotal() + getDeliveryFee() + getTax();

      const { data, error } = await supabase.rpc('validate_voucher', {
        p_voucher_code: codeToValidate.trim(),
        p_customer_id: customerProfile.id,
        p_order_amount: orderAmount
      });

      if (error) throw error;

      const result = data[0];

      if (result.valid) {
        setVoucherDiscount(result.discount_amount);
        setAppliedVoucherId(result.voucher_id);
        setVoucherValidationMsg(`✓ Voucher applied! You save ${formatPrice(result.discount_amount)}`);
        toast({
          title: "Voucher Applied!",
          description: `You save ${formatPrice(result.discount_amount)}`,
        });
      } else {
        setVoucherDiscount(0);
        setAppliedVoucherId(null);
        setVoucherValidationMsg(`✗ ${result.message}`);
        toast({
          title: "Invalid Voucher",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Voucher validation error:', error);
      setVoucherValidationMsg('Error validating voucher');
      toast({
        title: "Validation Error",
        description: "Failed to validate voucher code",
        variant: "destructive"
      });
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  // Remove applied voucher
  const handleRemoveVoucher = () => {
    setVoucherCode('');
    setVoucherDiscount(0);
    setAppliedVoucherId(null);
    setVoucherValidationMsg('');
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
        status: 'PENDING_PAYMENT',
        voucher_id: appliedVoucherId,
        voucher_code: voucherCode || null,
        voucher_discount: voucherDiscount
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

      // Apply voucher if one was used
      if (appliedVoucherId && voucherCode && voucherDiscount > 0) {
        try {
          const { error: voucherError } = await supabase.rpc('apply_voucher_to_order', {
            p_order_id: orderId,
            p_voucher_code: voucherCode,
            p_customer_id: customerProfile.id,
            p_order_amount: subtotal + deliveryFee + tax,
            p_discount_amount: voucherDiscount
          });

          if (voucherError) {
            console.error('Error applying voucher:', voucherError);
          }
        } catch (voucherErr) {
          console.error('Voucher application failed:', voucherErr);
        }
      }

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
      <DialogContent className="max-w-4xl max-h-[95vh] w-[95vw] max-w-none sm:max-w-lg md:max-w-2xl lg:max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl">Checkout</DialogTitle>
          <DialogDescription className="text-sm md:text-base">
            Complete your purchase by providing delivery and payment information
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
          {/* Left Column - Order Summary & Forms */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 md:gap-3">
                    {item.component_image && (
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={item.component_image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs md:text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.component_sku}</p>
                      <p className="text-xs text-muted-foreground hidden sm:block">From: {item.product_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs md:text-sm">×{item.quantity}</p>
                      <p className="font-medium text-sm md:text-base">{formatPrice(item.normal_price * item.quantity)}</p>
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
                      <div key={method.id} className="flex items-start space-x-2 md:space-x-3 p-2 md:p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value={method.id} id={method.id} className="mt-1" />
                        <Icon className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <Label htmlFor={method.id} className="font-medium cursor-pointer text-sm md:text-base">
                            {method.name}
                          </Label>
                          <p className="text-xs md:text-sm text-muted-foreground">{method.description}</p>
                          {method.areas && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {method.areas}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          {method.price === 0 ? (
                            <Badge variant="secondary" className="text-xs">FREE</Badge>
                          ) : (
                            <p className="font-medium text-sm">+{formatPrice(method.price)}</p>
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
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <Label htmlFor="fullName" className="text-sm">Full Name</Label>
                      <Input
                        id="fullName"
                        value={customerProfile?.full_name || 'Not set'}
                        readOnly
                        className="bg-muted cursor-not-allowed text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">From your profile (fixed)</p>
                    </div>
                    <div>
                      <Label htmlFor="phoneNumber" className="text-sm">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        value={customerProfile?.phone || customerProfile?.phone_e164 || 'Not set'}
                        readOnly
                        className="bg-muted cursor-not-allowed text-sm"
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
                    <Label htmlFor="notes" className="text-sm">Special Instructions</Label>
                    <Textarea
                      id="notes"
                      value={deliveryAddress.notes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder="Any special delivery instructions..."
                      rows={2}
                      className="text-sm"
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
                      <div key={method.id} className="flex items-start space-x-2 md:space-x-3 p-2 md:p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value={method.id} id={method.id} className="mt-1" />
                        <Icon className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <Label htmlFor={method.id} className="font-medium cursor-pointer text-sm md:text-base">
                            {method.name}
                          </Label>
                          <p className="text-xs md:text-sm text-muted-foreground">{method.description}</p>
                        </div>
                        {method.fee && (
                          <p className="text-sm font-medium flex-shrink-0">+{formatPrice(method.fee)}</p>
                        )}
                      </div>
                    );
                  })}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Voucher Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Apply Voucher
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!appliedVoucherId ? (
                  <>
                    {availableVouchers.length > 0 ? (
                      <>
                        <Select
                          value={voucherCode}
                          onValueChange={(value) => {
                            setVoucherCode(value);
                            // Auto-validate immediately with the selected code
                            handleValidateVoucher(value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a voucher to apply" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableVouchers.map((voucher) => (
                              <SelectItem key={voucher.id} value={voucher.code}>
                                <div className="flex items-center justify-between gap-4 w-full">
                                  <div>
                                    <span className="font-medium">{voucher.code}</span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                      {voucher.discount_type === 'PERCENTAGE'
                                        ? `${voucher.discount_value}% OFF`
                                        : `RM ${voucher.discount_value} OFF`}
                                    </span>
                                  </div>
                                  {voucher.min_purchase_amount > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      Min RM {voucher.min_purchase_amount}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {voucherValidationMsg && (
                          <p className={`text-sm ${voucherValidationMsg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                            {voucherValidationMsg}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No vouchers available for this order
                      </p>
                    )}
                  </>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">Voucher Applied</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveVoucher}
                        className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700">Code: <Badge variant="outline" className="ml-1">{voucherCode}</Badge></span>
                      <span className="text-sm font-medium text-green-800">-{formatPrice(voucherDiscount)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Total */}
            <Card>
              <CardHeader>
                <CardTitle>Order Total</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 md:space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Subtotal ({selectedItems.length} items)</span>
                  <span className="font-medium">{formatPrice(getSubtotal())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Delivery Fee</span>
                  <span className="font-medium">{getDeliveryFee() === 0 ? 'FREE' : formatPrice(getDeliveryFee())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>SST (6%)</span>
                  <span className="font-medium">{formatPrice(getTax())}</span>
                </div>

                {voucherDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Voucher Discount
                    </span>
                    <span className="font-medium">-{formatPrice(voucherDiscount)}</span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between text-base md:text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(getTotal())}</span>
                </div>

                <Button
                  className="w-full mt-3 md:mt-4 text-sm md:text-base"
                  size="lg"
                  onClick={handlePlaceOrder}
                  disabled={!isAddressComplete() || isPlacingOrder}
                >
                  {isPlacingOrder ? 'Placing Order...' : `Place Order - ${formatPrice(getTotal())}`}
                </Button>

                <div className="text-center mt-3 md:mt-4">
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