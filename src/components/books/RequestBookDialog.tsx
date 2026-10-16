import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useT } from '@/i18n'
import { createBookRequest } from '@/lib/api'
import type { Book } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export function RequestBookDialog({ book, open, onOpenChange }: { book: Book; open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useT()
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', website: '' })
  const [sending, setSending] = useState(false)
  const [openedAt, setOpenedAt] = useState(0)

  // --- lightweight anti-spam (no paid services): honeypot + throttle + validation
  useEffect(() => { if (open) setOpenedAt(Date.now()) }, [open])
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)
  const phoneOk = form.phone.replace(/[^\d+]/g, '').length >= 7

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    // honeypot: bots fill hidden fields; humans never see it
    if (form.website) { onOpenChange(false); return }
    // throttle: one request per minute per browser, and at least 3s to fill the form
    const last = Number(localStorage.getItem('last_book_request') || 0)
    if (Date.now() - last < 60_000 || Date.now() - openedAt < 3_000) { toast.error(t.request.error); return }
    if (!form.name.trim() || !emailOk || !phoneOk) { toast.error(t.request.error); return }
    setSending(true)
    try {
      const { website: _honeypot, ...payload } = form
      await createBookRequest({ book_id: book.id, tenant_id: book.tenant_id, ...payload })
      localStorage.setItem('last_book_request', String(Date.now()))
      toast.success(t.request.success)
      setForm({ name: '', email: '', phone: '', message: '', website: '' })
      onOpenChange(false)
    } catch {
      toast.error(t.request.error)
    } finally { setSending(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl gold-text">{t.request.title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">{book.title}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          {/* honeypot — invisible to humans, bots fill it and get silently dropped */}
          <input type="text" name="website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
            tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
          <div className="space-y-1.5">
            <Label>{t.request.name} *</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{t.request.email} *</Label>
            <Input required type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{t.request.phone} *</Label>
            <Input required dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{t.request.message}</Label>
            <Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </div>
          <Button type="submit" disabled={sending} className="w-full bg-[#c8a45c] text-stone-900 hover:bg-[#d9b56e]">
            {sending ? t.request.sending : t.request.submit}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
