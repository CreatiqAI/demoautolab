import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Entity, ValidationSummary } from '@/lib/bulkImport/types';

interface Props {
  summary: ValidationSummary;
  entity: Entity;
}

export function PreviewTable({ summary, entity }: Props) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        {entity === 'component' ? <ComponentHeader /> : <ProductHeader />}
        <TableBody>
          {summary.rows.map((r) => {
            const hasErr = r.errors.length > 0;
            const hasWarn = r.warnings.length > 0;
            return (
              <TableRow
                key={r.rowIndex}
                className={cn(
                  hasErr && 'bg-red-50 dark:bg-red-950/30',
                  !hasErr && hasWarn && 'bg-yellow-50 dark:bg-yellow-950/30',
                )}
              >
                {entity === 'component' ? <ComponentCells r={r} /> : <ProductCells r={r} />}
                <StatusCell errors={r.errors} warnings={r.warnings} />
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function ComponentHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-12">Row</TableHead>
        <TableHead>SKU</TableHead>
        <TableHead>Name</TableHead>
        <TableHead>Type</TableHead>
        <TableHead className="text-right">Normal</TableHead>
        <TableHead className="text-right">Merchant</TableHead>
        <TableHead className="text-right">Image</TableHead>
        <TableHead>Status</TableHead>
      </TableRow>
    </TableHeader>
  );
}

function ComponentCells({ r }: { r: ValidationSummary['rows'][number] }) {
  const sku = r.fields['component_sku'] as string | undefined;
  const name = r.fields['name'] as string | undefined;
  const type = r.fields['component_type'] as string | undefined;
  const np = r.fields['normal_price'];
  const mp = r.fields['merchant_price'];
  const hasImage = r.mediaUrls.default ? '✓' : '—';
  return (
    <>
      <TableCell className="font-mono text-xs">{r.rowIndex}</TableCell>
      <TableCell className="font-mono text-xs">{sku ?? '—'}</TableCell>
      <TableCell>{name ?? '—'}</TableCell>
      <TableCell>{type ?? '—'}</TableCell>
      <TableCell className="text-right">{typeof np === 'number' ? np.toFixed(2) : '—'}</TableCell>
      <TableCell className="text-right">{typeof mp === 'number' ? mp.toFixed(2) : '—'}</TableCell>
      <TableCell className="text-right">{hasImage}</TableCell>
    </>
  );
}

function ProductHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-12">Row</TableHead>
        <TableHead>Name</TableHead>
        <TableHead>Category</TableHead>
        <TableHead>Brand / Model</TableHead>
        <TableHead className="text-right">Components</TableHead>
        <TableHead className="text-right">Media</TableHead>
        <TableHead>Status</TableHead>
      </TableRow>
    </TableHeader>
  );
}

function ProductCells({ r }: { r: ValidationSummary['rows'][number] }) {
  const name = r.fields['name'] as string | undefined;
  const category = r.fields['category'] as string | undefined;
  const brand = r.fields['brand'] as string | undefined;
  const model = r.fields['model'] as string | undefined;
  let componentCount = 0;
  for (let i = 1; i <= 5; i++) {
    if (r.fields[`component_sku_${i}`]) componentCount++;
  }
  const mediaCount = (r.mediaUrls.default ? 1 : 0) + r.mediaUrls.gallery.length;
  const brandModel = [brand, model].filter(Boolean).join(' / ') || '—';
  return (
    <>
      <TableCell className="font-mono text-xs">{r.rowIndex}</TableCell>
      <TableCell>{name ?? '—'}</TableCell>
      <TableCell>{category ?? '—'}</TableCell>
      <TableCell className="text-xs">{brandModel}</TableCell>
      <TableCell className="text-right">{componentCount}/5</TableCell>
      <TableCell className="text-right">{mediaCount}/15</TableCell>
    </>
  );
}

function StatusCell({ errors, warnings }: { errors: string[]; warnings: string[] }) {
  if (errors.length > 0) {
    return (
      <TableCell className="text-xs">
        <div className="space-y-0.5">
          {errors.map((e, i) => (
            <Badge key={i} variant="destructive" className="mr-1">
              {e}
            </Badge>
          ))}
        </div>
      </TableCell>
    );
  }
  if (warnings.length > 0) {
    return (
      <TableCell className="text-xs">
        <Badge variant="outline" className="border-yellow-500 text-yellow-700">
          {warnings.join('; ')}
        </Badge>
      </TableCell>
    );
  }
  return (
    <TableCell className="text-xs">
      <Badge variant="outline" className="border-green-500 text-green-700">
        Ready
      </Badge>
    </TableCell>
  );
}
