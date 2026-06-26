import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  /** Visual size of the +/- buttons and field. */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Quantity control with steppers AND a directly-editable number field.
 * The user can type a value (commits on blur / Enter) or use the +/- buttons.
 * A local draft lets them clear the field while typing without it snapping back.
 */
export default function QuantityInput({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  size = 'md',
  className,
}: QuantityInputProps) {
  const [draft, setDraft] = useState(String(value));

  // Keep the field in sync when the committed value changes from elsewhere
  // (e.g. FOC scaling, another tab) — but not while the user is mid-edit.
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const clamp = (n: number) => {
    let v = Math.round(n);
    if (Number.isNaN(v)) v = min;
    if (v < min) v = min;
    if (max != null && v > max) v = max;
    return v;
  };

  const commit = (raw: string) => {
    const next = clamp(parseInt(raw, 10));
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const btnSize = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const fieldSize = size === 'sm' ? 'h-7 w-10 text-sm' : 'h-8 w-12 sm:w-14 text-sm';

  return (
    <div className={cn('flex items-center gap-1 sm:gap-2', className)}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= min}
        className={cn(btnSize, 'p-0')}
        aria-label="Decrease quantity"
      >
        <Minus className="h-3 w-3" />
      </Button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        onFocus={(e) => e.currentTarget.select()}
        className={cn(
          fieldSize,
          'text-center border rounded px-1 sm:px-2 py-1 tabular-nums',
          'focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50',
        )}
        aria-label="Quantity"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || (max != null && value >= max)}
        className={cn(btnSize, 'p-0')}
        aria-label="Increase quantity"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
