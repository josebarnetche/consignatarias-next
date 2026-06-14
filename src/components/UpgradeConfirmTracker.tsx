'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { trackProUpgrade } from '@/lib/analytics'

interface Props {
  /**
   * True only when the subscription is DB-confirmed active/PRO — server-verified
   * tier or a polled subscription-status check. NEVER pass the bare `?upgraded=true`
   * param here: a user can land on that URL without the webhook having activated PRO.
   */
  confirmed: boolean
  /** Plan name for the GA4 event (e.g. 'PRO_USER', 'PRO_CONSIGNATARIA'). */
  plan: string
  /** Plan price in ARS, for the conversion value. */
  price: number
  /** Stable id (rebill_subscription_id) to dedupe the conversion across refresh/return. */
  dedupeId?: string | null
}

/**
 * Fires the GA4 `pro_upgrade` conversion exactly once, and ONLY when the
 * subscription is DB-confirmed — never on the bare `?upgraded=true` redirect
 * param. Mount on every post-checkout landing surface (/cuenta, /dashboard);
 * the parent decides `confirmed` from server-verified tier or a polled
 * subscription-status check.
 *
 * After firing it strips `?upgraded` from the URL so a refresh can't replay the
 * success state or double-count the conversion.
 */
export function UpgradeConfirmTracker({ confirmed, plan, price, dedupeId }: Props) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const justUpgraded = searchParams.get('upgraded') === 'true'

  useEffect(() => {
    // Only act on the post-checkout return, and only once the DB confirms PRO.
    if (!justUpgraded || !confirmed) return

    const key = `pro_upgrade_fired:${dedupeId || plan}`
    let alreadyFired = false
    try {
      alreadyFired = sessionStorage.getItem(key) === '1'
    } catch {
      /* storage unavailable — fall through and fire once for this mount */
    }

    if (!alreadyFired) {
      let source: string | null = null
      try {
        source = sessionStorage.getItem('pro_checkout_source')
      } catch {
        /* ignore */
      }
      trackProUpgrade(plan, price, source, dedupeId)
      try {
        sessionStorage.setItem(key, '1')
        sessionStorage.removeItem('pro_checkout_source')
      } catch {
        /* ignore */
      }
    }

    // Strip ?upgraded so a refresh can't replay the success state / re-count.
    const params = new URLSearchParams(searchParams.toString())
    params.delete('upgraded')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [justUpgraded, confirmed, plan, price, dedupeId, pathname, router, searchParams])

  return null
}
