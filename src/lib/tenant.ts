// Tenant resolution for the PUBLIC site.
// Priority: 1) custom hostname  2) #/site/:slug override (GitHub Pages)
//           3) platform default (first active tenant)
// The browser never trusts a tenant_id sent by the user for public data —
// resolution always goes through security-definer RPCs.
import { supabase } from './supabase'
import type { TenantResolution } from '@/types'

export function isPlatformHost(hostname = window.location.hostname) {
  const host = hostname.toLowerCase().split(':')[0]

  return (
    host === 'academy.elbordiji.com' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.github.io') ||
    host.endsWith('.ok.kimi.link') ||
    host.endsWith('.kimi.link') ||
    host.endsWith('.app.github.dev')
  )
}

const SITE_KEY = 'site_slug'
export function setSiteSlugOverride(slug: string | null) {
  if (slug) sessionStorage.setItem(SITE_KEY, slug)
  else sessionStorage.removeItem(SITE_KEY)
}
export function getSiteSlugOverride() { return sessionStorage.getItem(SITE_KEY) }

export async function resolveCurrentTenant(): Promise<{ tenant: TenantResolution | null; unavailable: boolean }> {
  if (!supabase) return { tenant: null, unavailable: false } // demo mode
  const host = window.location.hostname

  if (!isPlatformHost(host)) {
    const { data } = await supabase.rpc('resolve_tenant_by_hostname', { host })
    const t = (data as TenantResolution[] | null)?.[0]
    if (!t) return { tenant: null, unavailable: false } // unknown host -> platform default
    if (t.status !== 'active' || (t.domain_status && !['verified', 'active'].includes(t.domain_status)))
      return { tenant: t, unavailable: true }
    return { tenant: t, unavailable: false }
  }

  const slug = getSiteSlugOverride()
  if (slug) {
    const { data } = await supabase.rpc('resolve_tenant_by_slug', { p_slug: slug })
    const t = (data as TenantResolution[] | null)?.[0]
    if (t) {
      if (t.status !== 'active') return { tenant: t, unavailable: true }
      return { tenant: t, unavailable: false }
    }
  }

  // platform default: the seeded "default" tenant (via security-definer RPC,
  // since anonymous users cannot read the tenants table directly)
  const { data } = await supabase.rpc('resolve_tenant_by_slug', { p_slug: 'default' })
  const t = (data as TenantResolution[] | null)?.[0]
  if (t && t.status === 'active') return { tenant: t, unavailable: false }
  return { tenant: null, unavailable: false }
}
