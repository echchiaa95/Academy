import { Hero } from '@/components/home/Hero'
import { AboutSection } from '@/components/home/AboutSection'
import { ExpertiseSection } from '@/components/home/ExpertiseSection'
import { FeaturedPostsSection } from '@/components/home/FeaturedPostsSection'
import { BooksSection } from '@/components/home/BooksSection'
import { LinksSection } from '@/components/home/LinksSection'
import { ContactSection } from '@/components/home/ContactSection'
import { useSite } from '@/contexts/SiteContext'
import { useSEO, pageUrl } from '@/hooks/useSEO'
import { useReveal } from '@/hooks/useReveal'
import { useLang } from '@/i18n'

export default function HomePage() {
  const { profile, settings, loading, unavailable } = useSite()
  const { lang } = useLang()
  useReveal([loading])
  const name = profile ? `${profile.first_name} ${profile.last_name}` : ''
  const { states } = useLang().t
  const canonicalBase = settings?.canonical_url || undefined
  useSEO({
    title: settings?.seo_title || (profile ? `${name} — ${profile.academic_title}` : settings?.site_name),
    description: settings?.seo_description || profile?.short_bio || settings?.site_description,
    image: settings?.og_image_url || profile?.avatar_url || undefined,
    path: '/', canonicalBase, lang,
    jsonLd: [
      {
        '@context': 'https://schema.org', '@type': 'WebSite',
        name: settings?.site_name, url: pageUrl('/', canonicalBase), inLanguage: lang,
        ...(settings?.site_description ? { description: settings.site_description } : {}),
      },
      ...(profile ? [{
        '@context': 'https://schema.org', '@type': 'Person',
        name, ...(profile.academic_title ? { jobTitle: profile.academic_title } : {}),
        ...(profile.institution ? { affiliation: { '@type': 'Organization', name: profile.institution } } : {}),
        ...(profile.avatar_url ? { image: profile.avatar_url } : {}),
        url: pageUrl('/', canonicalBase),
      }] : []),
    ],
  })
  if (unavailable) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-4xl gold-text">{states.siteUnavailable}</h1>
        <p className="text-muted-foreground max-w-md">{states.siteUnavailableDesc}</p>
      </div>
    )
  }
  if (settings?.maintenance_mode) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-4xl gold-text">{states.maintenance}</h1>
        <p className="text-muted-foreground">{states.maintenanceDesc}</p>
      </div>
    )
  }
  return (
    <main key={lang}>
      <Hero />
      {settings?.show_about !== false && <AboutSection />}
      <ExpertiseSection />
      {settings?.show_blog !== false && <FeaturedPostsSection />}
      {settings?.show_books !== false && <BooksSection />}
      {settings?.show_social !== false && <LinksSection />}
      {settings?.show_contact !== false && <ContactSection />}
    </main>
  )
}
