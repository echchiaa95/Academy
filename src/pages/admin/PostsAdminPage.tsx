import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Plus, Pencil, Star, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { useT, useLang } from '@/i18n'
import { listPosts, deletePost, upsertPost } from '@/lib/api'
import { useAdminTenantId } from '@/hooks/useAdminTenant'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { ConfirmDelete } from '@/components/admin/ConfirmDelete'
import type { Post } from '@/types'

export default function PostsAdminPage() {
  const t = useT()
  const { lang } = useLang()
  const [posts, setPosts] = useState<Post[] | null>(null)
  const tid = useAdminTenantId()
  const load = () => listPosts(tid).then(setPosts).catch(() => setPosts([]))
  useEffect(() => { load() }, [tid])

  async function toggle(p: Post, field: 'published' | 'featured') {
    // When publishing a post that has no publish date yet, stamp it now().
    // Unpublishing keeps the previous published_at (history preserved).
    const patch: Partial<Post> = { id: p.id, tenant_id: tid, [field]: !p[field] }
    if (field === 'published' && !p.published && !p.published_at) patch.published_at = new Date().toISOString()
    try { await upsertPost(patch); toast.success(t.admin.saved); load() }
    catch { toast.error(t.admin.saveError) }
  }
  async function remove(id: string) {
    try { await deletePost(id); toast.success(t.admin.deleted); load() }
    catch { toast.error(t.admin.saveError) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl gold-text">{t.admin.posts}</h1>
        <Button asChild className="bg-[#c8a45c] text-stone-900 hover:bg-[#d9b56e]"><Link to="/admin/posts/new"><Plus className="size-4" /> {t.admin.new}</Link></Button>
      </div>
      {posts === null ? <p className="text-muted-foreground">{t.states.loading}</p> : posts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">{t.admin.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl glass">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-border text-start text-xs text-muted-foreground">
              <th className="p-3 text-start font-medium">{t.admin.form.title}</th>
              <th className="p-3 text-start font-medium">{t.admin.form.category}</th>
              <th className="p-3 text-start font-medium">{t.admin.form.publishedAt}</th>
              <th className="p-3 text-start font-medium">{t.admin.actions}</th>
            </tr></thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b border-border/40 last:border-0">
                  <td className="p-3 max-w-56"><span className="line-clamp-1 font-medium">{p.title}</span></td>
                  <td className="p-3 text-muted-foreground">{p.category}</td>
                  <td className="p-3 text-muted-foreground">{formatDate(p.published_at, lang)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" title={p.published ? t.admin.unpublish : t.admin.publish}
                        className={p.published ? 'text-emerald-400' : 'text-muted-foreground'} onClick={() => toggle(p, 'published')}>
                        <Globe className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title={p.featured ? t.admin.unfeature : t.admin.feature}
                        className={p.featured ? 'gold-text' : 'text-muted-foreground'} onClick={() => toggle(p, 'featured')}>
                        <Star className="size-4" fill={p.featured ? 'currentColor' : 'none'} />
                      </Button>
                      <Button asChild variant="ghost" size="icon" title={t.admin.edit}><Link to={`/admin/posts/${p.id}`}><Pencil className="size-4" /></Link></Button>
                      <ConfirmDelete message={t.admin.confirmDeletePost} onConfirm={() => remove(p.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
