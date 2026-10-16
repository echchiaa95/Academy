import { useEffect, useState } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@/i18n'
import { updateProfile, getProfile, getProfileTranslation, upsertProfileTranslation } from '@/lib/api'
import { useAdminTenantId } from '@/hooks/useAdminTenant'
import { useSite } from '@/contexts/SiteContext'
import { UploadField } from '@/components/admin/UploadField'
import { LangTabs } from '@/components/admin/LangTabs'
import { LANGS, LANG_LABELS } from '@/components/admin/lang-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Profile, LangCode } from '@/types'

// Field component must live OUTSIDE the page component — defining it inside
// makes React remount the input on every keystroke (mobile keyboard closes).
function F({ k, label, dir, form, set }: { k: string; label: string; dir?: 'ltr'; form: object; set: (k: string, v: string) => void }) {
  return (
    <div className="space-y-1.5"><Label>{label}</Label><Input dir={dir} value={((form as Record<string, unknown>)[k] as string) ?? ''} onChange={(e) => set(k, e.target.value)} /></div>
  )
}

const TRANSLATABLE = ['first_name', 'last_name', 'academic_title', 'specialty', 'field', 'institution', 'location', 'short_bio', 'long_bio', 'qualifications', 'interests'] as const
type TrForm = Pick<Profile, typeof TRANSLATABLE[number]>
const emptyTr: TrForm = { first_name: '', last_name: '', academic_title: '', specialty: '', field: '', institution: '', location: '', short_bio: '', long_bio: '', qualifications: [], interests: [] }

export default function ProfileAdminPage() {
  const t = useT()
  const { refresh } = useSite()
  const [form, setForm] = useState<Profile | null>(null)
  const [busy, setBusy] = useState(false)
  const tid = useAdminTenantId()

  const baseLang = ((form?.language_code ?? 'ar') as LangCode)
  const [editLang, setEditLang] = useState<LangCode | null>(null)
  const [trs, setTrs] = useState<Partial<Record<LangCode, TrForm>>>({})
  const [dirty, setDirty] = useState(false)
  const active: LangCode = editLang ?? baseLang
  const isBase = active === baseLang

  useEffect(() => { getProfile(tid).then(async (p) => {
    setForm(p)
    if (p?.id && /^[0-9a-f-]{36}$/i.test(p.id)) {
      const map: typeof trs = {}
      for (const l of LANGS) {
        if (l === (p.language_code ?? 'ar')) continue
        const tr = await getProfileTranslation(p.id, l).catch(() => null)
        if (tr && (tr.first_name || tr.last_name)) {
          map[l] = Object.fromEntries(TRANSLATABLE.map((k) => [k, (tr as unknown as Record<string, unknown>)[k]])) as TrForm
        }
      }
      setTrs(map)
    }
  }) }, [tid])

  if (!form) return <p className="text-muted-foreground">{t.states.loading}</p>
  const current = form
  // string keys keep the setter compatible with the generic F field component
  const set = (k: string, v: unknown) => { setDirty(true); setForm((f) => f && { ...f, [k]: v }) }

  // translation form accessors (non-base language)
  const tf: TrForm = isBase
    ? Object.fromEntries(TRANSLATABLE.map((k) => [k, (form as unknown as Record<string, unknown>)[k]])) as TrForm
    : (trs[active] ?? emptyTr)
  const setTf = (k: string, v: string | string[]) => {
    setDirty(true)
    if (isBase) set(k, v)
    else setTrs((m) => ({ ...m, [active]: { ...(m[active] ?? emptyTr), [k]: v } }))
  }

  const langsWithContent = LANGS.filter((l) => l === baseLang ? !!form.first_name : !!(trs[l]?.first_name || trs[l]?.last_name))

  function switchLang(l: LangCode | null) {
    const target = l ?? baseLang
    if (dirty && !window.confirm(t.admin.unsavedWarning)) return
    setDirty(false); setEditLang(target === baseLang ? null : target)
  }
  function copyFrom(source: LangCode) {
    const src: TrForm = source === baseLang
      ? Object.fromEntries(TRANSLATABLE.map((k) => [k, (form as unknown as Record<string, unknown>)[k]])) as TrForm
      : (trs[source] ?? emptyTr)
    setTrs((m) => ({ ...m, [active]: { ...src } }))
    setDirty(true); toast.success(t.admin.copiedFrom.replace('{lang}', source))
  }

  async function save() {
    setBusy(true)
    try {
      const realId = /^[0-9a-f-]{36}$/i.test(current.id)
      await updateProfile({ ...current, tenant_id: current.tenant_id ?? tid ?? undefined } as Profile)
      // translation saved independently — never overwrites another language
      if (!isBase && realId && tid && (tf.first_name || tf.last_name)) {
        await upsertProfileTranslation({ ...tf, profile_id: current.id, language_code: active, tenant_id: tid })
      }
      setDirty(false)
      await refresh(); toast.success(t.admin.saved)
    } catch { toast.error(t.admin.saveError) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl gold-text">{t.admin.profile}</h1>
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

      <div className="grid gap-4 md:grid-cols-2">
        <F form={tf} set={setTf} k="first_name" label={t.admin.form.firstName} />
        <F form={tf} set={setTf} k="last_name" label={t.admin.form.lastName} />
        <F form={tf} set={setTf} k="academic_title" label={t.admin.form.academicTitle} />
        <F form={tf} set={setTf} k="specialty" label={t.admin.form.specialty} />
        <F form={tf} set={setTf} k="institution" label={t.admin.form.institution} />
        <F form={tf} set={setTf} k="field" label={t.admin.form.field} />
        <F form={tf} set={setTf} k="location" label={t.admin.form.location} />
        {isBase && (<>
          <F form={form} set={set} k="email" label={t.admin.form.email} dir="ltr" />
          <F form={form} set={set} k="phone" label={t.admin.form.phone} dir="ltr" />
          <F form={form} set={set} k="whatsapp" label={t.admin.form.whatsapp} dir="ltr" />
        </>)}
      </div>
      <div className="space-y-1.5"><Label>{t.admin.form.shortBio}</Label><Textarea rows={3} value={tf.short_bio ?? ''} onChange={(e) => setTf('short_bio', e.target.value)} /></div>
      <div className="space-y-1.5"><Label>{t.admin.form.longBio}</Label><Textarea rows={7} value={tf.long_bio ?? ''} onChange={(e) => setTf('long_bio', e.target.value)} /></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5"><Label>{t.admin.form.qualifications}</Label><Textarea rows={4} value={(tf.qualifications ?? []).join('\n')} onChange={(e) => setTf('qualifications', e.target.value.split('\n').filter(Boolean))} /></div>
        <div className="space-y-1.5"><Label>{t.admin.form.interests}</Label><Textarea rows={4} value={(tf.interests ?? []).join('\n')} onChange={(e) => setTf('interests', e.target.value.split('\n').filter(Boolean))} /></div>
      </div>
      {isBase && (<>
        <UploadField bucket="profile" accept="image/*" value={form.avatar_url ?? ''} onChange={(u) => set('avatar_url', u)} label={t.admin.form.avatar} />
        <h2 className="font-display text-2xl pt-4">{t.sections.links}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <F form={form} set={set} k="google_scholar" label={t.admin.form.scholar} dir="ltr" />
          <F form={form} set={set} k="orcid" label="ORCID" dir="ltr" />
          <F form={form} set={set} k="researchgate" label="ResearchGate" dir="ltr" />
          <F form={form} set={set} k="linkedin" label="LinkedIn" dir="ltr" />
          <F form={form} set={set} k="facebook" label="Facebook" dir="ltr" />
          <F form={form} set={set} k="x" label="X" dir="ltr" />
          <F form={form} set={set} k="website" label="Website" dir="ltr" />
        </div>
      </>)}
    </div>
  )
}
