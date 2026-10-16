import { useEffect, useState } from 'react'
import { useT, useLang } from '@/i18n'
import { useSite } from '@/contexts/SiteContext'
import { listBooksLocalized } from '@/lib/api'
import { BookCard } from '@/components/books/BookCard'
import { BookSkeleton } from '@/components/ui/skeletons'
import { useSEO } from '@/hooks/useSEO'
import { useReveal } from '@/hooks/useReveal'
import { Empty } from './BlogPage'
import type { Book } from '@/types'

export default function BooksPage() {
  const t = useT()
  const { lang } = useLang()
  const { tenant } = useSite()
  const [books, setBooks] = useState<Book[] | null>(null)
  useReveal([books])
  useSEO({ title: t.books.title, description: t.books.subtitle, path: '/books' })
  useEffect(() => { listBooksLocalized(tenant?.tenant_id, lang, { publishedOnly: true }).then(setBooks).catch(() => setBooks([])) }, [lang, tenant?.tenant_id])

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-32">
      <div className="mb-10 space-y-2">
        <h1 className="font-display text-4xl md:text-5xl font-semibold">{t.books.title}</h1>
        <p className="text-muted-foreground">{t.books.subtitle}</p>
      </div>
      {books === null ? (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <BookSkeleton key={i} />)}</div>
      ) : books.length === 0 ? <Empty message={t.books.empty} /> : (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {books.map((b) => <div key={b.id} className="reveal"><BookCard book={b} /></div>)}
        </div>
      )}
    </main>
  )
}
