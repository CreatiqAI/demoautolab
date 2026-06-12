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
import { runImport, checkMediaUrls } from '@/lib/bulkImport/api';
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
  // Pre-flight media-accessibility check results (null = not run for current file).
  const [mediaCheck, setMediaCheck] = useState<{
    running: boolean;
    done: number;
    total: number;
    ran: boolean;
    okCount: number;
    broken: Array<{ rowIndex: number; sku: string; url: string; error: string }>;
  } | null>(null);
  const { toast } = useToast();

  const reset = () => {
    setPhase('pick');
    setSummary(null);
    setFileName('');
    setResults([]);
    setProgress({ done: 0, total: 0 });
    setMediaCheck(null);
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
      setMediaCheck(null);
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
    setMediaCheck(null); // row set changed — prior check is stale
  };

  // Pre-flight: verify every image/video URL in the importable rows is reachable
  // and is real media, WITHOUT writing anything. Lets the admin fix broken links
  // in the sheet before committing instead of ending up with image-less rows.
  const handleCheckMedia = async () => {
    if (!summary) return;
    const uniqueKey = getColumnMap(entity).uniqueKey;
    const entries: Array<{ rowIndex: number; sku: string; url: string }> = [];
    for (const r of summary.rows) {
      if (r.errors.length > 0) continue; // only rows that will actually import
      const sku = String(r.fields[uniqueKey] ?? r.rowIndex);
      const urls = [r.mediaUrls.default, ...r.mediaUrls.gallery, r.mediaUrls.video]
        .filter((u): u is string => !!u);
      for (const url of urls) entries.push({ rowIndex: r.rowIndex, sku, url });
    }
    if (entries.length === 0) {
      toast({ title: 'No media URLs to check', description: 'None of the importable rows have an image or video URL.' });
      return;
    }
    const uniqueUrls = Array.from(new Set(entries.map(e => e.url)));
    setMediaCheck({ running: true, done: 0, total: uniqueUrls.length, ran: false, okCount: 0, broken: [] });
    try {
      const checkResults = await checkMediaUrls(uniqueUrls, (done, total) =>
        setMediaCheck(prev => (prev ? { ...prev, done, total } : prev)));
      const byUrl = new Map(checkResults.map(r => [r.url, r]));
      const okCount = checkResults.filter(r => r.ok).length;
      // One entry per (row, url) so the admin sees exactly which rows to fix.
      const broken = entries
        .filter(e => byUrl.get(e.url)?.ok === false)
        .map(e => ({ rowIndex: e.rowIndex, sku: e.sku, url: e.url, error: byUrl.get(e.url)?.error ?? 'failed' }));
      setMediaCheck({ running: false, done: checkResults.length, total: checkResults.length, ran: true, okCount, broken });
      toast(
        broken.length === 0
          ? { title: 'All media URLs OK', description: `${okCount} URL(s) verified accessible.` }
          : { title: `${broken.length} media URL(s) need attention`, description: 'See the list below — fix them in your sheet and re-upload.', variant: 'destructive' },
      );
    } catch (e) {
      setMediaCheck(null);
      toast({ title: 'Media check failed', description: (e as Error).message, variant: 'destructive' });
    }
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

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCheckMedia}
                disabled={mediaCheck?.running}
              >
                {mediaCheck?.running
                  ? `Checking media… ${mediaCheck.done}/${mediaCheck.total}`
                  : 'Check image URLs'}
              </Button>
              <span className="text-xs text-muted-foreground">
                Verifies every image/video URL is reachable before importing — nothing is written.
              </span>
            </div>
            {mediaCheck?.ran && (
              mediaCheck.broken.length === 0 ? (
                <p className="text-sm text-green-700 dark:text-green-400">
                  ✓ All {mediaCheck.okCount} media URL(s) are accessible.
                </p>
              ) : (
                <div className="border border-red-300 rounded-lg p-3 bg-red-50 dark:bg-red-950/30 space-y-1">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    ✗ {mediaCheck.broken.length} media URL(s) not accessible · ✓ {mediaCheck.okCount} OK
                  </p>
                  <div className="max-h-48 overflow-auto text-xs space-y-1">
                    {mediaCheck.broken.map((b, i) => (
                      <div key={i} className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-mono text-muted-foreground">row {b.rowIndex}</span>
                        <span className="font-mono">{b.sku}</span>
                        <span className="text-red-600 dark:text-red-400">{b.error}</span>
                        <span className="text-muted-foreground truncate max-w-md">{b.url}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fix these in your sheet and re-upload, or import anyway — those rows will be created without their image.
                  </p>
                </div>
              )
            )}
          </div>

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
