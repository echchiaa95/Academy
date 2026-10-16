// Marketing landing page — cinematic, multilingual, conversion-oriented.
// Lives at #/welcome. All registration CTAs open WhatsApp via the centralized
// config; sign-in CTAs go to the EXISTING /admin login route.
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useLang, useT } from '@/i18n'
import { useReveal } from '@/hooks/useReveal'
import { getWhatsAppRegistrationUrl, WHATSAPP_DISPLAY } from '@/config/contact'
import { BrowserFrame, PhoneFrame, MockProfile, type ShowcaseTab } from '@/components/landing/LandingVisuals'
import { MessageCircle, ArrowDown, LogIn, CheckCircle2, FileText, LayoutPanelTop, Presentation, Share2 } from 'lucide-react'

/* ---------- shared bits ---------- */

function WhatsAppCta({ label, className = '' }: { label: string; className?: string }) {
  const { lang } = useLang()
  return (
    <a
      href={getWhatsAppRegistrationUrl(lang)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2.5 rounded-full bg-[#c8a45c] px-7 py-3.5 text-base font-semibold text-[#0c1124] shadow-[0_10px_40px_-10px_rgba(200,164,92,0.6)] transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a45c] ${className}`}
    >
      <MessageCircle className="h-5 w-5" aria-hidden />
      {label}
    </a>
  )
}

function LoginLink({ label, dark = true }: { label: string; dark?: boolean }) {
  return (
    <Link
      to="/admin"
      className={`inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline ${dark ? 'text-white/70 hover:text-white' : 'text-muted-foreground hover:text-foreground'}`}
    >
      <LogIn className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  )
}

function SectionHead({ children, dark = false, center = true }: { children: ReactNode; dark?: boolean; center?: boolean }) {
  return (
    <h2 className={`reveal font-display text-3xl font-semibold leading-snug sm:text-4xl lg:text-5xl ${center ? 'text-center' : ''} ${dark ? 'text-[#f3ead7]' : 'text-foreground'}`}>
      {children}
    </h2>
  )
}

/** Cinematic architectural backdrop: layered vault arches + ambient light. */
function Arches({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" aria-hidden className={`pointer-events-none absolute inset-x-0 bottom-0 h-full w-full ${className}`}>
      <defs>
        <linearGradient id="archGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8a45c" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#c8a45c" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => {
        const cx = 120 + i * 240
        return (
          <g key={i} opacity={0.5 - Math.abs(i - 2) * 0.12}>
            <path d={`M ${cx - 90} 600 L ${cx - 90} 260 Q ${cx} 120 ${cx + 90} 260 L ${cx + 90} 600`} fill="none" stroke="#c8a45c" strokeOpacity="0.22" strokeWidth="1.5" />
            <path d={`M ${cx - 90} 600 L ${cx - 90} 260 Q ${cx} 120 ${cx + 90} 260 L ${cx + 90} 600`} fill="url(#archGlow)" opacity="0.25" />
          </g>
        )
      })}
    </svg>
  )
}

/* ---------- 03 · hero ---------- */

function Hero() {
  const t = useT()
  const L = t.landing
  const scrollToDemo = () => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <section className="relative isolate overflow-hidden bg-[#0a0f22] text-white">
      {/* ambient light + architecture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(200,164,92,0.16),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_40%_at_85%_110%,rgba(46,86,180,0.14),transparent_70%)]" />
      <Arches className="lp-hero-late opacity-0" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0a0f22] to-transparent" />

      <div className="relative mx-auto flex min-h-[92svh] max-w-5xl flex-col items-center justify-center px-5 py-24 text-center">
        <p className="lp-hero-1 opacity-0 text-xs font-semibold tracking-[0.35em] text-[#c8a45c] sm:text-sm">{L.eyebrow}</p>
        <h1 className="lp-hero-2 mt-6 font-display text-4xl font-semibold leading-[1.15] sm:text-6xl lg:text-7xl">
          <span className="block text-[#f3ead7]">{L.h1a}</span>
          <span className="block text-[#c8a45c]">{L.h1b}</span>
        </h1>
        <p className="lp-hero-3 mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">{L.sub}</p>

        <div className="lp-hero-4 mt-10 flex flex-col items-center gap-5">
          <WhatsAppCta label={L.ctaPrimary} />
          <p className="text-xs text-white/50">{L.ctaNote}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <button type="button" onClick={scrollToDemo} className="inline-flex items-center gap-2 text-sm text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline">
              {L.ctaSecondary}
              <ArrowDown className="h-4 w-4" aria-hidden />
            </button>
            <LoginLink label={L.login} />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- 04 · product reveal ---------- */

function ProductReveal() {
  const t = useT()
  const L = t.landing
  return (
    <section id="demo" className="relative overflow-hidden bg-[#0c1226] py-24 text-white sm:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_0%,rgba(200,164,92,0.1),transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-5">
        <div className="reveal relative mx-auto max-w-3xl [perspective:1400px]">
          <div className="transition-transform duration-700 [transform:rotateX(4deg)] hover:[transform:rotateX(0deg)] motion-reduce:transform-none">
            <BrowserFrame label={L.demo.label}>
              <MockProfile />
            </BrowserFrame>
          </div>
          <div className="absolute -bottom-14 -end-3 hidden sm:block lg:-end-16">
            <div className="reveal transition-transform duration-700 [transform:rotate(-3deg)] hover:[transform:rotate(0deg)] motion-reduce:transform-none">
              <PhoneFrame label={L.demo.label}>
                <MockProfile compact />
              </PhoneFrame>
            </div>
          </div>
        </div>
        {/* phone stacked below on small screens */}
        <div className="mt-10 flex justify-center sm:hidden">
          <PhoneFrame label={L.demo.label}>
            <MockProfile compact />
          </PhoneFrame>
        </div>
      </div>
    </section>
  )
}

/* ---------- 05 · curiosity gap ---------- */

function Curiosity() {
  const t = useT()
  const L = t.landing.curiosity
  return (
    <section className="bg-[#f7f3ea] py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-5">
        <SectionHead center>
          <span className="block">{L.h2a}</span>
          <span className="block text-[#8a6d3b]">{L.h2b}</span>
        </SectionHead>

        <ul className="mx-auto mt-12 max-w-2xl space-y-4">
          {L.situations.map((s, i) => (
            <li key={i} className="reveal flex items-start gap-4 border-s-2 border-[#c8a45c] ps-5 text-lg leading-8 text-[#1c2333]/85">
              <span className="mt-1 font-display text-2xl font-semibold text-[#c8a45c]">{String(i + 1).padStart(2, '0')}</span>
              {s}
            </li>
          ))}
        </ul>

        {/* before / after */}
        <div className="mt-16 grid gap-6 md:grid-cols-2">
          <div className="reveal rounded-2xl border border-[#1c2333]/10 bg-white/60 p-8">
            <p className="text-xs font-semibold tracking-[0.3em] text-[#1c2333]/50">{L.beforeTitle}</p>
            <div className="mt-5 space-y-2.5 opacity-70">
              <div className="flex items-center gap-3"><FileText className="h-4 w-4 shrink-0 text-[#1c2333]/40" aria-hidden /><div className="h-2.5 w-3/4 rounded bg-[#1c2333]/15" /></div>
              <div className="flex items-center gap-3 ps-6"><FileText className="h-4 w-4 shrink-0 text-[#1c2333]/40" aria-hidden /><div className="h-2.5 w-1/2 rounded bg-[#1c2333]/15" /></div>
              <div className="flex items-center gap-3"><FileText className="h-4 w-4 shrink-0 text-[#1c2333]/40" aria-hidden /><div className="h-2.5 w-2/3 rounded bg-[#1c2333]/15" /></div>
              <div className="flex items-center gap-3 ps-10"><FileText className="h-4 w-4 shrink-0 text-[#1c2333]/40" aria-hidden /><div className="h-2.5 w-2/5 rounded bg-[#1c2333]/15" /></div>
            </div>
            <p className="mt-5 leading-7 text-[#1c2333]/70">{L.beforeDesc}</p>
          </div>
          <div className="reveal overflow-hidden rounded-2xl border border-[#c8a45c]/40 bg-white shadow-[0_25px_60px_-20px_rgba(28,35,51,0.25)]">
            <p className="bg-[#14203c] px-8 py-3 text-xs font-semibold tracking-[0.3em] text-[#c8a45c]">{L.afterTitle}</p>
            <MockProfile compact />
          </div>
        </div>

        <p className="reveal mx-auto mt-12 max-w-2xl text-center text-lg leading-8 text-[#1c2333]/75">{L.conclusion}</p>
      </div>
    </section>
  )
}

/* ---------- 06 · problem & solution ---------- */

function ProblemSolution() {
  const t = useT()
  const L = t.landing.problem
  return (
    <section className="relative overflow-hidden bg-[#0a0f22] py-24 text-white sm:py-32">
      <Arches className="opacity-40" />
      <div className="relative mx-auto max-w-5xl px-5">
        <SectionHead dark>{L.h2}</SectionHead>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {L.items.map((it, i) => (
            <div key={i} className="reveal border-t border-[#c8a45c]/30 pt-6">
              <p className="font-display text-5xl font-semibold text-[#c8a45c]/30">{String(i + 1).padStart(2, '0')}</p>
              <p className="mt-3 text-lg font-semibold text-[#f3ead7]">{it.t}</p>
              <p className="mt-2 leading-7 text-white/65">{it.d}</p>
            </div>
          ))}
        </div>
        <div className="reveal mx-auto mt-20 max-w-3xl border border-[#c8a45c]/30 bg-[#10162b]/80 p-8 text-center sm:p-12">
          <p className="font-display text-2xl font-semibold text-[#c8a45c] sm:text-3xl">{L.solutionTitle}</p>
          <p className="mt-4 leading-8 text-white/70">{L.solutionDesc}</p>
          <div className="mt-8"><WhatsAppCta label={t.landing.ctaPrimary} /></div>
        </div>
      </div>
    </section>
  )
}

/* ---------- 07 · transformation ---------- */

function Transformation() {
  const t = useT()
  const L = t.landing.transform
  const icons = [FileText, LayoutPanelTop, Presentation, Share2]
  return (
    <section className="bg-[#f7f3ea] py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-5">
        <SectionHead>{L.h2}</SectionHead>
        <ol className="mx-auto mt-16 flex max-w-4xl flex-col items-stretch gap-0 sm:flex-row sm:items-start">
          {L.steps.map((s, i) => {
            const Icon = icons[i]
            return (
              <li key={i} className="reveal relative flex flex-1 flex-col items-center text-center" style={{ transitionDelay: `${i * 150}ms` }}>
                <div className={`flex h-16 w-16 items-center justify-center rounded-full border ${i === 3 ? 'border-[#c8a45c] bg-[#14203c] text-[#c8a45c]' : 'border-[#1c2333]/15 bg-white text-[#1c2333]/70'}`}>
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <p className={`mt-4 max-w-[12rem] text-sm font-semibold leading-6 ${i === 3 ? 'text-[#8a6d3b]' : 'text-[#1c2333]/75'}`}>{s}</p>
                {i < L.steps.length - 1 && (
                  <span aria-hidden className="my-4 h-8 w-px bg-gradient-to-b from-[#c8a45c]/60 to-transparent sm:absolute sm:start-[calc(50%+3rem)] sm:top-8 sm:my-0 sm:h-px sm:w-[calc(100%-6rem)] sm:bg-gradient-to-r sm:from-[#c8a45c]/60 sm:to-[#c8a45c]/10 rtl:sm:bg-gradient-to-l" />
                )}
              </li>
            )
          })}
        </ol>
        <p className="reveal mx-auto mt-12 max-w-xl text-center text-xs leading-6 text-[#1c2333]/50">{L.note}</p>
      </div>
    </section>
  )
}

/* ---------- 08 · interactive showcase ---------- */

function Showcase() {
  const t = useT()
  const L = t.landing.showcase
  const [tab, setTab] = useState<ShowcaseTab>('profile')
  const tabs: ShowcaseTab[] = ['profile', 'research', 'publications', 'experience']
  return (
    <section className="bg-[#0c1226] py-24 text-white sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead dark>{L.h2}</SectionHead>
        <div role="tablist" aria-label={L.h2} className="reveal mt-12 flex flex-wrap justify-center gap-2">
          {tabs.map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors ${tab === k ? 'border-[#c8a45c] bg-[#c8a45c] text-[#0c1124]' : 'border-white/15 text-white/65 hover:border-[#c8a45c]/50 hover:text-white'}`}
            >
              {L.tabs[k]}
            </button>
          ))}
        </div>
        <div className="reveal mx-auto mt-12 grid max-w-4xl items-start gap-10 sm:grid-cols-[1fr_auto]">
          <BrowserFrame label={t.landing.demo.label}>
            <MockProfile tab={tab} />
          </BrowserFrame>
          <div className="mx-auto">
            <PhoneFrame label={t.landing.demo.label}>
              <MockProfile tab={tab} compact />
            </PhoneFrame>
          </div>
        </div>
        <p className="reveal mx-auto mt-10 max-w-xl text-center text-xs leading-6 text-white/40">{L.demoNote}</p>
        <div className="reveal mt-10 text-center"><WhatsAppCta label={t.landing.ctaPrimary} /></div>
      </div>
    </section>
  )
}

/* ---------- 09 · benefit-driven features ---------- */

function Features() {
  const t = useT()
  const L = t.landing.features
  return (
    <section id="features" className="bg-[#f7f3ea] py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead>{L.h2}</SectionHead>
        <div className="mt-14 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {L.items.map((f, i) => (
            <div key={i} className="reveal border-t-2 border-[#c8a45c] pt-6">
              <p className="text-lg font-semibold leading-7 text-[#14203c]">{f.t}</p>
              <p className="mt-3 leading-7 text-[#1c2333]/65">{f.d}</p>
            </div>
          ))}
        </div>
        <div className="reveal mt-16 text-center"><WhatsAppCta label={t.landing.ctaPrimary} /></div>
      </div>
    </section>
  )
}

/* ---------- 10 · audiences ---------- */

function Audiences() {
  const t = useT()
  const L = t.landing.audiences
  return (
    <section className="relative overflow-hidden bg-[#0a0f22] py-24 text-white sm:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_10%_10%,rgba(46,86,180,0.12),transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-5">
        <SectionHead dark>{L.h2}</SectionHead>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
          {L.items.map((a, i) => (
            <div key={i} className={`reveal p-8 sm:p-10 ${i % 2 === 0 ? 'bg-[#0e1430]' : 'bg-[#111a3c]'}`}>
              <p className="font-display text-sm tracking-[0.3em] text-[#c8a45c]/70">{String(i + 1).padStart(2, '0')}</p>
              <p className="mt-3 font-display text-2xl font-semibold text-[#f3ead7]">{a.t}</p>
              <p className="mt-3 leading-8 text-white/65">{a.d}</p>
            </div>
          ))}
        </div>
        <div className="reveal mt-14 text-center"><WhatsAppCta label={t.landing.ctaPrimary} /></div>
      </div>
    </section>
  )
}

/* ---------- 11 · editorial storytelling ---------- */

function Story() {
  const t = useT()
  const L = t.landing.story
  return (
    <section className="bg-[#f7f3ea] py-28 sm:py-36">
      <div className="mx-auto max-w-4xl px-5 text-center">
        <SectionHead>
          <span className="block">{L.h2a}</span>
          <span className="block text-[#8a6d3b]">{L.h2b}</span>
        </SectionHead>
        <div className="mx-auto mt-16 max-w-2xl space-y-6">
          {L.lines.map((line, i) => (
            <p key={i} className="reveal font-display text-2xl font-medium leading-snug text-[#1c2333]/85 sm:text-4xl" style={{ transitionDelay: `${i * 120}ms` }}>
              {line}
            </p>
          ))}
        </div>
        <p className="reveal mx-auto mt-16 max-w-xl text-lg leading-9 text-[#1c2333]/70">{L.conclusion}</p>
      </div>
    </section>
  )
}

/* ---------- 12 · objection handling: manual onboarding steps ---------- */

function Steps() {
  const t = useT()
  const L = t.landing.steps
  return (
    <section id="steps" className="bg-[#0c1226] py-24 text-white sm:py-32">
      <div className="mx-auto max-w-5xl px-5">
        <SectionHead dark>{L.h2}</SectionHead>
        <ol className="mx-auto mt-16 max-w-3xl space-y-0">
          {L.items.map((s, i) => (
            <li key={i} className="reveal relative flex gap-6 pb-12 last:pb-0">
              {i < L.items.length - 1 && <span aria-hidden className="absolute start-[1.35rem] top-14 h-[calc(100%-3.5rem)] w-px bg-gradient-to-b from-[#c8a45c]/50 to-transparent" />}
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#c8a45c]/60 font-display text-lg font-semibold text-[#c8a45c]">{i + 1}</span>
              <div>
                <p className="text-lg font-semibold text-[#f3ead7]">{s.t}</p>
                <p className="mt-1.5 leading-7 text-white/60">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="reveal mx-auto mt-10 max-w-xl text-center text-sm leading-7 text-[#c8a45c]/80">{L.note}</p>
        <div className="reveal mt-10 text-center"><WhatsAppCta label={L.cta} /></div>
      </div>
    </section>
  )
}

/* ---------- 13 · trust without fabrication ---------- */

function Trust() {
  const t = useT()
  const L = t.landing.trust
  return (
    <section className="bg-[#f7f3ea] py-24 sm:py-28">
      <div className="mx-auto max-w-5xl px-5">
        <SectionHead>{L.h2}</SectionHead>
        <ul className="mx-auto mt-12 grid max-w-4xl gap-x-10 gap-y-5 sm:grid-cols-2">
          {L.items.map((item, i) => (
            <li key={i} className="reveal flex items-center gap-3 text-lg text-[#1c2333]/80">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#8a6d3b]" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ---------- 14 · risk & transparency ---------- */

function Transparency() {
  const t = useT()
  const L = t.landing.transparency
  return (
    <section className="bg-[#efe9db] py-24 sm:py-28">
      <div className="mx-auto max-w-3xl px-5">
        <SectionHead>{L.h2}</SectionHead>
        <ul className="mt-12 space-y-4">
          {L.items.map((item, i) => (
            <li key={i} className="reveal flex items-start gap-4 border-s-2 border-[#c8a45c]/60 ps-5 leading-8 text-[#1c2333]/80">{item}</li>
          ))}
        </ul>
        <p className="reveal mt-8 rounded-xl border border-[#8a6d3b]/25 bg-[#c8a45c]/10 px-6 py-4 text-sm leading-7 text-[#6b5424]">{L.pricingNote}</p>
      </div>
    </section>
  )
}

/* ---------- 12b · custom domains (honest roadmap) ---------- */

function DomainsSection() {
  const t = useT()
  const L = t.landing.domainsSection
  return (
    <section id="domains" className="relative overflow-hidden bg-[#0a0f22] py-24 text-white sm:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_40%_at_90%_0%,rgba(46,86,180,0.12),transparent_70%)]" />
      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <SectionHead dark>{L.h2}</SectionHead>
        <p className="reveal mx-auto mt-8 max-w-2xl text-lg leading-9 text-white/70">{L.desc}</p>
        <p className="reveal mx-auto mt-8 max-w-2xl rounded-xl border border-[#c8a45c]/25 bg-[#c8a45c]/5 px-6 py-4 text-sm leading-7 text-[#c8a45c]/85">{L.note}</p>
      </div>
    </section>
  )
}

/* ---------- 15/16 · FAQ + CTA ---------- */

function Faq() {
  const t = useT()
  const L = t.landing.faq
  return (
    <section id="faq" className="bg-[#f7f3ea] py-24 sm:py-28">
      <div className="mx-auto max-w-3xl px-5">
        <SectionHead>{L.h2}</SectionHead>
        <div className="mt-12 space-y-3">
          {L.items.map((f, i) => (
            <details key={i} className="reveal group rounded-xl border border-[#1c2333]/10 bg-white/70 px-6 py-4 open:border-[#c8a45c]/50">
              <summary className="cursor-pointer list-none text-lg font-semibold text-[#14203c] marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="inline-block">{f.q}</span>
                <span aria-hidden className="float-end text-[#c8a45c] transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-8 text-[#1c2333]/70">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="reveal mt-12 text-center"><WhatsAppCta label={t.landing.ctaPrimary} /></div>
      </div>
    </section>
  )
}

/* ---------- 21 · final conversion ---------- */

function FinalCta() {
  const t = useT()
  const L = t.landing.final
  return (
    <section className="relative isolate overflow-hidden bg-[#0a0f22] py-28 text-white sm:py-36">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_50%_at_50%_115%,rgba(200,164,92,0.18),transparent_70%)]" />
      <Arches className="opacity-50" />
      <div className="relative mx-auto max-w-4xl px-5 text-center">
        <h2 className="reveal font-display text-4xl font-semibold leading-tight sm:text-6xl">
          <span className="block text-[#f3ead7]">{L.h2a}</span>
          <span className="block text-[#f3ead7]">{L.h2b}</span>
          <span className="block text-[#c8a45c]">{L.h2c}</span>
        </h2>
        <p className="reveal mx-auto mt-8 max-w-2xl text-lg leading-9 text-white/70">{L.sub}</p>
        <div className="reveal mt-12 flex flex-col items-center gap-5">
          <WhatsAppCta label={t.landing.ctaPrimary} className="px-9 py-4 text-lg" />
          <p className="text-xs text-white/50">{L.note} · <span dir="ltr">{WHATSAPP_DISPLAY}</span></p>
          <LoginLink label={t.landing.login} />
        </div>
      </div>
    </section>
  )
}

/* ---------- page ---------- */

export default function LandingPage() {
  const t = useT()
  const { lang } = useLang()
  useReveal([])

  // SEO: page-local title/description, restored on leave
  useEffect(() => {
    const prevTitle = document.title
    const metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const prevDesc = metaDesc?.content ?? ''
    document.title = t.landing.metaTitle
    metaDesc?.setAttribute('content', t.landing.metaDesc)
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')
    const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]')
    const prevOgT = ogTitle?.content ?? ''
    const prevOgD = ogDesc?.content ?? ''
    ogTitle?.setAttribute('content', t.landing.metaTitle)
    ogDesc?.setAttribute('content', t.landing.metaDesc)
    return () => {
      document.title = prevTitle
      metaDesc?.setAttribute('content', prevDesc)
      ogTitle?.setAttribute('content', prevOgT)
      ogDesc?.setAttribute('content', prevOgD)
    }
  }, [t, lang])

  return (
    <main className="landing-page">
      <Hero />
      <ProductReveal />
      <Curiosity />
      <ProblemSolution />
      <Transformation />
      <Showcase />
      <Features />
      <Audiences />
      <Story />
      <Steps />
      <Trust />
      <Transparency />
      <DomainsSection />
      <Faq />
      <FinalCta />
    </main>
  )
}
