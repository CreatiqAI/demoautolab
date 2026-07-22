import { useState, useEffect, useMemo } from 'react';
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
import { groupCartItemsBySeller } from '@/lib/cartGrouping';
import { transformImage } from '@/lib/imageTransform';
import {
  Truck,
  MapPin,
  Package,
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  Tag,
  Check,
  X,
  Store,
  AlertTriangle,
  Banknote,
} from 'lucide-react';

interface CartItem {
  id: string;
  component_sku: string;
  name: string;
  normal_price: number;
  quantity: number;
  product_name: string;
  component_image?: string;
  vendor_id?: string | null;
  vendor_name?: string | null;
}

interface AutoLabDeliveryMethod {
  id: 'self-pickup' | 'jt' | 'lalamove';
  name: string;
  description: string;
  price: number;
  icon: any;
}

interface VendorDeliveryMethod {
  id: 'jt' | 'lalamove';
  name: string;
  description: string;
  icon: any;
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
  onOrderSuccess?: (orderId?: string) => void; // Callback after successful order
}

/**
 * AutoLab delivery options — DFOD (Delivery Fee on Delivery) for J&T and
 * Lalamove. Customer pays the courier on arrival, nothing added to the
 * online order total. Self Pickup is free (no shipping involved).
 *
 *   - Self Pickup: customer collects from store; no fee.
 *   - J&T Express: J&T's native DFOD service — receiver settles delivery fee.
 *   - Lalamove: booked with cash + driver-collects-from-recipient remark
 *     (Lalamove MY supports this manual flow today; API integration in
 *     Phase B will quote a live rate to display here).
 */
const autoLabDeliveryMethods: AutoLabDeliveryMethod[] = [
  {
    id: 'self-pickup',
    name: 'Self Pickup',
    description: 'Collect within 1 day from our store location',
    price: 0,
    icon: MapPin,
  },
  {
    id: 'jt',
    name: 'J&T Express',
    description: 'Standard delivery — pay courier on arrival (DFOD)',
    price: 0,
    icon: Truck,
  },
  {
    id: 'lalamove',
    name: 'Lalamove',
    description: 'Urgent delivery — pay courier on arrival',
    price: 0,
    icon: Package,
  },
];

/**
 * Vendor delivery options — Cash on Delivery (COD).
 * Customer pays the courier directly on arrival; nothing is collected
 * via the order. No self-pickup option for vendor sub-orders.
 */
const vendorDeliveryMethods: VendorDeliveryMethod[] = [
  {
    id: 'jt',
    name: 'J&T Express',
    description: 'Standard delivery — pay courier on arrival (DFOD)',
    icon: Truck,
  },
  {
    id: 'lalamove',
    name: 'Lalamove',
    description: 'Urgent delivery — pay courier on arrival',
    icon: Package,
  },
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
  },
];

type AutoLabMethodId = AutoLabDeliveryMethod['id'];
type VendorMethodId = VendorDeliveryMethod['id'];

const CheckoutModal = ({ isOpen, onClose, selectedItems, onOrderSuccess: _onOrderSuccess }: CheckoutModalProps) => {
  // AutoLab shipping selection (paid online as part of the order)
  const [autoLabMethod, setAutoLabMethod] = useState<AutoLabMethodId>('jt');

  // Per-vendor shipping selection (COD — fee paid to courier on delivery)
  const [vendorMethods, setVendorMethods] = useState<Record<string, VendorMethodId>>({});

  const [selectedPayment, setSelectedPayment] = useState('fpx');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deliveryAddress, setDeliveryAddress] = useState({
    address: '',
    notes: '',
  });

  // Voucher state
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [appliedVoucherId, setAppliedVoucherId] = useState<string | null>(null);
  const [voucherValidationMsg, setVoucherValidationMsg] = useState('');
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);

  // Vendors with blank pickup addresses — checkout is blocked while this is non-empty.
  const [vendorAddressIssues, setVendorAddressIssues] = useState<{ vendorId: string; businessName: string }[]>([]);
  const [isCheckingVendorAddresses, setIsCheckingVendorAddresses] = useState(false);

  // Group items by seller
  const sellerGroups = useMemo(() => groupCartItemsBySeller(selectedItems), [selectedItems]);
  const vendorGroups = useMemo(() => sellerGroups.filter(g => g.isVendor), [sellerGroups]);
  const autolabGroup = useMemo(() => sellerGroups.find(g => !g.isVendor) ?? null, [sellerGroups]);
  const hasAutoLabItems = !!autolabGroup;

  // Stable join key over the vendor IDs in the cart
  const vendorIdsKey = useMemo(
    () => vendorGroups.map(g => g.vendorId).filter(Boolean).join(','),
    [vendorGroups]
  );

  // Initialise default vendor shipping method ('jt') for any vendor in the cart
  // that doesn't yet have a selection. Drop selections for vendors no longer in the cart.
  useEffect(() => {
    setVendorMethods(prev => {
      const next: Record<string, VendorMethodId> = {};
      for (const g of vendorGroups) {
        if (!g.vendorId) continue;
        next[g.vendorId] = prev[g.vendorId] ?? 'jt';
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorIdsKey]);

  // Validate vendor pickup addresses upfront. Any vendor with a blank/null
  // `address` field blocks checkout — they need to set it before we can ship.
  useEffect(() => {
    const validateVendorAddresses = async () => {
      const vendorIds = vendorGroups
        .map(g => g.vendorId)
        .filter((id): id is string => !!id);

      if (vendorIds.length === 0) {
        setVendorAddressIssues([]);
        return;
      }

      setIsCheckingVendorAddresses(true);
      try {
        const { data, error } = await supabase
          .from('vendors' as any)
          .select('id, business_name, address')
          .in('id', vendorIds);

        if (error) {
          // Fail open: don't block checkout on a fetch error, but log nothing
          // to console (per project convention) and treat as no issues.
          setVendorAddressIssues([]);
          return;
        }

        const issues = (data as any[] | null ?? [])
          .filter(row => {
            const addr = typeof row.address === 'string' ? row.address.trim() : '';
            return addr.length === 0;
          })
          .map(row => ({
            vendorId: row.id as string,
            businessName: (row.business_name as string) || 'Vendor',
          }));

        setVendorAddressIssues(issues);
      } catch {
        setVendorAddressIssues([]);
      } finally {
        setIsCheckingVendorAddresses(false);
      }
    };

    if (isOpen) {
      validateVendorAddresses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, vendorIdsKey]);

  // Fetch customer profile when modal opens
  useEffect(() => {
    const fetchCustomerProfile = async () => {
      if (!isOpen || !user) return;

      try {
        const { data: profile, error } = await supabase
          .from('customer_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          return;
        }

        setCustomerProfile(profile);

        // Fetch available vouchers for this customer and order amount.
        // Voucher applies to AutoLab portion only; we still surface vouchers
        // based on the AutoLab-side amount.
        if (profile?.id) {
          try {
            const autolabSubtotal = autolabGroup?.subtotal ?? 0;
            const deliveryFee = getAutoLabFeeFor(autoLabMethod);
            const orderAmount = autolabSubtotal + deliveryFee;

            const { data: vouchers } = await supabase.rpc('get_available_vouchers_for_checkout', {
              p_customer_id: profile.id,
              p_order_amount: orderAmount,
            });
            setAvailableVouchers(vouchers || []);
          } catch (voucherError) {
            setAvailableVouchers([]);
          }
        }

        // Reset delivery address
        if (profile) {
          setDeliveryAddress({
            address: '',
            notes: '',
          });
        }
      } catch (error) {
        // swallow — handled by toast in placeOrder if profile is missing
      }
    };

    fetchCustomerProfile();
    // Re-fetch vouchers when AutoLab delivery method or AutoLab subtotal changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user, autoLabMethod, autolabGroup?.subtotal]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(amount);
  };

  // ---------- Totals ----------

  const getAutoLabFeeFor = (methodId: AutoLabMethodId): number => {
    return autoLabDeliveryMethods.find(m => m.id === methodId)?.price ?? 0;
  };

  const getSubtotal = () => {
    return selectedItems.reduce((total, item) => total + (item.normal_price * item.quantity), 0);
  };

  /** AutoLab shipping fee — the only shipping the customer pays online. */
  const getAutoLabFee = () => {
    if (!hasAutoLabItems) return 0;
    return getAutoLabFeeFor(autoLabMethod);
  };

  /**
   * Combined shipping fee that the customer pays online.
   * Vendor shipping is COD (paid to driver), so it is NOT included here.
   */
  const getOnlineShippingFee = () => {
    return getAutoLabFee();
  };

  const getTax = () => {
    // SST removed — no tax is charged on orders.
    return 0;
  };

  const getTotal = () => {
    const baseTotal = getSubtotal() + getOnlineShippingFee() + getTax();
    return Math.max(0, baseTotal - voucherDiscount);
  };

  // Customer always needs an address: AutoLab couriers ship to it (unless
  // self-pickup), and vendors will also ship to the same address.
  const needsDeliveryAddress = autoLabMethod !== 'self-pickup' || vendorGroups.length > 0;

  const handleAddressChange = (address: string) => {
    setDeliveryAddress(prev => ({
      ...prev,
      address: address,
    }));
  };

  const handleNotesChange = (value: string) => {
    setDeliveryAddress(prev => ({
      ...prev,
      notes: value,
    }));
  };

  const isAddressComplete = () => {
    if (!needsDeliveryAddress) {
      // Even for self-pickup, we need customer profile with phone
      return customerProfile && (customerProfile.phone || customerProfile.phone_e164);
    }
    return deliveryAddress.address.trim().length > 0;
  };

  const hasVendorAddressBlockers = vendorAddressIssues.length > 0;

  // ---------- Voucher ----------

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
      // Voucher only applies to the AutoLab slice (per platform rule).
      // If there's no AutoLab portion, vouchers cannot be used.
      const autolabSubtotal = autolabGroup?.subtotal ?? 0;
      const autolabShipping = getAutoLabFee();
      const orderAmount = autolabSubtotal + autolabShipping; // SST removed

      const { data, error } = await supabase.rpc('validate_voucher', {
        p_voucher_code: codeToValidate.trim(),
        p_customer_id: customerProfile.id,
        p_order_amount: orderAmount,
      });

      if (error) throw error;

      const result = data[0];

      if (result.valid) {
        setVoucherDiscount(result.discount_amount);
        setAppliedVoucherId(result.voucher_id);
        setVoucherValidationMsg(`Voucher applied. You save ${formatPrice(result.discount_amount)}`);
        toast({
          title: 'Voucher Applied!',
          description: `You save ${formatPrice(result.discount_amount)}`,
        });
      } else {
        setVoucherDiscount(0);
        setAppliedVoucherId(null);
        setVoucherValidationMsg(result.message);
        toast({
          title: 'Invalid Voucher',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setVoucherValidationMsg('Error validating voucher');
      toast({
        title: 'Validation Error',
        description: 'Failed to validate voucher code',
        variant: 'destructive',
      });
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setVoucherCode('');
    setVoucherDiscount(0);
    setAppliedVoucherId(null);
    setVoucherValidationMsg('');
  };

  // ---------- Place order ----------

  const handlePlaceOrder = async () => {
    if (!customerProfile) {
      toast({
        title: 'Profile Required',
        description: 'Please complete your profile with phone number before placing order',
        variant: 'destructive',
      });
      return;
    }

    if (!isAddressComplete()) {
      const message = needsDeliveryAddress
        ? 'Please fill in all required delivery address fields'
        : 'Phone number is required from your profile';
      toast({
        title: 'Information Required',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    if (hasVendorAddressBlockers) {
      const first = vendorAddressIssues[0];
      toast({
        title: 'Vendor pickup address missing',
        description: `${first.businessName} needs to set their pickup address before they can ship. Please contact AutoLab support.`,
        variant: 'destructive',
      });
      return;
    }

    setIsPlacingOrder(true);

    try {
      const subtotal = getSubtotal();
      const onlineShipping = getOnlineShippingFee(); // AutoLab only
      const tax = getTax();
      const total = getTotal();

      const customerName = customerProfile.full_name;
      const customerPhone = customerProfile.phone || customerProfile.phone_e164;
      const customerEmail = customerProfile.email || user?.email || '';

      // Build the per-seller shipping_methods map. AutoLab fee is the only
      // shipping fee collected in the order; every vendor entry has fee=0
      // because vendor shipping is paid COD to the courier on delivery.
      const shippingMethods: Record<string, { method: string; fee: number }> = {};

      if (hasAutoLabItems) {
        shippingMethods.autolab = {
          method: autoLabMethod,
          fee: getAutoLabFee(),
        };
      }

      for (const group of vendorGroups) {
        if (!group.vendorId) continue;
        shippingMethods[group.vendorId] = {
          method: vendorMethods[group.vendorId] ?? 'jt',
          fee: 0, // COD — not collected in the order
        };
      }

      const orderData = {
        user_id: user?.id || null,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        // Backwards-compat: top-level delivery_method/fee mirrors the AutoLab slice.
        delivery_method: hasAutoLabItems ? autoLabMethod : 'jt',
        delivery_address: needsDeliveryAddress ? {
          fullName: customerName,
          phoneNumber: customerPhone,
          address: deliveryAddress.address,
          notes: deliveryAddress.notes,
        } : null,
        delivery_fee: onlineShipping,
        payment_method: selectedPayment,
        payment_state: 'PENDING',
        subtotal: subtotal,
        tax: tax,
        discount: 0,
        shipping_fee: onlineShipping,
        total: total,
        status: 'PROCESSING',
        voucher_id: appliedVoucherId,
        voucher_code: voucherCode || null,
        voucher_discount: voucherDiscount,
        // New per-seller shipping map consumed by create_order_with_items.
        shipping_methods: shippingMethods,
      };

      // FOC guard: a free (RM0) line is only legitimate if a paid item from the
      // same product is also in this order (the "main item" that unlocks the gift).
      // If the customer removed the main item but kept the gift, drop the gift so
      // it cannot be claimed for free on its own. Free lines contribute 0 to the
      // totals, so dropping them does not change subtotal/total.
      const paidProductContexts = new Set(
        selectedItems.filter(i => i.normal_price > 0).map(i => i.product_name)
      );
      const orderItems = selectedItems
        .filter(item => item.normal_price > 0 || paidProductContexts.has(item.product_name))
        .map(item => ({
          component_sku: item.component_sku,
          component_name: item.name,
          product_context: item.product_name,
          quantity: item.quantity,
          unit_price: item.normal_price,
          total_price: item.normal_price * item.quantity,
        }));

      // The RPC handles the multi-seller split internally and returns either
      // the legacy `{ success, order_id, order_number }` shape or the newer
      // `{ success, order_id, order_number, order_group_id, orders, split }`.
      const { data: orderResult, error: orderError } = await supabase
        .rpc('create_order_with_items', {
          order_data: orderData,
          items_data: orderItems,
        });

      if (orderError) throw orderError;

      if (!orderResult?.success) {
        throw new Error(orderResult?.message || 'Order creation failed');
      }

      const orderNumber = orderResult?.order_number || 'N/A';
      const orderId = orderResult?.order_id;

      // Apply voucher if one was used (against the AutoLab-side order)
      if (appliedVoucherId && voucherCode && voucherDiscount > 0) {
        try {
          await supabase.rpc('apply_voucher_to_order', {
            p_order_id: orderId,
            p_voucher_code: voucherCode,
            p_customer_id: customerProfile.id,
            p_order_amount: subtotal + onlineShipping + tax,
            p_discount_amount: voucherDiscount,
          });
        } catch {
          // Non-fatal — payment can still proceed.
        }
      }

      toast({
        title: 'Order Created!',
        description: `Your order ${orderNumber} has been created. Please complete payment to confirm your order.`,
      });

      onClose();

      // Cart will be cleared via localStorage flag when payment succeeds
      navigate('/payment-gateway', {
        state: {
          orderData: {
            orderId: orderId,
            orderNumber: orderNumber,
            total: total,
            paymentMethod: selectedPayment,
            customerName: customerName,
            customerEmail: customerEmail,
          },
        },
      });
    } catch (error: any) {
      toast({
        title: 'Order Failed',
        description: error.message || 'Failed to place order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // ---------- Render helpers ----------

  /**
   * Sum of all vendor COD shipping fees the customer will pay on delivery.
   * NOTE: this is presentational only — it is NOT collected in the order.
   * Phase B will replace this with live J&T/Lalamove API quotes per vendor.
   */
  const codFeesSummary = vendorGroups.length;

  // ---------- Render ----------

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] w-[95vw] sm:max-w-2xl lg:max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl">Checkout</DialogTitle>
          <DialogDescription className="text-sm md:text-base">
            Review your order, choose how each seller ships their items, and place a single order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 md:space-y-5">
          {/* 0. Vendor address blocker banner — surfaced as soon as we know */}
          {hasVendorAddressBlockers && (
            <div className="border border-red-300 bg-red-50 rounded-lg p-3 md:p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-red-800">
                  {vendorAddressIssues.length === 1
                    ? `${vendorAddressIssues[0].businessName} needs to set their pickup address before they can ship.`
                    : `${vendorAddressIssues.length} vendors haven't set their pickup address yet.`}
                </p>
                <p className="text-red-700">
                  Please contact AutoLab support so they can finish setup. We can't place this order until then.
                </p>
                {vendorAddressIssues.length > 1 && (
                  <ul className="text-xs text-red-700 list-disc list-inside mt-1">
                    {vendorAddressIssues.map(v => (
                      <li key={v.vendorId}>{v.businessName}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* 1. Delivery address — single global section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <MapPin className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                Delivery Address
              </CardTitle>
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

              {needsDeliveryAddress ? (
                <>
                  <div>
                    <Label className="text-sm">Address</Label>
                    <AddressAutocompleteSimple
                      value={deliveryAddress.address}
                      onChange={handleAddressChange}
                      placeholder="Type address like 'Nadayu28', 'KLCC', or '1 Utama'..."
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Search will find Malaysian addresses automatically.
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
                </>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-900">Self-pickup selected</p>
                  <p className="text-xs text-blue-700">
                    Your phone number above will be used for pickup coordination.
                  </p>
                  {!customerProfile?.phone && (
                    <p className="text-xs text-red-600 mt-1">Please update your profile with a phone number before checkout.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Per-seller cards */}
          {sellerGroups.map((group) => {
            const isAutolab = !group.isVendor;
            const vendorId = group.vendorId;
            const isVendorBlocked = !isAutolab && vendorId
              ? vendorAddressIssues.some(v => v.vendorId === vendorId)
              : false;

            // For AutoLab, the seller shipping fee is what customer pays online.
            // For vendors, the in-order fee is always 0 (COD), so the per-seller
            // total is just the items subtotal.
            const sellerShippingFee = isAutolab ? getAutoLabFee() : 0;
            const sellerTotal = group.subtotal + sellerShippingFee;

            return (
              <Card key={group.sellerKey} className="overflow-hidden">
                {/* Seller header strip */}
                <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b ${
                  isAutolab ? 'bg-gray-50' : 'bg-lime-50 border-lime-200'
                }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                      isAutolab ? 'bg-gray-200 text-gray-700' : 'bg-lime-200 text-lime-800'
                    }`}>
                      {isAutolab ? <Building2 className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                    </div>
                    <span className={`font-semibold text-sm md:text-base truncate ${
                      isAutolab ? 'text-gray-700' : 'text-lime-800'
                    }`}>
                      {group.sellerName}
                    </span>
                    {isAutolab ? (
                      <Badge variant="outline" className="text-[10px] border-gray-300 text-gray-600">In-house</Badge>
                    ) : (
                      <>
                        <Badge variant="outline" className="text-[10px] border-lime-300 text-lime-700">Vendor</Badge>
                        <Badge className="text-[10px] bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200">
                          <Banknote className="h-3 w-3 mr-1" />
                          Cash on Delivery
                        </Badge>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <CardContent className="p-0">
                  {/* Items list (compact) */}
                  <div className="divide-y">
                    {group.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 md:p-4">
                        {item.component_image && (
                          <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={transformImage(item.component_image, { width: 140, quality: 70 })}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs md:text-sm line-clamp-1">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.component_sku}</p>
                          <p className="text-xs text-muted-foreground">{formatPrice(item.normal_price)} each</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs md:text-sm">×{item.quantity}</p>
                          <p className="font-semibold text-sm md:text-base">
                            {formatPrice(item.normal_price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Shipping section per seller */}
                  <div className="px-4 py-3 bg-gray-50 border-t space-y-2">
                    {isAutolab ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Delivery method
                        </p>
                        <RadioGroup
                          value={autoLabMethod}
                          onValueChange={(v) => setAutoLabMethod(v as AutoLabMethodId)}
                        >
                          {autoLabDeliveryMethods.map((method) => {
                            const Icon = method.icon;
                            return (
                              <div key={method.id} className="flex items-start space-x-2 md:space-x-3 p-2 md:p-3 border rounded-lg bg-white hover:bg-gray-50">
                                <RadioGroupItem value={method.id} id={`autolab-${method.id}`} className="mt-1" />
                                <Icon className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <Label htmlFor={`autolab-${method.id}`} className="font-medium cursor-pointer text-sm md:text-base">
                                    {method.name}
                                  </Label>
                                  <p className="text-xs md:text-sm text-muted-foreground">{method.description}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  {method.id === 'self-pickup' ? (
                                    <Badge variant="secondary" className="text-xs">FREE</Badge>
                                  ) : method.price === 0 ? (
                                    <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-800 bg-amber-50 whitespace-nowrap">
                                      Pay on delivery
                                    </Badge>
                                  ) : (
                                    <p className="font-medium text-sm">+{formatPrice(method.price)}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Delivery method
                          </p>
                          <span className="text-[10px] uppercase tracking-wide text-amber-700 font-semibold">
                            COD
                          </span>
                        </div>
                        <RadioGroup
                          value={vendorMethods[vendorId ?? ''] ?? 'jt'}
                          onValueChange={(v) =>
                            vendorId &&
                            setVendorMethods(prev => ({ ...prev, [vendorId]: v as VendorMethodId }))
                          }
                        >
                          {vendorDeliveryMethods.map((method) => {
                            const Icon = method.icon;
                            const radioId = `vendor-${vendorId}-${method.id}`;
                            return (
                              <div key={method.id} className="flex items-start space-x-2 md:space-x-3 p-2 md:p-3 border rounded-lg bg-white hover:bg-gray-50">
                                <RadioGroupItem value={method.id} id={radioId} className="mt-1" />
                                <Icon className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <Label htmlFor={radioId} className="font-medium cursor-pointer text-sm md:text-base">
                                    {method.name}
                                  </Label>
                                  <p className="text-xs md:text-sm text-muted-foreground">{method.description}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-800 bg-amber-50">
                                    Pay on delivery
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </RadioGroup>
                        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                          <span className="font-semibold">Pay on delivery (COD)</span> — the driver collects the
                          shipping fee from you on arrival. Nothing extra is added to your online payment for this seller.
                        </p>
                        {isVendorBlocked && (
                          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 flex items-start gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                            <span>
                              This vendor hasn't set their pickup address yet. We can't place the order until AutoLab support resolves this.
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Per-seller subtotal */}
                  <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {isAutolab ? 'Items + shipping' : 'Items (shipping paid on delivery)'}
                    </span>
                    <span className="text-sm md:text-base font-bold text-gray-900">
                      {formatPrice(sellerTotal)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* 3. Voucher */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Tag className="h-4 w-4 md:h-5 md:w-5" />
                Apply Voucher
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {vendorGroups.length > 0 && (
                <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Vouchers apply to AutoLab items only. Vendor items are billed at the vendor's listed price.
                </p>
              )}
              {!autolabGroup && (
                <p className="text-xs text-muted-foreground">
                  No AutoLab items in this cart, so no vouchers can be applied.
                </p>
              )}
              {autolabGroup && !appliedVoucherId && (
                <>
                  {availableVouchers.length > 0 ? (
                    <>
                      <Select
                        value={voucherCode}
                        onValueChange={(value) => {
                          setVoucherCode(value);
                          handleValidateVoucher(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isValidatingVoucher ? 'Validating...' : 'Select a voucher to apply'} />
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
                        <p className={`text-sm ${voucherDiscount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {voucherValidationMsg}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No vouchers available for this order
                    </p>
                  )}
                </>
              )}
              {appliedVoucherId && (
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

          {/* 4. Payment method */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Payment Method</CardTitle>
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

          {/* 5. Combined order summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Order Total</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 md:space-y-3">
              <div className="flex justify-between text-sm">
                <span>Items subtotal ({selectedItems.length})</span>
                <span className="font-medium">{formatPrice(getSubtotal())}</span>
              </div>
              {hasAutoLabItems && (
                <div className="flex justify-between text-sm">
                  <span>AutoLab shipping</span>
                  <span className="font-medium">
                    {autoLabMethod === 'self-pickup' ? (
                      'FREE'
                    ) : getOnlineShippingFee() > 0 ? (
                      formatPrice(getOnlineShippingFee())
                    ) : (
                      <span className="text-amber-700 text-xs">Pay on delivery</span>
                    )}
                  </span>
                </div>
              )}
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
                <span>You pay online</span>
                <span>{formatPrice(getTotal())}</span>
              </div>

              {codFeesSummary > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
                  <Banknote className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-semibold">Plus vendor shipping paid on delivery</span> — see each seller's section above.
                    {' '}The driver collects the shipping fee from you in cash; it is not added to this online payment.
                  </span>
                </div>
              )}

              {sellerGroups.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  You'll receive {sellerGroups.length} separate orders, one per seller. Pay once, ship from each seller independently.
                </p>
              )}

              <Button
                className="w-full mt-3 md:mt-4 text-sm md:text-base"
                size="lg"
                onClick={handlePlaceOrder}
                disabled={
                  !isAddressComplete() ||
                  isPlacingOrder ||
                  hasVendorAddressBlockers ||
                  isCheckingVendorAddresses
                }
                title={
                  hasVendorAddressBlockers
                    ? 'A vendor in this cart has not set their pickup address yet — please contact AutoLab support.'
                    : isCheckingVendorAddresses
                      ? 'Checking vendor pickup addresses...'
                      : undefined
                }
              >
                {isPlacingOrder
                  ? 'Placing Order...'
                  : hasVendorAddressBlockers
                    ? 'Vendor pickup address missing'
                    : isCheckingVendorAddresses
                      ? 'Checking vendor addresses...'
                      : `Place Order - ${formatPrice(getTotal())}`}
              </Button>

              <div className="text-center mt-2 md:mt-3">
                <p className="text-xs text-muted-foreground">
                  Secure payment processing — SSL encrypted &amp; PCI compliant
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
