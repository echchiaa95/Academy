import { useEffect } from 'react'

// Reveal-on-scroll: add class "reveal" to any element; it animates in when visible.
// A MutationObserver keeps watching for elements added AFTER the first run
// (async-fetched cards, tab switches) so nothing stays invisible.
export function useReveal(dep: unknown[] = []) {
  useEffect(() => {
    const io = ('IntersectionObserver' in window)
      ? new IntersectionObserver((entries) => {
          entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-visible'); io?.unobserve(en.target) } })
        }, { threshold: 0.12 })
      : null

    const bind = (root: ParentNode) => {
      root.querySelectorAll('.reveal:not(.is-visible)').forEach((e) => {
        if (io) io.observe(e)
        else e.classList.add('is-visible')
      })
    }
    bind(document)

    const mo = new MutationObserver((muts) => {
      muts.forEach((m) => m.addedNodes.forEach((n) => {
        if (!(n instanceof HTMLElement)) return
        if (n.classList?.contains('reveal') && !n.classList.contains('is-visible')) {
          if (io) io.observe(n); else n.classList.add('is-visible')
        }
        bind(n)
      }))
    })
    mo.observe(document.body, { childList: true, subtree: true })

    return () => { io?.disconnect(); mo.disconnect() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dep)
}
