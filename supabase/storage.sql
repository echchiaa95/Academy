-- =============================================================
-- Storage: buckets + policies
-- Run AFTER schema.sql in the SQL Editor.
-- Buckets: profile, covers, previews (public read),
--          books (PRIVATE — free books via signed URLs only,
--          paid/request PDFs are never publicly reachable).
-- Uploads/deletes are restricted to admins in all buckets.
-- =============================================================

insert into storage.buckets (id, name, public)
values
  ('profile', 'profile', true),
  ('covers', 'covers', true),
  ('previews', 'previews', true),
  ('books', 'books', false)   -- private on purpose
on conflict (id) do nothing;

-- if the bucket already existed as public, force it private
update storage.buckets set public = false where id = 'books';

-- drop only THIS project's storage policies (explicit, no blanket drops)
drop policy if exists "ap public read" on storage.objects;
drop policy if exists "ap books read free or admin" on storage.objects;
drop policy if exists "ap admin insert" on storage.objects;
drop policy if exists "ap admin update" on storage.objects;
drop policy if exists "ap admin delete" on storage.objects;

-- public read for images/previews buckets only
create policy "ap public read" on storage.objects for select
using (bucket_id in ('profile','covers','previews'));

-- books bucket (private): readable by admins, and publicly ONLY for
-- objects whose path is referenced as pdf_url of a FREE published book.
-- The frontend asks for a short-lived signed URL; this policy is what
-- allows anonymous users to mint/download it for free books only.
create policy "ap books read free or admin" on storage.objects for select
using (
  bucket_id = 'books'
  and (
    public.is_admin()
    or exists (
      select 1 from public.books b
      where b.type = 'FREE'
        and b.published = true
        and b.pdf_url like '%' || name
    )
  )
);

-- admin-only upload / update / delete (all four buckets)
create policy "ap admin insert" on storage.objects for insert
with check (bucket_id in ('profile','covers','books','previews') and public.is_admin());
create policy "ap admin update" on storage.objects for update
using (bucket_id in ('profile','covers','books','previews') and public.is_admin());
create policy "ap admin delete" on storage.objects for delete
using (bucket_id in ('profile','covers','books','previews') and public.is_admin());
