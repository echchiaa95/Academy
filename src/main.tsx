import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { LangProvider } from './i18n'
import { AuthProvider } from './contexts/AuthContext'
import { SiteProvider } from './contexts/SiteContext'
import { Toaster } from '@/components/ui/sonner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <LangProvider>
        <AuthProvider>
          <SiteProvider>
            <App />
            <Toaster position="top-center" richColors closeButton />
          </SiteProvider>
        </AuthProvider>
      </LangProvider>
    </HashRouter>
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
