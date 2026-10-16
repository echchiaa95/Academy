// Supabase Edge Function: verify-domain
// Genuine SERVER-SIDE domain verification — the ONLY verification path.
//
// Flow:
//   1. Authenticate the caller from their real Supabase session (user JWT).
//   2. Load the domain row SERVER-SIDE (service client — never trusts the
//      browser for hostname/token; the token itself never leaves this box).
//   3. Authorize: caller must be superadmin or a member-admin of the
//      domain's tenant (checked server-side against tenant_members).
//   4. Perform a REAL DNS TXT lookup for _academic-verification.<hostname>
//      via the Deno runtime resolver.
//   5. Require an EXACT match between an observed TXT record and the
//      expected token.
//   6. Only then call verify_domain_server — an RPC revoked from
//      PUBLIC/anon/authenticated, callable exclusively by service_role,
//      so nobody can mark a domain verified by invoking it directly.
//
// Secrets: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are
// injected automatically by the Supabase Edge runtime. The service key
// exists ONLY here — never in the repository, never in the frontend.
// Deploy: supabase functions deploy verify-domain
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return json({ result: 'error', reason: 'unauthenticated' }, 401)

    const { domain_id } = await req.json()
    if (!domain_id) return json({ result: 'error', reason: 'domain_id required' }, 400)

    const URL = Deno.env.get('SUPABASE_URL')!
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // 1) authenticate the caller from their actual session
    const userClient = createClient(URL, ANON, { global: { headers: { Authorization: auth } } })
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ result: 'error', reason: 'unauthenticated' }, 401)

    // 2) load domain server-side (hostname/token are never client input)
    const admin = createClient(URL, SERVICE)
    const { data: dom, error } = await admin
      .from('tenant_domains')
      .select('id, tenant_id, hostname, verification_token, status')
      .eq('id', domain_id).maybeSingle()
    if (error || !dom) return json({ result: 'error', reason: 'domain not found' }, 404)

    // 3) authorize: superadmin or admin member of this exact tenant
    const { data: memberships } = await admin
      .from('tenant_members').select('tenant_id, role').eq('user_id', user.id)
    const authorized = (memberships ?? []).some((m) =>
      m.role === 'superadmin' || (m.tenant_id === dom.tenant_id && m.role === 'admin'))
    if (!authorized) return json({ result: 'error', reason: 'not authorized for this domain' }, 403)

    // 4) genuine server-side DNS TXT lookup
    let txt: string[] = []
    try {
      const answers = await Deno.resolveDns(`_academic-verification.${dom.hostname}`, 'TXT')
      txt = answers.map((chunks) => chunks.join(''))
    } catch {
      return json({ result: 'mismatch', reason: 'no TXT records found' })
    }

    // 5) EXACT match required (no substring includes)
    if (!txt.some((r) => r === dom.verification_token))
      return json({ result: 'mismatch', reason: 'token not present in DNS' })

    // 6) privileged, server-only status update (evidence recorded in DB)
    const { data: ok, error: rpcErr } = await admin.rpc('verify_domain_server', {
      p_domain_id: dom.id, p_txt: txt, p_method: 'edge-function',
    })
    if (rpcErr || ok !== true) return json({ result: 'error', reason: 'rejected by database' }, 500)
    return json({ result: 'verified' })
  } catch (e) {
    return json({ result: 'error', reason: String(e) }, 500)
  }
})
