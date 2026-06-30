# AutoLab WhatsApp Notifications — Setup Guide

> Reflects the **single combined workflow** that actually ships in this repo:
> `n8n/AutoLab Customer Chatbot & Notifications (Webhook).json`.
> The AI chatbot and the order/return notification system live in **one** workflow
> with two webhook entry points. (An older version of this guide described two
> separate workflows + a daily cron — that design is **not** what's in the file.)

---

## Overview

One n8n workflow, two independent webhook entry points:

| Entry point | Webhook path | Source | Purpose |
|---|---|---|---|
| **AI Chatbot** | `/webhook/autolab-chatbot` | WhatsApp platform (incoming messages) | Conversational product/order assistant |
| **Notifications** | `/webhook/order-notifications` | Supabase DB Webhooks (`orders`, `returns`) | Customer + admin WhatsApp alerts |

```
                         Supabase Database
              ┌──────────────┐    ┌──────────────┐
              │   orders     │    │   returns    │
              └──────┬───────┘    └──────┬───────┘
                     │  INSERT / UPDATE  │
                     └─────────┬─────────┘
                               ▼
                  n8n: /webhook/order-notifications
                               │
                 ┌─────────────┴──────────────┐
                 ▼                             ▼
        Parse Notification Payload     Build Admin Alert
        (detect event + normalize)     (new order / payment
                 │                       proof / new return)
                 ▼                             │
        Route by Event Type                    ▼
        ├─ ORDER_CREATED  ───────┐      Send Admin Alert
        ├─ ORDER_STATUS_CHANGED  │      → ADMIN_PHONE
        ├─ TRACKING_NUMBER_ADDED │
        ├─ PAYMENT_STATE_CHANGED │  → Format → Send to CUSTOMER
        ├─ RETURN_CREATED ──┐    │
        └─ RETURN_STATUS ───┤    │
                            ▼    │
              Fetch Return Customer (phone lookup)
                            │
                            ▼
                  Format → Send to CUSTOMER
```

Both customer and admin messages are sent the same way: an HTTP `POST` of
`{ sessionId, to, message }` (with an `X-API-Key` header) to the 2ndu.ai WhatsApp
Web send API — `https://whatsapp.2ndu.ai/api/messages/send`.

---

## Prerequisites

1. **n8n** instance running and reachable from Supabase.
2. **The 2ndu.ai WhatsApp Web service** (`https://whatsapp.2ndu.ai`) with:
   - A **connected session** — a WhatsApp number paired via QR (`status = 'connected'`).
     The send fails with `404` if the session isn't live.
   - The session id `wa_{userId}_{chatbotId}` (the `session_id` from the
     `whatsapp_web_sessions` table — see `WA_SESSION_ID` below).
   - The service API key `WA_SERVICE_API_KEY` (set on the VPS env). If the service
     has no key set, the call works without it, but set one before exposing to n8n.
3. **Supabase** project (`znxtabtksamgdsylagfo`) with the existing `orders`,
   `returns`, and `customer_profiles` tables.

> No custom SQL functions are required for notifications. The workflow reads the
> webhook payload directly and looks up the customer phone for returns via the
> Supabase REST API.

---

## Step 1 — Import the workflow

Import `AutoLab Customer Chatbot & Notifications (Webhook).json` into n8n.
(Re-import to replace an existing copy after edits.)

---

## Step 2 — Fill the `Notification Config` node

Open the **Notification Config** node and replace the placeholders:

| Field | Replace with | Status |
|---|---|---|
| `SUPABASE_URL` | `https://znxtabtksamgdsylagfo.supabase.co` | ⛔ placeholder |
| `SUPABASE_KEY` | Supabase **service_role** key | ⛔ placeholder |
| `WA_API_KEY` | The `WA_SERVICE_API_KEY` from the 2ndu.ai VPS env | ⛔ placeholder |
| `WA_SESSION_ID` | `wa_{userId}_{chatbotId}` — the connected session id | ⛔ placeholder |
| `WA_SEND_URL` | `https://whatsapp.2ndu.ai/api/messages/send` | ✅ set |
| `WEBSITE_URL` | `https://demoautolab.vercel.app` | ✅ set |
| `ADMIN_PHONE` | admin WhatsApp **mobile**, intl. format no `+` (e.g. `60165230268`) | ⚠️ verify |

- `WA_API_KEY` + `WA_SESSION_ID` are required for **every** message (sent via the
  2ndu.ai send API as `X-API-Key` + `{ sessionId, to, message }`).
- `SUPABASE_URL` + `SUPABASE_KEY` are required for the **return** customer-phone
  lookup (the `returns` table has no phone column). Order and admin alerts work
  without them, but returns to customers won't.
- ⚠️ `ADMIN_PHONE` must be a **WhatsApp-enabled mobile** — a landline (e.g. `0342…`)
  cannot receive messages.

**Find `WA_SESSION_ID`** (run against the 2ndu.ai Supabase, not AutoLab's):

```sql
select session_id from whatsapp_web_sessions
where chatbot_id = '<YOUR_CHATBOT_UUID>' and status = 'connected' limit 1;
```

The chatbot half of the workflow has its own `Config1` node (Supabase + 2ndu.ai
keys) — unrelated to notifications.

---

## Step 3 — Create Supabase Database Webhooks

**Dashboard → Database → Webhooks.** Both point to the **same** notification URL;
the workflow auto-detects order vs return from the payload.

### Webhook 1 — Orders
- **Table**: `orders`
- **Events**: INSERT, UPDATE
- **Method**: POST
- **URL**: `https://creatiqai.app.n8n.cloud/webhook/order-notifications`
- **Header**: `Content-Type: application/json`

### Webhook 2 — Returns
- **Table**: `returns`
- **Events**: INSERT, UPDATE
- **Method**: POST
- **URL**: `https://creatiqai.app.n8n.cloud/webhook/order-notifications`
- **Header**: `Content-Type: application/json`

---

## Step 4 — Activate & test

Activate the workflow, then exercise each path:

```sql
-- New order confirmation (customer) + new-order alert (admin)
-- → fires automatically when a customer checks out, or:
UPDATE orders SET status = 'PACKING'      WHERE order_no = 'ORD-XXXX';  -- status update
UPDATE orders SET courier_tracking_number = 'JT123', courier_provider = 'JNT'
  WHERE order_no = 'ORD-XXXX';                                          -- tracking link
UPDATE orders SET payment_state = 'APPROVED' WHERE order_no = 'ORD-XXXX'; -- payment update
```

Check **n8n → Executions** to confirm the run and the outgoing POST. A success
response from the send API is `{ "success": true }`. If `WA_API_KEY` / `WA_SESSION_ID`
are still placeholders, the send node errors (`401` / `404`).

You can sanity-check the endpoint directly:

```bash
curl -X POST https://whatsapp.2ndu.ai/api/messages/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_WA_SERVICE_API_KEY" \
  -d '{ "sessionId": "wa_<USER_UUID>_<CHATBOT_UUID>", "to": "60123456789", "message": "Hello" }'
```

---

## Notification reference

### Order events → Customer

| Event | Trigger | Title |
|---|---|---|
| ORDER_CREATED | new order (primary sub-order only) | 🎉 Order Confirmed! |
| ORDER_STATUS_CHANGED | `status` changes | status update |
| TRACKING_NUMBER_ADDED | `courier_tracking_number` set | 📬 Tracking number available |
| PAYMENT_STATE_CHANGED | `payment_state` changes | payment status update |

### Return events → Customer (phone fetched from `customer_profiles`)

| Event | Trigger | Title |
|---|---|---|
| RETURN_CREATED | new return | 🔁 Return Request Received |
| RETURN_STATUS_CHANGED | `status` changes | 🔁 Return Update |

### Admin alerts → `ADMIN_PHONE`

| Trigger | Title |
|---|---|
| New order | 🛒 NEW ORDER RECEIVED + link to `/admin/orders` |
| Payment proof submitted (`payment_state` → SUBMITTED / PENDING_VERIFICATION / PAID) | 💳 Payment Proof Submitted |
| New return | 🔁 New Return Request |

> **Multi-vendor dedup**: orders may split per vendor (`seller_letter` A/B/C sharing
> `order_group_id`). To avoid duplicate messages, `ORDER_CREATED` only fires for the
> primary sub-order (`seller_letter` NULL/empty or `A`). Adjust in the
> **Parse Notification Payload** node if your splitting differs.

---

## Troubleshooting

| Symptom / response | Check |
|---|---|
| No message sent | n8n Executions for errors; are `WA_API_KEY` / `WA_SESSION_ID` set (not placeholders)? |
| `401` unauthorized | `WA_API_KEY` is wrong/missing (must match `WA_SERVICE_API_KEY` on the VPS) |
| `404` session not found / not connected | The WhatsApp number isn't paired — re-scan the QR; confirm `WA_SESSION_ID` matches a row with `status='connected'` |
| `429` rate limited | Hit a service limit (15/min · 120/hr · 800/day per session, 5s per-contact cooldown). Response has `retryAfterMs` |
| Message sent but empty/blank | Send nodes post `{ sessionId, to: $json.customerPhone, message: $json.customerMsg }` — confirm the upstream Format node ran |
| Tracking notification never fires | Confirm the column is `courier_tracking_number` (it is in this DB) |
| Return notification has no recipient | `SUPABASE_URL`/`SUPABASE_KEY` must be set so the phone lookup works |
| Admin gets nothing | `ADMIN_PHONE` is a WhatsApp mobile? Alert only fires for new order / payment-proof / new return |
| Supabase webhook not firing | Dashboard → Database → Webhooks → Logs |
| Wrong phone format | Phones are normalized to `60XXXXXXXXX` (leading `0` → `60`, `+` stripped) |

---

## Not included in this workflow (future)

These appeared in an earlier design but are **not** in the current file — add them as
a separate scheduled workflow if needed:

- Daily payment reminders (gentle / nudge / urgent tiers)
- Auto-cancel of unpaid orders after 72h
- Low-stock admin alerts

---

## Sending limits & ban risk

This uses **WhatsApp Web via Baileys** (the 2ndu.ai service), **not** the official
Cloud API — so there is **no 24-hour window and no template approval**: free-form text
can be sent anytime. But two real constraints apply:

- **Rate limits** (per session): 15/min · 120/hr · 800/day, plus a **5s per-contact
  cooldown**. Exceeding returns `429` with `retryAfterMs`. (Order/return alerts are
  low-volume, so this is mainly a concern if two events fire for the same customer
  within 5s — e.g. order-created + payment-state-changed at checkout.)
- **Ban risk**: cold outbound to people who never messaged you can get the number
  banned. Transactional alerts to customers who just ordered are low-risk; for any
  **bulk/marketing** blast use 2ndu.ai's follow-up endpoints (human-like delays)
  instead of this send API.
