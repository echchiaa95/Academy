-- Minimal stub schema: only the objects/columns the list functions under test use.
-- This is NOT the production schema — it exists so migration 0009 can be tested
-- in isolation on a scratch database.
create role anon nologin;
create role authenticated nologin;

create table public.tenants(id uuid primary key default gen_random_uuid(), slug text, status text default 'active');
create table public.posts(id uuid primary key default gen_random_uuid(), tenant_id uuid, published boolean, featured boolean default false, published_at timestamptz, created_at timestamptz default now());
create table public.books(id uuid primary key default gen_random_uuid(), tenant_id uuid, published boolean, featured boolean default false, featured_order int default 0, year int);
create or replace function public.is_tenant_active(uuid) returns boolean language sql stable as $$ select true $$;

-- the ORIGINAL 3-argument definitions (as shipped in 0002), so 0009's explicit
-- DROP + recreate is exercised exactly as on a real upgraded database
create or replace function public.list_public_posts(p_tenant_id uuid, p_featured boolean default false, p_limit int default 100)
returns setof public.posts language sql security definer stable set search_path = public as $$
  select * from public.posts
  where tenant_id = p_tenant_id and published = true
    and public.is_tenant_active(p_tenant_id)
    and (not p_featured or featured = true)
  order by published_at desc nulls last limit least(p_limit, 200)
$$;
grant execute on function public.list_public_posts(uuid, boolean, int) to anon, authenticated;

create or replace function public.list_public_books(p_tenant_id uuid, p_featured boolean default false, p_limit int default 100)
returns setof public.books language sql security definer stable set search_path = public as $$
  select * from public.books
  where tenant_id = p_tenant_id and published = true
    and public.is_tenant_active(p_tenant_id)
    and (not p_featured or featured = true)
  order by featured_order asc, year desc limit least(p_limit, 200)
$$;
grant execute on function public.list_public_books(uuid, boolean, int) to anon, authenticated;
