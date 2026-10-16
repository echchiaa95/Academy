// My Website — the customer's stable public URL, slug and publication status,
// with working Copy / Open actions. Data comes from the tenants row the
// customer is authorized to read (RLS: tenants member read).
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/api'
import { useAdminTenantId } from '@/hooks/useAdminTenant'
import { getTenantPublicUrl } from '@/lib/tenant-url'
import { useT } from '@/i18n'
import { Copy, Check, ExternalLink, Globe } from 'lucide-react'

type TenantInfo = { name: string; slug: string; status: string }

export default function MySitePage() {
  const t = useT()
  const tid = useAdminTenantId()
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  useEffect(() => {
    if (!tid || !supabase) { setLoading(false); return }
    let on = true
    Promise.all([
      supabase.from('tenants').select('name, slug, status').eq('id', tid).maybeSingle(),
      getProfile(tid).catch(() => null),
    ]).then(([{ data }, prof]) => {
      if (!on) return
      setTenant((data as TenantInfo | null) ?? null)
      setHasProfile(!!(prof && (prof.first_name || prof.last_name)))
      setLoading(false)
    })
    return () => { on = false }
  }, [tid])

  const url = tenant ? getTenantPublicUrl(tenant.slug) : null
  const published = tenant?.status === 'active'

  const copy = async () => {
    if (!url) return
    setCopyError(false)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API can be unavailable (non-secure context, permissions)
      try {
        const ta = document.createElement('textarea')
        ta.value = url; document.body.appendChild(ta); ta.select()
        const ok = document.execCommand('copy')
        ta.remove()
        if (!ok) throw new Error('copy failed')
        setCopied(true); setTimeout(() => setCopied(false), 2000)
      } catch { setCopyError(true) }
    }
  }

  if (loading) return <div className="py-16 text-center text-muted-foreground">{t.states.loading}</div>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold gold-text">{t.admin.mySiteTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.admin.mySiteDesc}</p>
      </header>

      <section className="glass rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c8a45c]/40 text-[#c8a45c]"><Globe className="size-5" /></span>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t.admin.publicUrl}</p>
            {url
              ? <a href={url} target="_blank" rel="noopener noreferrer" className="block truncate font-mono text-sm gold-text hover:underline" dir="ltr">{url}</a>
              : <p className="text-sm text-muted-foreground">—</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">{t.admin.slugLabel}</p>
            <p className="mt-0.5 font-mono text-sm" dir="ltr">{tenant?.slug ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.admin.pubStatusLabel}</p>
            <p className={`mt-0.5 flex items-center gap-2 text-sm ${published ? 'text-emerald-400' : 'text-amber-400'}`}>
              <span className={`h-2 w-2 rounded-full ${published ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {published ? t.admin.statusPublished : t.admin.statusUnpublished}
            </p>
          </div>
        </div>

        {url && (
          <div className="flex flex-wrap gap-3 pt-1">
            <button onClick={copy} className="flex items-center gap-2 rounded-full bg-[#c8a45c] px-5 py-2.5 text-sm font-semibold text-[#0c1124] transition-transform hover:scale-[1.03]">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? t.share.copied : t.admin.copyUrl}
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-full border border-[#c8a45c]/40 px-5 py-2.5 text-sm gold-text hover:bg-[#c8a45c]/10 transition-colors">
              <ExternalLink className="size-4" /> {t.admin.openWebsite}
            </a>
          </div>
        )}
        {copyError && <p className="text-sm text-destructive">{t.admin.copyFailed}</p>}
      </section>

      {!published && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/5 px-5 py-4 text-sm leading-7 text-amber-300">{t.admin.notPublishedMsg}</p>
      )}
      {hasProfile === false && (
        <p className="rounded-xl border border-[#c8a45c]/25 bg-[#c8a45c]/5 px-5 py-4 text-sm leading-7 text-muted-foreground">
          {t.admin.completeProfile}{' '}
          <Link to="/admin/profile" className="gold-text underline underline-offset-4">{t.admin.profile}</Link>
        </p>
      )}
    </div>
  )
}
