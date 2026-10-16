import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'

// The tenant whose data the admin area is managing right now:
// superadmin's "Open Tenant" pick > own membership > current site tenant.
export function useAdminTenantId(): string | undefined {
  const { adminTenantId, memberships } = useAuth()
  const { tenant } = useSite()
  return adminTenantId ?? memberships[0]?.tenant_id ?? tenant?.tenant_id ?? undefined
}
