import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CustomerServiceRequest {
  question: string;
  context: string;
  sources: Array<{
    title: string;
    content: string;
    category: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { question, context, sources }: CustomerServiceRequest = await req.json();

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: question' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Your OpenAI API key from environment variables
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    // Build the prompt
    const sourceInfo = sources?.map((source, index) => 
      `${index + 1}. **${source.title}** (${source.category})
   ${source.content.substring(0, 500)}${source.content.length > 500 ? '...' : ''}`
    ).join('\n\n') || 'No specific company information found.';

    const prompt = `You are a professional customer service AI assistant for a company. A customer has asked: "${question}"

Here is the relevant information from our company's knowledge base:

${sourceInfo}

Please provide a helpful, accurate response following these guidelines:

1. **Be Direct and Helpful**: Answer the customer's specific question clearly
2. **Use Company Information**: Base your response on the provided company policies and information
3. **Be Professional but Friendly**: Use a conversational, customer-service tone
4. **Reference Sources**: When applicable, mention which policy or document you're referencing
5. **Handle Missing Info**: If you don't have complete information, be honest and suggest contacting support
6. **Be Specific**: For questions about returns, shipping, payments, etc., provide specific details from our policies
7. **Keep it Concise**: Aim for 2-4 sentences unless more detail is needed

Customer Question: ${question}

Your Response:`;

    console.log('Calling OpenAI API for customer service response...');

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful, professional customer service AI assistant. Provide accurate responses based on company information provided to you.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 600,
        temperature: 0.3,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI API response received');

    const aiResponse = data.choices[0]?.message?.content?.trim();

    if (!aiResponse) {
      throw new Error('No response generated from OpenAI');
    }

    const result = {
      success: true,
      response: aiResponse,
      sources_used: sources?.length || 0,
      processing_time: Date.now(),
      tokens_used: data.usage?.total_tokens || 0
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in customer service AI function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error',
        fallback_response: "I apologize, but I'm experiencing technical difficulties right now. Please contact our support team for assistance."
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});