// Real proxy-behavior tests for the custom-domain router.
// Unlike tests/domain-router.test.mjs (fully mocked), these tests mock ONLY
// the Supabase RPC and let the worker perform REAL HTTP fetches against the
// live GitHub Pages deployment. They therefore verify the actual upstream
// URL mapping (base path joining, asset detection, header passthrough)
// against production bytes — not just routing decisions.
//
// Requires network access to https://echchiaa95.github.io.

import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import worker from '../workers/custom-domain-router/worker.js'

const HOST = 'echchiaa.elbordiji.com'
const PLATFORM = 'https://echchiaa95.github.io/Academy/'
const ENV = { SUPABASE_URL: 'https://hxcwzpeosplyplsvtvkg.supabase.co', SUPABASE_ANON_KEY: 'test-anon-key' }

const realFetch = globalThis.fetch

function mockRpc(rows) {
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    if (url.includes('supabase.co')) {
      return new Response(JSON.stringify(rows), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    return realFetch(input, init) // real upstream fetch
  }
}

function req(path, host = HOST) {
  return new Request(`https://${host}${path}`, { headers: { host } })
}

const activeTenant = [{ slug: 'echchiaa', status: 'active', domain_status: 'active' }]

// Discover the REAL asset paths from the live deployment once,
// so the test always matches whatever hash is currently deployed.
let liveAssetPaths = []
before(async () => {
  const html = await (await realFetch(PLATFORM)).text()
  liveAssetPaths = [...html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)].map((m) => '/' + m[1])
  assert.ok(liveAssetPaths.some((p) => p.startsWith('/assets/')), 'live index.html must reference ./assets/*')
})

test('serves the real SPA shell for / on the custom hostname', async () => {
  mockRpc(activeTenant)
  const res = await worker.fetch(req('/'), ENV)
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type') ?? '', /text\/html/)
  assert.equal(res.headers.get('x-academic-profile-routed'), 'echchiaa')
  const body = await res.text()
  assert.ok(body.includes('<div id="root">'), 'must be the real index.html from GitHub Pages')
  // asset references must stay RELATIVE so the browser re-requests them
  // on the custom hostname (where this worker proxies them again)
  assert.match(body, /src="\.\/assets\//)
})

test('proxies every real asset referenced by the live index.html', async (t) => {
  mockRpc(activeTenant)
  for (const path of liveAssetPaths) {
    await t.test(`GET ${path}`, async () => {
      const res = await worker.fetch(req(path), ENV)
      assert.equal(res.status, 200, `${path} must exist on the upstream deployment`)
      assert.equal(res.headers.get('x-academic-profile-routed'), 'echchiaa')
    })
  }
})

test('unknown path still serves the SPA shell (hash routing lives in one document)', async () => {
  mockRpc(activeTenant)
  const res = await worker.fetch(req('/anything/at-all'), ENV)
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type') ?? '', /text\/html/)
})

test('upstream URL mapping never double-prefixes the base path', async () => {
  mockRpc(activeTenant)
  const seen = []
  const spy = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    seen.push(String(input))
    return spy(input, init)
  }
  try {
    await worker.fetch(req('/assets/probe.js'), ENV)
    const upstream = seen.find((u) => !u.includes('supabase.co'))
    assert.ok(upstream.startsWith('https://echchiaa95.github.io/Academy/'), upstream)
    assert.ok(!upstream.includes('/Academy/Academy/'), upstream)
    assert.equal(new URL(upstream).hostname, 'echchiaa95.github.io', 'upstream Host must be github.io')
  } finally {
    globalThis.fetch = spy
  }
})

test('unknown hostname redirects to the platform and never proxies tenant content', async () => {
  mockRpc([]) // RPC returns nothing
  const res = await worker.fetch(req('/', 'intruder.example.com'), ENV)
  assert.equal(res.status, 302)
  assert.equal(res.headers.get('location'), PLATFORM)
})

test('fails closed: RPC outage → 502, non-active domain → 503', async () => {
  globalThis.fetch = async () => {
    throw new Error('network down')
  }
  try {
    const res = await worker.fetch(req('/'), ENV)
    assert.equal(res.status, 502)
  } finally {
    mockRpc([{ slug: 'echchiaa', status: 'active', domain_status: 'pending' }])
  }
  const res2 = await worker.fetch(req('/'), ENV)
  assert.equal(res2.status, 503)
})

test('health endpoint answers without touching Supabase or GitHub', async () => {
  globalThis.fetch = async () => {
    throw new Error('must not be called')
  }
  const res = await worker.fetch(req('/__router-health'), ENV)
  assert.equal(res.status, 200)
  assert.equal(await res.text(), 'ok')
})
