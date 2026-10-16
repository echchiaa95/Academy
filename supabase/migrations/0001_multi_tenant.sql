-- =============================================================
-- Migration 0001: Multi-Tenant SaaS
-- Run AFTER schema.sql + storage.sql. Idempotent. Never deletes data:
-- existing content is backfilled into a "default" tenant.
-- =============================================================

create extension if not exists "pgcrypto";

-- ---------- tenants ----------
create table if not exists public.tenants (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  status           text not null default 'active' check (status in ('active','suspended','pending')),
  owner_email      text not null default '',
  owner_user_id    uuid references auth.users(id) on delete set null,
  primary_language text not null default 'ar',
  country          text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
drop trigger if exists trg_tenants_updated on public.tenants;
create trigger trg_tenants_updated before update on public.tenants
for each row execute function public.set_updated_at();

-- ---------- tenant_members ----------
-- role 'superadmin' rows have tenant_id = NULL (platform-wide).
create table if not exists public.tenant_members (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid references public.tenants(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'admin' check (role in ('superadmin','admin')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);
alter table public.tenant_members alter column tenant_id drop not null;

-- ---------- role helpers (security definer, safe search_path) ----------
create or replace function public.is_superadmin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.tenant_members
                 where user_id = auth.uid() and role = 'superadmin')
$$;

create or replace function public.is_tenant_admin(t uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_superadmin() or exists (
    select 1 from public.tenant_members
    where user_id = auth.uid() and tenant_id = t and role in ('admin','superadmin'))
$$;

-- keep legacy is_admin() working: superadmin, member of any tenant, or legacy admin_users
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_superadmin()
      or exists (select 1 from public.admin_users where user_id = auth.uid())
      or exists (select 1 from public.tenant_members where user_id = auth.uid())
$$;

-- ---------- tenant_domains ----------
create table if not exists public.tenant_domains (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants(id) on delete cascade,
  hostname           text not null unique,
  is_primary         boolean not null default false,
  status             text not null default 'pending' check (status in ('pending','verified','active','disabled')),
  verification_token text not null default encode(gen_random_bytes(12), 'hex'),
  verified_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- a domain may never be verified/active without a real verification timestamp
  constraint domain_verification_required check (status in ('pending','disabled') or verified_at is not null)
);
drop trigger if exists trg_domains_updated on public.tenant_domains;
create trigger trg_domains_updated before update on public.tenant_domains
for each row execute function public.set_updated_at();

-- one primary domain per tenant (DB-level guarantee)
create unique index if not exists one_primary_domain_per_tenant
  on public.tenant_domains (tenant_id) where is_primary;

-- ---------- secure domain verification ----------
-- The browser performs a REAL DNS TXT lookup (via DNS-over-HTTPS); this
-- function then verifies the token server-side before flipping the status.
-- Nobody can mark a domain verified without knowing the stored token.
create or replace function public.verify_domain(p_domain_id uuid, p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
declare d record;
begin
  select * into d from public.tenant_domains where id = p_domain_id;
  if not found then return false; end if;
  if not public.is_tenant_admin(d.tenant_id) then return false; end if;
  if d.verification_token <> p_token then return false; end if;
  update public.tenant_domains
     set status = 'verified', verified_at = now()
   where id = p_domain_id;
  return true;
end $$;

-- ---------- tenant resolution for the public site ----------
create or replace function public.resolve_tenant_by_hostname(host text)
returns table(tenant_id uuid, name text, slug text, status text, domain_status text)
language sql security definer stable set search_path = public as $$
  select t.id, t.name, t.slug, t.status, d.status
  from public.tenant_domains d
  join public.tenants t on t.id = d.tenant_id
  where lower(d.hostname) = lower(host)
  order by d.is_primary desc nulls last
  limit 1
$$;

create or replace function public.resolve_tenant_by_slug(p_slug text)
returns table(tenant_id uuid, name text, slug text, status text, domain_status text)
language sql security definer stable set search_path = public as $$
  select t.id, t.name, t.slug, t.status, null::text
  from public.tenants t where t.slug = p_slug limit 1
$$;

-- ---------- onboarding: client signs up -> auto membership ----------
-- No passwords in the database, no service_role in the frontend:
-- superadmin stores owner_email on the tenant; when that email signs up
-- through Supabase Auth, this trigger links the membership automatically.
create or replace function public.handle_new_user_tenant()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.tenant_members (tenant_id, user_id, role)
  select t.id, new.id, 'admin' from public.tenants t
  where lower(t.owner_email) = lower(new.email) and new.email is not null
  on conflict do nothing;
  update public.tenants set owner_user_id = new.id
  where lower(owner_email) = lower(new.email) and new.email is not null;
  return new;
end $$;
drop trigger if exists on_auth_user_tenant on auth.users;
create trigger on_auth_user_tenant after insert on auth.users
for each row execute function public.handle_new_user_tenant();

-- ---------- default tenant + backfill (never deletes data) ----------
insert into public.tenants (name, slug, status)
select 'Default Site', 'default', 'active'
where not exists (select 1 from public.tenants where slug = 'default');

do $$
declare def_id uuid;
begin
  select id into def_id from public.tenants where slug = 'default';

  alter table public.profiles      add column if not exists tenant_id uuid references public.tenants(id);
  alter table public.posts         add column if not exists tenant_id uuid references public.tenants(id);
  alter table public.books         add column if not exists tenant_id uuid references public.tenants(id);
  alter table public.book_requests add column if not exists tenant_id uuid references public.tenants(id);
  alter table public.site_settings add column if not exists tenant_id uuid references public.tenants(id);

  update public.profiles      set tenant_id = def_id where tenant_id is null;
  update public.posts         set tenant_id = def_id where tenant_id is null;
  update public.books         set tenant_id = def_id where tenant_id is null;
  update public.book_requests set tenant_id = def_id where tenant_id is null;
  update public.site_settings set tenant_id = def_id where tenant_id is null;

  -- legacy admin_users become admins of the default tenant
  insert into public.tenant_members (tenant_id, user_id, role)
  select def_id, user_id, 'admin' from public.admin_users
  on conflict do nothing;
end $$;

-- =============================================================
-- RLS
-- =============================================================
alter table public.tenants        enable row level security;
alter table public.tenant_members enable row level security;
alter table public.tenant_domains enable row level security;

-- targeted drops only (project policies)
drop policy if exists "tenants member read" on public.tenants;
drop policy if exists "tenants admin update" on public.tenants;
drop policy if exists "tenants superadmin write" on public.tenants;
drop policy if exists "members read" on public.tenant_members;
drop policy if exists "members superadmin write" on public.tenant_members;
drop policy if exists "domains admin all" on public.tenant_domains;

drop policy if exists "profiles public read" on public.profiles;
drop policy if exists "profiles admin write" on public.profiles;
drop policy if exists "posts public read published" on public.posts;
drop policy if exists "posts admin insert" on public.posts;
drop policy if exists "posts admin update" on public.posts;
drop policy if exists "posts admin delete" on public.posts;
drop policy if exists "books public read published" on public.books;
drop policy if exists "books admin insert" on public.books;
drop policy if exists "books admin update" on public.books;
drop policy if exists "books admin delete" on public.books;
drop policy if exists "requests public insert" on public.book_requests;
drop policy if exists "requests admin read" on public.book_requests;
drop policy if exists "requests admin update" on public.book_requests;
drop policy if exists "requests admin delete" on public.book_requests;
drop policy if exists "settings public read" on public.site_settings;
drop policy if exists "settings admin write" on public.site_settings;

-- tenants: members see their tenants; superadmin manages everything.
-- (public resolution goes through the security-definer RPC, not direct reads)
create policy "tenants member read" on public.tenants for select
  using (public.is_superadmin() or exists (
    select 1 from public.tenant_members m where m.tenant_id = tenants.id and m.user_id = auth.uid()));
create policy "tenants admin update" on public.tenants for update
  using (public.is_tenant_admin(id)) with check (public.is_tenant_admin(id));
create policy "tenants superadmin write" on public.tenants for insert
  with check (public.is_superadmin());
drop policy if exists "tenants superadmin delete" on public.tenants;
create policy "tenants superadmin delete" on public.tenants for delete
  using (public.is_superadmin());

-- tenant_members: members read rows of their own tenants; only superadmin writes
create policy "members read" on public.tenant_members for select
  using (user_id = auth.uid() or public.is_superadmin()
         or (tenant_id is not null and public.is_tenant_admin(tenant_id)));
create policy "members superadmin write" on public.tenant_members for insert
  with check (public.is_superadmin());
drop policy if exists "members superadmin update" on public.tenant_members;
create policy "members superadmin update" on public.tenant_members for update
  using (public.is_superadmin()) with check (public.is_superadmin());
drop policy if exists "members superadmin delete" on public.tenant_members;
create policy "members superadmin delete" on public.tenant_members for delete
  using (public.is_superadmin());

-- domains: tenant admin manages only their own tenant's domains
create policy "domains admin all" on public.tenant_domains for all
  using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));

-- content tables: public reads stay public for PUBLISHED content;
-- every write is scoped to the caller's own tenant (IDOR-safe:
-- sending another tenant_id fails the WITH CHECK).
create policy "profiles public read" on public.profiles for select using (true);
create policy "profiles admin write" on public.profiles for all
  using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));

create policy "posts public read published" on public.posts for select
  using (published = true or public.is_tenant_admin(tenant_id));
create policy "posts admin insert" on public.posts for insert
  with check (public.is_tenant_admin(tenant_id));
create policy "posts admin update" on public.posts for update
  using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));
create policy "posts admin delete" on public.posts for delete
  using (public.is_tenant_admin(tenant_id));

create policy "books public read published" on public.books for select
  using (published = true or public.is_tenant_admin(tenant_id));
create policy "books admin insert" on public.books for insert
  with check (public.is_tenant_admin(tenant_id));
create policy "books admin update" on public.books for update
  using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));
create policy "books admin delete" on public.books for delete
  using (public.is_tenant_admin(tenant_id));

create policy "requests public insert" on public.book_requests for insert
  with check (exists (select 1 from public.tenants t where t.id = tenant_id and t.status = 'active'));
create policy "requests admin read" on public.book_requests for select
  using (public.is_tenant_admin(tenant_id));
create policy "requests admin update" on public.book_requests for update
  using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));
create policy "requests admin delete" on public.book_requests for delete
  using (public.is_tenant_admin(tenant_id));

create policy "settings public read" on public.site_settings for select using (true);
create policy "settings admin write" on public.site_settings for all
  using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));

-- =============================================================
-- Storage: tenant-scoped paths  tenants/{tenant_id}/...
-- buckets stay the same (profile / covers / previews public-read,
-- books private). Legacy un-prefixed files remain readable.
-- =============================================================
drop policy if exists "ap public read" on storage.objects;
drop policy if exists "ap books read free or admin" on storage.objects;
drop policy if exists "ap admin insert" on storage.objects;
drop policy if exists "ap admin update" on storage.objects;
drop policy if exists "ap admin delete" on storage.objects;

create policy "ap public read" on storage.objects for select
  using (bucket_id in ('profile','covers','previews'));

-- books (private): FREE published books via signed URL (tenant derived
-- from the path), or the tenant's admin.
create policy "ap books read free or admin" on storage.objects for select
using (
  bucket_id = 'books' and (
    (name like 'tenants/%' and public.is_tenant_admin(nullif(split_part(name, '/', 2), '')::uuid))
    or public.is_superadmin()
    or (public.is_admin() and name not like 'tenants/%')  -- legacy files
    or exists (
      select 1 from public.books b
      where b.type = 'FREE' and b.published = true and b.pdf_url like '%' || name)
  )
);

create policy "ap admin insert" on storage.objects for insert
with check (
  bucket_id in ('profile','covers','books','previews') and (
    public.is_superadmin()
    or (name like 'tenants/%' and public.is_tenant_admin(nullif(split_part(name, '/', 2), '')::uuid))
    or (public.is_admin() and name not like 'tenants/%')  -- legacy paths
  )
);
create policy "ap admin update" on storage.objects for update
using (
  bucket_id in ('profile','covers','books','previews') and (
    public.is_superadmin()
    or (name like 'tenants/%' and public.is_tenant_admin(nullif(split_part(name, '/', 2), '')::uuid))
    or (public.is_admin() and name not like 'tenants/%')
  )
);
create policy "ap admin delete" on storage.objects for delete
using (
  bucket_id in ('profile','covers','books','previews') and (
    public.is_superadmin()
    or (name like 'tenants/%' and public.is_tenant_admin(nullif(split_part(name, '/', 2), '')::uuid))
    or (public.is_admin() and name not like 'tenants/%')
  )
);
