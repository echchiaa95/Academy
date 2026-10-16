export interface Profile {
  id: string
  tenant_id?: string
  language_code?: string
  first_name: string
  last_name: string
  academic_title: string
  specialty: string
  field: string
  institution: string
  location: string
  short_bio: string
  long_bio: string
  avatar_url: string
  email: string
  phone: string
  whatsapp: string
  google_scholar: string
  orcid: string
  researchgate: string
  linkedin: string
  facebook: string
  x: string
  website: string
  qualifications: string[]
  interests: string[]
  role?: string
}

export interface Post {
  id: string
  tenant_id?: string
  language_code?: string
  title: string
  slug: string
  excerpt: string
  content: string
  cover_url: string
  category: string
  tags: string[]
  published: boolean
  featured: boolean
  published_at: string | null
  created_at: string
}

export type BookType = 'FREE' | 'PAID' | 'REQUEST'

export interface Comment {
  id: string
  tenant_id?: string
  post_id: string
  author_name: string
  author_email?: string
  content: string
  approved: boolean
  created_at: string
}
export interface Book {
  id: string
  tenant_id?: string
  language_code?: string
  title: string
  slug: string
  description: string
  author: string
  year: number | null
  pages: number | null
  cover_url: string
  pdf_url: string
  preview_url: string
  price: number | null
  currency: string
  type: BookType
  published: boolean
  featured: boolean
  featured_order: number
  created_at: string
}

export type RequestStatus = 'NEW' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'
export interface BookRequest {
  id: string
  tenant_id?: string
  book_id: string
  book_title?: string
  name: string
  email: string
  phone: string
  message: string
  status: RequestStatus
  created_at: string
}

export interface SiteSettings {
  id: string
  tenant_id?: string
  site_name: string
  site_description: string
  hero_image_url: string
  posts_per_page: number
  books_per_page: number
  show_about: boolean
  show_blog: boolean
  show_books: boolean
  show_social: boolean
  show_contact: boolean
  maintenance_mode: boolean
  language_code?: string
  seo_title?: string
  seo_description?: string
  canonical_url?: string
  og_image_url?: string
  robots_directive?: string
  google_site_verification?: string
  adsense_enabled?: boolean
  adsense_publisher_id?: string
  adsense_auto_ads_enabled?: boolean
  adsense_updated_at?: string | null
}

// ---- Multilingual translations ----
export type LangCode = 'ar' | 'fr' | 'en'

export interface PostTranslation {
  id: string
  tenant_id?: string
  post_id: string
  language_code: LangCode
  title: string
  slug: string
  excerpt: string
  content: string
  seo_title?: string
  seo_description?: string
  published: boolean
}

export interface BookTranslation {
  id: string
  tenant_id?: string
  book_id: string
  language_code: LangCode
  title: string
  slug: string
  description: string
  seo_title?: string
  seo_description?: string
  published: boolean
}

export interface ProfileTranslation {
  id: string
  tenant_id?: string
  profile_id: string
  language_code: LangCode
  first_name: string
  last_name: string
  academic_title: string
  specialty: string
  field: string
  institution: string
  location: string
  short_bio: string
  long_bio: string
  qualifications: string[]
  interests: string[]
  seo_title?: string
  seo_description?: string
}

export interface SettingsTranslation {
  id: string
  tenant_id?: string
  settings_id: string
  language_code: LangCode
  site_name: string
  site_description: string
  seo_title?: string
  seo_description?: string
}

// ---- Multi-tenant ----
export type TenantStatus = 'active' | 'suspended' | 'pending'
export interface Tenant {
  id: string
  name: string
  slug: string
  status: TenantStatus
  owner_email: string
  owner_user_id: string | null
  primary_language: string
  country: string
  created_at: string
}

export type DomainStatus = 'pending' | 'verified' | 'active' | 'disabled'
export interface TenantDomain {
  id: string
  tenant_id: string
  hostname: string
  is_primary: boolean
  status: DomainStatus
  verification_token: string
  verified_at: string | null
  created_at: string
}

export interface TenantMember {
  id: string
  tenant_id: string | null
  user_id: string
  role: 'superadmin' | 'admin'
}

export interface TenantResolution {
  tenant_id: string
  name: string
  slug: string
  status: TenantStatus
  domain_status: DomainStatus | null
}
