import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KnowledgeBaseSearchRequest {
  query?: string;
  category?: string;
  tags?: string[];
  limit?: number;
  api_key?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: KnowledgeBaseSearchRequest = await req.json();
    
    // Optional API key validation (you can add your own logic here)
    const expectedApiKey = Deno.env.get('KNOWLEDGE_BASE_API_KEY');
    if (expectedApiKey && body.api_key !== expectedApiKey) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Build the query
    let query = supabase
      .from('knowledge_base')
      .select('*');

    // Apply search filters
    if (body.query) {
      query = query.or(`title.ilike.%${body.query}%,content.ilike.%${body.query}%`);
    }

    if (body.category) {
      query = query.eq('category', body.category);
    }

    if (body.tags && body.tags.length > 0) {
      query = query.overlaps('tags', body.tags);
    }

    // Apply limit (default to 10, max 50)
    const limit = Math.min(body.limit || 10, 50);
    query = query.limit(limit);

    // Order by updated_at descending
    query = query.order('updated_at', { ascending: false });

    // Execute query
    const { data, error } = await query;

    if (error) {
      throw new Error(`Database query error: ${error.message}`);
    }

    // Format response for n8n/chatbot consumption
    const response = {
      success: true,
      count: data?.length || 0,
      query_params: {
        query: body.query,
        category: body.category,
        tags: body.tags,
        limit: limit
      },
      data: data?.map(entry => ({
        id: entry.id,
        title: entry.title,
        content: entry.content,
        category: entry.category,
        tags: entry.tags,
        updated_at: entry.updated_at,
        // Add relevance score (you can enhance this with actual scoring)
        relevance_score: body.query ? calculateRelevanceScore(entry, body.query) : 1
      })) || []
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Knowledge base search error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Simple relevance scoring function
function calculateRelevanceScore(entry: any, query: string): number {
  const queryLower = query.toLowerCase();
  let score = 0;

  // Title matches get higher score
  if (entry.title.toLowerCase().includes(queryLower)) {
    score += 3;
  }

  // Content matches
  if (entry.content.toLowerCase().includes(queryLower)) {
    score += 1;
  }

  // Tag matches
  const tagMatches = entry.tags?.filter((tag: string) => 
    tag.toLowerCase().includes(queryLower)
  ).length || 0;
  score += tagMatches * 2;

  return Math.max(score, 0.1); // Minimum score to avoid zero
}