import { Link } from 'react-router'
import { useT } from '@/i18n'
import { useSite } from '@/contexts/SiteContext'
import { SectionHeading } from './SectionHeading'
import { Button } from '@/components/ui/button'

export function AboutSection() {
  const t = useT()
  const { profile } = useSite()
  if (!profile) return null
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <SectionHeading title={t.sections.about} />
      <div className="reveal grid gap-8 md:grid-cols-[2fr_1fr]">
        <p className="text-lg leading-9 text-foreground/85 first-letter:font-display first-letter:text-5xl first-letter:gold-text first-letter:me-2 first-letter:float-start">
          {profile.short_bio} {profile.long_bio?.split('\n')[0]}
        </p>
        <div className="space-y-4 rounded-xl glass p-6 text-sm">
          {profile.specialty && <div><p className="text-muted-foreground">{t.about.specialty}</p><p className="font-medium">{profile.specialty}</p></div>}
          {profile.institution && <div><p className="text-muted-foreground">{t.about.institution}</p><p className="font-medium">{profile.institution}</p></div>}
          {profile.field && <div><p className="text-muted-foreground">{t.about.field}</p><p className="font-medium">{profile.field}</p></div>}
          <Button asChild variant="link" className="gold-text px-0"><Link to="/about">{t.about.readBio} ←</Link></Button>
        </div>
      </div>
    </section>
  )
}
