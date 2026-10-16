// Pure decision logic for AdSenseLoader — kept separate so it is unit-testable
// without a browser or a Supabase connection.

export const ADSENSE_PUB_RE = /^ca-pub-\d{10,20}$/

export interface AdsSettingsLike {
  adsense_enabled?: boolean | null
  adsense_auto_ads_enabled?: boolean | null
  adsense_publisher_id?: string | null
}

/**
 * The AdSense script may load ONLY when all of these hold:
 *  - adsense_enabled and adsense_auto_ads_enabled are both true
 *    (manual ad units are not implemented, so Auto Ads off = nothing to serve)
 *  - the publisher id matches the public ca-pub- format
 *  - a tenant is actually resolved for this hostname
 */
export function shouldLoadAds(settings: AdsSettingsLike | null | undefined, tenantResolved: boolean): boolean {
  if (!tenantResolved || !settings) return false
  if (!settings.adsense_enabled || !settings.adsense_auto_ads_enabled) return false
  return ADSENSE_PUB_RE.test(settings.adsense_publisher_id ?? '')
}
