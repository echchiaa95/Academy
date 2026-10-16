import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Menu, X, Globe, LogIn, MessageCircle, LayoutDashboard } from 'lucide-react'
import { useLang } from '@/i18n'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'
import { getWhatsAppRegistrationUrl } from '@/config/contact'
import { isPlatformHost } from '@/lib/tenant'
import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

// Public pages of a CUSTOMER's academic website (tenant context)
const tenantLinks = [
  { to: '/', key: 'home' }, { to: '/about', key: 'about' }, { to: '/blog', key: 'blog' },
  { to: '/books', key: 'books' }, { to: '/#links', key: 'research' }, { to: '/contact', key: 'contact' },
] as const

export function Navbar() {
  const { t, lang } = useLang()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const loc = useLocation()

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  // close the mobile menu on navigation — adjust state during render, not in an effect
  const [prevLoc, setPrevLoc] = useState(loc)
  if (prevLoc !== loc) { setPrevLoc(loc); setOpen(false) }

  const path = loc.pathname
  const isAdminArea = path.startsWith('/admin') || path === '/login'
  // the marketing experience exists only on platform hosts — on a custom
  // domain the root path is the tenant's academic website (tenant nav)
  const isMarketing = (path === '/' || path === '/welcome') && isPlatformHost()
  const inTenantProfile = path.startsWith('/profile/')

  // anchor-scroll helper for the marketing homepage (hash routing: '#features'
  // would fight the route hash, so we scroll by element id instead)
  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setOpen(false)
  }

  /* D/A · slim platform bar over the authenticated dashboard — the dashboard
     has its own sidebar/mobile nav; never show marketing or tenant links here */
  if (isAdminArea) {
    return (
      <header className={cn('fixed inset-x-0 top-0 z-50 transition-all duration-500', scrolled ? 'glass shadow-lg shadow-black/20' : 'glass')}>
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="font-display text-xl font-semibold tracking-wide gold-text">Academic Profile</Link>
          <LangMenu />
        </nav>
      </header>
    )
  }

  /* A · marketing homepage navigation */
  if (isMarketing) {
    const marketingAnchors = [
      { id: 'features', label: t.landing.navFeatures },
      { id: 'steps', label: t.landing.navHow },
      { id: 'demo', label: t.landing.navExamples },
      { id: 'domains', label: t.landing.navDomains },
      { id: 'faq', label: t.landing.navFaq },
    ]
    return (
      <header className={cn('fixed inset-x-0 top-0 z-50 transition-all duration-500', scrolled || open ? 'glass shadow-lg shadow-black/20' : 'bg-transparent')}>
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="font-display text-xl font-semibold tracking-wide gold-text">Academic Profile</Link>
          <div className="hidden items-center gap-6 md:flex">
            {marketingAnchors.map((a) => (
              <a key={a.id} href={`#${a.id}`} onClick={scrollTo(a.id)} className="text-sm text-white/70 transition-colors hover:text-white">
                {a.label}
              </a>
            ))}
            <LangMenu />
            <Link to="/admin" className="flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white">
              <LogIn className="size-4" /> {t.nav.login}
            </Link>
            <a href={getWhatsAppRegistrationUrl(lang)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-[#c8a45c] px-4 py-1.5 text-sm font-semibold text-[#0c1124] transition-transform hover:scale-[1.04]">
              <MessageCircle className="size-4" /> {t.landing.navCta}
            </a>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <LangMenu />
            <button onClick={() => setOpen(!open)} aria-label="menu" className="p-2 text-foreground">
              {open ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </nav>
        {open && (
          <div className="glass border-t border-border/50 md:hidden">
            <div className="flex flex-col px-6 py-4 gap-1">
              {marketingAnchors.map((a) => (
                <a key={a.id} href={`#${a.id}`} onClick={scrollTo(a.id)} className="py-2.5 text-base text-muted-foreground hover:text-foreground">
                  {a.label}
                </a>
              ))}
              <Link to="/admin" className="flex items-center gap-2 py-2.5 text-base text-muted-foreground hover:text-foreground">
                <LogIn className="size-4" /> {t.nav.login}
              </Link>
              <a href={getWhatsAppRegistrationUrl(lang)} target="_blank" rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[#c8a45c] px-4 py-2.5 text-base font-semibold text-[#0c1124]">
                <MessageCircle className="size-5" /> {t.landing.navCta}
              </a>
            </div>
          </div>
        )}
      </header>
    )
  }

  /* C · public customer academic website navigation (tenant context) */
  return <TenantNavbar scrolled={scrolled} open={open} setOpen={setOpen} path={path} inTenantProfile={inTenantProfile} />
}

function TenantNavbar({ scrolled, open, setOpen, path, inTenantProfile }: {
  scrolled: boolean; open: boolean; setOpen: (v: boolean) => void; path: string; inTenantProfile: boolean
}) {
  const { t } = useLang()
  const { isAdmin } = useAuth()
  const { settings, tenant } = useSite()

  // inside #/profile/<slug>/... links must stay within that tenant's space
  const prefix = inTenantProfile && tenant?.slug ? `/profile/${encodeURIComponent(tenant.slug)}` : ''
  const to = (base: string) => (base === '/' ? (prefix || '/') : `${prefix}${base}`)

  const go = (target: string) => (e: React.MouseEvent) => {
    if (target.startsWith('/#')) {
      e.preventDefault()
      document.getElementById('links')?.scrollIntoView({ behavior: 'smooth' })
      setOpen(false)
    }
  }

  return (
    <header className={cn('fixed inset-x-0 top-0 z-50 transition-all duration-500', scrolled ? 'glass shadow-lg shadow-black/20' : 'bg-transparent')}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link to={to('/')} className="font-display text-xl font-semibold tracking-wide gold-text">
          {settings?.site_name || 'Academic Profile'}
        </Link>
        <div className="hidden items-center gap-7 md:flex">
          {tenantLinks.map((l) => (
            <Link key={l.key} to={l.to.startsWith('/#') ? l.to : to(l.to)} onClick={go(l.to)}
              className={cn('text-sm text-muted-foreground transition-colors hover:text-foreground',
                path === to(l.to) && 'text-foreground')}>
              {t.nav[l.key as keyof typeof t.nav]}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-1.5 rounded-full border border-[#c8a45c]/40 px-3.5 py-1.5 text-sm gold-text hover:bg-[#c8a45c]/10 transition-colors">
              <LayoutDashboard className="size-4" /> {t.nav.dashboard}
            </Link>
          )}
          <LangMenu />
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <LangMenu />
          <button onClick={() => setOpen(!open)} aria-label="menu" className="p-2 text-foreground">
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </nav>
      {open && (
        <div className="glass border-t border-border/50 md:hidden">
          <div className="flex flex-col px-6 py-4 gap-1">
            {tenantLinks.map((l) => (
              <Link key={l.key} to={l.to.startsWith('/#') ? l.to : to(l.to)} onClick={go(l.to)} className="py-2.5 text-base text-muted-foreground hover:text-foreground">
                {t.nav[l.key as keyof typeof t.nav]}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" className="py-2.5 text-base gold-text flex items-center gap-2">
                <LayoutDashboard className="size-4" /> {t.nav.dashboard}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

function LangMenu() {
  const { t, lang, setLang } = useLang()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <Globe className="size-4" /> <span className="uppercase text-xs tracking-wider">{lang}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass">
        {(['ar', 'fr', 'en'] as const).map((l) => (
          <DropdownMenuItem key={l} onClick={() => setLang(l)} className={l === lang ? 'gold-text' : ''}>{t.lang[l]}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
