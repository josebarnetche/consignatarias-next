'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { trackPageView, trackEvent, trackSignup } from '@/lib/analytics'

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
 * AI-referral detection. Fires a first-class GA4 event `ai_referral` AND beacons to our
 * own table (/api/track/ai-referral) when a visitor arrives FROM an AI engine, detected
 * by document.referrer OR by a tagged utm_source (modern LLMs append ?utm_source=chatgpt.com).
 *
 * Why both: GA4 splits AI traffic across Referral/Unassigned/AI-Assistant (chatgpt.com
 * shows up in all three) and does NOT expose the event params by engine via the Data API
 * (ai_engine isn't a registered custom dimension). The Supabase beacon gives us an owned,
 * unified, queryable record — the thesis metric (are we the source AI cites?). Fires once
 * per tab/session.
 *
 * Limitation: catches engines that pass a referrer (ChatGPT does) or a utm_source. Engines
 * that strip both land as Direct and stay undetectable client-side.
 */
const AI_ENGINES: Array<[RegExp, string]> = [
  [/(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$|(^|\.)openai\.com$/i, 'chatgpt'],
  [/(^|\.)perplexity\.ai$/i, 'perplexity'],
  [/(^|\.)copilot\.microsoft\.com$|(^|\.)copilot\.com$|(^|\.)bing\.com$/i, 'copilot'],
  [/(^|\.)gemini\.google\.com$|(^|\.)bard\.google\.com$/i, 'gemini'],
  [/(^|\.)claude\.ai$/i, 'claude'],
  [/(^|\.)grok\.com$|(^|\.)x\.ai$/i, 'grok'],
  [/(^|\.)deepseek\.com$/i, 'deepseek'],
  [/(^|\.)mistral\.ai$|(^|\.)chat\.mistral\.ai$/i, 'mistral'],
  [/(^|\.)poe\.com$/i, 'poe'],
  [/(^|\.)phind\.com$/i, 'phind'],
  [/(^|\.)you\.com$/i, 'you'],
  [/(^|\.)kagi\.com$/i, 'kagi'],
  [/(^|\.)andisearch\.com$/i, 'andi'],
]

// Match an engine from a utm_source value (host-like or short name).
function engineFromUtm(utm: string): string | null {
  const v = utm.toLowerCase()
  for (const [re, name] of AI_ENGINES) if (re.test(v) || v === name) return name
  if (/openai/.test(v)) return 'chatgpt'
  return null
}

function AiReferralTracker() {
  useEffect(() => {
    try {
      const key = 'ai_referral_fired'
      if (sessionStorage.getItem(key)) return

      // 1) Por referrer (host) — la señal más fuerte cuando el engine la pasa.
      let engine: string | null = null
      let detectedVia: 'referrer' | 'utm' = 'referrer'
      const ref = document.referrer
      if (ref) {
        try {
          const host = new URL(ref).hostname
          engine = AI_ENGINES.find(([re]) => re.test(host))?.[1] ?? null
        } catch { /* ref no parseable */ }
      }

      // 2) Por utm_source — los LLM modernos taggean (?utm_source=chatgpt.com).
      const utmSource = new URLSearchParams(window.location.search).get('utm_source')
      if (!engine && utmSource) {
        engine = engineFromUtm(utmSource)
        if (engine) detectedVia = 'utm'
      }

      if (!engine) return
      sessionStorage.setItem(key, '1')
      // Recordá el engine para toda la sesión (subsiguientes pageviews ya saben el origen).
      try { sessionStorage.setItem('ai_engine', engine) } catch { /* ignore */ }

      const landing = window.location.pathname
      trackEvent('ai_referral', { ai_engine: engine, landing_page: landing, detected_via: detectedVia })

      // Beacon a nuestra tabla (no bloquea la navegación; sobrevive al unload).
      const payload = JSON.stringify({
        engine, landing, referrer: ref ? new URL(ref).hostname : null,
        utmSource: utmSource || null, detectedVia, path: window.location.pathname + window.location.search,
      })
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/track/ai-referral', new Blob([payload], { type: 'application/json' }))
        } else {
          fetch('/api/track/ai-referral', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true })
        }
      } catch { /* beacon best-effort */ }
    } catch {
      /* parse / storage unavailable — no-op */
    }
  }, [])

  return null
}

/**
 * Fires the GA4 `sign_up` event once when the auth callback flags a brand-new
 * account with `?signup=1` (magic-link = email method), then strips the param so
 * a refresh can't re-count it. This is the first step of the activation funnel
 * (signup → DT-e → PRO) that was previously uninstrumented.
 */
function SignupTracker() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('signup') !== '1') return

    const key = 'signup_fired'
    let already = false
    try {
      already = sessionStorage.getItem(key) === '1'
    } catch {
      /* storage unavailable */
    }
    if (!already) {
      trackSignup('email')
      try {
        sessionStorage.setItem(key, '1')
      } catch {
        /* ignore */
      }
    }

    const params = new URLSearchParams(searchParams.toString())
    params.delete('signup')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [searchParams, pathname, router])

  return null
}

export default function AnalyticsProvider() {
  return (
    <Suspense fallback={null}>
      <PageViewTracker />
      <AiReferralTracker />
      <SignupTracker />
    </Suspense>
  )
}
