import { supabase } from '@/lib/supabase';
import { OpenAIServiceEdge as OpenAIService, PDFAnalysisResult } from './openaiServiceEdge';
import { extractTextFromPDF, estimatePDFPageCount } from './pdfTextExtractor';
import { commercialDocumentProcessor, ProcessingResult } from './commercialDocumentProcessor';

export interface PDFUploadResult {
  success: boolean;
  document_id?: string;
  error?: string;
  file_info?: {
    name: string;
    size: number;
    pages: number;
  };
}

export interface DocumentProcessingStatus {
  document_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  current_step: string;
  error_message?: string;
  entries_generated: number;
  estimated_cost: number;
}

// Fallback service that stores PDF data in database instead of storage
export class PDFProcessingServiceFallback {
  
  static async uploadAndProcessPDF(
    file: File,
    title: string,
    description?: string,
    options: {
      autoProcess?: boolean;
      maxEntries?: number;
      focusAreas?: string[];
    } = {}
  ): Promise<PDFUploadResult> {
    try {
      // Validate file
      if (!file.type.includes('pdf')) {
        return { success: false, error: 'File must be a PDF' };
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        return { success: false, error: 'File size must be less than 50MB' };
      }

      // Extract text content from PDF first
      const extractedText = await extractTextFromPDF(file);
      const pageCount = await estimatePDFPageCount(file);

      if (!extractedText.trim()) {
        return { success: false, error: 'Could not extract text from PDF. The file may be image-based or corrupted.' };
      }

      // Convert file to base64 to store in database
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64String = btoa(String.fromCharCode(...uint8Array));

      // Save document record to database with file data
      const { data: documentData, error: dbError } = await supabase
        .from('kb_documents')
        .insert({
          title,
          description,
          file_name: file.name,
          file_path: `base64:${file.name}`, // Indicate this is base64 stored
          file_size: file.size,
          mime_type: file.type,
          total_pages: pageCount,
          extracted_text: extractedText.substring(0, 50000), // Store first 50k chars
          ai_processing_status: options.autoProcess ? 'pending' : 'pending',
          // Store the actual file data in a new column we'll add
          file_data: base64String
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Always start AI processing automatically
      this.startAIProcessing(documentData.id, {
        maxEntries: options.maxEntries || 50,
        focusAreas: options.focusAreas
      });

      return {
        success: true,
        document_id: documentData.id,
        file_info: {
          name: file.name,
          size: file.size,
          pages: pageCount
        }
      };

    } catch (error) {
      console.error('Error uploading PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static async startAIProcessing(
    documentId: string,
    options: {
      maxEntries?: number;
      focusAreas?: string[];
    } = {}
  ): Promise<void> {
    try {
      // Create processing job record
      const { data: jobData, error: jobError } = await supabase
        .from('kb_ai_processing_jobs')
        .insert({
          document_id: documentId,
          status: 'processing',
          progress: 5,
          current_step: 'Starting AI analysis...',
          processing_config: options
        })
        .select()
        .single();

      if (jobError) {
        throw new Error(`Failed to create processing job: ${jobError.message}`);
      }

      // Update document status
      await supabase
        .from('kb_documents')
        .update({ ai_processing_status: 'processing' })
        .eq('id', documentId);

      // Process in background (simulate async processing)
      setTimeout(() => {
        this.processDocumentWithAI(documentId, jobData.id, options);
      }, 1000);

    } catch (error) {
      console.error('Error starting AI processing:', error);
      
      // Update status to failed
      await supabase
        .from('kb_documents')
        .update({ 
          ai_processing_status: 'failed',
          ai_processing_error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', documentId);
    }
  }

  private static async processDocumentWithAI(
    documentId: string,
    jobId: string,
    options: { maxEntries?: number; focusAreas?: string[] }
  ): Promise<void> {
    try {
      // Update progress
      await this.updateProcessingProgress(jobId, 15, 'Retrieving document content...');

      // Get document data
      const { data: document, error: docError } = await supabase
        .from('kb_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError || !document) {
        throw new Error('Document not found');
      }

      await this.updateProcessingProgress(jobId, 30, 'Analyzing content with AI...');

      // Process with OpenAI
      console.log('Starting AI analysis for document:', document.title);
      console.log('Text length:', document.extracted_text?.length || 0);
      console.log('Options:', options);
      
      let analysisResult: PDFAnalysisResult;
      
      try {
        analysisResult = await OpenAIService.analyzePDFContent(
          document.extracted_text,
          document.title,
          options
        );
      } catch (edgeError) {
        console.warn('Edge function failed, trying direct fallback:', edgeError);
        // Use direct processing as fallback
        analysisResult = await this.directTextProcessing(
          document.extracted_text,
          document.title,
          options.maxEntries || 50
        );
      }

      console.log('AI analysis result:', {
        success: analysisResult.success,
        entriesCount: analysisResult.entries?.length || 0,
        error: analysisResult.error
      });

      if (!analysisResult.success) {
        throw new Error(analysisResult.error || 'AI analysis failed');
      }

      // If AI returned no entries, use direct fallback processing
      if (!analysisResult.entries || analysisResult.entries.length === 0) {
        console.log('AI returned no entries, using direct fallback processing');
        analysisResult = await this.directTextProcessing(
          document.extracted_text,
          document.title,
          options.maxEntries || 50
        );
        
        console.log('Fallback processing result:', {
          success: analysisResult.success,
          entriesCount: analysisResult.entries?.length || 0
        });
      }

      await this.updateProcessingProgress(jobId, 60, 'Creating knowledge base entries...');

      // Insert generated knowledge base entries
      console.log('Processing', analysisResult.entries.length, 'entries for insertion');
      
      const knowledgeBaseEntries = analysisResult.entries.map((entry, index) => ({
        title: entry.title,
        content: entry.content,
        category: entry.category,
        tags: entry.tags,
        source: 'pdf_ai_generated' as const,
        source_document_id: documentId,
        confidence_score: entry.confidence_score,
        ai_generated: true,
        is_approved: false, // Require manual approval
        original_text: entry.section_reference,
        page_number: this.extractPageNumber(entry.section_reference)
        // Removed customer_scenarios, related_questions, key_points, priority - these columns don't exist yet
      }));

      console.log('First entry example:', knowledgeBaseEntries[0]);

      if (knowledgeBaseEntries.length === 0) {
        throw new Error('No knowledge base entries were generated from the analysis');
      }

      const { data: insertedEntries, error: entriesError } = await supabase
        .from('knowledge_base')
        .insert(knowledgeBaseEntries)
        .select();

      if (entriesError) {
        console.error('Database insertion error:', entriesError);
        throw new Error(`Failed to save knowledge base entries: ${entriesError.message}`);
      }

      console.log('Successfully inserted', insertedEntries?.length || 0, 'entries');

      await this.updateProcessingProgress(jobId, 90, 'Finalizing...');

      // Update job completion
      await supabase
        .from('kb_ai_processing_jobs')
        .update({
          status: 'completed',
          progress: 100,
          current_step: 'Processing completed',
          total_tokens_used: analysisResult.total_tokens,
          estimated_cost: analysisResult.estimated_cost,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // Update document status
      await supabase
        .from('kb_documents')
        .update({ ai_processing_status: 'completed' })
        .eq('id', documentId);

    } catch (error) {
      console.error('Error processing document with AI:', error);
      
      // Update job as failed
      await supabase
        .from('kb_ai_processing_jobs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // Update document status
      await supabase
        .from('kb_documents')
        .update({ 
          ai_processing_status: 'failed',
          ai_processing_error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', documentId);
    }
  }

  private static async updateProcessingProgress(
    jobId: string,
    progress: number,
    currentStep: string
  ): Promise<void> {
    await supabase
      .from('kb_ai_processing_jobs')
      .update({
        progress,
        current_step: currentStep
      })
      .eq('id', jobId);
  }

  private static extractPageNumber(reference?: string): number | null {
    if (!reference) return null;
    
    const pageMatch = reference.match(/page\s+(\d+)/i);
    return pageMatch ? parseInt(pageMatch[1]) : null;
  }

  static async getProcessingStatus(documentId: string): Promise<DocumentProcessingStatus | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_document_processing_status', { doc_id: documentId });

      if (error || !data || data.length === 0) {
        return null;
      }

      return {
        document_id: data[0].document_id,
        status: data[0].processing_status,
        progress: data[0].progress,
        current_step: data[0].current_step || 'Processing...',
        error_message: data[0].error_message,
        entries_generated: data[0].entries_generated,
        estimated_cost: parseFloat(data[0].estimated_cost) || 0
      };
    } catch (error) {
      console.error('Error getting processing status:', error);
      return null;
    }
  }

  static async getDocumentEntries(documentId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select(`
          *,
          kb_documents!source_document_id (
            title,
            file_name
          )
        `)
        .eq('source_document_id', documentId)
        .order('confidence_score', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting document entries:', error);
      return [];
    }
  }

  static async approveEntry(entryId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .update({ is_approved: true })
        .eq('id', entryId);

      return !error;
    } catch (error) {
      console.error('Error approving entry:', error);
      return false;
    }
  }

  static async downloadDocument(documentId: string): Promise<{ success: boolean; error?: string; blob?: Blob; filename?: string }> {
    try {
      const { data: document, error } = await supabase
        .from('kb_documents')
        .select('file_name, file_data, mime_type')
        .eq('id', documentId)
        .single();

      if (error || !document) {
        return { success: false, error: 'Document not found' };
      }

      if (!document.file_data) {
        return { success: false, error: 'Document file data not available' };
      }

      // Convert base64 back to blob
      try {
        const base64Data = document.file_data;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: document.mime_type || 'application/pdf' });
        
        return {
          success: true,
          blob,
          filename: document.file_name
        };
      } catch (decodeError) {
        return { success: false, error: 'Failed to decode file data' };
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      return { success: false, error: 'Failed to download document' };
    }
  }

  // Direct text processing fallback when edge function fails
  private static async directTextProcessing(
    text: string,
    title: string,
    maxEntries: number
  ): Promise<PDFAnalysisResult> {
    try {
      console.log('Direct processing - text sample:', text.substring(0, 200) + '...');
      
      // Simple pattern-based extraction for terms and conditions
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 5);
      const entries = [];
      let entryCount = 0;

      console.log('Found', lines.length, 'lines to process');

      // First pass: Look for ANY meaningful content that could be useful
      for (let i = 0; i < lines.length && entryCount < maxEntries; i++) {
        const line = lines[i];
        
        // Look for any meaningful content (much broader criteria)
        if (
          line.match(/^\d+\./) ||           // 1. 2. 3.
          line.match(/^[a-z]\)/) ||         // a) b) c)
          line.match(/^[A-Z]\)/) ||         // A) B) C)
          line.match(/^[-•*]/) ||           // bullet points
          line.match(/^[IVX]+\./) ||        // Roman numerals
          line.length > 20 ||               // Any substantial line
          line.toLowerCase().includes('must') ||
          line.toLowerCase().includes('shall') ||
          line.toLowerCase().includes('will') ||
          line.toLowerCase().includes('may') ||
          line.toLowerCase().includes('cannot') ||
          line.toLowerCase().includes('required') ||
          line.toLowerCase().includes('prohibited') ||
          line.toLowerCase().includes('within') ||
          line.toLowerCase().includes('before') ||
          line.toLowerCase().includes('after') ||
          line.toLowerCase().includes('terms') ||
          line.toLowerCase().includes('condition') ||
          line.toLowerCase().includes('policy') ||
          line.toLowerCase().includes('agreement') ||
          line.toLowerCase().includes('refund') ||
          line.toLowerCase().includes('return') ||
          line.toLowerCase().includes('shipping') ||
          line.toLowerCase().includes('payment') ||
          line.toLowerCase().includes('service') ||
          line.toLowerCase().includes('customer') ||
          line.toLowerCase().includes('order') ||
          line.toLowerCase().includes('delivery') ||
          line.toLowerCase().includes('warranty') ||
          line.toLowerCase().includes('liability') ||
          line.toLowerCase().includes('contact') ||
          line.toLowerCase().includes('support') ||
          line.toLowerCase().includes('price') ||
          line.toLowerCase().includes('fee')
        ) {
          // Clean up the line to make a title
          const cleanTitle = line
            .replace(/^\d+\.?\s*/, '')
            .replace(/^[a-zA-Z]\)\s*/, '')
            .replace(/^[-•*]\s*/, '')
            .replace(/^[IVX]+\.?\s*/, '')
            .substring(0, 100)
            .trim();

          if (cleanTitle.length > 5) {
            entries.push({
              title: cleanTitle,
              content: line,
              category: 'Terms & Conditions',
              tags: ['policy', 'terms'],
              confidence_score: 0.8,
              section_reference: `Line ${i + 1}`
            });
            entryCount++;
            console.log(`Added entry ${entryCount}: ${cleanTitle}`);
          }
        }
      }

      // Second pass: If we still don't have enough entries, be more aggressive
      if (entries.length < 3) {
        console.log('Not enough entries found, using more aggressive extraction');
        
        // Split by sentences and look for meaningful content
        const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
        
        for (let i = 0; i < Math.min(sentences.length, maxEntries) && entryCount < maxEntries; i++) {
          const sentence = sentences[i];
          if (sentence.length > 20 && sentence.length < 200) {
            const title = sentence.substring(0, 60).trim() + (sentence.length > 60 ? '...' : '');
            
            entries.push({
              title: title,
              content: sentence,
              category: 'Terms & Conditions',
              tags: ['extracted', 'terms'],
              confidence_score: 0.6,
              section_reference: `Sentence ${i + 1}`
            });
            entryCount++;
            console.log(`Added sentence entry ${entryCount}: ${title}`);
          }
        }
      }

      // Third pass: If still not enough, split by paragraphs
      if (entries.length < 2) {
        console.log('Still not enough entries, using paragraph extraction');
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 30);
        
        for (let i = 0; i < Math.min(paragraphs.length, maxEntries) && entryCount < maxEntries; i++) {
          const paragraph = paragraphs[i].trim();
          const title = paragraph.substring(0, 80).trim() + (paragraph.length > 80 ? '...' : '');
          
          entries.push({
            title: title,
            content: paragraph,
            category: 'Terms & Conditions',
            tags: ['policy', 'extracted'],
            confidence_score: 0.7,
            section_reference: `Paragraph ${i + 1}`
          });
          entryCount++;
          console.log(`Added paragraph entry ${entryCount}: ${title}`);
        }
      }

      // Fourth pass: If we still have very few entries and the text seems corrupted, 
      // create comprehensive template entries for common terms and conditions
      if (entries.length < 5 && (text.includes('reportlab') || text.length < 500)) {
        console.log('Text appears to be corrupted/insufficient, creating comprehensive template entries');
        
        const templateEntries = [
          {
            title: 'Return Policy',
            content: 'Please edit with your actual return policy. Include timeframes, conditions, and process for returns.',
            category: 'Shipping & Returns',
            tags: ['returns', 'policy', 'needs-editing'],
            confidence_score: 0.4,
            section_reference: 'Template - Edit Required'
          },
          {
            title: 'Shipping Information',
            content: 'Please edit with your shipping details. Include costs, timeframes, and available shipping methods.',
            category: 'Shipping & Returns',
            tags: ['shipping', 'delivery', 'needs-editing'],
            confidence_score: 0.4,
            section_reference: 'Template - Edit Required'
          },
          {
            title: 'Payment Terms',
            content: 'Please edit with your payment terms. Include accepted payment methods, processing times, and billing policies.',
            category: 'Company Policies',
            tags: ['payment', 'billing', 'needs-editing'],
            confidence_score: 0.4,
            section_reference: 'Template - Edit Required'
          },
          {
            title: 'Refund Policy',
            content: 'Please edit with your refund policy. Include conditions for refunds, processing times, and refund methods.',
            category: 'Company Policies',
            tags: ['refunds', 'money-back', 'needs-editing'],
            confidence_score: 0.4,
            section_reference: 'Template - Edit Required'
          },
          {
            title: 'Customer Support',
            content: 'Please edit with your customer support information. Include contact methods, hours, and response times.',
            category: 'Technical Support',
            tags: ['support', 'contact', 'needs-editing'],
            confidence_score: 0.4,
            section_reference: 'Template - Edit Required'
          },
          {
            title: 'Warranty Information',
            content: 'Please edit with your warranty terms. Include coverage period, what\'s covered, and claim process.',
            category: 'Product Information',
            tags: ['warranty', 'coverage', 'needs-editing'],
            confidence_score: 0.4,
            section_reference: 'Template - Edit Required'
          },
          {
            title: 'Terms of Service',
            content: 'Please edit with your terms of service. Include user responsibilities, service limitations, and legal terms.',
            category: 'Terms & Conditions',
            tags: ['terms', 'service', 'needs-editing'],
            confidence_score: 0.4,
            section_reference: 'Template - Edit Required'
          },
          {
            title: 'Privacy Policy',
            content: 'Please edit with your privacy policy. Include data collection, usage, and protection information.',
            category: 'Company Policies',
            tags: ['privacy', 'data', 'needs-editing'],
            confidence_score: 0.4,
            section_reference: 'Template - Edit Required'
          },
          {
            title: 'Cancellation Policy',
            content: 'Please edit with your cancellation policy. Include when cancellations are allowed and the process.',
            category: 'Company Policies',
            tags: ['cancellation', 'orders', 'needs-editing'],
            confidence_score: 0.4,
            section_reference: 'Template - Edit Required'
          },
          {
            title: 'Product Quality Standards',
            content: 'Please edit with your product quality information. Include standards, testing, and quality assurance details.',
            category: 'Product Information',
            tags: ['quality', 'standards', 'needs-editing'],
            confidence_score: 0.4,
            section_reference: 'Template - Edit Required'
          }
        ];
        
        entries.push(...templateEntries);
        console.log('Added', templateEntries.length, 'comprehensive template entries for manual editing');
      }

      console.log(`Direct processing completed with ${entries.length} entries`);

      return {
        success: true,
        entries,
        summary: `Extracted ${entries.length} terms and conditions from ${title}`,
        total_tokens: 0,
        estimated_cost: 0,
        processing_time: 0
      };
    } catch (error) {
      console.error('Direct processing error:', error);
      return {
        success: false,
        entries: [],
        summary: '',
        total_tokens: 0,
        estimated_cost: 0,
        processing_time: 0,
        error: error instanceof Error ? error.message : 'Direct processing failed'
      };
    }
  }

  static async processTextContent(
    text: string,
    title: string,
    options: {
      maxEntries?: number;
    } = {}
  ): Promise<{ success: boolean; error?: string; entriesCount?: number }> {
    try {
      console.log('Processing text content directly with AI:', title);
      console.log('Text length:', text.length);

      // Use the AI service to analyze the text directly
      const analysisResult = await OpenAIService.analyzePDFContent(
        text,
        title,
        options
      );

      if (!analysisResult.success) {
        console.error('AI analysis failed:', analysisResult.error);
        return { success: false, error: analysisResult.error || 'AI analysis failed' };
      }

      if (!analysisResult.entries || analysisResult.entries.length === 0) {
        console.log('AI returned no entries, using direct processing');
        
        // Use direct text processing as fallback
        const fallbackResult = await this.directTextProcessing(text, title, options.maxEntries || 50);
        
        if (!fallbackResult.success || fallbackResult.entries.length === 0) {
          return { success: false, error: 'No useful content could be extracted from the text' };
        }
        
        // Insert fallback entries
        const knowledgeBaseEntries = fallbackResult.entries.map(entry => ({
          title: entry.title,
          content: entry.content,
          category: entry.category,
          tags: entry.tags,
          source: 'pdf_ai_generated' as const,
          source_document_id: null,
          confidence_score: entry.confidence_score,
          ai_generated: true,
          is_approved: false,
          original_text: entry.section_reference,
          page_number: null
        }));

        const { error: entriesError } = await supabase
          .from('knowledge_base')
          .insert(knowledgeBaseEntries);

        if (entriesError) {
          console.error('Database insertion error:', entriesError);
          return { success: false, error: `Failed to save knowledge base entries: ${entriesError.message}` };
        }

        return { success: true, entriesCount: knowledgeBaseEntries.length };
      }

      console.log('AI analysis successful, creating entries:', analysisResult.entries.length);

      // Insert AI-generated entries
      const knowledgeBaseEntries = analysisResult.entries.map(entry => ({
        title: entry.title,
        content: entry.content,
        category: entry.category,
        tags: entry.tags,
        source: 'pdf_ai_generated' as const,
        source_document_id: null,
        confidence_score: entry.confidence_score,
        ai_generated: true,
        is_approved: false,
        original_text: entry.section_reference,
        page_number: null
      }));

      const { error: entriesError } = await supabase
        .from('knowledge_base')
        .insert(knowledgeBaseEntries);

      if (entriesError) {
        console.error('Database insertion error:', entriesError);
        return { success: false, error: `Failed to save knowledge base entries: ${entriesError.message}` };
      }

      console.log('Successfully processed text and created', knowledgeBaseEntries.length, 'entries');
      return { success: true, entriesCount: knowledgeBaseEntries.length };

    } catch (error) {
      console.error('Error processing text content:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  static async processDocumentCommercial(
    file: File,
    title: string,
    description?: string,
    options: {
      autoProcess?: boolean;
      maxEntries?: number;
      focusAreas?: string[];
    } = {}
  ): Promise<{ success: boolean; error?: string; processingResult?: ProcessingResult; document_id?: string }> {
    try {
      console.log('Starting commercial document processing for:', file.name);

      // Step 1: Process document with commercial processor
      const processingResult = await commercialDocumentProcessor.processDocument(file);
      
      if (!processingResult.success) {
        return { 
          success: false, 
          error: 'Document processing failed: ' + processingResult.processingLog
            .filter(log => log.level === 'error')
            .map(log => log.message)
            .join(', ')
        };
      }

      // Step 2: Store document in database
      const pageCount = await estimatePDFPageCount(file);
      const fileData = await file.arrayBuffer();
      const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(fileData)));

      const { data: documentData, error: documentError } = await supabase
        .from('kb_documents')
        .insert({
          title,
          description: description || `Processed document: ${file.name}`,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_data: fileBase64,
          total_pages: pageCount,
          processing_status: 'completed',
          processing_progress: 100,
          processing_log: processingResult.processingLog,
          document_type: processingResult.analysis.documentType,
          language: processingResult.analysis.language,
          version: '1.0',
          is_active: true
        })
        .select()
        .single();

      if (documentError) {
        console.error('Document insertion error:', documentError);
        return { success: false, error: `Failed to save document: ${documentError.message}` };
      }

      // Step 3: Insert knowledge base entries with enhanced metadata
      const knowledgeBaseEntries = processingResult.entries.map(entry => ({
        title: entry.title,
        content: entry.content,
        category: entry.category,
        subcategory: entry.subcategory,
        tags: entry.tags,
        keywords: entry.keywords,
        priority: entry.priority,
        confidence_score: entry.confidence_score,
        source_type: entry.source_type,
        source_document_id: documentData.id,
        source_section: entry.source_section,
        page_reference: entry.page_reference,
        ai_generated: true,
        is_approved: false
      }));

      if (knowledgeBaseEntries.length > 0) {
        const { error: entriesError } = await supabase
          .from('knowledge_base')
          .insert(knowledgeBaseEntries);

        if (entriesError) {
          console.error('Knowledge base insertion error:', entriesError);
          return { success: false, error: `Failed to save knowledge base entries: ${entriesError.message}` };
        }
      }

      console.log(`Commercial processing completed successfully:
        - Document ID: ${documentData.id}
        - Entries created: ${knowledgeBaseEntries.length}
        - Document type: ${processingResult.analysis.documentType}
        - Confidence: ${processingResult.analysis.confidence}`);

      return { 
        success: true, 
        processingResult,
        document_id: documentData.id
      };

    } catch (error) {
      console.error('Commercial document processing error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  static async deleteDocument(documentId: string): Promise<boolean> {
    try {
      // No need to delete from storage since we're storing in database
      // Delete from database (cascade will handle related entries)
      const { error } = await supabase
        .from('kb_documents')
        .delete()
        .eq('id', documentId);

      return !error;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }
}