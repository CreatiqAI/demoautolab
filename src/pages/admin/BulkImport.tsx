import { useState } from 'react';
import { EntityPicker } from '@/components/admin/bulkImport/EntityPicker';
import { TemplateDownloader } from '@/components/admin/bulkImport/TemplateDownloader';
import { FileDropzone } from '@/components/admin/bulkImport/FileDropzone';
import { parseExcelFile } from '@/lib/bulkImport/parser';
import { validateRows } from '@/lib/bulkImport/validators';
import { getColumnMap } from '@/lib/bulkImport/columnMaps';
import type { Entity, ValidationSummary } from '@/lib/bulkImport/types';
import { useToast } from '@/hooks/use-toast';

export default function BulkImport() {
  const [entity, setEntity] = useState<Entity>('component');
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const { toast } = useToast();
  const productsEnabled = false;

  const handleFile = async (file: File) => {
    try {
      const map = getColumnMap(entity);
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
      v.headerErrors = parsed.headerErrors;
      setSummary(v);
      setFileName(file.name);
    } catch (e) {
      toast({ title: 'Parse failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 max-w-5xl space-y-6">
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

      {!summary && <FileDropzone onFile={handleFile} />}
      {summary && (
        <div className="space-y-2 p-4 border rounded-lg">
          <p className="text-sm">{fileName}</p>
          <p className="text-sm">
            ✓ {summary.validRows} valid · ✗ {summary.errorRows} errors · ⚠ {summary.warningRows} warnings
          </p>
          <button className="text-sm underline" onClick={() => setSummary(null)}>Choose a different file</button>
        </div>
      )}
    </div>
  );
}
