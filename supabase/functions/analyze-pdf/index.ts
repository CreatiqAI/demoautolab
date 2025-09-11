import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PDFAnalysisRequest {
  extractedText: string;
  documentTitle: string;
  maxEntries?: number;
  focusAreas?: string[];
}

interface KnowledgeBaseExtraction {
  title: string;
  content: string;
  category: string;
  tags: string[];
  confidence_score: number;
  section_reference?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { extractedText, documentTitle, maxEntries = 50, focusAreas }: PDFAnalysisRequest = await req.json();

    if (!extractedText || !documentTitle) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: extractedText and documentTitle' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Your OpenAI API key from environment variables
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    const defaultFocusAreas = [
      'Policies', 'Terms and Conditions', 'FAQ', 'Procedures', 
      'Guidelines', 'Rules', 'Requirements', 'Benefits', 'Limitations'
    ];

    const areasToFocus = focusAreas || defaultFocusAreas;

    const prompt = `You are an AI knowledge base analyst. Analyze the complete document content below and identify what information would be valuable for a customer service knowledge base.

Document Content (Complete Text):
${extractedText.substring(0, 20000)}${extractedText.length > 20000 ? '...[content continues]' : ''}

ANALYSIS INSTRUCTIONS:
1. READ AND UNDERSTAND the complete document content above
2. IDENTIFY all information that would help answer customer questions
3. CREATE individual knowledge base entries for each distinct piece of useful information
4. EXTRACT up to ${maxEntries} separate entries

What to look for and extract:
- Terms and conditions (each term as separate entry)
- Policies and procedures
- Rules and requirements  
- Important information customers need to know
- Processes and how-to information
- Limitations, restrictions, or exceptions
- Contact information or support details
- Pricing, fees, or cost information
- Time frames and deadlines
- Rights and responsibilities

For EACH valuable piece of information found, create an entry with:
- Title: Clear, descriptive title
- Content: Helpful explanation that answers customer questions
- Category: Most appropriate category
- Tags: Relevant search terms

Respond with a JSON object in this exact format:
{
  "summary": "Analysis summary: Found [X] pieces of information valuable for customer service knowledge base from document about [topic]",
  "entries": [
    {
      "title": "Clear, descriptive title for this information",
      "content": "Helpful explanation that would assist customer service representatives or customers. Include relevant details like timeframes, requirements, processes, etc.",
      "category": "Most appropriate: Product Information, Shipping & Returns, Technical Support, Company Policies, Troubleshooting, General FAQ, Terms & Conditions, or Other",
      "tags": ["relevant", "search", "terms"],
      "confidence_score": 0.9,
      "section_reference": "Source reference if identifiable"
    }
  ]
}

QUALITY FOCUS:
- Each entry should provide value to customer service
- Include all relevant details in the content
- Make titles searchable and clear
- Cover ALL meaningful information from the document
- Don't skip content just because it seems minor - extract everything useful

Analyze the complete text thoroughly and extract ALL valuable information for the knowledge base.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert knowledge base analyst. Your job is to read and understand complete documents, then intelligently identify what information would be valuable for customer service. Analyze the full content and extract ALL useful information as individual knowledge base entries. Focus on being comprehensive and helpful - extract everything that would help answer customer questions.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const openAIResult = await response.json();
    const completion = openAIResult.choices[0]?.message?.content;

    if (!completion) {
      throw new Error('No response from OpenAI');
    }

    // Parse the structured JSON response
    let analysisResult: { entries: KnowledgeBaseExtraction[]; summary: string };
    
    try {
      // Clean the response to extract JSON
      const jsonMatch = completion.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      analysisResult = {
        entries: parsed.entries?.map((entry: any) => ({
          title: entry.title || 'Untitled Entry',
          content: entry.content || '',
          category: validateCategory(entry.category),
          tags: Array.isArray(entry.tags) ? entry.tags : [],
          confidence_score: Math.max(0.1, Math.min(1.0, entry.confidence_score || 0.5)),
          section_reference: entry.section_reference,
          customer_scenarios: Array.isArray(entry.customer_scenarios) ? entry.customer_scenarios : [],
          related_questions: Array.isArray(entry.related_questions) ? entry.related_questions : [],
          key_points: Array.isArray(entry.key_points) ? entry.key_points : []
        })) || [],
        summary: parsed.summary || 'Analysis completed'
      };
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      
      // Fallback parsing
      analysisResult = {
        entries: [{
          title: 'Document Analysis',
          content: completion.substring(0, 1000) + (completion.length > 1000 ? '...' : ''),
          category: 'Other',
          tags: ['document', 'analysis'],
          confidence_score: 0.3
        }],
        summary: 'Basic extraction completed with errors'
      };
    }

    const totalTokens = openAIResult.usage?.total_tokens || 0;
    const estimatedCost = calculateCost(totalTokens, 'gpt-4-turbo-preview');

    const result = {
      success: true,
      entries: analysisResult.entries,
      summary: analysisResult.summary,
      total_tokens: totalTokens,
      estimated_cost: estimatedCost,
      processing_time: 0
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('PDF analysis error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error',
        entries: [],
        summary: '',
        total_tokens: 0,
        estimated_cost: 0,
        processing_time: 0
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function validateCategory(category: string): string {
  const validCategories = [
    'Product Information',
    'Shipping & Returns', 
    'Technical Support',
    'Company Policies',
    'Troubleshooting',
    'General FAQ',
    'Terms & Conditions',
    'Other'
  ];
  
  return validCategories.includes(category) ? category : 'Other';
}

function calculateCost(tokens: number, model: string): number {
  // Pricing as of 2024 (update as needed)
  const pricing = {
    'gpt-4-turbo-preview': { input: 0.01, output: 0.03 }, // per 1K tokens
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.001, output: 0.002 }
  };

  const modelPricing = pricing[model as keyof typeof pricing] || pricing['gpt-4-turbo-preview'];
  
  // Rough estimate assuming 70% input, 30% output
  const inputTokens = tokens * 0.7;
  const outputTokens = tokens * 0.3;
  
  return (
    (inputTokens / 1000) * modelPricing.input +
    (outputTokens / 1000) * modelPricing.output
  );
}