import { useEffect } from 'react'

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.content = content
}

function setLink(rel: string, href: string, hreflang?: string) {
  const sel = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]:not([hreflang])`
  let el = document.head.querySelector<HTMLLinkElement>(sel)
  if (!el) {
    el = document.createElement('link'); el.rel = rel
    if (hreflang) el.setAttribute('hreflang', hreflang)
    document.head.appendChild(el)
  }
  el.href = href
}

export function pageUrl(path: string, canonicalBase?: string) {
  const base = (canonicalBase || location.origin + location.pathname).replace(/\/$/, '')
  // prerendered static pages live at real paths (/p/…) — no hash fragment
  if (path.startsWith('/p/')) return `${base}${path}`
  return `${base}${path && path !== '/' ? `#${path}` : ''}`
}

type Alternate = { lang: string; path: string }

export function useSEO(opts: {
  title?: string
  description?: string
  image?: string
  path?: string
  canonicalBase?: string
  canonicalOverride?: string   // real prerendered URL when one exists (takes priority)
  lang?: string
  noindex?: boolean
  alternates?: Alternate[]       // hreflang links — only for translations that actually exist
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}) {
  useEffect(() => {
    const { title, description, image, path, canonicalBase, canonicalOverride, lang, noindex, alternates, jsonLd } = opts
    const url = pageUrl(path ?? '/', canonicalBase)
    const canonical = canonicalOverride || url
    if (title) { document.title = title; setMeta('property', 'og:title', title); setMeta('name', 'twitter:title', title) }
    if (description) { setMeta('name', 'description', description); setMeta('property', 'og:description', description); setMeta('name', 'twitter:description', description) }
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:url', url)
    if (lang) { setMeta('property', 'og:locale', lang === 'ar' ? 'ar_AR' : lang === 'fr' ? 'fr_FR' : 'en_US') }
    setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
    if (image) { setMeta('property', 'og:image', image); setMeta('name', 'twitter:image', image) }
    // indexing: public pages indexable; admin/auth pages pass noindex
    setMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow')
    setLink('canonical', canonical)
    // hreflang: emit only alternates that exist; x-default = first listed default
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((e) => e.remove())
    if (alternates && alternates.length > 0) {
      for (const a of alternates) setLink('alternate', pageUrl(a.path, canonicalBase), a.lang)
      setLink('alternate', pageUrl(alternates[0].path, canonicalBase), 'x-default')
    }
    // JSON-LD structured data (real database content only)
    document.head.querySelectorAll('script[data-jsonld]').forEach((e) => e.remove())
    if (jsonLd) {
      for (const block of Array.isArray(jsonLd) ? jsonLd : [jsonLd]) {
        const s = document.createElement('script')
        s.type = 'application/ld+json'
        s.setAttribute('data-jsonld', '1')
        // JSON.stringify escapes quotes; neutralise </script> breakouts defensively
        s.textContent = JSON.stringify(block).replace(/</g, '\\u003c')
        document.head.appendChild(s)
      }
    }
  }, [opts.title, opts.description, opts.image, opts.path, opts.canonicalBase, opts.canonicalOverride, opts.lang, opts.noindex,
      JSON.stringify(opts.alternates), JSON.stringify(opts.jsonLd)])
}
