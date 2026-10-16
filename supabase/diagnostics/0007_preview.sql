-- READ-ONLY diagnostics for migration 0007 (language_backfill_fix).
-- Run these BEFORE applying 0007 to see exactly which rows would change.
-- Do not rerun an already-applied migration blindly; check with:
--   select * from supabase_migrations.schema_migrations where version like '%0007%';
--
-- Honest limitation: the database does NOT record whether language_code = 'ar' on a
-- row is (a) the untouched default value, or (b) an intentional Arabic assignment by
-- an editor. This migration cannot distinguish the two. It updates rows where
-- language_code = 'ar' AND the tenant's primary language is fr/en, under the
-- assumption that on such tenants 'ar' is far more likely to be the untouched default.
-- If an editor intentionally wrote Arabic primary content on a French/English-primary
-- tenant, review the rows below first and exclude them manually.

-- 1) Profiles that 0007 would update:
select p.id, p.tenant_id, t.slug as tenant_slug, t.primary_language,
       p.language_code, p.first_name, p.last_name, p.updated_at
from public.profiles p
join public.tenants t on t.id = p.tenant_id
where p.language_code = 'ar' and t.primary_language in ('fr','en')
order by t.slug, p.updated_at;

-- 2) Site settings rows that 0007 would update:
select s.id, s.tenant_id, t.slug as tenant_slug, t.primary_language,
       s.language_code, s.site_title, s.updated_at
from public.site_settings s
join public.tenants t on t.id = s.tenant_id
where s.language_code = 'ar' and t.primary_language in ('fr','en')
order by t.slug;

-- 3) Count summary (expect these numbers to match the migration's affected rows):
select 'profiles' as table_name, count(*) as rows_that_would_change
from public.profiles p join public.tenants t on t.id = p.tenant_id
where p.language_code = 'ar' and t.primary_language in ('fr','en')
union all
select 'site_settings', count(*)
from public.site_settings s join public.tenants t on t.id = s.tenant_id
where s.language_code = 'ar' and t.primary_language in ('fr','en');

-- posts/books are intentionally NOT part of 0007: editors created after the
-- multilingual update stamp language_code at creation time, so their existing
-- 'ar' values cannot be shown to be defaults rather than intentional content.
