// supabase/functions/bulk-import-processor/productWriter.ts
// Product-specific DB writes: resolves category by name, auto-generates
// a unique slug, looks up component IDs from SKUs, and writes the four
// related tables (products_new, product_components, product_images_new).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type Mode = 'insert' | 'update' | 'upsert';

export interface ProductMediaEntry {
  url: string;
  mediaType: 'image' | 'video';
  isPrimary: boolean;
  sortOrder: number;
}

export interface WriteProductInput {
  mode: Mode;
  fields: Record<string, unknown>;
  media: ProductMediaEntry[];
}

export interface WriteProductResult {
  status: 'inserted' | 'updated' | 'skipped';
  recordId: string;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function uniqueSlug(supabase: SupabaseClient, base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || 'product';
  let candidate = root;
  let i = 2;
  while (true) {
    let query = supabase.from('products_new').select('id').eq('slug', candidate);
    if (ignoreId) query = query.neq('id', ignoreId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    candidate = `${root}-${i++}`;
    if (i > 100) return `${root}-${Date.now()}`;
  }
}

async function resolveCategoryId(
  supabase: SupabaseClient,
  categoryName: unknown
): Promise<string | null> {
  if (typeof categoryName !== 'string' || !categoryName.trim()) return null;
  const { data } = await supabase
    .from('categories')
    .select('id')
    .ilike('name', categoryName.trim())
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

async function resolveComponentIds(
  supabase: SupabaseClient,
  skus: string[]
): Promise<Map<string, string>> {
  if (skus.length === 0) return new Map();
  const { data } = await supabase
    .from('component_library')
    .select('id, component_sku')
    .in('component_sku', skus);
  const map = new Map<string, string>();
  for (const row of (data ?? []) as { id: string; component_sku: string }[]) {
    map.set(row.component_sku, row.id);
  }
  return map;
}

export async function writeProduct(
  supabase: SupabaseClient,
  input: WriteProductInput
): Promise<WriteProductResult> {
  const name = String(input.fields['name'] ?? '').trim();
  if (!name) throw new Error('product name required');

  const componentSkus: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const v = input.fields[`component_sku_${i}`];
    if (typeof v === 'string' && v.trim()) componentSkus.push(v.trim());
  }
  if (componentSkus.length === 0) {
    throw new Error('at least one component_sku is required');
  }

  const componentIdMap = await resolveComponentIds(supabase, componentSkus);
  const missingSkus = componentSkus.filter(sku => !componentIdMap.has(sku));
  if (missingSkus.length > 0) {
    throw new Error(`component SKU(s) not found in component_library: ${missingSkus.join(', ')}`);
  }

  const { data: existing } = await supabase
    .from('products_new')
    .select('id, slug')
    .ilike('name', name)
    .maybeSingle();

  if (existing && input.mode === 'insert') {
    return { status: 'skipped', recordId: (existing as { id: string }).id };
  }
  if (!existing && input.mode === 'update') {
    throw new Error(`product not found and mode=update: ${name}`);
  }

  const categoryId = await resolveCategoryId(supabase, input.fields['category']);

  const screenSizeRaw = input.fields['screen_size'];
  const screenSize = typeof screenSizeRaw === 'string' && screenSizeRaw.trim()
    ? [screenSizeRaw.trim()]
    : null;

  const productPayload: Record<string, unknown> = {
    name,
    description: input.fields['description'] ?? null,
    brand: input.fields['brand'] ?? null,
    model: input.fields['model'] ?? null,
    category_id: categoryId,
    screen_size: screenSize,
    year_from: input.fields['year_from'] ?? null,
    year_to: input.fields['year_to'] ?? null,
    active: input.fields['active'] === false ? false : true,
    approval_status: 'APPROVED',
  };

  let productId: string;
  let status: 'inserted' | 'updated';

  if (existing) {
    const existingId = (existing as { id: string }).id;
    const { error: updErr } = await supabase
      .from('products_new')
      .update(productPayload)
      .eq('id', existingId);
    if (updErr) throw updErr;
    productId = existingId;
    status = 'updated';

    // Replace junction rows on update.
    await supabase.from('product_components').delete().eq('product_id', productId);
    await supabase.from('product_images_new').delete().eq('product_id', productId);
  } else {
    productPayload['slug'] = await uniqueSlug(supabase, name);
    const { data: inserted, error: insErr } = await supabase
      .from('products_new')
      .insert(productPayload)
      .select('id')
      .single();
    if (insErr) throw insErr;
    productId = (inserted as { id: string }).id;
    status = 'inserted';
  }

  // Link components in declared order.
  const componentRows = componentSkus.map((sku, idx) => ({
    product_id: productId,
    component_id: componentIdMap.get(sku)!,
    is_required: false,
    is_default: idx === 0,
    display_order: idx,
    remark: null,
  }));
  if (componentRows.length > 0) {
    const { error: compErr } = await supabase
      .from('product_components')
      .insert(componentRows);
    if (compErr) throw compErr;
  }

  // Insert media. Slot 1 is primary by convention.
  if (input.media.length > 0) {
    const mediaRows = input.media.map(m => ({
      product_id: productId,
      url: m.url,
      alt_text: `${name} - ${m.mediaType === 'video' ? 'Video' : 'Image'}`,
      is_primary: m.isPrimary,
      sort_order: m.sortOrder,
      media_type: m.mediaType,
    }));
    const { error: mediaErr } = await supabase
      .from('product_images_new')
      .insert(mediaRows);
    if (mediaErr) throw mediaErr;
  }

  return { status, recordId: productId };
}
