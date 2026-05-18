import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { Entity } from '@/lib/bulkImport/types';

const TEMPLATES: Record<Entity, string> = {
  component: '/templates/components-import-template.xlsx',
  product: '/templates/products-import-template.xlsx',
};

export function TemplateDownloader({ entity }: { entity: Entity }) {
  return (
    <Button variant="outline" asChild>
      <a href={TEMPLATES[entity]} download>
        <Download className="h-4 w-4 mr-2" />
        Download {entity} template
      </a>
    </Button>
  );
}
