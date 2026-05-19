// supabase/functions/bulk-import-processor/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdmin } from "./auth.ts";
import { processImageUrl } from "./imageProcessor.ts";
import { processMediaUrl } from "./mediaProcessor.ts";
import { writeRow, type Mode } from "./dbWriter.ts";
import { writeProduct } from "./productWriter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Entity = 'component' | 'product';

interface RowPayload {
  rowIndex: number;
  fields: Record<string, unknown>;
  mediaUrls: { default: string | null; gallery: string[]; video: string | null };
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
  fn: (t: T) => Promise<RowResult>
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
  folder: string
): Promise<RowResult> {
  const sku = String(row.fields['component_sku'] ?? '');
  const mediaErrors: string[] = [];

  let defaultImg: string | null = null;
  if (row.mediaUrls.default) {
    const r = await processImageUrl(supabase, row.mediaUrls.default, folder, `${sku}-1`);
    if (r.ok) defaultImg = r.publicUrl;
    else mediaErrors.push(`image_url: ${r.error}`);
  }

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
      mediaErrors: mediaErrors.length ? mediaErrors : undefined,
    };
  } catch (e) {
    return {
      rowIndex: row.rowIndex,
      status: 'error',
      sku,
      error: (e as Error).message,
      mediaErrors: mediaErrors.length ? mediaErrors : undefined,
    };
  }
}

async function processProductRow(
  supabase: SupabaseClient,
  row: RowPayload,
  mode: Mode,
  folder: string
): Promise<RowResult> {
  const name = String(row.fields['name'] ?? '');
  const filenameBase = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || `product-${Date.now()}`;
  const mediaErrors: string[] = [];
  const allMediaUrls: string[] = [];
  if (row.mediaUrls.default) allMediaUrls.push(row.mediaUrls.default);
  for (const u of row.mediaUrls.gallery) allMediaUrls.push(u);

  const processedMedia: { url: string; mediaType: 'image' | 'video'; isPrimary: boolean; sortOrder: number }[] = [];

  for (let i = 0; i < allMediaUrls.length; i++) {
    const r = await processMediaUrl(supabase, allMediaUrls[i], folder, `${filenameBase}-${i + 1}`);
    if (r.ok) {
      processedMedia.push({
        url: r.url,
        mediaType: r.mediaType,
        isPrimary: i === 0,
        sortOrder: i,
      });
    } else {
      mediaErrors.push(`media_${i + 1}: ${r.error}`);
    }
  }

  try {
    const w = await writeProduct(supabase, {
      mode,
      fields: row.fields,
      media: processedMedia,
    });
    return {
      rowIndex: row.rowIndex,
      status: w.status,
      sku: name,
      recordId: w.recordId,
      mediaErrors: mediaErrors.length ? mediaErrors : undefined,
    };
  } catch (e) {
    return {
      rowIndex: row.rowIndex,
      status: 'error',
      sku: name,
      error: (e as Error).message,
      mediaErrors: mediaErrors.length ? mediaErrors : undefined,
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
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dateFolder = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const folder = `imports/admin/${dateFolder}`;

    const results = await processWithLimit(body.rows, 5, async (row) => {
      if (body.entity === 'product') {
        return processProductRow(supabase, row, body.mode, folder);
      }
      return processComponentRow(supabase, row, body.mode, folder);
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
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
