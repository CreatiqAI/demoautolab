# Enhanced Knowledge Base System with AI-Powered PDF Processing

This document explains how to set up and use the enhanced knowledge base system that supports PDF uploads with AI content analysis using OpenAI.

## 🚀 Features

- **Manual Knowledge Base Entries** - Create and manage entries manually
- **PDF Upload & AI Processing** - Upload PDFs and automatically generate knowledge base entries
- **OpenAI Integration** - Uses GPT-4 to analyze PDF content and extract structured information
- **Approval Workflow** - AI-generated entries require admin approval
- **Advanced Search** - Full-text search with relevance ranking
- **n8n Integration** - RESTful API for chatbot integration

## 📋 Database Setup

### Step 1: Run the Database Migrations

Apply both migration files in your Supabase project:

```bash
# Apply the migrations
npx supabase db push

# Or run them manually in Supabase SQL editor
```

**Migration Files:**
1. `supabase/migrations/20250910000000_create_knowledge_base_table.sql` - Basic knowledge base structure
2. `supabase/migrations/20250910000001_enhanced_knowledge_base_with_pdf.sql` - PDF support and AI processing

### Complete SQL Schema

If you prefer to run the SQL manually, here's the complete schema:

```sql
-- Basic Knowledge Base Table (from first migration)
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enhanced PDF Support (from second migration)
-- Create storage bucket for PDF files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-base-pdfs',
  'knowledge-base-pdfs',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create enum types
CREATE TYPE kb_entry_source AS ENUM ('manual', 'pdf_ai_generated', 'imported');
CREATE TYPE ai_processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- PDF Documents table
CREATE TABLE IF NOT EXISTS kb_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ai_processing_status ai_processing_status DEFAULT 'pending',
    ai_processing_error TEXT,
    total_pages INTEGER,
    extracted_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enhanced knowledge base with PDF support
ALTER TABLE knowledge_base 
ADD COLUMN IF NOT EXISTS source kb_entry_source DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES kb_documents(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS page_number INTEGER,
ADD COLUMN IF NOT EXISTS confidence_score REAL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_text TEXT,
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;

-- AI Processing Jobs table
CREATE TABLE IF NOT EXISTS kb_ai_processing_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES kb_documents(id) ON DELETE CASCADE NOT NULL,
    status ai_processing_status DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    current_step TEXT,
    error_message TEXT,
    openai_model TEXT DEFAULT 'gpt-4',
    total_tokens_used INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10,4) DEFAULT 0,
    processing_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security and create policies
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;  
ALTER TABLE kb_ai_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Storage policies
CREATE POLICY "Authenticated users can upload PDFs" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'knowledge-base-pdfs' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read PDFs" ON storage.objects
FOR SELECT USING (bucket_id = 'knowledge-base-pdfs' AND auth.role() = 'authenticated');

-- Table policies (allow authenticated users full access)
CREATE POLICY "Allow authenticated users full access to knowledge_base" ON knowledge_base 
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access to kb_documents" ON kb_documents
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access to processing jobs" ON kb_ai_processing_jobs
FOR ALL USING (auth.role() = 'authenticated');
```

### Step 2: Install Required Dependencies

```bash
npm install openai pdfjs-dist
```

## 🔧 Configuration

### OpenAI API Key

Your OpenAI API key is already configured in the code:
```
your-openai-api-key-here
```

**⚠️ Security Warning:** In production, move this to environment variables:
```javascript
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
```

## 📁 How to Use the System

### 1. Access the Knowledge Base Admin

Navigate to: `/admin/knowledge-base`

### 2. Upload PDF Documents

1. Click **"Upload PDF"** button
2. Select your PDF file (max 50MB)
3. Enter a descriptive title
4. Optionally add a description
5. Choose to auto-process with AI
6. Set maximum entries to generate (10-50)
7. Click **"Upload PDF"**

### 3. AI Processing Workflow

When you upload a PDF with auto-processing enabled:

1. **PDF Upload** - File is stored in Supabase storage
2. **Text Extraction** - PDF.js extracts text content from all pages
3. **AI Analysis** - OpenAI GPT-4 analyzes the content and generates structured knowledge base entries
4. **Entry Creation** - Generated entries are saved with `is_approved: false`
5. **Admin Review** - You can review, edit, and approve entries

### 4. Generated Entry Examples

For a terms & conditions PDF, AI might generate entries like:

- **"Return Policy - 30 Day Window"**
  - Category: Company Policies  
  - Content: "Customers can return items within 30 days of purchase..."
  - Confidence: 95%

- **"Shipping Timeframes"**
  - Category: Shipping & Returns
  - Content: "Standard shipping takes 5-7 business days..."
  - Confidence: 88%

## 🤖 n8n Integration

### Option 1: Direct Supabase Integration

Use this approach if your n8n instance can connect directly to Supabase.

### Service Functions Available

Import the `KnowledgeBaseService` from `/src/services/knowledgeBaseService.ts`:

```typescript
import { KnowledgeBaseService } from './services/knowledgeBaseService';

// Search knowledge base
const results = await KnowledgeBaseService.searchKnowledgeBase({
  query: 'shipping policy',
  category: 'Shipping & Returns',
  limit: 5
});

// Find best match for chatbot
const bestMatches = await KnowledgeBaseService.findBestMatch('how to return item', 3);
```

### Methods Available:

- `searchKnowledgeBase(params)` - General search with filters
- `getEntryById(id)` - Get specific entry by ID
- `getAllCategories()` - Get list of all categories
- `getAllTags()` - Get list of all tags
- `findBestMatch(query, limit)` - AI-optimized search for chatbots

## Option 2: Edge Function API (Recommended for n8n)

Use this RESTful API endpoint from your n8n workflows.

### Endpoint

```
POST https://your-project.supabase.co/functions/v1/knowledge-base-search
```

### Headers

```
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
Content-Type: application/json
```

### Request Body

```json
{
  "query": "shipping policy",
  "category": "Shipping & Returns",
  "tags": ["policy", "shipping"],
  "limit": 10,
  "api_key": "optional_api_key_for_extra_security"
}
```

### Response Format

```json
{
  "success": true,
  "count": 3,
  "query_params": {
    "query": "shipping policy",
    "category": "Shipping & Returns",
    "tags": ["policy", "shipping"],
    "limit": 10
  },
  "data": [
    {
      "id": "uuid",
      "title": "Shipping Policy Overview",
      "content": "Our shipping policy covers...",
      "category": "Shipping & Returns",
      "tags": ["policy", "shipping", "returns"],
      "updated_at": "2023-10-15T10:30:00Z",
      "relevance_score": 2.5
    }
  ]
}
```

## n8n Workflow Integration

### Step 1: HTTP Request Node

Create an HTTP Request node with:
- Method: POST
- URL: `https://your-project.supabase.co/functions/v1/knowledge-base-search`
- Headers: 
  - `Authorization: Bearer YOUR_SUPABASE_ANON_KEY`
  - `Content-Type: application/json`

### Step 2: Request Body

Set up your request body based on the user's question:

```json
{
  "query": "{{ $node['Trigger'].json.user_question }}",
  "limit": 3
}
```

### Step 3: Process Response

Use a Code node to process the response:

```javascript
// Extract the best answer
const response = $input.first().json;

if (response.success && response.data.length > 0) {
  const bestMatch = response.data[0];
  
  return [{
    json: {
      answer: bestMatch.content,
      title: bestMatch.title,
      category: bestMatch.category,
      confidence: bestMatch.relevance_score,
      source: 'knowledge_base'
    }
  }];
} else {
  return [{
    json: {
      answer: "I don't have specific information about that. Please contact our support team.",
      source: 'fallback'
    }
  }];
}
```

## Database Setup

To set up the knowledge base database, run the migration:

```bash
npx supabase db push
```

Or apply the migration manually using the SQL in:
`supabase/migrations/20250910000000_create_knowledge_base_table.sql`

## Managing Knowledge Base Content

Access the knowledge base management interface at:
`https://your-domain.com/admin/knowledge-base`

### Categories Available:
- Product Information
- Shipping & Returns
- Technical Support
- Company Policies
- Troubleshooting
- General FAQ
- Other

### Features:
- Create, edit, and delete knowledge base entries
- Search and filter by category or tags
- Full-text search functionality
- Tag-based organization

## Security Notes

1. The edge function supports optional API key authentication
2. Row Level Security (RLS) is enabled on the database
3. Only authenticated users can manage knowledge base content
4. The search API is read-only

## Deployment

### Deploy the Edge Function:

```bash
npx supabase functions deploy knowledge-base-search
```

### Set Environment Variables:

```bash
npx supabase secrets set KNOWLEDGE_BASE_API_KEY=your_optional_api_key
```

## Support

For technical support or questions about the knowledge base integration, please check the admin panel or contact your development team.