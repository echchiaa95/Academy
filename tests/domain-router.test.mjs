import assert from 'node:assert/strict'
import worker from '../workers/custom-domain-router/worker.js'

const env = { SUPABASE_URL: 'https://db.example', SUPABASE_ANON_KEY: 'anon-test' }
const mk = (h, p = '/') => new Request(`https://${h}${p}`, { headers: { host: h } })

// scenario matrix over a mocked fetch (RPC + GitHub Pages origin)
async function run(rows, path = '/', host = 'prof-ahmed.com') {
  const calls = []
  globalThis.fetch = async (u, opts) => {
    calls.push(String(u))
    if (String(u).includes('resolve_tenant_by_hostname')) {
      return new Response(JSON.stringify(rows), { status: 200 })
    }
    return new Response('<html>app</html>', { status: 200, headers: { 'content-type': 'text/html' } })
  }
  const res = await worker.fetch(mk(host, path), env)
  return { res, calls }
}

// 1) unknown domain → redirect to marketing
let r = await run([])
assert.equal(r.res.status, 302)
assert.equal(r.res.headers.get('location'), 'https://echchiaa95.github.io/Academy/')

// 2) pending domain → 503, never serves content
r = await run([{ tenant_id: 't1', slug: 'ahmed', status: 'active', domain_status: 'pending' }])
assert.equal(r.res.status, 503)

// 3) suspended tenant → 503 even with active domain
r = await run([{ tenant_id: 't1', slug: 'ahmed', status: 'suspended', domain_status: 'active' }])
assert.equal(r.res.status, 503)

// 4) verified domain + active tenant → proxies app shell, tagged with slug
r = await run([{ tenant_id: 't1', slug: 'ahmed', status: 'active', domain_status: 'active' }])
assert.equal(r.res.status, 200)
assert.equal(r.res.headers.get('x-academic-profile-routed'), 'ahmed')
assert.ok(r.calls.some((c) => c.includes('/Academy/index.html')))

// 5) two domains → two different tenants
const a = await run([{ tenant_id: 't1', slug: 'ahmed', status: 'active', domain_status: 'active' }], '/', 'a.com')
const b = await run([{ tenant_id: 't2', slug: 'mohamed', status: 'active', domain_status: 'active' }], '/', 'b.com')
assert.notEqual(a.res.headers.get('x-academic-profile-routed'), b.res.headers.get('x-academic-profile-routed'))

// 6) assets proxied under the base path
r = await run([{ tenant_id: 't1', slug: 'ahmed', status: 'active', domain_status: 'active' }], '/assets/app.js')
assert.ok(r.calls.some((c) => c === 'https://echchiaa95.github.io/Academy/assets/app.js'))

// 7) health check
globalThis.fetch = async () => { throw new Error('must not call') }
r = { res: await worker.fetch(mk('x.com', '/__router-health'), env) }
assert.equal(await r.res.text(), 'ok')

console.log('WORKER_LOGIC_TESTS: 7/7 PASS')
