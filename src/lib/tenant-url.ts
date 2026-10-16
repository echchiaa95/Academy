// Pure URL helpers for tenant public profile links — no Supabase, no DOM side
// effects beyond reading window.location, so they are unit-testable in Node.

/** Slugs may contain any letters (incl. Arabic), digits and hyphens.
 *  Reject path separators, whitespace, query/hash chars and traversal. */
export function isSafeSlug(slug: string): boolean {
  if (!slug || slug.length > 80) return false
  if (slug.includes('..')) return false
  return /^[^\s\\/?#:.%@]+$/.test(slug)
}

/** Absolute base URL of the deployed app (everything before the hash route). */
export function getAppBaseUrl(loc: { origin: string; pathname: string } = window.location): string {
  let path = loc.pathname
  // strip a trailing index.html so links stay clean
  path = path.replace(/\/index\.html?$/, '/')
  if (!path.endsWith('/')) path = path.slice(0, path.lastIndexOf('/') + 1)
  return `${loc.origin}${path}`
}

/** Stable public URL of a tenant's academic website (hash routing). */
export function getTenantPublicUrl(slug: string, loc?: { origin: string; pathname: string }): string {
  return `${getAppBaseUrl(loc)}#/profile/${encodeURIComponent(slug)}`
}
