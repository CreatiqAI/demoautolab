import { useState } from 'react';
import { useUploadQueue } from '@/hooks/useUploadQueue';
import { CheckCircle2, X, Loader2, AlertCircle, Video, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function UploadQueueIndicator() {
  const { uploads, dismissUpload } = useUploadQueue();
  const [collapsed, setCollapsed] = useState(false);

  if (uploads.length === 0) return null;

  const activeCount = uploads.filter((u) => u.status === 'uploading').length;
  const failedCount = uploads.filter((u) => u.status === 'failed').length;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <div className="bg-white border rounded-lg shadow-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="w-full bg-gray-900 text-white px-4 py-2 text-sm font-medium flex items-center justify-between hover:bg-gray-800"
        >
          <span className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            {activeCount > 0
              ? `Uploading ${activeCount} video${activeCount === 1 ? '' : 's'}...`
              : `${uploads.length} upload${uploads.length === 1 ? '' : 's'}`}
            {failedCount > 0 && (
              <span className="text-red-300">• {failedCount} failed</span>
            )}
          </span>
          {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {!collapsed && (
          <div className="max-h-80 overflow-y-auto">
            {uploads.map((u) => (
              <div
                key={u.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 border-b last:border-b-0',
                  u.status === 'failed' && 'bg-red-50',
                  u.status === 'complete' && 'bg-green-50'
                )}
              >
                {u.status === 'uploading' && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600 flex-shrink-0" />
                )}
                {u.status === 'complete' && (
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                )}
                {u.status === 'failed' && (
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" title={u.fileName}>
                    {u.fileName}
                  </p>
                  <p className="text-xs text-gray-500 truncate" title={u.productName}>
                    {u.productName} · {(u.fileSize / 1024 / 1024).toFixed(1)}MB
                    {u.status === 'uploading' && ' · Uploading...'}
                    {u.status === 'complete' && ' · Uploaded'}
                    {u.status === 'failed' && u.error && ` · ${u.error}`}
                  </p>
                </div>
                {u.status !== 'uploading' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={() => dismissUpload(u.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
