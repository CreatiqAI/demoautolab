import { supabase } from '@/lib/supabase';
import type { ImportRequest, BatchResult, ParsedRow, ImportMode, Entity } from './types';

const BATCH_SIZE = 20;

export interface RunImportOpts {
  entity: Entity;
  mode: ImportMode;
  adminId: string;
  rows: ParsedRow[];
  onBatchComplete?: (done: number, total: number, results: BatchResult[]) => void;
}

export async function runImport(opts: RunImportOpts): Promise<BatchResult[]> {
  const all: BatchResult[] = [];
  const valid = opts.rows.filter(r => r.errors.length === 0);
  let done = 0;

  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE);
    const payload: ImportRequest = {
      entity: opts.entity,
      mode: opts.mode,
      admin_id: opts.adminId,
      rows: batch.map(r => ({
        rowIndex: r.rowIndex,
        fields: r.fields,
        mediaUrls: r.mediaUrls,
      })),
    };
    const { data, error } = await supabase.functions.invoke<{ results: BatchResult[] }>(
      'bulk-import-processor', { body: payload }
    );
    if (error || !data) {
      throw new Error(`Batch ${i / BATCH_SIZE + 1} failed: ${error?.message ?? 'unknown'}`);
    }
    all.push(...data.results);
    done += batch.length;
    opts.onBatchComplete?.(done, valid.length, data.results);
  }
  return all;
}
