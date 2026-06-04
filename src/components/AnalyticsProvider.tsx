'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { trackPageView, trackEvent } from '@/lib/analytics'

/**
 * Tracks GA4 pageviews on every Next.js App Router navigation.
 * Without this, only the first page load is tracked — SPA
 * navigations (Link clicks) are invisible to GA4.
 */
function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    trackPageView(url)
  }, [pathname, searchParams])

  return null
}

/**
 * AI-referral detection. Fires a first-class GA4 event `ai_referral` when a visitor
 * arrives FROM an AI engine (per document.referrer), with `ai_engine` + `landing_page`.
 *
 * Why: GA4 splits AI traffic across Referral/Unassigned (chatgpt.com shows up in both),
 * and custom channel groups aren't visible via the Data API — so AI traffic is neither
 * unified nor queryable. This event makes "traffic from AI" measurable + attributable,
 * feeding the thesis metric (are we the source AI cites?). Fires once per tab/session.
 *
 * Limitation: only catches engines that pass a referrer (ChatGPT does). Engines that
 * strip the referrer land as Direct and are undetectable client-side.
 */
const AI_ENGINES: Array<[RegExp, string]> = [
  [/(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$|(^|\.)openai\.com$/i, 'chatgpt'],
  [/(^|\.)perplexity\.ai$/i, 'perplexity'],
  [/(^|\.)copilot\.microsoft\.com$|(^|\.)copilot\.com$/i, 'copilot'],
  [/(^|\.)gemini\.google\.com$|(^|\.)bard\.google\.com$/i, 'gemini'],
  [/(^|\.)claude\.ai$/i, 'claude'],
  [/(^|\.)you\.com$/i, 'you'],
]

function AiReferralTracker() {
  useEffect(() => {
    try {
      const ref = document.referrer
      if (!ref) return
      const host = new URL(ref).hostname
      const match = AI_ENGINES.find(([re]) => re.test(host))
      if (!match) return
      const key = 'ai_referral_fired'
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
      trackEvent('ai_referral', { ai_engine: match[1], landing_page: window.location.pathname })
    } catch {
      /* referrer parse / storage unavailable — no-op */
    }
  }, [])

  return null
}

export default function AnalyticsProvider() {
  return (
    <Suspense fallback={null}>
      <PageViewTracker />
      <AiReferralTracker />
    </Suspense>
  )
}
