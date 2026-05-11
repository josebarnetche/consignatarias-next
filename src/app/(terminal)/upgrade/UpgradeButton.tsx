'use client'

import { useState } from 'react'

export function UpgradeButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpgrade() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/subscribe/checkout', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data?.checkoutUrl) {
        setError(data?.error || 'No pudimos generar el link de pago. Intentá de nuevo.')
        setLoading(false)
        return
      }
      // redirect to Rebill checkout
      window.location.href = data.checkoutUrl
    } catch {
      setError('Error de red. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="w-full bg-sky-400 hover:bg-sky-300 active:bg-sky-500 text-zinc-950 font-mono font-bold uppercase tracking-widest text-sm px-6 py-4 rounded transition-colors disabled:opacity-60 disabled:cursor-wait"
      >
        {loading ? 'Generando link de pago…' : 'Activar PRO · ARS $7.900/mes →'}
      </button>
      {error && (
        <p className="mt-3 text-red-400 font-mono text-xs text-center">{error}</p>
      )}
    </div>
  )
}
