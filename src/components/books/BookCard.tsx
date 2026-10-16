import { Link } from 'react-router'
import { useT } from '@/i18n'
import { ImagePlaceholder } from '@/components/ui/placeholder'
import type { Book } from '@/types'

export function BookTypeBadge({ type }: { type: Book['type'] }) {
  const t = useT()
  const styles: Record<Book['type'], string> = {
    FREE: 'border-emerald-500/40 text-emerald-400',
    PAID: 'border-[#c8a45c]/50 gold-text',
    REQUEST: 'border-sky-500/40 text-sky-400',
  }
  return <span className={`rounded-full border px-2.5 py-0.5 text-[10px] tracking-wider ${styles[type]}`}>{t.admin.types[type]}</span>
}

export function BookCard({ book }: { book: Book }) {
  const t = useT()
  return (
    <Link to={`/books/${book.slug}`} className="group block">
      <div className="img-zoom relative overflow-hidden rounded-lg aspect-[3/4] shadow-xl shadow-black/40">
        {book.cover_url
          ? <img src={book.cover_url} alt={book.title} loading="lazy" className="size-full object-cover" />
          : <ImagePlaceholder kind="book" className="size-full rounded-lg" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent" />
        <div className="absolute top-3 end-3"><BookTypeBadge type={book.type} /></div>
        <div className="absolute inset-x-0 bottom-0 p-4 space-y-1">
          <h3 className="font-display text-lg font-semibold leading-tight group-hover:text-[#c8a45c] transition-colors line-clamp-2">{book.title}</h3>
          <p className="text-xs text-muted-foreground">{book.author}{book.year ? ` · ${book.year}` : ''}</p>
          {book.type === 'PAID' && book.price != null && (
            <p className="text-sm gold-text font-medium">{book.price} {book.currency}</p>
          )}
          {book.type === 'FREE' && <p className="text-sm text-emerald-400">{t.books.free}</p>}
        </div>
      </div>
    </Link>
  )
}
