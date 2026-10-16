-- 0005_comments.sql — visitor comments on blog posts
-- Readers can post a comment (name + content); only approved comments are public.
-- Tenant admins moderate (approve / delete) their own tenant's comments.

create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  post_id      uuid not null references public.posts(id) on delete cascade,
  author_name  text not null,
  author_email text,
  content      text not null check (char_length(content) between 2 and 2000),
  approved     boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists comments_post_idx on public.comments (post_id, approved, created_at);

alter table public.comments enable row level security;

-- Public: read approved comments of an active tenant only
create policy comments_public_select on public.comments
  for select to anon, authenticated
  using (approved and public.is_tenant_active(tenant_id));

-- Public: anyone can submit a comment to a published post of an active tenant
create policy comments_public_insert on public.comments
  for insert to anon, authenticated
  with check (
    public.is_tenant_active(tenant_id)
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.tenant_id = comments.tenant_id and p.published
    )
  );

-- Tenant admins: read all + moderate (approve/delete) their tenant's comments
create policy comments_admin_select on public.comments
  for select to authenticated
  using (public.is_tenant_admin(tenant_id));

create policy comments_admin_update on public.comments
  for update to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

create policy comments_admin_delete on public.comments
  for delete to authenticated
  using (public.is_tenant_admin(tenant_id));

-- Table-level privileges (RLS is not enough without GRANTs)
grant select, insert on public.comments to anon;
grant select, insert, update, delete on public.comments to authenticated;
