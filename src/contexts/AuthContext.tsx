/* eslint-disable react-refresh/only-export-components -- context files co-locate the Provider with its hook, the idiomatic React pattern */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { setSiteSlugOverride } from '@/lib/tenant'
import type { TenantMember } from '@/types'

// Auth state machine (kept explicit so the route guard can distinguish):
//   loading        -> session/roles are being resolved, no decision yet
//   user + isAdmin -> authorized administrator
//   user + !isAdmin (+ rolesError=null) -> authenticated but NOT an admin
//   rolesError     -> the membership query FAILED; this is never treated
//                     as proof the user is not an administrator
type AuthCtx = {
  user: User | null
  isAdmin: boolean          // member of any tenant (or legacy admin) — can manage *something*
  isSuperadmin: boolean
  memberships: TenantMember[]
  adminTenantId: string | null  // tenant currently being managed (superadmin "Open Tenant" context)
  setAdminTenantId: (id: string | null) => void
  canManage: (tenantId?: string | null) => boolean
  loading: boolean
  rolesError: string | null     // db error code/message if the membership lookup failed
  retryRoles: () => Promise<void>
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  user: null, isAdmin: false, isSuperadmin: false, memberships: [],
  adminTenantId: null, setAdminTenantId: () => {}, canManage: () => false,
  loading: true, rolesError: null, retryRoles: async () => {},
  signIn: async () => null, signOut: async () => {},
})
export const useAuth = () => useContext(Ctx)

const MGMT_KEY = 'admin_tenant_id'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [memberships, setMemberships] = useState<TenantMember[]>([])
  const [legacyAdmin, setLegacyAdmin] = useState(false)
  const [adminTenantId, setAdminTenantIdState] = useState<string | null>(() => sessionStorage.getItem(MGMT_KEY))
  const [loading, setLoading] = useState(Boolean(supabase))
  const [rolesError, setRolesError] = useState<string | null>(null)
  // sequence guard: a slow/stale roles response must never overwrite a
  // newer result (e.g. initial restore racing an explicit signIn)
  const loadSeq = useRef(0)

  const isSuperadmin = memberships.some((m) => m.role === 'superadmin')
  const isAdmin = isSuperadmin || legacyAdmin || memberships.length > 0

  const setAdminTenantId = (id: string | null) => {
    setAdminTenantIdState(id)
    if (id) sessionStorage.setItem(MGMT_KEY, id); else sessionStorage.removeItem(MGMT_KEY)
  }

  const canManage = (tenantId?: string | null) =>
    isSuperadmin || legacyAdmin || (!!tenantId && memberships.some((m) => m.tenant_id === tenantId))

  async function loadRoles(u: User | null) {
    const seq = ++loadSeq.current
    if (!supabase || !u) {
      setMemberships([]); setLegacyAdmin(false); setRolesError(null)
      return
    }
    const [mRes, aRes] = await Promise.all([
      supabase.from('tenant_members').select('*').eq('user_id', u.id),
      supabase.from('admin_users').select('user_id').eq('user_id', u.id).maybeSingle(),
    ])
    if (seq !== loadSeq.current) return // a newer load finished first — discard stale
    // NEVER swallow query errors: a failed lookup is not "not an admin"
    if (mRes.error) {
      console.error(`[auth] tenant_members query failed: ${mRes.error.code ?? ''} ${mRes.error.message}`)
      setRolesError(`${mRes.error.code ?? 'ERR'}: ${mRes.error.message}`)
      return
    }
    setMemberships((mRes.data as TenantMember[]) ?? [])
    setLegacyAdmin(aRes.error ? false : Boolean(aRes.data))
    setRolesError(null)
  }

  const retryRoles = async () => { setRolesError(null); await loadRoles(user) }

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      // initial restore: the guard waits for this to finish (loading=false)
      loadRoles(u).finally(() => setLoading(false))
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      setUser(u)
      loadRoles(u)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    if (!supabase) return 'demo'
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message
    // load memberships BEFORE the caller navigates to /admin — otherwise the
    // route guard evaluates with stale empty roles and bounces the admin out
    await loadRoles(data.user)
    return null
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    loadSeq.current++ // invalidate any in-flight role load
    // clear any tenant-site override so the next session (possibly a different
    // customer) never inherits the previous tenant's public-site context
    setSiteSlugOverride(null)
    setUser(null); setMemberships([]); setLegacyAdmin(false); setRolesError(null); setAdminTenantId(null)
  }

  return (
    <Ctx.Provider value={{ user, isAdmin, isSuperadmin, memberships, adminTenantId, setAdminTenantId, canManage, loading, rolesError, retryRoles, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  )
}
