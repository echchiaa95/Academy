import type { ComponentType } from 'react'
import { useT } from '@/i18n'
import { useSite } from '@/contexts/SiteContext'
import { useSEO } from '@/hooks/useSEO'
import { useReveal } from '@/hooks/useReveal'
import { SectionHeading } from '@/components/home/SectionHeading'
import { SocialIcons } from '@/components/SocialIcons'
import { ImagePlaceholder } from '@/components/ui/placeholder'
import { TextSkeleton } from '@/components/ui/skeletons'
import { GraduationCap, Building2, FlaskConical } from 'lucide-react'

export default function AboutPage() {
  const t = useT()
  const { profile, loading } = useSite()
  useReveal([loading])
  useSEO({
    title: profile ? `${t.sections.about} — ${profile.first_name} ${profile.last_name}` : undefined,
    description: profile?.short_bio,
    image: profile?.avatar_url || undefined,
    path: '/about',
  })
  if (loading || !profile) return <div className="mx-auto max-w-4xl px-5 py-32"><TextSkeleton lines={8} /></div>
  const name = `${profile.first_name} ${profile.last_name}`
  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-32">
      <SectionHeading title={t.sections.about} subtitle={profile.academic_title} />
      <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
        <div className="reveal">
          <div className="relative overflow-hidden rounded-2xl aspect-[4/5] shadow-2xl shadow-black/50">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={name} className="size-full object-cover" />
              : <ImagePlaceholder kind="portrait" className="size-full rounded-2xl" />}
          </div>
          <div className="mt-6"><SocialIcons profile={profile} /></div>
        </div>
        <div className="reveal space-y-8">
          <div className="space-y-4">
            <h2 className="font-display text-3xl font-semibold">{name}</h2>
            {(profile.long_bio || profile.short_bio).split('\n').filter(Boolean).map((p, i) => (
              <p key={i} className="leading-8 text-foreground/85">{p}</p>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {profile.specialty && <Info icon={GraduationCap} label={t.about.specialty} value={profile.specialty} />}
            {profile.institution && <Info icon={Building2} label={t.about.institution} value={profile.institution} />}
            {profile.field && <Info icon={FlaskConical} label={t.about.field} value={profile.field} />}
          </div>
          {profile.qualifications?.length > 0 && (
            <div>
              <h3 className="font-display text-2xl gold-text mb-3">{t.about.qualifications}</h3>
              <ul className="space-y-2">
                {profile.qualifications.map((q) => (
                  <li key={q} className="flex gap-3 text-foreground/85"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[#c8a45c]" />{q}</li>
                ))}
              </ul>
            </div>
          )}
          {profile.interests?.length > 0 && (
            <div>
              <h3 className="font-display text-2xl gold-text mb-3">{t.about.interests}</h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((it) => (
                  <span key={it} className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground">{it}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function Info({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string; strokeWidth?: number }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl glass p-4">
      <Icon className="size-5 gold-text mt-0.5" strokeWidth={1.5} />
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value}</p></div>
    </div>
  )
}
