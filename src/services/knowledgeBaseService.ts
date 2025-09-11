import { supabase } from '@/lib/supabase';

export interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseSearchParams {
  query?: string;
  category?: string;
  tags?: string[];
  limit?: number;
}

export class KnowledgeBaseService {
  
  static async searchKnowledgeBase(params: KnowledgeBaseSearchParams = {}): Promise<KnowledgeBaseEntry[]> {
    try {
      let query = supabase
        .from('knowledge_base')
        .select('*');

      // Apply search filter if query is provided
      if (params.query) {
        query = query.or(`title.ilike.%${params.query}%,content.ilike.%${params.query}%`);
      }

      // Apply category filter
      if (params.category) {
        query = query.eq('category', params.category);
      }

      // Apply tags filter
      if (params.tags && params.tags.length > 0) {
        query = query.overlaps('tags', params.tags);
      }

      // Apply limit
      if (params.limit) {
        query = query.limit(params.limit);
      }

      // Order by relevance and recency
      query = query.order('updated_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Knowledge base search error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      throw error;
    }
  }

  static async getEntryById(id: string): Promise<KnowledgeBaseEntry | null> {
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Entry not found
        }
        throw new Error(`Error fetching knowledge base entry: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error fetching knowledge base entry:', error);
      throw error;
    }
  }

  static async getAllCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('category')
        .order('category');

      if (error) {
        throw new Error(`Error fetching categories: ${error.message}`);
      }

      // Get unique categories
      const categories = [...new Set(data.map(item => item.category))];
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  static async getAllTags(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('tags');

      if (error) {
        throw new Error(`Error fetching tags: ${error.message}`);
      }

      // Flatten and get unique tags
      const allTags = data.reduce((acc: string[], item) => {
        return acc.concat(item.tags || []);
      }, []);

      const uniqueTags = [...new Set(allTags)].sort();
      return uniqueTags;
    } catch (error) {
      console.error('Error fetching tags:', error);
      throw error;
    }
  }

  // Method specifically designed for chatbot integration
  static async findBestMatch(userQuery: string, limit: number = 5): Promise<KnowledgeBaseEntry[]> {
    try {
      // First, try full-text search
      const { data, error } = await supabase
        .rpc('search_knowledge_base', {
          search_query: userQuery,
          match_limit: limit
        });

      if (error) {
        console.warn('Full-text search failed, falling back to basic search:', error.message);
        // Fallback to basic search
        return await this.searchKnowledgeBase({ query: userQuery, limit });
      }

      return data || [];
    } catch (error) {
      console.error('Error finding best match:', error);
      // Final fallback to basic search
      return await this.searchKnowledgeBase({ query: userQuery, limit });
    }
  }
}

// Utility function for n8n webhook integration
export const createKnowledgeBaseWebhookResponse = (entries: KnowledgeBaseEntry[]) => {
  return {
    success: true,
    count: entries.length,
    data: entries.map(entry => ({
      id: entry.id,
      title: entry.title,
      content: entry.content,
      category: entry.category,
      tags: entry.tags,
      relevance_score: 1, // Could be enhanced with actual scoring
      updated_at: entry.updated_at
    }))
  };
};