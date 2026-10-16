import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useT, useLang } from '@/i18n'
import { useSite } from '@/contexts/SiteContext'
import { listPostsLocalized } from '@/lib/api'
import { BlogCard } from '@/components/blog/BlogCard'
import { SectionHeading } from './SectionHeading'
import { PostSkeleton } from '@/components/ui/skeletons'
import { Button } from '@/components/ui/button'
import type { Post } from '@/types'

export function FeaturedPostsSection() {
  const t = useT()
  const { lang } = useLang()
  const { settings, tenant } = useSite()
  const [posts, setPosts] = useState<Post[] | null>(null)

  useEffect(() => {
    const limit = settings?.posts_per_page ?? 3
    listPostsLocalized(tenant?.tenant_id, lang, { publishedOnly: true, featuredOnly: true, limit })
      // No posts flagged as "featured" yet → fall back to the latest published ones
      // so the homepage never renders an empty section.
      .then((featured) => featured.length > 0
        ? featured
        : listPostsLocalized(tenant?.tenant_id, lang, { publishedOnly: true, limit }))
      .then(setPosts).catch(() => setPosts([]))
  }, [settings?.posts_per_page, lang, tenant?.tenant_id])

  if (posts && posts.length === 0) return null
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <SectionHeading title={t.sections.featuredPosts} subtitle={t.blog.subtitle} />
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts === null
          ? Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
          : posts.map((p, i) => <div key={p.id} className="reveal" style={{ transitionDelay: `${i * 80}ms` }}><BlogCard post={p} /></div>)}
      </div>
      <div className="reveal mt-10 text-center">
        <Button asChild variant="outline" className="border-border"><Link to="/blog">{t.nav.blog}</Link></Button>
      </div>
    </section>
  )
}
