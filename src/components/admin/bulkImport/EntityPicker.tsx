import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Entity } from '@/lib/bulkImport/types';

interface Props {
  value: Entity;
  onChange: (v: Entity) => void;
  productsEnabled: boolean;
}

export function EntityPicker({ value, onChange, productsEnabled }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor="entity">Import what?</Label>
      <Select value={value} onValueChange={(v) => onChange(v as Entity)}>
        <SelectTrigger id="entity" className="w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="component">Components</SelectItem>
          <SelectItem value="product" disabled={!productsEnabled}>
            Products {productsEnabled ? '' : '(coming soon)'}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
