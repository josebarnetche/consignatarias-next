'use client'

/**
 * <PujaLive /> — la puja del remate como ticker de mercado.
 *
 * Recibe los bloques de transcripción (cada uno trae su escalera de pujas:
 * los precios cantados en orden de locución) y los reproduce a ~1 por
 * segundo: número grande estilo terminal que parpadea verde cuando sube.
 * Casi siempre parpadea verde — en un remate la puja solo sube; el rojo
 * aparece únicamente al resetear en el lote siguiente.
 *
 * El stream llega con ~30-60s de retraso (transcripción automática), así que
 * esto es una REPRODUCCIÓN del canto real, no una cotización instantánea.
 */
import { useEffect, useRef, useState } from 'react'

interface Block { id: number; pujas: number[] }

const ars = (n: number) => '$' + n.toLocaleString('es-AR')

export default function PujaLive({ blocks }: { blocks: Block[] }) {
  const [display, setDisplay] = useState<{ v: number; up: boolean; tick: number } | null>(null)
  const queue = useRef<number[]>([])
  const seen = useRef<Set<number>>(new Set())
  const last = useRef<number | null>(null)

  // Encolar las pujas de bloques nuevos (dedup por id de bloque).
  useEffect(() => {
    const primeros = seen.current.size === 0
    for (const b of blocks) {
      if (b.id == null || seen.current.has(b.id)) continue
      seen.current.add(b.id)
      if (b.pujas?.length) queue.current.push(...b.pujas)
    }
    // Al entrar a la página no repasamos la historia entera: arrancamos
    // desde las últimas pujas y de ahí en más es flujo vivo.
    if (primeros && queue.current.length > 10) {
      queue.current = queue.current.slice(-10)
    }
  }, [blocks])

  // El corazón del ticker: una puja por segundo.
  useEffect(() => {
    const id = setInterval(() => {
      const q = queue.current
      if (!q.length) return
      // Si nos atrasamos mucho contra el vivo, saltamos al presente.
      if (q.length > 25) q.splice(0, q.length - 25)
      const v = q.shift()!
      setDisplay((d) => ({
        v,
        up: last.current === null || v >= last.current,
        tick: (d?.tick ?? 0) + 1,
      }))
      last.current = v
    }, 1000)
    return () => clearInterval(id)
  }, [])

  if (!display) return null

  return (
    <div className="mb-3">
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">Puja</span>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
      </div>
      <div
        key={display.tick}
        className={`font-mono text-3xl sm:text-4xl font-semibold tabular-nums transition-colors duration-700 ${
          display.up ? 'text-emerald-400' : 'text-red-400'
        }`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {ars(display.v)}
        <span className={`ml-2 text-base align-middle ${display.up ? 'text-emerald-500' : 'text-red-500'}`}>
          {display.up ? '▲' : '▼'}
        </span>
      </div>
      <div className="text-[10px] text-zinc-600">
        canto reproducido · ~1 min detrás del vivo
      </div>
    </div>
  )
}
