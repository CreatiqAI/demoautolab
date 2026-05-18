import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, SkipForward } from 'lucide-react';
import type { BatchResult } from '@/lib/bulkImport/types';

interface Props {
  results: BatchResult[];
  onReset: () => void;
}

export function ResultSummary({ results, onReset }: Props) {
  const inserted = results.filter(r => r.status === 'inserted').length;
  const updated  = results.filter(r => r.status === 'updated').length;
  const skipped  = results.filter(r => r.status === 'skipped').length;
  const errors   = results.filter(r => r.status === 'error');

  return (
    <div className="space-y-4">
      <div className="flex gap-3 text-sm">
        <Badge variant="outline" className="border-green-500 text-green-700">
          <CheckCircle2 className="h-3 w-3 mr-1" /> {inserted} inserted
        </Badge>
        <Badge variant="outline" className="border-blue-500 text-blue-700">
          <CheckCircle2 className="h-3 w-3 mr-1" /> {updated} updated
        </Badge>
        <Badge variant="outline" className="border-yellow-500 text-yellow-700">
          <SkipForward className="h-3 w-3 mr-1" /> {skipped} skipped
        </Badge>
        {errors.length > 0 && (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" /> {errors.length} errors
          </Badge>
        )}
      </div>
      {errors.length > 0 && (
        <div className="border rounded p-3 text-sm space-y-1 max-h-64 overflow-y-auto">
          <div className="font-semibold">Errors:</div>
          {errors.map(r => (
            <div key={r.rowIndex} className="font-mono text-xs">
              Row {r.rowIndex} ({r.sku}): {r.error ?? 'unknown'}
              {r.mediaErrors && r.mediaErrors.length > 0 &&
                <span className="text-muted-foreground"> · {r.mediaErrors.join('; ')}</span>}
            </div>
          ))}
        </div>
      )}
      <button onClick={onReset} className="text-sm underline">Import another file</button>
    </div>
  );
}
