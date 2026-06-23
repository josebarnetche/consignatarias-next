import type { Metadata } from 'next'
import Link from 'next/link'
import UnsubscribeConfirm from './UnsubscribeConfirm'

export const metadata: Metadata = {
  title: 'Darse de baja — consignatarias.com.ar',
  robots: { index: false, follow: false },
}

/**
 * Página de baja a la que apuntan TODOS los emails (footer "Desuscribirme") y a
 * la que redirige el one-click /api/newsletter/unsubscribe. Antes no existía →
 * el link de baja daba 404 en todos los envíos. La baja real la hace el endpoint
 * POST; esta página solo confirma (prefetch-safe).
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; ok?: string }>
}) {
  const { email = '', ok } = await searchParams

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-terminal-bg">
      <div className="terminal-panel max-w-md w-full">
        <div className="terminal-panel-header text-zinc-200 text-label tracking-widest">Baja de avisos</div>
        <div className="px-panel py-6">
          <UnsubscribeConfirm email={email} alreadyDone={ok === '1'} />
          <div className="mt-6 pt-4 border-t border-terminal-border">
            <Link href="/" className="text-xxs font-terminal uppercase tracking-wider text-accent hover:text-accent-bright transition-colors">
              ← Volver a consignatarias.com.ar
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
