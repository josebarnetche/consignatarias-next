'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Botón "Desbloqueá X por N coins" (Fase 3 del gating/karma). Gasta coins ganados
 * en la app para abrir una función — sin pagar plata. Consulta el estado a
 * /api/karma/unlock; si ya está desbloqueado o mientras carga, no renderiza nada
 * (el padre muestra la función). onUnlocked() se llama al desbloquear (o si ya
 * estaba) para que el padre revele el contenido.
 */

interface Status {
  loading: boolean
  loggedIn?: boolean
  unlocked?: boolean
  balance?: number
  cost?: number
  spending?: boolean
  err?: string
}

export default function KarmaUnlockButton({
  unlock,
  label,
  onUnlocked,
}: {
  unlock: string
  label: string
  onUnlocked?: () => void
}) {
  const [s, setS] = useState<Status>({ loading: true })

  useEffect(() => {
    let cancelled = false
    fetch(`/api/karma/unlock?unlock=${encodeURIComponent(unlock)}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setS({ loading: false, ...d })
        if (d.unlocked) onUnlocked?.()
      })
      .catch(() => {
        if (!cancelled) setS({ loading: false, err: 'error' })
      })
    return () => {
      cancelled = true
    }
    // onUnlocked intencionalmente fuera de deps (callback estable del padre)
  }, [unlock]) // eslint-disable-line react-hooks/exhaustive-deps

  const doUnlock = useCallback(async () => {
    setS((prev) => ({ ...prev, spending: true, err: undefined }))
    try {
      const r = await fetch('/api/karma/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ unlock }),
      })
      const d = await r.json()
      if (d.ok) {
        setS((prev) => ({ ...prev, spending: false, unlocked: true, balance: d.balance }))
        onUnlocked?.()
      } else {
        setS((prev) => ({ ...prev, spending: false, err: d.error, balance: d.balance ?? prev.balance, cost: d.cost ?? prev.cost }))
      }
    } catch {
      setS((prev) => ({ ...prev, spending: false, err: 'error' }))
    }
  }, [unlock, onUnlocked])

  if (s.loading || s.unlocked) return null

  const cost = s.cost ?? 0
  const balance = s.balance ?? 0

  if (s.loggedIn === false) {
    return (
      <a
        href="/login"
        className="terminal-btn text-center text-xs"
        style={{ borderColor: 'rgba(56,189,248,0.5)', color: '#38bdf8' }}
      >
        Entrá para usar tus coins
      </a>
    )
  }

  const enough = balance >= cost
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={doUnlock}
        disabled={!enough || s.spending}
        className="terminal-btn text-center text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderColor: 'rgba(56,189,248,0.5)', color: '#38bdf8' }}
      >
        {s.spending ? 'Desbloqueando…' : `Desbloquear ${label} por ${cost} coins →`}
      </button>
      <span className="text-xxs text-zinc-500 font-terminal">
        {enough ? `Tenés ${balance} coins` : `Te faltan ${cost - balance} coins (tenés ${balance})`}
      </span>
    </div>
  )
}
