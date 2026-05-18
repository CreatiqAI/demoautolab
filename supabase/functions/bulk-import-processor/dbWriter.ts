// supabase/functions/bulk-import-processor/dbWriter.ts

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type Mode = 'insert' | 'update' | 'upsert';

export interface WriteInput {
  table: string;
  uniqueKey: string;
  mode: Mode;
  fields: Record<string, unknown>;
  defaultImageUrl: string | null;
  galleryUrls: string[];
  videoUrl: string | null;
}

export interface WriteResult {
  status: 'inserted' | 'updated' | 'skipped';
  recordId: string;
}

export async function writeRow(
  supabase: SupabaseClient,
  input: WriteInput
): Promise<WriteResult> {
  const skuValue = input.fields[input.uniqueKey];
  const { data: existing } = await supabase
    .from(input.table)
    .select('id')
    .eq(input.uniqueKey, skuValue as string)
    .maybeSingle();

  const payload: Record<string, unknown> = { ...input.fields };
  if (input.defaultImageUrl !== null) payload['default_image_url'] = input.defaultImageUrl;
  if (input.videoUrl !== null) payload['video_url'] = input.videoUrl;

  if (existing) {
    if (input.mode === 'insert') {
      return { status: 'skipped', recordId: (existing as any).id };
    }
    const { data: updated, error } = await supabase
      .from(input.table)
      .update(payload)
      .eq('id', (existing as any).id)
      .select('id')
      .single();
    if (error) throw error;
    await writeGallery(supabase, (updated as any).id, input.galleryUrls, /*replace=*/true);
    return { status: 'updated', recordId: (updated as any).id };
  } else {
    if (input.mode === 'update') {
      throw new Error(`SKU not found and mode=update: ${skuValue}`);
    }
    const { data: inserted, error } = await supabase
      .from(input.table)
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;
    await writeGallery(supabase, (inserted as any).id, input.galleryUrls, /*replace=*/false);
    return { status: 'inserted', recordId: (inserted as any).id };
  }
}

async function writeGallery(
  supabase: SupabaseClient,
  componentId: string,
  urls: string[],
  replace: boolean
) {
  if (replace) {
    await supabase.from('component_images').delete().eq('component_id', componentId);
  }
  if (urls.length === 0) return;
  const rows = urls.map((url, idx) => ({
    component_id: componentId,
    url,
    is_primary: false,
    sort_order: idx + 2,
    alt_text: null,
  }));
  const { error } = await supabase.from('component_images').insert(rows);
  if (error) throw error;
}
