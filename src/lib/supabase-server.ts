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
