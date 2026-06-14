/**
 * Analytics utility — centralized GA4 event tracking.
 *
 * GA4 property: G-6CZMZH9S6Y
 *
 * All events flow through gtag(). Vercel Analytics runs in parallel
 * for Web Vitals and basic pageviews but GA4 is the primary source
 * for custom events and dimensions.
 */

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
 * Send a GA4 pageview for SPA navigations.
 * Called by the AnalyticsProvider on every route change.
 */
export function trackPageView(url: string) {
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

/** User clicked CTA on landing page */
export function trackCTA(ctaName: string, location: string) {
  trackEvent('cta_click', {
    cta_name: ctaName,
    location,
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

/** PRO upgrade prompt was shown to user */
export function trackProPromptView(context: string, variant: ProPromptVariant) {
  trackEvent('pro_prompt_view', {
    prompt_context: context,
    prompt_variant: variant,
  })
}

/** User clicked PRO upgrade prompt CTA */
export function trackProPromptClick(context: string, variant: ProPromptVariant) {
  trackEvent('pro_prompt_click', {
    prompt_context: context,
    prompt_variant: variant,
  })
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
}

/** User started checkout process (clicked pay, before the Rebill link is created) */
export function trackCheckoutStart(plan: string, price: number) {
  trackEvent('checkout_start', {
    plan_name: plan,
    plan_price: price,
    // GA4-reserved monetization params so the value flows into reports.
    value: price,
    currency: 'ARS',
  })
}

/** Rebill link created — user is being redirected to pay (last on-site step). */
export function trackCheckoutRedirect(plan: string, price: number) {
  trackEvent('checkout_redirect', {
    plan_name: plan,
    plan_price: price,
    value: price,
    currency: 'ARS',
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

/** User signed up (new account created) */
export function trackSignup(method: 'email' | 'google' | 'github') {
  trackEvent('signup', {
    signup_method: method,
  })
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
/*  AUTH                                                               */
/* ------------------------------------------------------------------ */
// trackSignup lives in the ACTIVATION FUNNEL section above; it is fired by the
// global SignupTracker (AnalyticsProvider) on the `?signup=1` post-auth redirect.
