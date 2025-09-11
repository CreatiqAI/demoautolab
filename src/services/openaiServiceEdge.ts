import { supabase } from '@/lib/supabase';

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

export class OpenAIServiceEdge {
  
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
      // Call the Supabase Edge Function instead of OpenAI directly
      const { data, error } = await supabase.functions.invoke('analyze-pdf', {
        body: {
          extractedText,
          documentTitle,
          maxEntries: options.maxEntries || 20,
          focusAreas: options.focusAreas
        }
      });

      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        entries: data.entries,
        summary: data.summary,
        total_tokens: data.total_tokens,
        estimated_cost: data.estimated_cost,
        processing_time: processingTime
      };

    } catch (error) {
      console.error('Error analyzing PDF with Edge Function:', error);
      
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

  // Method to improve existing knowledge base entries
  static async improveKnowledgeBaseEntry(
    title: string,
    content: string,
    context: string = ''
  ): Promise<{ title: string; content: string; tags: string[] }> {
    try {
      const { data, error } = await supabase.functions.invoke('improve-entry', {
        body: {
          title,
          content,
          context
        }
      });

      if (error || !data) {
        throw new Error('Failed to improve entry');
      }

      return {
        title: data.title || title,
        content: data.content || content,
        tags: data.tags || []
      };
    } catch (error) {
      console.error('Error improving knowledge base entry:', error);
      return { title, content, tags: [] };
    }
  }

  // Method to generate suggested questions for knowledge base entries
  static async generateSuggestedQuestions(content: string): Promise<string[]> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: {
          content: content.substring(0, 1000)
        }
      });

      if (error || !data) {
        throw new Error('Failed to generate questions');
      }

      return data.questions || [];
    } catch (error) {
      console.error('Error generating questions:', error);
      return [];
    }
  }
}