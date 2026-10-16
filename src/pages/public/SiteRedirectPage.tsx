import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { setSiteSlugOverride } from '@/lib/tenant'
import { useSite } from '@/contexts/SiteContext'
import { useT } from '@/i18n'

const LANGS = new Set(['ar', 'fr', 'en'])
// Whitelisted internal SECTIONS reachable from a prerendered static page; the slug
// itself may be any non-empty segment (React Router hands it to us already
// percent-decoded, so Arabic slugs arrive as real characters — allow them).
// Open-redirect protection: reject traversal, slashes, schemes (:), backslashes,
// whitespace and query/hash fragments — only a single content slug is valid.
const DEST_RE = /^(blog|books)\/[^\s\\/?#:]+$/
const isSafeDest = (s: string) => DEST_RE.test(s) && !s.includes('..')

/**
 * #/site/:slug            → selects the tenant, opens its homepage (existing behavior).
 * #/site/:slug/<dest>?lang=<l> → selects the tenant, refreshes its data, then navigates
 * to the requested internal destination preserving the language (prerendered pages
 * link here, e.g. #/site/clientx/blog/article-slug?lang=fr).
 *
 * Open-redirect protection: only whitelisted internal paths are honored — external
 * URLs, protocol-relative URLs, traversal, and malformed destinations fall back to
 * the tenant homepage. The tenant override is set BEFORE data refresh and navigation,
 * so the destination page never loads with the wrong tenant. Tenant identity still
 * comes from server-side RPCs — the slug override is a selector, never an authorization
 * bypass (RLS applies unchanged).
 */
export default function SiteRedirectPage() {
  const { slug } = useParams()
  const splat = useParams()['*'] ?? ''
  const [search] = useSearchParams()
  const nav = useNavigate()
  const { refresh } = useSite()
  const t = useT()
  useEffect(() => {
    // 1) select the tenant first
    setSiteSlugOverride(slug ?? null)
    // 2) validate the requested destination (safe internal paths only)
    const dest = isSafeDest(splat) ? `/${splat}` : '/'
    const lang = search.get('lang')
    const qs = lang && LANGS.has(lang) ? `?lang=${lang}` : ''
    // 3) refresh tenant-specific data, then 4) navigate
    refresh().finally(() => nav(`${dest}${qs}`, { replace: true }))
  }, [slug, splat, search])
  return <div className="flex min-h-[70vh] items-center justify-center text-muted-foreground">{t.states.loading}</div>
}
