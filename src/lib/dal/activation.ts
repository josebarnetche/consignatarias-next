import { requireServiceClient } from '@/lib/supabase'

export interface ActivationStatus {
  /** El usuario guardó al menos un remate (tabla `remate_favorites`). */
  hasSavedRemates: boolean
  /** El usuario tiene una alerta de remates activa: sigue alguna consignataria
   *  con `notify_new_remate` (tabla `user_favorites`). */
  hasAlerts: boolean
}

/**
 * Estado de activación del usuario para el checklist gamificado de DT-e.
 *
 * DAL canónico (no lógica ad-hoc dentro de la route): el review detectó que el
 * problema sistémico es que cada ruta habla con la DB por su cuenta. Acá vive la
 * única definición de "qué cuenta como activado".
 *
 * Alineación producto↔dato (la crítica lo marcó): el checklist dice "Guardá un
 * remate" → se mide contra `remate_favorites` (guardar un remate puntual), NO
 * contra `user_favorites` (que es seguir una consignataria). "Creá una alerta de
 * remates" → `user_favorites.notify_new_remate` (seguir con notificaciones).
 *
 * NO SILENCIA FALLAS: si una query devuelve `error`, LANZA. Un fallo de datos no
 * puede disfrazarse de "el usuario no tiene nada" (eso volvería a convertir una
 * falla en un falso negativo aparentemente válido — el bug que este trabajo cierra).
 * El caller (la route) traduce la excepción a un 500 explícito.
 */
export async function getActivationStatus(userId: string): Promise<ActivationStatus> {
  const service = requireServiceClient()

  const [saved, alerts] = await Promise.all([
    service.from('remate_favorites').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    service
      .from('user_favorites')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('notify_new_remate', true),
  ])

  if (saved.error) throw new Error(`activation: remate_favorites query failed: ${saved.error.message}`)
  if (alerts.error) throw new Error(`activation: user_favorites query failed: ${alerts.error.message}`)

  return {
    hasSavedRemates: (saved.count ?? 0) > 0,
    hasAlerts: (alerts.count ?? 0) > 0,
  }
}
