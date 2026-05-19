// supabase/functions/bulk-import-processor/index.ts
// Receives rows whose media URLs have ALREADY been re-hosted to Supabase
// Storage (or YouTube/Vimeo embeds passed through) by the client, via the
// rehost-media-url edge function. This function does NO image processing —
// it only writes to the DB. That keeps each invocation well under the
// CPU/memory budget and lets us scale to many rows per call.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdmin } from "./auth.ts";
import { writeRow, type Mode } from "./dbWriter.ts";
import { writeProduct } from "./productWriter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Entity = 'component' | 'product';

interface ResolvedMedia {
  url: string;
  mediaType: 'image' | 'video';
  isPrimary: boolean;
  sortOrder: number;
}

interface RowPayload {
  rowIndex: number;
  fields: Record<string, unknown>;
  resolvedMedia: ResolvedMedia[];
  mediaErrors?: string[];
}

interface Payload {
  entity: Entity;
  mode: Mode;
  admin_id: string;
  rows: RowPayload[];
}

interface RowResult {
  rowIndex: number;
  status: 'inserted' | 'updated' | 'skipped' | 'error';
  sku: string;
  recordId?: string;
  error?: string;
  mediaErrors?: string[];
}

async function processWithLimit<T>(
  items: T[],
  limit: number,
  fn: (t: T) => Promise<RowResult>,
): Promise<RowResult[]> {
  const results: RowResult[] = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(limit, items.length))
    .fill(0)
    .map(async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) return;
        results[idx] = await fn(items[idx]);
      }
    });
  await Promise.all(workers);
  return results;
}

async function processComponentRow(
  supabase: SupabaseClient,
  row: RowPayload,
  mode: Mode,
): Promise<RowResult> {
  const sku = String(row.fields['component_sku'] ?? '');
  // Components have one default image. Pick the first resolved image URL.
  const defaultImg =
    row.resolvedMedia.find(m => m.mediaType === 'image' && m.isPrimary)?.url ??
    row.resolvedMedia.find(m => m.mediaType === 'image')?.url ??
    null;

  try {
    const w = await writeRow(supabase, {
      table: 'component_library',
      uniqueKey: 'component_sku',
      mode,
      fields: row.fields,
      defaultImageUrl: defaultImg,
      galleryUrls: [],
      videoUrl: null,
    });
    return {
      rowIndex: row.rowIndex,
      status: w.status,
      sku,
      recordId: w.recordId,
    };
  } catch (e) {
    return {
      rowIndex: row.rowIndex,
      status: 'error',
      sku,
      error: (e as Error).message,
    };
  }
}

async function processProductRow(
  supabase: SupabaseClient,
  row: RowPayload,
  mode: Mode,
): Promise<RowResult> {
  const name = String(row.fields['name'] ?? '');
  try {
    const w = await writeProduct(supabase, {
      mode,
      fields: row.fields,
      media: row.resolvedMedia,
    });
    return {
      rowIndex: row.rowIndex,
      status: w.status,
      sku: name,
      recordId: w.recordId,
    };
  } catch (e) {
    return {
      rowIndex: row.rowIndex,
      status: 'error',
      sku: name,
      error: (e as Error).message,
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const adminCheck = await verifyAdmin(supabase, body.admin_id);
    if (!adminCheck.ok) {
      return new Response(JSON.stringify({ error: adminCheck.message }), {
        status: adminCheck.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.entity !== 'component' && body.entity !== 'product') {
      return new Response(JSON.stringify({ error: `unknown entity: ${body.entity}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = await processWithLimit(body.rows, 5, async (row) => {
      if (body.entity === 'product') {
        return processProductRow(supabase, row, body.mode);
      }
      return processComponentRow(supabase, row, body.mode);
    });

    const succeeded = results.filter(r => r.status !== 'error').length;
    const failed = results.filter(r => r.status === 'error').length;
    await supabase.from('bulk_import_logs').insert({
      admin_id: body.admin_id,
      entity: body.entity,
      mode: body.mode,
      total_rows: results.length,
      succeeded,
      failed,
      result_json: results as unknown as Record<string, unknown>,
    });

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
