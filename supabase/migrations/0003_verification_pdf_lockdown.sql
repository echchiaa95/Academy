-- =============================================================
-- Migration 0003: Verification & PDF lockdown (critical security patch)
-- Run AFTER 0002_security_hardening.sql. Idempotent. Never deletes data.
--
-- ROOT CAUSE FIXED #1 (DNS verification bypass):
--   verify_domain(uuid, text[], text) accepted a browser-supplied TXT
--   array. Any tenant admin (or anyone who read their own token) could
--   mark a domain verified by calling the RPC directly with a fabricated
--   array — the database had no way to know whether a real DNS lookup
--   ever happened. The browser DoH fallback made this an authoritative
--   path.
--   FIX: the public function is DROPPED. The replacement
--   verify_domain_server is executable ONLY by service_role (revoked
--   from PUBLIC/anon/authenticated), so the only caller is the
--   verify-domain Edge Function, which performs the real server-side
--   DNS TXT lookup itself and requires EXACT token equality.
--
-- ROOT CAUSE FIXED #2 (insecure PDF URL handling):
--   getBookPdfUrl returned any stored http(s) URL without validating the
--   book record, and free-download eligibility was decided client-side.
--   FIX: get_book_download RPC is the server-side gate for anonymous
--   downloads (tenant active + book belongs to tenant + published +
--   type FREE); the client must pass through it, and storage policies
--   still enforce exact path matching for signed URLs.
-- =============================================================

-- ---------- 1) drop the browser-trusting verification function ----------
drop function if exists public.verify_domain(uuid, text);
drop function if exists public.verify_domain(uuid, text[], text);

-- ---------- 2) server-only verification (service_role only) ----------
-- The Edge Function authenticates the caller, checks their membership,
-- performs the genuine DNS lookup, and only then calls this function.
-- Direct invocation by anon/authenticated users is impossible (no EXECUTE).
create or replace function public.verify_domain_server(
  p_domain_id uuid, p_txt text[], p_method text default 'edge-function')
returns boolean language plpgsql security definer set search_path = public as $$
declare d record;
begin
  select * into d from public.tenant_domains where id = p_domain_id;
  if not found then return false; end if;
  -- defense in depth: EXACT equality between an observed TXT record and
  -- the stored secret token (no substring matching)
  if not exists (select 1 from unnest(coalesce(p_txt, array[]::text[])) r
                 where btrim(r, '"') = d.verification_token) then
    return false;
  end if;
  update public.tenant_domains
     set status = 'verified', verified_at = now(),
         verification_method = p_method,
         verification_evidence = jsonb_build_object('txt', to_jsonb(p_txt), 'observed_at', now())
   where id = p_domain_id;
  return true;
end $$;

revoke all on function public.verify_domain_server(uuid, text[], text) from public;
revoke all on function public.verify_domain_server(uuid, text[], text) from anon;
revoke all on function public.verify_domain_server(uuid, text[], text) from authenticated;
grant execute on function public.verify_domain_server(uuid, text[], text) to service_role;

-- ---------- 3) public free-download gate ----------
-- Anonymous callers receive pdf_url (storage path or legacy external URL)
-- ONLY when every condition holds: tenant active, book belongs to that
-- tenant, book published, book type FREE. PAID/REQUEST books return NULL.
create or replace function public.get_book_download(p_tenant_id uuid, p_book_id uuid)
returns text language sql security definer stable set search_path = public as $$
  select b.pdf_url from public.books b
  where b.id = p_book_id
    and b.tenant_id = p_tenant_id
    and b.published = true
    and b.type = 'FREE'
    and public.is_tenant_active(p_tenant_id)
  limit 1
$$;
