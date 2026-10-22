import type { Metadata } from 'next'
import Link from 'next/link'
import ConfirmarPedido from './ConfirmarPedido'

export const metadata: Metadata = {
  title: 'Confirmar pedido',
  robots: { index: false, follow: false },
}

/**
 * Destino del link del doble opt-in (src/lib/agente/confirmacion.ts). Prefetch-safe:
 * la página no confirma nada sola; el botón hace el POST.
 */
export default async function ConfirmarPedidoPage({ searchParams }: { searchParams: Promise<{ lead?: string; t?: string }> }) {
  const { lead = '', t = '' } = await searchParams
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-terminal-bg">
      <div className="terminal-panel max-w-md w-full">
        <div className="terminal-panel-header text-zinc-200 text-label tracking-widest">Confirmar pedido</div>
        <div className="px-panel py-6">
          <ConfirmarPedido lead={lead} token={t} />
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
