import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Plus, ShieldCheck, Star, Power, Loader2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { useT, useLang } from '@/i18n'
import { listDomains, addDomain, deleteDomain, setDomainStatus, setPrimaryDomain, verifyDomainDns } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDelete } from '@/components/admin/ConfirmDelete'
import type { TenantDomain } from '@/types'

export default function TenantDomainsPage() {
  const { id } = useParams()
  const t = useT()
  const { lang } = useLang()
  const nav = useNavigate()
  const [domains, setDomains] = useState<TenantDomain[] | null>(null)
  const [host, setHost] = useState('')
  const [busy, setBusy] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  const load = () => listDomains(id!).then(setDomains).catch(() => setDomains([]))
  useEffect(() => { load() }, [id])

  async function add() {
    if (!host.trim()) return
    setBusy(true)
    try { await addDomain(id!, host); setHost(''); toast.success(t.admin.saved); load() }
    catch { toast.error(t.admin.saveError) }
    finally { setBusy(false) }
  }

  async function verify(d: TenantDomain) {
    setVerifying(d.id)
    const r = await verifyDomainDns(d)
    setVerifying(null)
    if (r === 'verified') { toast.success(t.admin.verifyOk); load() }
    else if (r === 'mismatch') toast.error(t.admin.verifyFail)
    else toast.error(t.admin.verifyErr)
  }

  const badge = (s: TenantDomain['status']) => ({
    pending: 'bg-amber-500/10 text-amber-400', verified: 'bg-sky-500/10 text-sky-400',
    active: 'bg-emerald-500/10 text-emerald-400', disabled: 'bg-secondary text-muted-foreground',
  }[s])

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl gold-text">{t.admin.domains}</h1>
        <Button variant="outline" onClick={() => nav('/admin/tenants')}>{t.admin.back}</Button>
      </div>
      <div className="flex gap-2">
        <Input dir="ltr" placeholder="professor-name.com" value={host} onChange={(e) => setHost(e.target.value)} />
        <Button onClick={add} disabled={busy} className="bg-[#c8a45c] text-stone-900 hover:bg-[#d9b56e] shrink-0"><Plus className="size-4" /> {t.admin.addDomain}</Button>
      </div>
      {domains === null ? <p className="text-muted-foreground">{t.states.loading}</p> : domains.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">{t.admin.empty}</p>
      ) : domains.map((d) => (
        <div key={d.id} className="rounded-xl glass p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-medium" dir="ltr">{d.hostname}</span>
              {d.is_primary && <span className="rounded-full bg-[#c8a45c]/15 px-2 py-0.5 text-[11px] gold-text">{t.admin.primary}</span>}
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${badge(d.status)}`}>{t.admin.domainStatus[d.status]}</span>
            </div>
            <div className="flex items-center gap-1">
              {(d.status === 'pending' || d.status === 'disabled') && (
                <Button variant="outline" size="sm" disabled={verifying === d.id} onClick={() => verify(d)}>
                  {verifying === d.id ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} {t.admin.verify}
                </Button>
              )}
              {d.status === 'verified' && (
                <Button variant="outline" size="sm" onClick={async () => { await setDomainStatus(d.id, 'active'); load() }}>{t.admin.activate}</Button>
              )}
              {d.status === 'active' && (<>
                {!d.is_primary && <Button variant="outline" size="sm" onClick={async () => { await setPrimaryDomain(d); load() }}><Star className="size-4" /> {t.admin.setPrimary}</Button>}
                <Button variant="outline" size="sm" onClick={async () => { await setDomainStatus(d.id, 'disabled'); load() }}><Power className="size-4" /> {t.admin.disable}</Button>
              </>)}
              <ConfirmDelete message={t.admin.confirmDeleteRequest} onConfirm={async () => { await deleteDomain(d.id); load() }} />
            </div>
          </div>
          {d.status === 'pending' && (
            <div className="rounded-lg bg-secondary/50 p-4 space-y-2 text-sm">
              <p className="font-medium gold-text">{t.admin.dnsTitle}</p>
              <p className="text-muted-foreground">{t.admin.dnsHint}</p>
              <div className="grid gap-1 font-mono text-xs" dir="ltr">
                <p>Type: <span className="text-foreground">TXT</span></p>
                <p className="flex items-center gap-2">Name: <span className="text-foreground">_academic-verification.{d.hostname}</span>
                  <button onClick={() => { navigator.clipboard.writeText(`_academic-verification.${d.hostname}`); toast.success('✓') }}><Copy className="size-3.5" /></button></p>
                <p className="flex items-center gap-2 break-all">Value: <span className="text-foreground">{d.verification_token}</span>
                  <button onClick={() => { navigator.clipboard.writeText(d.verification_token); toast.success('✓') }}><Copy className="size-3.5" /></button></p>
              </div>
              <p className="text-xs text-muted-foreground">{t.admin.dnsNote}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{formatDate(d.created_at, lang)}{d.verified_at ? ` · ${t.admin.verified} ${formatDate(d.verified_at, lang)}` : ''}</p>
        </div>
      ))}
    </div>
  )
}
