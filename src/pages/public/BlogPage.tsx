import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useT, useLang } from '@/i18n'
import { useSite } from '@/contexts/SiteContext'
import { listPostsLocalized } from '@/lib/api'
import { BlogCard } from '@/components/blog/BlogCard'
import { PostSkeleton } from '@/components/ui/skeletons'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useSEO } from '@/hooks/useSEO'
import { useReveal } from '@/hooks/useReveal'
import { cn } from '@/lib/utils'
import type { Post } from '@/types'

const PAGE = 9

export default function BlogPage() {
  const t = useT()
  const { lang } = useLang()
  const { tenant } = useSite()
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('')
  const [shown, setShown] = useState(PAGE)
  useReveal([posts, cat, query])
  useSEO({ title: t.blog.title, description: t.blog.subtitle, path: '/blog' })

  useEffect(() => { listPostsLocalized(tenant?.tenant_id, lang, { publishedOnly: true }).then(setPosts).catch(() => setPosts([])) }, [lang, tenant?.tenant_id])

  const categories = useMemo(() => [...new Set((posts ?? []).map((p) => p.category).filter(Boolean))], [posts])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (posts ?? []).filter((p) =>
      (!cat || p.category === cat) &&
      (!q || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q) || p.tags?.some((tg) => tg.toLowerCase().includes(q))))
  }, [posts, query, cat])

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-32">
      <div className="mb-10 space-y-2">
        <h1 className="font-display text-4xl md:text-5xl font-semibold">{t.blog.title}</h1>
        <p className="text-muted-foreground">{t.blog.subtitle}</p>
      </div>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative md:w-80">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE) }} placeholder={t.blog.search} className="ps-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={!cat} onClick={() => { setCat(''); setShown(PAGE) }} label={t.blog.all} />
          {categories.map((c) => <FilterChip key={c} active={cat === c} onClick={() => { setCat(c); setShown(PAGE) }} label={c} />)}
        </div>
      </div>

      {posts === null ? (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <PostSkeleton key={i} />)}</div>
      ) : posts.length === 0 ? (
        <Empty message={t.blog.empty} />
      ) : filtered.length === 0 ? (
        <Empty message={t.blog.noResults} />
      ) : (
        <>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, shown).map((p) => <div key={p.id} className="reveal"><BlogCard post={p} /></div>)}
          </div>
          {filtered.length > shown && (
            <div className="mt-12 text-center">
              <Button variant="outline" className="border-border" onClick={() => setShown((s) => s + PAGE)}>{t.blog.loadMore}</Button>
            </div>
          )}
        </>
      )}
    </main>
  )
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className={cn('rounded-full border px-4 py-1.5 text-sm transition-colors',
      active ? 'border-[#c8a45c] gold-text bg-[#c8a45c]/10' : 'border-border text-muted-foreground hover:text-foreground')}>
      {label}
    </button>
  )
}

export function Empty({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-20 text-center text-muted-foreground">{message}</div>
  )
}
