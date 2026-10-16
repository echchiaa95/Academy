import { NavLink, Outlet, useNavigate } from 'react-router'
import { LayoutDashboard, FileText, BookOpen, Inbox, UserCircle, Settings as SettingsIcon, LogOut, Globe } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminTenantId } from '@/hooks/useAdminTenant'
import { Building2 } from 'lucide-react'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { useSEO } from '@/hooks/useSEO'

const items = [
  { to: '/admin', end: true, icon: LayoutDashboard, key: 'dashboard' },
  { to: '/admin/site', icon: Globe, key: 'mySite' },
  { to: '/admin/posts', icon: FileText, key: 'posts' },
  { to: '/admin/books', icon: BookOpen, key: 'books' },
  { to: '/admin/requests', icon: Inbox, key: 'requests' },
  { to: '/admin/profile', icon: UserCircle, key: 'profile' },
  { to: '/admin/domain', icon: Globe, key: 'domainPage' },
  { to: '/admin/settings', icon: SettingsIcon, key: 'settings' },
] as const

export function AdminLayout() {
  const t = useT()
  const { signOut, isSuperadmin, setAdminTenantId } = useAuth()
  const managedTid = useAdminTenantId()
  const nav = useNavigate()
  // admin pages must never be indexed by search engines
  useSEO({ noindex: true })
  const saItems = isSuperadmin ? [{ to: '/admin/tenants', icon: Building2, key: 'tenants' as const }] : []
  const doSignOut = async () => { await signOut(); nav('/') }
  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-24 space-y-1 rounded-xl glass p-3">
            {/* the dashboard belongs to the PLATFORM, not to one tenant's site */}
            <p className="px-3 py-2 font-display text-lg gold-text">Academic Profile</p>
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} end={"end" in i}
                className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  isActive ? 'bg-[#c8a45c]/15 gold-text' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>
                <i.icon className="size-4" /> {t.admin[i.key as keyof typeof t.admin] as string}
              </NavLink>
            ))}
            {saItems.map((i) => (
              <NavLink key={i.to} to={i.to}
                className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  isActive ? 'bg-[#c8a45c]/15 gold-text' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>
                <i.icon className="size-4" /> {t.admin[i.key] as string}
              </NavLink>
            ))}
            <div className="hairline my-2" />
            <button onClick={doSignOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
              <LogOut className="size-4" /> {t.nav.logout}
            </button>
          </nav>
        </aside>
        <div className="min-w-0 flex-1">
          {/* mobile dashboard navigation — dashboard items ONLY, plus sign out.
              No public-website links, no marketing CTA here. */}
          <nav className="mb-4 flex items-center gap-1 overflow-x-auto rounded-xl glass p-2 md:hidden">
            {[...items, ...saItems].map((i) => (
              <NavLink key={i.to} to={i.to} end={"end" in i}
                className={({ isActive }) => cn('flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs',
                  isActive ? 'bg-[#c8a45c]/15 gold-text' : 'text-muted-foreground')}>
                <i.icon className="size-4" /> {t.admin[i.key as keyof typeof t.admin] as string}
              </NavLink>
            ))}
            <button onClick={doSignOut} className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
              <LogOut className="size-4" /> {t.nav.logout}
            </button>
          </nav>
          {isSuperadmin && managedTid && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-[#c8a45c]/30 bg-[#c8a45c]/5 px-4 py-2 text-sm">
              <span className="gold-text">{t.admin.managing} <span className="font-mono text-xs" dir="ltr">{managedTid.slice(0, 8)}…</span></span>
              <button className="text-muted-foreground hover:text-foreground text-xs" onClick={() => setAdminTenantId(null)}>{t.admin.stopManaging}</button>
            </div>
          )}
          <Outlet />
        </div>
      </div>
    </div>
  )
}
