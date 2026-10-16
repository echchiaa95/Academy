import { useT } from '@/i18n'
import { useSite } from '@/contexts/SiteContext'
import { SectionHeading } from './SectionHeading'
import { SocialIcons } from '@/components/SocialIcons'

export function LinksSection() {
  const t = useT()
  const { profile } = useSite()
  if (!profile) return null
  return (
    <section id="links" className="mx-auto max-w-6xl px-5 py-20 scroll-mt-24">
      <SectionHeading title={t.sections.links} />
      <div className="reveal"><SocialIcons profile={profile} size="size-6" /></div>
    </section>
  )
}
