import 'server-only'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

/** ¿La sesión actual es de un admin? Para abrir la propuesta y sus capturas sin token. */
export async function esAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false
    const service = createServiceClient()
    if (!service) return false
    const { data } = await service.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
    return data?.role === 'admin'
  } catch {
    return false
  }
}
