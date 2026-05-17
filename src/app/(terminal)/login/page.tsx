import { Metadata } from 'next'
import { Suspense } from 'react'
import LoginClient from './LoginClient'

export const metadata: Metadata = {
  title: 'Ingresar',
  robots: { index: false, follow: false },
}

function LoginFallback() {
  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      {/* SEO-friendly SSR heading */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-medium text-zinc-100 mb-2">Ingresá a tu cuenta</h1>
        <p className="text-sm text-zinc-500">
          Accedé al panel de tu consignataria: gestioná remates, subí resultados y promocioná tu perfil.
        </p>
      </div>
      <div className="terminal-panel">
        <div className="terminal-panel-header">
          <span className="text-zinc-200 text-label tracking-widest">INGRESAR</span>
        </div>
        <div className="px-panel py-6 text-center">
          <span className="text-zinc-500 text-data">Cargando...</span>
        </div>
      </div>
      {/* Benefits for SEO */}
      <div className="mt-6 text-center text-xxs text-zinc-600 space-y-1">
        <p>✓ Verificá y destacá tu perfil de consignataria</p>
        <p>✓ Publicá remates con catálogos y transmisiones</p>
        <p>✓ Recibí alertas y estadísticas de tu cuenta</p>
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
