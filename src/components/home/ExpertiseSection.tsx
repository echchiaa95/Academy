import { useT } from '@/i18n'
import { useSite } from '@/contexts/SiteContext'
import { SectionHeading } from './SectionHeading'

export function ExpertiseSection() {
  const t = useT()
  const { profile } = useSite()
  if (!profile?.interests?.length) return null
  return (
    <section className="border-y border-border/50 bg-card/40 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading title={t.sections.expertise} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {profile.interests.map((it, i) => (
            <div key={it} className="reveal group rounded-xl border border-border/60 p-6 transition-colors hover:border-[#c8a45c]/50" style={{ transitionDelay: `${i * 60}ms` }}>
              <span className="font-display text-3xl gold-text/60">{String(i + 1).padStart(2, '0')}</span>
              <p className="mt-3 font-medium leading-7">{it}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
