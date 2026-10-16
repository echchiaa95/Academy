import { Link } from 'react-router'
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react'
import { useLang, useT } from '@/i18n'
import { formatDate, readingMinutes } from '@/lib/format'
import { ImagePlaceholder } from '@/components/ui/placeholder'
import type { Post } from '@/types'

export function BlogCard({ post, large = false }: { post: Post; large?: boolean }) {
  const t = useT()
  const { lang, dir } = useLang()
  const Arrow = dir === 'rtl' ? ArrowUpLeft : ArrowUpRight
  return (
    <Link to={`/blog/${post.slug}`} className="group block">
      <article className="img-zoom">
        <div className={`relative overflow-hidden rounded-xl ${large ? 'aspect-[16/9]' : 'aspect-[16/10]'}`}>
          {post.cover_url
            ? <img src={post.cover_url} alt={post.title} loading="lazy" className="size-full object-cover" />
            : <ImagePlaceholder className="size-full rounded-xl" />}
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
          {post.category && (
            <span className="absolute top-3 start-3 rounded-full glass px-3 py-1 text-[11px] tracking-wide gold-text">{post.category}</span>
          )}
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <time>{formatDate(post.published_at, lang)}</time>
            <span className="size-1 rounded-full bg-border" />
            <span>{readingMinutes(post.content)} {t.blog.minRead}</span>
          </div>
          <h3 className={`font-display font-semibold leading-snug transition-colors group-hover:text-[#c8a45c] ${large ? 'text-2xl md:text-3xl' : 'text-xl'}`}>
            {post.title}
          </h3>
          <p className="text-sm leading-6 text-muted-foreground line-clamp-2">{post.excerpt}</p>
          <span className="inline-flex items-center gap-1.5 pt-1 text-sm gold-text">
            {t.blog.readMore} <Arrow className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
          </span>
        </div>
      </article>
    </Link>
  )
}
