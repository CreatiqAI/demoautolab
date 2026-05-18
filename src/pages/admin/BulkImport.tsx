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
import type { Entity, ValidationSummary, ImportMode, BatchResult } from '@/lib/bulkImport/types';
import { useToast } from '@/hooks/use-toast';

type Phase = 'pick' | 'preview' | 'running' | 'done';

function getAdminId(): string | null {
  const raw = localStorage.getItem('admin_user');
  if (!raw) return null;
  try { return (JSON.parse(raw) as { id?: string }).id ?? null; } catch { return null; }
}

export default function BulkImport() {
  const [phase, setPhase] = useState<Phase>('pick');
  const [entity, setEntity] = useState<Entity>('component');
  const [mode, setMode] = useState<ImportMode>('upsert');
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<BatchResult[]>([]);
  const { toast } = useToast();
  const productsEnabled = false;

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
    setProgress({ done: 0, total: summary.validRows });
    try {
      const out = await runImport({
        entity, mode, adminId, rows: summary.rows,
        onBatchComplete: (done, total) => setProgress({ done, total }),
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
          <PreviewTable summary={summary} />
          <ModeSelector value={mode} onChange={setMode} />
          <Button
            onClick={handleConfirm}
            disabled={summary.validRows === 0}
          >
            Confirm import: {summary.validRows} rows
          </Button>
        </div>
      )}

      {phase === 'running' && <ImportProgress done={progress.done} total={progress.total} />}

      {phase === 'done' && <ResultSummary results={results} onReset={reset} />}
    </div>
  );
}
