import { Package, ShoppingBag } from 'lucide-react';
import { TemplateDownloader } from './TemplateDownloader';
import { FileDropzone } from './FileDropzone';
import { ImportLogs } from './ImportLogs';
import type { Entity } from '@/lib/bulkImport/types';

interface Props {
  entity: Entity;
  onFile: (file: File) => void;
  logsRefreshKey: number;
}

const META: Record<Entity, { title: string; subtitle: string; Icon: typeof Package }> = {
  component: {
    title: 'Components',
    subtitle: 'Bulk-create rows in the component library.',
    Icon: Package,
  },
  product: {
    title: 'Products',
    subtitle: 'Bulk-create products and link existing components.',
    Icon: ShoppingBag,
  },
};

export function EntityColumn({ entity, onFile, logsRefreshKey }: Props) {
  const { title, subtitle, Icon } = META[entity];
  return (
    <div className="border rounded-lg p-4 space-y-4 flex flex-col">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-muted">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <TemplateDownloader entity={entity} />

      <FileDropzone onFile={onFile} />

      <div className="space-y-2 pt-2 border-t">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Past imports
        </h3>
        <ImportLogs entity={entity} refreshKey={logsRefreshKey} />
      </div>
    </div>
  );
}
