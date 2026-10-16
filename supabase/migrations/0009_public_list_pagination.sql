-- 0009 (corrected): pagination support for the public list RPCs.
--
-- Why this version replaces the previous draft:
-- `CREATE OR REPLACE FUNCTION` with an ADDED parameter does NOT replace the old
-- function — PostgreSQL creates a second OVERLOAD. The old 3-arg
-- list_public_posts(uuid, boolean, int) and the new 4-arg
-- list_public_posts(uuid, boolean, int, int default 0) would BOTH match a call
-- that supplies only 3 arguments, and PostgREST rejects such ambiguous calls
-- with PGRST203 ("Could not choose the best candidate function").
-- Fix: drop the old signatures explicitly, then create the 4-arg versions.
--
-- Dependency check performed before dropping (see diagnostics/0009_verify.sql):
-- no view, RLS policy, trigger, or other function references these two
-- functions — the only callers are the application RPC calls
-- (src/lib/api.ts, scripts/prerender.mjs). A plain DROP without CASCADE is
-- therefore sufficient and safe; if any dependency appears, this migration
-- fails loudly instead of dropping dependent objects silently.
--
-- Compatibility: p_offset defaults to 0, so existing 3-argument calls keep
-- working unchanged against the new single signature (PostgREST matches named
-- parameters; omitted trailing parameters take their defaults).

drop function if exists public.list_public_posts(uuid, boolean, integer);
drop function if exists public.list_public_books(uuid, boolean, integer);

create or replace function public.list_public_posts(
  p_tenant_id uuid, p_featured boolean default false, p_limit int default 100, p_offset int default 0)
returns setof public.posts language sql security definer stable set search_path = public as $$
  select * from public.posts
  where tenant_id = p_tenant_id and published = true
    and public.is_tenant_active(p_tenant_id)
    and (not p_featured or featured = true)
  order by published_at desc nulls last, id asc  -- id tiebreaker: deterministic batches
  limit least(p_limit, 200) offset greatest(p_offset, 0)  -- 200/request hard cap preserved
$$;

create or replace function public.list_public_books(
  p_tenant_id uuid, p_featured boolean default false, p_limit int default 100, p_offset int default 0)
returns setof public.books language sql security definer stable set search_path = public as $$
  select * from public.books
  where tenant_id = p_tenant_id and published = true
    and public.is_tenant_active(p_tenant_id)
    and (not p_featured or featured = true)
  order by featured_order asc, year desc, id asc  -- id tiebreaker: deterministic batches
  limit least(p_limit, 200) offset greatest(p_offset, 0)
$$;

-- grants on the NEW signatures (grants belong to a specific signature;
-- the dropped overloads' grants went away with them)
grant execute on function public.list_public_posts(uuid, boolean, int, int) to anon, authenticated;
grant execute on function public.list_public_books(uuid, boolean, int, int) to anon, authenticated;
