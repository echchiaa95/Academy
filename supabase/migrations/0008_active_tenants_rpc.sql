-- 0008_active_tenants_rpc.sql
-- Read-only public RPC listing ACTIVE tenants (id, slug, name) so the build-time
-- prerenderer can generate static pages for every active tenant — not just the
-- default. Anonymous callers cannot read the tenants table directly; this
-- security-definer function exposes only non-sensitive identifiers of active
-- tenants. No private/unpublished content is touched (prerender filters by
-- published=true through the existing public RPCs per tenant).

create or replace function public.list_active_tenants()
returns table (id uuid, slug text, name text)
language sql stable security definer set search_path = public as $$
  select t.id, t.slug, t.name from public.tenants t
  where t.status = 'active'
  order by t.created_at asc
$$;

grant execute on function public.list_active_tenants() to anon, authenticated;
