import { useState } from 'react'
import { Facebook, Twitter, Linkedin, Link2, Check, MessageCircle } from 'lucide-react'
import { useT } from '@/i18n'

// Professional share row: WhatsApp, X, Facebook, LinkedIn + copy-link.
export function ShareButtons({ title, path }: { title: string; path: string }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}${window.location.pathname}#${path}`
  const enc = encodeURIComponent

  const links = [
    { icon: MessageCircle, label: 'WhatsApp', href: `https://wa.me/?text=${enc(`${title} ${url}`)}` },
    { icon: Twitter, label: 'X', href: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}` },
    { icon: Facebook, label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { icon: Linkedin, label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
  ]

  async function copy() {
    try { await navigator.clipboard.writeText(url) } catch {
      const ta = document.createElement('textarea')
      ta.value = url; document.body.appendChild(ta); ta.select()
      document.execCommand('copy'); ta.remove()
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const btn = 'flex size-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-[#c8a45c]/50 hover:bg-[#c8a45c]/10 hover:text-[#c8a45c]'
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground">{t.share.label}</span>
      <div className="flex gap-2">
        {links.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={l.label} title={l.label} className={btn}>
            <l.icon className="size-4" />
          </a>
        ))}
        <button onClick={copy} aria-label={t.share.copy} title={t.share.copy} className={btn}>
          {copied ? <Check className="size-4 text-green-500" /> : <Link2 className="size-4" />}
        </button>
      </div>
      {copied && <span className="text-xs text-green-500">{t.share.copied}</span>}
    </div>
  )
}
