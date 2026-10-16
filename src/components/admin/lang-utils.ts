import type { LangCode } from '@/types'

export const LANGS: LangCode[] = ['ar', 'fr', 'en']
export const LANG_LABELS: Record<LangCode, string> = { ar: 'العربية', fr: 'Français', en: 'English' }

export interface LangForm {
  title: string
  slug: string
  excerpt: string
  content: string
  seo_title: string
  seo_description: string
}

export const emptyLangForm: LangForm & { published: boolean } = {
  title: '', slug: '', excerpt: '', content: '', seo_title: '', seo_description: '', published: false,
}

export function fieldsFromLangForm(f: LangForm) {
  return { title: f.title, slug: f.slug, excerpt: f.excerpt, content: f.content, seo_title: f.seo_title, seo_description: f.seo_description }
}
