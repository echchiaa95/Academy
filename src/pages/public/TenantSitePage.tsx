// TenantSiteLayout — public academic website of ONE customer at #/profile/:slug.
// Resolves the slug through the security-definer RPC, sets the site override
// while mounted, and renders the existing public pages nested below.
// Unknown slugs get a real not-found page — never another customer's profile.
import { useEffect, useState } from 'react'
import { Outlet, useParams, Link } from 'react-router'
import { supabase } from '@/lib/supabase'
import { setSiteSlugOverride } from '@/lib/tenant'
import { isSafeSlug } from '@/lib/tenant-url'
import { useSite } from '@/contexts/SiteContext'
import { useT } from '@/i18n'
import NotFoundPage from './NotFoundPage'

type State = 'loading' | 'ok' | 'notfound'

export default function TenantSiteLayout() {
  const { slug = '' } = useParams()
  const { refresh } = useSite()
  const t = useT()
  const [state, setState] = useState<State>('loading')

  // invalid slugs are decided during render — no effect needed
  const safe = isSafeSlug(slug)

  // reset to loading when the slug changes (render-adjust pattern)
  const [prevSlug, setPrevSlug] = useState(slug)
  if (prevSlug !== slug) { setPrevSlug(slug); setState('loading') }

  useEffect(() => {
    if (!safe) return undefined
    let active = true
    const done = (s: State) => { if (active) setState(s) }

    if (!supabase) {
      // demo mode: no backend to resolve against — set the override and render
      setSiteSlugOverride(slug)
      refresh().then(() => done('ok'))
    } else {
      supabase.rpc('resolve_tenant_by_slug', { p_slug: slug }).then(({ data, error }) => {
        const tenant = (data as { tenant_id: string }[] | null)?.[0]
        if (error || !tenant) { done('notfound'); return }
        setSiteSlugOverride(slug)
        refresh().then(() => done('ok'))
      })
    }
    return () => {
      active = false
      setSiteSlugOverride(null)
      void refresh()
    }
  }, [slug, safe, refresh])

  if (!safe || state === 'notfound') {
    return (
      <div className="pt-16">
        <NotFoundPage />
        <p className="pb-16 text-center -mt-8">
          <Link to="/" className="gold-text underline underline-offset-4">Academic Profile</Link>
        </p>
      </div>
    )
  }
  if (state === 'loading') {
    return <div className="flex min-h-[60vh] items-center justify-center pt-16 text-muted-foreground">{t.states.loading}</div>
  }
  return <Outlet />
}
