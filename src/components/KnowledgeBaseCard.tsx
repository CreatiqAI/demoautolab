import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Trash2, 
  Clock, 
  FileText, 
  Users, 
  HelpCircle,
  Lightbulb,
  AlertCircle
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
  created_at: string;
  updated_at: string;
  priority?: number;
  customer_scenarios?: string[];
  related_questions?: string[];
  key_points?: string[];
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
}

export function KnowledgeBaseCard({ entry, index, onApprove, onEdit, onDelete }: KnowledgeBaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <h4 key={i} className="font-semibold text-gray-900 mt-4 mb-2">
            {line.replace(/\*\*/g, '')}
          </h4>
        );
      }
      if (line.match(/^\d+\./)) {
        return (
          <div key={i} className="ml-4 mb-2">
            <span className="font-medium text-blue-600">{line}</span>
          </div>
        );
      }
      if (line.startsWith('- ')) {
        return (
          <div key={i} className="ml-4 mb-1 flex items-start gap-2">
            <span className="text-gray-400 mt-2">•</span>
            <span>{line.substring(2)}</span>
          </div>
        );
      }
      return line.trim() ? (
        <p key={i} className="mb-2 leading-relaxed">
          {line}
        </p>
      ) : (
        <div key={i} className="mb-2" />
      );
    });
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'bg-red-100 text-red-800 border-red-200';
    if (priority >= 6) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (priority >= 4) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 8) return 'High Priority';
    if (priority >= 6) return 'Medium Priority';
    if (priority >= 4) return 'Normal Priority';
    return 'Low Priority';
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      !entry.is_approved ? 'border-l-4 border-l-orange-400 bg-orange-50/30' : 'border-l-4 border-l-green-400'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className="text-xs font-mono">
                #{String(index + 1).padStart(2, '0')}
              </Badge>
              
              {entry.priority && (
                <Badge className={`text-xs ${getPriorityColor(entry.priority)}`}>
                  {getPriorityLabel(entry.priority)}
                </Badge>
              )}
            </div>
            
            <CardTitle className="text-lg leading-tight mb-2 flex items-start gap-2">
              <span className="flex-1">{entry.title}</span>
              {entry.ai_generated && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  AI Generated
                </Badge>
              )}
              {!entry.is_approved && (
                <Badge variant="destructive" className="text-xs shrink-0">
                  Pending Review
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {entry.category}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(entry.updated_at).toLocaleDateString()}
              </span>
              {entry.kb_documents && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {entry.kb_documents.title}
                </span>
              )}
              {entry.confidence_score && (
                <Badge variant="outline" className="text-xs">
                  {Math.round(entry.confidence_score * 100)}% confidence
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex gap-1 shrink-0">
            {!entry.is_approved && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onApprove(entry.id)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                title="Approve entry"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(entry)}
              className="hover:bg-blue-50"
              title="Edit entry"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(entry.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Delete entry"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Quick Preview */}
        <div className="mb-4">
          <div className="text-gray-700 leading-relaxed overflow-hidden" style={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical'
          }}>
            {entry.content.split('\n')[0].substring(0, 200)}...
          </div>
        </div>
        
        {/* Tags */}
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {entry.tags.slice(0, 4).map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {entry.tags.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{entry.tags.length - 4} more
              </Badge>
            )}
          </div>
        )}
        
        {/* Expandable Details */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto text-sm text-blue-600 hover:text-blue-700">
              <span>View detailed information</span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-4 space-y-4">
            {/* Full Content */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Complete Information
              </h4>
              <div className="prose prose-sm max-w-none text-gray-700">
                {formatContent(entry.content)}
              </div>
            </div>
            
            {/* Key Points */}
            {entry.key_points && entry.key_points.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Key Points
                </h4>
                <ul className="space-y-2">
                  {entry.key_points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-blue-800">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span className="text-sm">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Customer Scenarios */}
            {entry.customer_scenarios && entry.customer_scenarios.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Common Customer Scenarios
                </h4>
                <ul className="space-y-2">
                  {entry.customer_scenarios.map((scenario, i) => (
                    <li key={i} className="flex items-start gap-2 text-green-800">
                      <span className="font-semibold text-green-600 shrink-0">{i + 1}.</span>
                      <span className="text-sm">{scenario}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Related Questions */}
            {entry.related_questions && entry.related_questions.length > 0 && (
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Related Customer Questions
                </h4>
                <ul className="space-y-2">
                  {entry.related_questions.map((question, i) => (
                    <li key={i} className="flex items-start gap-2 text-purple-800">
                      <span className="text-purple-600 shrink-0">Q:</span>
                      <span className="text-sm italic">{question}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* All Tags */}
            {entry.tags.length > 4 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">All Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}