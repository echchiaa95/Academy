import { useState } from 'react'
import { Download, ShoppingBag, Send, Eye, Loader2 } from 'lucide-react'
import { useT } from '@/i18n'
import { useSite } from '@/contexts/SiteContext'
import { getBookPdfUrl } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { RequestBookDialog } from './RequestBookDialog'
import type { Book } from '@/types'

export function BookActions({ book }: { book: Book }) {
  const t = useT()
  const { tenant } = useSite()
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Free books: eligibility is re-validated server-side (get_book_download),
  // then a short-lived signed URL is minted from the private bucket.
  // Paid/request books never expose a PDF link.
  async function downloadFree() {
    setDownloading(true)
    const url = await getBookPdfUrl(book, tenant?.tenant_id)
    setDownloading(false)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-wrap gap-3">
      {book.type === 'FREE' && book.pdf_url && (
        <Button onClick={downloadFree} disabled={downloading} className="bg-[#c8a45c] text-stone-900 hover:bg-[#d9b56e]">
          {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} {t.books.download}
        </Button>
      )}
      {book.type === 'FREE' && !book.pdf_url && null}
      {book.type === 'PAID' && (
        <Button onClick={() => setOpen(true)} className="bg-[#c8a45c] text-stone-900 hover:bg-[#d9b56e]">
          <ShoppingBag className="size-4" /> {t.books.buy}
        </Button>
      )}
      {book.type === 'REQUEST' && (
        <Button onClick={() => setOpen(true)} className="bg-[#c8a45c] text-stone-900 hover:bg-[#d9b56e]">
          <Send className="size-4" /> {t.books.request}
        </Button>
      )}
      {book.preview_url && (
        <Button asChild variant="outline" className="border-border">
          <a href={book.preview_url} target="_blank" rel="noopener noreferrer"><Eye className="size-4" /> {t.books.preview}</a>
        </Button>
      )}
      <RequestBookDialog book={book} open={open} onOpenChange={setOpen} />
    </div>
  )
}
