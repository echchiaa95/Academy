import { Link, useLocation } from 'react-router'
import { useT } from '@/i18n'
import { useSite } from '@/contexts/SiteContext'
import { SocialIcons } from '@/components/SocialIcons'
import { isPlatformHost } from '@/lib/tenant'

export function Footer() {
  const t = useT()
  const { profile, settings } = useSite()
  const { pathname } = useLocation()
  // the marketing homepage (on platform hosts) and the dashboard carry the
  // PLATFORM brand — on a custom domain the root path is the tenant's site
  // and must carry the tenant's name/socials
  const platform = pathname.startsWith('/admin') ||
    ((pathname === '/' || pathname === '/welcome') && isPlatformHost())

  if (platform) {
    return (
      <footer className="hairline">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="font-display text-2xl gold-text">Academic Profile</span>
            <p className="text-xs text-muted-foreground/70">© {new Date().getFullYear()} Academic Profile — {t.footer.rights}</p>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="hairline mt-10">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col items-center gap-6 text-center">
          <span className="font-display text-2xl gold-text">{settings?.site_name || 'Academic Profile'}</span>
          {profile && <SocialIcons profile={profile} />}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">{t.nav.home}</Link>
            <Link to="/about" className="hover:text-foreground">{t.nav.about}</Link>
            <Link to="/blog" className="hover:text-foreground">{t.nav.blog}</Link>
            <Link to="/books" className="hover:text-foreground">{t.nav.books}</Link>
            <Link to="/contact" className="hover:text-foreground">{t.nav.contact}</Link>
          </nav>
          <p className="text-xs text-muted-foreground/70">
            © {new Date().getFullYear()} {profile ? `${profile.first_name} ${profile.last_name}` : ''} — {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  )
}
