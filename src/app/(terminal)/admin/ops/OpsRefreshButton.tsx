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
        <span className="text-xxs text-zinc-500 font-terminal tabular-nums" aria-live="polite">
          ↻ {lastRefresh}
        </span>
      )}
      <button
        type="button"
        onClick={refresh}
        disabled={isPending}
        className="terminal-btn gap-1.5 disabled:opacity-50"
        title="Traer eventos y crons nuevos"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} aria-hidden />
        {isPending ? 'Actualizando…' : 'Actualizar'}
      </button>
    </div>
  )
}
