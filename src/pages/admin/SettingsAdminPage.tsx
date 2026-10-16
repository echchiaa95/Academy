import { useEffect, useState } from 'react'
import { Copy, BadgeCheck, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@/i18n'
import { getSettings, updateSettings, getSettingsTranslation, upsertSettingsTranslation } from '@/lib/api'
import { useAdminTenantId } from '@/hooks/useAdminTenant'
import { useSite } from '@/contexts/SiteContext'
import { UploadField } from '@/components/admin/UploadField'
import { LangTabs } from '@/components/admin/LangTabs'
import { LANGS, LANG_LABELS } from '@/components/admin/lang-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import type { SiteSettings, LangCode } from '@/types'

const PUB_RE = /^ca-pub-\d{10,20}$/
const HOST_RE = /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/)?$/i

type SettingsLangForm = { site_name: string; site_description: string; seo_title: string; seo_description: string }
const emptySettingsLang: SettingsLangForm = { site_name: '', site_description: '', seo_title: '', seo_description: '' }

export default function SettingsAdminPage() {
  const t = useT()
  const { refresh } = useSite()
  const [form, setForm] = useState<SiteSettings | null>(null)
  const [busy, setBusy] = useState(false)
  const tid = useAdminTenantId()

  const baseLang = ((form?.language_code ?? 'ar') as LangCode)
  const [editLang, setEditLang] = useState<LangCode | null>(null)
  const [trs, setTrs] = useState<Partial<Record<LangCode, SettingsLangForm>>>({})
  const [dirty, setDirty] = useState(false)
  const active: LangCode = editLang ?? baseLang
  const isBase = active === baseLang

  useEffect(() => { getSettings(tid).then(async (s) => {
    setForm(s)
    if (s?.id && s.id !== 'demo') {
      const map: typeof trs = {}
      for (const l of LANGS) {
        if (l === (s.language_code ?? 'ar')) continue
        const tr = await getSettingsTranslation(s.id, l).catch(() => null)
        if (tr && (tr.site_name || tr.site_description)) map[l] = { site_name: tr.site_name, site_description: tr.site_description, seo_title: tr.seo_title ?? '', seo_description: tr.seo_description ?? '' }
      }
      setTrs(map)
    }
  }) }, [tid])

  if (!form) return <p className="text-muted-foreground">{t.states.loading}</p>

  const set = (k: keyof SiteSettings, v: SiteSettings[keyof SiteSettings]) => { setDirty(true); setForm((f) => f && { ...f, [k]: v }) }
  const lf: SettingsLangForm = isBase
    ? { site_name: form.site_name ?? '', site_description: form.site_description ?? '', seo_title: form.seo_title ?? '', seo_description: form.seo_description ?? '' }
    : (trs[active] ?? emptySettingsLang)
  const setLf = (k: keyof SettingsLangForm, v: string) => {
    setDirty(true)
    if (isBase) set(k as keyof SiteSettings, v)
    else setTrs((m) => ({ ...m, [active]: { ...(m[active] ?? emptySettingsLang), [k]: v } }))
  }
  const langsWithContent = LANGS.filter((l) => l === baseLang ? !!form.site_name : !!(trs[l]?.site_name))

  function switchLang(l: LangCode | null) {
    const target = l ?? baseLang
    if (dirty && !window.confirm(t.admin.unsavedWarning)) return
    setDirty(false); setEditLang(target === baseLang ? null : target)
  }
  function copyFrom(source: LangCode) {
    const src = source === baseLang ? lf : (trs[source] ?? emptySettingsLang)
    setTrs((m) => ({ ...m, [active]: { ...src } }))
    setDirty(true); toast.success(t.admin.copiedFrom.replace('{lang}', source))
  }

  const pubValid = !form.adsense_publisher_id || PUB_RE.test(form.adsense_publisher_id)
  const canonicalValid = !form.canonical_url || HOST_RE.test(form.canonical_url)

  async function save() {
    const current = form
    if (!current) return
    if (!pubValid) { toast.error(t.admin.adsenseInvalid); return }
    if (!canonicalValid) { toast.error(t.admin.canonicalInvalid); return }
    setBusy(true)
    try {
      await updateSettings({ ...current, adsense_updated_at: new Date().toISOString() } as SiteSettings)
      if (!isBase && tid && current.id) {
        await upsertSettingsTranslation({ ...lf, settings_id: current.id, language_code: active, tenant_id: tid })
      }
      setDirty(false)
      await refresh(); toast.success(t.admin.saved)
    } catch { toast.error(t.admin.saveError) }
    finally { setBusy(false) }
  }

  const Toggle = ({ k, label }: { k: keyof SiteSettings; label: string }) => (
    <label className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 text-sm">
      {label}
      <Switch checked={Boolean(form[k])} onCheckedChange={(v) => set(k, v)} />
    </label>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl gold-text">{t.admin.settings}</h1>
        <Button onClick={save} disabled={busy} className="bg-[#c8a45c] text-stone-900 hover:bg-[#d9b56e]">{busy ? t.admin.saving : t.admin.save}</Button>
      </div>

      <LangTabs active={active} baseLang={baseLang} langsWithContent={langsWithContent} onSwitch={switchLang}
        copySlot={!isBase && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t.admin.copyFrom}</span>
            {langsWithContent.filter((l) => l !== active).map((l) => (
              <Button key={l} type="button" variant="outline" size="sm" onClick={() => copyFrom(l)}><Copy className="size-3" /> {LANG_LABELS[l]}</Button>
            ))}
          </div>
        )} />

      <div className="space-y-1.5"><Label>{t.admin.form.siteName}</Label><Input value={lf.site_name} onChange={(e) => setLf('site_name', e.target.value)} /></div>
      <div className="space-y-1.5"><Label>{t.admin.form.siteDesc}</Label><Textarea rows={2} value={lf.site_description} onChange={(e) => setLf('site_description', e.target.value)} /></div>

      {/* SEO */}
      <div className="space-y-3 rounded-xl glass p-4">
        <h2 className="font-display text-lg gold-text">{t.admin.seoSection}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>{t.admin.seoTitle}</Label><Input value={lf.seo_title} onChange={(e) => setLf('seo_title', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t.admin.seoDescription}</Label><Input value={lf.seo_description} onChange={(e) => setLf('seo_description', e.target.value)} /></div>
        </div>
        {isBase && (<>
          <div className="space-y-1.5">
            <Label>{t.admin.canonicalUrl}</Label>
            <Input dir="ltr" placeholder="https://example.com" value={form.canonical_url ?? ''} onChange={(e) => set('canonical_url', e.target.value)} />
            {!canonicalValid && <p className="text-xs text-red-400">{t.admin.canonicalInvalid}</p>}
          </div>
          <UploadField bucket="profile" accept="image/*" value={form.og_image_url ?? ''} onChange={(u) => set('og_image_url', u)} label={t.admin.ogImage} />
          <div className="space-y-1.5">
            <Label>{t.admin.googleVerification}</Label>
            <Input dir="ltr" placeholder="google-site-verification token" value={form.google_site_verification ?? ''} onChange={(e) => set('google_site_verification', e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} />
            <p className="text-xs text-muted-foreground">{t.admin.googleVerificationHint}</p>
          </div>
        </>)}
      </div>

      {/* Monetization / Google AdSense */}
      {isBase && (
        <div className="space-y-3 rounded-xl glass p-4">
          <h2 className="font-display text-lg gold-text">{t.admin.adsenseSection}</h2>
          <p className="text-xs leading-5 text-muted-foreground">{t.admin.adsenseExplainer}</p>
          <Toggle k="adsense_enabled" label={t.admin.adsenseEnable} />
          {form.adsense_enabled && (<>
            <div className="space-y-1.5">
              <Label>{t.admin.adsensePubId}</Label>
              <Input dir="ltr" placeholder="ca-pub-XXXXXXXXXXXXXXXX" value={form.adsense_publisher_id ?? ''} onChange={(e) => set('adsense_publisher_id', e.target.value.trim())} />
              {!pubValid
                ? <p className="flex items-center gap-1 text-xs text-red-400"><AlertCircle className="size-3" /> {t.admin.adsenseInvalid}</p>
                : form.adsense_publisher_id && <p className="flex items-center gap-1 text-xs text-green-500"><BadgeCheck className="size-3" /> {t.admin.adsenseValid}</p>}
            </div>
            <Toggle k="adsense_auto_ads_enabled" label={t.admin.adsenseAutoAds} />
            <p className="text-xs leading-5 text-muted-foreground">{t.admin.adsenseAutoNote}</p>
            <p className="text-xs leading-5 text-muted-foreground">{t.admin.adsenseApprovalNote}</p>
          </>)}
        </div>
      )}

      {isBase && (<>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>{t.admin.form.postsPerPage}</Label><Input type="number" min={1} max={12} dir="ltr" value={form.posts_per_page} onChange={(e) => set('posts_per_page', +e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t.admin.form.booksPerPage}</Label><Input type="number" min={1} max={12} dir="ltr" value={form.books_per_page} onChange={(e) => set('books_per_page', +e.target.value)} /></div>
        </div>
        <UploadField bucket="profile" accept="image/*" value={form.hero_image_url ?? ''} onChange={(u) => set('hero_image_url', u)} label={t.admin.form.heroImage} />
        <div className="space-y-2">
          <Toggle k="show_about" label={t.admin.form.showAbout} />
          <Toggle k="show_blog" label={t.admin.form.showBlog} />
          <Toggle k="show_books" label={t.admin.form.showBooks} />
          <Toggle k="show_social" label={t.admin.form.showSocial} />
          <Toggle k="show_contact" label={t.admin.form.showContact} />
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
          <Toggle k="maintenance_mode" label={t.admin.form.maintenance} />
          <p className="text-xs text-muted-foreground">{t.admin.form.maintenanceHint}</p>
        </div>
      </>)}
    </div>
  )
}
