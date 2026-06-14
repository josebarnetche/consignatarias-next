import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Same-origin relative path only. Rejects:
//   - absolute URLs ("https://evil.tld/x")
//   - protocol-relative URLs ("//evil.tld/x") — browsers treat as cross-origin
//   - backslash variant ("/\\evil.tld") — same exploit, different parser
//   - empty / null / non-string
// On rejection, falls back to '/dashboard'.
function safeNext(raw: string | null): string {
  if (!raw || typeof raw !== 'string') return '/dashboard'
  if (raw.length > 512) return '/dashboard'
  if (!raw.startsWith('/')) return '/dashboard'
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/dashboard'
  return raw
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          },
        },
      },
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Flag brand-new accounts so the client can fire the GA4 `sign_up` event.
      // Heuristic: created within the last 5 min ⇒ this magic-link was a signup,
      // not a returning login. A returning user whose account is <5 min old is
      // effectively still a new signup, so the rare false-positive is benign.
      const createdAt = data.user?.created_at
        ? new Date(data.user.created_at).getTime()
        : 0
      const isNewUser = createdAt > 0 && Date.now() - createdAt < 5 * 60 * 1000

      const dest = new URL(next, origin)
      if (isNewUser) dest.searchParams.set('signup', '1')
      return NextResponse.redirect(dest)
    }
  }

  // Auth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
