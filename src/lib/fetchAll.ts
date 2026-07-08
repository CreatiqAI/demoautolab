/**
 * Fetch every matching row, transparently paging past Supabase's
 * 1000-row-per-request cap. Without this, admin list/aggregation queries
 * silently truncate at 1000 rows (wrong counts, missing items, wrong revenue).
 *
 * Pass a factory that builds a FRESH query (select + filters + order) on each
 * call — it's re-invoked per page:
 *
 *   const rows = await fetchAllRows(() =>
 *     supabase.from('orders').select('*').order('created_at', { ascending: false }));
 *
 * Include a stable `.order(...)` so page boundaries are deterministic (add a
 * unique tiebreaker like `.order('id')` if the sort column can have ties).
 */
export async function fetchAllRows<T = any>(
  buildQuery: () => any,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    const page = (data as T[]) || [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}
