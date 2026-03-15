import { Metadata } from 'next'
import { Suspense } from 'react'
import LoginClient from './LoginClient'

export const metadata: Metadata = {
  title: 'Ingresar | Consignatarias.com.ar',
  robots: { index: false, follow: false },
}

function LoginFallback() {
  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <div className="terminal-panel">
        <div className="terminal-panel-header">
          <span className="text-zinc-200 text-label tracking-widest">INGRESAR</span>
        </div>
        <div className="px-panel py-6 text-center">
          <span className="text-zinc-500 text-data">Cargando...</span>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  )
}
