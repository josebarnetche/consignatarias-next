import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/** Service client TIPADO contra el esquema real de prod (database.types.ts).
 *  Con esto, `.from('tabla_inexistente')` es error de COMPILACIÓN — el checker
 *  regex deja de ser la única barrera. Fuente canónica del service client. */
export type ServiceClient = SupabaseClient<Database>

let serviceClient: ServiceClient | null = null

/**
 * Server-side Supabase client using service_role key (bypasses RLS).
 * Only use in API routes — never expose to the browser.
 * Returns null if env vars are missing (e.g., during static generation).
 */
export function createServiceClient(): ServiceClient | null {
  if (serviceClient) return serviceClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    // During static generation, env vars may not be available
    // Return null and let calling code handle gracefully
    return null
  }

  serviceClient = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return serviceClient
}

/**
 * Same as createServiceClient but throws if unavailable.
 * Use in API routes where Supabase is required.
 */
export function requireServiceClient(): ServiceClient {
  const client = createServiceClient()
  if (!client) {
    throw new Error('Supabase service client unavailable - missing env vars')
  }
  return client
}

// (Se eliminaron `fromUnsafe` y `requireServiceClientLegacy` en v1.75.3: eran
// escape-hatches transitorios para la deuda de `users`/`cron_state`. Toda esa deuda
// se reconcilió —0 refs sin tipar— así que ya no hacen falta. Si aparece deuda
// nueva, arreglala de raíz en vez de reintroducir un escape sin tipar.)
