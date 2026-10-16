// Data access layer. When Supabase is configured, all reads/writes go to it;
// otherwise the app falls back to the built-in demo dataset (read-only preview).
// Every public/admin query is scoped to a tenant_id — isolation itself is
// enforced by RLS in Postgres (see supabase/migrations/0001_multi_tenant.sql).
import { supabase, isSupabaseConfigured } from './supabase'
import { normalizeHostname, isValidHostname, isDuplicateHostnameError } from './domain-utils'
import { getDemoProfile, getDemoPosts, getDemoBooks, demoSettings } from './demo-data'
import type { Profile, Post, Book, SiteSettings, BookRequest, Tenant, TenantDomain, TenantMember, Comment, PostTranslation, BookTranslation, ProfileTranslation, SettingsTranslation, LangCode } from '@/types'

export const isDemo = !isSupabaseConfigured

// ---------- Profile / Settings (tenant-scoped) ----------
// Public reads go through security-definer RPCs (migration 0002): the
// server validates the tenant is ACTIVE before returning anything, so a
// browser-supplied tenant_id can never unlock suspended tenants. Direct
// table reads remain as fallback (RLS limits those to the default tenant
// for anonymous users; admins can read their own tenant directly).
export async function getProfile(tenantId?: string): Promise<Profile> {
  if (!supabase) return getDemoProfile()
  if (tenantId) {
    const { data, error } = await supabase.rpc('get_public_profile', { p_tenant_id: tenantId })
    if (!error && data?.[0]) return data[0] as Profile
  }
  let q = supabase.from('profiles').select('*')
  if (tenantId) q = q.eq('tenant_id', tenantId)
  const { data } = await q.order('created_at', { ascending: true }).limit(1).maybeSingle()
  return (data as Profile) ?? getDemoProfile()
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function updateProfile(p: Partial<Profile> & { id: string }) {
  if (!supabase) throw new Error('demo')
  if (UUID_RE.test(p.id)) {
    const { error } = await supabase.from('profiles').update(p).eq('id', p.id)
    if (error) throw error
    return
  }
  // No real profile row yet (id came from the demo fallback) — create one.
  const { id: _demoId, ...rest } = p
  const { error } = await supabase.from('profiles').insert(rest)
  if (error) throw error
}

export async function getSettings(tenantId?: string): Promise<SiteSettings> {
  if (!supabase) return demoSettings
  if (tenantId) {
    const { data, error } = await supabase.rpc('get_public_settings', { p_tenant_id: tenantId })
    if (!error && data?.[0]) return data[0] as SiteSettings
  }
  let q = supabase.from('site_settings').select('*')
  if (tenantId) q = q.eq('tenant_id', tenantId)
  const { data } = await q.order('created_at', { ascending: true }).limit(1).maybeSingle()
  return (data as SiteSettings) ?? demoSettings
}

export async function updateSettings(s: Partial<SiteSettings> & { id: string }) {
  if (!supabase) throw new Error('demo')
  const { error } = await supabase.from('site_settings').update(s).eq('id', s.id)
  if (error) throw error
}

// ---------- Posts ----------
export async function listPosts(tenantId: string | undefined, opts: { publishedOnly?: boolean; featuredOnly?: boolean; limit?: number } = {}): Promise<Post[]> {
  if (!supabase) {
    let r = getDemoPosts().filter((p) => (opts.publishedOnly ? p.published : true))
    if (opts.featuredOnly) r = r.filter((p) => p.featured)
    return r.slice(0, opts.limit ?? 100)
  }
  if (tenantId && opts.publishedOnly) {
    // public path: security-definer RPC validates the tenant server-side
    const { data, error } = await supabase.rpc('list_public_posts', {
      p_tenant_id: tenantId, p_featured: opts.featuredOnly ?? false, p_limit: opts.limit ?? 100,
    })
    if (!error) return (data as Post[]) ?? []
  }
  let q = supabase.from('posts').select('*').order('published_at', { ascending: false, nullsFirst: false })
  if (tenantId) q = q.eq('tenant_id', tenantId)
  if (opts.publishedOnly) q = q.eq('published', true)
  if (opts.featuredOnly) q = q.eq('featured', true)
  if (opts.limit) q = q.limit(opts.limit)
  const { data, error } = await q
  if (error) throw error
  return (data as Post[]) ?? []
}

export async function getPostBySlug(slug: string, tenantId?: string): Promise<Post | null> {
  if (!supabase) return getDemoPosts().find((p) => p.slug === slug) ?? null
  if (tenantId) {
    const { data, error } = await supabase.rpc('get_public_post', { p_tenant_id: tenantId, p_slug: slug })
    if (!error) return (data?.[0] as Post) ?? null
  }
  let q = supabase.from('posts').select('*').eq('slug', slug)
  if (tenantId) q = q.eq('tenant_id', tenantId)
  const { data } = await q.maybeSingle()
  return (data as Post) ?? null
}

export async function upsertPost(p: Partial<Post> & { tenant_id?: string }): Promise<string> {
  if (!supabase) throw new Error('demo')
  if (p.id) {
    const { error } = await supabase.from('posts').update(p).eq('id', p.id)
    if (error) throw error
    return p.id
  }
  const { data, error } = await supabase.from('posts').insert(p).select('id').single()
  if (error) throw error
  return data.id as string
}

export async function deletePost(id: string) {
  if (!supabase) throw new Error('demo')
  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) throw error
}

// ---------- Books ----------
export async function listBooks(tenantId: string | undefined, opts: { publishedOnly?: boolean; featuredOnly?: boolean; limit?: number } = {}): Promise<Book[]> {
  if (!supabase) {
    let r = getDemoBooks().filter((b) => (opts.publishedOnly ? b.published : true))
    if (opts.featuredOnly) r = r.filter((b) => b.featured)
    return r.sort((a, b) => a.featured_order - b.featured_order).slice(0, opts.limit ?? 100)
  }
  if (tenantId && opts.publishedOnly) {
    const { data, error } = await supabase.rpc('list_public_books', {
      p_tenant_id: tenantId, p_featured: opts.featuredOnly ?? false, p_limit: opts.limit ?? 100,
    })
    if (!error) return (data as Book[]) ?? []
  }
  let q = supabase.from('books').select('*').order('featured_order', { ascending: true }).order('year', { ascending: false })
  if (tenantId) q = q.eq('tenant_id', tenantId)
  if (opts.publishedOnly) q = q.eq('published', true)
  if (opts.featuredOnly) q = q.eq('featured', true)
  if (opts.limit) q = q.limit(opts.limit)
  const { data, error } = await q
  if (error) throw error
  return (data as Book[]) ?? []
}

export async function getBookBySlug(slug: string, tenantId?: string): Promise<Book | null> {
  if (!supabase) return getDemoBooks().find((b) => b.slug === slug) ?? null
  if (tenantId) {
    const { data, error } = await supabase.rpc('get_public_book', { p_tenant_id: tenantId, p_slug: slug })
    if (!error) return (data?.[0] as Book) ?? null
  }
  let q = supabase.from('books').select('*').eq('slug', slug).eq('published', true)
  if (tenantId) q = q.eq('tenant_id', tenantId)
  const { data } = await q.maybeSingle()
  return (data as Book) ?? null
}

export async function upsertBook(b: Partial<Book> & { tenant_id?: string }): Promise<string> {
  if (!supabase) throw new Error('demo')
  if (b.id) {
    const { error } = await supabase.from('books').update(b).eq('id', b.id)
    if (error) throw error
    return b.id
  }
  const { data, error } = await supabase.from('books').insert(b).select('id').single()
  if (error) throw error
  return data.id as string
}

export async function deleteBook(id: string) {
  if (!supabase) throw new Error('demo')
  const { error } = await supabase.from('books').delete().eq('id', id)
  if (error) throw error
}

// ---------- Translations (multilingual content) ----------
export async function getTenantPrimaryLanguage(tenantId: string | undefined): Promise<LangCode> {
  if (!supabase || !tenantId) return 'ar'
  const { data } = await supabase.from('tenants').select('primary_language').eq('id', tenantId).maybeSingle()
  const l = (data as { primary_language?: string } | null)?.primary_language
  return l === 'fr' || l === 'en' ? l : 'ar'
}

// Base rows in posts/books/profiles/site_settings hold the PRIMARY-language content.
// These tables hold independent per-language records; saving one language never touches another.

function mergePost(base: Post, tr?: PostTranslation): Post {
  if (!tr) return base
  return { ...base, title: tr.title || base.title, slug: tr.slug || base.slug,
    excerpt: tr.excerpt ?? base.excerpt, content: tr.content ?? base.content }
}
function mergeBook(base: Book, tr?: BookTranslation): Book {
  if (!tr) return base
  return { ...base, title: tr.title || base.title, slug: tr.slug || base.slug,
    description: tr.description ?? base.description }
}

export async function listPostTranslations(postId: string): Promise<PostTranslation[]> {
  if (!supabase) return []
  const { data } = await supabase.from('post_translations').select('*').eq('post_id', postId)
  return (data ?? []) as PostTranslation[]
}

export async function upsertPostTranslation(tr: Partial<PostTranslation> & { post_id: string; language_code: LangCode; tenant_id: string }): Promise<void> {
  if (!supabase) throw new Error('demo')
  const { id: _id, ...rest } = tr
  const { error } = await supabase.from('post_translations')
    .upsert(rest, { onConflict: 'post_id,language_code' })
  if (error) throw error
}

export async function listBookTranslations(bookId: string): Promise<BookTranslation[]> {
  if (!supabase) return []
  const { data } = await supabase.from('book_translations').select('*').eq('book_id', bookId)
  return (data ?? []) as BookTranslation[]
}

export async function upsertBookTranslation(tr: Partial<BookTranslation> & { book_id: string; language_code: LangCode; tenant_id: string }): Promise<void> {
  if (!supabase) throw new Error('demo')
  const { id: _id, ...rest } = tr
  const { error } = await supabase.from('book_translations')
    .upsert(rest, { onConflict: 'book_id,language_code' })
  if (error) throw error
}

export async function getProfileTranslation(profileId: string, lang: LangCode): Promise<ProfileTranslation | null> {
  if (!supabase) return null
  const { data } = await supabase.from('profile_translations').select('*')
    .eq('profile_id', profileId).eq('language_code', lang).maybeSingle()
  return (data as ProfileTranslation) ?? null
}

export async function upsertProfileTranslation(tr: Partial<ProfileTranslation> & { profile_id: string; language_code: LangCode; tenant_id: string }): Promise<void> {
  if (!supabase) throw new Error('demo')
  const { id: _id, ...rest } = tr
  const { error } = await supabase.from('profile_translations')
    .upsert(rest, { onConflict: 'profile_id,language_code' })
  if (error) throw error
}

export async function getSettingsTranslation(settingsId: string, lang: LangCode): Promise<SettingsTranslation | null> {
  if (!supabase) return null
  const { data } = await supabase.from('site_settings_translations').select('*')
    .eq('settings_id', settingsId).eq('language_code', lang).maybeSingle()
  return (data as SettingsTranslation) ?? null
}

export async function upsertSettingsTranslation(tr: Partial<SettingsTranslation> & { settings_id: string; language_code: LangCode; tenant_id: string }): Promise<void> {
  if (!supabase) throw new Error('demo')
  const { id: _id, ...rest } = tr
  const { error } = await supabase.from('site_settings_translations')
    .upsert(rest, { onConflict: 'settings_id,language_code' })
  if (error) throw error
}

// Public localized reads: merge published translations over base rows for the active tenant.
export async function listPostsLocalized(tenantId: string | undefined, lang: LangCode, opts: { publishedOnly?: boolean; featuredOnly?: boolean; limit?: number } = {}): Promise<Post[]> {
  const base = await listPosts(tenantId, opts)
  if (!supabase || !tenantId || base.length === 0) return base // demo mode already serves per-language demo content
  const { data: trs } = await supabase.from('post_translations').select('*')
    .eq('tenant_id', tenantId).eq('language_code', lang).eq('published', true)
  const byPost = new Map((trs ?? []).map((t: PostTranslation) => [t.post_id, t]))
  const out: Post[] = []
  for (const p of base) {
    const baseLang = (p.language_code ?? 'ar') as LangCode
    if (baseLang === lang) { out.push(p); continue }       // primary content is already in this language
    const tr = byPost.get(p.id)
    if (tr && tr.title) out.push(mergePost(p, tr))          // published translation exists
    // else: not available in this language → excluded from the public list
  }
  return out
}

export async function getPostBySlugLocalized(slug: string, tenantId: string | undefined, lang: LangCode): Promise<{ post: Post; availableLangs: LangCode[]; shownLang: LangCode; langSlugs: Partial<Record<LangCode, string>> } | null> {
  const base = await getPostBySlug(slug, tenantId)
  let post = base
  let shownLang: LangCode | null = null
  // Maybe the slug belongs to a translation (language-specific URL)
  if (!post && supabase && tenantId) {
    const { data: tr } = await supabase.from('post_translations').select('*')
      .eq('tenant_id', tenantId).eq('language_code', lang).eq('slug', slug).eq('published', true).maybeSingle()
    if (tr) {
      const { data: bp } = await supabase.rpc('get_public_post_by_id', { p_tenant_id: tenantId, p_post_id: tr.post_id })
      if (bp?.[0]) { post = mergePost(bp[0] as Post, tr as PostTranslation); shownLang = lang }
    }
  }
  if (!post) return null
  const baseLang = (post.language_code ?? 'ar') as LangCode
  // every available language maps to ITS OWN slug — never reuse one slug for another language
  const langSlugs: Partial<Record<LangCode, string>> = { [baseLang]: (base ?? post).slug }
  const availableLangs: LangCode[] = [baseLang]
  if (supabase && tenantId) {
    const { data: trs } = await supabase.from('post_translations').select('language_code, slug, published, title')
      .eq('post_id', post.id).eq('published', true)
    for (const tr of trs ?? []) {
      if (tr.title && tr.slug) { availableLangs.push(tr.language_code as LangCode); langSlugs[tr.language_code as LangCode] = tr.slug }
    }
  }
  // merge the requested language if it is a published translation of this post
  if (!shownLang) {
    if (baseLang === lang) shownLang = lang
    else if (supabase && tenantId) {
      const { data: tr } = await supabase.from('post_translations').select('*')
        .eq('post_id', post.id).eq('language_code', lang).eq('published', true).maybeSingle()
      if (tr && tr.title) { post = mergePost(post, tr as PostTranslation); shownLang = lang }
    }
  }
  // explicit fallback: content shown in its original language, flagged for the UI
  return { post, availableLangs, shownLang: shownLang ?? baseLang, langSlugs }
}

export async function listBooksLocalized(tenantId: string | undefined, lang: LangCode, opts: { publishedOnly?: boolean; featuredOnly?: boolean; limit?: number } = {}): Promise<Book[]> {
  const base = await listBooks(tenantId, opts)
  if (!supabase || !tenantId || base.length === 0) return base
  const { data: trs } = await supabase.from('book_translations').select('*')
    .eq('tenant_id', tenantId).eq('language_code', lang).eq('published', true)
  const byBook = new Map((trs ?? []).map((t: BookTranslation) => [t.book_id, t]))
  const out: Book[] = []
  for (const b of base) {
    const baseLang = (b.language_code ?? 'ar') as LangCode
    if (baseLang === lang) { out.push(b); continue }
    const tr = byBook.get(b.id)
    if (tr && tr.title) out.push(mergeBook(b, tr))
  }
  return out
}

export async function getProfileLocalized(profile: Profile | null, tenantId: string | undefined, lang: LangCode): Promise<Profile | null> {
  if (!profile || !supabase || !tenantId || (profile.language_code ?? 'ar') === lang) return profile
  const { data: tr } = await supabase.from('profile_translations').select('*')
    .eq('profile_id', profile.id).eq('language_code', lang).maybeSingle()
  if (!tr) return profile
  const { language_code: _l, profile_id: _p, id: _i, tenant_id: _t, seo_title: _s, seo_description: _d, ...fields } = tr as ProfileTranslation
  return { ...profile, ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== '' && !(Array.isArray(v) && v.length === 0))) }
}

export async function getSettingsLocalized(settings: SiteSettings | null, tenantId: string | undefined, lang: LangCode): Promise<SiteSettings | null> {
  if (!settings || !supabase || !tenantId || (settings.language_code ?? 'ar') === lang) return settings
  const { data: tr } = await supabase.from('site_settings_translations').select('*')
    .eq('settings_id', settings.id).eq('language_code', lang).maybeSingle()
  if (!tr) return settings
  return { ...settings,
    site_name: tr.site_name || settings.site_name,
    site_description: tr.site_description || settings.site_description,
    seo_title: tr.seo_title || settings.seo_title,
    seo_description: tr.seo_description || settings.seo_description }
}

export async function getBookBySlugLocalized(slug: string, tenantId: string | undefined, lang: LangCode): Promise<{ book: Book; availableLangs: LangCode[]; langSlugs: Partial<Record<LangCode, string>> } | null> {
  const base = await getBookBySlug(slug, tenantId)
  let book = base
  if (!book && supabase && tenantId) {
    const { data: tr } = await supabase.from('book_translations').select('*')
      .eq('tenant_id', tenantId).eq('language_code', lang).eq('slug', slug).eq('published', true).maybeSingle()
    if (tr) {
      const { data: bb } = await supabase.rpc('get_public_book_by_id', { p_tenant_id: tenantId, p_book_id: tr.book_id })
      if (bb?.[0]) book = mergeBook(bb[0] as Book, tr as BookTranslation)
    }
  }
  if (!book) return null
  const baseLang = (book.language_code ?? 'ar') as LangCode
  const langSlugs: Partial<Record<LangCode, string>> = { [baseLang]: (base ?? book).slug }
  const availableLangs: LangCode[] = [baseLang]
  if (supabase && tenantId) {
    const { data: trs } = await supabase.from('book_translations').select('language_code, slug, published, title')
      .eq('book_id', book.id).eq('published', true)
    for (const tr of trs ?? []) {
      if (tr.title && tr.slug) { availableLangs.push(tr.language_code as LangCode); langSlugs[tr.language_code as LangCode] = tr.slug }
    }
  }
  if (book.language_code !== lang && supabase && tenantId) {
    const { data: tr } = await supabase.from('book_translations').select('*')
      .eq('book_id', book.id).eq('language_code', lang).eq('published', true).maybeSingle()
    if (tr && tr.title) book = mergeBook(book, tr as BookTranslation)
  }
  return { book, availableLangs, langSlugs }
}

// ---------- Comments ----------
export async function listComments(postId: string, tenantId?: string): Promise<Comment[]> {
  if (!supabase) return []
  let q = supabase.from('comments').select('*').eq('post_id', postId).eq('approved', true)
    .order('created_at', { ascending: false })
  if (tenantId) q = q.eq('tenant_id', tenantId)
  const { data, error } = await q
  if (error) { console.error('[comments] list failed:', error.code, error.message); return [] }
  return (data ?? []) as Comment[]
}

export async function addComment(c: { post_id: string; tenant_id?: string; author_name: string; author_email?: string; content: string }): Promise<void> {
  if (!supabase) throw new Error('demo')
  const { error } = await supabase.from('comments').insert({ ...c, approved: false })
  if (error) throw error
}

// ---------- Book requests ----------
export async function createBookRequest(r: { book_id: string; tenant_id?: string; name: string; email: string; phone: string; message: string }) {
  if (!supabase) return // demo: pretend success
  const { error } = await supabase.from('book_requests').insert(r)
  if (error) throw error
}

export async function listRequests(tenantId?: string): Promise<BookRequest[]> {
  if (!supabase) return []
  let q = supabase.from('book_requests').select('*, books(title)').order('created_at', { ascending: false })
  if (tenantId) q = q.eq('tenant_id', tenantId)
  const { data, error } = await q
  if (error) throw error
  return ((data as (BookRequest & { books?: { title?: string | null } | null })[] | null) ?? []).map((r) => ({ ...r, book_title: r.books?.title ?? '' }))
}

export async function updateRequestStatus(id: string, status: BookRequest['status']) {
  if (!supabase) throw new Error('demo')
  const { error } = await supabase.from('book_requests').update({ status }).eq('id', id)
  if (error) throw error
}

export async function deleteRequest(id: string) {
  if (!supabase) throw new Error('demo')
  const { error } = await supabase.from('book_requests').delete().eq('id', id)
  if (error) throw error
}

// ---------- Tenants (superadmin) ----------
export async function listTenants(): Promise<Tenant[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as Tenant[]) ?? []
}

export async function createTenant(t: Partial<Tenant>): Promise<string> {
  if (!supabase) throw new Error('demo')
  const { data, error } = await supabase.from('tenants').insert(t).select('id').single()
  if (error) throw error
  // provision default rows so the new site works immediately
  await supabase.from('profiles').insert({ tenant_id: data.id, first_name: t.name ?? '' }).then(() => {})
  await supabase.from('site_settings').insert({ tenant_id: data.id, site_name: t.name ?? 'Academic Profile' }).then(() => {})
  return data.id as string
}

// Creates the client's auth account (email + password) via the Edge Function.
// Passwords are never stored in the database or handled by any frontend logic —
// they go straight to the server-side function over HTTPS.
export async function createClientAccount(tenantId: string, email: string, password: string): Promise<{ ok: boolean; error?: string; linkedExisting?: boolean }> {
  if (!supabase) return { ok: false, error: 'demo' }
  const { data, error } = await supabase.functions.invoke('create-client-account', {
    body: { tenant_id: tenantId, email, password },
  })
  if (error) return { ok: false, error: await edgeErrorMessage(error) }
  if (data?.error) return { ok: false, error: data.error }
  return { ok: true, linkedExisting: !!data?.linked_existing }
}

export async function resetClientPassword(tenantId: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'demo' }
  const { data, error } = await supabase.functions.invoke('reset-client-password', {
    body: { tenant_id: tenantId, password },
  })
  if (error) return { ok: false, error: await edgeErrorMessage(error) }
  if (data?.error) return { ok: false, error: data.error }
  return { ok: true }
}

export async function deleteClientAccount(tenantId: string): Promise<{ ok: boolean; error?: string; unlinkedOnly?: number }> {
  if (!supabase) return { ok: false, error: 'demo' }
  const { data, error } = await supabase.functions.invoke('delete-client-account', {
    body: { tenant_id: tenantId },
  })
  if (error) return { ok: false, error: await edgeErrorMessage(error) }
  if (data?.error) return { ok: false, error: data.error }
  return { ok: true, unlinkedOnly: data?.unlinked_only ?? 0 }
}

// supabase-js collapses non-2xx Edge Function responses into a generic message —
// read the function's own JSON body to surface the REAL error to the admin.
async function edgeErrorMessage(error: unknown): Promise<string> {
  const fallback = error instanceof Error ? error.message : String(error)
  const ctx = (error as { context?: Response }).context
  if (!ctx) return fallback
  try {
    const body = await ctx.json() as { error?: string }
    return body?.error || fallback
  } catch { return fallback }
}

export async function updateTenant(id: string, patch: Partial<Tenant>) {
  if (!supabase) throw new Error('demo')
  const { error } = await supabase.from('tenants').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteTenant(id: string) {
  if (!supabase) throw new Error('demo')
  const { error } = await supabase.from('tenants').delete().eq('id', id)
  if (error) throw error
}

export async function listMembers(): Promise<TenantMember[]> {
  if (!supabase) return []
  const { data } = await supabase.from('tenant_members').select('*')
  return (data as TenantMember[]) ?? []
}

// ---------- Domains ----------
export async function listDomains(tenantId?: string): Promise<TenantDomain[]> {
  if (!supabase) return []
  let q = supabase.from('tenant_domains').select('*').order('created_at', { ascending: false })
  if (tenantId) q = q.eq('tenant_id', tenantId)
  const { data, error } = await q
  if (error) throw error
  return (data as TenantDomain[]) ?? []
}

export async function addDomain(tenantId: string, hostname: string): Promise<TenantDomain> {
  if (!supabase) throw new Error('demo')
  const clean = normalizeHostname(hostname)
  if (!isValidHostname(clean)) throw new Error('invalid hostname')
  const { data, error } = await supabase.from('tenant_domains').insert({ tenant_id: tenantId, hostname: clean }).select().single()
  if (error) {
    if (isDuplicateHostnameError(error.message)) throw new Error('duplicate hostname')
    throw error
  }
  return data as TenantDomain
}

export async function deleteDomain(id: string) {
  if (!supabase) throw new Error('demo')
  const { error } = await supabase.from('tenant_domains').delete().eq('id', id)
  if (error) throw error
}

export async function setDomainStatus(id: string, status: TenantDomain['status']) {
  if (!supabase) throw new Error('demo')
  const { error } = await supabase.from('tenant_domains').update({ status }).eq('id', id)
  if (error) throw error
}

// One primary per tenant: unset the rest first (unique partial index enforces it).
export async function setPrimaryDomain(d: TenantDomain) {
  if (!supabase) throw new Error('demo')
  const { error: e1 } = await supabase.from('tenant_domains').update({ is_primary: false }).eq('tenant_id', d.tenant_id)
  if (e1) throw e1
  const { error } = await supabase.from('tenant_domains').update({ is_primary: true }).eq('id', d.id)
  if (error) throw error
}

// Domain verification — SINGLE authoritative path: the verify-domain Edge
// Function performs the real server-side DNS TXT lookup, authorizes the
// caller, and invokes the service_role-only verify_domain_server RPC.
// There is NO browser-observed fallback: if the function is not deployed
// or unreachable, verification fails closed and the domain stays pending.
export async function verifyDomainDns(d: TenantDomain): Promise<'verified' | 'mismatch' | 'error'> {
  if (!supabase) return 'error'
  try {
    const { data, error } = await supabase.functions.invoke('verify-domain', { body: { domain_id: d.id } })
    if (error) return 'error'
    return (data?.result as 'verified' | 'mismatch') ?? 'error'
  } catch { return 'error' }
}

// ---------- Storage ----------
// Buckets: profile, covers, previews are public-read; books is PRIVATE.
// New uploads live under tenants/{tenant_id}/... so storage RLS can isolate
// tenants. For the private bucket we store the object PATH (not a URL) and
// mint short-lived signed URLs at download time.
export async function uploadFile(bucket: string, file: File, tenantId?: string): Promise<string> {
  if (!supabase) throw new Error('demo')
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const path = tenantId ? `tenants/${tenantId}/${name}` : name
  const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  if (bucket === 'books') return path
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Resolve a book PDF to a downloadable URL.
// SECURITY: eligibility is decided SERVER-SIDE. get_book_download re-checks
// (migration 0003) that the tenant is active, the book belongs to that
// tenant, is published, and is FREE — only then does it return pdf_url.
// Storage paths additionally pass through the storage RLS exact-path policy
// when minting the signed URL. PAID/REQUEST books get null, always.
export async function getBookPdfUrl(book: Book, tenantId?: string): Promise<string | null> {
  if (!book.pdf_url || book.type !== 'FREE') return null
  if (!supabase) return book.pdf_url // demo mode: static sample files only
  if (tenantId) {
    // server-side gate: never trust the client-side book record alone
    const { data: gated, error } = await supabase.rpc('get_book_download', {
      p_tenant_id: tenantId, p_book_id: book.id,
    })
    if (error || !gated) return null
    if (/^https?:\/\//.test(gated)) return gated // legacy external URL, validated FREE
    const { data, error: sErr } = await supabase.storage.from('books').createSignedUrl(gated, 300)
    return sErr ? null : data.signedUrl
  }
  // admin context (no resolved tenant): storage policy authorizes the
  // caller by the tenant encoded in the object path; raw http URLs are
  // returned only for FREE books.
  if (/^https?:\/\//.test(book.pdf_url)) return book.pdf_url
  const { data, error } = await supabase.storage.from('books').createSignedUrl(book.pdf_url, 300)
  if (error) return null
  return data.signedUrl
}

// Best-effort cleanup of a replaced file. Called only AFTER the new file
// has been uploaded successfully.
export async function deleteStoredFile(bucket: string, urlOrPath: string) {
  if (!supabase || !urlOrPath) return
  let path = urlOrPath
  const m = urlOrPath.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
  if (m) {
    if (m[1] !== bucket) return
    path = m[2]
  } else if (/^https?:\/\//.test(urlOrPath)) return
  await supabase.storage.from(bucket).remove([path]).catch(() => {})
}
