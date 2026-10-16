// Academic Profile — custom-domain routing worker (Cloudflare Workers).
//
// What it does:
//   A customer-owned hostname (e.g. www.professor-ahmed.com) pointed at this
//   worker is resolved SERVER-SIDE against Supabase (resolve_tenant_by_hostname
//   — a security-definer RPC, callable with the PUBLIC anon key, returning
//   only non-sensitive tenant routing info). Only domains whose status is
//   'verified' or 'active' and whose tenant is active are served; everything
//   else gets a clear failure. Valid hostnames are reverse-proxied to the
//   existing GitHub Pages deployment — the SPA then resolves the same hostname
//   itself (src/lib/tenant.ts) and renders that tenant's published content.
//
// What it never does:
//   - No service-role key (anon key only — the RPC is public by design).
//   - No tenant_id accepted from the browser.
//   - No marking domains active — activation stays in the dashboard flow.
//
// Manual deployment steps: see README.md in this folder.

const ORIGIN = 'https://echchiaa95.github.io'
const BASE_PATH = '/Academy/'
const PLATFORM_URL = ORIGIN + BASE_PATH

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const host = request.headers.get('host') || url.hostname

    // health check
    if (url.pathname === '/__router-health') {
      return new Response('ok', { headers: { 'content-type': 'text/plain' } })
    }

    // 1) resolve hostname → tenant (server-side, public RPC, anon key)
    let rows
    try {
      const rpc = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/resolve_tenant_by_hostname`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: env.SUPABASE_ANON_KEY,
          authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ host }),
      })
      if (!rpc.ok) throw new Error(`rpc ${rpc.status}`)
      rows = await rpc.json()
    } catch {
      return new Response('Routing service unavailable', { status: 502 })
    }

    const t = rows?.[0]
    if (!t) {
      // unknown hostname → send the visitor to the marketing homepage
      return Response.redirect(PLATFORM_URL, 302)
    }
    if (t.status !== 'active' || !['verified', 'active'].includes(t.domain_status ?? '')) {
      return new Response('This domain is not active yet.', { status: 503 })
    }

    // 2) proxy the SPA from GitHub Pages. Hash routing means every client
    //    route lives in the same document — always serve the app shell and
    //    static assets under the base path.
    const asset = /^\/(assets|p|fonts)\//.test(url.pathname) || /\.(js|css|png|jpe?g|webp|svg|ico|woff2?|webmanifest|txt|xml)$/.test(url.pathname)
    const upstream = asset
      ? `${ORIGIN}${BASE_PATH.replace(/\/$/, '')}${url.pathname}`
      : `${ORIGIN}${BASE_PATH}index.html`

    const res = await fetch(upstream, {
      headers: { 'user-agent': request.headers.get('user-agent') ?? '' },
      cf: asset ? { cacheTtl: 3600, cacheEverything: true } : { cacheTtl: 60, cacheEverything: true },
    })
    const out = new Response(res.body, res)
    out.headers.set('x-academic-profile-routed', t.slug)
    return out
  },
}
