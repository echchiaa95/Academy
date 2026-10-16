-- =============================================================
-- Academic Profile — Supabase Schema
-- Run this ONCE in the Supabase SQL Editor (SQL Editor > New query)
-- Safe to re-run: everything uses IF NOT EXISTS / OR REPLACE.
-- =============================================================

create extension if not exists "pgcrypto";

-- ---------- helper: updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- admin_users: who may manage the site ----------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- helper used by all RLS policies
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid())
$$;

-- ---------- profiles: the site owner public profile ----------
create table if not exists public.profiles (
  id             uuid primary key default gen_random_uuid(),
  first_name     text not null default '',
  last_name      text not null default '',
  academic_title text not null default '',
  specialty      text not null default '',
  field          text not null default '',
  institution    text not null default '',
  location       text not null default '',
  short_bio      text not null default '',
  long_bio       text not null default '',
  avatar_url     text not null default '',
  email          text not null default '',
  phone          text not null default '',
  whatsapp       text not null default '',
  google_scholar text not null default '',
  orcid          text not null default '',
  researchgate   text not null default '',
  linkedin       text not null default '',
  facebook       text not null default '',
  x              text not null default '',
  website        text not null default '',
  qualifications text[] not null default '{}',
  interests      text[] not null default '{}',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

-- ---------- posts ----------
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  slug         text not null unique,
  excerpt      text not null default '',
  content      text not null default '',
  cover_url    text not null default '',
  category     text not null default '',
  tags         text[] not null default '{}',
  published    boolean not null default false,
  featured     boolean not null default false,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists posts_published_idx on public.posts (published, featured, published_at desc);
drop trigger if exists trg_posts_updated on public.posts;
create trigger trg_posts_updated before update on public.posts
for each row execute function public.set_updated_at();

-- ---------- books ----------
create table if not exists public.books (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  slug           text not null unique,
  description    text not null default '',
  author         text not null default '',
  year           int,
  pages          int,
  cover_url      text not null default '',
  pdf_url        text not null default '',
  preview_url    text not null default '',
  price          numeric(10,2),
  currency       text not null default 'USD',
  type           text not null default 'FREE' check (type in ('FREE','PAID','REQUEST')),
  published      boolean not null default false,
  featured       boolean not null default false,
  featured_order int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
drop trigger if exists trg_books_updated on public.books;
create trigger trg_books_updated before update on public.books
for each row execute function public.set_updated_at();

-- ---------- book_requests ----------
create table if not exists public.book_requests (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references public.books(id) on delete cascade,
  name       text not null,
  email      text not null,
  phone      text not null,
  message    text not null default '',
  status     text not null default 'NEW' check (status in ('NEW','PROCESSING','COMPLETED','CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_requests_updated on public.book_requests;
create trigger trg_requests_updated before update on public.book_requests
for each row execute function public.set_updated_at();

-- ---------- site_settings (single row) ----------
create table if not exists public.site_settings (
  id               uuid primary key default gen_random_uuid(),
  site_name        text not null default 'Academic Profile',
  site_description text not null default '',
  hero_image_url   text not null default '',
  posts_per_page   int not null default 3,
  books_per_page   int not null default 4,
  show_about       boolean not null default true,
  show_blog        boolean not null default true,
  show_books       boolean not null default true,
  show_social      boolean not null default true,
  show_contact     boolean not null default true,
  maintenance_mode boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
drop trigger if exists trg_settings_updated on public.site_settings;
create trigger trg_settings_updated before update on public.site_settings
for each row execute function public.set_updated_at();

-- one settings row must exist
insert into public.site_settings (site_name, site_description)
select 'Academic Profile', 'Personal academic platform'
where not exists (select 1 from public.site_settings);

-- =============================================================
-- Row Level Security — the real protection (never rely on
-- hiding buttons in the frontend).
-- =============================================================
alter table public.profiles      enable row level security;
alter table public.posts         enable row level security;
alter table public.books         enable row level security;
alter table public.book_requests enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_users   enable row level security;

-- drop only THIS project's policies (idempotent re-runs).
-- Never touch policies of other tables in the same Supabase project.
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
drop policy if exists "admin users self read" on public.admin_users;

-- profiles: anyone reads, only admin writes
create policy "profiles public read" on public.profiles for select using (true);
create policy "profiles admin write" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- posts: visitors read published only; admin full access
create policy "posts public read published" on public.posts for select using (published = true or public.is_admin());
create policy "posts admin insert" on public.posts for insert with check (public.is_admin());
create policy "posts admin update" on public.posts for update using (public.is_admin()) with check (public.is_admin());
create policy "posts admin delete" on public.posts for delete using (public.is_admin());

-- books: visitors read published only; admin full access
create policy "books public read published" on public.books for select using (published = true or public.is_admin());
create policy "books admin insert" on public.books for insert with check (public.is_admin());
create policy "books admin update" on public.books for update using (public.is_admin()) with check (public.is_admin());
create policy "books admin delete" on public.books for delete using (public.is_admin());

-- book_requests: anyone may CREATE a request; only admin reads/updates/deletes
create policy "requests public insert" on public.book_requests for insert with check (true);
create policy "requests admin read"   on public.book_requests for select using (public.is_admin());
create policy "requests admin update" on public.book_requests for update using (public.is_admin()) with check (public.is_admin());
create policy "requests admin delete" on public.book_requests for delete using (public.is_admin());

-- site_settings: anyone reads; only admin writes
create policy "settings public read" on public.site_settings for select using (true);
create policy "settings admin write" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

-- admin_users: a user may check only their own membership
create policy "admin users self read" on public.admin_users for select using (user_id = auth.uid());
