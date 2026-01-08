# Payment Gateway Integration Guide

## Overview

Your order system is now **fully automated** with no manual admin approval needed. Once a payment gateway returns `SUCCESS`, the order automatically moves to `PROCESSING` status and appears in the warehouse queue.

This guide explains how to integrate a real payment gateway (Stripe, PayPal, Molpay, etc.) with your automated order system.

---

## Current Implementation (Manual/Offline Payment)

### Location: `src/components/CheckoutModal.tsx`

Currently, the system creates orders with `payment_state = 'UNPAID'` and requires manual payment verification. This is how it works now:

```typescript
// Current implementation (line ~376)
const { data: order, error: orderError } = await supabase
  .from('orders')
  .insert({
    user_id: user?.id,
    order_no: orderNumber,
    customer_name: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim(),
    customer_email: user?.email,
    // ... other fields
    payment_method: selectedPayment,
    payment_state: 'UNPAID', // ⚠️ Requires manual verification
    status: 'PLACED',         // ⚠️ Stuck until admin approves
    // ... other fields
  })
  .select()
  .single();
```

**Problem:** Orders sit at `status=PLACED` until admin manually verifies payment. Not scalable.

---

## Automated Implementation (Payment Gateway)

### Step 1: Create Order with PENDING State

When user clicks "Place Order", create the order record first:

```typescript
// src/components/CheckoutModal.tsx - handleCheckout function

const handleCheckout = async () => {
  try {
    setIsProcessing(true);

    // 1. Create order in PENDING state
    const orderNumber = `ORD-${Date.now()}`;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user?.id,
        order_no: orderNumber,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        delivery_method: selectedDelivery,
        delivery_address: deliveryAddress,
        payment_method: selectedPayment,
        payment_state: 'PENDING', // ✅ Payment not yet processed
        status: 'PROCESSING',     // ✅ Will stay PROCESSING if payment succeeds
        total: total,
        subtotal: subtotal,
        tax: tax,
        shipping_fee: deliveryFee,
        // ... other fields
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Process payment via gateway
    const paymentResult = await processPaymentGateway({
      orderId: order.id,
      orderNo: order.order_no,
      amount: total,
      currency: 'MYR',
      customerEmail: customerInfo.email,
      customerName: customerInfo.name,
      paymentMethod: selectedPayment,
      returnUrl: `${window.location.origin}/order-confirmation/${order.id}`,
      callbackUrl: `${window.location.origin}/api/payment-callback`
    });

    // 3. Handle payment result
    if (paymentResult.status === 'SUCCESS') {
      // ✅ Payment successful - update order
      await updateOrderAfterPayment(order.id, paymentResult, 'SUCCESS');

      // Show success message
      toast({
        title: "Order Placed Successfully!",
        description: `Order #${order.order_no} is being processed.`,
      });

      // Redirect to confirmation page
      navigate(`/order-confirmation/${order.id}`);

    } else if (paymentResult.status === 'PENDING') {
      // Payment gateway redirected user (e.g., to bank page)
      // Will handle via callback when payment completes
      window.location.href = paymentResult.redirectUrl;

    } else {
      // ❌ Payment failed
      await updateOrderAfterPayment(order.id, paymentResult, 'FAILED');

      toast({
        title: "Payment Failed",
        description: paymentResult.error || "Please try again or use a different payment method.",
        variant: "destructive"
      });
    }

  } catch (error) {
    console.error('Checkout error:', error);
    toast({
      title: "Error",
      description: "An error occurred. Please try again.",
      variant: "destructive"
    });
  } finally {
    setIsProcessing(false);
  }
};
```

### Step 2: Process Payment Helper Function

```typescript
// src/lib/payment-gateway.ts (create this file)

export interface PaymentRequest {
  orderId: string;
  orderNo: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  paymentMethod: string;
  returnUrl: string;
  callbackUrl: string;
}

export interface PaymentResponse {
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  transactionId?: string;
  redirectUrl?: string;
  error?: string;
  gatewayResponse?: any;
}

export const processPaymentGateway = async (
  request: PaymentRequest
): Promise<PaymentResponse> => {
  try {
    // Example: Stripe integration
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: request.amount * 100, // Convert to cents
        currency: request.currency.toLowerCase(),
        orderId: request.orderId,
        orderNo: request.orderNo,
        customerEmail: request.customerEmail,
        returnUrl: request.returnUrl,
      })
    });

    const data = await response.json();

    if (data.success) {
      return {
        status: 'PENDING',
        redirectUrl: data.checkoutUrl,
        transactionId: data.paymentIntentId
      };
    } else {
      return {
        status: 'FAILED',
        error: data.error || 'Payment initialization failed'
      };
    }

  } catch (error) {
    console.error('Payment gateway error:', error);
    return {
      status: 'FAILED',
      error: 'Unable to connect to payment gateway'
    };
  }
};
```

### Step 3: Update Order After Payment

```typescript
// src/lib/payment-gateway.ts

export const updateOrderAfterPayment = async (
  orderId: string,
  paymentResult: PaymentResponse,
  finalStatus: 'SUCCESS' | 'FAILED'
) => {
  const updateData: any = {
    payment_state: finalStatus,
    payment_gateway_response: paymentResult.gatewayResponse,
    updated_at: new Date().toISOString()
  };

  // If payment succeeded, the database trigger will automatically:
  // - Set status = 'PROCESSING'
  // - Set processing_started_at = NOW()
  // Order will appear in warehouse queue immediately!

  if (finalStatus === 'FAILED') {
    // Set order status to PAYMENT_FAILED for clarity
    updateData.status = 'PAYMENT_FAILED';
  }

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId);

  if (error) {
    console.error('Failed to update order after payment:', error);
    throw error;
  }
};
```

### Step 4: Payment Callback Handler

When payment gateway redirects back or sends webhook:

```typescript
// Create: src/pages/PaymentCallback.tsx

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      const orderId = searchParams.get('orderId');
      const transactionId = searchParams.get('transactionId');
      const status = searchParams.get('status'); // From payment gateway

      if (!orderId || !transactionId) {
        throw new Error('Missing payment parameters');
      }

      // Verify payment with gateway
      const response = await fetch(`/api/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, transactionId })
      });

      const data = await response.json();

      if (data.verified && data.status === 'SUCCESS') {
        // ✅ Payment verified - update order
        await updateOrderAfterPayment(orderId, data, 'SUCCESS');

        toast({
          title: "Payment Successful!",
          description: "Your order is being processed.",
        });

        navigate(`/order-confirmation/${orderId}`);

      } else {
        // ❌ Payment failed or not verified
        await updateOrderAfterPayment(orderId, data, 'FAILED');

        toast({
          title: "Payment Failed",
          description: "Please try again or contact support.",
          variant: "destructive"
        });

        navigate(`/my-orders?highlight=${orderId}`);
      }

    } catch (error) {
      console.error('Payment verification error:', error);
      toast({
        title: "Error",
        description: "Unable to verify payment. Please contact support.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <LoaderIcon className="h-12 w-12 animate-spin mx-auto mb-4" />
        <p>Verifying your payment...</p>
      </div>
    </div>
  );
}
```

---

## Database Trigger (Already Implemented)

The database trigger automatically handles order status updates:

```sql
-- This was created in the migration SQL

CREATE OR REPLACE FUNCTION auto_approve_on_payment_success()
RETURNS TRIGGER AS $$
BEGIN
  -- When payment_state changes to SUCCESS, auto-set status to PROCESSING
  IF NEW.payment_state = 'SUCCESS' AND (OLD.payment_state IS NULL OR OLD.payment_state != 'SUCCESS') THEN
    NEW.status := 'PROCESSING';
    NEW.processing_started_at := NOW();
  END IF;

  -- When payment_state changes to FAILED, set status to PAYMENT_FAILED
  IF NEW.payment_state = 'FAILED' AND (OLD.payment_state IS NULL OR OLD.payment_state != 'FAILED') THEN
    NEW.status := 'PAYMENT_FAILED';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**What this means:**
- Update `payment_state = 'SUCCESS'` → Order automatically becomes `status = 'PROCESSING'`
- Order appears in warehouse queue immediately
- No admin approval needed!

---

## Complete Flow Diagram

```
User Checkout
     │
     ├─→ Create Order (payment_state=PENDING, status=PROCESSING)
     │
     ├─→ Call Payment Gateway API
     │
     ├─→ User Pays at Gateway
     │
     ├─→ Gateway Callback/Redirect
     │
     ├─→ Verify Payment
     │
     ├─→ If SUCCESS:
     │   ├─→ Update payment_state='SUCCESS'
     │   ├─→ Trigger auto-sets status='PROCESSING'
     │   ├─→ Order appears in Warehouse Queue
     │   └─→ Customer sees "Order Placed"
     │
     └─→ If FAILED:
         ├─→ Update payment_state='FAILED', status='PAYMENT_FAILED'
         ├─→ Customer sees "Payment Failed - Retry"
         └─→ Admin sees in Failed Payments dashboard
```

---

## Popular Payment Gateways for Malaysia

### 1. iPay88
- Website: https://www.ipay88.com.my/
- Supports: FPX, Credit/Debit Cards, E-wallets
- Best for: Malaysian market

### 2. Molpay (Razer Merchant Services)
- Website: https://merchant.razer.com/
- Supports: FPX, Cards, Touch 'n Go, Boost, GrabPay
- Best for: Southeast Asia

### 3. Stripe
- Website: https://stripe.com/
- Supports: International cards, FPX (via payment methods)
- Best for: Global + Malaysia

### 4. PayPal
- Website: https://www.paypal.com/my/business
- Supports: PayPal balance, Cards
- Best for: International customers

---

## Example: Stripe Integration

### Install Stripe SDK

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### Create Stripe Payment Intent

```typescript
// src/lib/stripe-payment.ts

import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export const createStripePayment = async (orderData: any) => {
  try {
    const response = await fetch('/api/create-stripe-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: orderData.total * 100, // Convert MYR to cents
        currency: 'myr',
        orderId: orderData.id,
        orderNo: orderData.order_no,
        customerEmail: orderData.customer_email
      })
    });

    const { clientSecret } = await response.json();

    const stripe = await stripePromise;
    const { error, paymentIntent } = await stripe!.confirmCardPayment(clientSecret);

    if (error) {
      return {
        status: 'FAILED',
        error: error.message
      };
    }

    return {
      status: paymentIntent.status === 'succeeded' ? 'SUCCESS' : 'PENDING',
      transactionId: paymentIntent.id,
      gatewayResponse: paymentIntent
    };

  } catch (error) {
    return {
      status: 'FAILED',
      error: 'Payment processing failed'
    };
  }
};
```

### Backend API (Supabase Edge Function)

```typescript
// supabase/functions/create-stripe-payment/index.ts

import Stripe from 'https://esm.sh/stripe@13.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16'
});

Deno.serve(async (req) => {
  try {
    const { amount, currency, orderId, orderNo, customerEmail } = await req.json();

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: {
        orderId,
        orderNo
      },
      receipt_email: customerEmail,
      automatic_payment_methods: {
        enabled: true
      }
    });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    );
  }
});
```

---

## Testing

### 1. Test with Successful Payment

- Create test payment gateway account
- Use test credit cards provided by gateway
- Verify order moves to PROCESSING automatically

### 2. Test with Failed Payment

- Use invalid card numbers
- Verify order shows PAYMENT_FAILED
- Verify admin sees in Failed Payments dashboard

### 3. Test Concurrent Orders

- Create multiple orders simultaneously
- Verify all get processed automatically
- No manual approval bottleneck

---

## Summary

**Before (Manual):**
```
User Pays → Order PLACED → Admin Manually Approves → PROCESSING
```

**After (Automated):**
```
User Pays → Gateway SUCCESS → Auto PROCESSING → Warehouse
```

**Key Points:**
1. No manual admin approval needed
2. Orders auto-approve when payment succeeds
3. 24/7 automated operation
4. Scalable for unlimited orders
5. Failed payments tracked separately

**Files to Update:**
1. `src/components/CheckoutModal.tsx` - Add payment gateway call
2. `src/lib/payment-gateway.ts` - Create payment processing logic
3. `src/pages/PaymentCallback.tsx` - Handle gateway callbacks
4. Create backend API endpoint for payment verification

**Database:**
- Migration already done ✅
- Auto-approval trigger already created ✅
- No additional database changes needed ✅

---

Ready to integrate your payment gateway! 🚀
