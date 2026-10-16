// Prerender integration tests — MOCKED Supabase (no live database is touched).
// Each scenario spawns scripts/prerender.mjs as a subprocess in a temp cwd with a
// stubbed fetch, then asserts on the generated files, logs, and exit code.
//
// These are MOCK tests. The REAL PostgreSQL pagination tests live in tests/sql/
// and require a local Postgres (see tests/sql/README.md).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname

function runPrerender(name, mockBody) {
  const dir = mkdtempSync(join(tmpdir(), `pr-${name}-`))
  writeFileSync(join(dir, 'mock.mjs'), mockBody + `
process.env.VITE_SUPABASE_URL='https://mock'; process.env.VITE_SUPABASE_PUBLISHABLE_KEY='k'
process.env.SITE_BASE_URL='https://base.github.io'
await import('${ROOT}scripts/prerender.mjs')
`)
  const r = spawnSync('node', ['mock.mjs'], { cwd: dir, encoding: 'utf8' })
  const pages = []
  const walk = (d) => { try { for (const e of readdirSync(d)) { const p = join(d, e); statSync(p).isDirectory() ? walk(p) : e === 'index.html' && pages.push(p) } } catch {} }
  walk(join(dir, 'public'))
  return { code: r.status, out: r.stdout + r.stderr, pages, dir }
}

const TENANTS = `[{id:'t1',slug:'default',name:'Default'},{id:'t2',slug:'clientx',name:'Client X'}]`
const mk = (pre, n) => `Array.from({length:${n}},(_,i)=>({id:'${pre}-'+i,slug:'${pre}-slug-'+i,title:'${pre} '+i,content:'c',published:true,language_code:'ar'}))`

// 250 posts + 250 books for tenant t2, honoring the 200-cap and p_offset (0009 semantics)
const MOCK_250 = `
const tenants=${TENANTS}
const db={t1:{posts:[{id:'p1',slug:'post-one',title:'P1',content:'c',published:true,language_code:'ar'}],books:[]},
          t2:{posts:${mk('post', 250)},books:${mk('book', 250)}}}
globalThis.fetch=async(u,o)=>{
 const j=(x)=>({ok:true,status:200,json:async()=>x,text:async()=>''})
 const body=o?.body?JSON.parse(o.body):{}
 if(u.includes('list_active_tenants'))return j(tenants)
 if(u.includes('get_public_profile'))return j([{first_name:'A',last_name:'B'}])
 for(const fn of ['list_public_posts','list_public_books']){
   if(u.includes('/rpc/'+fn)){
     const t=db[body.p_tenant_id];const rows=fn.includes('posts')?t.posts:t.books
     return j(rows.slice(body.p_offset??0,(body.p_offset??0)+Math.min(body.p_limit??100,200)))
   }
 }
 if(u.includes('_translations'))return j([])
 return j([])
}
`

test('250 posts + 250 books paginate fully without duplicates', () => {
  const r = runPrerender('p250', MOCK_250)
  assert.equal(r.code, 0, r.out)
  assert.equal(r.pages.length, 501) // 1 default post + 250 posts + 250 books
  assert.equal(new Set(r.pages).size, 501, 'duplicate pages generated')
  assert.match(r.out, /2\/2 active tenant/)
})

test('generated pages have self-canonical, correct lang/dir, tenant home link', () => {
  const r = runPrerender('seo', MOCK_250)
  const sample = r.pages.find((p) => p.includes('p/t/clientx/blog/ar/post-slug-0'))
  const html = readFileSync(sample, 'utf8')
  assert.match(html, /<html lang="ar" dir="rtl">/)
  assert.match(html, /<link rel="canonical" href="https:\/\/base\.github\.io\/p\/t\/clientx\/blog\/ar\/post-slug-0\/">/)
  // non-default tenant home icon must point at ITS interactive homepage, not the platform default
  assert.match(html, /<a href="https:\/\/base\.github\.io\/#\/site\/clientx">⌂<\/a>/)
  // deep link into the SPA preserves the destination and language
  assert.match(html, /#\/site\/clientx\/blog\/post-slug-0\?lang=ar/)
})

test('a failing translation request marks the tenant failed and fails the build', () => {
  const r = runPrerender('trfail', MOCK_250.replace(
    "if(u.includes('_translations'))return j([])",
    "if(u.includes('post_translations')&&u.includes('t2'))return {ok:false,status:500,text:async()=>'db down',json:async()=>({})}\n if(u.includes('_translations'))return j([])",
  ))
  assert.equal(r.code, 1, 'build must fail when a translation request fails')
  assert.match(r.out, /REST post_translations: HTTP 500/)
  assert.match(r.out, /INCOMPLETE/)
  assert.match(r.out, /1\/2 active tenant/)
})

test('missing translation tables (0006 pending) = reduced coverage, not silent success', () => {
  const r = runPrerender('no0006', MOCK_250.replace(
    "if(u.includes('_translations'))return j([])",
    "if(u.includes('_translations'))return {ok:false,status:404,text:async()=>'{\"code\":\"PGRST205\"}',json:async()=>({code:'PGRST205'})}",
  ))
  assert.equal(r.code, 0, r.out)
  assert.match(r.out, /REDUCED COVERAGE/)
})

test('0008 pending: only the default tenant is processed, reported clearly', () => {
  const r = runPrerender('no0008', MOCK_250.replace(
    "if(u.includes('list_active_tenants'))return j(tenants)",
    "if(u.includes('list_active_tenants'))return {ok:false,status:404,json:async()=>({}),text:async()=>'nf'}\n if(u.includes('default_tenant_id'))return j('t1').constructor===Object?j('t1'):j('t1')",
  ).replace("return j('t1').constructor===Object?j('t1'):j('t1')", "return {ok:true,status:200,json:async()=>'t1',text:async()=>''}"))
  assert.equal(r.code, 0, r.out)
  assert.match(r.out, /ONLY the default tenant was processed/)
  assert.equal(r.pages.length, 1)
})

test('sitemap covers every generated page including nested /p/t/ tenant paths', () => {
  const r = runPrerender('sitemap', MOCK_250)
  assert.equal(r.code, 0, r.out)
  const s = spawnSync('node', [`${ROOT}scripts/build-sitemap.mjs`], {
    cwd: r.dir, encoding: 'utf8',
    env: { ...process.env, SITE_BASE_URL: 'https://base.github.io' },
  })
  assert.equal(s.status, 0, s.stderr)
  const xml = readFileSync(join(r.dir, 'public/sitemap.xml'), 'utf8')
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  assert.equal(locs.length, 502) // 501 pages + the SPA entry
  assert.ok(locs.includes('https://base.github.io/p/t/clientx/blog/ar/post-slug-249/'))
  assert.ok(locs.includes('https://base.github.io/p/t/clientx/books/ar/book-slug-249/'))
  assert.ok(locs.every((l) => l.startsWith('https://base.github.io')), 'no foreign/custom-domain URLs')
})

test('invalid JSON from a translation query is reported clearly', () => {
  const r = runPrerender('badjson', MOCK_250.replace(
    "if(u.includes('_translations'))return j([])",
    "if(u.includes('_translations'))return {ok:true,status:200,text:async()=>'',json:async()=>{throw new Error('Unexpected token')}}",
  ))
  assert.equal(r.code, 1)
  assert.match(r.out, /invalid JSON/)
})
