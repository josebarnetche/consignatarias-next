import { createClient, SupabaseClient } from '@supabase/supabase-js'

let serviceClient: SupabaseClient | null = null

/**
 * Server-side Supabase client using service_role key (bypasses RLS).
 * Only use in API routes — never expose to the browser.
 * Returns null if env vars are missing (e.g., during static generation).
 */
export function createServiceClient(): SupabaseClient | null {
  if (serviceClient) return serviceClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    // During static generation, env vars may not be available
    // Return null and let calling code handle gracefully
    return null
  }

  serviceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return serviceClient
}

/**
 * Same as createServiceClient but throws if unavailable.
 * Use in API routes where Supabase is required.
 */
export function requireServiceClient(): SupabaseClient {
  const client = createServiceClient()
  if (!client) {
    throw new Error('Supabase service client unavailable - missing env vars')
  }
  return client
}
