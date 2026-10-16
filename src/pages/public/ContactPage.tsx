import { ContactSection } from '@/components/home/ContactSection'
import { SocialIcons } from '@/components/SocialIcons'
import { useSite } from '@/contexts/SiteContext'
import { useSEO } from '@/hooks/useSEO'
import { useReveal } from '@/hooks/useReveal'
import { useT } from '@/i18n'

export default function ContactPage() {
  const t = useT()
  const { profile, loading } = useSite()
  useReveal([loading])
  useSEO({ title: t.contact.title, path: '/contact' })
  return (
    <main className="pt-20">
      <ContactSection />
      {profile && (
        <div className="mx-auto max-w-6xl px-5 pb-20 text-center reveal">
          <h2 className="font-display text-2xl mb-6">{t.sections.links}</h2>
          <SocialIcons profile={profile} size="size-6" />
        </div>
      )}
    </main>
  )
}
