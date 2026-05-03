import { supabase } from '@/lib/supabase';

// Buckets that may hold product media uploads. Anything outside these is treated
// as external (e.g. YouTube/Vimeo) and skipped during cleanup.
const KNOWN_BUCKETS = ['product-videos', 'product-images'] as const;
type KnownBucket = typeof KNOWN_BUCKETS[number];

/**
 * Parse a Supabase Storage public URL into { bucket, path }.
 * Returns null for URLs that aren't in our known buckets (YouTube, Vimeo,
 * external CDNs, etc.) so callers can safely skip them.
 *
 * Expected format:
 *   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 */
export function parseStorageUrl(url: string): { bucket: KnownBucket; path: string } | null {
  if (!url) return null;
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const [, bucket, rawPath] = match;
  if (!KNOWN_BUCKETS.includes(bucket as KnownBucket)) return null;
  // Strip query string (cache-busters, transformations) from the path
  const path = rawPath.split('?')[0];
  return { bucket: bucket as KnownBucket, path };
}

/**
 * Best-effort delete of one or more storage files referenced by URL.
 * Groups by bucket so each bucket needs only one .remove() call.
 * Failures are swallowed and reported in the return value — the DB is the
 * source of truth, so a storage cleanup miss should never block the caller.
 *
 * Returns counts so the caller can surface a useful toast.
 */
export async function deleteStorageFiles(urls: string[]): Promise<{
  deleted: number;
  skipped: number;
  failed: number;
  errors: string[];
}> {
  const grouped = new Map<KnownBucket, string[]>();
  let skipped = 0;
  for (const url of urls) {
    const parsed = parseStorageUrl(url);
    if (!parsed) {
      skipped++;
      continue;
    }
    const list = grouped.get(parsed.bucket) ?? [];
    list.push(parsed.path);
    grouped.set(parsed.bucket, list);
  }

  let deleted = 0;
  let failed = 0;
  const errors: string[] = [];

  await Promise.all(
    Array.from(grouped.entries()).map(async ([bucket, paths]) => {
      try {
        const { data, error } = await supabase.storage.from(bucket).remove(paths);
        if (error) {
          failed += paths.length;
          errors.push(`${bucket}: ${error.message}`);
          return;
        }
        deleted += data?.length ?? paths.length;
      } catch (err: any) {
        failed += paths.length;
        errors.push(`${bucket}: ${err?.message ?? 'unknown error'}`);
      }
    })
  );

  return { deleted, skipped, failed, errors };
}

/**
 * List every file in our upload folders, then compare against URLs referenced
 * in product_images_new and return the storage paths that are NOT referenced.
 * Useful for a one-time orphan sweep after the storage-leak bug.
 */
export async function findOrphanStorageFiles(): Promise<{
  orphans: { bucket: KnownBucket; path: string }[];
  totalScanned: number;
  referencedCount: number;
}> {
  // Collect every uploads/* file across known buckets
  const allFiles: { bucket: KnownBucket; path: string }[] = [];
  for (const bucket of KNOWN_BUCKETS) {
    let offset = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list('uploads', { limit: pageSize, offset });
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const f of data) {
        // Skip folder entries (no .id, no metadata)
        if (!f.name) continue;
        allFiles.push({ bucket, path: `uploads/${f.name}` });
      }
      if (data.length < pageSize) break;
      offset += pageSize;
    }
  }

  // Pull every URL referenced from product_images_new (and any other tables
  // that point at these buckets in the future, add them here)
  const referencedPaths = new Set<string>();
  let from = 0;
  const batch = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('product_images_new' as any)
      .select('url')
      .range(from, from + batch - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data as any[]) {
      const parsed = parseStorageUrl(row.url);
      if (parsed) referencedPaths.add(`${parsed.bucket}/${parsed.path}`);
    }
    if (data.length < batch) break;
    from += batch;
  }

  const orphans = allFiles.filter(
    (f) => !referencedPaths.has(`${f.bucket}/${f.path}`)
  );

  return {
    orphans,
    totalScanned: allFiles.length,
    referencedCount: referencedPaths.size,
  };
}

/**
 * Delete a list of orphaned files (from findOrphanStorageFiles).
 * Returns counts so the admin tool can surface a meaningful summary.
 */
export async function deleteOrphans(orphans: { bucket: KnownBucket; path: string }[]): Promise<{
  deleted: number;
  failed: number;
}> {
  const grouped = new Map<KnownBucket, string[]>();
  for (const o of orphans) {
    const list = grouped.get(o.bucket) ?? [];
    list.push(o.path);
    grouped.set(o.bucket, list);
  }

  let deleted = 0;
  let failed = 0;
  await Promise.all(
    Array.from(grouped.entries()).map(async ([bucket, paths]) => {
      // Supabase storage .remove() accepts up to ~1000 paths per call; chunk to be safe
      const CHUNK = 500;
      for (let i = 0; i < paths.length; i += CHUNK) {
        const slice = paths.slice(i, i + CHUNK);
        try {
          const { data, error } = await supabase.storage.from(bucket).remove(slice);
          if (error) {
            failed += slice.length;
            continue;
          }
          deleted += data?.length ?? slice.length;
        } catch {
          failed += slice.length;
        }
      }
    })
  );
  return { deleted, failed };
}
