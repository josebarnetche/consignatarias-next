import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit, getClientId, addRateLimitHeaders } from '@/lib/rate-limit'
import { getVariantSlugRedirects, getCanonicalSlug } from '@/lib/data/consignataria-slugs'
import rematesData from '@/lib/data/remates.json'

// Build variant→canonical map once at module load (edge cold start)
const VARIANT_TO_CANONICAL = new Map<string, string>(getVariantSlugRedirects())

// Current valid remate slugs — anything not in this set is an archived auction
// that returns 404 because [slug]/page.tsx uses `dynamicParams = false`. We
// redirect those to the consignataria profile to preserve link equity.
const CURRENT_REMATE_SLUGS: Set<string> = (() => {
  const set = new Set<string>()
  for (const r of rematesData as Array<{
    consignatariaSlug?: string
    type?: string
    province?: string
    date?: string
  }>) {
    const consig = r.consignatariaSlug || 'remate'
    const type = r.type || 'general'
    const prov = (r.province || 'argentina').toLowerCase().replace(/\s+/g, '-')
    set.add(`${consig}-${type}-${prov}-${r.date}`)
  }
  return set
})()

// Matches the remate detail slug shape: {anything}-YYYY-MM-DD
const REMATE_SLUG_PATTERN = /^(.+)-\d{4}-\d{2}-\d{2}$/

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /remates/<slug-YYYY-MM-DD> — for archived auctions that would 404 because
  // dynamicParams=false, redirect to the consignataria profile so historical
  // links (Google index, backlinks) don't dead-end.
  if (pathname.startsWith('/remates/')) {
    const slug = pathname.slice('/remates/'.length).split('/')[0]
    const m = slug.match(REMATE_SLUG_PATTERN)
    // Only act on detail-shaped slugs (ending in date). Sibling routes like
    // /remates/en-vivo, /remates/hoy, /remates/mes/<mes> fall through.
    if (m && !CURRENT_REMATE_SLUGS.has(slug)) {
      // Extract the consignataria portion: everything before -{type}-{prov}-{date}.
      // The slug shape is `{consig}-{type}-{province}-{date}` where type is one
      // of invernada|cria|general|especial|reproductores. Anchor on the type.
      const typeMatch = slug.match(
        /^(.+?)-(invernada|cria|general|especial|reproductores)-/,
      )
      if (typeMatch) {
        const rawConsig = typeMatch[1]
        const canonical = getCanonicalSlug(rawConsig)
        if (canonical) {
          const url = request.nextUrl.clone()
          url.pathname = `/consignatarias/${canonical}`
          return NextResponse.redirect(url, 301)
        }
      }
    }
    // Current slug or unparseable — let Next handle (static page or 404)
    return NextResponse.next()
  }

  // /consignatarias/<slug> — redirect variant slugs to canonical at the edge
  // so bots hitting old URLs don't trigger an SSR invocation.
  if (pathname.startsWith('/consignatarias/')) {
    const slug = pathname.slice('/consignatarias/'.length).split('/')[0]
    const canonical = VARIANT_TO_CANONICAL.get(slug)
    if (canonical) {
      const url = request.nextUrl.clone()
      url.pathname = `/consignatarias/${canonical}`
      return NextResponse.redirect(url, 308)
    }
    // Canonical or unknown — let Next handle (static page or 404)
    return NextResponse.next()
  }

  // Rate limit public API endpoints (IP-based for anonymous)
  if (request.nextUrl.pathname.startsWith('/api/') && isPublicApiRoute(request.nextUrl.pathname)) {
    // If request carries a Bearer API key, skip IP rate-limiting.
    // The route handler's authenticate() enforces the real per-plan quota
    // (Starter 30/min, Growth 300/min, Scale 5000/min) and monthly cap.
    const auth = request.headers.get('authorization') ?? ''
    const hasBearer = auth.toLowerCase().startsWith('bearer cnsg_')

    if (!hasBearer) {
      const clientId = getClientId(request)
      const result = checkRateLimit(clientId, 'free')

      if (!result.success) {
        const response = NextResponse.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: `Límite de ${result.limit} req/min para acceso anónimo. Activá Enterprise en /enterprise (desde 30 req/min con Starter, hasta 5000 req/min con Scale).`,
              retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
            },
          },
          { status: 429 }
        )
        addRateLimitHeaders(response.headers, result)
        return response
      }

      const response = NextResponse.next({ request })
      addRateLimitHeaders(response.headers, result)
      return response
    }
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh session — do NOT remove this
  await supabase.auth.getUser()

  return supabaseResponse
}

/**
 * Public API routes that should be rate limited.
 * Excludes internal routes like webhooks, admin, auth.
 */
function isPublicApiRoute(pathname: string): boolean {
  const publicRoutes = [
    '/api/remates',
    '/api/precios',
    '/api/consignataria',
    '/api/consignatarias',
    '/api/alertas',
    '/api/status',
    '/api/health',
    '/api/calendario',
    '/api/planes',
  ]
  return publicRoutes.some(route => pathname.startsWith(route))
}

export const config = {
  matcher: [
    /*
     * Only run middleware on routes that need auth or rate limiting:
     * - /api/* (rate limiting + auth)
     * - /admin/* (auth)
     * - /dashboard/* (auth)
     * - /login/* (auth session)
     * - /mi-cuenta/* (auth)
     * - /auth/* (auth callbacks)
     *
     * All other routes (remates, consignatarias, frigorificos, etc.)
     * are public/static and served directly from CDN — no function needed.
     */
    '/api/:path*',
    '/admin/:path*',
    '/dashboard/:path*',
    '/login/:path*',
    '/mi-cuenta/:path*',
    '/auth/:path*',
    // Variant-slug redirect for consignataria profile URLs (no Supabase work)
    '/consignatarias/:slug',
    // Archived-remate redirect: detail slugs that no longer exist get sent
    // to the consignataria profile instead of 404. Siblings (en-vivo, hoy,
    // ciudad/*, mes/*, tipo/*) fall through fast.
    '/remates/:slug',
  ],
}
