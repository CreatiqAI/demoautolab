# Third-Party Integrations Guide

**Complete guide for integrating external services into your Auto Labs e-commerce platform**

---

## Table of Contents

1. [Overview](#overview)
2. [Current Architecture](#current-architecture)
3. [Integration Services](#integration-services)
   - [Lalamove (Courier)](#1-lalamove-courier-service)
   - [J&T Express (Courier)](#2-jt-express-courier-service)
   - [Revenue Monster (Payment Gateway)](#3-revenue-monster-payment-gateway)
   - [AutoCount (Accounting Software)](#4-autocount-accounting-software)
4. [Architecture Decision](#architecture-decision)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Cost Analysis](#cost-analysis)
7. [Security Considerations](#security-considerations)
8. [Testing Strategy](#testing-strategy)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This document provides a comprehensive guide for integrating four critical third-party services into your platform:

| Service | Purpose | Priority | Difficulty |
|---------|---------|----------|------------|
| **Revenue Monster** | Payment Gateway | 🔴 High | ⭐⭐☆☆☆ Easy |
| **Lalamove** | Same-day Courier | 🟡 Medium | ⭐⭐☆☆☆ Easy |
| **J&T Express** | Nationwide Courier | 🟡 Medium | ⭐⭐⭐☆☆ Medium |
| **AutoCount** | Accounting Software | 🟢 Low | ⭐⭐⭐⭐☆ Hard |

---

## Current Architecture

Your platform uses a **serverless architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                  │
│                                                             │
│  - Customer-facing website                                  │
│  - Admin dashboard                                          │
│  - Warehouse operations                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  SUPABASE (Backend as a Service)            │
│                                                             │
│  - PostgreSQL Database                                      │
│  - Authentication & Authorization                           │
│  - File Storage                                             │
│  - Real-time Subscriptions                                 │
│  - Edge Functions (Deno runtime)                           │
└─────────────────────────────────────────────────────────────┘
```

### Why This Matters for Integrations

✅ **No traditional backend server** - All business logic runs in:
- Frontend (React)
- Edge Functions (serverless)
- Database triggers (PostgreSQL)

✅ **Perfect for API integrations** - Edge Functions can securely call third-party APIs

⚠️ **Limitation** - Cannot directly connect to on-premise systems (like AutoCount Desktop)

---

## Integration Services

### 1. Lalamove (Courier Service)

#### Overview

**Lalamove** is a same-day delivery platform popular in Southeast Asia. Perfect for urgent/local deliveries.

**Key Features:**
- Same-day delivery (2-4 hours)
- Multiple vehicle types (motorcycle, car, van, truck)
- Real-time tracking
- Competitive pricing for short distances
- Good API documentation

#### Current Status

✅ **80% Complete!**
- Mock implementation already built (`src/lib/courier-service.ts`)
- UI integration complete in Warehouse Operations
- Just need to replace mock API with real calls

#### API Documentation

- **Main Docs:** https://developers.lalamove.com/
- **API Reference:** https://developers.lalamove.com/docs/
- **Sandbox:** https://sandbox.lalamove.com/

#### Technical Requirements

```yaml
API Type: REST
Authentication: OAuth 2.0 Bearer Token
Base URL (Production): https://rest.lalamove.com/v3
Base URL (Sandbox): https://sandbox-rest.lalamove.com/v3
Request Format: JSON
Response Format: JSON
Rate Limits: 100 requests/minute
```

#### Integration Steps

##### Step 1: Account Setup (1-2 days)

1. Visit https://www.lalamove.com/en_MY/business
2. Click "Sign Up" for Business Account
3. Fill in business details:
   - Company Name: AUTO LABS SDN BHD
   - Business Registration Number
   - Contact Details
4. Verify email and phone
5. Complete KYC verification (upload documents)
6. Wait for approval (usually 1-2 business days)

##### Step 2: Get API Credentials (Same day after approval)

1. Log in to Lalamove Business Dashboard
2. Go to **Settings** → **Developer**
3. Generate API credentials:
   - **API Key** - Public identifier
   - **API Secret** - Private key for signing requests
4. Save credentials securely

##### Step 3: Test in Sandbox (1-2 hours)

```bash
# Test API connection
curl -X POST https://sandbox-rest.lalamove.com/v3/orders \
  -H "Authorization: Bearer YOUR_SANDBOX_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Market: MY" \
  -d '{
    "serviceType": "MOTORCYCLE",
    "stops": [
      {
        "location": {
          "address": "17, Jalan 7/95B, Cheras Utama, 56100 KL"
        },
        "contact": {
          "name": "AUTO LABS",
          "phone": "+60342977668"
        }
      },
      {
        "location": {
          "address": "Customer address here"
        },
        "contact": {
          "name": "Customer Name",
          "phone": "+60123456789"
        }
      }
    ],
    "deliveryType": "NOW"
  }'
```

##### Step 4: Create Edge Function

Create file: `supabase/functions/lalamove-create-delivery/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// HMAC signature helper
async function generateSignature(
  method: string,
  path: string,
  timestamp: string,
  body: string,
  secret: string
): Promise<string> {
  const rawSignature = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(rawSignature)
  )

  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    // Get request data
    const { orderId, pickupAddress, deliveryAddress, customerName, customerPhone, serviceType } = await req.json()

    // Lalamove API credentials from environment
    const apiKey = Deno.env.get('LALAMOVE_API_KEY')!
    const apiSecret = Deno.env.get('LALAMOVE_API_SECRET')!
    const baseUrl = Deno.env.get('LALAMOVE_API_URL') || 'https://rest.lalamove.com'

    // Prepare request
    const path = '/v3/orders'
    const method = 'POST'
    const timestamp = Date.now().toString()

    const requestBody = {
      serviceType: serviceType || 'MOTORCYCLE',
      stops: [
        {
          location: { address: pickupAddress },
          contact: {
            name: 'AUTO LABS SDN BHD',
            phone: '+60342977668'
          }
        },
        {
          location: { address: deliveryAddress },
          contact: {
            name: customerName,
            phone: customerPhone
          }
        }
      ],
      deliveryType: 'NOW',
      metadata: {
        orderReference: orderId
      }
    }

    const bodyString = JSON.stringify(requestBody)

    // Generate signature
    const signature = await generateSignature(method, path, timestamp, bodyString, apiSecret)

    // Call Lalamove API
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `hmac ${apiKey}:${timestamp}:${signature}`,
        'Market': 'MY'
      },
      body: bodyString
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Lalamove API error')
    }

    // Save to database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await supabase
      .from('orders')
      .update({
        courier_provider: 'LALAMOVE',
        courier_tracking_number: data.orderId,
        courier_shipment_id: data.orderId,
        courier_cost: data.priceBreakdown?.total || 0,
        courier_created_at: new Date().toISOString(),
        status: 'OUT_FOR_DELIVERY',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    return new Response(
      JSON.stringify({
        success: true,
        trackingNumber: data.orderId,
        estimatedPickupTime: data.estimatedPickupTime,
        estimatedDeliveryTime: data.estimatedDeliveryTime,
        driverInfo: data.driver,
        shareLink: data.shareLink
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  } catch (error) {
    console.error('Lalamove Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
```

##### Step 5: Deploy Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Set environment variables
supabase secrets set LALAMOVE_API_KEY=your_api_key
supabase secrets set LALAMOVE_API_SECRET=your_api_secret
supabase secrets set LALAMOVE_API_URL=https://rest.lalamove.com

# Deploy function
supabase functions deploy lalamove-create-delivery
```

##### Step 6: Update Frontend

Update `src/lib/courier-service.ts`:

```typescript
export class LalamoveService {
  async createShipment(request: ShipmentRequest): Promise<ShipmentResponse> {
    try {
      // Call Edge Function instead of mock
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lalamove-create-delivery`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            orderId: request.orderId,
            pickupAddress: request.pickupAddress?.address,
            deliveryAddress: request.deliveryAddress.address,
            customerName: request.customerName,
            customerPhone: request.customerPhone,
            serviceType: 'MOTORCYCLE'
          })
        }
      )

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error)
      }

      return {
        success: true,
        trackingNumber: data.trackingNumber,
        courierProvider: 'LALAMOVE',
        estimatedDeliveryDate: data.estimatedDeliveryTime,
        cost: data.cost
      }
    } catch (error: any) {
      return {
        success: false,
        courierProvider: 'LALAMOVE',
        errorMessage: error.message
      }
    }
  }
}
```

#### Pricing Structure

| Service Type | Base Fee | Per KM | Estimated Cost (0-10km) |
|-------------|----------|--------|------------------------|
| Motorcycle | RM 8 | RM 0.80/km | RM 8-16 |
| Car | RM 15 | RM 1.50/km | RM 15-30 |
| Van | RM 25 | RM 2.00/km | RM 25-45 |

**Additional Charges:**
- Peak hours (7-9 AM, 5-8 PM): +20%
- Waiting time: RM 0.30/minute after 5 minutes
- Toll fees: Actual cost
- Parking: Actual cost

#### Testing Checklist

- [ ] Create test delivery in sandbox
- [ ] Verify tracking number generated
- [ ] Check driver assignment
- [ ] Test real-time tracking
- [ ] Verify delivery completion webhook
- [ ] Test cancellation flow
- [ ] Verify pricing calculation

---

### 2. J&T Express (Courier Service)

#### Overview

**J&T Express** is Malaysia's largest parcel delivery service. Best for nationwide deliveries.

**Key Features:**
- Nationwide coverage (all states)
- Affordable pricing (RM 6-12 per parcel)
- 2-5 days delivery
- Pick-up service available
- Bulk shipping discounts
- Cash on Delivery (COD) support

#### Current Status

✅ **80% Complete!**
- Mock implementation already built
- UI ready
- Need real API integration

#### API Documentation

- **Official Site:** https://www.jtexpress.my/
- **API Docs:** https://www.jtexpress.my/api-integration (Contact sales for access)
- **Developer Portal:** Contact J&T sales team

#### Technical Requirements

```yaml
API Type: REST with HMAC authentication
Authentication: API Key + HMAC SHA256 signature
Base URL: https://api.jtexpress.my/webopenplatformapi/api
Request Format: JSON
Response Format: JSON
Special: Requires digital signature for all requests
```

#### Integration Steps

##### Step 1: Account Setup (1-2 weeks)

⚠️ **Note:** J&T Express requires business verification and approval

1. Visit https://www.jtexpress.my/contact
2. Fill in "Corporate Enquiry" form:
   - Company: AUTO LABS SDN BHD
   - Purpose: API Integration for E-commerce
   - Expected Monthly Volume: (estimate)
3. Wait for sales team to contact you
4. Provide business documents:
   - SSM Registration (Form 9/24/49)
   - Business Bank Account
   - Company Stamp
   - Director IC
5. Sign merchant agreement
6. Wait for approval (5-10 business days)

##### Step 2: Get API Credentials

After approval, J&T will provide:
- **API Account** - Your account identifier
- **API Key** - Secret key for signing
- **Customer Code** - Your J&T customer ID
- **Sandbox URL** - For testing
- **Production URL** - For live transactions

##### Step 3: Understand HMAC Signing

J&T requires HMAC-MD5 signature for security:

```typescript
// Signature generation
function generateJTSignature(data: string, privateKey: string): string {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(privateKey)
  const msgData = encoder.encode(data)

  // Create HMAC-MD5 hash
  const hash = crypto.subtle.digest('MD5',
    crypto.subtle.sign('HMAC', keyData, msgData)
  )

  // Convert to hex string and make uppercase
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

// Example usage
const requestData = JSON.stringify(orderData)
const timestamp = Date.now().toString()
const signature = generateJTSignature(
  requestData + timestamp + apiKey,
  apiKey
)
```

##### Step 4: Create Edge Function

Create file: `supabase/functions/jnt-create-shipment/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

// Generate HMAC-MD5 signature
async function generateSignature(data: string, privateKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(privateKey)
  const msgData = encoder.encode(data)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'MD5' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, msgData)

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    const {
      orderId,
      orderNo,
      customerName,
      customerPhone,
      deliveryAddress,
      items
    } = await req.json()

    // J&T API credentials
    const apiAccount = Deno.env.get('JNT_API_ACCOUNT')!
    const apiKey = Deno.env.get('JNT_API_KEY')!
    const customerCode = Deno.env.get('JNT_CUSTOMER_CODE')!
    const baseUrl = Deno.env.get('JNT_API_URL') || 'https://api.jtexpress.my/webopenplatformapi/api'

    // Prepare order data
    const orderData = {
      txLogisticID: orderNo, // Your order number
      customerCode: customerCode,
      sendStartTime: new Date().toISOString(),
      goodsType: '0', // Normal goods
      deliveryType: '0', // Standard delivery
      payType: '1', // Sender pays
      sender: {
        name: 'AUTO LABS SDN BHD',
        mobile: '0342977668',
        phone: '0342977668',
        prov: 'Kuala Lumpur',
        city: 'Kuala Lumpur',
        area: 'Cheras',
        address: '17, Jalan 7/95B, Cheras Utama',
        postCode: '56100'
      },
      receiver: {
        name: customerName,
        mobile: customerPhone.replace(/\D/g, ''), // Remove non-digits
        phone: customerPhone.replace(/\D/g, ''),
        prov: deliveryAddress.state || 'Kuala Lumpur',
        city: deliveryAddress.city || 'Kuala Lumpur',
        area: deliveryAddress.city || 'Cheras',
        address: deliveryAddress.address,
        postCode: deliveryAddress.postcode || '56100'
      },
      items: items.map((item: any, index: number) => ({
        itemName: item.name,
        number: item.quantity,
        itemValue: item.value || 0,
        desc: item.sku
      })),
      weight: items.reduce((sum: number, item: any) => sum + (item.quantity * 0.5), 0), // Estimate 0.5kg per item
      totalQuantity: items.reduce((sum: number, item: any) => sum + item.quantity, 0)
    }

    const dataStr = JSON.stringify(orderData)
    const timestamp = Date.now().toString()

    // Generate signature
    const signContent = `${dataStr}${timestamp}${apiKey}`
    const digest = await generateSignature(signContent, apiKey)

    // Call J&T API
    const response = await fetch(`${baseUrl}/order/addOrder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apiAccount': apiAccount,
        'timestamp': timestamp,
        'digest': digest
      },
      body: dataStr
    })

    const result = await response.json()

    if (result.code !== '1') {
      throw new Error(result.msg || 'J&T API error')
    }

    const jntData = result.data[0] // J&T returns array

    // Update order in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await supabase
      .from('orders')
      .update({
        courier_provider: 'JNT',
        courier_tracking_number: jntData.billCode, // J&T tracking number
        courier_shipment_id: jntData.txLogisticID,
        courier_cost: 8.50, // Get from J&T pricing API
        courier_label_url: jntData.pdfUrl, // Shipping label PDF
        courier_created_at: new Date().toISOString(),
        status: 'OUT_FOR_DELIVERY',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    return new Response(
      JSON.stringify({
        success: true,
        trackingNumber: jntData.billCode,
        shipmentId: jntData.txLogisticID,
        labelUrl: jntData.pdfUrl,
        estimatedDeliveryDays: 3
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  } catch (error) {
    console.error('J&T Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
```

##### Step 5: Tracking Function

Create file: `supabase/functions/jnt-track-shipment/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    const { trackingNumber } = await req.json()

    const apiAccount = Deno.env.get('JNT_API_ACCOUNT')!
    const apiKey = Deno.env.get('JNT_API_KEY')!
    const baseUrl = Deno.env.get('JNT_API_URL')!

    const dataStr = JSON.stringify({ billCodes: [trackingNumber] })
    const timestamp = Date.now().toString()
    const digest = await generateSignature(`${dataStr}${timestamp}${apiKey}`, apiKey)

    const response = await fetch(`${baseUrl}/order/getTrack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apiAccount': apiAccount,
        'timestamp': timestamp,
        'digest': digest
      },
      body: dataStr
    })

    const result = await response.json()

    if (result.code !== '1') {
      throw new Error('Tracking failed')
    }

    const tracking = result.data[0]

    return new Response(
      JSON.stringify({
        trackingNumber,
        status: tracking.status,
        currentLocation: tracking.city,
        history: tracking.details.map((d: any) => ({
          timestamp: d.scanTime,
          description: d.desc,
          location: d.scanNetworkCity
        }))
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

##### Step 6: Deploy

```bash
# Set secrets
supabase secrets set JNT_API_ACCOUNT=your_api_account
supabase secrets set JNT_API_KEY=your_api_key
supabase secrets set JNT_CUSTOMER_CODE=your_customer_code
supabase secrets set JNT_API_URL=https://api.jtexpress.my/webopenplatformapi/api

# Deploy functions
supabase functions deploy jnt-create-shipment
supabase functions deploy jnt-track-shipment
```

#### Pricing Structure

| Zone | Weight | Price |
|------|--------|-------|
| West Malaysia (same state) | First 1kg | RM 6.00 |
| West Malaysia (different state) | First 1kg | RM 8.00 |
| East Malaysia | First 1kg | RM 12.00 |
| Additional weight | Per kg | +RM 1.50 |

**Bulk Discounts:**
- 100-500 parcels/month: 5% discount
- 500-1000 parcels/month: 10% discount
- 1000+ parcels/month: Negotiate with sales

#### Testing Checklist

- [ ] Generate test shipment in sandbox
- [ ] Verify tracking number received
- [ ] Download shipping label PDF
- [ ] Test tracking API
- [ ] Verify status updates
- [ ] Test cancellation
- [ ] Verify pricing calculation

---

### 3. Revenue Monster (Payment Gateway)

#### Overview

**Revenue Monster** is Malaysia's leading payment gateway supporting all major payment methods.

**Supported Payment Methods:**
- Online Banking (FPX) - All Malaysian banks
- Credit/Debit Cards (Visa, Mastercard)
- E-wallets (GrabPay, Touch 'n Go, Boost, ShopeePay)
- QR Payment (DuitNow)

**Key Features:**
- Instant payment confirmation
- Real-time webhook notifications
- Comprehensive dashboard
- Settlement within 3-5 business days
- No setup fee, no monthly fee
- Competitive transaction fees (2.5-3%)

#### Current Status

⚠️ **Not Started** - Need full implementation

#### API Documentation

- **Developer Portal:** https://doc.revenuemonster.my/
- **Dashboard:** https://merchant.revenuemonster.my/
- **Sandbox:** https://sb-merchant.revenuemonster.my/

#### Technical Requirements

```yaml
API Type: RESTful
Authentication: OAuth 2.0 + Request Signing
Base URL (Production): https://open.revenuemonster.my
Base URL (Sandbox): https://sb-open.revenuemonster.my
Request Format: JSON
Response Format: JSON
Signature: SHA256 HMAC
```

#### Integration Steps

##### Step 1: Account Setup (2-5 days)

1. Visit https://merchant.revenuemonster.my/signup
2. Register business account:
   - Business Name: AUTO LABS SDN BHD
   - Business Registration Number (SSM)
   - Contact Details
   - Bank Account (for settlement)
3. Verify email
4. Complete KYC:
   - Upload SSM Form 9/24/49
   - Upload bank statement
   - Upload director IC
   - Business proof (shop photo, website)
5. Wait for verification (2-5 business days)
6. Once approved, receive welcome email

##### Step 2: Get API Credentials

1. Log in to Revenue Monster Merchant Portal
2. Go to **Developer** → **Applications**
3. Create new application:
   - App Name: "Auto Labs E-commerce"
   - Redirect URL: `https://yoursite.com/payment/callback`
   - Webhook URL: `https://yourproject.supabase.co/functions/v1/revenuemonster-webhook`
4. Save and get credentials:
   - **Client ID**
   - **Client Secret**
   - **Store ID**
   - **Signing Key**

##### Step 3: Understand Request Signing

Revenue Monster requires request signing for security:

```typescript
// Signature generation
function generateRMSignature(
  method: string,
  url: string,
  timestamp: string,
  nonceStr: string,
  requestBody: string,
  signingKey: string
): string {
  // Construct signature string
  const signatureString = [
    `data=${requestBody}`,
    `method=${method}`,
    `nonceStr=${nonceStr}`,
    `requestUrl=${url}`,
    `signType=sha256`,
    `timestamp=${timestamp}`
  ].join('&')

  // Create HMAC SHA256
  const encoder = new TextEncoder()
  const key = encoder.encode(signingKey)
  const message = encoder.encode(signatureString)

  const signature = crypto.subtle.sign('HMAC', key, message)

  // Encode to base64
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}
```

##### Step 4: Create Payment Flow

**User Journey:**
```
Customer adds items to cart
    ↓
Customer clicks "Checkout"
    ↓
Frontend calls Edge Function to create payment
    ↓
Edge Function calls Revenue Monster API
    ↓
Revenue Monster returns payment URL
    ↓
Redirect customer to payment page
    ↓
Customer selects payment method & pays
    ↓
Revenue Monster processes payment
    ↓
Calls webhook with payment result
    ↓
Update order status in database
    ↓
Redirect customer to success page
```

##### Step 5: Create Payment Edge Function

Create file: `supabase/functions/revenuemonster-create-payment/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Generate access token
async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const baseUrl = Deno.env.get('RM_API_URL')!

  const response = await fetch(`${baseUrl}/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grantType: 'client_credentials',
      clientId,
      clientSecret
    })
  })

  const data = await response.json()
  return data.accessToken
}

// Generate signature
async function generateSignature(
  data: string,
  method: string,
  url: string,
  timestamp: string,
  nonce: string,
  signKey: string
): Promise<string> {
  const signString = [
    `data=${data}`,
    `method=${method}`,
    `nonceStr=${nonce}`,
    `requestUrl=${url}`,
    `signType=sha256`,
    `timestamp=${timestamp}`
  ].join('&')

  const encoder = new TextEncoder()
  const keyData = encoder.encode(signKey)
  const msgData = encoder.encode(signString)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, msgData)

  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    const { orderId, orderNo, amount, customerEmail } = await req.json()

    // Revenue Monster credentials
    const clientId = Deno.env.get('RM_CLIENT_ID')!
    const clientSecret = Deno.env.get('RM_CLIENT_SECRET')!
    const storeId = Deno.env.get('RM_STORE_ID')!
    const signKey = Deno.env.get('RM_SIGNING_KEY')!
    const baseUrl = Deno.env.get('RM_API_URL') || 'https://open.revenuemonster.my'

    // Get access token
    const accessToken = await getAccessToken(clientId, clientSecret)

    // Prepare payment request
    const timestamp = Date.now().toString()
    const nonceStr = crypto.randomUUID()
    const method = 'POST'
    const url = `${baseUrl}/v3/payment/online`

    const paymentData = {
      order: {
        id: orderNo,
        title: `Order ${orderNo}`,
        currencyType: 'MYR',
        amount: Math.round(amount * 100), // Convert to cents
        detail: 'Auto parts purchase from Auto Labs',
        additionalData: orderNo
      },
      method: ['ONLINE_BANKING', 'EWALLET', 'CARD'],
      type: 'WEB_PAYMENT',
      storeId: storeId,
      redirectUrl: `${Deno.env.get('FRONTEND_URL')}/payment/success?orderId=${orderId}`,
      notifyUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/revenuemonster-webhook`,
      layoutVersion: 'v3'
    }

    const dataStr = JSON.stringify(paymentData)

    // Generate signature
    const signature = await generateSignature(
      dataStr,
      method,
      url,
      timestamp,
      nonceStr,
      signKey
    )

    // Call Revenue Monster API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Signature': signature,
        'X-Nonce-Str': nonceStr,
        'X-Timestamp': timestamp
      },
      body: dataStr
    })

    const result = await response.json()

    if (result.code !== 'SUCCESS') {
      throw new Error(result.error?.message || 'Payment creation failed')
    }

    // Save payment info to database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await supabase
      .from('orders')
      .update({
        payment_gateway_response: {
          checkoutId: result.item.checkoutId,
          url: result.item.url
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    return new Response(
      JSON.stringify({
        success: true,
        checkoutId: result.item.checkoutId,
        paymentUrl: result.item.url
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  } catch (error) {
    console.error('Revenue Monster Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
```

##### Step 6: Create Webhook Handler

Create file: `supabase/functions/revenuemonster-webhook/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Verify webhook signature
async function verifySignature(
  payload: any,
  signature: string,
  signKey: string
): Promise<boolean> {
  const dataStr = JSON.stringify(payload.data)

  const signString = [
    `data=${dataStr}`,
    `nonceStr=${payload.nonceStr}`,
    `signType=sha256`,
    `timestamp=${payload.timestamp}`
  ].join('&')

  const encoder = new TextEncoder()
  const keyData = encoder.encode(signKey)
  const msgData = encoder.encode(signString)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const computedSignature = await crypto.subtle.sign('HMAC', key, msgData)
  const computedSigStr = btoa(String.fromCharCode(...new Uint8Array(computedSignature)))

  return computedSigStr === signature
}

serve(async (req) => {
  try {
    const payload = await req.json()
    const signature = req.headers.get('X-Signature')

    // Verify signature
    const signKey = Deno.env.get('RM_SIGNING_KEY')!
    const isValid = await verifySignature(payload, signature!, signKey)

    if (!isValid) {
      console.error('Invalid webhook signature')
      return new Response('Invalid signature', { status: 401 })
    }

    // Extract payment data
    const { data } = payload
    const orderNo = data.order.id
    const status = data.status
    const transactionId = data.transactionId

    console.log(`Payment webhook received for order ${orderNo}: ${status}`)

    // Update order in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const updateData: any = {
      payment_gateway_response: data,
      updated_at: new Date().toISOString()
    }

    if (status === 'SUCCESS') {
      updateData.payment_state = 'PAID'
      updateData.payment_verified_at = new Date().toISOString()
      updateData.status = 'APPROVED' // Move to next workflow stage
    } else if (status === 'FAILED') {
      updateData.payment_state = 'FAILED'
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('order_no', orderNo)

    if (error) {
      console.error('Database update error:', error)
      throw error
    }

    console.log(`Order ${orderNo} updated successfully`)

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Error', { status: 500 })
  }
})
```

##### Step 7: Update Frontend Checkout

Update your checkout page to use Revenue Monster:

```typescript
// src/pages/Checkout.tsx

const handlePayment = async () => {
  try {
    setProcessing(true)

    // Call Edge Function to create payment
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/revenuemonster-create-payment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          orderId: order.id,
          orderNo: order.order_no,
          amount: order.total,
          customerEmail: order.customer_email
        })
      }
    )

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error)
    }

    // Redirect to payment page
    window.location.href = data.paymentUrl

  } catch (error) {
    console.error('Payment error:', error)
    toast({
      title: "Payment Failed",
      description: error.message,
      variant: "destructive"
    })
  } finally {
    setProcessing(false)
  }
}
```

##### Step 8: Deploy

```bash
# Set secrets
supabase secrets set RM_CLIENT_ID=your_client_id
supabase secrets set RM_CLIENT_SECRET=your_client_secret
supabase secrets set RM_STORE_ID=your_store_id
supabase secrets set RM_SIGNING_KEY=your_signing_key
supabase secrets set RM_API_URL=https://sb-open.revenuemonster.my
supabase secrets set FRONTEND_URL=https://yoursite.com

# Deploy functions
supabase functions deploy revenuemonster-create-payment
supabase functions deploy revenuemonster-webhook
```

##### Step 9: Test Payment Flow

1. Create test order
2. Click "Pay Now"
3. Redirected to Revenue Monster payment page
4. Select payment method (use test cards in sandbox)
5. Complete payment
6. Verify webhook received
7. Check order status updated to PAID
8. Verify redirection to success page

#### Pricing Structure

**Transaction Fees:**
| Payment Method | Fee | Settlement |
|---------------|-----|-----------|
| Online Banking (FPX) | 2.5% | T+3 |
| Credit/Debit Card | 3.0% | T+5 |
| E-wallet | 2.8% | T+3 |
| QR Payment | 2.5% | T+3 |

**No Hidden Fees:**
- No setup fee
- No monthly fee
- No chargeback fee (first 3 per month)
- Free technical support

**Example Calculation:**
- Order Total: RM 100
- FPX Fee (2.5%): RM 2.50
- You Receive: RM 97.50
- Settlement: 3 business days

#### Testing Checklist

- [ ] Create payment in sandbox
- [ ] Test FPX payment (use test bank)
- [ ] Test credit card payment (use test card: 4111111111111111)
- [ ] Test e-wallet payment
- [ ] Verify webhook received and processed
- [ ] Check order status updated
- [ ] Test payment failure scenario
- [ ] Verify refund process

**Test Cards (Sandbox):**
```
Success: 4111 1111 1111 1111 (CVV: 100, Expiry: Any future date)
Failed: 4000 0000 0000 0002 (CVV: 100, Expiry: Any future date)
```

---

### 4. AutoCount (Accounting Software)

#### Overview

**AutoCount** is Malaysia's popular accounting software. Used for:
- Invoicing & billing
- Inventory management
- Financial reporting
- GST/SST compliance
- Payroll (optional module)

**Integration Benefits:**
- Auto-sync orders to accounting
- Automated invoice generation
- Real-time inventory updates
- Financial reconciliation
- Tax compliance

#### Two Versions Available

| Feature | AutoCount Desktop/Server | AutoCount Cloud |
|---------|-------------------------|-----------------|
| **Deployment** | On-premise | Cloud-hosted |
| **Cost** | RM 1,500-3,000 (one-time) | RM 150-300/month |
| **API Access** | ✅ Yes (local network) | ✅ Yes (internet) |
| **Integration Complexity** | ⭐⭐⭐⭐☆ Hard | ⭐⭐⭐☆☆ Medium |
| **Requires Node.js Server** | ✅ Yes | ❌ No |
| **Best For** | Existing users | New users |

#### Current Status

⚠️ **Not Started** - Most complex integration

#### Option A: AutoCount Cloud (Recommended)

**Easier Integration** - Works with Edge Functions

##### Step 1: Subscribe to AutoCount Cloud

1. Visit https://www.autocountcloud.com/
2. Choose plan:
   - **Starter:** RM 150/month (1 user, basic features)
   - **Professional:** RM 250/month (3 users, full features)
   - **Enterprise:** RM 350/month (5 users, multi-currency)
3. Sign up and verify
4. Complete training (2-3 hours online)

##### Step 2: Enable API Access

1. Log in to AutoCount Cloud
2. Go to **Settings** → **API**
3. Enable API access
4. Generate API credentials:
   - **API Key**
   - **Company ID**
5. Set webhook URL (for inventory updates)

##### Step 3: Create Sync Edge Function

Create file: `supabase/functions/autocount-sync-order/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    const { orderId, orderData } = await req.json()

    const apiKey = Deno.env.get('AUTOCOUNT_API_KEY')!
    const companyId = Deno.env.get('AUTOCOUNT_COMPANY_ID')!
    const baseUrl = Deno.env.get('AUTOCOUNT_API_URL') || 'https://api.autocountcloud.com'

    // Create invoice in AutoCount
    const response = await fetch(`${baseUrl}/v1/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Company-ID': companyId
      },
      body: JSON.stringify({
        documentNo: orderData.order_no,
        documentDate: new Date().toISOString().split('T')[0],
        customerCode: orderData.customer_phone, // Or create customer first
        customerName: orderData.customer_name,
        attention: orderData.customer_name,
        address1: orderData.delivery_address?.address,
        phone: orderData.customer_phone,
        email: orderData.customer_email,
        items: orderData.items.map((item: any) => ({
          itemCode: item.sku,
          description: item.name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          taxType: 'SR', // Standard Rated (6% SST)
          amount: item.total_price
        })),
        subtotal: orderData.subtotal,
        taxAmount: orderData.tax,
        totalAmount: orderData.total,
        remark: `E-commerce order #${orderData.order_no}`
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'AutoCount sync failed')
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoiceNo: result.documentNo,
        autoCountId: result.id
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('AutoCount sync error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

##### Step 4: Sync Inventory

Create file: `supabase/functions/autocount-sync-inventory/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const apiKey = Deno.env.get('AUTOCOUNT_API_KEY')!
    const companyId = Deno.env.get('AUTOCOUNT_COMPANY_ID')!
    const baseUrl = Deno.env.get('AUTOCOUNT_API_URL')!

    // Get all items from AutoCount
    const response = await fetch(`${baseUrl}/v1/items`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Company-ID': companyId
      }
    })

    const { items } = await response.json()

    // Update inventory in Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    for (const item of items) {
      await supabase
        .from('components')
        .update({
          stock_quantity: item.quantity,
          updated_at: new Date().toISOString()
        })
        .eq('sku', item.itemCode)
    }

    return new Response(
      JSON.stringify({
        success: true,
        syncedItems: items.length
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

##### Step 5: Schedule Sync

Use Supabase Cron Jobs:

```sql
-- Run inventory sync every hour
SELECT cron.schedule(
  'autocount-inventory-sync',
  '0 * * * *', -- Every hour
  $$
  SELECT net.http_post(
    url:='https://yourproject.supabase.co/functions/v1/autocount-sync-inventory',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

#### Option B: AutoCount Desktop/Server (Complex)

**Requires Node.js Middleware Server**

##### Architecture

```
Your App (Frontend)
    ↓
Supabase Edge Function
    ↓
Node.js Middleware (at office)
    ↓
AutoCount Desktop (Windows PC)
```

##### Step 1: Set Up Node.js Server

On a Windows PC in your office (must be always-on):

```bash
# Create new Node.js project
mkdir autocount-middleware
cd autocount-middleware
npm init -y

# Install dependencies
npm install express axios dotenv autocount-connector
```

##### Step 2: Create Middleware Server

Create file: `server.js`

```javascript
const express = require('express')
const axios = require('axios')
const AutoCount = require('autocount-connector')

const app = express()
app.use(express.json())

// AutoCount connection
const ac = new AutoCount({
  server: 'localhost',
  database: 'AutoCount',
  username: process.env.AC_USERNAME,
  password: process.env.AC_PASSWORD
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() })
})

// Sync order to AutoCount
app.post('/api/sync-order', async (req, res) => {
  try {
    const { orderData } = req.body

    // Create invoice in AutoCount
    const invoice = await ac.createInvoice({
      DocNo: orderData.order_no,
      DocDate: new Date(),
      DebtorCode: orderData.customer_phone,
      Description: `Order ${orderData.order_no}`,
      Items: orderData.items.map(item => ({
        ItemCode: item.sku,
        Description: item.name,
        Qty: item.quantity,
        UnitPrice: item.unit_price,
        Amount: item.total_price
      })),
      FinalTotal: orderData.total
    })

    res.json({
      success: true,
      invoiceNo: invoice.DocNo
    })
  } catch (error) {
    console.error('AutoCount error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get inventory
app.get('/api/inventory', async (req, res) => {
  try {
    const items = await ac.getItems()
    res.json({ items })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`AutoCount middleware running on port ${PORT}`)
})
```

##### Step 3: Configure Router Port Forwarding

1. Log in to your office router
2. Forward port 3000 to the PC running middleware
3. Note your public IP address
4. Or use ngrok for testing:

```bash
# Install ngrok
npm install -g ngrok

# Create tunnel
ngrok http 3000

# Use the HTTPS URL provided
# https://abc123.ngrok.io -> your middleware
```

##### Step 4: Create Edge Function Proxy

Create file: `supabase/functions/autocount-proxy/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    const { action, data } = await req.json()

    // Your middleware URL
    const middlewareUrl = Deno.env.get('AUTOCOUNT_MIDDLEWARE_URL')!

    // Forward request to middleware
    const response = await fetch(`${middlewareUrl}/api/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    const result = await response.json()

    return new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

##### Step 5: Deploy

```bash
# Set middleware URL
supabase secrets set AUTOCOUNT_MIDDLEWARE_URL=https://your-public-ip:3000
# Or ngrok URL: https://abc123.ngrok.io

# Deploy proxy
supabase functions deploy autocount-proxy
```

#### Comparison: Cloud vs Desktop

**Choose Cloud if:**
✅ You don't have AutoCount yet
✅ You want easy integration
✅ Monthly cost is acceptable (RM 150-300)
✅ You need remote access
✅ You want automatic backups

**Choose Desktop if:**
✅ You already own AutoCount Desktop
✅ You have IT staff to maintain server
✅ You prefer one-time cost
✅ You need offline access
✅ You have complex customizations

#### Testing Checklist

**Cloud:**
- [ ] Create test invoice via API
- [ ] Verify invoice appears in AutoCount
- [ ] Test inventory sync
- [ ] Verify customer creation
- [ ] Test error handling

**Desktop:**
- [ ] Middleware server running
- [ ] Port forwarding works
- [ ] Test API connection
- [ ] Create test invoice
- [ ] Verify sync

---

## Architecture Decision

### Recommended Architecture: Hybrid Serverless

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│              SUPABASE (Database + Auth + Storage)            │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                   EDGE FUNCTIONS (Deno)                      │
│                                                              │
│  ✅ revenuemonster-create-payment                           │
│  ✅ revenuemonster-webhook                                  │
│  ✅ lalamove-create-delivery                               │
│  ✅ lalamove-track                                         │
│  ✅ jnt-create-shipment                                    │
│  ✅ jnt-track-shipment                                     │
│  ✅ autocount-sync (Cloud only)                            │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                    THIRD-PARTY APIS                          │
│                                                              │
│  💳 Revenue Monster API                                     │
│  🚚 Lalamove API                                           │
│  📦 J&T Express API                                        │
│  📊 AutoCount Cloud API                                    │
└──────────────────────────────────────────────────────────────┘

Optional for AutoCount Desktop only:
┌──────────────────────────────────────────────────────────────┐
│         NODE.JS MIDDLEWARE (Office Network)                  │
│                                                              │
│  🖥️  Windows PC running Node.js                             │
│  ↔️  Connected to AutoCount Desktop                         │
└──────────────────────────────────────────────────────────────┘
```

### Why This Architecture?

✅ **Simple to Maintain**
- No complex server infrastructure
- Supabase handles scaling
- Edge Functions auto-scale

✅ **Cost-Effective**
- No server hosting costs
- Pay only for usage
- Free tier for Edge Functions

✅ **Secure**
- API keys hidden in Edge Functions
- HTTPS everywhere
- Supabase handles auth

✅ **Fast Development**
- Quick to implement
- Easy to test
- Good documentation

⚠️ **One Exception: AutoCount Desktop**
- If using AutoCount Desktop (not Cloud)
- Need Node.js middleware at office
- Small additional complexity

---

## Implementation Roadmap

### Phase 1: Payment Gateway (Week 1) - HIGHEST PRIORITY

**Why First?**
- Revenue critical
- Enables order payments
- Relatively easy
- Foundation for everything else

**Tasks:**
- [ ] Day 1-2: Revenue Monster account setup & KYC
- [ ] Day 3: Create payment Edge Functions
- [ ] Day 4: Create webhook handler
- [ ] Day 5: Update checkout flow
- [ ] Day 6: Test in sandbox
- [ ] Day 7: Go live with production

**Success Criteria:**
✅ Customers can pay via FPX/Cards/E-wallets
✅ Webhook updates order status automatically
✅ Payment confirmation page works
✅ Can refund if needed

---

### Phase 2: Courier Services (Week 2-4)

#### Week 2: Lalamove

**Tasks:**
- [ ] Day 1-2: Lalamove business account signup
- [ ] Day 3: Get API credentials
- [ ] Day 4: Create Edge Functions
- [ ] Day 5: Update courier service layer
- [ ] Day 6-7: Test in sandbox and go live

**Success Criteria:**
✅ Can create same-day deliveries
✅ Track deliveries in real-time
✅ Download shipping labels
✅ Webhooks update delivery status

#### Week 3: J&T Express

**Tasks:**
- [ ] Day 1-5: J&T account approval (background process)
- [ ] Day 1-2: Implement HMAC signing
- [ ] Day 3: Create Edge Functions
- [ ] Day 4: Update UI to show both couriers
- [ ] Day 5: Test with sandbox
- [ ] Wait for production approval
- [ ] Go live once approved

**Success Criteria:**
✅ Can create nationwide shipments
✅ Generate shipping labels
✅ Track shipments
✅ Calculate shipping costs

---

### Phase 3: Accounting Integration (Week 5-6) - OPTIONAL

**Decision Point:** Choose Cloud or Desktop

#### Option A: AutoCount Cloud (Recommended)
- [ ] Week 5 Day 1-2: Subscribe and setup
- [ ] Week 5 Day 3: Get API credentials
- [ ] Week 5 Day 4-5: Create sync Edge Functions
- [ ] Week 6 Day 1: Test invoice creation
- [ ] Week 6 Day 2: Test inventory sync
- [ ] Week 6 Day 3-4: Schedule automated syncs
- [ ] Week 6 Day 5: Go live

#### Option B: AutoCount Desktop (Complex)
- [ ] Week 5: Set up Node.js middleware
- [ ] Week 5: Configure network/firewall
- [ ] Week 5: Test local connection
- [ ] Week 6: Create proxy Edge Function
- [ ] Week 6: Test end-to-end
- [ ] Week 6: Monitor and optimize

**Success Criteria:**
✅ Orders auto-sync to AutoCount
✅ Invoices generated automatically
✅ Inventory stays in sync
✅ Financial reports accurate

---

### Timeline Summary

```
Week 1: Revenue Monster Payment Gateway ⭐ CRITICAL
Week 2: Lalamove Same-day Delivery
Week 3: J&T Express Nationwide Delivery
Week 4: Testing & Bug Fixes
Week 5-6: AutoCount Integration (Optional)
```

**Minimum Viable Product (MVP):**
- ✅ Week 1: Payment Gateway ONLY
- This allows you to start taking orders immediately
- Add couriers & accounting later

**Recommended Launch:**
- ✅ Week 1-3: Payment + Both Couriers
- Full e-commerce operation
- Add accounting when you have time

---

## Cost Analysis

### Monthly Operating Costs

#### Scenario 1: Without AutoCount Cloud

| Service | Cost | Notes |
|---------|------|-------|
| **Supabase** | RM 0 - 100 | Free tier usually enough |
| **Revenue Monster** | 2.5-3% per transaction | Only on successful payments |
| **Lalamove** | RM 8-30 per delivery | Per delivery, on-demand |
| **J&T Express** | RM 6-12 per parcel | Per shipment |
| **Total Fixed** | **RM 0 - 100** | Very low! |
| **Variable** | Depends on sales volume | |

**Example: 100 orders/month**
- Sales: RM 50,000
- Payment fees (2.5%): RM 1,250
- Shipping (avg RM 10): RM 1,000
- **Total: RM 2,250** (~4.5% of sales)

#### Scenario 2: With AutoCount Cloud

| Service | Cost |
|---------|------|
| Base costs (above) | RM 0 - 100 |
| AutoCount Cloud | RM 150 - 300 |
| **Total Fixed** | **RM 150 - 400/month** |

#### Scenario 3: With AutoCount Desktop + Middleware

| Service | Cost |
|---------|------|
| Base costs | RM 0 - 100 |
| AutoCount Desktop | RM 0 (one-time RM 1,500-3,000) |
| Server/PC electricity | RM 50 - 100 |
| **Total Monthly** | **RM 50 - 200** |
| **Initial Investment** | **RM 1,500 - 3,000** |

### Cost Comparison

**Year 1 Total Cost:**

| Option | Setup | Monthly | Year 1 Total |
|--------|-------|---------|--------------|
| **No Accounting** | RM 0 | RM 100* | RM 1,200 |
| **AutoCount Cloud** | RM 0 | RM 300* | RM 3,600 |
| **AutoCount Desktop** | RM 2,000 | RM 100* | RM 3,200 |

*Base costs only, excluding transaction fees

**Recommendation:**
- Start without accounting integration
- Use manual CSV export from Supabase to AutoCount
- Add API integration when order volume justifies it (>200 orders/month)

---

## Security Considerations

### API Key Management

**✅ DO:**
- Store all API keys in Supabase Secrets
- Use Edge Functions to call APIs (never from frontend)
- Rotate keys quarterly
- Use different keys for sandbox vs production
- Monitor API key usage

**❌ DON'T:**
- Never commit API keys to git
- Never expose keys in frontend code
- Never log API keys in console
- Never share keys via email/chat

### Example: Setting Secrets

```bash
# Revenue Monster
supabase secrets set RM_CLIENT_ID=abc123
supabase secrets set RM_CLIENT_SECRET=xyz789
supabase secrets set RM_SIGNING_KEY=secret123

# Lalamove
supabase secrets set LALAMOVE_API_KEY=llm_abc123
supabase secrets set LALAMOVE_API_SECRET=llm_secret

# J&T Express
supabase secrets set JNT_API_ACCOUNT=jnt_account
supabase secrets set JNT_API_KEY=jnt_key123

# AutoCount (if using Cloud)
supabase secrets set AUTOCOUNT_API_KEY=ac_api_key
supabase secrets set AUTOCOUNT_COMPANY_ID=company123
```

### Webhook Security

**Always verify webhook signatures:**

```typescript
// Example: Verify Revenue Monster webhook
async function verifyWebhook(payload: any, signature: string): Promise<boolean> {
  const expectedSignature = await generateSignature(payload)
  return signature === expectedSignature
}

// In webhook handler
if (!await verifyWebhook(payload, signature)) {
  return new Response('Unauthorized', { status: 401 })
}
```

### Network Security

**For AutoCount Desktop Middleware:**
- Use HTTPS only (not HTTP)
- Set up firewall rules (whitelist Supabase IPs)
- Use VPN if possible
- Keep Windows updated
- Use strong passwords
- Enable Windows Firewall
- Consider Azure/AWS hosted middleware instead of office PC

---

## Testing Strategy

### Test Environments

| Service | Sandbox URL | Test Credentials |
|---------|-------------|------------------|
| Revenue Monster | sb-open.revenuemonster.my | Get from sandbox dashboard |
| Lalamove | sandbox-rest.lalamove.com | Get from developer portal |
| J&T Express | Contact J&T for sandbox | Provided by J&T |
| AutoCount Cloud | Trial account | Create free trial |

### Testing Checklist

#### Payment Gateway Testing

- [ ] **Happy Path**
  - Create payment
  - Pay with FPX
  - Verify webhook received
  - Check order status updated
  - Verify customer redirected

- [ ] **Failure Scenarios**
  - Payment declined
  - Timeout
  - Invalid amount
  - Duplicate order
  - Webhook failure

- [ ] **Edge Cases**
  - Very small amount (RM 0.01)
  - Very large amount (RM 100,000)
  - Special characters in customer name
  - Missing email
  - Concurrent payments

#### Courier Testing

- [ ] **Lalamove**
  - Create delivery
  - Track delivery
  - Cancel delivery
  - Invalid address
  - Peak hour pricing

- [ ] **J&T Express**
  - Create shipment
  - Generate label
  - Track shipment
  - Invalid postcode
  - Oversized parcel

#### AutoCount Testing

- [ ] **Sync**
  - Create invoice
  - Update inventory
  - Handle errors
  - Duplicate prevention
  - Retry failed syncs

### Load Testing

Test with realistic volumes:

```bash
# Use k6 or Artillery
npm install -g artillery

# Create test script: load-test.yml
artillery run --count 100 load-test.yml
```

**Test Scenarios:**
- 10 concurrent payments
- 50 simultaneous delivery creations
- 100 tracking requests
- API timeout handling
- Database connection pooling

---

## Troubleshooting

### Common Issues & Solutions

#### Revenue Monster

**Problem:** Payment creation fails
```
Error: "Invalid signature"
```
**Solution:**
- Check signature generation algorithm
- Verify timestamp format
- Ensure signing key is correct
- Check request body matches signature

**Problem:** Webhook not received
```
Order status not updating
```
**Solution:**
- Check webhook URL is public (not localhost)
- Verify webhook URL in Revenue Monster dashboard
- Check Supabase Edge Function logs
- Test webhook manually with curl

#### Lalamove

**Problem:** Delivery creation fails
```
Error: "Address not serviceable"
```
**Solution:**
- Verify address is in Lalamove coverage area
- Check address format (include postcode, city)
- Use geocoding to validate address
- Provide more detailed address

**Problem:** HMAC signature mismatch
```
Error: "Unauthorized"
```
**Solution:**
- Check signature generation matches docs exactly
- Verify API secret is correct
- Check timestamp is current (within 5 minutes)
- Ensure body string matches exactly

#### J&T Express

**Problem:** Shipment creation fails
```
Error: "Invalid digest"
```
**Solution:**
- HMAC-MD5 signature must be uppercase
- Check timestamp format
- Verify API key is correct
- Ensure request body is properly stringified

**Problem:** Tracking not working
```
Error: "Bill code not found"
```
**Solution:**
- Wait 2-5 minutes after creation
- Check billCode (tracking number) is correct
- Verify shipment was successfully created
- Contact J&T support if persists

#### AutoCount

**Problem:** Cannot connect to middleware
```
Error: "Connection refused"
```
**Solution:**
- Check middleware server is running
- Verify port forwarding is configured
- Check firewall allows connections
- Test with ngrok for temporary access

**Problem:** Invoice creation fails
```
Error: "Customer not found"
```
**Solution:**
- Create customer first before invoice
- Use existing customer code
- Check customer code format
- Verify AutoCount database connection

### Debugging Tips

#### Enable Detailed Logging

```typescript
// In Edge Functions
console.log('Request:', JSON.stringify(request, null, 2))
console.log('Response:', JSON.stringify(response, null, 2))
console.log('Error:', error.message, error.stack)
```

View logs:
```bash
# Follow Edge Function logs
supabase functions logs --follow function-name
```

#### Test API Calls Manually

```bash
# Test Revenue Monster
curl -X POST https://sb-open.revenuemonster.my/v1/token \
  -H "Content-Type: application/json" \
  -d '{"grantType":"client_credentials","clientId":"...","clientSecret":"..."}'

# Test Lalamove
curl -X POST https://sandbox-rest.lalamove.com/v3/quotations \
  -H "Authorization: hmac KEY:TIME:SIGNATURE" \
  -H "Market: MY" \
  -d '{"serviceType":"MOTORCYCLE","stops":[...]}'

# Test Edge Function
curl -X POST https://yourproject.supabase.co/functions/v1/function-name \
  -H "Authorization: Bearer ANON_KEY" \
  -d '{"test":"data"}'
```

#### Monitor API Rate Limits

Track API usage:
- Revenue Monster: Check dashboard
- Lalamove: 100 requests/minute
- J&T Express: Contact support for limits

### Getting Help

**Supabase:**
- Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com
- GitHub Issues: https://github.com/supabase/supabase

**Revenue Monster:**
- Support: support@revenuemonster.my
- Docs: https://doc.revenuemonster.my
- Phone: +603-2770 0898

**Lalamove:**
- Support: business@lalamove.com
- Docs: https://developers.lalamove.com
- Phone: 1300-30-5252

**J&T Express:**
- Support: corporate@jtexpress.my
- Phone: 1300-80-5858
- Website: https://www.jtexpress.my

**AutoCount:**
- Support: support@autocountaccount.com
- Phone: 1300-88-0000
- Forum: https://forum.autocountaccount.com

---

## Next Steps

### Ready to Start?

1. **Prioritize:** Start with Revenue Monster (payment gateway)
2. **Get Credentials:** Sign up for sandbox accounts
3. **Create Functions:** Follow the code examples above
4. **Test Thoroughly:** Use sandbox environments
5. **Go Live:** Switch to production when ready

### Need Help?

Contact me if you need:
- Code review
- Debugging assistance
- Architecture advice
- Integration support

---

**Document Version:** 1.0
**Last Updated:** October 8, 2025
**Author:** Claude Code Assistant

---

## Appendix

### Useful Resources

**Development Tools:**
- Supabase CLI: https://supabase.com/docs/guides/cli
- Postman (API testing): https://www.postman.com
- ngrok (local tunneling): https://ngrok.com

**Learning Resources:**
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Deno (Edge Functions runtime): https://deno.land
- HMAC Signatures: https://en.wikipedia.org/wiki/HMAC

### Sample Environment Variables

Create `.env.local` for local development:

```env
# Supabase
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Revenue Monster (Sandbox)
RM_CLIENT_ID=sandbox_client_id
RM_CLIENT_SECRET=sandbox_client_secret
RM_STORE_ID=sandbox_store_id
RM_SIGNING_KEY=sandbox_signing_key
RM_API_URL=https://sb-open.revenuemonster.my

# Lalamove (Sandbox)
LALAMOVE_API_KEY=sandbox_api_key
LALAMOVE_API_SECRET=sandbox_api_secret
LALAMOVE_API_URL=https://sandbox-rest.lalamove.com

# J&T Express (Sandbox)
JNT_API_ACCOUNT=sandbox_account
JNT_API_KEY=sandbox_key
JNT_CUSTOMER_CODE=sandbox_customer
JNT_API_URL=https://sandbox.jtexpress.my/api

# AutoCount Cloud (if using)
AUTOCOUNT_API_KEY=your_api_key
AUTOCOUNT_COMPANY_ID=your_company_id
AUTOCOUNT_API_URL=https://api.autocountcloud.com

# AutoCount Middleware (if using)
AUTOCOUNT_MIDDLEWARE_URL=https://your-ngrok-url.ngrok.io
```

---

**End of Guide**

Good luck with your integrations! 🚀
