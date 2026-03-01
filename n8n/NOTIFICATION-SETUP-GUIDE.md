# AutoLab WhatsApp Notifications - Setup Guide

## Overview

2 workflows handle ALL WhatsApp notifications for AutoLab:

| Workflow | File | Sends To | Trigger |
|----------|------|----------|---------|
| **Customer Notifications** | `customer-notifications-workflow.json` | Customers | Webhook + Daily Cron |
| **Admin Alerts** | `admin-alerts-workflow.json` | Admin | Webhook |

```
┌──────────────────────────────────────────────────────────────────────────┐
│                  AutoLab WhatsApp Notification System                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  WORKFLOW 1: Customer Notifications (All-in-One)                          │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                                                                     │  │
│  │  TRIGGER A: Webhook /customer-notifications                         │  │
│  │  ┌──────────┐   ┌───────────┐   ┌────────────────┐   ┌──────────┐ │  │
│  │  │ Supabase │──▶│ Parse     │──▶│ Order or       │──▶│ WhatsApp │ │  │
│  │  │ DB Event │   │ Payload   │   │ Return?        │   │ to Cust. │ │  │
│  │  └──────────┘   └───────────┘   │                │   └──────────┘ │  │
│  │                                  │ ORDER:         │                │  │
│  │                                  │ ├ Created      │                │  │
│  │                                  │ ├ Status Change│                │  │
│  │                                  │ ├ Tracking Add │                │  │
│  │                                  │ └ Payment Chg  │                │  │
│  │                                  │                │                │  │
│  │                                  │ RETURN:        │                │  │
│  │                                  │ └ All statuses │                │  │
│  │                                  └────────────────┘                │  │
│  │                                                                     │  │
│  │  TRIGGER B: Daily Cron (10am MYT)                                   │  │
│  │  ┌──────────┐   ┌───────────┐   ┌────────────────┐   ┌──────────┐ │  │
│  │  │ Schedule │──▶│ Fetch     │──▶│ Tiered         │──▶│ WhatsApp │ │  │
│  │  │ 10am     │   │ Unpaid    │   │ Reminders      │   │ to Cust. │ │  │
│  │  └──────────┘   │ Orders    │   │ Gentle/Nudge/  │   └──────────┘ │  │
│  │                  └───────────┘   │ Urgent         │                │  │
│  │                  ┌───────────┐   └────────────────┘                │  │
│  │                  │ Auto-     │   ┌────────────────┐   ┌──────────┐ │  │
│  │                  │ Cancel    │──▶│ Cancel Notice  │──▶│ WhatsApp │ │  │
│  │                  │ 72h+      │   │ Message        │   │ to Cust. │ │  │
│  │                  └───────────┘   └────────────────┘   └──────────┘ │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  WORKFLOW 2: Admin Alerts                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Webhook /admin-alerts                                              │  │
│  │  ┌──────────┐   ┌───────────┐   ┌────────────────┐   ┌──────────┐ │  │
│  │  │ Supabase │──▶│ Route     │──▶│ New Order /    │──▶│ WhatsApp │ │  │
│  │  │ DB Event │   │ Alert Type│   │ Payment Sub /  │   │ to Admin │ │  │
│  │  └──────────┘   └───────────┘   │ Low Stock /    │   └──────────┘ │  │
│  │                                  │ New Return     │                │  │
│  │                                  └────────────────┘                │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

1. **WhatsApp Business API** configured (same as chatbot)
2. **n8n** instance running
3. **Supabase** project with existing tables (orders, returns, profiles)
4. The **webhook setup** already deployed (`database/webhook-setup-n8n.sql`)

---

## Step 1: Run SQL Functions

Run in your Supabase SQL Editor:

```
database/notification-functions.sql
```

This creates:

| Function | Purpose |
|----------|---------|
| `get_return_notification_data()` | Fetch customer info for return notifications |
| `get_unpaid_orders_for_reminder()` | Get unpaid orders (6-72 hours old) for reminders |
| `get_low_stock_products()` | Get products below reorder level |
| `auto_cancel_unpaid_orders()` | Cancel orders unpaid for 72+ hours |

And these triggers:

| Trigger | Table | Events | Purpose |
|---------|-------|--------|---------|
| `return_status_webhook_trigger` | returns | INSERT, UPDATE | Log return status changes |
| `admin_alert_webhook_trigger` | orders | INSERT, UPDATE | Log new orders + payment submissions |
| `admin_return_alert_trigger` | returns | INSERT | Log new return requests |

### Test the functions:

```sql
-- Test unpaid orders query
SELECT * FROM get_unpaid_orders_for_reminder();

-- Test low stock check
SELECT * FROM get_low_stock_products();

-- Test auto-cancel (careful - this actually cancels orders!)
-- SELECT * FROM auto_cancel_unpaid_orders();
```

---

## Step 2: Import Workflows into n8n

Import these 2 JSON files:

| File | Webhook Path |
|------|-------------|
| `n8n/customer-notifications-workflow.json` | `/webhook/customer-notifications` + Daily Cron |
| `n8n/admin-alerts-workflow.json` | `/webhook/admin-alerts` |

---

## Step 3: Configure Workflows

### 3a. Credentials Needed

| Credential | Type | How to Create |
|-----------|------|---------------|
| **WhatsApp Bearer Token** | HTTP Header Auth | Header: `Authorization` / Value: `Bearer YOUR_TOKEN` |
| **Supabase Service Key** | HTTP Header Auth | Header: `apikey` / Value: `YOUR_SERVICE_ROLE_KEY` |

### 3b. Replace Placeholder Values

**In Customer Notifications workflow** — update both `Config` and `Config (Cron)` nodes:

| Placeholder | Replace With |
|------------|-------------|
| `YOUR_SUPABASE_URL` | `https://your-project.supabase.co` |
| `YOUR_SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service_role key |
| `YOUR_WHATSAPP_PHONE_NUMBER_ID` | Your WhatsApp Phone Number ID |

**In Admin Alerts workflow** — update the `Admin Config` node:

| Placeholder | Replace With |
|------------|-------------|
| `ADMIN_PHONE` | `60342977668` (your admin WhatsApp number) |
| `YOUR_SUPABASE_URL` | `https://your-project.supabase.co` |
| `YOUR_SUPABASE_SERVICE_KEY` | Your Supabase service_role key |
| `YOUR_WHATSAPP_PHONE_NUMBER_ID` | Your WhatsApp Phone Number ID |

### 3c. Assign Credentials to Nodes

After import, click each HTTP Request node and assign credentials:
- **Send WhatsApp Message** nodes → WhatsApp Bearer Token
- **Fetch Return Customer Info** / **Fetch Unpaid Orders** / **Auto-Cancel** nodes → Supabase Service Key

---

## Step 4: Set Up Supabase Database Webhooks

Go to **Supabase Dashboard → Database → Webhooks** and create:

### Webhook 1: Customer Order Notifications
- **Name**: `customer-order-notifications`
- **Table**: `orders`
- **Events**: INSERT, UPDATE
- **HTTP Method**: POST
- **URL**: `https://your-n8n.com/webhook/customer-notifications`
- **Headers**: `Content-Type: application/json`

### Webhook 2: Customer Return Notifications
- **Name**: `customer-return-notifications`
- **Table**: `returns`
- **Events**: INSERT, UPDATE
- **HTTP Method**: POST
- **URL**: `https://your-n8n.com/webhook/customer-notifications`
- **Headers**: `Content-Type: application/json`

### Webhook 3: Admin Alerts (Orders)
- **Name**: `admin-order-alerts`
- **Table**: `orders`
- **Events**: INSERT, UPDATE
- **HTTP Method**: POST
- **URL**: `https://your-n8n.com/webhook/admin-alerts`
- **Headers**: `Content-Type: application/json`

### Webhook 4: Admin Alerts (Returns)
- **Name**: `admin-return-alerts`
- **Table**: `returns`
- **Events**: INSERT
- **HTTP Method**: POST
- **URL**: `https://your-n8n.com/webhook/admin-alerts`
- **Headers**: `Content-Type: application/json`

> **Note**: Webhooks 1 & 2 both go to `/customer-notifications` — the workflow auto-detects whether it's an order or return event from the payload.

---

## Step 5: Activate & Test

1. Activate both workflows in n8n
2. Test each scenario:

### Test Order Notifications
```sql
UPDATE orders SET status = 'PACKING' WHERE order_no = 'ORD-XXXX-XXXX';
```
Expected: Customer receives "📦 Order Being Packed" WhatsApp message.

### Test Tracking Added
```sql
UPDATE orders SET courier_tracking_number = 'JP123456789', courier_provider = 'JNT'
WHERE order_no = 'ORD-XXXX-XXXX';
```
Expected: Customer receives "📬 Tracking Number Available!" with J&T tracking link.

### Test Payment State Change
```sql
UPDATE orders SET payment_state = 'APPROVED' WHERE order_no = 'ORD-XXXX-XXXX';
```
Expected: Customer receives "✅ Payment Approved!" message.

### Test Return Notifications
```sql
INSERT INTO returns (order_id, customer_id, reason, refund_method, status)
VALUES ('order-uuid', 'customer-uuid', 'DEFECTIVE', 'ORIGINAL_PAYMENT', 'PENDING');
```
Expected: Customer gets "📋 Return Request Received" + Admin gets "🔁 New Return Request!" alert.

### Test Admin Alerts
Place a new order through the website.
Expected: Admin gets "🔔 New Order Received!" WhatsApp alert.

### Test Payment Reminders
Manually trigger the "Daily 10am (Reminders)" node in n8n, or wait for scheduled time.
Expected: All unpaid orders (6-72 hours) get tiered reminder messages.

### Test Auto-Cancel
After running the cron trigger, orders unpaid for 72+ hours are automatically cancelled and customers receive "⚠️ Order Auto-Cancelled" messages.

---

## All Customer Notifications Reference

### Order Events → Customer WhatsApp

| Event | Status | Emoji | Message Title |
|-------|--------|-------|---------------|
| ORDER_CREATED | - | 🎉 | Order Confirmed! |
| ORDER_STATUS_CHANGED | PENDING_VERIFICATION | 🔍 | Payment Under Review |
| ORDER_STATUS_CHANGED | VERIFIED | ✅ | Payment Verified! |
| ORDER_STATUS_CHANGED | PACKING | 📦 | Order Being Packed |
| ORDER_STATUS_CHANGED | DISPATCHED | 🚚 | Order Shipped! + tracking link |
| ORDER_STATUS_CHANGED | DELIVERED | 🏠 | Order Delivered! + review/return info |
| ORDER_STATUS_CHANGED | COMPLETED | ✅ | Order Completed + loyalty points |
| ORDER_STATUS_CHANGED | CANCELLED | ❌ | Order Cancelled + refund info |
| ORDER_STATUS_CHANGED | REJECTED | ⚠️ | Order Rejected |
| TRACKING_NUMBER_ADDED | - | 📬 | Tracking Number Available! + courier link |
| PAYMENT_STATE_CHANGED | SUBMITTED | 📸 | Payment Proof Received |
| PAYMENT_STATE_CHANGED | APPROVED | ✅ | Payment Approved! |
| PAYMENT_STATE_CHANGED | REJECTED | ❌ | Payment Rejected + re-submit link |

### Return Events → Customer WhatsApp

| Status | Emoji | Message Title |
|--------|-------|---------------|
| PENDING | 📋 | Return Request Received |
| APPROVED | ✅ | Return Approved! + return address + shipping instructions |
| REJECTED | ❌ | Return Declined + rejection reason |
| ITEM_SHIPPED | 📮 | Return Shipment Noted |
| ITEM_RECEIVED | 📬 | Return Item Received |
| INSPECTING | 🔍 | Item Under Inspection |
| REFUND_PROCESSING | 💰 | Refund Being Processed + amount |
| EXCHANGE_PROCESSING | 🔄 | Exchange Being Processed |
| COMPLETED | ✅ | Return Completed + final details |
| CANCELLED | 🚫 | Return Cancelled |

### Payment Reminders → Customer WhatsApp

| Hours Since Order | Tier | Emoji | Tone |
|-------------------|------|-------|------|
| 6-24 hours | Gentle | 👋 | Friendly reminder with pay link |
| 24-48 hours | Nudge | 💬 | "Items may go out of stock" |
| 48-72 hours | Urgent | ⚠️ | "Will be auto-cancelled in 24 hours" |
| 72+ hours | Auto-Cancel | ⚠️ | "Order has been cancelled" |

### Admin Alerts → Admin WhatsApp

| Alert Type | Emoji | Message Title |
|-----------|-------|---------------|
| NEW_ORDER | 🔔 | New Order Received! + details + admin link |
| PAYMENT_SUBMITTED | 💳 | Payment Proof Submitted! + verify link |
| LOW_STOCK | ⚠️ | Low Stock Alert! + product list |
| NEW_RETURN | 🔁 | New Return Request! + review link |

---

## All n8n Endpoints

| Endpoint | Workflow | Source |
|----------|---------|--------|
| `/webhook/whatsapp-webhook` | AI Chatbot | WhatsApp Cloud API (incoming customer messages) |
| `/webhook/customer-notifications` | Customer Notifications | Supabase DB Webhook (orders + returns) |
| `/webhook/admin-alerts` | Admin Alerts | Supabase DB Webhook (orders + returns) |
| *(daily cron 10am)* | Payment Reminders + Auto-Cancel | Built into Customer Notifications workflow |

---

## Architecture Diagram

```
                         Supabase Database
              ┌──────────────┐    ┌──────────────┐
              │   orders     │    │   returns    │
              └──────┬───────┘    └──────┬───────┘
                     │                    │
          ┌──────────┴──────────┐ ┌──────┴──────────┐
          ▼                     ▼ ▼                  ▼
  DB Webhook #1          DB Webhook #2      DB Webhook #3 & #4
  (orders INSERT/UPDATE)  (returns INSERT/UPDATE) (orders + returns)
          │                     │                  │
          ▼                     ▼                  ▼
  ┌───────────────────────────────────┐   ┌──────────────────┐
  │  n8n: /customer-notifications     │   │ n8n: /admin-alerts│
  │                                   │   │                  │
  │  Parse → Order or Return?         │   │ Parse → Route    │
  │  ├─ ORDER: Route by event type    │   │ ├─ New Order     │
  │  │  ├─ Created   → format → send  │   │ ├─ Payment Sub  │
  │  │  ├─ Status    → format → send  │   │ ├─ Low Stock    │
  │  │  ├─ Tracking  → format → send  │   │ └─ New Return   │
  │  │  └─ Payment   → format → send  │   │                  │
  │  └─ RETURN: Fetch info → format   │   │ → Send to Admin  │
  │            → send                 │   │   WhatsApp       │
  │                                   │   └──────────────────┘
  │  + Daily Cron (10am):             │
  │  ├─ Fetch unpaid → tiered msgs    │
  │  └─ Auto-cancel 72h+ → notify    │
  │                                   │
  │  → Send to Customer WhatsApp      │
  └───────────────────────────────────┘
```

---

## Cost Estimate

| Feature | Volume | Cost |
|---------|--------|------|
| Order notifications | ~10-50/day | Free (within 24h conversation window) |
| Return notifications | ~1-5/day | Free (within 24h window) |
| Admin alerts | ~10-50/day | Free (business-initiated) |
| Payment reminders | ~5-20/day | May need template messages if >24h |
| Auto-cancel notices | ~1-5/day | May need template messages if >24h |

> **Important**: WhatsApp allows free-form messages within 24 hours of customer's last message. For notifications outside the 24h window (payment reminders, auto-cancel notices), you may need approved **message templates** in your WhatsApp Business account.

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| No notifications received | Check n8n Executions tab for errors |
| "Unauthorized" error on WhatsApp | Verify WhatsApp Bearer Token credential |
| "Unauthorized" on Supabase calls | Verify Supabase Service Key credential |
| Supabase webhook not firing | Check Supabase Dashboard → Database → Webhooks → Logs |
| Payment reminders not sending | Ensure cron timezone matches MYT (UTC+8) |
| Duplicate notifications | The Parse Payload node filters out irrelevant updates |
| Wrong phone format | Workflows auto-normalize to `60XXXXXXXXX` (Malaysian) |
| Return notifications missing customer info | Ensure `get_return_notification_data()` SQL function exists |
| Auto-cancel not working | Test `SELECT * FROM auto_cancel_unpaid_orders()` manually first |
