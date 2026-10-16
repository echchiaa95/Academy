import { Outlet } from 'react-router'
import { ShieldX, RefreshCw, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/i18n'
import { Button } from '@/components/ui/button'
import LoginPage from './LoginPage'

// Route gate: any authenticated tenant member may enter /admin;
// WHAT they can see/change inside is enforced per-tenant by Postgres RLS
// (is_tenant_admin / is_superadmin) — never by this UI check alone.
// States are explicit: loading -> spinner, query failure -> error + retry,
// authenticated non-admin -> access denied + sign out (NEVER a silent
// redirect to the homepage).
export function RequireAdmin() {
  const { user, isAdmin, loading, rolesError, retryRoles, signOut } = useAuth()
  const t = useT()

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">{t.states.loading}</div>
  if (!user) return <LoginPage />

  // the membership query FAILED — do not interpret this as "not an admin"
  if (rolesError) return (
    <main className="flex min-h-[85vh] items-center justify-center px-5 pt-16">
      <div className="w-full max-w-md space-y-6 rounded-2xl glass p-8 text-center">
        <ShieldX className="mx-auto size-10 text-[#c8a45c]" />
        <h1 className="font-display text-2xl gold-text">{t.admin.rolesErrorTitle}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{t.admin.rolesErrorDesc}</p>
        <p className="rounded-lg border border-border bg-muted/30 p-2 text-xs text-muted-foreground" dir="ltr">{rolesError}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => retryRoles()} className="bg-[#c8a45c] text-stone-900 hover:bg-[#d9b56e]">
            <RefreshCw className="size-4" /> {t.admin.retry}
          </Button>
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut className="size-4" /> {t.nav.logout}
          </Button>
        </div>
      </div>
    </main>
  )

  // authenticated but NOT an administrator — clear page, no silent redirect
  if (!isAdmin) return (
    <main className="flex min-h-[85vh] items-center justify-center px-5 pt-16">
      <div className="w-full max-w-md space-y-6 rounded-2xl glass p-8 text-center">
        <ShieldX className="mx-auto size-10 text-[#c8a45c]" />
        <h1 className="font-display text-2xl gold-text">{t.admin.accessDeniedTitle}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{t.admin.accessDeniedDesc}</p>
        <Button variant="outline" onClick={() => signOut()}>
          <LogOut className="size-4" /> {t.nav.logout}
        </Button>
      </div>
    </main>
  )

  return <Outlet />
}
