-- 0007_language_backfill_fix.sql
-- Corrective migration: 0006 backfilled posts/books but missed profiles and site_settings.
-- Safe to run whether or not 0006 was already applied.
--
-- Strategy: a row still carrying the DEFAULT 'ar' is reassigned to its tenant's
-- primary_language ONLY when that tenant's primary language is not 'ar'.
-- Rows already set to a real language (by 0006 or by an admin) are never touched,
-- so re-running this script cannot overwrite valid assignments.
-- Intentional Arabic content under an Arabic-primary tenant keeps 'ar' unchanged.

update public.profiles p
set language_code = t.primary_language
from public.tenants t
where t.id = p.tenant_id
  and p.language_code = 'ar'          -- untouched default only
  and t.primary_language in ('fr', 'en');

update public.site_settings s
set language_code = t.primary_language
from public.tenants t
where t.id = s.tenant_id
  and s.language_code = 'ar'
  and t.primary_language in ('fr', 'en');

-- NOTE: posts/books are intentionally NOT re-backfilled here (0006 already did).
-- New content's language is now set explicitly by the admin editors at creation
-- time, so no recurring backfill is needed and no intentional Arabic row under a
-- non-Arabic tenant can be flipped by re-running this file.
