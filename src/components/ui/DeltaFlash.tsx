'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/* ================================================================== */
/*  DeltaFlash (DESIGN-SYSTEM.md §5)                                   */
/*  Al cambiar/cargar un dato vivo (INMAG, precio, remate en vivo) hace */
/*  un wash de color al ~8% sobre el FONDO del contenedor → transparente */
/*  en motion-slow (400ms). El número `tabular-nums` queda FIJO: nunca  */
/*  salta el layout. Vende "terminal viva" sin tocar legibilidad.       */
/*                                                                      */
/*  SSR-safe: el primer render no flashea (el valor inicial es el dato  */
/*  server-rendered, no un "cambio"). Solo flashea en cambios reales.   */
/*  Degrada a no-op con prefers-reduced-motion (clases neutralizadas).  */
/* ================================================================== */

interface DeltaFlashProps {
  children: ReactNode
  /**
   * Valor a vigilar. Cuando cambia respecto al render anterior, dispara el
   * flash. Pasá el número/string del dato vivo (ej. el precio INMAG).
   */
  value: number | string | null | undefined
  /**
   * Color del flash:
   *  - 'auto' (default): compara contra el valor previo numérico → positive
   *    si subió, negative si bajó, live si no es comparable.
   *  - 'positive' | 'negative' | 'live': forzado.
   */
  tone?: 'auto' | 'positive' | 'negative' | 'live'
  className?: string
}

type FlashTone = 'positive' | 'negative' | 'live'

export default function DeltaFlash({
  children,
  value,
  tone = 'auto',
  className = '',
}: DeltaFlashProps) {
  const prev = useRef(value)
  const [flash, setFlash] = useState<FlashTone | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Primer valor: no flashea (es el estado server-rendered, no un cambio).
    if (Object.is(prev.current, value)) return

    let t: FlashTone
    if (tone === 'auto') {
      const a = typeof prev.current === 'number' ? prev.current : Number(prev.current)
      const b = typeof value === 'number' ? value : Number(value)
      if (!Number.isNaN(a) && !Number.isNaN(b) && a !== b) {
        t = b > a ? 'positive' : 'negative'
      } else {
        t = 'live'
      }
    } else {
      t = tone
    }

    prev.current = value
    setFlash(t)
    if (timer.current) clearTimeout(timer.current)
    // Quita la clase tras el ciclo de animación para poder re-dispararla.
    timer.current = setTimeout(() => setFlash(null), 450)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [value, tone])

  return (
    <span
      className={`inline-block rounded-[2px] ${
        flash ? `delta-flash-${flash}` : ''
      } ${className}`.trim()}
    >
      {children}
    </span>
  )
}
