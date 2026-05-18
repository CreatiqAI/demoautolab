// supabase/functions/bulk-import-processor/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdmin } from "./auth.ts";
import { processImageUrl } from "./imageProcessor.ts";
import { writeRow, type Mode } from "./dbWriter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RowPayload {
  rowIndex: number;
  fields: Record<string, unknown>;
  mediaUrls: { default: string | null; gallery: string[]; video: string | null };
}

interface Payload {
  entity: 'component' | 'product';
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

const TABLE_BY_ENTITY: Record<string, { table: string; uniqueKey: string }> = {
  component: { table: 'component_library', uniqueKey: 'component_sku' },
  product:   { table: 'products_new',      uniqueKey: 'sku' },
};

async function processWithLimit<T>(items: T[], limit: number, fn: (t: T) => Promise<RowResult>): Promise<RowResult[]> {
  const results: RowResult[] = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
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

    const entityCfg = TABLE_BY_ENTITY[body.entity];
    if (!entityCfg) {
      return new Response(JSON.stringify({ error: `unknown entity: ${body.entity}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dateFolder = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const folder = `imports/admin/${dateFolder}`;

    const results = await processWithLimit(body.rows, 5, async (row) => {
      const sku = String(row.fields[entityCfg.uniqueKey] ?? '');
      const mediaErrors: string[] = [];

      let defaultImg: string | null = null;
      if (row.mediaUrls.default) {
        const r = await processImageUrl(supabase, row.mediaUrls.default, folder, `${sku}-1`);
        if (r.ok) defaultImg = r.publicUrl;
        else mediaErrors.push(`image_1: ${r.error}`);
      }

      const gallery: string[] = [];
      for (let i = 0; i < row.mediaUrls.gallery.length; i++) {
        const url = row.mediaUrls.gallery[i];
        const r = await processImageUrl(supabase, url, folder, `${sku}-${i + 2}`);
        if (r.ok) gallery.push(r.publicUrl);
        else mediaErrors.push(`image_${i + 2}: ${r.error}`);
      }

      try {
        const w = await writeRow(supabase, {
          table: entityCfg.table,
          uniqueKey: entityCfg.uniqueKey,
          mode: body.mode,
          fields: row.fields,
          defaultImageUrl: defaultImg,
          galleryUrls: gallery,
          videoUrl: row.mediaUrls.video,
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
      result_json: results as any,
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
