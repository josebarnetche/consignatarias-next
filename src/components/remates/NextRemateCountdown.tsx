'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export interface NextRemate {
  consignatariaName: string
  /** YYYY-MM-DD */
  date: string
  /** HH:MM (opcional; si falta asumimos 11:00, hora típica de feria). */
  time?: string
  province?: string
  slug?: string
}

/** Convierte date+time del remate a un timestamp local (ms). */
function targetMs(r: NextRemate): number {
  const [h, m] = (r.time ?? '11:00').split(':')
  const d = new Date(`${r.date}T00:00:00`)
  d.setHours(Number(h) || 11, Number(m) || 0, 0, 0)
  return d.getTime()
}

/**
 * Countdown "Próximo remate en Xh Ym" — el cómputo vive en el cliente contra
 * Date.now(), corrige que /remates resuelva la fecha en build. Si el remate ya
 * pasó (delta<0) o no hay nextRemate, no renderiza.
 */
export default function NextRemateCountdown({ nextRemate }: { nextRemate: NextRemate | null }) {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!nextRemate) return
    const target = targetMs(nextRemate)

    const tick = () => {
      const delta = target - Date.now()
      if (delta < 0) {
        setLabel(null)
        return
      }
      const totalMin = Math.floor(delta / 60000)
      const days = Math.floor(totalMin / 1440)
      const hours = Math.floor((totalMin % 1440) / 60)
      const mins = totalMin % 60
      const time = days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours}h ${mins}m`
      setLabel(time)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [nextRemate])

  if (!nextRemate || !label) return null

  const body = (
    <span className="inline-flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-[#f87171] animate-pulse flex-shrink-0" />
      <span className="font-terminal tabular-nums">
        Próximo remate en {label}
        <span className="text-zinc-500"> · </span>
        <span className="text-zinc-300">{nextRemate.consignatariaName}</span>
        {nextRemate.province && <span className="text-zinc-500"> · {nextRemate.province}</span>}
      </span>
    </span>
  )

  const cls =
    'inline-flex items-center text-xxs font-terminal text-zinc-400 hover:text-zinc-200 motion-hover'

  return nextRemate.slug ? (
    <Link href={`/consignatarias/${nextRemate.slug}`} className={cls}>
      {body}
    </Link>
  ) : (
    <span className={cls}>{body}</span>
  )
}
