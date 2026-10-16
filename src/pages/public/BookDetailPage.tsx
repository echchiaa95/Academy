import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { useLang, useT } from '@/i18n'
import { useSite } from '@/contexts/SiteContext'
import { getBookBySlugLocalized, listBooksLocalized } from '@/lib/api'
import { BookActions } from '@/components/books/BookActions'
import { BookCard, BookTypeBadge } from '@/components/books/BookCard'
import { ImagePlaceholder } from '@/components/ui/placeholder'
import { TextSkeleton } from '@/components/ui/skeletons'
import { Button } from '@/components/ui/button'
import { useSEO } from '@/hooks/useSEO'
import type { Book } from '@/types'

export default function BookDetailPage() {
  const { slug } = useParams()
  const t = useT()
  const { dir, lang } = useLang()
  const { tenant, settings } = useSite()
  const [book, setBook] = useState<Book | null | undefined>(undefined)
  const [availableLangs, setAvailableLangs] = useState<string[]>([])
  const [langSlugs, setLangSlugs] = useState<Partial<Record<string, string>>>({})
  const [similar, setSimilar] = useState<Book[]>([])
  const Back = dir === 'rtl' ? ArrowRight : ArrowLeft

  // Reset loading state during render when the key changes (see BlogPostPage)
  const loadKey = `${tenant?.tenant_id}:${slug}:${lang}`
  const [prevKey, setPrevKey] = useState('')
  if (prevKey !== loadKey) { setPrevKey(loadKey); setBook(undefined) }

  useEffect(() => {
    getBookBySlugLocalized(slug!, tenant?.tenant_id, lang).then((r) => {
      if (!r) { setBook(null); return }
      setBook(r.book); setAvailableLangs(r.availableLangs); setLangSlugs(r.langSlugs)
      listBooksLocalized(tenant?.tenant_id, lang, { publishedOnly: true }).then((all) => setSimilar(all.filter((x) => x.id !== r.book.id && x.type === r.book.type).slice(0, 4)))
    })
  }, [slug, lang, tenant?.tenant_id])

  useSEO({
    title: book?.title, description: book?.description, image: book?.cover_url || undefined,
    path: book ? `/books/${langSlugs[lang] ?? book.slug}?lang=${lang}` : undefined,
    canonicalBase: settings?.canonical_url || undefined,
    canonicalOverride: book && settings?.canonical_url ? `${settings.canonical_url.replace(/\/$/, '')}/p/books/${lang}/${encodeURIComponent(langSlugs[lang] ?? book.slug)}/` : undefined,
    lang,
    alternates: book ? availableLangs.filter((l) => langSlugs[l]).map((l) => settings?.canonical_url
      ? { lang: l, path: `/p/books/${l}/${encodeURIComponent(langSlugs[l]!)}/` }
      : { lang: l, path: `/books/${langSlugs[l]}?lang=${l}` }) : undefined,
    jsonLd: book ? {
      '@context': 'https://schema.org', '@type': 'Book',
      name: book.title, description: book.description || undefined,
      image: book.cover_url || undefined,
      ...(book.author ? { author: { '@type': 'Person', name: book.author } } : {}),
      ...(book.year ? { datePublished: String(book.year) } : {}),
      ...(book.pages ? { numberOfPages: book.pages } : {}),
      inLanguage: book.language_code ?? lang,
    } : undefined,
  })

  if (book === undefined) return <div className="mx-auto max-w-4xl px-5 py-32"><TextSkeleton lines={8} /></div>
  if (book === null) return (
    <div className="mx-auto max-w-3xl px-5 py-40 text-center space-y-4">
      <h1 className="font-display text-4xl">{t.states.notFound}</h1>
      <Button asChild variant="outline"><Link to="/books">{t.books.back}</Link></Button>
    </div>
  )

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-32">
      <Button asChild variant="ghost" size="sm" className="mb-8 text-muted-foreground"><Link to="/books"><Back className="size-4" /> {t.books.back}</Link></Button>
      <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
        <div className="mx-auto w-full max-w-xs">
          <div className="relative">
            <div className="absolute -inset-3 rounded-xl border border-[#c8a45c]/20 translate-x-2.5 translate-y-2.5" />
            <div className="relative overflow-hidden rounded-xl aspect-[3/4] shadow-2xl shadow-black/60">
              {book.cover_url
                ? <img src={book.cover_url} alt={book.title} className="size-full object-cover" />
                : <ImagePlaceholder kind="book" className="size-full rounded-xl" />}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3"><BookTypeBadge type={book.type} /></div>
            <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight">{book.title}</h1>
            <p className="text-lg text-muted-foreground">{book.author}</p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm border-y border-border/60 py-4">
            {book.year && <div><span className="text-muted-foreground">{t.books.year}: </span><span className="font-medium">{book.year}</span></div>}
            {book.pages && <div><span className="text-muted-foreground">{t.admin.form.pages}: </span><span className="font-medium">{book.pages} {t.books.pages}</span></div>}
            {book.type === 'PAID' && book.price != null && <div><span className="text-muted-foreground">{t.admin.form.price}: </span><span className="font-semibold gold-text">{book.price} {book.currency}</span></div>}
            {book.type === 'FREE' && <div className="text-emerald-400 font-medium">{t.books.free}</div>}
          </div>
          <div>
            <h2 className="font-display text-2xl gold-text mb-2">{t.books.aboutBook}</h2>
            <p className="leading-8 text-foreground/85 whitespace-pre-line">{book.description}</p>
          </div>
          <BookActions book={book} />
        </div>
      </div>
      {similar.length > 0 && (
        <div className="mt-20">
          <h2 className="font-display text-2xl font-semibold mb-6">{t.books.similar}</h2>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">{similar.map((b) => <BookCard key={b.id} book={b} />)}</div>
        </div>
      )}
    </main>
  )
}
