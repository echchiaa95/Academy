// Build-time prerenderer — gives every published post/book/language version of EVERY
// ACTIVE tenant a REAL, directly fetchable URL so search engines can index each page
// independently. Hash-fragment URLs (/#/blog/x) all map to one SPA document and are
// NOT reliably indexable as separate pages — this script is the fix for that.
//
// Architecture (actual, verified against src/lib/tenant.ts):
//   - This GitHub Pages deployment serves ONE hostname (BASE).
//   - The default tenant's pages:   /p/blog/<lang>/<slug>/   and /p/books/<lang>/<slug>/
//   - Other active tenants' pages:  /p/t/<tenant-slug>/blog/<lang>/<slug>/  (same host)
//   - Tenant custom domains are NOT served by this deployment (GitHub Pages serves one
//     hostname), so we NEVER emit canonical URLs for them — canonicals always point at
//     BASE paths that this deployment really serves. Per-domain SEO requires a separate
//     deployment per domain (documented in README).
// Output goes to public/ before `vite build` (public/ is copied into dist/).
// Requires: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY (public RPCs only),
//           SITE_BASE_URL. Without env it exits cleanly and the SPA is unchanged.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const BASE = (process.env.SITE_BASE_URL || '').replace(/\/$/, '')

const LANGS = ['ar', 'fr', 'en']
const DIR = { ar: 'rtl', fr: 'ltr', en: 'ltr' }

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function md(mdText) {
  // minimal markdown → HTML for the static snapshot (headings, bold, paragraphs)
  return esc(mdText ?? '')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .split(/\n{2,}/).map((p) => /^<h\d>/.test(p) ? p : `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n')
}

async function rpc(fn, body) {
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`${fn}: HTTP ${r.status}`)
  return r.json()
}
async function rest(table, query) {
  // Read-only public REST query. NEVER silently degrade to [] — a failed
  // translation query must mark the tenant as failed (caller catches), so the
  // build never reports a complete prerender with translations missing.
  // Sole exception: the table not existing at all (PGRST205 / 42P01) means the
  // i18n migration 0006 is not applied yet — that is reported as REDUCED
  // COVERAGE (base content only), like the 0008/0009 fallbacks, not as success.
  const r = await fetch(`${url}/rest/v1/${table}?${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  if (!r.ok) {
    const detail = await r.text().catch(() => '')
    if (/"?(PGRST205|42P01)"?/.test(detail) || r.status === 404) {
      console.warn(`[prerender] table ${table} missing (migration 0006 pending?) — REDUCED COVERAGE: base content only`)
      return []
    }
    throw new Error(`REST ${table}: HTTP ${r.status}${detail ? ` — ${detail.slice(0, 200)}` : ''}`)
  }
  try {
    return await r.json()
  } catch (e) {
    throw new Error(`REST ${table}: invalid JSON response — ${e.message}`)
  }
}

function page({ lang, title, description, canonical, alternates, jsonLd, bodyHtml, appHref, homeHref }) {
  const alt = alternates.map((a) => `  <link rel="alternate" hreflang="${a.lang}" href="${esc(a.href)}">`).join('\n')
  const xd = alternates.length ? `  <link rel="alternate" hreflang="x-default" href="${esc(alternates[0].href)}">` : ''
  return `<!doctype html>
<html lang="${lang}" dir="${DIR[lang]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${esc(canonical)}">
${alt}
${xd}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:type" content="article">
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
<style>
  body{font-family:Georgia,'Times New Roman',serif;max-width:44rem;margin:3rem auto;padding:0 1.25rem;line-height:1.9;color:#1c1917;background:#fafaf9}
  h1{line-height:1.3} a{color:#8a6d2f} .meta{color:#78716c;font-size:.9rem;margin-bottom:2rem}
  nav{margin-bottom:2rem;font-size:.95rem}
</style>
</head>
<body>
<nav><a href="${esc(homeHref)}">⌂</a> · <a href="${esc(appHref)}">Open the interactive site</a></nav>
${bodyHtml}
</body>
</html>
`
}

function write(path, html) {
  const p = `public/${path}`
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, html)
}

async function resolveTenants() {
  // All active tenants (migration 0008). Fallback: default tenant only, so the
  // script keeps working against databases where 0008 is not applied yet.
  try {
    const rows = await rpc('list_active_tenants', {})
    if (Array.isArray(rows) && rows.length) return { tenants: rows, allTenants: true }
  } catch { /* 0008 not applied yet */ }
  const id = await rpc('default_tenant_id', {})
  return { tenants: id ? [{ id, slug: 'default', name: '' }] : [], allTenants: false }
}

const PAGE = 200 // the RPC hard cap (least(p_limit, 200)) — never request more
let paginationRpcSupported = true // becomes false if 0009 (p_offset) is not applied yet

async function fetchAllPublished(fn, tenantId) {
  // Stable, deterministic pagination: the RPCs order with an id tiebreaker (0009).
  const out = []
  let offset = 0
  while (true) {
    const body = { p_tenant_id: tenantId, p_featured: false, p_limit: PAGE }
    if (paginationRpcSupported) body.p_offset = offset
    let batch
    try {
      batch = await rpc(fn, body)
    } catch (e) {
      if (paginationRpcSupported && offset === 0) {
        // 0009 not applied: the function has no p_offset parameter — retry without it
        paginationRpcSupported = false
        console.warn(`[prerender] ${fn}: p_offset unsupported (migration 0009 pending?) — single batch, max ${PAGE} records`)
        delete body.p_offset
        batch = await rpc(fn, body)
      } else {
        throw e
      }
    }
    out.push(...(batch ?? []))
    if (!paginationRpcSupported || (batch ?? []).length < PAGE) break
    offset += PAGE
  }
  // de-duplicate defensively — batches must never overlap, but never emit a page twice
  const seen = new Set()
  return out.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
}

async function main() {
  if (!url || !key || !BASE) {
    console.log('[prerender] env missing (VITE_SUPABASE_URL / key / SITE_BASE_URL) — skipped; SPA unchanged')
    return
  }
  const { tenants, allTenants } = await resolveTenants()
  if (!allTenants) console.warn('[prerender] migration 0008 not applied — ONLY the default tenant was processed')
  let count = 0
  const failures = []

  for (const tenant of tenants) {
    const isDefault = tenant.slug === 'default'
    // URL prefix on THIS host (always servable); default tenant keeps the short form
    const prefix = isDefault ? 'p' : `p/t/${tenant.slug}`
    const appBase = isDefault ? `${BASE}/#` : `${BASE}/#/site/${tenant.slug}`
    // home icon: default tenant → platform homepage; other tenants → THEIR interactive homepage
    const homeHref = isDefault ? `${BASE}/` : `${BASE}/#/site/${tenant.slug}`

    let posts, books, postTrs = [], bookTrs = []
    try {
      const profRows = await rpc('get_public_profile', { p_tenant_id: tenant.id }).catch(() => [])
      var owner = profRows?.[0] ?? {}
      posts = await fetchAllPublished('list_public_posts', tenant.id)
      books = await fetchAllPublished('list_public_books', tenant.id)
      postTrs = await rest('post_translations', `tenant_id=eq.${tenant.id}&published=eq.true`)
      bookTrs = await rest('book_translations', `tenant_id=eq.${tenant.id}&published=eq.true`)
    } catch (e) {
      // explicit failure — never report a complete prerender when a tenant's content failed
      failures.push(`${tenant.slug}: ${e.message}`)
      console.error(`[prerender] FAILED for tenant ${tenant.slug}: ${e.message}`)
      continue
    }
    const authorName = `${owner.first_name ?? ''} ${owner.last_name ?? ''}`.trim()

    function versions(base, trs, kind) {
      const v = {}
      const bl = base.language_code || 'ar'
      v[bl] = { slug: base.slug, title: base.title, body: kind === 'post' ? base.content : base.description, excerpt: base.excerpt || base.description, date: base.published_at, image: base.cover_url }
      for (const tr of trs.filter((t) => (kind === 'post' ? t.post_id : t.book_id) === base.id && t.title && t.slug)) {
        v[tr.language_code] = { slug: tr.slug, title: tr.title, body: kind === 'post' ? tr.content : tr.description, excerpt: tr.excerpt || tr.description, seo_title: tr.seo_title, seo_description: tr.seo_description }
      }
      return v
    }

    function emit(kind, base, trs) {
      const urlKind = kind === 'post' ? 'blog' : 'books'
      const v = versions(base, trs, kind)
      const langs = Object.keys(v).filter((l) => LANGS.includes(l))
      for (const lang of langs) {
        const ver = v[lang]
        const path = `${prefix}/${urlKind}/${lang}/${encodeURIComponent(ver.slug)}/`
        const canonical = `${BASE}/${path}`
        const alternates = langs.map((l) => ({ lang: l, href: `${BASE}/${prefix}/${urlKind}/${l}/${encodeURIComponent(v[l].slug)}/` }))
        const jsonLd = kind === 'post'
          ? { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: ver.title, description: ver.excerpt || undefined, datePublished: ver.date || undefined, inLanguage: lang, mainEntityOfPage: canonical, ...(authorName ? { author: { '@type': 'Person', name: authorName } } : {}) }
          : { '@context': 'https://schema.org', '@type': 'Book', name: ver.title, description: ver.excerpt || undefined, inLanguage: lang, ...(authorName ? { author: { '@type': 'Person', name: authorName } } : {}) }
        const html = page({
          lang, title: ver.seo_title || ver.title, description: ver.seo_description || ver.excerpt || '',
          canonical, alternates, jsonLd,
          appHref: `${appBase}/${urlKind}/${encodeURIComponent(ver.slug)}?lang=${lang}`,
          homeHref,
          bodyHtml: `<article><h1>${esc(ver.title)}</h1><p class="meta">${esc(tenant.name || '')}${tenant.name ? ' · ' : ''}${lang}${ver.date ? ` · ${esc(String(ver.date).slice(0, 10))}` : ''}</p>${md(ver.body)}</article>`,
        })
        write(`${path}index.html`, html)
        count++
      }
    }

    // published content only — drafts and unpublished translations never produce files
    for (const p of (posts ?? []).filter((x) => x.published && x.slug)) emit('post', p, postTrs)
    for (const b of (books ?? []).filter((x) => x.published && x.slug)) emit('book', b, bookTrs)
  }
  console.log(`[prerender] wrote ${count} static language pages across ${tenants.length - failures.length}/${tenants.length} active tenant(s)`)
  if (failures.length) {
    console.error(`[prerender] INCOMPLETE — failed tenants: ${failures.join('; ')}`)
    process.exitCode = 1
  }
}

main().catch((e) => { console.warn('[prerender] failed, SPA unchanged:', e.message) })
