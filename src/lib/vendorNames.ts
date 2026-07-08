import { supabase } from '@/lib/supabase';

/**
 * Resolve vendor business names for the public storefront.
 *
 * The `vendors` base table is RLS-locked to the owning vendor + admins (it holds
 * bank / tax / commission data), so customers can't embed it. `vendors_public`
 * is a view exposing only id + business_name + logo of approved vendors.
 *
 * Returns a { [vendorId]: business_name } map. Never throws — a lookup failure
 * simply yields no names (the "Sold by" label is omitted), never a broken page.
 */
export async function fetchVendorNames(
  vendorIds: (string | null | undefined)[],
): Promise<Record<string, string>> {
  const ids = Array.from(new Set(vendorIds.filter(Boolean))) as string[];
  if (ids.length === 0) return {};
  try {
    const { data } = await supabase
      .from('vendors_public' as any)
      .select('id, business_name')
      .in('id', ids);
    const map: Record<string, string> = {};
    (data as { id: string; business_name: string }[] | null)?.forEach((v) => {
      if (v?.id && v?.business_name) map[v.id] = v.business_name;
    });
    return map;
  } catch {
    return {};
  }
}
