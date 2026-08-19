'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSessionTier } from '@/lib/use-session-tier'

interface LoginGateProps {
  children: React.ReactNode
  /** Qué es lo que se está tapando. Ej: "el catálogo y el contacto". */
  feature?: string
  /** Alto del placeholder mientras resuelve la sesión, para no saltar el layout. */
  minHeight?: number
  /** Destino post-login. Por defecto, la ruta actual. */
  redirectTo?: string
  /** Qué ve el anónimo en lugar del contenido (la forma de la página se mantiene). */
  preview?: React.ReactNode
}

/**
 * LoginGate — modelo "preview + detalle bajo login".
 *
 * La página sigue siendo indexable: lo básico se renderiza siempre y esto tapa
 * solo el detalle. Google ve exactamente lo mismo que un visitante anónimo (el
 * panel cerrado), así que no hay contenido servido distinto al bot.
 *
 * Cliente a propósito: las landings son SSG y leer la cookie en el server las
 * volvería dinámicas. Mientras resuelve la sesión no se muestra ni el contenido
 * ni el cartel — un placeholder de la misma altura evita el salto de layout.
 */
export default function LoginGate({
  children,
  feature,
  minHeight = 120,
  redirectTo,
  preview,
}: LoginGateProps) {
  const { loggedIn, loading } = useSessionTier()
  const pathname = usePathname()

  if (loading) {
    return (
      <div
        aria-hidden="true"
        className="rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse"
        style={{ minHeight }}
      />
    )
  }

  if (loggedIn) return <>{children}</>

  // Solo rutas propias: `redirectTo` puede venir de un caller que pasa una clave
  // de analytics en vez de un path.
  const candidate = redirectTo || pathname || '/'
  const next = candidate.startsWith('/') ? candidate : pathname || '/'

  return (
    <>
    {preview}
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60">
      <div className="px-6 py-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-200 font-medium mb-1">
            🔒 {feature ? `${feature} — ` : ''}Ingresá para ver el detalle completo
          </p>
          <p className="text-xs text-zinc-500">
            Es gratis y toma veinte segundos. Entrás con Google o con tu mail.
          </p>
        </div>
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium transition-colors"
        >
          Ingresar
        </Link>
      </div>
    </div>
    </>
  )
}
