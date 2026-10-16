import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Vite embeds VITE_* values into the client bundle — only PUBLIC values
// belong here. The publishable key is safe for the browser because every
// table is protected by Row Level Security (see supabase/*.sql).
// The new-format publishable key variable is preferred; the legacy anon
// variable is kept as a fallback so existing deployments keep working.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
  || (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

function looksPlaceholder(v?: string) {
  return !v || v.includes('YOUR-') || v.includes('YOUR_')
}

// Startup validation:
//  - both unset        -> intentional demo/preview mode (documented)
//  - one set, one not  -> misconfiguration: fail with a clear error,
//                         never pretend to be connected
//  - placeholder value -> misconfiguration as well
export const supabaseConfigError: string | null = (() => {
  const urlSet = !looksPlaceholder(url)
  const keySet = !looksPlaceholder(key)
  if (urlSet && !keySet)
    return 'VITE_SUPABASE_URL is set but VITE_SUPABASE_PUBLISHABLE_KEY is missing — add it to your .env (see .env.example).'
  if (!urlSet && keySet)
    return 'VITE_SUPABASE_PUBLISHABLE_KEY is set but VITE_SUPABASE_URL is missing — add it to your .env (see .env.example).'
  if (urlSet && !url!.startsWith('https://'))
    return 'VITE_SUPABASE_URL must be the project URL (https://<ref>.supabase.co) — do not append /rest/v1/.'
  return null
})()

export const isSupabaseConfigured = !supabaseConfigError && !looksPlaceholder(url) && !looksPlaceholder(key)

if (supabaseConfigError) {
  // deliberate: message only, never the key itself
  console.error(`[Supabase config] ${supabaseConfigError}`)
}

// Never ship service_role keys here — the publishable key is safe for the
// browser because every table is protected by Row Level Security.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, key!)
  : null
