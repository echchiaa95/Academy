import { Link } from 'react-router'
import { ChevronDown } from 'lucide-react'
import { useT } from '@/i18n'
import { useSite } from '@/contexts/SiteContext'
import { Button } from '@/components/ui/button'
import { ImagePlaceholder } from '@/components/ui/placeholder'

export function Hero() {
  const t = useT()
  const { profile, settings } = useSite()
  if (!profile) return null
  const name = `${profile.first_name} ${profile.last_name}`

  return (
    <section className="relative flex min-h-[92svh] items-center overflow-hidden">
      {settings?.hero_image_url && (
        <img src={settings.hero_image_url} alt="" className="absolute inset-0 size-full object-cover opacity-25" />
      )}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 70% 30%, rgba(200,164,92,0.10) 0%, transparent 60%)' }} />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/80" />

      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-5 pb-20 pt-28 md:grid-cols-[1.2fr_1fr] md:items-center md:gap-14">
        <div className="order-2 space-y-6 md:order-1">
          <p className="reveal text-sm tracking-[0.3em] uppercase gold-text">{profile.academic_title}</p>
          <h1 className="reveal font-display text-5xl font-semibold leading-[1.1] md:text-7xl">{name}</h1>
          <p className="reveal text-lg text-muted-foreground md:text-xl">
            {profile.specialty}
            {profile.institution && <span className="text-foreground/70"> — {profile.institution}</span>}
          </p>
          <p className="reveal max-w-xl leading-8 text-muted-foreground">{profile.short_bio}</p>
          <div className="reveal flex flex-wrap gap-3 pt-2">
            {settings?.show_blog !== false && (
              <Button asChild size="lg" className="bg-[#c8a45c] text-stone-900 hover:bg-[#d9b56e]">
                <Link to="/blog">{t.hero.ctaBlog}</Link>
              </Button>
            )}
            {settings?.show_books !== false && (
              <Button asChild size="lg" variant="outline" className="border-[#c8a45c]/40 gold-text hover:bg-[#c8a45c]/10">
                <Link to="/books">{t.hero.ctaBooks}</Link>
              </Button>
            )}
            <Button asChild size="lg" variant="ghost" className="text-muted-foreground hover:text-foreground">
              <Link to="/about">{t.hero.ctaResearch}</Link>
            </Button>
          </div>
        </div>

        <div className="reveal order-1 md:order-2">
          <div className="relative mx-auto w-64 md:w-full md:max-w-sm">
            <div className="absolute -inset-4 rounded-2xl border border-[#c8a45c]/20" style={{ transform: 'translate(12px, 12px)' }} />
            <div className="img-zoom relative overflow-hidden rounded-2xl aspect-[4/5] shadow-2xl shadow-black/60">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={name} className="size-full object-cover" />
                : <ImagePlaceholder kind="portrait" className="size-full rounded-2xl" />}
              <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground/60 animate-bounce">
        <ChevronDown className="size-6" />
      </div>
    </section>
  )
}
