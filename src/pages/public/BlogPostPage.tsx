import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRight, ArrowLeft, Languages } from 'lucide-react'
import { useLang, useT } from '@/i18n'
import { getPostBySlugLocalized, listPostsLocalized } from '@/lib/api'
import { renderMarkdown } from '@/lib/markdown'
import { formatDate, readingMinutes } from '@/lib/format'
import { useSite } from '@/contexts/SiteContext'
import { BlogCard } from '@/components/blog/BlogCard'
import { ShareButtons } from '@/components/blog/ShareButtons'
import { CommentsSection } from '@/components/blog/CommentsSection'
import { ImagePlaceholder } from '@/components/ui/placeholder'
import { TextSkeleton } from '@/components/ui/skeletons'
import { Button } from '@/components/ui/button'
import { useSEO, pageUrl } from '@/hooks/useSEO'
import type { Post, LangCode } from '@/types'

const LANG_NAMES: Record<LangCode, string> = { ar: 'العربية', fr: 'Français', en: 'English' }

export default function BlogPostPage() {
  const { slug } = useParams()
  const t = useT()
  const { lang, dir } = useLang()
  const { profile, tenant, settings } = useSite()
  const [post, setPost] = useState<Post | null | undefined>(undefined)
  const [shownLang, setShownLang] = useState<LangCode | null>(null)
  const [availableLangs, setAvailableLangs] = useState<LangCode[]>([])
  const [langSlugs, setLangSlugs] = useState<Partial<Record<LangCode, string>>>({})
  const [related, setRelated] = useState<Post[]>([])
  const Back = dir === 'rtl' ? ArrowRight : ArrowLeft

  // Reset loading state during render when the key changes (React-endorsed
  // "adjust state during render" pattern — no synchronous setState in effects)
  const loadKey = `${tenant?.tenant_id}:${slug}:${lang}`
  const [prevKey, setPrevKey] = useState('')
  if (prevKey !== loadKey) { setPrevKey(loadKey); setPost(undefined) }

  useEffect(() => {
    getPostBySlugLocalized(slug!, tenant?.tenant_id, lang).then((r) => {
      if (!r) { setPost(null); return }
      setPost(r.post); setShownLang(r.shownLang); setAvailableLangs(r.availableLangs); setLangSlugs(r.langSlugs)
      listPostsLocalized(tenant?.tenant_id, lang, { publishedOnly: true }).then((all) =>
        setRelated(all.filter((x) => x.id !== r.post.id && (x.category === r.post.category || x.tags?.some((tg) => r.post.tags?.includes(tg)))).slice(0, 3)))
    })
  }, [slug, lang, tenant?.tenant_id])

  const canonicalBase = settings?.canonical_url || undefined
  const author = profile ? `${profile.first_name} ${profile.last_name}` : ''
  // canonical = the real prerendered URL of the DISPLAYED language version when the
  // site has a public base URL (CI generates /p/blog/<lang>/<slug>/ per language);
  // otherwise fall back to the hash route.
  const shownPath = post ? `/blog/${langSlugs[shownLang ?? lang] ?? post.slug}?lang=${shownLang ?? lang}` : undefined
  const realUrl = post && canonicalBase
    ? `${canonicalBase.replace(/\/$/, '')}/p/blog/${shownLang ?? lang}/${encodeURIComponent(langSlugs[shownLang ?? lang] ?? post.slug)}/`
    : undefined
  useSEO({
    title: post ? `${post.title} — ${author}` : undefined,
    description: post?.excerpt, image: post?.cover_url || undefined, path: shownPath,
    canonicalBase, canonicalOverride: realUrl, lang: shownLang ?? lang,
    // Prefer real prerendered URLs when a public base is configured; otherwise fall
    // back to hash URLs that still carry ?lang= so each alternate selects its language.
    alternates: post ? availableLangs
      .filter((l) => langSlugs[l])
      .map((l) => canonicalBase
        ? { lang: l, path: `/p/blog/${l}/${encodeURIComponent(langSlugs[l]!)}/` }
        : { lang: l, path: `/blog/${langSlugs[l]}?lang=${l}` }) : undefined,
    jsonLd: post ? [
      {
        '@context': 'https://schema.org', '@type': 'BlogPosting',
        headline: post.title, description: post.excerpt || undefined,
        image: post.cover_url || undefined,
        datePublished: post.published_at || undefined,
        inLanguage: shownLang ?? lang,
        mainEntityOfPage: pageUrl(shownPath ?? '/', canonicalBase),
        ...(author ? { author: { '@type': 'Person', name: author } } : {}),
      },
      {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t.nav.home, item: pageUrl('/', canonicalBase) },
          { '@type': 'ListItem', position: 2, name: t.blog.title, item: pageUrl('/blog', canonicalBase) },
          { '@type': 'ListItem', position: 3, name: post.title, item: pageUrl(shownPath ?? '/', canonicalBase) },
        ],
      },
    ] : undefined,
  })

  if (post === undefined) return <div className="mx-auto max-w-3xl px-5 py-32"><TextSkeleton lines={10} /></div>
  if (post === null) return (
    <div className="mx-auto max-w-3xl px-5 py-40 text-center space-y-4">
      <h1 className="font-display text-4xl">{t.states.notFound}</h1>
      <Button asChild variant="outline"><Link to="/blog">{t.blog.back}</Link></Button>
    </div>
  )

  return (
    <main className="pb-20">
      <div className="relative">
        <div className="relative mx-auto max-w-5xl overflow-hidden md:rounded-b-2xl aspect-[16/7]">
          {post.cover_url
            ? <img src={post.cover_url} alt={post.title} className="size-full object-cover" />
            : <ImagePlaceholder className="size-full" />}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-3xl px-5">
          {shownLang && shownLang !== lang && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-[#c8a45c]/30 bg-[#c8a45c]/5 px-4 py-2.5 text-sm text-muted-foreground">
              <Languages className="size-4 shrink-0 gold-text" />
              {t.blog.langFallback.replace('{lang}', LANG_NAMES[lang]).replace('{shown}', LANG_NAMES[shownLang])}
            </div>
          )}
          <div className="-mt-24 relative space-y-4">
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground"><Link to="/blog"><Back className="size-4" /> {t.blog.back}</Link></Button>
            {post.category && <span className="block w-fit rounded-full glass px-3 py-1 text-xs gold-text">{post.category}</span>}
            <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {author && <span>{t.blog.by} <span className="text-foreground">{author}</span></span>}
              <span className="size-1 rounded-full bg-border" />
              <time>{formatDate(post.published_at, lang)}</time>
              <span className="size-1 rounded-full bg-border" />
              <span>{readingMinutes(post.content)} {t.blog.minRead}</span>
            </div>
          </div>
          <article className="article-body mt-10">{renderMarkdown(post.content)}</article>
          {post.tags?.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2">
              {post.tags.map((tg) => <span key={tg} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">#{tg}</span>)}
            </div>
          )}
          <div className="hairline mt-10" />
          <div className="mt-6"><ShareButtons title={post.title} path={`/blog/${post.slug}`} /></div>
          <CommentsSection postId={post.id} />
          {profile && (
            <div className="mt-12 flex items-center gap-4 rounded-xl glass p-5">
              <div className="size-16 shrink-0 overflow-hidden rounded-full">
                {profile.avatar_url ? <img src={profile.avatar_url} alt={author} className="size-full object-cover" /> : <ImagePlaceholder kind="portrait" className="size-full" />}
              </div>
              <div>
                <p className="font-display text-lg font-semibold">{author}</p>
                <p className="text-sm text-muted-foreground">{profile.academic_title}{profile.institution ? ` — ${profile.institution}` : ''}</p>
              </div>
            </div>
          )}
          {related.length > 0 && (
            <div className="mt-16">
              <h2 className="font-display text-2xl font-semibold mb-6">{t.blog.related}</h2>
              <div className="grid gap-8 md:grid-cols-3">{related.map((p) => <BlogCard key={p.id} post={p} />)}</div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
