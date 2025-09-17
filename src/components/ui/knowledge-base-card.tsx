import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Clock, 
  FileText, 
  Users, 
  HelpCircle,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Target,
  Download
} from 'lucide-react';

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

interface KnowledgeBaseCardProps {
  entry: KnowledgeBaseEntry;
  index: number;
  onApprove: (id: string) => void;
  onEdit: (entry: KnowledgeBaseEntry) => void;
  onDelete: (id: string) => void;
  onDownloadPdf?: (documentId: string) => void;
}

export function KnowledgeBaseCard({ entry, index, onApprove, onEdit, onDelete, onDownloadPdf }: KnowledgeBaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <h4 key={i} className="font-semibold text-slate-800 mt-6 mb-3 text-lg">
            {line.replace(/\*\*/g, '')}
          </h4>
        );
      }
      if (line.match(/^\d+\./)) {
        return (
          <div key={i} className="flex items-start gap-3 mb-3 pl-4">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-600 mt-0.5 shrink-0">
              {line.match(/^(\d+)\./)?.[1]}
            </div>
            <span className="text-slate-700 leading-relaxed">{line.replace(/^\d+\.\s*/, '')}</span>
          </div>
        );
      }
      if (line.startsWith('- ')) {
        return (
          <div key={i} className="flex items-start gap-3 mb-2 pl-4">
            <div className="w-2 h-2 rounded-full bg-slate-400 mt-2 shrink-0"></div>
            <span className="text-slate-700 leading-relaxed">{line.substring(2)}</span>
          </div>
        );
      }
      return line.trim() ? (
        <p key={i} className="mb-4 leading-relaxed text-slate-700">
          {line}
        </p>
      ) : (
        <div key={i} className="mb-2" />
      );
    });
  };

  const getPriorityConfig = (priority: number) => {
    if (priority >= 8) return {
      color: 'bg-gradient-to-r from-red-500 to-pink-500',
      textColor: 'text-white',
      label: 'Critical',
      icon: '🔥'
    };
    if (priority >= 6) return {
      color: 'bg-gradient-to-r from-orange-500 to-amber-500',
      textColor: 'text-white',
      label: 'High',
      icon: '⚡'
    };
    if (priority >= 4) return {
      color: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      textColor: 'text-white',
      label: 'Medium',
      icon: '📋'
    };
    return {
      color: 'bg-gradient-to-r from-emerald-500 to-teal-500',
      textColor: 'text-white',
      label: 'Normal',
      icon: '📝'
    };
  };

  const priorityConfig = entry.priority ? getPriorityConfig(entry.priority) : null;

  const getPreviewText = (content: string) => {
    const plainText = content
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/^\d+\.\s*/gm, '')
      .replace(/^-\s*/gm, '')
      .split('\n')
      .filter(line => line.trim())
      .join(' ');
    
    return plainText.substring(0, 180) + (plainText.length > 180 ? '...' : '');
  };

  return (
    <Card className={`group relative transition-all duration-200 hover:shadow-md ${
      !entry.is_approved 
        ? 'border-l-4 border-l-amber-400 bg-amber-50/30' 
        : 'bg-white border-slate-200 hover:border-slate-300'
    }`}>
      {/* Compact Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Title and entry number */}
            <div className="flex items-start gap-3 mb-2">
              <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600 shrink-0 mt-1">
                {index + 1}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 leading-tight mb-1">
                  {entry.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{entry.category}</span>
                  {entry.confidence_score && (
                    <span className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        entry.confidence_score > 0.8 ? 'bg-green-500' : 
                        entry.confidence_score > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      {Math.round(entry.confidence_score * 100)}%
                    </span>
                  )}
                  {entry.kb_documents && entry.source_document_id && onDownloadPdf && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDownloadPdf(entry.source_document_id!)}
                      className="h-4 w-4 p-0 text-blue-600 hover:text-blue-700"
                      title="Download PDF"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Compact preview */}
            <p className="text-sm text-slate-600 leading-relaxed mb-2">
              {getPreviewText(entry.content)}
            </p>
            
            {/* Status badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {entry.ai_generated && (
                <Badge variant="secondary" className="text-xs h-5 px-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI
                </Badge>
              )}
              {!entry.is_approved && (
                <Badge variant="outline" className="text-xs h-5 px-2 border-amber-300 text-amber-700">
                  Review
                </Badge>
              )}
              {priorityConfig && entry.priority && entry.priority > 6 && (
                <Badge variant="outline" className={`text-xs h-5 px-2 ${priorityConfig.textColor} border-current`}>
                  {priorityConfig.label}
                </Badge>
              )}
              {/* Show only first 3 tags */}
              {entry.tags.slice(0, 3).map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs h-5 px-2 bg-slate-50">
                  {tag}
                </Badge>
              ))}
              {entry.tags.length > 3 && (
                <Badge variant="outline" className="text-xs h-5 px-2 text-slate-500">
                  +{entry.tags.length - 3}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!entry.is_approved && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onApprove(entry.id)}
                className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                title="Approve"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(entry)}
              className="h-7 w-7 p-0 text-slate-600 hover:text-slate-700 hover:bg-slate-50"
              title="Edit"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(entry.id)}
              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Expandable details */}
      <div className="border-t px-4 pb-4">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="group w-full justify-between h-9 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50/80 transition-all duration-300 ease-out rounded-md border border-transparent hover:border-slate-200 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isExpanded ? 'bg-blue-500' : 'bg-slate-300 group-hover:bg-blue-400'
                }`}></div>
                <span className="font-medium">
                  {isExpanded ? 'Hide full content' : 'View full content'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-xs transition-all duration-300 ${
                  isExpanded ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                }`}>
                  {isExpanded ? 'Collapse' : 'Expand'}
                </span>
                <div className={`transition-all duration-300 ease-out ${
                  isExpanded
                    ? 'rotate-180 text-blue-600'
                    : 'rotate-0 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5'
                }`}>
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </div>
              </div>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-3">
            <div className="space-y-3">
              {/* Full Content */}
              <div className="bg-slate-50 rounded-lg p-3 border">
                <div className="prose prose-sm max-w-none">
                  {formatContent(entry.content)}
                </div>
              </div>
              
              {/* Additional info in compact format */}
              {(entry.key_points?.length || entry.customer_scenarios?.length || entry.related_questions?.length) && (
                <div className="grid gap-2 text-sm">
                  {entry.key_points && entry.key_points.length > 0 && (
                    <div className="bg-blue-50 rounded p-2 border">
                      <h5 className="font-medium text-blue-900 mb-1 text-xs">Key Points</h5>
                      <ul className="text-xs text-blue-800 space-y-1">
                        {entry.key_points.map((point, i) => (
                          <li key={i} className="flex gap-1">
                            <span className="text-blue-600">{i + 1}.</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {entry.customer_scenarios && entry.customer_scenarios.length > 0 && (
                    <div className="bg-green-50 rounded p-2 border">
                      <h5 className="font-medium text-green-900 mb-1 text-xs">Customer Scenarios</h5>
                      <ul className="text-xs text-green-800 space-y-1">
                        {entry.customer_scenarios.map((scenario, i) => (
                          <li key={i}>• {scenario}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {entry.related_questions && entry.related_questions.length > 0 && (
                    <div className="bg-purple-50 rounded p-2 border">
                      <h5 className="font-medium text-purple-900 mb-1 text-xs">Related Questions</h5>
                      <ul className="text-xs text-purple-800 space-y-1">
                        {entry.related_questions.map((question, i) => (
                          <li key={i}>Q: {question}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              {/* All tags in compact format */}
              {entry.tags.length > 3 && (
                <div className="border-t pt-2">
                  <h5 className="font-medium text-slate-700 mb-1 text-xs">All Tags</h5>
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs h-4 px-1.5">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  );
}