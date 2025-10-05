import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Trash2, Edit, Plus, Search, BookOpen, Tag, Clock, Upload, FileText, Loader2, CheckCircle, XCircle, AlertTriangle, Eye, Download, Filter, SortDesc, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PDFProcessingServiceFallback as PDFProcessingService, DocumentProcessingStatus } from '@/services/pdfProcessingServiceFallback';
import { KnowledgeBaseCard } from '@/components/ui/knowledge-base-card';
import { AIAgentDemo } from '@/components/AIAgentDemo';

interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  source: 'manual' | 'pdf_ai_generated' | 'imported';
  source_document_id?: string;
  page_number?: number;
  confidence_score: number;
  ai_generated: boolean;
  is_approved: boolean;
  priority?: number;
  customer_scenarios?: string[];
  related_questions?: string[];
  key_points?: string[];
  created_at: string;
  updated_at: string;
  kb_documents?: {
    title: string;
    file_name: string;
  };
}

interface PDFDocument {
  id: string;
  title: string;
  description?: string;
  file_name: string;
  file_size: number;
  total_pages: number;
  ai_processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

const CATEGORIES = [
  'Product Information',
  'Shipping & Returns',
  'Technical Support',
  'Company Policies',
  'Troubleshooting',
  'General FAQ',
  'Terms & Conditions',
  'Other'
];

export default function KnowledgeBase() {
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([]);
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showOnlyApproved, setShowOnlyApproved] = useState(false);
  const [activeTab, setActiveTab] = useState('entries');
  const [sortBy, setSortBy] = useState<'updated_at' | 'priority' | 'confidence_score' | 'title'>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Dialog states
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeBaseEntry | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: ''
  });
  
  // PDF upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [pdfFormData, setPdfFormData] = useState({
    title: '',
    description: '',
    autoProcess: true,
    maxEntries: 50
  });
  
  // Text input states
  const [textInputData, setTextInputData] = useState({
    title: '',
    content: '',
    maxEntries: 50
  });
  
  // Processing status tracking
  const [processingStatuses, setProcessingStatuses] = useState<Map<string, DocumentProcessingStatus>>(new Map());
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    const interval = setInterval(checkProcessingStatuses, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchEntries(), fetchDocuments()]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch knowledge base data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from('knowledge_base' as any)
      .select(`
        *,
        kb_documents!source_document_id (
          title,
          file_name
        )
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }
    setEntries((data as any) || []);
  };

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from('kb_documents' as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }
    setDocuments((data as any) || []);
  };

  const checkProcessingStatuses = async () => {
    const processingDocs = documents.filter(doc => 
      doc.ai_processing_status === 'processing' || doc.ai_processing_status === 'pending'
    );

    for (const doc of processingDocs) {
      const status = await PDFProcessingService.getProcessingStatus(doc.id);
      if (status) {
        setProcessingStatuses(prev => new Map(prev.set(doc.id, status)));
        
        // If completed, refresh documents
        if (status.status === 'completed' || status.status === 'failed') {
          fetchData();
        }
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!pdfFormData.title) {
        setPdfFormData(prev => ({
          ...prev,
          title: file.name.replace('.pdf', '')
        }));
      }
    }
  };

  const handlePdfUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !pdfFormData.title) {
      toast({
        title: "Error",
        description: "Please select a file and provide a title",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await PDFProcessingService.uploadAndProcessPDF(
        selectedFile,
        pdfFormData.title,
        pdfFormData.description,
        {
          autoProcess: pdfFormData.autoProcess,
          maxEntries: pdfFormData.maxEntries
        }
      );

      if (result.success) {
        toast({
          title: "Success",
          description: `PDF uploaded successfully! ${pdfFormData.autoProcess ? 'AI processing started.' : ''}`,
        });
        
        resetPdfForm();
        fetchData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload PDF",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content || !formData.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      
      if (editingEntry) {
        const { error } = await supabase
          .from('knowledge_base' as any)
          .update({
            title: formData.title,
            content: formData.content,
            category: formData.category,
            tags: tagsArray,
            updated_at: new Date().toISOString()
          } as any)
          .eq('id', editingEntry.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Knowledge base entry updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('knowledge_base' as any)
          .insert({
            title: formData.title,
            content: formData.content,
            category: formData.category,
            tags: tagsArray,
            source: 'manual',
            ai_generated: false,
            is_approved: true
          } as any);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Knowledge base entry created successfully",
        });
      }

      resetEntryForm();
      fetchEntries();
    } catch (error) {
      console.error('Error saving knowledge base entry:', error);
      toast({
        title: "Error",
        description: "Failed to save knowledge base entry",
        variant: "destructive",
      });
    }
  };

  const handleApproveEntry = async (entryId: string) => {
    const success = await PDFProcessingService.approveEntry(entryId);
    if (success) {
      toast({
        title: "Success",
        description: "Knowledge base entry approved",
      });
      fetchEntries();
    } else {
      toast({
        title: "Error",
        description: "Failed to approve entry",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('knowledge_base' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Knowledge base entry deleted successfully",
      });
      
      fetchEntries();
    } catch (error) {
      console.error('Error deleting knowledge base entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete knowledge base entry",
        variant: "destructive",
      });
    }
  };

  const handleDownloadDocument = async (documentId: string) => {
    try {
      const result = await PDFProcessingService.downloadDocument(documentId);
      if (result.success && result.blob && result.filename) {
        // Create download link
        const url = URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Success",
          description: "Document downloaded successfully",
        });
      } else {
        throw new Error(result.error || 'Failed to download document');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const success = await PDFProcessingService.deleteDocument(documentId);
      if (success) {
        toast({
          title: "Success",
          description: "Document and all related entries deleted successfully",
        });
        fetchData();
      } else {
        throw new Error('Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const handleTextInput = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!textInputData.title || !textInputData.content) {
      toast({
        title: "Error",
        description: "Please provide both title and content",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a mock "document" for text processing
      const mockDocumentId = `text_${Date.now()}`;
      
      // Process the text directly using AI
      const result = await PDFProcessingService.processTextContent(
        textInputData.content,
        textInputData.title,
        {
          maxEntries: textInputData.maxEntries
        }
      );

      if (result.success) {
        toast({
          title: "Success",
          description: `Successfully processed text and created ${result.entriesCount || 0} knowledge base entries!`,
        });
        
        resetTextForm();
        fetchData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error processing text:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process text",
        variant: "destructive",
      });
    }
  };

  const handleStartProcessing = async (documentId: string) => {
    try {
      await PDFProcessingService.startAIProcessing(documentId, {
        maxEntries: 50
      });
      
      toast({
        title: "Success",
        description: "AI processing started for the document",
      });
      
      fetchDocuments();
    } catch (error) {
      console.error('Error starting processing:', error);
      toast({
        title: "Error",
        description: "Failed to start AI processing",
        variant: "destructive",
      });
    }
  };

  const resetEntryForm = () => {
    setFormData({ title: '', content: '', category: '', tags: '' });
    setEditingEntry(null);
    setIsEntryDialogOpen(false);
  };

  const resetPdfForm = () => {
    setPdfFormData({ title: '', description: '', autoProcess: true, maxEntries: 50 });
    setSelectedFile(null);
    setIsPdfDialogOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetTextForm = () => {
    setTextInputData({ title: '', content: '', maxEntries: 50 });
    setIsTextDialogOpen(false);
  };

  const handleEditEntry = (entry: KnowledgeBaseEntry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      content: entry.content,
      category: entry.category,
      tags: entry.tags.join(', ')
    });
    setIsEntryDialogOpen(true);
  };

  const filteredAndSortedEntries = entries
    .filter(entry => {
      const matchesSearch = entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory;
      const matchesApproval = !showOnlyApproved || entry.is_approved;
      
      return matchesSearch && matchesCategory && matchesApproval;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'priority':
          aValue = a.priority || 5;
          bValue = b.priority || 5;
          break;
        case 'confidence_score':
          aValue = a.confidence_score;
          bValue = b.confidence_score;
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        default:
          aValue = new Date(a.updated_at).getTime();
          bValue = new Date(b.updated_at).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-gray-600">Manage your customer service bot knowledge base</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isTextDialogOpen} onOpenChange={setIsTextDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetTextForm} variant="default">
                <FileText className="h-4 w-4 mr-2" />
                Paste Text Content
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Process Text Content with AI</DialogTitle>
                <DialogDescription>
                  Paste your terms and conditions or other content below. AI will analyze it and create individual knowledge base entries.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleTextInput} className="space-y-4">
                <div>
                  <Label htmlFor="text-title">Document Title *</Label>
                  <Input
                    id="text-title"
                    value={textInputData.title}
                    onChange={(e) => setTextInputData({ ...textInputData, title: e.target.value })}
                    placeholder="e.g., Terms and Conditions, Return Policy, etc."
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="text-content">Content *</Label>
                  <Textarea
                    id="text-content"
                    value={textInputData.content}
                    onChange={(e) => setTextInputData({ ...textInputData, content: e.target.value })}
                    placeholder="Paste your terms and conditions, policies, or other content here..."
                    rows={12}
                    required
                    className="min-h-[300px]"
                  />
                </div>
                
                <div>
                  <Label htmlFor="text-max-entries">Maximum entries to generate</Label>
                  <Select
                    value={textInputData.maxEntries.toString()}
                    onValueChange={(value) => setTextInputData({ ...textInputData, maxEntries: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20 entries</SelectItem>
                      <SelectItem value="30">30 entries</SelectItem>
                      <SelectItem value="50">50 entries</SelectItem>
                      <SelectItem value="100">100 entries</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetTextForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    <FileText className="h-4 w-4 mr-2" />
                    Process with AI
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isPdfDialogOpen} onOpenChange={setIsPdfDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetPdfForm} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload PDF
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload PDF Document</DialogTitle>
                <DialogDescription>
                  Upload a PDF document to automatically generate knowledge base entries using AI
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handlePdfUpload} className="space-y-4">
                <div>
                  <Label htmlFor="pdf-file">PDF File *</Label>
                  <Input
                    id="pdf-file"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                    required
                  />
                  {selectedFile && (
                    <p className="text-sm text-gray-600 mt-1">
                      Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="pdf-title">Document Title *</Label>
                  <Input
                    id="pdf-title"
                    value={pdfFormData.title}
                    onChange={(e) => setPdfFormData({ ...pdfFormData, title: e.target.value })}
                    placeholder="Enter a descriptive title for this document"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="pdf-description">Description</Label>
                  <Textarea
                    id="pdf-description"
                    value={pdfFormData.description}
                    onChange={(e) => setPdfFormData({ ...pdfFormData, description: e.target.value })}
                    placeholder="Optional description of the document content"
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-process"
                    checked={true}
                    disabled={true}
                    onCheckedChange={() => {}}
                  />
                  <Label htmlFor="auto-process">AI analysis will start automatically after upload</Label>
                </div>
                
                <div>
                  <Label htmlFor="max-entries">Maximum entries to generate</Label>
                  <Select
                    value={pdfFormData.maxEntries.toString()}
                    onValueChange={(value) => setPdfFormData({ ...pdfFormData, maxEntries: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20 entries</SelectItem>
                      <SelectItem value="30">30 entries</SelectItem>
                      <SelectItem value="50">50 entries</SelectItem>
                      <SelectItem value="100">100 entries</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {isUploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} />
                    <p className="text-sm text-gray-600">Uploading and processing...</p>
                  </div>
                )}
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetPdfForm} disabled={isUploading}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUploading || !selectedFile}>
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    Upload PDF
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetEntryForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingEntry ? 'Edit Knowledge Base Entry' : 'Add New Knowledge Base Entry'}
                </DialogTitle>
                <DialogDescription>
                  Create or edit knowledge base entries for your customer service bot
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleEntrySubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter the title for this knowledge base entry"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter the detailed content/answer for this knowledge base entry"
                    rows={6}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="Enter tags separated by commas (e.g., shipping, returns, policy)"
                  />
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetEntryForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingEntry ? 'Update Entry' : 'Create Entry'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="entries">Knowledge Base Entries</TabsTrigger>
          <TabsTrigger value="documents">PDF Documents</TabsTrigger>
          <TabsTrigger value="ai-agent">AI Agent Demo</TabsTrigger>
        </TabsList>
        
        <TabsContent value="entries" className="space-y-6">
          {/* Enhanced Header with Stats */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Knowledge Base Overview</h3>
                <p className="text-gray-600">Manage and organize your customer service knowledge</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{entries.length}</div>
                  <div className="text-xs text-gray-600">Total Entries</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {entries.filter(e => e.is_approved).length}
                  </div>
                  <div className="text-xs text-gray-600">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {entries.filter(e => !e.is_approved).length}
                  </div>
                  <div className="text-xs text-gray-600">Pending</div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Filters */}
          <div className="bg-white rounded-lg border p-4 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search entries, content, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at">Recent</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="confidence_score">Confidence</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3"
              >
                <SortDesc className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
              </Button>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="approved-only"
                  checked={showOnlyApproved}
                  onCheckedChange={setShowOnlyApproved}
                />
                <Label htmlFor="approved-only" className="text-sm">Show approved only</Label>
              </div>
              
              <Separator orientation="vertical" className="h-6" />
              
              <Badge variant="outline" className="text-xs">
                {filteredAndSortedEntries.length} of {entries.length} entries
              </Badge>
            </div>
          </div>

          {/* Enhanced Entries Display */}
          <div className="space-y-4">
            {filteredAndSortedEntries.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No knowledge base entries found</h3>
                  <p className="text-gray-600 text-center max-w-md">
                    {searchTerm || selectedCategory !== 'all' || showOnlyApproved 
                      ? 'Try adjusting your search criteria or filters to find more entries.' 
                      : 'Get started by creating your first knowledge base entry or uploading a PDF document.'}
                  </p>
                  {!searchTerm && selectedCategory === 'all' && !showOnlyApproved && (
                    <div className="flex gap-2 mt-4">
                      <Button onClick={resetEntryForm}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Entry
                      </Button>
                      <Button variant="outline" onClick={resetPdfForm}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload PDF
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredAndSortedEntries.map((entry, index) => (
                <KnowledgeBaseCard
                  key={entry.id}
                  entry={entry}
                  index={index}
                  onApprove={handleApproveEntry}
                  onEdit={handleEditEntry}
                  onDelete={handleDeleteEntry}
                  onDownloadPdf={handleDownloadDocument}
                />
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="documents" className="space-y-4">
          <div className="grid gap-4">
            {documents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No PDF documents uploaded</h3>
                  <p className="text-gray-600 text-center">
                    Upload your first PDF document to start generating knowledge base entries with AI
                  </p>
                </CardContent>
              </Card>
            ) : (
              documents.map((document) => {
                const status = processingStatuses.get(document.id);
                
                return (
                  <Card key={document.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {document.title}
                          </CardTitle>
                          <CardDescription>
                            {document.file_name} • {(document.file_size / (1024 * 1024)).toFixed(2)} MB • {document.total_pages} pages
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadDocument(document.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDocument(document.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {document.description && (
                        <p className="text-gray-600 mb-4">{document.description}</p>
                      )}
                      
                      {/* Processing Status */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">AI Processing Status</span>
                          <div className="flex items-center gap-2">
                            {document.ai_processing_status === 'processing' && (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            {document.ai_processing_status === 'completed' && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                            {document.ai_processing_status === 'failed' && (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <Badge variant={
                              document.ai_processing_status === 'completed' ? 'default' :
                              document.ai_processing_status === 'failed' ? 'destructive' :
                              document.ai_processing_status === 'processing' ? 'secondary' : 'outline'
                            }>
                              {document.ai_processing_status}
                            </Badge>
                          </div>
                        </div>
                        
                        {status && status.status === 'processing' && (
                          <div className="space-y-2">
                            <Progress value={status.progress} />
                            <p className="text-sm text-gray-600">{status.current_step}</p>
                          </div>
                        )}
                        
                        {status && (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Entries Generated:</span>
                              <span className="ml-2 font-medium">{status.entries_generated}</span>
                            </div>
                            {status.estimated_cost > 0 && (
                              <div>
                                <span className="text-gray-600">Estimated Cost:</span>
                                <span className="ml-2 font-medium">${status.estimated_cost.toFixed(4)}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {status?.error_message && (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Processing Error</AlertTitle>
                            <AlertDescription>{status.error_message}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="ai-agent" className="space-y-4">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  AI Agent Integration Demo
                </CardTitle>
                <CardDescription>
                  Test how your AI agent responds to customer questions using your knowledge base.
                  This demonstrates the commercial AI integration system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Demo Mode</AlertTitle>
                    <AlertDescription>
                      This is a demonstration of the commercial AI agent integration. 
                      It searches your knowledge base and provides structured responses with source attribution.
                    </AlertDescription>
                  </Alert>
                  
                  <AIAgentDemo />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{entries.length}</div>
                      <div className="text-sm text-gray-600">Knowledge Entries</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{documents.length}</div>
                      <div className="text-sm text-gray-600">Source Documents</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {new Set(entries.map(e => e.category)).size}
                      </div>
                      <div className="text-sm text-gray-600">Categories</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}