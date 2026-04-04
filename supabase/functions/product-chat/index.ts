import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Single powerful search tool — components included in results
const tools = [
  {
    type: "function" as const,
    function: {
      name: "search_products",
      description:
        "Search AutoLab's product catalog. Uses smart fuzzy matching across product names, models, keywords, components, and descriptions. Returns products with components and pricing included. Just pass a natural language query — the search engine handles the rest.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Natural language search query. Combine car brand + model + product type for best results. Examples: 'audi tt casing', 'mini cooper r60', 'honda city android player', 'bmw 1 series 9 inch'. The search is fuzzy and handles typos.",
          },
        },
        required: ["query"],
      },
    },
  },
];

// Execute search against Supabase
async function executeSearch(
  supabase: ReturnType<typeof createClient>,
  query: string
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("chatbot_smart_search", {
      p_query: query,
      p_limit: 5,
    });
    if (error) return JSON.stringify({ error: error.message });
    if (!data || data.length === 0) return JSON.stringify({ results: [], message: "No products found" });
    return JSON.stringify(data);
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      messages,
      customerType,
      customerName,
    }: {
      messages: Array<{ role: string; content: string }>;
      customerType: string;
      customerName: string;
    } = await req.json();

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing messages" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const isMerchant = customerType === "merchant";
    const pricingField = isMerchant ? "merchant_price" : "normal_price";
    const pricingLabel = isMerchant ? "Merchant Price" : "Price";

    const systemMessage = {
      role: "system",
      content: `You are AutoLab's product assistant on our website. AutoLab is a Malaysian auto parts & car accessories store based in Cheras, KL. Our main products are 9/10 inch Android Player casings for various car brands.

## Customer
Name: ${customerName || "Customer"}
Type: ${isMerchant ? "B2B Merchant — show merchant_price as \"Merchant Price\"" : "Retail customer — show normal_price as \"Price\""}

## Your Job
Help customers find products. Conversational flow:
1. Ask what **car** they have (brand + model)
2. Ask what **product** they need (we mainly sell 9/10 inch casing for Android player)
3. Call \`search_products\` with a natural query like "audi tt casing" or "mini r60"
4. Present the results with the correct pricing (\`${pricingField}\` field, label as "${pricingLabel}")

**Shortcuts:** If the customer gives you brand + model + product in one go, search immediately. Don't ask questions you already have answers to.

## How Search Works
The \`search_products\` tool is smart — it searches across product names, models, keywords, descriptions, and even component names. It handles typos. Results come with components already included (SKU, name, price, stock).

Just pass a good query like:
- "audi tt" — finds Audi TT products
- "mini cooper r60 casing" — finds Mini Cooper R60 casings
- "honda city android player" — finds Honda City head units
- "bmw 1 series" — finds BMW 1 Series products

If first search returns nothing, try a simpler query (just brand + model, or just the brand).

## Presenting Results
For each product found, show:

**{product_name}**
${pricingLabel}: **RM {${pricingField}}**
Stock: {In Stock / Out of Stock}
Year: {year_from}–{year_to}

Includes:
{for each component in components array:}
• {name} ({sku}) — RM {${pricingField}}

## Rules
- NEVER make up products or prices. Only show what the search returns
- Prices in RM (Malaysian Ringgit)
- Keep responses short — this is a chat widget
- Use **bold** for product names and prices
- Do NOT send any URLs or links — the customer is already on our website. Say "check our Catalog page" if needed
- Respond in the same language the customer uses (English or Malay)
- For non-product questions (orders, returns, shipping), direct to support: 03-4297 7668 or support@autolab.my`,
    };

    const conversationMessages = [
      systemMessage,
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    // Tool-calling loop (max 5 iterations for retries)
    let currentMessages = conversationMessages;
    let finalResponse = "";

    for (let i = 0; i < 5; i++) {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: currentMessages,
            tools,
            tool_choice: "auto",
            max_tokens: 1000,
            temperature: 0.3,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const message = data.choices[0].message;

      if (message.tool_calls && message.tool_calls.length > 0) {
        currentMessages.push(message);

        for (const toolCall of message.tool_calls) {
          const fnArgs = JSON.parse(toolCall.function.arguments);
          const result = await executeSearch(supabase, fnArgs.query || "");

          currentMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          } as any);
        }
        continue;
      }

      finalResponse = message.content || "";
      break;
    }

    return new Response(
      JSON.stringify({ reply: finalResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Product chat error:", error);
    return new Response(
      JSON.stringify({
        reply: "Sorry, I'm having trouble right now. Please try again or check our Catalog page.",
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
