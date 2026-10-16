// Domain settings (customer view) — full connection workflow for a domain the
// CUSTOMER owns: submit → TXT ownership proof → verify (server-side Edge
// Function) → DNS/HTTPS/activation status. Reuses the existing tenant_domains
// table (RLS: tenant admins manage their own rows), the verify-domain Edge
// Function (real server-side TXT lookup), and api.ts helpers.
// Activation is NEVER offered here: it requires the routing infrastructure
// (see workers/custom-domain-router/) and stays a platform-side decision.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAdminTenantId } from '@/hooks/useAdminTenant'
import { getTenantPublicUrl } from '@/lib/tenant-url'
import { getWhatsAppRegistrationUrl } from '@/config/contact'
import { addDomain, deleteDomain, verifyDomainDns } from '@/lib/api'
import { normalizeHostname, isValidHostname } from '@/lib/domain-utils'
import { useLang, useT } from '@/i18n'
import type { TenantDomain } from '@/types'
import { Globe, ShieldAlert, MessageCircle, Copy, Check, Trash2, RefreshCw, CheckCircle2, Circle } from 'lucide-react'

function CopyBtn({ text, label }: { text: string; label: string }) {
  const t = useT()
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) }
        catch { /* clipboard unavailable — user copies manually */ }
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#c8a45c]/40 px-3 py-1 text-xs gold-text hover:bg-[#c8a45c]/10 transition-colors"
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {done ? t.share.copied : label}
    </button>
  )
}

function StatusStep({ label, done }: { label: string; done: boolean }) {
  const t = useT()
  return (
    <div className="flex items-center gap-2">
      {done ? <CheckCircle2 className="size-4 text-emerald-400" /> : <Circle className="size-4 text-muted-foreground/50" />}
      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
      <span className={`text-xs ${done ? 'text-emerald-400' : 'text-muted-foreground/60'}`}>
        {done ? t.admin.stepDone : t.admin.stepPending}
      </span>
    </div>
  )
}

export default function CustomerDomainPage() {
  const t = useT()
  const { lang } = useLang()
  const tid = useAdminTenantId()
  const [domains, setDomains] = useState<TenantDomain[] | null>(null)
  const [slug, setSlug] = useState<string | null>(null)
  const [host, setHost] = useState('')
  const [busy, setBusy] = useState(false)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!tid || !supabase) return
    const [{ data: ten }, { data: doms }] = await Promise.all([
      supabase.from('tenants').select('slug').eq('id', tid).maybeSingle(),
      supabase.from('tenant_domains').select('*').eq('tenant_id', tid).order('created_at'),
    ])
    setSlug((ten as { slug: string } | null)?.slug ?? null)
    setDomains((doms as TenantDomain[] | null) ?? [])
  }, [tid])

  useEffect(() => { load() }, [load])

  const submit = async () => {
    if (!tid) return
    setMsg(null)
    const clean = normalizeHostname(host)
    if (!isValidHostname(clean)) { setMsg({ kind: 'err', text: t.admin.domainInvalid }); return }
    setBusy(true)
    try {
      await addDomain(tid, clean) // server-side unique index rejects duplicates
      setHost('')
      setMsg({ kind: 'ok', text: t.admin.domainAdded })
      await load()
    } catch (e) {
      const m = e instanceof Error ? e.message : ''
      setMsg({ kind: 'err', text: m.includes('duplicate') ? t.admin.domainDuplicate : m.includes('invalid') ? t.admin.domainInvalid : m })
    } finally { setBusy(false) }
  }

  const verify = async (d: TenantDomain) => {
    setVerifyingId(d.id); setMsg(null)
    const r = await verifyDomainDns(d) // REAL server-side TXT lookup — fails closed
    setVerifyingId(null)
    if (r === 'verified') { setMsg({ kind: 'ok', text: t.admin.verifyOk }); await load() }
    else if (r === 'mismatch') setMsg({ kind: 'err', text: t.admin.verifyFail })
    else setMsg({ kind: 'err', text: t.states.error })
  }

  const remove = async (id: string) => {
    await deleteDomain(id).catch(() => {})
    setConfirmId(null)
    await load()
  }

  const url = slug ? getTenantPublicUrl(slug) : null

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold gold-text">{t.admin.domainPage}</h1>
      </header>

      {/* current platform URL — always works, with or without a custom domain */}
      <section className="glass rounded-xl p-6 space-y-2">
        <p className="text-xs text-muted-foreground">{t.admin.domainCurrentUrl}</p>
        {url
          ? <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 break-all font-mono text-sm gold-text hover:underline" dir="ltr"><Globe className="size-4 shrink-0" />{url}</a>
          : <p className="text-sm text-muted-foreground">{t.states.loading}</p>}
      </section>

      {/* customer responsibilities */}
      <section className="glass rounded-xl p-6">
        <p className="font-semibold">{t.admin.respTitle}</p>
        <ul className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
          {t.admin.respItems.map((r, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-1.5 size-4 shrink-0 text-[#c8a45c]" /> {r}
            </li>
          ))}
        </ul>
      </section>

      {/* add domain */}
      <section className="glass rounded-xl p-6 space-y-4">
        <p className="font-semibold">{t.admin.domainAddTitle}</p>
        <p className="text-sm leading-7 text-muted-foreground">{t.admin.domainAddHint}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            dir="ltr"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="professor-name.com"
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-[#c8a45c]/60"
          />
          <button onClick={submit} disabled={busy || !host.trim()}
            className="rounded-full bg-[#c8a45c] px-6 py-2.5 text-sm font-semibold text-[#0c1124] transition-transform hover:scale-[1.03] disabled:opacity-50">
            {busy ? t.admin.domainAdding : t.admin.domainAddBtn}
          </button>
        </div>
        {msg && (
          <p className={`rounded-lg px-4 py-3 text-sm leading-6 ${msg.kind === 'ok' ? 'border border-emerald-400/30 bg-emerald-400/5 text-emerald-300' : 'border border-destructive/40 bg-destructive/10 text-destructive'}`}>
            {msg.text}
          </p>
        )}
      </section>

      {/* registered domains */}
      {domains && domains.length > 0 && (
        <section className="glass rounded-xl p-6 space-y-5">
          <p className="font-semibold">{t.admin.domainListTitle}</p>
          {domains.map((d) => {
            const owned = !!d.verified_at || d.status === 'verified' || d.status === 'active'
            const active = d.status === 'active'
            return (
              <div key={d.id} className="rounded-lg border border-border/60 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono text-sm" dir="ltr">{d.hostname}</p>
                  <span className="rounded-full border border-[#c8a45c]/40 px-3 py-0.5 text-xs gold-text">
                    {t.admin.domainStatus[d.status]}
                  </span>
                </div>

                {/* four separate, honest statuses */}
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <StatusStep label={t.admin.stepOwnership} done={owned} />
                  <StatusStep label={t.admin.stepDns} done={active} />
                  <StatusStep label={t.admin.stepHttps} done={active} />
                  <StatusStep label={t.admin.stepActivation} done={active} />
                </div>

                {d.status === 'pending' && (
                  <div className="rounded-lg bg-secondary/60 p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground">{t.admin.dnsTitle}</p>
                    <p className="text-xs text-muted-foreground">{t.admin.dnsHint}</p>
                    <div className="space-y-2 text-xs" dir="ltr">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-muted-foreground">TXT {t.admin.txtRecordName}:</span>
                        <code className="break-all rounded bg-background px-2 py-1">_academic-verification.{d.hostname}</code>
                        <CopyBtn text={`_academic-verification.${d.hostname}`} label={t.admin.copyName} />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-muted-foreground">TXT {t.admin.txtRecordValue}:</span>
                        <code className="break-all rounded bg-background px-2 py-1">{d.verification_token}</code>
                        <CopyBtn text={d.verification_token} label={t.admin.copyValue} />
                      </div>
                    </div>
                    <button onClick={() => verify(d)} disabled={verifyingId === d.id}
                      className="flex items-center gap-2 rounded-full bg-[#c8a45c] px-5 py-2 text-xs font-semibold text-[#0c1124] disabled:opacity-50">
                      <RefreshCw className={`size-3.5 ${verifyingId === d.id ? 'animate-spin' : ''}`} />
                      {verifyingId === d.id ? t.admin.verifyingDomain : t.admin.verifyOwnership}
                    </button>
                  </div>
                )}

                {owned && !active && (
                  <p className="text-xs leading-6 text-muted-foreground">{t.admin.cnameTitle}: {t.admin.cnamePending}</p>
                )}

                <div className="pt-1">
                  {confirmId === d.id ? (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{t.admin.confirmRemoveDomain}</span>
                      <button onClick={() => remove(d.id)} className="text-xs text-destructive underline underline-offset-4">{t.admin.delete}</button>
                      <button onClick={() => setConfirmId(null)} className="text-xs text-muted-foreground underline underline-offset-4">{t.admin.cancel}</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmId(d.id)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-3.5" /> {t.admin.removeDomain}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </section>
      )}

      {domains && domains.length === 0 && <p className="text-sm text-muted-foreground">{t.admin.domainNoneYet}</p>}

      {/* honest infrastructure note */}
      <section className="rounded-xl border border-amber-400/30 bg-amber-400/5 px-5 py-4">
        <p className="flex items-start gap-3 text-sm leading-7 text-amber-300">
          <ShieldAlert className="mt-1 size-4 shrink-0" />
          {t.admin.domainHostingNote}
        </p>
      </section>

      <section className="glass rounded-xl p-6">
        <p className="text-sm leading-7 text-muted-foreground">{t.admin.domainContactNote}</p>
        <a href={getWhatsAppRegistrationUrl(lang)} target="_blank" rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#c8a45c] px-5 py-2.5 text-sm font-semibold text-[#0c1124] transition-transform hover:scale-[1.03]">
          <MessageCircle className="size-4" /> WhatsApp
        </a>
      </section>
    </div>
  )
}
