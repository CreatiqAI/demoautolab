import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ValidationSummary } from '@/lib/bulkImport/types';

interface Props {
  summary: ValidationSummary;
}

export function PreviewTable({ summary }: Props) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
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
        <TableBody>
          {summary.rows.map((r) => {
            const sku = (r.fields['component_sku'] ?? r.fields['slug'] ?? r.fields['sku']) as string;
            const name = r.fields['name'] as string;
            const type = (r.fields['component_type'] ?? r.fields['brand']) as string | undefined;
            const np = r.fields['normal_price'];
            const mp = r.fields['merchant_price'];
            const hasImage = r.mediaUrls.default ? '✓' : '—';
            const hasErr = r.errors.length > 0;
            const hasWarn = r.warnings.length > 0;
            return (
              <TableRow
                key={r.rowIndex}
                className={cn(hasErr && 'bg-red-50 dark:bg-red-950/30',
                              !hasErr && hasWarn && 'bg-yellow-50 dark:bg-yellow-950/30')}
              >
                <TableCell className="font-mono text-xs">{r.rowIndex}</TableCell>
                <TableCell className="font-mono text-xs">{sku ?? '—'}</TableCell>
                <TableCell>{name ?? '—'}</TableCell>
                <TableCell>{type ?? '—'}</TableCell>
                <TableCell className="text-right">{typeof np === 'number' ? np.toFixed(2) : '—'}</TableCell>
                <TableCell className="text-right">{typeof mp === 'number' ? mp.toFixed(2) : '—'}</TableCell>
                <TableCell className="text-right">{hasImage}</TableCell>
                <TableCell className="text-xs">
                  {hasErr ? (
                    <div className="space-y-0.5">
                      {r.errors.map((e, i) => <Badge key={i} variant="destructive" className="mr-1">{e}</Badge>)}
                    </div>
                  ) : hasWarn ? (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-700">{r.warnings.join('; ')}</Badge>
                  ) : (
                    <Badge variant="outline" className="border-green-500 text-green-700">Ready</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
