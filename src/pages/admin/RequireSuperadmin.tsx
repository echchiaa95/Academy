import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/i18n'

export function RequireSuperadmin() {
  const { isSuperadmin, loading } = useAuth()
  const t = useT()
  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">{t.states.loading}</div>
  if (!isSuperadmin) return <Navigate to="/admin" replace />
  return <Outlet />
}
