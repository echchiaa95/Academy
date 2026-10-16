-- =============================================================
-- Migration 0004: table-level GRANTs
-- Run AFTER 0003. Idempotent. No data changes.
--
-- Root cause fixed: on projects where 0001 was applied partially,
-- the new tables had RLS policies but no table-level privileges for
-- the anon/authenticated roles -> PostgREST failed with
-- "42501: permission denied for table tenant_members".
-- GRANT only opens the table; RLS policies still decide every row.
-- This mirrors Supabase's default privileges for the public schema.
-- =============================================================

grant usage on schema public to anon, authenticated;

-- anonymous visitors: read public content, create book requests
grant select on public.profiles, public.posts, public.books, public.site_settings to anon;
grant insert on public.book_requests to anon;

-- authenticated users: content management + membership/domain tables
-- (every row-level decision still enforced by the RLS policies)
grant select on public.profiles, public.posts, public.books, public.site_settings to authenticated;
grant select, insert, update, delete on public.book_requests to authenticated;
grant select, insert, update, delete on public.profiles, public.posts, public.books, public.site_settings to authenticated;
grant select on public.admin_users to authenticated;
grant select, insert, update, delete on public.tenants, public.tenant_members, public.tenant_domains to authenticated;

-- future tables in this project inherit sane defaults
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant all on tables to authenticated;
