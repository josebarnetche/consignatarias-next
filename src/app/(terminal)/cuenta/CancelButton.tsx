'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CancelButton({ subscriptionId }: { subscriptionId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCancel() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/subscribe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'No pudimos cancelar. Probá de nuevo o escribinos.')
        setLoading(false)
        return
      }
      router.refresh()
    } catch {
      setError('Error de red.')
      setLoading(false)
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-zinc-500 hover:text-zinc-300 font-mono text-xs underline-offset-2 hover:underline transition-colors"
      >
        Cancelar suscripción
      </button>
    )
  }

  return (
    <div className="border-l-2 border-amber-400/60 bg-amber-400/5 pl-3 py-2">
      <p className="text-zinc-300 font-mono text-xs mb-3">
        ¿Cancelar? Mantenés el acceso PRO hasta el fin del período actual.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="bg-zinc-200 hover:bg-zinc-100 text-zinc-950 font-mono text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-60"
        >
          {loading ? 'Cancelando…' : 'Sí, cancelar'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="text-zinc-500 hover:text-zinc-300 font-mono text-xs px-3 py-1.5 transition-colors"
        >
          No
        </button>
      </div>
      {error && <p className="mt-2 text-red-400 font-mono text-xs">{error}</p>}
    </div>
  )
}
