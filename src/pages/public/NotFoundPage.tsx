import { Link } from 'react-router'
import { useT } from '@/i18n'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  const t = useT()
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="font-display text-8xl gold-text">404</span>
      <h1 className="font-display text-3xl">{t.states.notFound}</h1>
      <p className="text-muted-foreground">{t.states.notFoundDesc}</p>
      <Button asChild className="bg-[#c8a45c] text-stone-900 hover:bg-[#d9b56e]"><Link to="/">{t.states.goHome}</Link></Button>
    </main>
  )
}
