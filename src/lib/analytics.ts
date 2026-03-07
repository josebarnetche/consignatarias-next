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

const GA_ID = 'G-6CZMZH9S6Y'

/* ------------------------------------------------------------------ */
/*  LOW-LEVEL                                                          */
/* ------------------------------------------------------------------ */

function gtag(...args: unknown[]) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag(...args)
  }
}

/**
 * Send a GA4 pageview for SPA navigations.
 * Called by the AnalyticsProvider on every route change.
 */
export function trackPageView(url: string) {
  gtag('config', GA_ID, {
    page_path: url,
  })
}

/**
 * Send a custom GA4 event.
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | undefined>
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
export function trackFilterApply(filterType: 'province' | 'type' | 'period', value: string) {
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

/** User clicked an external link (catalog, youtube, source) */
export function trackOutboundClick(url: string, linkType: 'catalog' | 'youtube' | 'source' | 'whatsapp' | 'website') {
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
