/* eslint-disable react-refresh/only-export-components -- context files co-locate the Provider with its hook, the idiomatic React pattern */
import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react'
import { getProfile, getSettings, getProfileLocalized, getSettingsLocalized } from '@/lib/api'
import { resolveCurrentTenant } from '@/lib/tenant'
import { useLang, type Lang } from '@/i18n'
import type { Profile, SiteSettings, TenantResolution } from '@/types'

type SiteCtx = {
  profile: Profile | null
  settings: SiteSettings | null
  tenant: TenantResolution | null
  unavailable: boolean
  loading: boolean
  refresh: () => Promise<void>
}
const Ctx = createContext<SiteCtx>({ profile: null, settings: null, tenant: null, unavailable: false, loading: true, refresh: async () => {} })
export const useSite = () => useContext(Ctx)

export function SiteProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [tenant, setTenant] = useState<TenantResolution | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const { lang } = useLang()

  const refresh = useCallback(async (forLang?: Lang) => {
    const useLangCode = forLang ?? lang
    const { tenant: t, unavailable: ua } = await resolveCurrentTenant().catch(() => ({ tenant: null, unavailable: false }))
    setTenant(t); setUnavailable(ua)
    const [bp, bs] = await Promise.all([
      getProfile(t?.tenant_id).catch(() => null),
      getSettings(t?.tenant_id).catch(() => null),
    ])
    // overlay the visitor's language when a stored translation exists (read-only merge)
    const [p, s] = await Promise.all([
      getProfileLocalized(bp, t?.tenant_id, useLangCode).catch(() => bp),
      getSettingsLocalized(bs, t?.tenant_id, useLangCode).catch(() => bs),
    ])
    setProfile(p); setSettings(s); setLoading(false)
  }, [lang])

  // refetch when the language changes so translated content loads.
  // All setState calls happen after awaits inside refresh() — nothing is set synchronously.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch, not a cascading render
  useEffect(() => { refresh(lang) }, [refresh, lang])
  return <Ctx.Provider value={{ profile, settings, tenant, unavailable, loading, refresh }}>{children}</Ctx.Provider>
}
