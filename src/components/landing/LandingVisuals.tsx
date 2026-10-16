// Fictional product mockups for the marketing landing page.
// All data comes from t.landing.demo and is clearly labelled as a demo.
import { useT } from '@/i18n'

export type ShowcaseTab = 'profile' | 'research' | 'publications' | 'experience'

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('')
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#c8a45c]/40 bg-gradient-to-br from-[#1b2340] to-[#0c1124] font-display text-xl text-[#d9bc7f]">
      {initials}
    </div>
  )
}

/** The fictional academic profile, rendered inside device frames. */
export function MockProfile({ tab, compact = false }: { tab?: ShowcaseTab; compact?: boolean }) {
  const t = useT()
  const d = t.landing.demo
  const active = tab ?? 'profile'
  const show = (s: ShowcaseTab) => !tab || active === s

  return (
    <div className={`bg-[#faf7f0] text-[#1c2333] ${compact ? 'p-4 text-[11px] leading-relaxed' : 'p-6 sm:p-8 text-sm leading-relaxed'}`} dir="auto">
      <div className="flex items-center gap-4">
        <Avatar name={d.name} />
        <div className="min-w-0">
          <p className={`font-display font-semibold text-[#14203c] ${compact ? 'text-lg' : 'text-2xl'}`}>{d.name}</p>
          <p className="text-[#8a6d3b]">{d.role}</p>
          {!compact && <p className="text-[#1c2333]/60">{d.institution}</p>}
        </div>
      </div>

      {show('profile') && (
        <p className={`mt-4 text-[#1c2333]/80 ${compact ? 'line-clamp-3' : ''}`}>{d.bio}</p>
      )}

      {show('research') && (
        <div className="mt-4">
          <p className="font-display font-semibold text-[#14203c]">{d.interestsTitle}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {d.interests.map((i) => (
              <span key={i} className="rounded-full border border-[#c8a45c]/50 bg-[#c8a45c]/10 px-2.5 py-0.5 text-[#6b5424]">{i}</span>
            ))}
          </div>
        </div>
      )}

      {show('publications') && (
        <div className="mt-4">
          <p className="font-display font-semibold text-[#14203c]">{d.pubsTitle}</p>
          <ul className="mt-1.5 space-y-1 text-[#1c2333]/80">
            {(compact ? d.pubs.slice(0, 2) : d.pubs).map((p) => <li key={p} className="border-s-2 border-[#c8a45c]/60 ps-2.5">{p}</li>)}
          </ul>
        </div>
      )}

      {show('experience') && (
        <div className="mt-4">
          <p className="font-display font-semibold text-[#14203c]">{d.expTitle}</p>
          <ul className="mt-1.5 space-y-1 text-[#1c2333]/80">
            {d.exp.map((e) => <li key={e} className="border-s-2 border-[#c8a45c]/60 ps-2.5">{e}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Desktop browser chrome frame. */
export function BrowserFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-white/10 bg-[#10162b] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#e0655f]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e0b25f]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#5fe08a]" />
        <span className="mx-auto w-1/2 truncate rounded-md bg-white/5 px-3 py-1 text-center text-[11px] text-white/50" dir="ltr">
          academic-profile.example
        </span>
      </div>
      {children}
      <figcaption className="border-t border-white/10 px-4 py-2 text-center text-[11px] tracking-wide text-white/40">{label}</figcaption>
    </figure>
  )
}

/** Phone frame. */
export function PhoneFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <figure className="w-44 overflow-hidden rounded-[1.6rem] border border-white/15 bg-[#10162b] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.75)] sm:w-52">
      <div className="flex justify-center py-2"><span className="h-1.5 w-12 rounded-full bg-white/20" /></div>
      {children}
      <figcaption className="px-3 py-2 text-center text-[10px] tracking-wide text-white/40">{label}</figcaption>
    </figure>
  )
}
