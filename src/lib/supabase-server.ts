import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'
import { requireServiceClient, type ServiceClient } from './supabase'

/**
 * Cliente de servicio (service_role, bypassa RLS). @deprecated — es un ALIAS del
 * client canónico `requireServiceClient()` (src/lib/supabase.ts). Se mantiene por
 * compatibilidad; en código nuevo importá `requireServiceClient` directo. Antes
 * era una 2da implementación divergente (creaba un client nuevo por llamada, con
 * non-null `!` que tiraba en preview sin envs); ahora hay UN solo service client.
 */
export function createAdminClient(): ServiceClient {
  return requireServiceClient()
}

/**
 * Igual que `createAdminClient()`, pero devuelve `null` en vez de explotar cuando el
 * entorno no tiene la service-role key.
 *
 * POR QUÉ: `SUPABASE_SERVICE_ROLE_KEY` está cargada en Vercel SÓLO en Production. Toda
 * página estática que consulte la base durante el build funciona en producción y tira
 * abajo el build de PREVIEW. Al 17-sep-2026 los 4 deploys fallados de los últimos 20 eran
 * previews y murieron exactamente así; los 16 de producción pasaron todos.
 *
 * En PRODUCCIÓN sigue siendo un error duro: si falta la variable ahí, hay un problema real
 * y tiene que verse. Sólo afloja en preview/desarrollo, donde la página debe renderizar su
 * estado vacío en lugar de voltear el deploy entero.
 *
 * Sólo para páginas PRERENDERIZADAS. Una ruta de API o una página dinámica que necesite la
 * base debe seguir usando `createAdminClient()` y fallar fuerte.
 */
export function adminClientOpcional(): ServiceClient | null {
  try {
    return requireServiceClient()
  } catch (err) {
    if (process.env.VERCEL_ENV === 'production') throw err
    console.warn(
      '[supabase] sin service-role en este build; se prerenderiza el estado vacío:',
      err instanceof Error ? err.message : err,
    )
    return null
  }
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from Server Component — ignore.
            // Middleware will refresh the session.
          }
        },
      },
    },
  )
}
