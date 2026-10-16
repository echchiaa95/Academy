/* eslint-disable react-refresh/only-export-components -- context files co-locate the Provider with its hook, the idiomatic React pattern */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ar, type Dict } from './ar'
import { en } from './en'
import { fr } from './fr'

export type Lang = 'ar' | 'en' | 'fr'
const dicts: Record<Lang, Dict> = { ar, en, fr }

type LangCtx = { lang: Lang; setLang: (l: Lang) => void; t: Dict; dir: 'rtl' | 'ltr' }
const Ctx = createContext<LangCtx>({ lang: 'ar', setLang: () => {}, t: ar, dir: 'rtl' })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    // language-specific URLs win first: #/blog/<slug>?lang=fr must actually select French
    const fromUrl = readLangParam()
    if (fromUrl) return fromUrl
    const saved = localStorage.getItem('lang') as Lang | null
    return saved && dicts[saved] ? saved : 'ar'
  })
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
    localStorage.setItem('lang', lang)
  }, [lang, dir])

  // A language URL visited later (client-side hash navigation) also applies its language.
  useEffect(() => {
    const onHash = () => {
      const l = readLangParam()
      if (l) setLangState((cur) => (cur === l ? cur : l))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return <Ctx.Provider value={{ lang, setLang: setLangState, t: dicts[lang], dir }}>{children}</Ctx.Provider>
}

function readLangParam(): Lang | null {
  // hash routing: everything after '#' holds the route + optional query (?lang=fr)
  const hash = window.location.hash
  const q = hash.indexOf('?')
  if (q === -1) return null
  const l = new URLSearchParams(hash.slice(q + 1)).get('lang')
  return l && l in dicts ? (l as Lang) : null
}

export const useLang = () => useContext(Ctx)
export const useT = () => useContext(Ctx).t
