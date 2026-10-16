import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useT, useLang } from '@/i18n'
import { useSite } from '@/contexts/SiteContext'
import { listBooksLocalized } from '@/lib/api'
import { BookCard } from '@/components/books/BookCard'
import { SectionHeading } from './SectionHeading'
import { BookSkeleton } from '@/components/ui/skeletons'
import { Button } from '@/components/ui/button'
import type { Book } from '@/types'

export function BooksSection() {
  const t = useT()
  const { lang } = useLang()
  const { settings, tenant } = useSite()
  const [books, setBooks] = useState<Book[] | null>(null)

  useEffect(() => {
    const limit = settings?.books_per_page ?? 3
    // Featured first; if nothing is featured, fall back to latest published;
    // if nothing is published at all, the section stays hidden.
    listBooksLocalized(tenant?.tenant_id, lang, { publishedOnly: true, featuredOnly: true, limit })
      .then(async (featured) => {
        if (featured.length > 0) return featured
        return listBooksLocalized(tenant?.tenant_id, lang, { publishedOnly: true, limit })
      })
      .then(setBooks).catch(() => setBooks([]))
  }, [settings?.books_per_page, lang, tenant?.tenant_id])

  // No books at all -> the whole section disappears (no empty space).
  if (books && books.length === 0) return null
  return (
    <section className="border-y border-border/50 bg-card/40 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading title={t.sections.books} subtitle={t.books.subtitle} />
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {books === null
            ? Array.from({ length: 4 }).map((_, i) => <BookSkeleton key={i} />)
            : books.map((b, i) => <div key={b.id} className="reveal" style={{ transitionDelay: `${i * 80}ms` }}><BookCard book={b} /></div>)}
        </div>
        <div className="reveal mt-10 text-center">
          <Button asChild variant="outline" className="border-border"><Link to="/books">{t.books.title}</Link></Button>
        </div>
      </div>
    </section>
  )
}
