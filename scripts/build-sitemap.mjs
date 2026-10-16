// Build-time sitemap generator.
// Fragment URLs (/#/blog/x) all resolve to ONE SPA document — they are NOT reliably
// indexable as independent pages. This sitemap therefore lists:
//   1. the SPA entry ("/") — the real document, and
//   2. the prerendered static pages at real paths (/p/blog/<lang>/<slug>/) produced
//      by scripts/prerender.mjs — one URL per PUBLISHED language version only.
// Runs in CI after prerender, before `vite build`.
// Requires SITE_BASE_URL — without it we write nothing and keep the last committed
// skeleton rather than emitting placeholder-hostname URLs.
import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = (process.env.SITE_BASE_URL || '').replace(/\/$/, '')

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function walk(dir) {
  const out = []
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (e === 'index.html') out.push(p)
  }
  return out
}

function main() {
  if (!BASE) {
    console.log('[sitemap] SITE_BASE_URL not set — keeping committed skeleton (no placeholder hostnames)')
    return
  }
  const urls = [{ loc: `${BASE}/` }]
  try {
    // only pages that prerender.mjs actually generated — i.e. real, published,
    // active-tenant content. Drafts/unpublished translations never produce files.
    for (const f of walk('public/p')) {
      const rel = f.replace(/^public\//, '/').replace(/index\.html$/, '')
      urls.push({ loc: `${BASE}${rel}`, lastmod: statSync(f).mtime.toISOString().slice(0, 10) })
    }
  } catch { /* no prerendered pages — homepage only */ }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`
  writeFileSync('public/sitemap.xml', xml)
  console.log(`[sitemap] ${urls.length} URLs on ${BASE}`)
}

main()
