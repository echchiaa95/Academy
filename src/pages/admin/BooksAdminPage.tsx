import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Plus, Pencil, Star, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@/i18n'
import { listBooks, deleteBook, upsertBook } from '@/lib/api'
import { useAdminTenantId } from '@/hooks/useAdminTenant'
import { Button } from '@/components/ui/button'
import { ConfirmDelete } from '@/components/admin/ConfirmDelete'
import { BookTypeBadge } from '@/components/books/BookCard'
import type { Book } from '@/types'

export default function BooksAdminPage() {
  const t = useT()
  const [books, setBooks] = useState<Book[] | null>(null)
  const tid = useAdminTenantId()
  const load = () => listBooks(tid).then(setBooks).catch(() => setBooks([]))
  useEffect(() => { load() }, [tid])

  async function toggle(b: Book, field: 'published' | 'featured') {
    try { await upsertBook({ id: b.id, tenant_id: tid, [field]: !b[field] }); toast.success(t.admin.saved); load() }
    catch { toast.error(t.admin.saveError) }
  }
  async function remove(id: string) {
    try { await deleteBook(id); toast.success(t.admin.deleted); load() }
    catch { toast.error(t.admin.saveError) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl gold-text">{t.admin.books}</h1>
        <Button asChild className="bg-[#c8a45c] text-stone-900 hover:bg-[#d9b56e]"><Link to="/admin/books/new"><Plus className="size-4" /> {t.admin.new}</Link></Button>
      </div>
      {books === null ? <p className="text-muted-foreground">{t.states.loading}</p> : books.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">{t.admin.empty}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((b) => (
            <div key={b.id} className="rounded-xl glass p-4 space-y-3">
              <div className="flex gap-3">
                {b.cover_url && <img src={b.cover_url} alt="" className="h-20 w-14 rounded object-cover" />}
                <div className="min-w-0 space-y-1">
                  <p className="font-medium line-clamp-2">{b.title}</p>
                  <p className="text-xs text-muted-foreground">{b.author}{b.year ? ` · ${b.year}` : ''}</p>
                  <BookTypeBadge type={b.type} />
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border/50 pt-2">
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className={b.published ? 'text-emerald-400' : 'text-muted-foreground'} onClick={() => toggle(b, 'published')} title={b.published ? t.admin.unpublish : t.admin.publish}><Globe className="size-4" /></Button>
                  <Button variant="ghost" size="icon" className={b.featured ? 'gold-text' : 'text-muted-foreground'} onClick={() => toggle(b, 'featured')} title={b.featured ? t.admin.unfeature : t.admin.feature}><Star className="size-4" fill={b.featured ? 'currentColor' : 'none'} /></Button>
                </div>
                <div className="flex gap-1">
                  <Button asChild variant="ghost" size="icon"><Link to={`/admin/books/${b.id}`}><Pencil className="size-4" /></Link></Button>
                  <ConfirmDelete message={t.admin.confirmDeleteBook} onConfirm={() => remove(b.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
