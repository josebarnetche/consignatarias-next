'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Post-payment "activando" state for PRO Usuario when the Rebill webhook hasn't
 * landed yet (the redirect races the webhook). Polls /api/subscription-status; once
 * the DB confirms PRO it refreshes the server component, which then renders the
 * success banner AND fires the GA4 conversion. Removes the "I paid but it says FREE"
 * moment that previously looked like a failed payment.
 */
export function UpgradeActivating() {
  const router = useRouter()
  const [tries, setTries] = useState(0)
  const [gaveUp, setGaveUp] = useState(false)

  useEffect(() => {
    if (gaveUp) return
    if (tries >= 20) {
      // ~60s of polling; the webhook normally lands in seconds.
      setGaveUp(true)
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/subscription-status', { cache: 'no-store' })
        const data = await res.json()
        if (data?.status === 'active') {
          router.refresh()
          return
        }
      } catch {
        /* transient — keep polling */
      }
      setTries((n) => n + 1)
    }, 3000)
    return () => clearTimeout(t)
  }, [tries, gaveUp, router])

  return (
    <div className="mb-8 rounded-2xl border border-emerald-500/30 bg-zinc-900/40 p-6 text-center">
      {!gaveUp ? (
        <>
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
          <p className="font-mono text-sm text-zinc-200">Activando tu PRO…</p>
          <p className="mt-1 font-mono text-xs text-zinc-500">
            Tu pago se está confirmando. Puede tardar hasta un minuto — no cierres esta página.
          </p>
        </>
      ) : (
        <>
          <p className="font-mono text-sm text-zinc-200">Tu pago se está procesando.</p>
          <p className="mt-1 font-mono text-xs text-zinc-500">
            Está tardando más de lo normal. Si seguís viendo FREE, escribinos a{' '}
            <a href="mailto:agro@memola.com.ar" className="text-emerald-400 hover:text-emerald-300">
              agro@memola.com.ar
            </a>{' '}
            con tu comprobante y lo activamos.
          </p>
        </>
      )}
    </div>
  )
}
