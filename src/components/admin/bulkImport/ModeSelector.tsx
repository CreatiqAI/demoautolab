import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { ImportMode } from '@/lib/bulkImport/types';

interface Props {
  value: ImportMode;
  onChange: (v: ImportMode) => void;
}

export function ModeSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label>Mode</Label>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as ImportMode)}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="insert" id="m-insert" />
          <Label htmlFor="m-insert" className="font-normal">Insert new only (skip existing SKUs)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="update" id="m-update" />
          <Label htmlFor="m-update" className="font-normal">Update existing only (skip new SKUs)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="upsert" id="m-upsert" />
          <Label htmlFor="m-upsert" className="font-normal">Upsert (insert new + update existing)</Label>
        </div>
      </RadioGroup>
    </div>
  );
}
