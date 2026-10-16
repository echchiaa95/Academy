import { useEffect, useState } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useT, useLang } from '@/i18n'
import { useSite } from '@/contexts/SiteContext'
import { listComments, addComment } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Comment } from '@/types'

export function CommentsSection({ postId }: { postId: string }) {
  const t = useT()
  const { lang } = useLang()
  const { tenant } = useSite()
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    listComments(postId, tenant?.tenant_id).then(setComments)
  }, [postId, tenant?.tenant_id])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || content.trim().length < 2) { toast.error(t.comments.fillFields); return }
    setBusy(true)
    try {
      await addComment({ post_id: postId, tenant_id: tenant?.tenant_id, author_name: name.trim(), author_email: email.trim() || undefined, content: content.trim() })
      setSent(true); setName(''); setEmail(''); setContent('')
      toast.success(t.comments.submitted)
    } catch { toast.error(t.comments.failed) }
    finally { setBusy(false) }
  }

  return (
    <section className="mt-16 space-y-8">
      <h2 className="flex items-center gap-3 font-display text-2xl font-semibold">
        <MessageSquare className="size-5 gold-text" />
        {t.comments.title}
        {comments && comments.length > 0 && <span className="text-sm font-normal text-muted-foreground">({comments.length})</span>}
      </h2>

      {sent && (
        <p className="rounded-lg border border-[#c8a45c]/30 bg-[#c8a45c]/5 p-3 text-sm text-muted-foreground">{t.comments.pending}</p>
      )}

      <form onSubmit={submit} className="space-y-4 rounded-xl glass p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>{t.comments.name} *</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
          <div className="space-y-1.5"><Label>{t.comments.email}</Label><Input dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} /></div>
        </div>
        <div className="space-y-1.5">
          <Label>{t.comments.message} *</Label>
          <Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} maxLength={2000} placeholder={t.comments.placeholder} />
        </div>
        <Button type="submit" disabled={busy} className="bg-[#c8a45c] text-stone-900 hover:bg-[#d9b56e]">
          <Send className="size-4" /> {busy ? t.comments.sending : t.comments.send}
        </Button>
      </form>

      {comments && comments.length > 0 && (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl border border-border p-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-medium">{c.author_name}</span>
                <time className="text-xs text-muted-foreground">{formatDate(c.created_at, lang)}</time>
              </div>
              <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">{c.content}</p>
            </li>
          ))}
        </ul>
      )}
      {comments && comments.length === 0 && !sent && (
        <p className="text-sm text-muted-foreground">{t.comments.empty}</p>
      )}
    </section>
  )
}
