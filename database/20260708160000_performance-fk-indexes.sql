-- Phase 3 performance: add covering indexes for foreign keys that lacked one
-- (38 FKs flagged by Supabase's performance advisor) and drop a duplicate GIN
-- index on products_new. Idempotent; already applied to the remote DB.
--
-- Deferred to Phase 1 (RLS rebuild), NOT done here: auth_rls_initplan (wrap
-- auth.uid() as (select auth.uid())) and multiple_permissive_policies — those
-- optimize policies that the Phase 1 security rebuild replaces, so they'll be
-- written correctly there. "Unused index" drops were also skipped: that verdict
-- is based on low-traffic dev stats and would risk dropping prod-needed indexes.

do $$
declare
  r record;
  idx_name text;
begin
  for r in
    select replace(con.conrelid::regclass::text, 'public.', '') as tbl,
           (select string_agg(quote_ident(a.attname), ', ' order by k.ord)
              from unnest(con.conkey) with ordinality k(attnum, ord)
              join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum) as cols,
           (select string_agg(a.attname, '_' order by k.ord)
              from unnest(con.conkey) with ordinality k(attnum, ord)
              join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum) as slug,
           con.conkey
    from pg_constraint con
    join pg_namespace n on n.oid = con.connamespace
    where con.contype = 'f' and n.nspname = 'public'
      and not exists (
        select 1 from pg_index i
        where i.indrelid = con.conrelid
          and (string_to_array(i.indkey::text, ' '))[1]::smallint = con.conkey[1]
      )
  loop
    idx_name := left('idx_' || r.tbl || '_' || r.slug, 63);
    begin
      execute format('create index if not exists %I on public.%I (%s)', idx_name, r.tbl, r.cols);
    exception when others then
      raise notice 'skip %: %', idx_name, sqlerrm;
    end;
  end loop;
end $$;

drop index if exists public.idx_products_new_keywords_gin;
