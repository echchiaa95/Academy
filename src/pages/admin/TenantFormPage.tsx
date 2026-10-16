import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useT } from '@/i18n'
import { createTenant, updateTenant, listTenants, createClientAccount } from '@/lib/api'
import { slugify } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Tenant } from '@/types'

export default function TenantFormPage() {
  const { id } = useParams()
  const isNew = !id
  const t = useT()
  const nav = useNavigate()
  const [form, setForm] = useState<Partial<Tenant>>({ name: '', slug: '', status: 'active', owner_email: '', primary_language: 'ar', country: '' })
  const [ownerPassword, setOwnerPassword] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (!isNew) listTenants().then((all) => { const tn = all.find((x) => x.id === id); if (tn) setForm(tn) }) }, [id])
  const set = (k: keyof Tenant, v: Tenant[keyof Tenant]) => setForm((f) => ({ ...f, [k]: v }))

  async function save() {
    if (!form.name || !form.owner_email) { toast.error(t.admin.form.title); return }
    setBusy(true)
    try {
      const slug = form.slug || slugify(form.name)
      if (isNew) {
        const tenantId = await createTenant({ ...form, slug })
        if (ownerPassword) {
          if (ownerPassword.length < 8) { toast.error(t.admin.passwordTooShort); setBusy(false); return }
          const res = await createClientAccount(tenantId, form.owner_email!.trim(), ownerPassword)
          if (res.ok) toast.success(res.linkedExisting ? t.admin.accountLinkedExisting : t.admin.accountCreated)
          else toast.error(`${t.admin.accountCreateFailed}: ${res.error ?? ''}`)
        } else {
          toast.success(t.admin.saved)
        }
      }
      else { await updateTenant(id!, { ...form, slug }); toast.success(t.admin.saved) }
      nav('/admin/tenants')
    } catch (e) {
      toast.error(String((e as Error)?.message ?? '').includes('duplicate') ? t.admin.slugTaken : t.admin.saveError)
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl gold-text">{isNew ? t.admin.newTenant : t.admin.edit}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => nav('/admin/tenants')}>{t.admin.back}</Button>
          <Button onClick={save} disabled={busy} className="bg-[#c8a45c] text-stone-900 hover:bg-[#d9b56e]">{busy ? t.admin.saving : t.admin.save}</Button>
        </div>
      </div>
      {isNew && <p className="rounded-lg border border-[#c8a45c]/30 bg-[#c8a45c]/5 p-3 text-sm leading-6 text-muted-foreground">{t.admin.inviteNote}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5"><Label>{t.admin.tenantName} *</Label><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Slug</Label><Input dir="ltr" value={form.slug ?? ''} onChange={(e) => set('slug', e.target.value)} placeholder={slugify(form.name ?? '')} /></div>
        <div className="space-y-1.5"><Label>{t.admin.ownerEmail} *</Label><Input dir="ltr" type="email" value={form.owner_email ?? ''} onChange={(e) => set('owner_email', e.target.value)} /></div>
        {isNew && (
          <div className="space-y-1.5">
            <Label>{t.admin.ownerPassword}</Label>
            <Input dir="ltr" type="password" autoComplete="new-password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="••••••••" />
            <p className="text-xs text-muted-foreground">{t.admin.ownerPasswordHint}</p>
          </div>
        )}
        <div className="space-y-1.5"><Label>{t.admin.country}</Label><Input value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>{t.admin.language}</Label>
          <Select value={form.primary_language} onValueChange={(v) => set('primary_language', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="ar">العربية</SelectItem><SelectItem value="fr">Français</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>{t.admin.statusLabel}</Label>
          <Select value={form.status} onValueChange={(v) => set('status', v as Tenant['status'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t.admin.tenantStatus.active}</SelectItem>
              <SelectItem value="pending">{t.admin.tenantStatus.pending}</SelectItem>
              <SelectItem value="suspended">{t.admin.tenantStatus.suspended}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
