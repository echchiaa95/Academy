import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@/i18n'
import { upsertBook, listBooks, listBookTranslations, upsertBookTranslation, getTenantPrimaryLanguage } from '@/lib/api'
import { useAdminTenantId } from '@/hooks/useAdminTenant'
import { slugify } from '@/lib/format'
import { UploadField } from '@/components/admin/UploadField'
import { LangTabs } from '@/components/admin/LangTabs'
import { LANGS } from '@/components/admin/lang-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Book, BookType, LangCode, BookTranslation } from '@/types'

const empty: Partial<Book> = { title: '', slug: '', description: '', author: '', year: null, pages: null, cover_url: '', pdf_url: '', preview_url: '', price: null, currency: 'USD', type: 'FREE', published: false, featured: false, featured_order: 0 }

type BookLangForm = { title: string; slug: string; description: string; seo_title: string; seo_description: string; published: boolean }
const emptyBookLang: BookLangForm = { title: '', slug: '', description: '', seo_title: '', seo_description: '', published: false }

export default function BookEditorPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const t = useT()
  const nav = useNavigate()
  const [form, setForm] = useState<Partial<Book>>(empty)
  const [busy, setBusy] = useState(false)
  const tid = useAdminTenantId()

  const baseLang = ((form.language_code ?? 'ar') as LangCode)
  const [editLang, setEditLang] = useState<LangCode | null>(null)
  const [trs, setTrs] = useState<Partial<Record<LangCode, BookLangForm>>>({})
  const [dirty, setDirty] = useState(false)
  const active: LangCode = editLang ?? baseLang
  const isBase = active === baseLang

  useEffect(() => {
    if (!isNew) {
      listBooks(tid).then((all) => { const b = all.find((x) => x.id === id); if (b) setForm(b) })
      listBookTranslations(id!).then((rows) => {
        const map: typeof trs = {}
        for (const r of rows as BookTranslation[]) map[r.language_code] = { title: r.title, slug: r.slug, description: r.description, seo_title: r.seo_title ?? '', seo_description: r.seo_description ?? '', published: r.published }
        setTrs(map)
      })
    }
  }, [id])

  const lf: BookLangForm = isBase
    ? { title: form.title ?? '', slug: form.slug ?? '', description: form.description ?? '', seo_title: '', seo_description: '', published: !!form.published }
    : (trs[active] ?? emptyBookLang)
  const setLf = (k: keyof BookLangForm, v: string | boolean) => {
    setDirty(true)
    if (isBase) {
      if (k === 'published') set('published', v)
      else set(k as keyof Book, v)
    } else {
      setTrs((m) => ({ ...m, [active]: { ...(m[active] ?? emptyBookLang), [k]: v } }))
    }
  }

  const langsWithContent = LANGS.filter((l) => l === baseLang ? !!form.title : !!(trs[l]?.title))

  function switchLang(l: LangCode | null) {
    const target = l ?? baseLang
    if (dirty && !window.confirm(t.admin.unsavedWarning)) return
    setDirty(false)
    setEditLang(target === baseLang ? null : target)
  }

  function copyFrom(source: LangCode) {
    const src = source === baseLang
      ? { title: form.title ?? '', slug: form.slug ?? '', description: form.description ?? '', seo_title: '', seo_description: '', published: false }
      : (trs[source] ?? emptyBookLang)
    setTrs((m) => ({ ...m, [active]: { ...src, slug: '', published: false } }))
    setDirty(true)
    toast.success(t.admin.copiedFrom.replace('{lang}', source))
  }

  const set = (k: keyof Book, v: Book[keyof Book]) => { setDirty(true); setForm((f) => ({ ...f, [k]: v })) }

  async function save() {
    if (!lf.title) { toast.error(t.admin.form.title); return }
    setBusy(true)
    try {
      const payload = { ...form, tenant_id: form.tenant_id ?? tid, slug: form.slug || slugify(form.title ?? ''),
        language_code: form.language_code ?? await getTenantPrimaryLanguage(form.tenant_id ?? tid), year: form.year || null, pages: form.pages || null, price: form.price ?? null }
      const bookId = await upsertBook(payload)
      if (!isBase && tid) {
        await upsertBookTranslation({
          title: lf.title, slug: lf.slug || slugify(lf.title), description: lf.description,
          seo_title: lf.seo_title, seo_description: lf.seo_description,
          published: lf.published && !!lf.title,
          book_id: bookId, language_code: active, tenant_id: tid,
        })
      }
      setDirty(false)
      toast.success(t.admin.saved)
      if (isNew) nav(`/admin/books/${bookId}`, { replace: true })
    } catch { toast.error(t.admin.saveError) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl gold-text">{isNew ? t.admin.new : t.admin.edit} — {t.admin.books}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => nav('/admin/books')}>{t.admin.back}</Button>
          <Button onClick={save} disabled={busy} className="bg-[#c8a45c] text-stone-900 hover:bg-[#d9b56e]">{busy ? t.admin.saving : isNew ? t.admin.create : t.admin.update}</Button>
        </div>
      </div>

      {!isNew && (
        <LangTabs
          active={active} baseLang={baseLang} langsWithContent={langsWithContent} onSwitch={switchLang}
          copySlot={!isBase && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{t.admin.copyFrom}</span>
              {langsWithContent.filter((l) => l !== active).map((l) => (
                <Button key={l} type="button" variant="outline" size="sm" onClick={() => copyFrom(l)}>
                  <Copy className="size-3" /> {l.toUpperCase()}
                </Button>
              ))}
            </div>
          )}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5"><Label>{t.admin.form.title} *</Label><Input value={lf.title} onChange={(e) => setLf('title', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>{t.admin.form.slug}</Label><Input dir="ltr" value={lf.slug} onChange={(e) => setLf('slug', e.target.value)} placeholder={slugify(lf.title)} /></div>
        {isBase && (<>
          <div className="space-y-1.5"><Label>{t.admin.form.author}</Label><Input value={form.author ?? ''} onChange={(e) => set('author', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t.admin.form.type}</Label>
            <Select value={form.type} onValueChange={(v) => set('type', v as BookType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FREE">{t.admin.types.FREE}</SelectItem>
                <SelectItem value="PAID">{t.admin.types.PAID}</SelectItem>
                <SelectItem value="REQUEST">{t.admin.types.REQUEST}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>{t.admin.form.yearLabel}</Label><Input type="number" dir="ltr" value={form.year ?? ''} onChange={(e) => set('year', e.target.value ? +e.target.value : null)} /></div>
          <div className="space-y-1.5"><Label>{t.admin.form.pages}</Label><Input type="number" dir="ltr" value={form.pages ?? ''} onChange={(e) => set('pages', e.target.value ? +e.target.value : null)} /></div>
          {form.type === 'PAID' && (<>
            <div className="space-y-1.5"><Label>{t.admin.form.price}</Label><Input type="number" step="0.01" dir="ltr" value={form.price ?? ''} onChange={(e) => set('price', e.target.value ? +e.target.value : null)} /></div>
            <div className="space-y-1.5"><Label>{t.admin.form.currency}</Label><Input dir="ltr" value={form.currency ?? 'USD'} onChange={(e) => set('currency', e.target.value)} /></div>
          </>)}
          <div className="space-y-1.5"><Label>{t.admin.form.featuredOrder}</Label><Input type="number" dir="ltr" value={form.featured_order ?? 0} onChange={(e) => set('featured_order', +e.target.value)} /></div>
        </>)}
        <div className="flex items-end gap-8 pb-1">
          <label className="flex items-center gap-2 text-sm"><Switch checked={lf.published} onCheckedChange={(v) => setLf('published', v)} /> {t.admin.form.published}</label>
          {isBase && <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.featured} onCheckedChange={(v) => set('featured', v)} /> {t.admin.form.featured}</label>}
        </div>
      </div>
      <div className="space-y-1.5"><Label>{t.admin.form.description}</Label><Textarea rows={5} value={lf.description} onChange={(e) => setLf('description', e.target.value)} /></div>
      {!isBase && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>{t.admin.seoTitle}</Label><Input value={lf.seo_title} onChange={(e) => setLf('seo_title', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t.admin.seoDescription}</Label><Input value={lf.seo_description} onChange={(e) => setLf('seo_description', e.target.value)} /></div>
        </div>
      )}
      {isBase && (<>
        <UploadField bucket="covers" accept="image/*" value={form.cover_url ?? ''} onChange={(u) => set('cover_url', u)} label={t.admin.form.cover} />
        <UploadField bucket="books" accept="application/pdf" value={form.pdf_url ?? ''} onChange={(u) => set('pdf_url', u)} label={t.admin.form.pdf} />
        <UploadField bucket="previews" accept="application/pdf,image/*" value={form.preview_url ?? ''} onChange={(u) => set('preview_url', u)} label={t.admin.form.previewFile} />
      </>)}
    </div>
  )
}
