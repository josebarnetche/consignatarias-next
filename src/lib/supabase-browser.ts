import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

type BrowserClient = SupabaseClient<Database>

let cached: BrowserClient | null = null

/**
 * Browser-side Supabase client (memoized singleton).
 *
 * Hooks like `useFavorites` call this in their body, which also runs during the
 * SSR pass of statically-generated pages. If the public Supabase env vars are
 * not baked into the build (e.g. a Vercel Preview deploy without them), calling
 * `createBrowserClient` with undefined url/key throws and breaks the static
 * build. To keep merely *creating* the client safe, we defer the failure to
 * actual *use* via a lazy proxy — real client when env is present (prod and
 * properly-configured previews), unchanged behavior; a throw-on-use stub only
 * when the vars are missing (where the feature couldn't work anyway).
 */
export function createClient(): BrowserClient {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (url && key) {
    cached = createBrowserClient<Database>(url, key)
    return cached
  }

  const unavailable = (): never => {
    throw new Error(
      'Supabase browser client unavailable: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set.',
    )
  }
  return new Proxy({} as BrowserClient, { get: unavailable, apply: unavailable })
}
