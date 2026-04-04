import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit, getClientId, addRateLimitHeaders } from '@/lib/rate-limit'

export async function middleware(request: NextRequest) {
  // Rate limit public API endpoints
  if (request.nextUrl.pathname.startsWith('/api/') && isPublicApiRoute(request.nextUrl.pathname)) {
    const clientId = getClientId(request)
    // Check for PRO API key (sk_live_ prefix = PRO user)
    const apiKey = request.headers.get('api_key') || request.headers.get('x-api-key')
    const tier = (apiKey && apiKey.startsWith('sk_live_')) ? 'pro' as const : 'free' as const
    const result = checkRateLimit(clientId, tier)
    
    if (!result.success) {
      const response = NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Límite de ${result.limit} solicitud(es) por minuto excedido. Actualiza a PRO para 100 req/min.`,
            retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
          },
        },
        { status: 429 }
      )
      addRateLimitHeaders(response.headers, result)
      return response
    }
    
    // Continue with rate limit headers
    const response = NextResponse.next({ request })
    addRateLimitHeaders(response.headers, result)
    return response
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
  ],
}
