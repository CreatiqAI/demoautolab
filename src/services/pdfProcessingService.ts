import { supabase } from '@/lib/supabase';
import { OpenAIService, PDFAnalysisResult } from './openaiService';
import { extractTextFromPDF, estimatePDFPageCount } from './pdfTextExtractor';

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

export class PDFProcessingService {
  
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

      // Generate unique filename
      const fileExt = '.pdf';
      const timestamp = new Date().getTime();
      const filename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `pdfs/${filename}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('knowledge-base-pdfs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Save document record to database
      const { data: documentData, error: dbError } = await supabase
        .from('kb_documents')
        .insert({
          title,
          description,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          total_pages: pageCount,
          extracted_text: extractedText.substring(0, 50000), // Store first 50k chars
          ai_processing_status: options.autoProcess ? 'pending' : 'pending'
        })
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded file on database error
        await supabase.storage
          .from('knowledge-base-pdfs')
          .remove([filePath]);
        
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Start AI processing if requested
      if (options.autoProcess) {
        this.startAIProcessing(documentData.id, {
          maxEntries: options.maxEntries,
          focusAreas: options.focusAreas
        });
      }

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
      const analysisResult: PDFAnalysisResult = await OpenAIService.analyzePDFContent(
        document.extracted_text,
        document.title,
        options
      );

      if (!analysisResult.success) {
        throw new Error(analysisResult.error || 'AI analysis failed');
      }

      await this.updateProcessingProgress(jobId, 60, 'Creating knowledge base entries...');

      // Insert generated knowledge base entries
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
      }));

      const { error: entriesError } = await supabase
        .from('knowledge_base')
        .insert(knowledgeBaseEntries);

      if (entriesError) {
        throw new Error(`Failed to save knowledge base entries: ${entriesError.message}`);
      }

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

  static async deleteDocument(documentId: string): Promise<boolean> {
    try {
      // Get document info first
      const { data: document } = await supabase
        .from('kb_documents')
        .select('file_path')
        .eq('id', documentId)
        .single();

      // Delete from storage
      if (document?.file_path) {
        await supabase.storage
          .from('knowledge-base-pdfs')
          .remove([document.file_path]);
      }

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