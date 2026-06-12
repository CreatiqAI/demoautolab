import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { EntityColumn } from '@/components/admin/bulkImport/EntityColumn';
import { PreviewTable } from '@/components/admin/bulkImport/PreviewTable';
import { ModeSelector } from '@/components/admin/bulkImport/ModeSelector';
import { ImportProgress } from '@/components/admin/bulkImport/ImportProgress';
import { ResultSummary } from '@/components/admin/bulkImport/ResultSummary';
import { parseExcelFile } from '@/lib/bulkImport/parser';
import { validateRows, recomputeDuplicates, summarize } from '@/lib/bulkImport/validators';
import { getColumnMap } from '@/lib/bulkImport/columnMaps';
import { runImport } from '@/lib/bulkImport/api';
import { annotateProductRowsWithDbChecks } from '@/lib/bulkImport/crossRowChecks';
import type { Entity, ValidationSummary, ImportMode, BatchResult } from '@/lib/bulkImport/types';
import { useToast } from '@/hooks/use-toast';

type Phase = 'pick' | 'preview' | 'running' | 'done';
type RunPhase = 'resolving' | 'writing';

function getAdminId(): string | null {
  const raw = localStorage.getItem('admin_user');
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { id?: string }).id ?? null;
  } catch {
    return null;
  }
}

export default function BulkImport() {
  const [phase, setPhase] = useState<Phase>('pick');
  // `entity` is set when the admin drops a file in one of the two columns,
  // then drives everything (parsing, validating, preview, import).
  const [entity, setEntity] = useState<Entity>('component');
  const [mode, setMode] = useState<ImportMode>('upsert');
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [runPhase, setRunPhase] = useState<RunPhase>('resolving');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<BatchResult[]>([]);
  const [logsRefreshKey, setLogsRefreshKey] = useState(0);
  const { toast } = useToast();

  const reset = () => {
    setPhase('pick');
    setSummary(null);
    setFileName('');
    setResults([]);
    setProgress({ done: 0, total: 0 });
  };

  const handleFile = (forEntity: Entity) => async (file: File) => {
    try {
      setEntity(forEntity);
      const map = getColumnMap(forEntity);
      const parsed = await parseExcelFile(file, map);
      if (parsed.headerErrors.length > 0) {
        toast({
          title: 'Header errors',
          description: parsed.headerErrors.join('; '),
          variant: 'destructive',
        });
        return;
      }
      const v = validateRows(parsed.rows, map);

      if (forEntity === 'product') {
        await annotateProductRowsWithDbChecks(v.rows);
        v.validRows = v.rows.filter(r => r.errors.length === 0).length;
        v.errorRows = v.rows.filter(r => r.errors.length > 0).length;
        v.warningRows = v.rows.filter(r => r.errors.length === 0 && r.warnings.length > 0).length;
      }

      setSummary(v);
      setFileName(file.name);
      setPhase('preview');
    } catch (e) {
      toast({ title: 'Parse failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  // Drop a single row from the preview (e.g. a duplicate SKU). Removing the
  // first occurrence of a SKU clears the "duplicate" flag on later rows, so we
  // re-derive in-file duplicates and recompute the valid/error/warning counts.
  const handleRemoveRow = (rowIndex: number) => {
    setSummary(prev => {
      if (!prev) return prev;
      const remaining = prev.rows.filter(r => r.rowIndex !== rowIndex);
      const uniqueKey = getColumnMap(entity).uniqueKey;
      return summarize(recomputeDuplicates(remaining, uniqueKey), prev.headerErrors);
    });
  };

  const handleConfirm = async () => {
    if (!summary) return;
    const adminId = getAdminId();
    if (!adminId) {
      toast({ title: 'Not signed in', variant: 'destructive' });
      return;
    }
    setPhase('running');
    setRunPhase('resolving');
    setProgress({ done: 0, total: 0 });
    try {
      const out = await runImport({
        entity,
        mode,
        adminId,
        rows: summary.rows,
        onPhaseChange: (p) => {
          setRunPhase(p);
          setProgress({ done: 0, total: 0 });
        },
        onResolveProgress: (done, total) => setProgress({ done, total }),
        onWriteProgress: (done, total) => setProgress({ done, total }),
      });
      setResults(out);
      setPhase('done');
      setLogsRefreshKey(k => k + 1);
    } catch (e) {
      toast({ title: 'Import failed', description: (e as Error).message, variant: 'destructive' });
      setPhase('preview');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Bulk Import</h1>
        <p className="text-muted-foreground">
          Upload a filled Excel template to bulk-create components or products.
          Google Drive image URLs are downloaded and re-hosted automatically.
        </p>
      </div>

      {phase === 'pick' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <EntityColumn
            entity="component"
            onFile={handleFile('component')}
            logsRefreshKey={logsRefreshKey}
          />
          <EntityColumn
            entity="product"
            onFile={handleFile('product')}
            logsRefreshKey={logsRefreshKey}
          />
        </div>
      )}

      {phase === 'preview' && summary && (
        <div className="space-y-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to import options
          </button>
          <div className="p-4 border rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {fileName}
                <span className="ml-2 text-xs uppercase text-muted-foreground">
                  ({entity})
                </span>
              </p>
              <p className="text-sm">
                ✓ {summary.validRows} valid · ✗ {summary.errorRows} errors · ⚠ {summary.warningRows} warnings
              </p>
            </div>
            <button className="text-sm underline" onClick={reset}>
              Choose a different file
            </button>
          </div>
          <PreviewTable summary={summary} entity={entity} onRemoveRow={handleRemoveRow} />
          <ModeSelector value={mode} onChange={setMode} />
          <Button onClick={handleConfirm} disabled={summary.validRows === 0}>
            Confirm import: {summary.validRows} rows
          </Button>
        </div>
      )}

      {phase === 'running' && (
        <div className="space-y-2 max-w-xl">
          <p className="text-sm font-medium">
            {runPhase === 'resolving'
              ? 'Step 1 of 2 — Re-hosting media to storage…'
              : 'Step 2 of 2 — Writing rows to database…'}
          </p>
          <p className="text-xs text-muted-foreground">
            {runPhase === 'resolving'
              ? 'Downloading from Google Drive / Dropbox / direct URLs and uploading to Supabase Storage. YouTube/Vimeo URLs are embedded as-is.'
              : 'Inserting rows and linking related records.'}
          </p>
          <ImportProgress done={progress.done} total={progress.total} />
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-4 max-w-3xl">
          <ResultSummary results={results} onReset={reset} />
        </div>
      )}
    </div>
  );
}
