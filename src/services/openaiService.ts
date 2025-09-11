import OpenAI from 'openai';

// Your OpenAI API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Only for development, move to server-side in production
});

export interface KnowledgeBaseExtraction {
  title: string;
  content: string;
  category: string;
  tags: string[];
  confidence_score: number;
  page_reference?: number;
  section_reference?: string;
}

export interface PDFAnalysisResult {
  success: boolean;
  entries: KnowledgeBaseExtraction[];
  summary: string;
  total_tokens: number;
  estimated_cost: number;
  processing_time: number;
  error?: string;
}

export class OpenAIService {
  
  static async analyzePDFContent(
    extractedText: string,
    documentTitle: string,
    options: {
      maxEntries?: number;
      focusAreas?: string[];
      language?: string;
    } = {}
  ): Promise<PDFAnalysisResult> {
    const startTime = Date.now();
    
    try {
      const prompt = this.buildAnalysisPrompt(extractedText, documentTitle, options);
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting structured knowledge base entries from PDF documents. 
            Your task is to analyze the document content and create comprehensive, well-structured knowledge base entries 
            that would be useful for a customer service chatbot. Focus on extracting policies, procedures, FAQs, 
            terms and conditions, and any information that would help answer customer questions.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      });

      const completion = response.choices[0]?.message?.content;
      if (!completion) {
        throw new Error('No response from OpenAI');
      }

      // Parse the structured JSON response
      const analysisResult = this.parseAnalysisResponse(completion);
      
      const processingTime = Date.now() - startTime;
      const totalTokens = response.usage?.total_tokens || 0;
      const estimatedCost = this.calculateCost(totalTokens, 'gpt-4-turbo-preview');

      return {
        success: true,
        entries: analysisResult.entries,
        summary: analysisResult.summary,
        total_tokens: totalTokens,
        estimated_cost: estimatedCost,
        processing_time: processingTime
      };

    } catch (error) {
      console.error('Error analyzing PDF with OpenAI:', error);
      
      return {
        success: false,
        entries: [],
        summary: '',
        total_tokens: 0,
        estimated_cost: 0,
        processing_time: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private static buildAnalysisPrompt(
    text: string, 
    title: string, 
    options: { maxEntries?: number; focusAreas?: string[]; language?: string }
  ): string {
    const maxEntries = options.maxEntries || 20;
    const focusAreas = options.focusAreas || [
      'Policies', 'Terms and Conditions', 'FAQ', 'Procedures', 
      'Guidelines', 'Rules', 'Requirements', 'Benefits', 'Limitations'
    ];
    
    return `
Please analyze the following document titled "${title}" and extract knowledge base entries that would be useful for a customer service chatbot.

Document Content:
${text.substring(0, 15000)} ${text.length > 15000 ? '...[truncated]' : ''}

Instructions:
1. Extract up to ${maxEntries} distinct knowledge base entries
2. Focus on areas like: ${focusAreas.join(', ')}
3. Each entry should be self-contained and answer a potential customer question
4. Provide a confidence score (0.1-1.0) based on how clear and useful the information is
5. Categorize each entry appropriately
6. Include relevant tags for searchability
7. If the content spans multiple pages, note the page reference if possible

Please respond with a JSON object in this exact format:
{
  "summary": "Brief summary of the document and what types of information were extracted",
  "entries": [
    {
      "title": "Clear, descriptive title for this knowledge base entry",
      "content": "Detailed content that fully answers the question or explains the policy/procedure",
      "category": "One of: Product Information, Shipping & Returns, Technical Support, Company Policies, Troubleshooting, General FAQ, Terms & Conditions, Other",
      "tags": ["relevant", "searchable", "tags"],
      "confidence_score": 0.95,
      "section_reference": "Section name or page number if identifiable"
    }
  ]
}

Focus on extracting information that customers would commonly ask about, such as:
- Return policies and procedures
- Shipping information and timeframes
- Payment terms and methods
- Account requirements and restrictions  
- Service limitations and exclusions
- Contact information and support hours
- Warranty and guarantee terms
- Privacy and data usage policies
- Refund and cancellation policies
- Product specifications and requirements

Make sure each entry is complete, accurate, and would be helpful for answering customer inquiries.
`;
  }

  private static parseAnalysisResponse(response: string): {
    entries: KnowledgeBaseExtraction[];
    summary: string;
  } {
    try {
      // Clean the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        entries: parsed.entries?.map((entry: any) => ({
          title: entry.title || 'Untitled Entry',
          content: entry.content || '',
          category: this.validateCategory(entry.category),
          tags: Array.isArray(entry.tags) ? entry.tags : [],
          confidence_score: Math.max(0.1, Math.min(1.0, entry.confidence_score || 0.5)),
          section_reference: entry.section_reference
        })) || [],
        summary: parsed.summary || 'Analysis completed'
      };
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      
      // Fallback parsing - try to extract some basic information
      return {
        entries: [{
          title: 'Document Analysis',
          content: response.substring(0, 1000) + (response.length > 1000 ? '...' : ''),
          category: 'Other',
          tags: ['document', 'analysis'],
          confidence_score: 0.3
        }],
        summary: 'Basic extraction completed with errors'
      };
    }
  }

  private static validateCategory(category: string): string {
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

  private static calculateCost(tokens: number, model: string): number {
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

  // Method to improve existing knowledge base entries
  static async improveKnowledgeBaseEntry(
    title: string,
    content: string,
    context: string = ''
  ): Promise<{ title: string; content: string; tags: string[] }> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at improving knowledge base entries for customer service. Make them clearer, more comprehensive, and better formatted.'
          },
          {
            role: 'user',
            content: `Please improve this knowledge base entry:

Title: ${title}
Content: ${content}
${context ? `Additional Context: ${context}` : ''}

Please respond with a JSON object:
{
  "title": "improved title",
  "content": "improved content with better formatting and clarity",
  "tags": ["suggested", "relevant", "tags"]
}`
          }
        ],
        temperature: 0.4,
        max_tokens: 1000
      });

      const result = response.choices[0]?.message?.content;
      if (result) {
        const parsed = JSON.parse(result);
        return {
          title: parsed.title || title,
          content: parsed.content || content,
          tags: parsed.tags || []
        };
      }
    } catch (error) {
      console.error('Error improving knowledge base entry:', error);
    }

    return { title, content, tags: [] };
  }

  // Method to generate suggested questions for knowledge base entries
  static async generateSuggestedQuestions(content: string): Promise<string[]> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Generate 3-5 natural customer questions that this knowledge base entry would answer.'
          },
          {
            role: 'user',
            content: `Content: ${content.substring(0, 1000)}

Please respond with a JSON array of questions:
["question 1", "question 2", "question 3"]`
          }
        ],
        temperature: 0.6,
        max_tokens: 300
      });

      const result = response.choices[0]?.message?.content;
      if (result) {
        return JSON.parse(result);
      }
    } catch (error) {
      console.error('Error generating questions:', error);
    }

    return [];
  }
}