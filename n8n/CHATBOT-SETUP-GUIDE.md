# AutoLab WhatsApp AI Agent - Setup Guide

## Architecture Overview

```
User (WhatsApp)
  ↓
WhatsApp Cloud API → Webhook → n8n
  ↓
[Extract Message] → [AI Agent (GPT-4o-mini)]
                       ├── System Prompt (personality, rules, flow)
                       ├── Window Buffer Memory (per phone session)
                       └── 8 Tools:
                           ├── search_products      → Supabase RPC
                           ├── get_product_components → Supabase RPC
                           ├── check_customer_orders → Supabase RPC
                           ├── get_order_details     → Supabase RPC
                           ├── add_to_cart           → Supabase RPC
                           ├── get_cart              → Supabase RPC
                           ├── search_car_brands     → Supabase RPC
                           └── list_categories       → Supabase RPC
  ↓
[Send WhatsApp Reply]
```

**The AI Agent IS the brain.** It decides what to do, which tools to call, and how to respond — all guided by the system prompt. No manual intent routing needed.

## Token Usage Per Interaction

| Step | Tokens |
|------|--------|
| AI Agent reasoning + response | ~300-600 |
| Tool calls (each) | ~50-100 |
| Conversation memory context | ~200-500 |
| **Total per message (avg)** | **~500-800 tokens** |
| Estimated cost per 1000 messages | ~$0.10 (GPT-4o-mini) |

Product data is fetched from Supabase via tools — not sent to the LLM upfront.

---

## Prerequisites

1. **WhatsApp Business API** account (via Meta Business)
2. **n8n** instance (self-hosted or cloud) with **AI Agent** support
3. **Supabase** project (your existing one)
4. **OpenAI API** key

---

## Step 1: Run SQL Functions

Run the SQL file in your Supabase SQL editor:

```
database/chatbot-search-functions.sql
```

This creates:
- `pg_trgm` extension for fuzzy/typo-tolerant search
- Trigram indexes on product names, brands, models
- 11 chatbot-specific RPC functions with empty-string-to-null normalization

### Test the functions:

```sql
-- Test fuzzy car brand search (handles typos)
SELECT * FROM chatbot_search_car_makes('toyata');  -- Returns "Toyota"
SELECT * FROM chatbot_search_car_makes('protn');   -- Returns "Proton"

-- Test product search with filters
SELECT * FROM chatbot_search_products(
  p_query := 'android player',
  p_car_brand := 'Toyota',
  p_car_model := 'Vios',
  p_limit := 5
);

-- Test order lookup by phone
SELECT * FROM chatbot_get_customer_orders('60123456789');

-- Test add to cart
SELECT * FROM chatbot_add_to_cart('60123456789', 'SKU-001', 1);
```

---

## Step 2: Set Up WhatsApp Business API

### 2a. Create Meta Business App

1. Go to https://developers.facebook.com
2. Create a new app → Select "Business" type
3. Add "WhatsApp" product
4. Get your credentials:
   - **Phone Number ID**: `WHATSAPP_PHONE_NUMBER_ID`
   - **Access Token**: `WHATSAPP_ACCESS_TOKEN`
   - **Webhook Verify Token**: Any string you choose

### 2b. Configure Webhook

1. In Meta Developer Portal → WhatsApp → Configuration
2. Set Webhook URL: `https://your-n8n-url/webhook/whatsapp-webhook`
3. Set Verify Token: Your chosen token
4. Subscribe to: `messages`

---

## Step 3: Import n8n Workflow

1. Open n8n
2. Go to **Workflows** → **Import from File**
3. Select `n8n/whatsapp-chatbot-workflow.json`

You should see:
- **Main flow**: WhatsApp Webhook → Respond to Webhook → Extract Message → AI Agent → Send WhatsApp Reply
- **AI sub-nodes**: OpenAI Chat Model + Window Buffer Memory + 8 Tool nodes

---

## Step 4: Configure n8n Credentials

### 4a. Supabase Service Key (HTTP Header Auth)

Create an HTTP Header Auth credential:
- **Name**: `Supabase Service Key`
- **Header Name**: `apikey`
- **Header Value**: Your Supabase `service_role` key

> **Important**: Use the `service_role` key, not the `anon` key, because chatbot functions need to bypass RLS.

### 4b. OpenAI API Key

Create an OpenAI credential:
- **Name**: `OpenAI API Key`
- **API Key**: Your OpenAI key

### 4c. WhatsApp Bearer Token (HTTP Header Auth)

Create an HTTP Header Auth credential:
- **Name**: `WhatsApp Bearer Token`
- **Header Name**: `Authorization`
- **Header Value**: `Bearer YOUR_WHATSAPP_ACCESS_TOKEN`

### 4d. Assign Credentials

After import, click on each node and assign the correct credential:
- **OpenAI Chat Model** → OpenAI API Key
- **All tool nodes** (Search Products, Get Components, etc.) → Supabase Service Key
- **Send WhatsApp Reply** → WhatsApp Bearer Token

---

## Step 5: Set Environment Variables in n8n

Go to **Settings** → **Environment Variables** (or use `.env`):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
WHATSAPP_PHONE_NUMBER_ID=123456789
SITE_URL=https://autolab.my
```

---

## Step 6: Activate & Test

1. **Activate** the workflow in n8n
2. Send "hi" from your WhatsApp to the business number
3. You should receive the welcome menu
4. Try: "I need an android player for Toyota Vios"

---

## How the AI Agent Works

### The System Prompt

The AI Agent has a detailed system prompt that defines:
- **Personality**: Friendly, uses WhatsApp formatting and emojis
- **Conversation flow**: Brand → Model → Category → Search (but smart enough to skip steps)
- **Tool usage rules**: When to call which tool, how to format results
- **Contact info**: For human handoff
- **Response formatting**: Product lists, order tracking, cart display

### Memory

Window Buffer Memory keeps the last 12 messages per phone number. This means:
- The AI remembers what brand/model the customer mentioned
- It can follow up on previous searches
- Sessions are phone-number-based (each customer gets their own memory)

### Tools

8 connected tools, each an HTTP Request to a Supabase RPC function:

| Tool | Supabase Function | Purpose |
|------|------------------|---------|
| `search_products` | `chatbot_search_products` | Fuzzy product search with brand/model/category filters |
| `get_product_components` | `chatbot_get_product_components` | Get SKUs for add-to-cart |
| `check_customer_orders` | `chatbot_get_customer_orders` | Order lookup by phone |
| `get_order_details` | `chatbot_get_order_details` | Full order details by order number |
| `add_to_cart` | `chatbot_add_to_cart` | Add item to cart |
| `get_cart` | `chatbot_get_cart` | View cart contents |
| `search_car_brands` | `chatbot_search_car_makes` | Fuzzy brand search |
| `list_categories` | `chatbot_list_popular_categories` | Show available categories |

---

## Conversation Flow Examples

### Example 1: Smart Product Search

```
User: Hi
Bot:  Hi there! 👋 Welcome to *AutoLab*!

      I'm your AI assistant for car parts & accessories. How can I help?

      🔍 *Find Products* - Search car parts
      📦 *My Orders* - Track your orders
      🛒 *My Cart* - View your cart
      👤 *Talk to Admin* - Connect with our team

User: I need android player for my toyota vios
Bot:  [Calls search_products with query="android player", car_brand="Toyota", car_model="Vios"]

      ✅ Found 3 products for *Toyota Vios*:

      *1.* 10" Android Player for Toyota Vios 2019-2023
      💰 *RM 599.00* | ✅ In Stock

      *2.* 9" Android Player for Toyota Vios 2014-2018
      💰 *RM 499.00* | ✅ In Stock

      *3.* 10" Android Player Premium for Toyota Vios
      💰 *RM 799.00* | ✅ In Stock

      Reply with a number for details, or describe what you need!

User: 1
Bot:  [Calls get_product_components for the selected product]

      📦 *10" Android Player for Toyota Vios 2019-2023*

      🏷️ Brand: Toyota
      📂 Category: Head Unit
      💰 Price: *RM 599.00*
      📅 Year: 2019-2023
      ✅ In Stock

      🔗 View: autolab.my/product/android-player-toyota-vios-2019

      🛒 Want to add to cart? Just say "add to cart"!

User: add to cart
Bot:  [Calls add_to_cart with the component SKU]

      🛒 *Added to cart!*
      Added 1x Android Player (RM 599.00) to your cart.
      Your cart now has 1 item(s).

      🌐 Visit autolab.my to checkout!
```

### Example 2: Direct Search (Skips Steps)

```
User: do you have dashcam for proton x50?
Bot:  [AI is smart enough to call search_products directly with all info]

      ✅ Found 2 dashcams for *Proton X50*:
      ...
```

### Example 3: Typo Handling

```
User: andriod plyer for toyata vois
Bot:  [Fuzzy search handles all typos automatically]
      ✅ Found products for Toyota Vios in Head Unit...
```

### Example 4: Order Tracking

```
User: check my orders
Bot:  [Calls check_customer_orders with the customer's phone]

      📦 *Your Recent Orders*

      🚚 *#ORD-20260225-000012*
         Status: *OUT FOR DELIVERY*
         Total: RM 899.00 | 2 items
         🔗 Track: https://www.jtexpress.my/tracking?billcode=JP123456789

      ✅ *#ORD-20260220-000008*
         Status: *DELIVERED*
         Total: RM 499.00 | 1 item
```

---

## Customizing the AI Agent

### Edit the System Prompt

Click on the **AI Agent** node → Edit the `System Message` in Options. You can:
- Change the personality/tone
- Add or remove product categories
- Update contact info
- Modify the conversation flow rules
- Add multilingual support (e.g., Malay)

### Change the LLM Model

Click on **OpenAI Chat Model** → Change `model`:
- `gpt-4o-mini` — Best value, fast, good enough for most use cases
- `gpt-4o` — Smarter but more expensive (~10x cost)
- `gpt-3.5-turbo` — Cheapest but less capable

### Adjust Memory Length

Click on **Window Buffer Memory** → Change `contextWindowLength`:
- `6` — Shorter memory, lower cost per message
- `12` — Default, good balance
- `20` — Longer conversations, higher cost

### Add Product Images

After the AI Agent node, add a Code node that checks if the response mentions a product with an image, and send a WhatsApp image message instead:

```json
{
  "messaging_product": "whatsapp",
  "to": "60123456789",
  "type": "image",
  "image": {
    "link": "https://your-bucket.supabase.co/storage/v1/object/public/products/image.jpg",
    "caption": "Product Name - RM 599.00"
  }
}
```

---

## Scaling

| Concurrent Users | Recommended Setup |
|------------------|-------------------|
| 1-50 | n8n Cloud or single self-hosted |
| 50-200 | Self-hosted with queue mode |
| 200+ | n8n with Redis queue + multiple workers |

### Cost Optimization Tips

1. **Use GPT-4o-mini** — 15x cheaper than GPT-4o, handles product search well
2. **Reduce memory window** — Lower `contextWindowLength` if conversations are short
3. **Cache frequent queries** — Use n8n Static Data to cache popular product results
4. **Set max tokens** — Keep `maxTokens: 800` to prevent overly long responses

---

## Monitoring

- **n8n Executions** tab shows all webhook calls and AI Agent reasoning
- **Memory** is stored per phone number — resets when n8n restarts
- For production, consider adding persistent memory (database-backed) instead of window buffer

For production monitoring, add a logging node after Send WhatsApp Reply that writes to your `webhook_logs` table.
