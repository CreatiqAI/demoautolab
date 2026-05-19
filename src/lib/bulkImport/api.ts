import { supabase } from '@/lib/supabase';
import type {
  BatchResult,
  Entity,
  ImportMode,
  ImportRequest,
  ParsedRow,
  ResolvedMedia,
} from './types';

const BATCH_SIZE = 20;
const REHOST_CONCURRENCY = 3;

function isEmbeddableUrl(url: string): boolean {
  return /youtube\.com\/watch|youtu\.be\/|vimeo\.com\//i.test(url);
}

// Pulls every media URL out of a row in declared order: default first (slot 1
// = primary), then the gallery list, then a video field if present (component
// case). Order matches what the user filled in the Excel.
function collectRowUrls(row: ParsedRow): string[] {
  const urls: string[] = [];
  if (row.mediaUrls.default) urls.push(row.mediaUrls.default);
  for (const u of row.mediaUrls.gallery) urls.push(u);
  if (row.mediaUrls.video) urls.push(row.mediaUrls.video);
  return urls;
}

async function resolveOneUrl(
  url: string
): Promise<{ url: string; mediaType: 'image' | 'video' } | { error: string }> {
  if (isEmbeddableUrl(url)) {
    return { url, mediaType: 'video' };
  }
  const { data, error } = await supabase.functions.invoke<{
    url: string;
    mediaType: 'image' | 'video';
  }>('rehost-media-url', { body: { url, folder: 'imports/admin' } });
  if (error || !data?.url) {
    return { error: error?.message ?? 'rehost failed' };
  }
  return { url: data.url, mediaType: data.mediaType };
}

interface PreparedRow {
  rowIndex: number;
  fields: Record<string, unknown>;
  resolvedMedia: ResolvedMedia[];
  mediaErrors: string[];
}

// Resolve every row's media URLs via rehost-media-url, with bounded concurrency.
// Returns rows ready to be sent to bulk-import-processor.
async function prepareRows(
  rows: ParsedRow[],
  onProgress?: (done: number, total: number) => void,
): Promise<PreparedRow[]> {
  type Task = { rowIdx: number; slotIdx: number; url: string };
  const tasks: Task[] = [];
  const urlsPerRow: string[][] = rows.map(r => collectRowUrls(r));
  urlsPerRow.forEach((urls, rowIdx) => {
    urls.forEach((url, slotIdx) => tasks.push({ rowIdx, slotIdx, url }));
  });

  const totalTasks = tasks.length;
  let doneTasks = 0;
  onProgress?.(0, totalTasks);

  const rowResults: Array<{
    resolved: Array<{ url: string; mediaType: 'image' | 'video' } | null>;
    errors: string[];
  }> = urlsPerRow.map(urls => ({
    resolved: new Array(urls.length).fill(null),
    errors: [],
  }));

  let next = 0;
  const workers = Array(Math.min(REHOST_CONCURRENCY, Math.max(totalTasks, 1)))
    .fill(0)
    .map(async () => {
      while (true) {
        const i = next++;
        if (i >= tasks.length) return;
        const t = tasks[i];
        const r = await resolveOneUrl(t.url);
        if ('error' in r) {
          rowResults[t.rowIdx].errors.push(`media slot ${t.slotIdx + 1}: ${r.error}`);
        } else {
          rowResults[t.rowIdx].resolved[t.slotIdx] = { url: r.url, mediaType: r.mediaType };
        }
        doneTasks++;
        onProgress?.(doneTasks, totalTasks);
      }
    });
  await Promise.all(workers);

  return rows.map((row, idx) => {
    const ok = rowResults[idx].resolved.filter(
      (m): m is { url: string; mediaType: 'image' | 'video' } => m !== null,
    );
    return {
      rowIndex: row.rowIndex,
      fields: row.fields,
      resolvedMedia: ok.map((m, i) => ({
        url: m.url,
        mediaType: m.mediaType,
        isPrimary: i === 0,
        sortOrder: i,
      })),
      mediaErrors: rowResults[idx].errors,
    };
  });
}

export interface RunImportOpts {
  entity: Entity;
  mode: ImportMode;
  adminId: string;
  rows: ParsedRow[];
  onPhaseChange?: (phase: 'resolving' | 'writing') => void;
  onResolveProgress?: (done: number, total: number) => void;
  onWriteProgress?: (done: number, total: number, results: BatchResult[]) => void;
}

export async function runImport(opts: RunImportOpts): Promise<BatchResult[]> {
  const validRows = opts.rows.filter(r => r.errors.length === 0);

  // Phase 1: resolve all media URLs via rehost-media-url. Each rehost is its
  // own edge-function invocation with its own CPU budget, so heavy image
  // decoding doesn't blow the bulk-import-processor's per-call CPU limit.
  opts.onPhaseChange?.('resolving');
  const prepared = await prepareRows(validRows, opts.onResolveProgress);

  // Phase 2: send batches of already-resolved rows to bulk-import-processor.
  // The processor now just does DB writes — fast, CPU-light, well within limits.
  opts.onPhaseChange?.('writing');
  const all: BatchResult[] = [];
  let done = 0;
  for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
    const batch = prepared.slice(i, i + BATCH_SIZE);
    const payload: ImportRequest = {
      entity: opts.entity,
      mode: opts.mode,
      admin_id: opts.adminId,
      rows: batch,
    };
    const { data, error } = await supabase.functions.invoke<{ results: BatchResult[] }>(
      'bulk-import-processor',
      { body: payload },
    );
    if (error || !data) {
      throw new Error(`Batch ${i / BATCH_SIZE + 1} failed: ${error?.message ?? 'unknown'}`);
    }
    // Merge per-row media errors from the resolve phase into the result so the
    // user sees them in the final summary.
    for (const result of data.results) {
      const p = batch.find(b => b.rowIndex === result.rowIndex);
      if (p && p.mediaErrors.length > 0) {
        result.mediaErrors = [...(result.mediaErrors ?? []), ...p.mediaErrors];
      }
    }
    all.push(...data.results);
    done += batch.length;
    opts.onWriteProgress?.(done, prepared.length, data.results);
  }
  return all;
}
