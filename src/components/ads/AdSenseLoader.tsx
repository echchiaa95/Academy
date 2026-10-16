import { useEffect } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { shouldLoadAds } from './adsense-logic'

const SCRIPT_ID = 'adsense-loader'

/**
 * Loads the Google AdSense script ONLY when all of these hold:
 *  - the resolved tenant has adsense_enabled = true
 *  - a valid public publisher id (ca-pub-…) is configured
 *  - Auto Ads is enabled (manual ad units are NOT implemented in this version,
 *    so with Auto Ads off there is no placement that could serve ads — loading
 *    the script anyway would be pointless and is therefore blocked)
 *  - a tenant is actually resolved for this hostname
 * Never loads on admin/auth pages (mounted only in the public layout),
 * never loads twice, and fails silently if Google's CDN is unreachable.
 */
export function AdSenseLoader() {
  const { settings, tenant } = useSite()

  const adsEnabled = settings?.adsense_enabled
  const autoAds = settings?.adsense_auto_ads_enabled
  const pub = settings?.adsense_publisher_id ?? ''
  const tenantId = tenant?.tenant_id

  useEffect(() => {
    const enabled = shouldLoadAds(
      { adsense_enabled: adsEnabled, adsense_auto_ads_enabled: autoAds, adsense_publisher_id: pub },
      !!tenantId,
    )

    const existing = document.getElementById(SCRIPT_ID)
    if (!enabled) {
      existing?.remove()
      return
    }
    if (existing) return // no duplicates

    const s = document.createElement('script')
    s.id = SCRIPT_ID
    s.async = true
    s.crossOrigin = 'anonymous'
    // identifier is validated above; it is a public integration id, never a secret,
    // and never arbitrary client-supplied code.
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pub}`
    s.onerror = () => { console.warn('[ads] AdSense script failed to load — site continues normally'); s.remove() }
    document.head.appendChild(s)
  }, [adsEnabled, autoAds, pub, tenantId])

  return null
}

/** Injects the Google Search Console verification meta tag (public pages only).
 *  The token is treated as configuration data, sanitized to [a-zA-Z0-9_-]. */
export function SiteVerificationMeta() {
  const { settings } = useSite()
  useEffect(() => {
    const token = (settings?.google_site_verification ?? '').replace(/[^a-zA-Z0-9_-]/g, '')
    let el = document.head.querySelector<HTMLMetaElement>('meta[name="google-site-verification"]')
    if (!token) { el?.remove(); return }
    if (!el) { el = document.createElement('meta'); el.name = 'google-site-verification'; document.head.appendChild(el) }
    el.content = token
  }, [settings?.google_site_verification])
  return null
}
