import { supabase } from '@/lib/supabase';
import type { ParsedRow } from './types';

// Validate cross-row references that need DB lookups: component SKUs must
// exist in component_library, category names must exist in categories.
// Mutates the rows in-place by appending to errors/warnings.
export async function annotateProductRowsWithDbChecks(rows: ParsedRow[]): Promise<void> {
  if (rows.length === 0) return;

  const referencedSkus = new Set<string>();
  const referencedCategoryNames = new Set<string>();
  for (const row of rows) {
    for (let i = 1; i <= 5; i++) {
      const v = row.fields[`component_sku_${i}`];
      if (typeof v === 'string' && v) referencedSkus.add(v);
    }
    const cat = row.fields['category'];
    if (typeof cat === 'string' && cat) referencedCategoryNames.add(cat.toLowerCase());
  }

  const [skuResult, categoryResult] = await Promise.all([
    referencedSkus.size > 0
      ? supabase.from('component_library').select('component_sku').in('component_sku', Array.from(referencedSkus))
      : Promise.resolve({ data: [] as { component_sku: string }[], error: null }),
    referencedCategoryNames.size > 0
      ? supabase.from('categories').select('name').eq('active', true)
      : Promise.resolve({ data: [] as { name: string }[], error: null }),
  ]);

  const existingSkus = new Set<string>(
    ((skuResult.data ?? []) as { component_sku: string }[]).map(r => r.component_sku)
  );
  const existingCategories = new Set<string>(
    ((categoryResult.data ?? []) as { name: string }[]).map(r => r.name.toLowerCase())
  );

  for (const row of rows) {
    for (let i = 1; i <= 5; i++) {
      const v = row.fields[`component_sku_${i}`];
      if (typeof v === 'string' && v && !existingSkus.has(v)) {
        row.errors.push(`component_sku_${i}: SKU "${v}" not found in component library`);
      }
    }
    const cat = row.fields['category'];
    if (typeof cat === 'string' && cat && !existingCategories.has(cat.toLowerCase())) {
      row.warnings.push(`category "${cat}" not found — product will be uncategorised`);
    }
  }
}
