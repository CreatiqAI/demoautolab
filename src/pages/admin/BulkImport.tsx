import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EntityPicker } from '@/components/admin/bulkImport/EntityPicker';
import { TemplateDownloader } from '@/components/admin/bulkImport/TemplateDownloader';
import { FileDropzone } from '@/components/admin/bulkImport/FileDropzone';
import { PreviewTable } from '@/components/admin/bulkImport/PreviewTable';
import { ModeSelector } from '@/components/admin/bulkImport/ModeSelector';
import { ImportProgress } from '@/components/admin/bulkImport/ImportProgress';
import { ResultSummary } from '@/components/admin/bulkImport/ResultSummary';
import { parseExcelFile } from '@/lib/bulkImport/parser';
import { validateRows } from '@/lib/bulkImport/validators';
import { getColumnMap } from '@/lib/bulkImport/columnMaps';
import { runImport } from '@/lib/bulkImport/api';
import { annotateProductRowsWithDbChecks } from '@/lib/bulkImport/crossRowChecks';
import type { Entity, ValidationSummary, ImportMode, BatchResult } from '@/lib/bulkImport/types';
import { useToast } from '@/hooks/use-toast';

type Phase = 'pick' | 'preview' | 'running' | 'done';

function getAdminId(): string | null {
  const raw = localStorage.getItem('admin_user');
  if (!raw) return null;
  try { return (JSON.parse(raw) as { id?: string }).id ?? null; } catch { return null; }
}

type RunPhase = 'resolving' | 'writing';

export default function BulkImport() {
  const [phase, setPhase] = useState<Phase>('pick');
  const [entity, setEntity] = useState<Entity>('component');
  const [mode, setMode] = useState<ImportMode>('upsert');
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [runPhase, setRunPhase] = useState<RunPhase>('resolving');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<BatchResult[]>([]);
  const { toast } = useToast();
  const productsEnabled = true;

  const reset = () => {
    setPhase('pick'); setSummary(null); setFileName(''); setResults([]); setProgress({ done: 0, total: 0 });
  };

  const handleFile = async (file: File) => {
    try {
      const map = getColumnMap(entity);
      const parsed = await parseExcelFile(file, map);
      if (parsed.headerErrors.length > 0) {
        toast({ title: 'Header errors', description: parsed.headerErrors.join('; '), variant: 'destructive' });
        return;
      }
      const v = validateRows(parsed.rows, map);

      // Products have cross-row DB lookups: each component_sku_N must exist in
      // component_library, and the category name (if provided) should match an
      // existing category. Annotate errors/warnings now so the preview reflects
      // them before the admin confirms.
      if (entity === 'product') {
        await annotateProductRowsWithDbChecks(v.rows);
        // Recompute summary counts after annotations.
        v.validRows = v.rows.filter(r => r.errors.length === 0).length;
        v.errorRows = v.rows.filter(r => r.errors.length > 0).length;
        v.warningRows = v.rows.filter(r => r.errors.length === 0 && r.warnings.length > 0).length;
      }

      setSummary(v); setFileName(file.name); setPhase('preview');
    } catch (e) {
      toast({ title: 'Parse failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleConfirm = async () => {
    if (!summary) return;
    const adminId = getAdminId();
    if (!adminId) { toast({ title: 'Not signed in', variant: 'destructive' }); return; }
    setPhase('running');
    setRunPhase('resolving');
    setProgress({ done: 0, total: 0 });
    try {
      const out = await runImport({
        entity, mode, adminId, rows: summary.rows,
        onPhaseChange: (p) => {
          setRunPhase(p);
          setProgress({ done: 0, total: 0 });
        },
        onResolveProgress: (done, total) => setProgress({ done, total }),
        onWriteProgress: (done, total) => setProgress({ done, total }),
      });
      setResults(out); setPhase('done');
    } catch (e) {
      toast({ title: 'Import failed', description: (e as Error).message, variant: 'destructive' });
      setPhase('preview');
    }
  };

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk Import</h1>
        <p className="text-sm text-muted-foreground">
          Upload a filled Excel template to create components in bulk.
          Google Drive image URLs are downloaded and re-hosted automatically.
        </p>
      </div>

      <div className="flex items-end gap-4">
        <EntityPicker value={entity} onChange={setEntity} productsEnabled={productsEnabled} />
        <TemplateDownloader entity={entity} />
      </div>

      {phase === 'pick' && <FileDropzone onFile={handleFile} />}

      {phase === 'preview' && summary && (
        <div className="space-y-4">
          <div className="p-4 border rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{fileName}</p>
              <p className="text-sm">
                ✓ {summary.validRows} valid · ✗ {summary.errorRows} errors · ⚠ {summary.warningRows} warnings
              </p>
            </div>
            <button className="text-sm underline" onClick={reset}>Choose a different file</button>
          </div>
          <PreviewTable summary={summary} entity={entity} />
          <ModeSelector value={mode} onChange={setMode} />
          <Button
            onClick={handleConfirm}
            disabled={summary.validRows === 0}
          >
            Confirm import: {summary.validRows} rows
          </Button>
        </div>
      )}

      {phase === 'running' && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {runPhase === 'resolving'
              ? 'Step 1 of 2 — Re-hosting media to storage…'
              : 'Step 2 of 2 — Writing rows to database…'}
          </p>
          <p className="text-xs text-muted-foreground">
            {runPhase === 'resolving'
              ? 'Downloading from Google Drive / Dropbox / direct URLs and uploading to Supabase Storage. YouTube/Vimeo URLs are embedded as-is.'
              : 'Inserting products, components, and media rows.'}
          </p>
          <ImportProgress done={progress.done} total={progress.total} />
        </div>
      )}

      {phase === 'done' && <ResultSummary results={results} onReset={reset} />}
    </div>
  );
}
