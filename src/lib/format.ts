export function formatDate(iso: string | null | undefined, lang: string) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso))
  } catch { return iso.slice(0, 10) }
}
export function readingMinutes(content: string) {
  const words = (content ?? '').trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 180))
}
export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || `item-${Date.now()}`
}
