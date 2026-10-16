import { GraduationCap, Globe, Linkedin, Facebook, Mail, BookMarked, Fingerprint, Twitter } from 'lucide-react'
import type { Profile } from '@/types'

// Renders only the links that have been filled in the profile.
export function SocialIcons({ profile, size = 'size-5' }: { profile: Profile; size?: string }) {
  const items = [
    { url: profile.google_scholar, icon: GraduationCap, label: 'Google Scholar' },
    { url: profile.orcid, icon: Fingerprint, label: 'ORCID' },
    { url: profile.researchgate, icon: BookMarked, label: 'ResearchGate' },
    { url: profile.linkedin, icon: Linkedin, label: 'LinkedIn' },
    { url: profile.facebook, icon: Facebook, label: 'Facebook' },
    { url: profile.x, icon: Twitter, label: 'X' },
    { url: profile.website, icon: Globe, label: 'Website' },
    { url: profile.email ? `mailto:${profile.email}` : '', icon: Mail, label: 'Email' },
  ].filter((i) => i.url)
  if (!items.length) return null
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {items.map((i) => (
        <a key={i.label} href={i.url} target={i.url.startsWith('mailto') ? undefined : '_blank'} rel="noopener noreferrer" aria-label={i.label}
          className="flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-all hover:border-[#c8a45c]/60 hover:text-[#c8a45c] hover:-translate-y-0.5">
          <i.icon className={size} strokeWidth={1.5} />
        </a>
      ))}
    </div>
  )
}
