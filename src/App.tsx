import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router'
import { Navbar } from '@/components/layout/Navbar'
import { AdSenseLoader, SiteVerificationMeta } from '@/components/ads/AdSenseLoader'
import { Footer } from '@/components/layout/Footer'
import { useT } from '@/i18n'
import { isPlatformHost } from '@/lib/tenant'

const HomePage = lazy(() => import('@/pages/public/HomePage'))
const AboutPage = lazy(() => import('@/pages/public/AboutPage'))
const BlogPage = lazy(() => import('@/pages/public/BlogPage'))
const BlogPostPage = lazy(() => import('@/pages/public/BlogPostPage'))
const BooksPage = lazy(() => import('@/pages/public/BooksPage'))
const BookDetailPage = lazy(() => import('@/pages/public/BookDetailPage'))
const ContactPage = lazy(() => import('@/pages/public/ContactPage'))
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage'))
const AdminLayout = lazy(() => import('@/components/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })))
const RequireAdmin = lazy(() => import('@/pages/admin/RequireAdmin').then((m) => ({ default: m.RequireAdmin })))
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const PostsAdminPage = lazy(() => import('@/pages/admin/PostsAdminPage'))
const PostEditorPage = lazy(() => import('@/pages/admin/PostEditorPage'))
const BooksAdminPage = lazy(() => import('@/pages/admin/BooksAdminPage'))
const BookEditorPage = lazy(() => import('@/pages/admin/BookEditorPage'))
const RequestsAdminPage = lazy(() => import('@/pages/admin/RequestsAdminPage'))
const ProfileAdminPage = lazy(() => import('@/pages/admin/ProfileAdminPage'))
const SettingsAdminPage = lazy(() => import('@/pages/admin/SettingsAdminPage'))
const TenantsAdminPage = lazy(() => import('@/pages/admin/TenantsAdminPage'))
const TenantFormPage = lazy(() => import('@/pages/admin/TenantFormPage'))
const TenantDomainsPage = lazy(() => import('@/pages/admin/TenantDomainsPage'))
const MySitePage = lazy(() => import('@/pages/admin/MySitePage'))
const CustomerDomainPage = lazy(() => import('@/pages/admin/CustomerDomainPage'))
const RequireSuperadmin = lazy(() => import('@/pages/admin/RequireSuperadmin').then((m) => ({ default: m.RequireSuperadmin })))
const SiteRedirectPage = lazy(() => import('@/pages/public/SiteRedirectPage'))
const LandingPage = lazy(() => import('@/pages/public/LandingPage'))
const TenantSiteLayout = lazy(() => import('@/pages/public/TenantSitePage'))

function Loader() {
  const t = useT()
  return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">{t.states.loading}</div>
}

export default function App() {
  const loc = useLocation()
  const isAdminRoute = loc.pathname.startsWith('/admin') || loc.pathname === '/login'
  // On a custom hostname the root belongs to that tenant's academic website
  // (resolved server-side via resolve_tenant_by_hostname in SiteContext);
  // on platform hosts it stays the marketing landing page.
  const onPlatformHost = isPlatformHost()
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      {/* AdSense: public pages only — never admin/auth routes */}
      {!isAdminRoute && <AdSenseLoader />}
      {!isAdminRoute && <SiteVerificationMeta />}
      <Suspense fallback={<Loader />}>
        <Routes location={loc}>
          {/* A · marketing homepage on platform hosts — the tenant's academic
              website on custom hostnames. No redirect: the custom domain
              stays in the address bar and HashRouter keeps working. */}
          <Route path="/" element={onPlatformHost ? <LandingPage /> : <HomePage />} />
          <Route path="/welcome" element={<Navigate to="/" replace />} />
          {/* B · each customer's public academic website lives under its slug */}
          <Route path="/profile/:slug" element={<TenantSiteLayout />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="blog" element={<BlogPage />} />
            <Route path="blog/:slug" element={<BlogPostPage />} />
            <Route path="books" element={<BooksPage />} />
            <Route path="books/:slug" element={<BookDetailPage />} />
            <Route path="contact" element={<ContactPage />} />
          </Route>
          {/* legacy default-tenant paths (kept for existing links/SEO) */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/books" element={<BooksPage />} />
          <Route path="/books/:slug" element={<BookDetailPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/site/:slug" element={<SiteRedirectPage />} />
          <Route path="/site/:slug/*" element={<SiteRedirectPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="site" element={<MySitePage />} />
              <Route path="domain" element={<CustomerDomainPage />} />
              <Route path="posts" element={<PostsAdminPage />} />
              <Route path="posts/new" element={<PostEditorPage />} />
              <Route path="posts/:id" element={<PostEditorPage />} />
              <Route path="books" element={<BooksAdminPage />} />
              <Route path="books/new" element={<BookEditorPage />} />
              <Route path="books/:id" element={<BookEditorPage />} />
              <Route path="requests" element={<RequestsAdminPage />} />
              <Route path="profile" element={<ProfileAdminPage />} />
              <Route path="settings" element={<SettingsAdminPage />} />
              <Route element={<RequireSuperadmin />}>
                <Route path="tenants" element={<TenantsAdminPage />} />
                <Route path="tenants/new" element={<TenantFormPage />} />
                <Route path="tenants/:id" element={<TenantFormPage />} />
                <Route path="tenants/:id/domains" element={<TenantDomainsPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Footer />
    </div>
  )
}
