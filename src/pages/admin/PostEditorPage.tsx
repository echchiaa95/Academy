import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link2, Image as ImageIcon, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@/i18n'
import { upsertPost, listPosts, listPostTranslations, upsertPostTranslation, getTenantPrimaryLanguage } from '@/lib/api'
import { useAdminTenantId } from '@/hooks/useAdminTenant'
import { slugify } from '@/lib/format'
import { renderMarkdown } from '@/lib/markdown'
import { UploadField } from '@/components/admin/UploadField'
import { LangTabs } from '@/components/admin/LangTabs'
import { LANGS, emptyLangForm, fieldsFromLangForm, type LangForm } from '@/components/admin/lang-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Post, LangCode, PostTranslation } from '@/types'

const empty: Partial<Post> = { title: '', slug: '', excerpt: '', content: '', cover_url: '', category: '', tags: [], published: false, featured: false, published_at: new Date().toISOString().slice(0, 10) }

export default function PostEditorPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const t = useT()
  const nav = useNavigate()
  const [form, setForm] = useState<Partial<Post>>(empty)
  const [busy, setBusy] = useState(false)
  const tid = useAdminTenantId()
  const taRef = useRef<HTMLTextAreaElement>(null)

  // ---- multilingual state ----
  const baseLang = ((form.language_code ?? 'ar') as LangCode)
  const [editLang, setEditLang] = useState<LangCode | null>(null) // null = base language
  const [trs, setTrs] = useState<Partial<Record<LangCode, LangForm & { published: boolean }>>>({})
  const [dirty, setDirty] = useState(false)
  const active: LangCode = editLang ?? baseLang
  const isBase = active === baseLang

  useEffect(() => {
    if (!isNew) {
      listPosts(tid).then((all) => { const p = all.find((x) => x.id === id); if (p) setForm({ ...p, published_at: p.published_at?.slice(0, 10) }) })
      listPostTranslations(id!).then((rows) => {
        const map: typeof trs = {}
        for (const r of rows as PostTranslation[]) {
          map[r.language_code] = { title: r.title, slug: r.slug, excerpt: r.excerpt, content: r.content, seo_title: r.seo_title ?? '', seo_description: r.seo_description ?? '', published: r.published }
        }
        setTrs(map)
      })
    }
  }, [id])

  // language-dependent field accessors — never mix languages in one form
  const lf = isBase
    ? { title: form.title ?? '', slug: form.slug ?? '', excerpt: form.excerpt ?? '', content: form.content ?? '', seo_title: '', seo_description: '', published: !!form.published }
    : (trs[active] ?? emptyLangForm)
  const setLf = (k: keyof LangForm | 'published', v: string | boolean) => {
    setDirty(true)
    if (isBase) {
      if (k === 'published') set('published', v)
      else set(k as keyof Post, v)
    } else {
      setTrs((m) => ({ ...m, [active]: { ...(m[active] ?? emptyLangForm), published: m[active]?.published ?? false, [k]: v } }))
    }
  }

  const langsWithContent = LANGS.filter((l) =>
    l === baseLang ? !!form.title : !!(trs[l]?.title))

  function switchLang(l: LangCode | null) {
    const target = l ?? baseLang
    if (dirty && !window.confirm(t.admin.unsavedWarning)) return
    setDirty(false)
    setEditLang(target === baseLang ? null : target)
  }

  // explicit, admin-triggered copy from another language — never automatic
  function copyFrom(source: LangCode) {
    const src = source === baseLang
      ? { title: form.title ?? '', slug: form.slug ?? '', excerpt: form.excerpt ?? '', content: form.content ?? '', seo_title: '', seo_description: '', published: false }
      : (trs[source] ?? emptyLangForm)
    setTrs((m) => ({ ...m, [active]: { ...src, slug: '', published: false } }))
    setDirty(true)
    toast.success(t.admin.copiedFrom.replace('{lang}', source))
  }

  function wrap(before: string, after = '') {
    const ta = taRef.current; if (!ta) return
    const { selectionStart: s, selectionEnd: e, value } = ta
    const next = value.slice(0, s) + before + value.slice(s, e) + after + value.slice(e)
    setLf('content', next)
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s + before.length, e + before.length) })
  }
  const tools = [
    { icon: Bold, fn: () => wrap('**', '**') }, { icon: Italic, fn: () => wrap('*', '*') },
    { icon: Heading2, fn: () => wrap('\n## ') }, { icon: Heading3, fn: () => wrap('\n### ') },
    { icon: List, fn: () => wrap('\n- ') }, { icon: ListOrdered, fn: () => wrap('\n1. ') },
    { icon: Quote, fn: () => wrap('\n> ') },
    { icon: Link2, fn: () => wrap('[', '](https://)') }, { icon: ImageIcon, fn: () => wrap('\n![', '](https://)') },
  ]

  async function save() {
    if (isBase && !form.title) { toast.error(t.admin.form.title); return }
    if (!isBase && !lf.title) { toast.error(t.admin.form.title); return }
    setBusy(true)
    try {
      // 1) save the base record (shared fields + primary-language content)
      const payload = { ...form, tenant_id: form.tenant_id ?? tid, slug: form.slug || slugify(form.title ?? ''),
        language_code: form.language_code ?? await getTenantPrimaryLanguage(form.tenant_id ?? tid), tags: Array.isArray(form.tags) ? form.tags : String(form.tags).split(',').map((x) => x.trim()).filter(Boolean) }
      if (payload.published && !payload.published_at) payload.published_at = new Date().toISOString()
      const postId = await upsertPost(payload)
      // 2) save the active translation independently (upsert by post_id + language)
      if (!isBase && tid) {
        await upsertPostTranslation({
          ...fieldsFromLangForm(lf),
          post_id: postId, language_code: active, tenant_id: tid,
          slug: lf.slug || slugify(lf.title), published: (trs[active]?.published ?? false) && !!lf.title,
        })
      }
      setDirty(false)
      toast.success(t.admin.saved)
      if (isNew) nav(`/admin/posts/${postId}`, { replace: true })
    } catch { toast.error(t.admin.saveError) }
    finally { setBusy(false) }
  }

  const set = (k: keyof Post, v: Post[keyof Post]) => { setDirty(true); setForm((f) => ({ ...f, [k]: v })) }
  const tagsStr = Array.isArray(form.tags) ? form.tags.join(', ') : (form.tags as unknown as string) ?? ''

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl gold-text">{isNew ? t.admin.new : t.admin.edit} — {t.admin.posts}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => nav('/admin/posts')}>{t.admin.back}</Button>
          <Button onClick={save} disabled={busy} className="bg-[#c8a45c] text-stone-900 hover:bg-[#d9b56e]">{busy ? t.admin.saving : isNew ? t.admin.create : t.admin.update}</Button>
        </div>
      </div>

      {!isNew && (
        <LangTabs
          active={active} baseLang={baseLang} langsWithContent={langsWithContent}
          onSwitch={switchLang}
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
        {isBase && (
          <>
            <div className="space-y-1.5"><Label>{t.admin.form.category}</Label><Input value={form.category ?? ''} onChange={(e) => set('category', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{t.admin.form.tags}</Label><Input value={tagsStr} onChange={(e) => set('tags', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} /></div>
            <div className="space-y-1.5"><Label>{t.admin.form.publishedAt}</Label><Input type="date" dir="ltr" value={(form.published_at as string)?.slice(0, 10) ?? ''} onChange={(e) => set('published_at', e.target.value)} /></div>
          </>
        )}
        <div className="flex items-end gap-8 pb-1">
          <label className="flex items-center gap-2 text-sm"><Switch checked={lf.published} onCheckedChange={(v) => setLf('published', v)} /> {t.admin.form.published}</label>
          {isBase && <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.featured} onCheckedChange={(v) => set('featured', v)} /> {t.admin.form.featured}</label>}
        </div>
      </div>
      <div className="space-y-1.5"><Label>{t.admin.form.excerpt}</Label><Textarea rows={2} value={lf.excerpt} onChange={(e) => setLf('excerpt', e.target.value)} /></div>
      {!isBase && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>{t.admin.seoTitle}</Label><Input value={lf.seo_title} onChange={(e) => setLf('seo_title', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t.admin.seoDescription}</Label><Input value={lf.seo_description} onChange={(e) => setLf('seo_description', e.target.value)} /></div>
        </div>
      )}
      {isBase && <UploadField bucket="covers" accept="image/*" value={form.cover_url ?? ''} onChange={(u) => set('cover_url', u)} label={t.admin.form.cover} />}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t.admin.form.content}</Label>
          <p className="text-xs text-muted-foreground hidden md:block">{t.admin.form.previewText}</p>
        </div>
        <Tabs defaultValue="write">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {tools.map((tool, i) => (
                <Button key={i} type="button" variant="ghost" size="icon" className="size-8" onClick={tool.fn}><tool.icon className="size-4" /></Button>
              ))}
            </div>
            <TabsList><TabsTrigger value="write">{t.admin.edit}</TabsTrigger><TabsTrigger value="preview">{t.books.preview}</TabsTrigger></TabsList>
          </div>
          <TabsContent value="write">
            <Textarea ref={taRef} rows={16} value={lf.content} onChange={(e) => setLf('content', e.target.value)} className="font-mono text-sm leading-7" dir="auto" />
          </TabsContent>
          <TabsContent value="preview">
            <div className="article-body min-h-64 rounded-md border border-border p-5">{renderMarkdown(lf.content)}</div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
