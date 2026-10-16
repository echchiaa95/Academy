-- 0006_i18n_adsense_seo.sql
-- Additive migration: independent multilingual content, per-tenant AdSense config, SEO fields.
-- Nothing is dropped; existing rows are preserved and treated as the tenant's primary language.

-- ---------- 1) base-language marker on existing content ----------
alter table public.posts    add column if not exists language_code text not null default 'ar';
alter table public.books    add column if not exists language_code text not null default 'ar';
alter table public.profiles add column if not exists language_code text not null default 'ar';
alter table public.site_settings add column if not exists language_code text not null default 'ar';

-- backfill: existing content belongs to the tenant's primary_language (default 'ar')
update public.posts p set language_code = coalesce(
  (select t.primary_language from public.tenants t where t.id = p.tenant_id), 'ar')
  where p.language_code = 'ar';
update public.books b set language_code = coalesce(
  (select t.primary_language from public.tenants t where t.id = b.tenant_id), 'ar')
  where b.language_code = 'ar';

-- ---------- 2) per-tenant SEO + AdSense settings ----------
alter table public.site_settings
  add column if not exists seo_title text not null default '',
  add column if not exists seo_description text not null default '',
  add column if not exists canonical_url text not null default '',
  add column if not exists og_image_url text not null default '',
  add column if not exists robots_directive text not null default 'index,follow',
  add column if not exists google_site_verification text not null default '',
  add column if not exists adsense_enabled boolean not null default false,
  add column if not exists adsense_publisher_id text not null default '',
  add column if not exists adsense_auto_ads_enabled boolean not null default false,
  add column if not exists adsense_updated_at timestamptz;

-- publisher id format: ca-pub-XXXXXXXXXXXXXXXX (public integration value, not a secret)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'site_settings_adsense_pub_fmt') then
    alter table public.site_settings add constraint site_settings_adsense_pub_fmt
      check (adsense_publisher_id = '' or adsense_publisher_id ~ '^ca-pub-[0-9]{10,20}$');
  end if;
end $$;

-- ---------- 3) translation tables ----------
create table if not exists public.post_translations (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  post_id         uuid not null references public.posts(id) on delete cascade,
  language_code   text not null check (language_code in ('ar','fr','en')),
  title           text not null default '',
  slug            text not null default '',
  excerpt         text not null default '',
  content         text not null default '',
  seo_title       text not null default '',
  seo_description text not null default '',
  published       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (post_id, language_code),
  unique (tenant_id, language_code, slug)
);

create table if not exists public.book_translations (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  book_id         uuid not null references public.books(id) on delete cascade,
  language_code   text not null check (language_code in ('ar','fr','en')),
  title           text not null default '',
  slug            text not null default '',
  description     text not null default '',
  seo_title       text not null default '',
  seo_description text not null default '',
  published       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (book_id, language_code),
  unique (tenant_id, language_code, slug)
);

create table if not exists public.profile_translations (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  language_code   text not null check (language_code in ('ar','fr','en')),
  first_name      text not null default '',
  last_name       text not null default '',
  academic_title  text not null default '',
  specialty       text not null default '',
  field           text not null default '',
  institution     text not null default '',
  location        text not null default '',
  short_bio       text not null default '',
  long_bio        text not null default '',
  qualifications  text[] not null default '{}',
  interests       text[] not null default '{}',
  seo_title       text not null default '',
  seo_description text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (profile_id, language_code)
);

create table if not exists public.site_settings_translations (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  settings_id     uuid not null references public.site_settings(id) on delete cascade,
  language_code   text not null check (language_code in ('ar','fr','en')),
  site_name       text not null default '',
  site_description text not null default '',
  seo_title       text not null default '',
  seo_description text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (settings_id, language_code)
);

create index if not exists post_translations_lookup  on public.post_translations (tenant_id, language_code, published);
create index if not exists book_translations_lookup  on public.book_translations (tenant_id, language_code, published);

-- ---------- 4) tenant-consistency guards (no cross-tenant references) ----------
create or replace function public.translation_tenant_matches()
returns trigger language plpgsql stable security definer set search_path = public as $$
declare
  parent_tenant uuid;
begin
  if tg_table_name = 'post_translations' then
    select tenant_id into parent_tenant from public.posts where id = new.post_id;
  elsif tg_table_name = 'book_translations' then
    select tenant_id into parent_tenant from public.books where id = new.book_id;
  elsif tg_table_name = 'profile_translations' then
    select tenant_id into parent_tenant from public.profiles where id = new.profile_id;
  elsif tg_table_name = 'site_settings_translations' then
    select tenant_id into parent_tenant from public.site_settings where id = new.settings_id;
  end if;
  if parent_tenant is null or parent_tenant <> new.tenant_id then
    raise exception 'translation tenant mismatch';
  end if;
  return new;
end $$;

drop trigger if exists trg_post_translations_tenant on public.post_translations;
create trigger trg_post_translations_tenant before insert or update on public.post_translations
  for each row execute function public.translation_tenant_matches();
drop trigger if exists trg_book_translations_tenant on public.book_translations;
create trigger trg_book_translations_tenant before insert or update on public.book_translations
  for each row execute function public.translation_tenant_matches();
drop trigger if exists trg_profile_translations_tenant on public.profile_translations;
create trigger trg_profile_translations_tenant before insert or update on public.profile_translations
  for each row execute function public.translation_tenant_matches();
drop trigger if exists trg_settings_translations_tenant on public.site_settings_translations;
create trigger trg_settings_translations_tenant before insert or update on public.site_settings_translations
  for each row execute function public.translation_tenant_matches();

-- ---------- 5) RLS ----------
alter table public.post_translations enable row level security;
alter table public.book_translations enable row level security;
alter table public.profile_translations enable row level security;
alter table public.site_settings_translations enable row level security;

-- public: only published translations of active tenants (posts/books);
-- profile/settings translations are public-read for active tenants (they hold no secrets).
create policy post_translations_public_select on public.post_translations
  for select to anon, authenticated
  using (published and public.is_tenant_active(tenant_id));
create policy book_translations_public_select on public.book_translations
  for select to anon, authenticated
  using (published and public.is_tenant_active(tenant_id));
create policy profile_translations_public_select on public.profile_translations
  for select to anon, authenticated
  using (public.is_tenant_active(tenant_id));
create policy settings_translations_public_select on public.site_settings_translations
  for select to anon, authenticated
  using (public.is_tenant_active(tenant_id));

-- tenant admins: full management of their own tenant's translations
create policy post_translations_admin_all on public.post_translations
  for all to authenticated
  using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));
create policy book_translations_admin_all on public.book_translations
  for all to authenticated
  using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));
create policy profile_translations_admin_all on public.profile_translations
  for all to authenticated
  using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));
create policy settings_translations_admin_all on public.site_settings_translations
  for all to authenticated
  using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));

-- ---------- 6) grants ----------
grant select on public.post_translations, public.book_translations,
  public.profile_translations, public.site_settings_translations to anon;
grant select, insert, update, delete on public.post_translations, public.book_translations,
  public.profile_translations, public.site_settings_translations to authenticated;

-- ---------- 7) public RPC: fetch one published entity by id (for translated slugs) ----------
create or replace function public.get_public_post_by_id(p_tenant_id uuid, p_post_id uuid)
returns setof public.posts language sql stable security definer set search_path = public as $$
  select * from public.posts
  where id = p_post_id and tenant_id = p_tenant_id and published
    and public.is_tenant_active(p_tenant_id);
$$;
create or replace function public.get_public_book_by_id(p_tenant_id uuid, p_book_id uuid)
returns setof public.books language sql stable security definer set search_path = public as $$
  select * from public.books
  where id = p_book_id and tenant_id = p_tenant_id and published
    and public.is_tenant_active(p_tenant_id);
$$;
grant execute on function public.get_public_post_by_id(uuid, uuid) to anon, authenticated;
grant execute on function public.get_public_book_by_id(uuid, uuid) to anon, authenticated;
