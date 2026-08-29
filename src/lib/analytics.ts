/**
 * Analytics utility — centralized GA4 event tracking.
 *
 * GA4 property: G-6CZMZH9S6Y
 *
 * All events flow through gtag(). Vercel Analytics runs in parallel
 * for Web Vitals and basic pageviews but GA4 is the primary source
 * for custom events and dimensions.
 */

import { hmuClientTrack } from './hmu-client'
import type { ValueEvent, ValueEntityType, ValueSource } from './value-events'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

/** Hostnames where analytics is allowed to fire. Anything else (localhost,
 *  *.vercel.app preview deploys, staging) is silently dropped so the production
 *  GA4 property only ever sees production traffic. */
const PROD_HOSTS = new Set(['www.consignatarias.com.ar', 'consignatarias.com.ar'])

function analyticsEnabled(): boolean {
  return typeof window !== 'undefined' && PROD_HOSTS.has(window.location.hostname)
}

/* ------------------------------------------------------------------ */
/*  LOW-LEVEL                                                          */
/* ------------------------------------------------------------------ */

function gtag(...args: unknown[]) {
  if (analyticsEnabled() && window.gtag) {
    window.gtag(...args)
  }
}

/**
 * Test-mode capture hook. Un harness de verificación (Playwright/browser) setea
 * `window.__CNSG_TRACK_TEST__ = true` ANTES de interactuar; a partir de ahí cada
 * evento que pasa por `trackEvent` se acumula en `window.__cnsgEvents` para poder
 * afirmarlo. Es puramente aditivo: en producción el flag nunca se setea, así que
 * esto es un no-op y NO cambia el comportamiento. Existe porque los eventos no
 * disparan en dev/CI (analyticsEnabled() es false fuera de PROD_HOSTS), y sin
 * esto no habría forma de verificar el instrumentado. Ver docs/analytics/.
 */
interface TrackTestWindow {
  __CNSG_TRACK_TEST__?: boolean
  __cnsgEvents?: Array<{ event: string; params?: Record<string, unknown> }>
}
function captureForTest(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const w = window as unknown as TrackTestWindow
  if (!w.__CNSG_TRACK_TEST__) return
  ;(w.__cnsgEvents ||= []).push({ event: eventName, params })
}

/**
 * Send a GA4 pageview for SPA navigations.
 * Called by the AnalyticsProvider on every route change.
 */
export function trackPageView(url: string) {
  hmuClientTrack('page.viewed', { path: url.split('?')[0] })
  gtag('event', 'page_view', {
    page_path: url,
    page_location:
      typeof window !== 'undefined' ? window.location.origin + url : url,
  })
}

/**
 * Send a custom GA4 event.
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
) {
  captureForTest(eventName, params)
  gtag('event', eventName, params)
}

/* ------------------------------------------------------------------ */
/*  DOMAIN EVENTS                                                      */
/* ------------------------------------------------------------------ */

/** User clicked an auction row (to source, catalog, or profile) */
export function trackAuctionClick(auction: {
  id: number
  consignatariaName: string
  consignatariaSlug: string
  province: string
  type: string
  date: string
  featured?: boolean
}, destination: 'source' | 'catalog' | 'youtube' | 'profile') {
  trackEvent('auction_click', {
    auction_id: auction.id,
    consignataria: auction.consignatariaName,
    consignataria_slug: auction.consignatariaSlug,
    province: auction.province,
    auction_type: auction.type,
    auction_date: auction.date,
    destination,
    is_featured: auction.featured ? 'true' : 'false',
  })
}

/** User applied a filter on the remates page */
export function trackFilterApply(filterType: 'province' | 'type' | 'period' | 'en_vivo', value: string) {
  trackEvent('filter_apply', {
    filter_type: filterType,
    filter_value: value,
  })
}

/** User viewed a consignataria profile page */
export function trackProfileView(slug: string, displayName: string, auctionCount: number) {
  trackEvent('profile_view', {
    consignataria_slug: slug,
    consignataria_name: displayName,
    auction_count: auctionCount,
  })
}

/** User clicked an external link (catalog, youtube, source, whatsapp) */
export function trackOutboundClick(url: string, linkType: 'catalog' | 'youtube' | 'source' | 'whatsapp' | 'whatsapp_fab' | 'website') {
  trackEvent('outbound_click', {
    url,
    link_type: linkType,
  })
}

/** User searched in the frigorificos directory */
export function trackSearch(query: string, resultCount: number, page: string) {
  trackEvent('search', {
    search_term: query,
    result_count: resultCount,
    page,
  })
}

/**
 * Account-creation nudge (soft, non-blocking). Fired by the global AccountNudge
 * toast. `action` segments the funnel: shown → clicked (→ Google) or dismissed.
 * The producer is never blocked; this only measures the conversion to a free
 * account at high-intent moments (save, calc, alert, contact reveal).
 */
export function trackAccountNudge(action: 'view' | 'click' | 'dismiss', reason: string) {
  trackEvent('account_nudge', {
    nudge_action: action,
    nudge_reason: reason,
  })
}

/** User clicked CTA on landing page. `context`/`variant` are optional funnel-segmentation
 *  params (e.g. the surface that rendered the CTA and its A/B variant). */
export function trackCTA(
  ctaName: string,
  location: string,
  opts: { context?: string; variant?: string } = {}
) {
  trackEvent('cta_click', {
    cta_name: ctaName,
    location,
    context: opts.context,
    variant: opts.variant,
  })
}

/** User clicked "Verificar este perfil" */
export function trackClaimCTA(slug: string, displayName: string) {
  trackEvent('claim_cta_click', {
    consignataria_slug: slug,
    consignataria_name: displayName,
  })
}

/** User submitted a claim form */
export function trackClaimSubmit(slug: string, displayName: string) {
  trackEvent('claim_submit', {
    consignataria_slug: slug,
    consignataria_name: displayName,
  })
}

/** Claim form submitted successfully */
export function trackClaimSuccess(slug: string, displayName: string) {
  trackEvent('claim_success', {
    consignataria_slug: slug,
    consignataria_name: displayName,
  })
}

/* ------------------------------------------------------------------ */
/*  PRO CONVERSION FUNNEL                                              */
/* ------------------------------------------------------------------ */

/** Variant of a PRO upgrade surface, for funnel segmentation. */
export type ProPromptVariant = 'inline' | 'card' | 'reveal'

// Dedup de impresiones del muro PRO: UNA por página (pathname) por sesión. El
// muro se emite desde 6 componentes distintos; sin esto, un solo pageview genera
// N `pro_prompt_view` → infla el denominador del funnel (el CTR real del muro no
// se podía calcular). El Set vive a nivel módulo (persiste entre navegaciones SPA).
const proPromptFiredPaths = new Set<string>()

/** PRO upgrade prompt shown. Dedupe UNA impresión por página + pega a GA y al
 *  ledger de value_events (antes GA y ledger contaban universos distintos). */
export function trackProPromptView(context: string, variant: ProPromptVariant) {
  const path = typeof window !== 'undefined' ? window.location.pathname : ''
  if (proPromptFiredPaths.has(path)) return
  proPromptFiredPaths.add(path)
  trackEvent('pro_prompt_view', {
    prompt_context: context,
    prompt_variant: variant,
  })
  emitValueBeacon('pro_prompt_view', { meta: { context, variant } })
}

/** User clicked PRO upgrade prompt CTA. GA + ledger (el click es intencional →
 *  se cuenta siempre, sin dedup). */
export function trackProPromptClick(context: string, variant: ProPromptVariant) {
  trackEvent('pro_prompt_click', {
    prompt_context: context,
    prompt_variant: variant,
  })
  emitValueBeacon('pro_prompt_click', { meta: { context, variant } })
}

/** Handler ÚNICO de clic de WhatsApp — antes 3 superficies medían distinto
 *  (perfil: contact_whatsapp; SmartCTA/FAB: solo /api/track/whatsapp). Ahora
 *  todas emiten las 3 señales consistentes: outbound (GA), contact_whatsapp
 *  (ledger, lead w10) y el beacon a whatsapp_clicks. */
export function trackWhatsAppClick(opts: {
  url: string
  slug?: string
  source: string
  linkType?: 'whatsapp' | 'whatsapp_fab'
}) {
  trackOutboundClick(opts.url, opts.linkType ?? 'whatsapp')
  trackValueEvent('contact_whatsapp', {
    entityType: 'consignataria',
    entitySlug: opts.slug,
    meta: { source: opts.source },
  })
  if (opts.slug) {
    try {
      const body = JSON.stringify({ slug: opts.slug, source: opts.source })
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/track/whatsapp', new Blob([body], { type: 'application/json' }))
      } else {
        fetch('/api/track/whatsapp', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true })
      }
    } catch { /* best-effort */ }
  }
}

/** Free user consumed their weekly "taste" (one full PRO verdict). */
export function trackFreeTasteUnlock(context: string, categoria: string) {
  trackEvent('free_taste_unlock', {
    taste_context: context,
    categoria,
  })
}

/** User landed on /planes page */
export function trackPlanesView(source: string | null) {
  trackEvent('planes_view', {
    source: source || 'direct',
  })
  emitValueBeacon('planes_view', { meta: { from: source || 'direct' } })
}

/** User started checkout process (clicked pay, before the Rebill link is created).
 *  `context`/`variant` are optional funnel-segmentation params. */
export function trackCheckoutStart(
  plan: string,
  price: number,
  opts: { context?: string; variant?: string } = {}
) {
  trackEvent('checkout_start', {
    plan_name: plan,
    plan_price: price,
    // GA4-reserved monetization params so the value flows into reports.
    value: price,
    currency: 'ARS',
    context: opts.context,
    variant: opts.variant,
  })
  emitValueBeacon('checkout_start', { meta: { plan, price, context: opts.context, variant: opts.variant } })
}

/** Rebill link created — user is being redirected to pay (last on-site step).
 *  `context`/`variant` are optional funnel-segmentation params. */
export function trackCheckoutRedirect(
  plan: string,
  price: number,
  opts: { context?: string; variant?: string } = {}
) {
  trackEvent('checkout_redirect', {
    plan_name: plan,
    plan_price: price,
    value: price,
    currency: 'ARS',
    context: opts.context,
    variant: opts.variant,
  })
}

/**
 * DB-confirmed PRO upgrade — fires the GA4-recommended `purchase` event so the
 * full monetization suite (revenue, ARPU, conversion value) lights up. Only call
 * this once the subscription is confirmed in the DB (see UpgradeConfirmTracker),
 * never on the bare `?upgraded=true` redirect param.
 */
export function trackProUpgrade(
  plan: string,
  price: number,
  source: string | null,
  transactionId?: string | null
) {
  trackEvent('purchase', {
    transaction_id: transactionId || undefined,
    value: price,
    currency: 'ARS',
    plan_name: plan,
    conversion_source: source || 'direct',
    items: [{ item_id: plan, item_name: plan, price, quantity: 1 }],
  })
}

/* ------------------------------------------------------------------ */
/*  ACTIVATION FUNNEL (signup → DT-e → PRO)                           */
/* ------------------------------------------------------------------ */

/** User signed up (new account created). Event name is the GA4-recommended
 *  `sign_up` (matches the configured key event — emitting `signup` left it blind). */
export function trackSignup(method: 'email' | 'google' | 'github') {
  trackEvent('sign_up', {
    signup_method: method,
  })
  // Ledger: el evento GA es `sign_up` pero la taxonomía usa `signup` (funnel w15).
  emitValueBeacon('signup', { meta: { method } })
}

/** User visited the DT-e upload page */
export function trackDtePageView() {
  trackEvent('dte_page_view', {})
}

/** User started DT-e upload (dropped/selected file) */
export function trackDteUploadStart() {
  trackEvent('dte_upload_start', {})
}

/** OCR completed successfully */
export function trackDteOcrComplete(confidence: number) {
  trackEvent('dte_ocr_complete', {
    ocr_confidence: Math.round(confidence),
    confidence_bucket: confidence > 80 ? 'high' : confidence > 60 ? 'medium' : 'low',
  })
}

/** User saved DT-e to their history (first or subsequent) */
export function trackDteSave(isFirst: boolean, cabezas: number | null) {
  trackEvent('dte_save', {
    is_first_dte: isFirst ? 'true' : 'false',
    cabezas: cabezas || 0,
  })
  
  // Special milestone event for first DT-e (key activation moment)
  if (isFirst) {
    trackEvent('activation_first_dte', {})
  }
}

/** User reached N DTEs milestone */
export function trackDteMilestone(count: number) {
  if (count === 5 || count === 10 || count === 25 || count === 50) {
    trackEvent('dte_milestone', {
      dte_count: count,
    })
  }
}

/** User deleted a DT-e */
export function trackDteDelete() {
  trackEvent('dte_delete', {})
}

/** User started the DT-e demo (skips OCR, loads sample data) */
export function trackDteDemoStart(source: string) {
  trackEvent('dte_demo_start', { source })
}

/** User shared a DT-e milestone badge */
export function trackMilestoneShare(badgeId: string, badgeName: string, dteCount: number) {
  trackEvent('milestone_share', {
    badge_id: badgeId,
    badge_name: badgeName,
    dte_count: dteCount,
  })
}

/** User exported the remates calendar as a bulk .ics file */
export function trackBulkIcsExport(count: number, period: string, hasFilters: boolean) {
  trackEvent('bulk_ics_export', {
    count,
    period,
    has_filters: hasFilters,
  })
}

/* ------------------------------------------------------------------ */
/*  RETENTION / RETURN INSTRUMENTATION                                */
/* ------------------------------------------------------------------ */
// New measurement foundation: SinceLastVisit, alerts and internal hub
// navigation were previously blind (no GA events). These wrappers light
// them up so the return/conversion funnel can finally be measured.

/** "Desde tu última visita" block was rendered. `has_delta` = whether it
 *  actually surfaced changes (vs an empty/first-visit state). */
export function trackSinceLastVisitShown(opts: { has_delta: boolean; page: string }) {
  trackEvent('since_last_visit_shown', {
    has_delta: opts.has_delta,
    page: opts.page,
  })
}

/** User clicked into the "Desde tu última visita" block. */
export function trackSinceLastVisitClick(opts: { page: string }) {
  trackEvent('since_last_visit_click', {
    page: opts.page,
  })
}

/** User subscribed to an alert (price/category/auction watch). `source` is the
 *  UI surface that triggered the subscription. */
export function trackAlertSubscribe(opts: { source: string; page: string }) {
  trackEvent('alert_subscribe', {
    source: opts.source,
    page: opts.page,
  })
  // Ledger: GA usa `alert_subscribe` pero la taxonomía usa `alert_create`
  // (recurrencia w8). Antes este evento nunca entraba al value-index.
  emitValueBeacon('alert_create', { meta: { source: opts.source, page: opts.page } })
}

/** User clicked an internal cross-silo navigation link from a hub page
 *  (e.g. from a province hub to a specific province within a silo). */
export function trackInternalNavClick(opts: {
  from_hub: string
  to_province: string
  silo: string
}) {
  trackEvent('internal_nav_click', {
    from_hub: opts.from_hub,
    to_province: opts.to_province,
    silo: opts.silo,
  })
}

/* ------------------------------------------------------------------ */
/*  WATCHLIST + DIGEST (return-trigger funnel)                        */
/* ------------------------------------------------------------------ */
// Watchlist = local "seguir" of items (remate/categoría/consignataria) that
// powers the email digest return-trigger. These wrappers light up the save →
// return → notify → merge loop and the digest open/click leg so the
// trigger-by-email lever (no más freshness) can finally be measured.

/** User saved an item to their watchlist. `auth_state` distinguishes anon
 *  (local-only) saves from logged ones, for the merge funnel. */
export function trackWatchlistSave(opts: {
  item_type: string
  auth_state: 'anon' | 'logged'
}) {
  trackEvent('watchlist_save', {
    item_type: opts.item_type,
    auth_state: opts.auth_state,
  })
}

/** A returning user surfaced their existing watchlist. `count` = items held. */
export function trackWatchlistReturn(opts: { count: number }) {
  trackEvent('watchlist_return', {
    count: opts.count,
  })
}

/** User opted in to email notifications for a watchlist item. */
export function trackWatchlistNotifyOptin(opts: { item_type: string }) {
  trackEvent('watchlist_notify_optin', {
    item_type: opts.item_type,
  })
}

/** Anon watchlist merged into a logged account on auth. `merged` = items moved. */
export function trackWatchlistMerge(opts: { merged: number }) {
  trackEvent('watchlist_merge', {
    merged: opts.merged,
  })
}

/** Email digest opened (return-trigger leg). `campaign` = digest campaign id. */
export function trackDigestOpen(opts: { campaign: string }) {
  trackEvent('digest_open', {
    campaign: opts.campaign,
  })
}

/** User clicked a link inside the email digest. `target` = destination surface. */
export function trackDigestClick(opts: { campaign: string; target: string }) {
  trackEvent('digest_click', {
    campaign: opts.campaign,
    target: opts.target,
  })
}

/* ------------------------------------------------------------------ */
/*  AUCTION EMAIL FUNNEL (mails 0-3 de subasta + confirm a firma)      */
/* ------------------------------------------------------------------ */
// Instrumenta los clicks de retorno desde los mails de subasta (nueva
// publicación / recordatorio / en-vivo / resultados) hacia el sitio. El `mail`
// identifica cuál de la secuencia disparó la visita; el `destination` distingue
// catálogo vs transmisión en vivo vs perfil/promedios.

/** User clicked into the site from an auction lifecycle email (mail 0-3). */
export function trackAuctionEmailClick(opts: {
  mail: 'new_publication' | 'reminder' | 'live' | 'results'
  consignataria_slug: string
  destination: 'catalog' | 'youtube' | 'profile'
}) {
  trackEvent('auction_email_click', {
    mail: opts.mail,
    consignataria_slug: opts.consignataria_slug,
    destination: opts.destination,
  })
}

/* ------------------------------------------------------------------ */
/*  AUTH                                                               */
/* ------------------------------------------------------------------ */
// trackSignup lives in the ACTIVATION FUNNEL section above; it is fired by the
// global SignupTracker (AnalyticsProvider) on the `?signup=1` post-auth redirect.

/* ------------------------------------------------------------------ */
/*  VALUE EVENTS — sistema interno de conteo (beacon a /api/track/event) */
/* ------------------------------------------------------------------ */

/** Id de sesión liviano (solo para deduplicar/segmentar; no es PII). */
function getSessionId(): string {
  try {
    let id = sessionStorage.getItem('cnsg_sid')
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem('cnsg_sid', id)
    }
    return id
  } catch {
    return ''
  }
}

/** Deriva la fuente de tráfico para atribución. El engine AI lo deja el AiReferralTracker
 *  en sessionStorage('ai_engine'); el resto sale del referrer. */
function getTrafficSource(): { source: ValueSource; aiEngine: string | null } {
  try {
    const aiEngine = sessionStorage.getItem('ai_engine')
    if (aiEngine) return { source: 'ai', aiEngine }
    const ref = document.referrer
    if (!ref) return { source: 'direct', aiEngine: null }
    const host = new URL(ref).hostname
    if (host === window.location.hostname) return { source: 'direct', aiEngine: null }
    if (/(^|\.)(google|bing|duckduckgo|yahoo|ecosia|brave)\./i.test(host)) return { source: 'organic', aiEngine: null }
    if (/(facebook|instagram|twitter|x\.com|t\.co|linkedin|whatsapp)/i.test(host)) return { source: 'social', aiEngine: null }
    return { source: 'referral', aiEngine: null }
  } catch {
    return { source: 'unknown', aiEngine: null }
  }
}

/**
 * Registra un EVENTO DE VALOR: lo manda a GA4 (espejo) y al sistema interno de conteo
 * (/api/track/event → tabla value_events) con atribución de fuente/engine/entidad. El
 * peso lo asigna el server desde el registro src/lib/value-events.ts. Solo en producción.
 */
export function trackValueEvent(
  event: ValueEvent,
  opts: { entityType?: ValueEntityType; entitySlug?: string; meta?: Record<string, unknown> } = {},
) {
  trackEvent(event, { entity_type: opts.entityType, entity_slug: opts.entitySlug, ...opts.meta })
  emitValueBeacon(event, opts)
}

/**
 * Solo el beacon al ledger interno (value_events), SIN el trackEvent de GA4.
 * Lo usan los helpers del funnel (trackPlanesView, trackCheckoutStart, …) que ya
 * emiten su propio evento GA4 — así el ledger interno también recibe el escalón
 * del funnel sin disparar un GA4 duplicado.
 */
export function emitValueBeacon(
  event: ValueEvent,
  opts: { entityType?: ValueEntityType; entitySlug?: string; meta?: Record<string, unknown> } = {},
) {
  if (!analyticsEnabled()) return
  try {
    const { source, aiEngine } = getTrafficSource()
    const payload = JSON.stringify({
      event,
      entityType: opts.entityType ?? 'global',
      entitySlug: opts.entitySlug ?? null,
      source,
      aiEngine,
      path: window.location.pathname,
      sessionId: getSessionId(),
      meta: opts.meta ?? null,
    })
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track/event', new Blob([payload], { type: 'application/json' }))
    } else {
      fetch('/api/track/event', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true })
    }
  } catch {
    /* best-effort: nunca romper la navegación por instrumentar */
  }
}

/* ------------------------------------------------------------------ */
/*  GUÍA PAGA (compra única) — embudo propio                           */
/*  view → checkout_start → purchase. Es un embudo DISTINTO del de     */
/*  suscripción: no hay plan ni renovación, y el origen (?ref=) es la  */
/*  única forma de saber qué superficie vende.                         */
/* ------------------------------------------------------------------ */

/** Llegada al sales page. `source` sale de ?ref= (banner-inmag, banner-home, …)
 *  o es 'direct'. Un arribo con ref ES el clic del banner: no instrumentamos el
 *  clic aparte para no mandarle JavaScript a landers que son SSG. */
export function trackGuiaView(slug: string, source: string) {
  trackEvent('guia_view', { guia_slug: slug, conversion_source: source })
  emitValueBeacon('guia_view', { meta: { slug, source } })
}

/** Clic en "Comprar" — se creó el payment-link y el usuario sale a Rebill.
 *  Emite además el `begin_checkout` recomendado por GA4 para que la plata
 *  entre en los informes de monetización. */
export function trackGuiaCheckoutStart(
  slug: string,
  price: number,
  opts: { source?: string; conFactura?: boolean } = {},
) {
  const params = {
    guia_slug: slug,
    value: price,
    currency: 'ARS',
    conversion_source: opts.source || 'direct',
    con_factura: opts.conFactura ? 'si' : 'no',
    items: [{ item_id: slug, item_name: slug, price, quantity: 1 }],
  }
  trackEvent('begin_checkout', params)
  trackEvent('guia_checkout_start', params)
  emitValueBeacon('guia_checkout_start', {
    meta: { slug, price, source: opts.source, con_factura: !!opts.conFactura },
  })
}

/** Compra CONFIRMADA en base (fila en guia_purchases), nunca el `?comprada=`
 *  pelado: se puede llegar a esa URL sin que el webhook haya otorgado nada.
 *  Dispara el `purchase` de GA4 para que revenue/ARPU se enciendan. */
export function trackGuiaPurchase(
  slug: string,
  price: number,
  source: string | null,
  transactionId?: string | null,
) {
  trackEvent('purchase', {
    transaction_id: transactionId || undefined,
    value: price,
    currency: 'ARS',
    guia_slug: slug,
    conversion_source: source || 'direct',
    items: [{ item_id: slug, item_name: slug, price, quantity: 1 }],
  })
}

/**
 * Informes de datos — inicio de checkout.
 *
 * Espeja a `trackGuiaCheckoutStart` a propósito: mismo par de eventos (`begin_checkout`
 * estándar de GA4 + uno propio para poder segmentar), mismo `value`/`currency` para que la
 * conversión valga lo mismo en los dos productos, y el mismo beacon interno — que es el que
 * no depende de que el visitante acepte cookies.
 *
 * Se dispara con el link de Rebill YA CREADO, no en el submit: así cuenta intenciones que
 * de verdad llegaron al checkout y no errores de la API.
 */
export function trackInformeCheckoutStart(
  slug: string,
  price: number,
  opts: { variante?: string; source?: string; conFactura?: boolean } = {},
) {
  const params = {
    informe_slug: slug,
    informe_variante: opts.variante || '',
    value: price,
    currency: 'ARS',
    conversion_source: opts.source || 'direct',
    con_factura: opts.conFactura ? 'si' : 'no',
    items: [
      {
        item_id: opts.variante ? `${slug}:${opts.variante}` : slug,
        item_name: slug,
        item_variant: opts.variante || undefined,
        price,
        quantity: 1,
      },
    ],
  }
  trackEvent('begin_checkout', params)
  trackEvent('informe_checkout_start', params)
  emitValueBeacon('informe_checkout_start', {
    meta: { slug, variante: opts.variante, price, source: opts.source, con_factura: !!opts.conFactura },
  })
}

/** El sales page de un informe se vio. Es el escalón anterior del embudo. */
export function trackInformeView(slug: string, price: number) {
  const params = {
    informe_slug: slug,
    value: price,
    currency: 'ARS',
    items: [{ item_id: slug, item_name: slug, price, quantity: 1 }],
  }
  trackEvent('view_item', params)
  trackEvent('informe_view', params)
  emitValueBeacon('informe_view', { meta: { slug, price } })
}
