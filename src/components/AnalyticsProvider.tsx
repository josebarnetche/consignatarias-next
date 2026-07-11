'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { trackPageView, trackEvent, trackSignup, emitValueBeacon } from '@/lib/analytics'

/**
 * Tracks GA4 pageviews on every Next.js App Router navigation.
 * Without this, only the first page load is tracked — SPA
 * navigations (Link clicks) are invisible to GA4.
 */
function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // Un pageview por CAMBIO DE RUTA, no por cambio de query-string. Antes las
    // deps incluían `searchParams`, así que cada filtro / orden / paginación que
    // escribe en la URL (frigoríficos, arrendamiento, listados) disparaba un
    // `page_view` nuevo → inflaba pageviews (11,7 pág/sesión en /frigorificos) y
    // ensuciaba pág/sesión, bounce y engagement. Leemos el search actual para el
    // URL del pageview, pero SOLO re-disparamos cuando cambia el pathname.
    const search = typeof window !== 'undefined' ? window.location.search : ''
    trackPageView(pathname + search)
  }, [pathname])

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

/**
 * VisitTracker — capa first-party. Una vez por sesión, manda la atribución (landing,
 * referrer, utm, motor de IA, device) a /api/track/visit, que hace el upsert del
 * visitante (cookie `cid` seteada en middleware): first-touch + last-touch, cuenta de
 * visitas y stitching a la cuenta al loguearse. El `cid` lo lee el server desde la
 * cookie httpOnly; acá no se toca. Best-effort, no bloquea la navegación.
 */
function VisitTracker() {
  useEffect(() => {
    try {
      const key = 'visit_fired'
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')

      const params = new URLSearchParams(window.location.search)
      let refHost: string | null = null
      const ref = document.referrer
      if (ref) {
        try {
          refHost = new URL(ref).hostname
        } catch {
          /* ref no parseable */
        }
      }
      let aiEngine: string | null = null
      try {
        aiEngine = sessionStorage.getItem('ai_engine')
      } catch {
        /* storage */
      }
      if (!aiEngine && refHost) aiEngine = AI_ENGINES.find(([re]) => re.test(refHost!))?.[1] ?? null
      if (!aiEngine) {
        const utm = params.get('utm_source')
        if (utm) aiEngine = engineFromUtm(utm)
      }
      const device = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'mobile' : 'desktop'

      const payload = JSON.stringify({
        landing: window.location.pathname,
        referrer: refHost,
        utm_source: params.get('utm_source'),
        utm_medium: params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
        ai_engine: aiEngine,
        device,
        new_session: true,
      })
      // En la PRIMERA visita la cookie `cid` la setea el middleware en la respuesta
      // de la página; si el fetch corre antes de que el browser la comprometa, el
      // server responde no-cid. Reintentamos una vez (para entonces ya está).
      const send = (retry: boolean) => {
        fetch('/api/track/visit', {
          method: 'POST',
          body: payload,
          headers: { 'Content-Type': 'application/json' },
        })
          .then((r) => r.json())
          .then((j) => {
            if (!retry && j && j.ok === false && j.reason === 'no-cid') {
              setTimeout(() => send(true), 1500)
            }
          })
          .catch(() => {})
      }
      send(false)
    } catch {
      /* storage / parse unavailable — no-op */
    }
  }, [])
  return null
}

/**
 * EngagementTracker — señales pasivas por ruta, ligadas al visitor_id (el beacon de
 * value_events adjunta el cid). scroll_depth: una vez al superar 75%. time_on_page:
 * una vez, al dejar la página (cambio de ruta SPA o tab oculto), con los segundos.
 * Alimenta el dashboard de visitantes y las cohortes de engagement.
 */
function EngagementTracker() {
  const pathname = usePathname()
  useEffect(() => {
    const start = Date.now()
    let deepFired = false
    let timeFired = false
    const fireTime = () => {
      if (timeFired) return
      const secs = Math.round((Date.now() - start) / 1000)
      if (secs >= 5 && secs < 3600) {
        timeFired = true
        // Beacon-only (NO gtag): esta señal dispara en visibilitychange→hidden y
        // en el cleanup de ruta. Si el usuario deja la pestaña en background >30min
        // y vuelve/cierra, un `time_on_page` a GA4 abre una SESIÓN FANTASMA sin
        // page_view (landing en blanco, source (not set) → Unassigned). Ya vive en
        // el ledger first-party; a GA4 no le aporta nada y le ensucia la atribución.
        emitValueBeacon('time_on_page', { meta: { seconds: secs, path: pathname } })
      }
    }
    const onScroll = () => {
      if (deepFired) return
      const el = document.documentElement
      const ratio = (el.scrollTop + window.innerHeight) / (el.scrollHeight || 1)
      if (ratio >= 0.75) {
        deepFired = true
        // Beacon-only (NO gtag): misma razón que time_on_page — evita sesiones
        // fantasma en GA4. La señal se conserva en el ledger first-party.
        emitValueBeacon('scroll_depth', { meta: { depth: 75, path: pathname } })
      }
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden') fireTime()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onHide)
    return () => {
      fireTime()
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [pathname])
  return null
}

export default function AnalyticsProvider() {
  return (
    <Suspense fallback={null}>
      <PageViewTracker />
      <AiReferralTracker />
      <VisitTracker />
      <EngagementTracker />
      <SignupTracker />
    </Suspense>
  )
}
