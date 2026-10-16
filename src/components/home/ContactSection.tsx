import { Mail, MapPin, Building2, MessageCircle } from 'lucide-react'
import { useT } from '@/i18n'
import { useSite } from '@/contexts/SiteContext'
import { SectionHeading } from './SectionHeading'
import { Button } from '@/components/ui/button'

export function ContactSection() {
  const t = useT()
  const { profile } = useSite()
  if (!profile) return null
  const wa = profile.whatsapp?.replace(/[^\d]/g, '')
  return (
    <section className="border-t border-border/50 bg-card/40 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading title={t.sections.contact} />
        <div className="reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profile.email && (
            <a href={`mailto:${profile.email}`} className="flex items-center gap-4 rounded-xl border border-border/60 p-5 transition-colors hover:border-[#c8a45c]/50">
              <Mail className="size-6 gold-text" strokeWidth={1.5} />
              <div><p className="text-xs text-muted-foreground">{t.contact.email}</p><p className="text-sm font-medium break-all" dir="ltr">{profile.email}</p></div>
            </a>
          )}
          {profile.institution && (
            <div className="flex items-center gap-4 rounded-xl border border-border/60 p-5">
              <Building2 className="size-6 gold-text" strokeWidth={1.5} />
              <div><p className="text-xs text-muted-foreground">{t.contact.institution}</p><p className="text-sm font-medium">{profile.institution}</p></div>
            </div>
          )}
          {profile.location && (
            <div className="flex items-center gap-4 rounded-xl border border-border/60 p-5">
              <MapPin className="size-6 gold-text" strokeWidth={1.5} />
              <div><p className="text-xs text-muted-foreground">{t.contact.location}</p><p className="text-sm font-medium">{profile.location}</p></div>
            </div>
          )}
        </div>
        {wa && (
          <div className="reveal mt-8 text-center">
            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white">
              <a href={`https://wa.me/${wa}?text=${encodeURIComponent(t.contact.whatsappMsg)}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-5" /> {t.contact.whatsapp}
              </a>
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
