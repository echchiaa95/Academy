-- READ-ONLY verification for migration 0009. Run AFTER applying it.
-- Expected results are noted per query. Nothing here modifies data.

-- 1) Signatures: EXACTLY ONE overload per function, with 4 parameters.
--    If a 3-parameter overload still exists, the old migration draft ran
--    and left an ambiguous overload behind — drop it manually:
--      drop function public.list_public_posts(uuid, boolean, integer);
select p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('list_public_posts', 'list_public_books')
order by p.proname;
-- expected: 2 rows, each "p_tenant_id uuid, p_featured boolean, p_limit integer, p_offset integer"

-- 2) Permissions: anon and authenticated must have EXECUTE.
select p.proname as function_name, r.rolname as role,
       has_function_privilege(r.rolname, p.oid, 'EXECUTE') as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral (select rolname from pg_roles where rolname in ('anon', 'authenticated')) r
where n.nspname = 'public'
  and p.proname in ('list_public_posts', 'list_public_books')
order by p.proname, r.rolname;
-- expected: 4 rows, all can_execute = true

-- 3) Dependency audit (run BEFORE dropping anything, on any database):
--    confirms no view/policy/trigger/function depends on the two functions.
--    Both queries must return ZERO rows for a plain DROP to be safe.
--    NOTE: functions are pg_proc entries, not pg_class — the dependency check
--    must join pg_depend.refobjid to pg_proc.oid (checking pg_class.relname
--    would silently find nothing, because functions are not relations).
select distinct dependent_view.relname as dependent_view_or_relation
from pg_depend d
join pg_rewrite rw on rw.oid = d.objid
join pg_class dependent_view on dependent_view.oid = rw.ev_class
join pg_proc f on f.oid = d.refobjid
join pg_namespace n on n.oid = f.pronamespace
where n.nspname = 'public' and f.proname in ('list_public_posts', 'list_public_books');
select p.proname as dependent_function
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (p.prosrc ilike '%list_public_posts%' or p.prosrc ilike '%list_public_books%')
  and p.proname not in ('list_public_posts', 'list_public_books');
-- expected: 0 rows and 0 rows

-- 4) Behavior checks (replace :tid with a real tenant id having >200 posts):
--    a) legacy 3-arg call — must NOT raise PGRST203 ambiguity:
--       select count(*) from (
--         select * from public.list_public_posts(':tid'::uuid, false, 100)) s;
--    b) paginated calls — two batches must be disjoint and contiguous:
--       select id from public.list_public_posts(':tid'::uuid, false, 200, 0)
--       intersect
--       select id from public.list_public_posts(':tid'::uuid, false, 200, 200);
--       -- expected: 0 rows (no duplicates across batches)
--    c) cap enforced: requesting 500 returns at most 200:
--       select count(*) from public.list_public_posts(':tid'::uuid, false, 500, 0);
--       -- expected: <= 200
--    d) published-only: no draft ids may appear:
--       select count(*) from public.list_public_posts(':tid'::uuid, false, 200, 0) l
--       join public.posts p on p.id = l.id and p.published = false;
--       -- expected: 0
