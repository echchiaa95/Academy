// Pure hostname helpers — shared by the API layer and unit tests.

/** Normalize user input into a bare hostname: strip scheme, path, port,
 *  credentials, query, trailing dot; lowercase; strip leading "www." stays
 *  untouched (www.example.com and example.com are DIFFERENT hostnames). */
export function normalizeHostname(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '') // scheme
    .replace(/^[^/@]*@/, '')                 // userinfo
    .replace(/[:/?#].*$/, '')                // port/path/query/hash
    .replace(/\.+$/, '')                     // trailing dot(s)
}

/** Strict hostname validation: labels of letters/digits/hyphens, at least
 *  one dot, TLD of 2+ letters, total length ≤ 253, label length ≤ 63. */
export function isValidHostname(hostname: string): boolean {
  if (!hostname || hostname.length > 253) return false
  const labels = hostname.split('.')
  if (labels.length < 2) return false
  const tld = labels[labels.length - 1]
  if (!/^[a-z]{2,}$/.test(tld)) return false
  return labels.every((l) => l.length >= 1 && l.length <= 63 && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(l))
}

/** PostgREST unique-violation code for the hostname unique constraint. */
export function isDuplicateHostnameError(message: string): boolean {
  return /duplicate key|23505|already exists/i.test(message)
}
