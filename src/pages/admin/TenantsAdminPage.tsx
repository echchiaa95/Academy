import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Plus, Globe, Pencil, Ban, CheckCircle, ExternalLink, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { useT, useLang } from '@/i18n'
import { listTenants, updateTenant, deleteTenant, listDomains, resetClientPassword } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDelete } from '@/components/admin/ConfirmDelete'
import type { Tenant, TenantDomain } from '@/types'

export default function TenantsAdminPage() {
  const t = useT()
  const { lang } = useLang()
  const { setAdminTenantId } = useAuth()
  const [tenants, setTenants] = useState<Tenant[] | null>(null)
  const [domains, setDomains] = useState<TenantDomain[]>([])
  const [resetTarget, setResetTarget] = useState<Tenant | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  async function doResetPassword() {
    if (!resetTarget) return
    if (newPassword.length < 8) { toast.error(t.admin.passwordTooShort); return }
    setResetting(true)
    const res = await resetClientPassword(resetTarget.id, newPassword)
    setResetting(false)
    if (res.ok) { toast.success(t.admin.passwordResetDone); setResetTarget(null); setNewPassword('') }
    else toast.error(`${t.admin.passwordResetFailed}: ${res.error ?? ''}`)
  }
  const load = () => {
    listTenants().then(setTenants).catch(() => setTenants([]))
    listDomains().then(setDomains).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const primaryOf = (id: string) => domains.find((d) => d.tenant_id === id && d.is_primary)?.hostname
    ?? domains.find((d) => d.tenant_id === id)?.hostname ?? '—'

  async function toggleStatus(tn: Tenant) {
    const next = tn.status === 'active' ? 'suspended' : 'active'
    try { await updateTenant(tn.id, { status: next }); toast.success(t.admin.saved); load() }
    catch { toast.error(t.admin.saveError) }
  }
  async function remove(id: string) {
    try { await deleteTenant(id); toast.success(t.admin.deleted); load() }
    catch { toast.error(t.admin.saveError) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl gold-text">{t.admin.tenants}</h1>
        <Button asChild className="bg-[#c8a45c] text-stone-900 hover:bg-[#d9b56e]">
          <Link to="/admin/tenants/new"><Plus className="size-4" /> {t.admin.newTenant}</Link>
        </Button>
      </div>
      {tenants === null ? <p className="text-muted-foreground">{t.states.loading}</p> : tenants.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">{t.admin.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl glass">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="border-b border-border text-xs text-muted-foreground">
              {[t.admin.tenantName, 'Slug', t.admin.domains, t.admin.statusLabel, t.admin.created, t.admin.actions].map((h) => <th key={h} className="p-3 text-start font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {tenants.map((tn) => (
                <tr key={tn.id} className="border-b border-border/40 last:border-0">
                  <td className="p-3 font-medium">{tn.name}<span className="block text-xs text-muted-foreground" dir="ltr">{tn.owner_email}</span></td>
                  <td className="p-3 text-muted-foreground" dir="ltr">{tn.slug}</td>
                  <td className="p-3 text-muted-foreground" dir="ltr">{primaryOf(tn.id)}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${tn.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : tn.status === 'suspended' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-400'}`}>
                      {t.admin.tenantStatus[tn.status]}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{formatDate(tn.created_at, lang)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" title={t.admin.openTenant}
                        onClick={() => { setAdminTenantId(tn.id); toast.success(`${t.admin.managing} ${tn.name}`) }}>
                        <ExternalLink className="size-4" />
                      </Button>
                      <Button asChild variant="ghost" size="icon" title={t.admin.domains}>
                        <Link to={`/admin/tenants/${tn.id}/domains`}><Globe className="size-4" /></Link>
                      </Button>
                      <Button asChild variant="ghost" size="icon" title={t.admin.edit}>
                        <Link to={`/admin/tenants/${tn.id}`}><Pencil className="size-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" title={tn.status === 'active' ? t.admin.suspend : t.admin.activate}
                        className={tn.status === 'active' ? 'text-amber-400' : 'text-emerald-400'}
                        onClick={() => toggleStatus(tn)}>
                        {tn.status === 'active' ? <Ban className="size-4" /> : <CheckCircle className="size-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" title={t.admin.resetPassword}
                        onClick={() => { setResetTarget(tn); setNewPassword('') }}>
                        <KeyRound className="size-4" />
                      </Button>
                      <ConfirmDelete message={t.admin.confirmDeleteTenant} onConfirm={() => remove(tn.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* reset the CLIENT's password (superadmin) — via the reset-client-password
          Edge Function; the password never touches the database directly */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => { if (!o) setResetTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t.admin.resetPasswordFor}: {resetTarget?.name}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); doResetPassword() }}>
            <div className="space-y-1.5">
              <Label>{t.admin.newPassword}</Label>
              <Input dir="ltr" type="text" autoComplete="off" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} />
              {resetTarget?.owner_email && <p className="text-xs text-muted-foreground" dir="ltr">{resetTarget.owner_email}</p>}
            </div>
            <Button type="submit" disabled={resetting} className="w-full bg-[#c8a45c] text-stone-900 hover:bg-[#d9b56e]">
              <KeyRound className="size-4" /> {t.admin.resetPassword}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
