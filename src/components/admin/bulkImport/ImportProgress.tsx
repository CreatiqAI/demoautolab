import { Progress } from '@/components/ui/progress';

interface Props {
  done: number;
  total: number;
}

export function ImportProgress({ done, total }: Props) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Importing…</span>
        <span className="font-mono">{done} / {total} ({pct}%)</span>
      </div>
      <Progress value={pct} />
    </div>
  );
}
