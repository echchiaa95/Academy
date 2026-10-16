-- Real-PostgreSQL verification of migration 0009. Run via tests/sql/run.sh on a
-- SCRATCH database only. Every check prints a row "test | t" — f means failure.
\set QUIET on

-- CHECK 0: exactly one overload per function after the corrected 0009
select '0. single overload posts' as test,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='list_public_posts') = 1 as pass
union all
select '0. single overload books',
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='list_public_books') = 1;

-- seed: tenant A = 260 published + 40 draft posts, 260 published + 30 draft books; tenant B = 5 posts
insert into public.tenants(id, slug) values ('11111111-1111-1111-1111-111111111111','a'),('22222222-2222-2222-2222-222222222222','b');
insert into public.posts(tenant_id, published, published_at)
  select '11111111-1111-1111-1111-111111111111', true, now() - (g || ' minutes')::interval from generate_series(1,260) g;
insert into public.posts(tenant_id, published, published_at)
  select '11111111-1111-1111-1111-111111111111', false, now() - (g || ' minutes')::interval from generate_series(1,40) g;
insert into public.books(tenant_id, published, featured_order, year)
  select '11111111-1111-1111-1111-111111111111', true, 0, 2020 from generate_series(1,260) g;
insert into public.books(tenant_id, published) select '11111111-1111-1111-1111-111111111111', false from generate_series(1,30) g;
insert into public.posts(tenant_id, published, published_at) select '22222222-2222-2222-2222-222222222222', true, now() from generate_series(1,5) g;

select '1. legacy 3-arg call works' as test, count(*) = 100 as pass
  from public.list_public_posts('11111111-1111-1111-1111-111111111111', false, 100);

create temp table b1 as select id from public.list_public_posts('11111111-1111-1111-1111-111111111111', false, 200, 0);
create temp table b2 as select id from public.list_public_posts('11111111-1111-1111-1111-111111111111', false, 200, 200);
select '2. batches 200+60 disjoint and complete' as test,
  (select count(*) from b1) = 200 and (select count(*) from b2) = 60
  and (select count(*) from (select id from b1 intersect select id from b2) x) = 0
  and (select count(*) from (select id from b1 union select id from b2) x) = 260 as pass;

select '3. cap 200 enforced on limit 500' as test, count(*) = 200 as pass
  from public.list_public_posts('11111111-1111-1111-1111-111111111111', false, 500, 0);

select '4. drafts excluded from all batches' as test,
  (select count(*) from (select id from b1 union select id from b2) u
   join public.posts p on p.id=u.id and not p.published) = 0 as pass;

select '5. tenant isolation' as test, count(*) = 5 as pass
  from public.list_public_posts('22222222-2222-2222-2222-222222222222', false, 200, 0);

select '6. books paginate 200+60' as test,
  (select count(*) from public.list_public_books('11111111-1111-1111-1111-111111111111', false, 200, 0)) = 200
  and (select count(*) from public.list_public_books('11111111-1111-1111-1111-111111111111', false, 200, 200)) = 60 as pass;

select '7. pagination terminates past the end' as test, count(*) = 0 as pass
  from public.list_public_posts('11111111-1111-1111-1111-111111111111', false, 200, 400);

select '8. grants anon+authenticated' as test, bool_and(has_function_privilege(r, 'public.list_public_posts(uuid,boolean,integer,integer)', 'EXECUTE'))
   and bool_and(has_function_privilege(r, 'public.list_public_books(uuid,boolean,integer,integer)', 'EXECUTE')) as pass
  from (values ('anon'), ('authenticated')) v(r);
