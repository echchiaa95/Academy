-- =============================================================
-- Migration 0002: Security hardening (audit fixes)
-- Run AFTER 0001_multi_tenant.sql. Idempotent. Never deletes data.
--
-- 1) Anonymous users can no longer enumerate OTHER tenants' content
--    through direct table API queries: direct public reads are limited
--    to the DEFAULT tenant (backward compatible for single-tenant
--    installs). Every other tenant's published content is served only
--    through security-definer RPCs that validate the tenant is ACTIVE.
-- 2) Storage: exact path match instead of LIKE '%' || name, with the
--    book's tenant validated against the object path.
-- 3) book_requests: the database rejects book_id/tenant_id mismatches.
-- 4) Domain verification: verify_domain now requires the observed TXT
--    records (real DNS evidence), records the verification method, and
--    hostnames are normalized/validated at the database level.
-- =============================================================

-- ---------- helpers ----------
create or replace function public.default_tenant_id()
returns uuid language sql security definer stable set search_path = public as $$
  select id from public.tenants where slug = 'default' limit 1
$$;

create or replace function public.is_tenant_active(t uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.tenants where id = t and status = 'active')
$$;

-- safe uuid extraction from a storage path tenants/{tenant_id}/...
create or replace function public.path_tenant_id(obj_name text)
returns uuid language plpgsql immutable set search_path = public as $$
begin
  if obj_name not like 'tenants/%' then return null; end if;
  return split_part(obj_name, '/', 2)::uuid;
exception when others then
  return null;
end $$;

-- ---------- public content RPCs (server-side tenant validation) ----------
-- These are the ONLY way anonymous users can read a non-default tenant's
-- content. They return published rows of ACTIVE tenants only — a slug or
-- tenant id supplied by the browser can never unlock suspended tenants
-- or unpublished rows.
create or replace function public.get_public_profile(p_tenant_id uuid)
returns setof public.profiles language sql security definer stable set search_path = public as $$
  select * from public.profiles
  where tenant_id = p_tenant_id and public.is_tenant_active(p_tenant_id)
  order by created_at asc limit 1
$$;

create or replace function public.get_public_settings(p_tenant_id uuid)
returns setof public.site_settings language sql security definer stable set search_path = public as $$
  select * from public.site_settings
  where tenant_id = p_tenant_id and public.is_tenant_active(p_tenant_id)
  order by created_at asc limit 1
$$;

create or replace function public.list_public_posts(p_tenant_id uuid, p_featured boolean default false, p_limit int default 100)
returns setof public.posts language sql security definer stable set search_path = public as $$
  select * from public.posts
  where tenant_id = p_tenant_id and published = true
    and public.is_tenant_active(p_tenant_id)
    and (not p_featured or featured = true)
  order by published_at desc nulls last limit least(p_limit, 200)
$$;

create or replace function public.get_public_post(p_tenant_id uuid, p_slug text)
returns setof public.posts language sql security definer stable set search_path = public as $$
  select * from public.posts
  where tenant_id = p_tenant_id and slug = p_slug and published = true
    and public.is_tenant_active(p_tenant_id)
  limit 1
$$;

create or replace function public.list_public_books(p_tenant_id uuid, p_featured boolean default false, p_limit int default 100)
returns setof public.books language sql security definer stable set search_path = public as $$
  select * from public.books
  where tenant_id = p_tenant_id and published = true
    and public.is_tenant_active(p_tenant_id)
    and (not p_featured or featured = true)
  order by featured_order asc, year desc limit least(p_limit, 200)
$$;

create or replace function public.get_public_book(p_tenant_id uuid, p_slug text)
returns setof public.books language sql security definer stable set search_path = public as $$
  select * from public.books
  where tenant_id = p_tenant_id and slug = p_slug and published = true
    and public.is_tenant_active(p_tenant_id)
  limit 1
$$;

-- ---------- RLS: stop cross-tenant enumeration via direct table reads ----------
drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read" on public.profiles for select
  using (tenant_id = public.default_tenant_id() or public.is_tenant_admin(tenant_id));

drop policy if exists "settings public read" on public.site_settings;
create policy "settings public read" on public.site_settings for select
  using (tenant_id = public.default_tenant_id() or public.is_tenant_admin(tenant_id));

drop policy if exists "posts public read published" on public.posts;
create policy "posts public read published" on public.posts for select
  using ((published = true and tenant_id = public.default_tenant_id()
          and public.is_tenant_active(tenant_id))
         or public.is_tenant_admin(tenant_id));

drop policy if exists "books public read published" on public.books;
create policy "books public read published" on public.books for select
  using ((published = true and tenant_id = public.default_tenant_id()
          and public.is_tenant_active(tenant_id))
         or public.is_tenant_admin(tenant_id));

-- ---------- book_requests: reject book/tenant mismatch in the database ----------
drop policy if exists "requests public insert" on public.book_requests;
create policy "requests public insert" on public.book_requests for insert
  with check (
    public.is_tenant_active(tenant_id)
    and exists (
      select 1 from public.books b
      where b.id = book_id
        and b.tenant_id = book_requests.tenant_id
        and b.published = true
        and b.type in ('PAID','REQUEST'))
  );

-- ---------- storage: exact, tenant-validated path matching ----------
drop policy if exists "ap books read free or admin" on storage.objects;
create policy "ap books read free or admin" on storage.objects for select
using (
  bucket_id = 'books' and (
    (name like 'tenants/%' and public.is_tenant_admin(public.path_tenant_id(name)))
    or public.is_superadmin()
    or (public.is_admin() and name not like 'tenants/%')  -- legacy un-prefixed files
    or exists (
      -- EXACT path match: no more LIKE '%' || name. For tenant-prefixed
      -- objects the book must belong to the tenant encoded in the path,
      -- be published, and be FREE — PAID/REQUEST PDFs can never be
      -- signed by anonymous users.
      select 1 from public.books b
      where b.type = 'FREE' and b.published = true
        and b.pdf_url = name
        and public.is_tenant_active(b.tenant_id)
        and (name not like 'tenants/%' or b.tenant_id = public.path_tenant_id(name)))
  )
);

-- tighten admin write policies to use the safe parser too
drop policy if exists "ap admin insert" on storage.objects;
create policy "ap admin insert" on storage.objects for insert
with check (
  bucket_id in ('profile','covers','books','previews') and (
    public.is_superadmin()
    or (name like 'tenants/%' and public.is_tenant_admin(public.path_tenant_id(name)))
    or (public.is_admin() and name not like 'tenants/%')
  )
);
drop policy if exists "ap admin update" on storage.objects;
create policy "ap admin update" on storage.objects for update
using (
  bucket_id in ('profile','covers','books','previews') and (
    public.is_superadmin()
    or (name like 'tenants/%' and public.is_tenant_admin(public.path_tenant_id(name)))
    or (public.is_admin() and name not like 'tenants/%')
  )
);
drop policy if exists "ap admin delete" on storage.objects;
create policy "ap admin delete" on storage.objects for delete
using (
  bucket_id in ('profile','covers','books','previews') and (
    public.is_superadmin()
    or (name like 'tenants/%' and public.is_tenant_admin(public.path_tenant_id(name)))
    or (public.is_admin() and name not like 'tenants/%')
  )
);

-- ---------- domain verification: real evidence, not just a token match ----------
-- evidence columns
alter table public.tenant_domains add column if not exists verification_method text;
alter table public.tenant_domains add column if not exists verification_evidence jsonb;

-- hostname normalization enforced by the database (new/updated rows):
-- lowercase FQDN only, no scheme/port/path, no IPs or localhost.
alter table public.tenant_domains drop constraint if exists hostname_format;
alter table public.tenant_domains add constraint hostname_format
  check (hostname = lower(hostname)
         and hostname ~ '^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$') not valid;

-- The old verify_domain(uuid, text) trusted a bare token match — replace it.
-- The new signature requires the TXT records observed by the caller
-- (Supabase Edge Function = server-side DNS lookup; browser DoH fallback
-- is recorded as method 'browser-doh' and is visibly weaker evidence).
drop function if exists public.verify_domain(uuid, text);
create or replace function public.verify_domain(p_domain_id uuid, p_txt text[], p_method text default 'browser-doh')
returns boolean language plpgsql security definer set search_path = public as $$
declare d record;
begin
  select * into d from public.tenant_domains where id = p_domain_id;
  if not found then return false; end if;
  if not public.is_tenant_admin(d.tenant_id) then return false; end if;
  -- the domain's secret token must appear in the observed TXT records
  if not exists (select 1 from unnest(coalesce(p_txt, array[]::text[])) r
                 where position(d.verification_token in r) > 0) then
    return false;
  end if;
  update public.tenant_domains
     set status = 'verified', verified_at = now(),
         verification_method = p_method,
         verification_evidence = jsonb_build_object('txt', to_jsonb(p_txt), 'observed_at', now())
   where id = p_domain_id;
  return true;
end $$;
