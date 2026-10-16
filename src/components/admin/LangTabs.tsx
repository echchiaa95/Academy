import { Check } from 'lucide-react'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { LANGS, LANG_LABELS } from './lang-utils'
import type { LangCode } from '@/types'

/**
 * Language selector for admin editors.
 * Shows which languages already have content; switching never copies or
 * overwrites another language — each language is an independent record.
 */
export function LangTabs({ active, baseLang, langsWithContent, onSwitch, copySlot }: {
  active: LangCode
  baseLang: LangCode
  langsWithContent: LangCode[]
  onSwitch: (l: LangCode | null) => void
  copySlot?: React.ReactNode
}) {
  const t = useT()
  return (
    <div className="space-y-3 rounded-xl glass p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">{t.admin.contentLang}:</span>
        {LANGS.map((l) => {
          const isActive = l === active
          const has = langsWithContent.includes(l)
          return (
            <button key={l} type="button" onClick={() => onSwitch(l === baseLang ? null : l)}
              className={cn('flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                isActive ? 'border-[#c8a45c] bg-[#c8a45c]/15 gold-text' : 'border-border text-muted-foreground hover:border-[#c8a45c]/40')}>
              {LANG_LABELS[l]}
              {l === baseLang && <span className="text-[10px] opacity-70">({t.admin.baseLang})</span>}
              {has && <Check className="size-3 text-green-500" />}
            </button>
          )
        })}
      </div>
      {active !== baseLang && !langsWithContent.includes(active) && (
        <p className="text-xs text-muted-foreground">{t.admin.noTranslationYet.replace('{lang}', LANG_LABELS[active])}</p>
      )}
      {copySlot}
    </div>
  )
}
