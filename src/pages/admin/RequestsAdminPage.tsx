import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useT, useLang } from '@/i18n'
import { listRequests, updateRequestStatus, deleteRequest } from '@/lib/api'
import { useAdminTenantId } from '@/hooks/useAdminTenant'
import { formatDate } from '@/lib/format'
import { ConfirmDelete } from '@/components/admin/ConfirmDelete'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { BookRequest, RequestStatus } from '@/types'

const statuses: RequestStatus[] = ['NEW', 'PROCESSING', 'COMPLETED', 'CANCELLED']

export default function RequestsAdminPage() {
  const t = useT()
  const { lang } = useLang()
  const [rows, setRows] = useState<BookRequest[] | null>(null)
  const [open, setOpen] = useState<BookRequest | null>(null)
  const tid = useAdminTenantId()
  const load = () => listRequests(tid).then(setRows).catch(() => setRows([]))
  useEffect(() => { load() }, [tid])

  async function setStatus(id: string, status: RequestStatus) {
    try { await updateRequestStatus(id, status); toast.success(t.admin.saved); load() }
    catch { toast.error(t.admin.saveError) }
  }
  async function remove(id: string) {
    try { await deleteRequest(id); toast.success(t.admin.deleted); load() }
    catch { toast.error(t.admin.saveError) }
  }

  const color: Record<RequestStatus, string> = {
    NEW: 'text-sky-400', PROCESSING: 'text-amber-400', COMPLETED: 'text-emerald-400', CANCELLED: 'text-muted-foreground',
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl gold-text">{t.admin.requests}</h1>
      {rows === null ? <p className="text-muted-foreground">{t.states.loading}</p> : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">{t.admin.requestsTable.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl glass">
          <table className="w-full min-w-[700px] text-sm">
            <thead><tr className="border-b border-border text-xs text-muted-foreground">
              {[t.admin.requestsTable.name, t.admin.requestsTable.book, t.admin.requestsTable.email, t.admin.requestsTable.phone, t.admin.requestsTable.date, t.admin.requestsTable.status, t.admin.actions].map((h) => <th key={h} className="p-3 text-start font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/40 last:border-0">
                  <td className="p-3"><button className="font-medium hover:text-[#c8a45c]" onClick={() => setOpen(r)}>{r.name}</button></td>
                  <td className="p-3 text-muted-foreground max-w-44"><span className="line-clamp-1">{r.book_title}</span></td>
                  <td className="p-3 text-muted-foreground" dir="ltr">{r.email}</td>
                  <td className="p-3 text-muted-foreground" dir="ltr">{r.phone}</td>
                  <td className="p-3 text-muted-foreground">{formatDate(r.created_at, lang)}</td>
                  <td className="p-3">
                    <Select value={r.status} onValueChange={(v) => setStatus(r.id, v as RequestStatus)}>
                      <SelectTrigger className={`h-8 w-36 text-xs ${color[r.status]}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{t.admin.status[s]}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="p-3"><ConfirmDelete message={t.admin.confirmDeleteRequest} onConfirm={() => remove(r.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={!!open} onOpenChange={() => setOpen(null)}>
        <DialogContent className="glass max-w-md">
          <DialogHeader><DialogTitle className="font-display text-2xl gold-text">{t.admin.requestsTable.open}</DialogTitle></DialogHeader>
          {open && (
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">{t.admin.requestsTable.name}: </span>{open.name}</p>
              <p><span className="text-muted-foreground">{t.admin.requestsTable.book}: </span>{open.book_title}</p>
              <p dir="ltr"><span className="text-muted-foreground">{t.admin.requestsTable.email}: </span>{open.email}</p>
              <p dir="ltr"><span className="text-muted-foreground">{t.admin.requestsTable.phone}: </span>{open.phone}</p>
              <p><span className="text-muted-foreground">{t.admin.requestsTable.date}: </span>{formatDate(open.created_at, lang)}</p>
              {open.message && <p className="rounded-lg bg-secondary/60 p-3 leading-7">{open.message}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
