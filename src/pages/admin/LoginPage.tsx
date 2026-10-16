import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/i18n'
import { isDemo } from '@/lib/api'
import { useSEO } from '@/hooks/useSEO'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const t = useT()
  const { signIn } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  useSEO({ noindex: true })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const err = await signIn(email, password)
    setBusy(false)
    if (err) toast.error(err === 'demo' ? t.admin.demoLogin : t.admin.loginError)
    else nav('/admin')
  }

  return (
    <main className="flex min-h-[85vh] items-center justify-center px-5 pt-16">
      <form onSubmit={submit} className="w-full max-w-sm space-y-6 rounded-2xl glass p-8">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-3xl gold-text">{t.admin.login}</h1>
          <p className="text-sm text-muted-foreground">{t.admin.loginSubtitle}</p>
        </div>
        {isDemo && <p className="rounded-lg border border-[#c8a45c]/30 bg-[#c8a45c]/5 p-3 text-xs leading-5 text-muted-foreground">{t.admin.demoLogin}</p>}
        <div className="space-y-1.5">
          <Label>{t.admin.form.email}</Label>
          <Input type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t.admin.password}</Label>
          <Input type="password" required dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy || isDemo} className="w-full bg-[#c8a45c] text-stone-900 hover:bg-[#d9b56e]">
          {busy ? t.admin.signingIn : t.admin.signIn}
        </Button>
      </form>
    </main>
  )
}
