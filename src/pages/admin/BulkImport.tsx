import { useState } from 'react';
import { EntityPicker } from '@/components/admin/bulkImport/EntityPicker';
import { TemplateDownloader } from '@/components/admin/bulkImport/TemplateDownloader';
import type { Entity } from '@/lib/bulkImport/types';

export default function BulkImport() {
  const [entity, setEntity] = useState<Entity>('component');
  const productsEnabled = false;

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

      <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
        File upload + preview (next task)
      </div>
    </div>
  );
}
