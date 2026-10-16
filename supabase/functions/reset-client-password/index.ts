// reset-client-password — superadmin-only: resets the password of the admin
// account(s) linked to a tenant. Used when a client forgets their password.
// The service_role key lives ONLY here (Edge Function secret env), never in the frontend.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  // Prefer the custom secret: on projects with legacy JWT keys DISABLED the
  // auto-injected SUPABASE_SERVICE_ROLE_KEY is revoked (behaves like anon).
  // Add a NEW secret key (sb_secret_...) as Edge Function secret SERVICE_ROLE_KEY.
  const customKey = Deno.env.get('SERVICE_ROLE_KEY')
  const autoKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const serviceKey = customKey ?? autoKey ?? ''

  // 1) Authenticate the caller with their own JWT
  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) return json({ error: 'unauthenticated' }, 401)

  const admin = createClient(url, serviceKey)

  // Self-check: a misconfigured service key must fail LOUDLY here — and say
  // WHICH key was used so the fix is obvious.
  const probe = await admin.from('tenant_members').select('id').limit(1)
  if (probe.error) {
    const src = customKey
      ? 'SERVICE_ROLE_KEY (custom secret — its VALUE is not a valid privileged key)'
      : autoKey
        ? 'SUPABASE_SERVICE_ROLE_KEY (auto-injected legacy key — custom SERVICE_ROLE_KEY secret NOT set)'
        : 'none (no service key in env at all)'
    return json({
      error: `service role key misconfigured — key used: ${src}; prefix: ${serviceKey.slice(0, 10)}…; database says: ${probe.error.message}. Fix: Supabase Dashboard → Project Settings → API Keys → create a SECRET key (sb_secret_…) → Edge Functions → Secrets → add SERVICE_ROLE_KEY = that key → redeploy this function.`,
    }, 500)
  }

  // 2) Authorize via the DATABASE's canonical is_superadmin() — the same
  //    security-definer function the RLS policies use, so the Edge Function can
  //    never disagree with table-level permissions (single source of truth).
  const { data: sa, error: saErr } = await userClient.rpc('is_superadmin')
  if (saErr || !sa) return json({ error: 'forbidden' }, 403)

  // 3) Validate input
  let body: { tenant_id?: string; password?: string }
  try { body = await req.json() } catch { return json({ error: 'invalid json' }, 400) }
  const tenantId = body.tenant_id ?? ''
  const password = body.password ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) return json({ error: 'invalid tenant_id' }, 400)
  if (password.length < 8) return json({ error: 'password must be at least 8 characters' }, 400)

  // 4) Find the tenant's admin member(s) — never touch superadmin accounts here
  const { data: members, error: memErr } = await admin.from('tenant_members')
    .select('user_id').eq('tenant_id', tenantId).eq('role', 'admin')
  if (memErr) return json({ error: memErr.message }, 500)
  if (!members?.length) return json({ error: 'no admin account linked to this tenant' }, 404)

  // 5) Reset the password of every admin account of this tenant
  const updated: string[] = []
  for (const m of members) {
    const { error: updErr } = await admin.auth.admin.updateUserById(m.user_id, { password })
    if (updErr) return json({ error: updErr.message }, 400)
    updated.push(m.user_id)
  }

  return json({ ok: true, updated: updated.length })
})
