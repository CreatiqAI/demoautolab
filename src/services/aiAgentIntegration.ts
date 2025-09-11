// Commercial AI Agent Integration for Knowledge Base
import { supabase } from '@/lib/supabase';

export interface CustomerQuery {
  question: string;
  sessionId?: string;
  customerType?: 'all' | 'premium' | 'basic';
  context?: string;
}

export interface AIResponse {
  answer: string;
  sources: KnowledgeSource[];
  confidence: number;
  responseTime: number;
  needsHumanReview: boolean;
  suggestions?: string[];
  followUpQuestions?: string[];
}

export interface KnowledgeSource {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  confidence: number;
  relevanceScore: number;
}

export interface AIInteractionLog {
  id?: string;
  customerQuestion: string;
  matchedEntries: string[];
  aiResponse: string;
  confidenceScore: number;
  customerSatisfaction?: number;
  feedback?: string;
  sessionId?: string;
  responseTimeMs: number;
  createdAt: Date;
}

export class AIAgentIntegration {
  private static instance: AIAgentIntegration;
  
  public static getInstance(): AIAgentIntegration {
    if (!AIAgentIntegration.instance) {
      AIAgentIntegration.instance = new AIAgentIntegration();
    }
    return AIAgentIntegration.instance;
  }

  /**
   * Main method to answer customer questions using the knowledge base
   */
  async answerCustomerQuestion(query: CustomerQuery): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      console.log('Processing customer question:', query.question);
      
      // Step 1: Find relevant knowledge base entries
      const relevantEntries = await this.searchKnowledgeBase(query);
      
      if (relevantEntries.length === 0) {
        return this.createNoResultsResponse(startTime);
      }
      
      // Step 2: Generate AI response based on relevant entries
      const aiResponse = await this.generateAIResponse(query, relevantEntries);
      
      // Step 3: Log the interaction
      await this.logInteraction(query, relevantEntries, aiResponse, startTime);
      
      return aiResponse;
      
    } catch (error) {
      console.error('Error processing customer question:', error);
      return this.createErrorResponse(startTime);
    }
  }

  /**
   * Search knowledge base using both keyword and semantic search
   */
  private async searchKnowledgeBase(query: CustomerQuery): Promise<KnowledgeSource[]> {
    try {
      console.log('Searching knowledge base for:', query.question);
      
      // For now, use basic search since commercial function isn't deployed yet
      return await this.basicKnowledgeSearch(query);
      
    } catch (error) {
      console.error('Error in knowledge base search:', error);
      return await this.basicKnowledgeSearch(query);
    }
  }

  /**
   * Fallback basic search when commercial search isn't available
   */
  private async basicKnowledgeSearch(query: CustomerQuery): Promise<KnowledgeSource[]> {
    try {
      console.log('Starting basic knowledge search...');
      
      // Smart keyword extraction with stop words filtering
      const searchTerms = this.extractKeywords(query.question);
      
      console.log('Search terms:', searchTerms);
      
      if (searchTerms.length === 0) {
        console.log('No valid search terms found');
        return [];
      }
      
      // Try multiple search strategies
      let results: any[] = [];
      
      // Strategy 1: Exact phrase search first (best match)
      if (searchTerms.length > 1) {
        try {
          const phrase = searchTerms.join(' ');
          const { data: phraseResults, error: phraseError } = await supabase
            .from('knowledge_base')
            .select('id, title, content, category, confidence_score, tags, is_approved')
            .eq('is_approved', true)
            .or(`title.ilike.%${phrase}%,content.ilike.%${phrase}%`)
            .order('confidence_score', { ascending: false })
            .limit(3);
          
          if (!phraseError && phraseResults && phraseResults.length > 0) {
            results = [...results, ...phraseResults];
            console.log('Found', phraseResults.length, 'results from phrase search');
          }
        } catch (err) {
          console.warn('Phrase search failed:', err);
        }
      }
      
      // Strategy 2: Individual keyword search with approved entries
      try {
        const { data: titleResults, error: titleError } = await supabase
          .from('knowledge_base')
          .select('id, title, content, category, confidence_score, tags, is_approved')
          .eq('is_approved', true)
          .or(
            searchTerms.map(term => 
              `title.ilike.%${term}%,content.ilike.%${term}%,tags.cs.{${term}}`
            ).join(',')
          )
          .order('confidence_score', { ascending: false })
          .limit(5);
        
        if (!titleError && titleResults) {
          // Remove duplicates from phrase search
          const newResults = titleResults.filter(item => 
            !results.some(existing => existing.id === item.id)
          );
          results = [...results, ...newResults];
          console.log('Found', newResults.length, 'new results from keyword search');
        }
      } catch (err) {
        console.warn('Keyword search failed:', err);
      }
      
      // Strategy 3: If no approved results, search all entries
      if (results.length === 0) {
        try {
          const { data: allResults, error: allError } = await supabase
            .from('knowledge_base')
            .select('id, title, content, category, confidence_score, tags, is_approved')
            .or(
              searchTerms.map(term => 
                `title.ilike.%${term}%,content.ilike.%${term}%,tags.cs.{${term}}`
              ).join(',')
            )
            .order('confidence_score', { ascending: false })
            .limit(8);
          
          if (!allError && allResults) {
            results = allResults;
            console.log('Found', results.length, 'results from all entries search');
          }
        } catch (err) {
          console.warn('All entries search failed:', err);
        }
      }
      
      // Strategy 4: Fallback - get any entries if nothing found
      if (results.length === 0) {
        console.log('No keyword matches found, trying fallback search...');
        try {
          const { data: fallbackResults, error: fallbackError } = await supabase
            .from('knowledge_base')
            .select('id, title, content, category, confidence_score, tags, is_approved')
            .order('confidence_score', { ascending: false })
            .limit(3);
          
          if (!fallbackError && fallbackResults) {
            results = fallbackResults;
            console.log('Using fallback results:', results.length, 'entries');
          }
        } catch (err) {
          console.warn('Fallback search failed:', err);
        }
      }
      
      console.log('Total search results:', results.length);
      
      // Convert to KnowledgeSource format and calculate relevance
      const sources = results.map(entry => {
        const relevanceScore = this.calculateRelevance(query.question, entry);
        return {
          id: entry.id,
          title: entry.title,
          excerpt: this.createExcerpt(entry.content),
          category: entry.category || 'General',
          confidence: entry.confidence_score || 0.5,
          relevanceScore: relevanceScore
        };
      });
      
      // Sort by relevance and confidence
      sources.sort((a, b) => {
        const aScore = (a.relevanceScore * 0.6) + (a.confidence * 0.4);
        const bScore = (b.relevanceScore * 0.6) + (b.confidence * 0.4);
        return bScore - aScore;
      });
      
      console.log('Returning', sources.length, 'processed sources');
      return sources.slice(0, 5); // Return top 5 results
      
    } catch (error) {
      console.error('Error in basic search:', error);
      return [];
    }
  }

  /**
   * Generate AI response based on relevant knowledge entries
   */
  private async generateAIResponse(query: CustomerQuery, sources: KnowledgeSource[]): Promise<AIResponse> {
    const responseTime = Date.now();
    
    try {
      console.log('Generating AI response for:', query.question);
      console.log('Using', sources.length, 'knowledge sources');
      
      // Build context from relevant entries
      const context = this.buildContext(sources);
      
      // Use AI to generate intelligent response
      const answer = await this.generateIntelligentResponse(query, sources, context);
      
      const confidence = this.calculateOverallConfidence(sources);
      const needsHumanReview = confidence < 0.6 || sources.length === 0;
      
      return {
        answer,
        sources,
        confidence,
        responseTime: Date.now() - responseTime,
        needsHumanReview,
        suggestions: this.generateSuggestions(query, sources),
        followUpQuestions: this.generateFollowUpQuestions(query, sources)
      };
      
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw error;
    }
  }

  /**
   * Generate intelligent AI response using OpenAI
   */
  private async generateIntelligentResponse(query: CustomerQuery, sources: KnowledgeSource[], context: string): Promise<string> {
    try {
      if (sources.length === 0) {
        return "I couldn't find specific information about your question in our knowledge base. Please contact our support team for personalized assistance.";
      }

      console.log('Using AI to generate intelligent response...');

      // Prepare the prompt for AI
      const prompt = this.buildAIPrompt(query.question, sources, context);
      
      // Try to use the existing OpenAI service
      try {
        const aiResponse = await this.callOpenAIService(query.question, sources);
        if (aiResponse && aiResponse.trim()) {
          console.log('AI response generated successfully');
          return aiResponse;
        }
      } catch (aiError) {
        console.warn('OpenAI service call failed, using structured fallback:', aiError);
      }
      
      // Fallback to structured response if AI fails
      return this.generateStructuredAnswer(query, sources, context);
      
    } catch (error) {
      console.error('Error in intelligent response generation:', error);
      return this.generateStructuredAnswer(query, sources, context);
    }
  }

  /**
   * Call OpenAI service for response generation
   */
  private async callOpenAIService(question: string, sources: KnowledgeSource[]): Promise<string> {
    try {
      console.log('Calling customer service AI edge function...');
      
      // Use dedicated customer service edge function
      const { data, error } = await supabase.functions.invoke('customer-service-ai', {
        body: {
          question: question,
          context: this.buildContext(sources),
          sources: sources.map(source => ({
            title: source.title,
            content: source.excerpt,
            category: source.category
          }))
        }
      });

      if (error) {
        console.error('Customer service AI error:', error);
        throw new Error(`AI service error: ${error.message}`);
      }

      if (data && data.success && data.response) {
        console.log('AI response received successfully');
        console.log('Tokens used:', data.tokens_used);
        return data.response;
      }

      if (data && data.fallback_response) {
        console.log('Using fallback response from AI service');
        return data.fallback_response;
      }

      throw new Error('No response from AI service');
      
    } catch (error) {
      console.error('AI service call failed:', error);
      throw error;
    }
  }

  /**
   * Build AI prompt for response generation
   */
  private buildAIPrompt(question: string, sources: KnowledgeSource[], context: string): string {
    const sourceInfo = sources.map((source, index) => 
      `${index + 1}. ${source.title} (${source.category})\n   ${source.excerpt}`
    ).join('\n\n');

    return `You are a customer service AI assistant. A customer has asked: "${question}"

Based on our company's knowledge base, here are the relevant policies and information:

${sourceInfo}

Please provide a helpful, accurate response to the customer's question using ONLY the information provided above. Follow these guidelines:

1. Be direct and helpful
2. Reference specific policies when relevant
3. If the question asks about return policies, shipping, payments, etc., provide the specific details from our policies
4. If information is missing, acknowledge what you can answer and suggest contacting support for additional details
5. Keep the response conversational but professional
6. Don't make up information not contained in the provided sources

Customer Question: ${question}

Your Response:`;
  }

  /**
   * Create a structured answer based on available knowledge (fallback)
   */
  private generateStructuredAnswer(query: CustomerQuery, sources: KnowledgeSource[], context: string): string {
    if (sources.length === 0) {
      return "I couldn't find specific information about your question in our knowledge base. Please contact our support team for personalized assistance.";
    }
    
    const topSource = sources[0];
    let answer = `Based on our ${topSource.category.toLowerCase()} information:\n\n`;
    
    // Add main answer from top source
    answer += `${topSource.excerpt}\n\n`;
    
    // Add additional relevant information
    if (sources.length > 1) {
      answer += "Additional relevant information:\n";
      sources.slice(1, 3).forEach((source, index) => {
        answer += `${index + 1}. ${source.excerpt}\n`;
      });
      answer += "\n";
    }
    
    // Add contact info for complex queries
    if (sources.some(s => s.confidence < 0.7)) {
      answer += "For more detailed information or if you have specific questions, please contact our support team.";
    }
    
    return answer;
  }

  /**
   * Log interaction for analytics and improvement
   */
  private async logInteraction(
    query: CustomerQuery, 
    sources: KnowledgeSource[], 
    response: AIResponse, 
    startTime: number
  ): Promise<void> {
    try {
      // For now, just log to console since ai_interactions table may not exist yet
      const interactionLog = {
        customerQuestion: query.question,
        matchedEntries: sources.map(s => s.id),
        aiResponse: response.answer,
        confidenceScore: response.confidence,
        sessionId: query.sessionId,
        responseTimeMs: Date.now() - startTime,
        sourcesCount: sources.length,
        timestamp: new Date().toISOString()
      };
      
      console.log('AI Interaction Log:', interactionLog);
      
      // Database logging disabled - using console only for now
      // Uncomment below if you want to try database logging
      /*
      try {
        const { error } = await supabase
          .from('ai_interactions')
          .insert({
            customer_question: query.question,
            matched_entries: sources.map(s => s.id),
            ai_response: response.answer,
            confidence_score: response.confidence,
            session_id: query.sessionId,
            response_time_ms: Date.now() - startTime
          });
        
        if (error) {
          console.log('Database logging not available:', error.message);
        } else {
          console.log('Successfully logged to database');
        }
      } catch (dbError) {
        console.log('Database logging failed:', dbError);
      }
      */
      
    } catch (error) {
      console.error('Error logging interaction:', error);
    }
  }

  /**
   * Extract meaningful keywords from customer question
   */
  private extractKeywords(question: string): string[] {
    // Common stop words to filter out
    const stopWords = new Set([
      'what', 'is', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'how', 'when', 'where', 'why', 'who', 'which', 'can', 'could', 'would', 'should', 'will', 'may', 'might',
      'do', 'does', 'did', 'have', 'has', 'had', 'be', 'am', 'is', 'are', 'was', 'were', 'been', 'being',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
      'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those', 'there', 'here', 'then', 'than',
      'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off',
      'over', 'under', 'again', 'further', 'once', 'get', 'got', 'getting', 'please'
    ]);

    // Business-specific important keywords (never filter these out)
    const importantKeywords = new Set([
      'address', 'phone', 'email', 'contact', 'return', 'refund', 'shipping', 'delivery', 'payment', 'price',
      'cost', 'fee', 'warranty', 'guarantee', 'policy', 'terms', 'conditions', 'account', 'login', 'password',
      'order', 'cancel', 'exchange', 'support', 'help', 'service', 'location', 'hours', 'time', 'schedule',
      'product', 'item', 'buy', 'purchase', 'sell', 'sale', 'discount', 'coupon', 'promo', 'offer'
    ]);

    const words = question
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/) // Split by whitespace
      .filter(word => word.length > 0);

    const keywords: string[] = [];
    
    for (const word of words) {
      // Always include important business keywords
      if (importantKeywords.has(word)) {
        keywords.push(word);
        continue;
      }
      
      // Skip stop words
      if (stopWords.has(word)) {
        continue;
      }
      
      // Include words that are 3+ characters (but not stop words)
      if (word.length >= 3) {
        keywords.push(word);
      }
    }

    // If no keywords found, extract the most meaningful words anyway
    if (keywords.length === 0) {
      const fallbackWords = words
        .filter(word => word.length >= 3 && !stopWords.has(word))
        .slice(0, 3);
      keywords.push(...fallbackWords);
    }

    // Remove duplicates and limit to reasonable number
    return [...new Set(keywords)].slice(0, 6);
  }

  /**
   * Utility methods
   */
  private createExcerpt(content: string, maxLength: number = 200): string {
    if (content.length <= maxLength) return content;
    
    const truncated = content.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > 0 
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...';
  }

  private buildContext(sources: KnowledgeSource[]): string {
    return sources
      .map(source => `${source.title}: ${source.excerpt}`)
      .join('\n\n');
  }

  private calculateRelevance(question: string, entry: any): number {
    const questionWords = question.toLowerCase().split(' ');
    const entryText = (entry.title + ' ' + entry.content).toLowerCase();
    
    const matchCount = questionWords.filter(word => 
      word.length > 3 && entryText.includes(word)
    ).length;
    
    return Math.min(1.0, matchCount / Math.max(1, questionWords.length));
  }

  private calculateOverallConfidence(sources: KnowledgeSource[]): number {
    if (sources.length === 0) return 0;
    
    const avgConfidence = sources.reduce((sum, source) => sum + source.confidence, 0) / sources.length;
    const avgRelevance = sources.reduce((sum, source) => sum + source.relevanceScore, 0) / sources.length;
    
    return (avgConfidence + avgRelevance) / 2;
  }

  private generateSuggestions(query: CustomerQuery, sources: KnowledgeSource[]): string[] {
    if (sources.length === 0) {
      return [
        "Try asking about our general policies",
        "Check our FAQ section",
        "Contact our support team directly"
      ];
    }
    
    const categories = [...new Set(sources.map(s => s.category))];
    return categories.map(category => `Learn more about ${category}`);
  }

  private generateFollowUpQuestions(query: CustomerQuery, sources: KnowledgeSource[]): string[] {
    const commonFollowUps = [
      "How do I contact support?",
      "What are your business hours?",
      "Is there anything else I should know?"
    ];
    
    // Add category-specific follow-ups
    if (sources.some(s => s.category.includes('Shipping'))) {
      commonFollowUps.unshift("What are the shipping costs?", "How long does delivery take?");
    }
    
    if (sources.some(s => s.category.includes('Return'))) {
      commonFollowUps.unshift("How do I start a return?", "What is your return policy?");
    }
    
    return commonFollowUps.slice(0, 3);
  }

  private createNoResultsResponse(startTime: number): AIResponse {
    return {
      answer: "I couldn't find specific information about your question in our knowledge base. Our support team would be happy to help you with personalized assistance.",
      sources: [],
      confidence: 0.1,
      responseTime: Date.now() - startTime,
      needsHumanReview: true,
      suggestions: [
        "Contact our support team",
        "Check our FAQ section",
        "Try rephrasing your question"
      ],
      followUpQuestions: [
        "How can I contact support?",
        "What are your business hours?",
        "Do you have a FAQ section?"
      ]
    };
  }

  private createErrorResponse(startTime: number): AIResponse {
    return {
      answer: "I'm experiencing technical difficulties right now. Please try again in a moment or contact our support team for immediate assistance.",
      sources: [],
      confidence: 0,
      responseTime: Date.now() - startTime,
      needsHumanReview: true,
      suggestions: ["Try again later", "Contact support"],
      followUpQuestions: ["How can I contact support?"]
    };
  }

  /**
   * Public methods for analytics and management
   */
  async getInteractionStats(days: number = 30): Promise<any> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      
      const { data, error } = await supabase
        .from('ai_interactions')
        .select('confidence_score, customer_satisfaction, response_time_ms, created_at')
        .gte('created_at', since.toISOString());
      
      if (error || !data) return null;
      
      return {
        totalInteractions: data.length,
        averageConfidence: data.reduce((sum, item) => sum + item.confidence_score, 0) / data.length,
        averageResponseTime: data.reduce((sum, item) => sum + item.response_time_ms, 0) / data.length,
        averageSatisfaction: data
          .filter(item => item.customer_satisfaction)
          .reduce((sum, item) => sum + item.customer_satisfaction, 0) / 
          data.filter(item => item.customer_satisfaction).length || 0
      };
      
    } catch (error) {
      console.error('Error getting interaction stats:', error);
      return null;
    }
  }

  async recordCustomerFeedback(interactionId: string, satisfaction: number, feedback?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_interactions')
        .update({ 
          customer_satisfaction: satisfaction,
          feedback: feedback 
        })
        .eq('id', interactionId);
      
      return !error;
    } catch (error) {
      console.error('Error recording feedback:', error);
      return false;
    }
  }
}

// Export singleton instance
export const aiAgent = AIAgentIntegration.getInstance();