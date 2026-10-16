import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { FileText, BookOpen, Inbox, Star, Globe, StarOff } from 'lucide-react'
import { useT } from '@/i18n'
import { listPosts, listBooks, listRequests, listTenants, listDomains } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminTenantId } from '@/hooks/useAdminTenant'
import { Building2 } from 'lucide-react'
import { formatDate } from '@/lib/format'
import { useLang } from '@/i18n'
import type { Post, Book, BookRequest, Tenant, TenantDomain } from '@/types'

export default function DashboardPage() {
  const t = useT()
  const { lang } = useLang()
  const [posts, setPosts] = useState<Post[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [requests, setRequests] = useState<BookRequest[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [domains, setDomains] = useState<TenantDomain[]>([])
  const { isSuperadmin } = useAuth()
  const tid = useAdminTenantId()
  const platformView = isSuperadmin && !tid

  useEffect(() => {
    listPosts(tid).then(setPosts).catch(() => {})
    listBooks(tid).then(setBooks).catch(() => {})
    listRequests(tid).then(setRequests).catch(() => {})
    if (platformView) { listTenants().then(setTenants).catch(() => {}); listDomains().then(setDomains).catch(() => {}) }
  }, [])

  const stats = [
    { icon: FileText, label: t.admin.stats.posts, value: posts.length },
    { icon: Globe, label: t.admin.stats.published, value: posts.filter((p) => p.published).length },
    { icon: Star, label: t.admin.stats.featured, value: posts.filter((p) => p.featured).length },
    { icon: BookOpen, label: t.admin.stats.books, value: books.length },
    { icon: StarOff, label: t.admin.stats.featuredBooks, value: books.filter((b) => b.featured).length },
    { icon: Inbox, label: t.admin.stats.requests, value: requests.length },
  ]

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl gold-text">{t.admin.dashboard}</h1>
      {platformView && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: Building2, label: t.admin.platformStats.tenants, value: tenants.length },
            { icon: Globe, label: t.admin.platformStats.active, value: tenants.filter((x) => x.status === 'active').length },
            { icon: StarOff, label: t.admin.platformStats.suspended, value: tenants.filter((x) => x.status === 'suspended').length },
            { icon: Inbox, label: t.admin.platformStats.pendingDomains, value: domains.filter((d) => d.status === 'pending').length },
          ].map((s2) => (
            <div key={s2.label} className="rounded-xl glass p-4 space-y-2">
              <s2.icon className="size-5 gold-text" strokeWidth={1.5} />
              <p className="text-2xl font-semibold">{s2.value}</p>
              <p className="text-xs text-muted-foreground">{s2.label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl glass p-4 space-y-2">
            <s.icon className="size-5 gold-text" strokeWidth={1.5} />
            <p className="text-2xl font-semibold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl glass p-5">
          <h2 className="mb-4 font-display text-xl">{t.admin.recentPosts}</h2>
          {posts.length === 0 ? <p className="text-sm text-muted-foreground">{t.admin.empty}</p> : (
            <ul className="divide-y divide-border/50">
              {posts.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <Link to={`/admin/posts/${p.id}`} className="truncate text-sm hover:text-[#c8a45c]">{p.title}</Link>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${p.published ? 'bg-emerald-500/10 text-emerald-400' : 'bg-secondary text-muted-foreground'}`}>
                    {p.published ? t.admin.postStatus.published : t.admin.postStatus.draft}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl glass p-5">
          <h2 className="mb-4 font-display text-xl">{t.admin.recentRequests}</h2>
          {requests.length === 0 ? <p className="text-sm text-muted-foreground">{t.admin.empty}</p> : (
            <ul className="divide-y divide-border/50">
              {requests.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="truncate">{r.name} — <span className="text-muted-foreground">{r.book_title}</span></span>
                  <time className="shrink-0 text-xs text-muted-foreground">{formatDate(r.created_at, lang)}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
