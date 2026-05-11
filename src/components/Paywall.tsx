/**
 * Componentes visuales puros para gating. Sin lógica server-side.
 * Pueden ser importados desde server components y client components.
 */

import Link from 'next/link'

interface PaywallProps {
  /** True = usuario logged-in pero free. False = anonymous (mostrar login en vez de upgrade) */
  loggedIn: boolean
  /** Subject feature (override generic copy). Ej: "Los medios de pago" */
  feature?: string
  /** Redirect path after upgrade/login. */
  redirectTo?: string
}

/**
 * PaywallCard — para gating de contenido PRO.
 * - Anonymous → "Continuá con Google"
 * - Free logged-in → "Activar PRO →"
 */
export function PaywallCard({ loggedIn, feature, redirectTo }: PaywallProps) {
  const upgradeHref = redirectTo
    ? `/upgrade?next=${encodeURIComponent(redirectTo)}`
    : '/upgrade'
  const loginHref = redirectTo
    ? `/login?next=${encodeURIComponent(redirectTo)}`
    : '/login'

  const headline = feature
    ? `${feature} es contenido PRO.`
    : 'Esta sección es contenido PRO.'

  return (
    <div className="relative overflow-hidden border border-sky-500/30 bg-zinc-900/40 rounded-lg p-6 my-4">
      <div className="absolute top-0 right-0 w-64 h-32 bg-sky-500/5 blur-3xl rounded-full pointer-events-none" />

      <div className="relative flex items-start gap-4">
        <svg
          className="w-5 h-5 text-sky-400 mt-0.5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-zinc-200 font-mono text-sm mb-1.5">{headline}</p>
          <p className="text-zinc-400 font-mono text-xs leading-relaxed mb-4">
            PRO te da acceso ilimitado al detalle de remates, perfiles, filtros avanzados,
            medios de pago de cada consignataria y descargas premium. ARS $7.900/mes ·
            cancelás cuando quieras.
          </p>
          {loggedIn ? (
            <Link
              href={upgradeHref}
              className="inline-flex items-center gap-2 bg-sky-400 hover:bg-sky-300 active:bg-sky-500 text-zinc-950 font-mono font-bold uppercase tracking-widest text-xs px-4 py-2 rounded transition-colors"
            >
              Activar PRO →
            </Link>
          ) : (
            <Link
              href={loginHref}
              className="inline-flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 font-mono font-medium text-xs px-4 py-2 rounded transition-colors"
            >
              <GoogleIcon />
              Continuá con Google
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * AuthLockCard — para gating de "ver más" simple (no requiere PRO, solo logged-in).
 */
export function AuthLockCard({ redirectTo }: { redirectTo?: string }) {
  const loginHref = redirectTo
    ? `/login?next=${encodeURIComponent(redirectTo)}`
    : '/login'

  return (
    <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-6 my-4">
      <div className="flex items-start gap-4">
        <svg
          className="w-5 h-5 text-zinc-500 mt-0.5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
        <div className="flex-1">
          <p className="text-zinc-300 font-mono text-sm mb-1">
            Sumate para ver el detalle completo.
          </p>
          <p className="text-zinc-500 font-mono text-xs mb-4">
            Gratis · sin tarjeta · sin trial.
          </p>
          <Link
            href={loginHref}
            className="inline-flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 font-mono font-medium text-sm px-4 py-2 rounded transition-colors"
          >
            <GoogleIcon />
            Continuá con Google
          </Link>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
