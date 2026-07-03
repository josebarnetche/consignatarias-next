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

/**
 * ESCAPE HATCH tipado para tablas que NO están en el esquema (deuda documentada:
 * `users`, `cron_state` — ver la ALLOWLIST de scripts/check-db-refs.mjs y el
 * Proyecto C). Deja la query sin tipar A PROPÓSITO y de forma VISIBLE, para que
 * el resto del código sí gane el chequeo de compilación. NO usar para tablas
 * reales: para esas, `client.from('tabla')` tipado convierte un typo en error de
 * build. Cada uso acá es un TODO de reconciliación.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromUnsafe(client: ServiceClient, table: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).from(table)
}

/**
 * @deprecated Client service_role SIN tipar, SOLO para rutas-deuda que ya están
 * rotas en prod (el API-key legacy de `alertas/*` que consulta `public.users`
 * inexistente; los crons que usan columnas viejas / `cron_state`). Devuelve el
 * mismo singleton pero como `SupabaseClient` sin `<Database>`, para que esas rutas
 * compilen mientras se reconcilian. NO usar en código nuevo — usá el client tipado
 * (`requireServiceClient`) para que un typo de tabla/columna sea error de build.
 * Cada llamada es un TODO de reconciliación (ver Proyecto C + ROADMAP).
 */
export function requireServiceClientLegacy(): SupabaseClient {
  return requireServiceClient() as unknown as SupabaseClient
}
