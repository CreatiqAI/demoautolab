import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Entity } from '@/lib/bulkImport/types';

interface LogRow {
  id: string;
  run_at: string;
  admin_id: string | null;
  entity: string;
  mode: string;
  total_rows: number;
  succeeded: number;
  failed: number;
  result_json: unknown;
}

function getAdminId(): string | null {
  const raw = localStorage.getItem('admin_user');
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { id?: string }).id ?? null;
  } catch {
    return null;
  }
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diffSec = (Date.now() - d.getTime()) / 1000;
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.round(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)} hr ago`;
  if (diffSec < 86400 * 7) return `${Math.round(diffSec / 86400)} d ago`;
  return d.toLocaleDateString();
}

interface Props {
  entity: Entity;
  // Bump this to force a re-fetch — e.g. after a fresh import completes.
  refreshKey?: number;
}

export function ImportLogs({ entity, refreshKey }: Props) {
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const adminId = getAdminId();
    if (!adminId) {
      setError('Not signed in');
      setLogs([]);
      return;
    }
    setLogs(null);
    setError(null);
    void supabase.functions
      .invoke<{ logs: LogRow[] }>('get-bulk-import-logs', {
        body: { admin_id: adminId, limit: 50 },
      })
      .then(({ data, error: invokeError }) => {
        if (invokeError || !data) {
          setError(invokeError?.message ?? 'Failed to load logs');
          setLogs([]);
          return;
        }
        setLogs((data.logs ?? []).filter(l => l.entity === entity));
      });
  }, [entity, refreshKey]);

  if (logs === null) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading logs…
      </div>
    );
  }
  if (error) {
    return <p className="text-xs text-destructive">{error}</p>;
  }
  if (logs.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No imports yet for {entity}s.</p>;
  }

  return (
    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
      {logs.map(l => {
        const isExpanded = expandedId === l.id;
        const inserted = countByStatus(l.result_json, 'inserted');
        const updated = countByStatus(l.result_json, 'updated');
        const skipped = countByStatus(l.result_json, 'skipped');
        return (
          <div key={l.id} className="border rounded text-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : l.id)}
              className="w-full p-2 text-left hover:bg-muted/40 transition-colors"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">{relativeTime(l.run_at)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground capitalize">{l.mode}</span>
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-wrap">
                {inserted > 0 && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-green-500 text-green-700">
                    +{inserted}
                  </Badge>
                )}
                {updated > 0 && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-500 text-blue-700">
                    ~{updated}
                  </Badge>
                )}
                {skipped > 0 && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-yellow-500 text-yellow-700">
                    ↷{skipped}
                  </Badge>
                )}
                {l.failed > 0 && (
                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                    ✗{l.failed}
                  </Badge>
                )}
                <span className="text-muted-foreground text-[10px] ml-auto">
                  {l.total_rows} rows
                </span>
              </div>
            </button>
            {isExpanded && Array.isArray(l.result_json) && (
              <div className="border-t bg-muted/20 p-2 space-y-0.5">
                {(l.result_json as RowResult[]).slice(0, 50).map((r, i) => (
                  <div key={i} className="font-mono text-[10px] flex gap-2">
                    <span className={cn(
                      'shrink-0',
                      r.status === 'error' && 'text-destructive',
                      r.status === 'inserted' && 'text-green-700',
                      r.status === 'updated' && 'text-blue-700',
                      r.status === 'skipped' && 'text-yellow-700',
                    )}>
                      [{r.status}]
                    </span>
                    <span className="font-mono truncate">{r.sku}</span>
                    {r.error && <span className="text-destructive truncate">{r.error}</span>}
                  </div>
                ))}
                {(l.result_json as RowResult[]).length > 50 && (
                  <div className="text-[10px] text-muted-foreground italic pt-1">
                    …and {(l.result_json as RowResult[]).length - 50} more
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface RowResult {
  status: 'inserted' | 'updated' | 'skipped' | 'error';
  sku: string;
  error?: string;
}

function countByStatus(resultJson: unknown, status: RowResult['status']): number {
  if (!Array.isArray(resultJson)) return 0;
  return (resultJson as RowResult[]).filter(r => r.status === status).length;
}
