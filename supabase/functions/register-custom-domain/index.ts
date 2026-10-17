import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405)
  }

  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      return json({ error: 'unauthenticated' }, 401)
    }

    const body = await req.json()
    const domainId = body?.domain_id

    if (typeof domainId !== 'string' || !domainId) {
      return json({ error: 'domain_id_required' }, 400)
    }

    const url = Deno.env.get('SUPABASE_URL')
    const anon = Deno.env.get('SUPABASE_ANON_KEY')
    const service =
      Deno.env.get('SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const cfToken = Deno.env.get('CLOUDFLARE_API_TOKEN')
    const zoneId = Deno.env.get('CLOUDFLARE_ZONE_ID')

    if (!url || !anon || !service || !cfToken || !zoneId) {
      return json({ error: 'server_configuration_incomplete' }, 500)
    }

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authorization } },
    })

    const { data: authData, error: authError } =
      await userClient.auth.getUser()

    if (authError || !authData.user) {
      return json({ error: 'unauthenticated' }, 401)
    }

    const admin = createClient(url, service)

    const { data: domain, error: domainError } = await admin
      .from('tenant_domains')
      .select('id, tenant_id, hostname, status, verified_at')
      .eq('id', domainId)
      .maybeSingle()

    if (domainError || !domain) {
      return json({ error: 'domain_not_found' }, 404)
    }

    const { data: memberships, error: membershipError } = await admin
      .from('tenant_members')
      .select('tenant_id, role')
      .eq('user_id', authData.user.id)

    if (membershipError) {
      return json({ error: 'authorization_check_failed' }, 500)
    }

    const allowed = (memberships ?? []).some((m) =>
      m.role === 'superadmin' ||
      (m.tenant_id === domain.tenant_id && m.role === 'admin')
    )

    if (!allowed) {
      return json({ error: 'forbidden' }, 403)
    }

    if (domain.status !== 'verified' || !domain.verified_at) {
      return json({ error: 'domain_not_verified' }, 409)
    }

    const hostname = String(domain.hostname).toLowerCase()

    if (
      hostname === 'elbordiji.com' ||
      hostname.endsWith('.elbordiji.com')
    ) {
      return json({ error: 'reserved_hostname' }, 400)
    }

    const validHostname =
      /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/

    if (!validHostname.test(hostname)) {
      return json({ error: 'invalid_hostname' }, 400)
    }

    const apiBase =
      `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}/custom_hostnames`

    const headers = {
      Authorization: `Bearer ${cfToken}`,
      'Content-Type': 'application/json',
    }

    // Check whether this hostname has already been registered.
    const lookupResponse = await fetch(
      `${apiBase}?hostname=${encodeURIComponent(hostname)}`,
      { headers },
    )

    const lookup = await lookupResponse.json()

    if (!lookupResponse.ok || lookup.success !== true) {
      console.error('Cloudflare lookup failed:', lookup.errors)
      return json({ error: 'cloudflare_lookup_failed' }, 502)
    }

    let result = lookup.result?.find(
      (item: { hostname?: string }) =>
        item.hostname?.toLowerCase() === hostname,
    )

    if (!result) {
      const response = await fetch(apiBase, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          hostname,
          ssl: {
            method: 'txt',
            type: 'dv',
          },
          custom_metadata: {
            tenant_id: domain.tenant_id,
            domain_id: domain.id,
          },
        }),
      })

      const created = await response.json()

      if (!response.ok || created.success !== true) {
        console.error('Cloudflare registration failed:', created.errors)
        return json({ error: 'cloudflare_registration_failed' }, 502)
      }

      result = created.result
    }

    return json({
      result: 'registered',
      hostname,
      cloudflare_id: result.id,
      hostname_status: result.status,
      ssl_status: result.ssl?.status ?? 'pending',
      ownership_verification: result.ownership_verification ?? null,
      ssl_validation_records: result.ssl?.validation_records ?? [],
    })
  } catch (error) {
    console.error('Registration failed:', String(error))
    return json({ error: 'internal_error' }, 500)
  }
})
