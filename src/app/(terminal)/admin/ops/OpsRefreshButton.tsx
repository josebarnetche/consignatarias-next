'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

/**
 * Botón de refresh para /admin/ops. La página es un Server Component con
 * `dynamic = 'force-dynamic'`, así que `router.refresh()` re-ejecuta el fetch
 * server-side (ops_events + cron_runs) y trae los movimientos nuevos sin recargar
 * toda la página ni perder scroll. Muestra la hora del último refresh.
 */
export function OpsRefreshButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)

  const refresh = () => {
    startTransition(() => {
      router.refresh()
      setLastRefresh(new Date().toLocaleTimeString('es-AR'))
    })
  }

  return (
    <div className="flex items-center gap-2">
      {lastRefresh && (
        <span className="text-xxs text-zinc-600 font-terminal tabular-nums">
          ↻ {lastRefresh}
        </span>
      )}
      <button
        type="button"
        onClick={refresh}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded border border-terminal-border px-2 py-1 text-xxs font-terminal uppercase tracking-wider text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-50"
        title="Traer eventos y crons nuevos"
      >
        <RefreshCw className={`h-3 w-3 ${isPending ? 'animate-spin' : ''}`} />
        {isPending ? 'Actualizando…' : 'Actualizar'}
      </button>
    </div>
  )
}
