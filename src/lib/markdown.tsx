// Lightweight, dependency-free Markdown-lite renderer.
// Supports: ## / ### headings, **bold**, *italic*, [links](url),
// - unordered lists, 1. ordered lists, > quotes, ![images](url), --- hr.
import { Fragment, type ReactNode } from 'react'

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g
  let last = 0, m: RegExpExecArray | null, i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('**')) out.push(<strong key={`${keyBase}-${i}`}>{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('*')) out.push(<em key={`${keyBase}-${i}`}>{tok.slice(1, -1)}</em>)
    else {
      const mm = tok.match(/\[([^\]]+)\]\(([^)\s]+)\)/)!
      out.push(<a key={`${keyBase}-${i}`} href={mm[2]} target="_blank" rel="noopener noreferrer">{mm[1]}</a>)
    }
    last = m.index + tok.length; i++
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function renderMarkdown(md: string): ReactNode[] {
  const lines = (md ?? '').split(/\r?\n/)
  const nodes: ReactNode[] = []
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null
  let quote: string[] = []
  let k = 0

  const flushList = () => {
    if (!list) return
    const items = list.items.map((it, j) => <li key={j}>{inline(it, `li-${k}-${j}`)}</li>)
    nodes.push(list.type === 'ul' ? <ul key={k++}>{items}</ul> : <ol key={k++}>{items}</ol>)
    list = null
  }
  const flushQuote = () => {
    if (!quote.length) return
    nodes.push(<blockquote key={k++}>{quote.map((q, j) => <p key={j}>{inline(q, `q-${k}-${j}`)}</p>)}</blockquote>)
    quote = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (/^-\s+/.test(line)) { flushQuote(); if (!list || list.type !== 'ul') { flushList(); list = { type: 'ul', items: [] } } list.items.push(line.replace(/^-\s+/, '')); continue }
    if (/^\d+\.\s+/.test(line)) { flushQuote(); if (!list || list.type !== 'ol') { flushList(); list = { type: 'ol', items: [] } } list.items.push(line.replace(/^\d+\.\s+/, '')); continue }
    if (/^>\s?/.test(line)) { flushList(); quote.push(line.replace(/^>\s?/, '')); continue }
    flushList(); flushQuote()
    if (!line.trim()) continue
    if (/^###\s+/.test(line)) nodes.push(<h3 key={k++}>{inline(line.replace(/^###\s+/, ''), `h3-${k}`)}</h3>)
    else if (/^##\s+/.test(line)) nodes.push(<h2 key={k++}>{inline(line.replace(/^##\s+/, ''), `h2-${k}`)}</h2>)
    else if (/^#\s+/.test(line)) nodes.push(<h2 key={k++}>{inline(line.replace(/^#\s+/, ''), `h1-${k}`)}</h2>)
    else if (/^---+$/.test(line)) nodes.push(<hr key={k++} />)
    else {
      const img = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/)
      if (img) nodes.push(<img key={k++} src={img[2]} alt={img[1]} loading="lazy" />)
      else nodes.push(<p key={k++}>{inline(line, `p-${k}`)}</p>)
    }
  }
  flushList(); flushQuote()
  return nodes.map((n, i) => <Fragment key={i}>{n}</Fragment>)
}
