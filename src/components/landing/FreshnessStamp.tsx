'use client'

import { useEffect, useState } from 'react'

/**
 * Sello de confianza "actualizado hace Xh" — señal de frescura del dato, NO
 * palanca de retención (el plan es explícito). Computa el delta contra
 * Date.now() en el cliente. Si no hay fecha válida, no renderiza nada
 * (soft-hide). Discreto, terminal, es-AR.
 */
export default function FreshnessStamp({ updatedAt }: { updatedAt?: string | null }) {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!updatedAt) return

    const ts = new Date(updatedAt).getTime()
    if (Number.isNaN(ts)) return // fecha inválida → soft-hide

    const diffMs = Date.now() - ts
    if (diffMs < 0) return // fecha futura → no tiene sentido mostrarla

    const mins = Math.floor(diffMs / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)

    let txt: string
    if (mins < 1) txt = 'recién'
    else if (mins < 60) txt = `hace ${mins} ${mins === 1 ? 'minuto' : 'minutos'}`
    else if (hours < 24) txt = `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`
    else txt = `hace ${days} ${days === 1 ? 'día' : 'días'}`

    setLabel(txt)
  }, [updatedAt])

  if (!label) return null

  return (
    <span className="inline-flex items-center gap-1.5 text-xxs font-terminal uppercase tracking-wider text-zinc-500">
      <span className="status-dot-live flex-shrink-0" />
      Actualizado {label}
    </span>
  )
}
