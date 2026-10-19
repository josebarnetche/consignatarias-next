/**
 * aprobar.ts — lo que tienen en común las tres vías que aprueban un reclamo de ficha
 * (admin de consignatarias, admin de frigoríficos y la auto-aprobación).
 *
 * POR QUÉ EXISTE (revisión del 17-10-2026)
 *  · Las tres hacían `user_roles.upsert({ role: 'owner' })` a ciegas: si el mail del
 *    reclamo era el de un admin —una prueba, por ejemplo—, ese admin perdía /admin.
 *  · Buscaban al usuario existente con `listUsers()` sin paginar: más allá de los
 *    primeros 50 usuarios no lo encontraban y el dueño quedaba sin rol.
 *  · Comparaban mails con `===`: un reclamo escrito con mayúsculas dejaba al dueño
 *    afuera de su propia ficha, porque la sesión de Supabase siempre es minúscula.
 *
 * REGLA: el mail que se guarda como dueño va SIEMPRE normalizado, y toda comparación
 * de mails pasa por `mismoEmail`.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export function normalizarEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

/** true si los dos mails son el mismo, ignorando mayúsculas y espacios. Vacío ≠ vacío. */
export function mismoEmail(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = normalizarEmail(a)
  return x !== '' && x === normalizarEmail(b)
}

/** Cómo se comprobó que quien reclama es la firma. Obligatorio para aprobar a mano. */
export const METODOS_VERIFICACION = {
  email_registrado: 'El mail coincide con el que la firma tiene registrado',
  dominio_propio: 'El mail es del dominio propio de la firma',
  documentacion: 'Mandó documentación (constancia, poder o estatuto)',
  llamada: 'Confirmado por teléfono al número oficial de la firma',
} as const
export type MetodoVerificacion = keyof typeof METODOS_VERIFICACION

async function buscarUsuarioPorEmail(db: SupabaseClient, email: string): Promise<string | null> {
  // Paginado: listUsers devuelve de a una página; sin recorrerlas, un usuario que no
  // está en la primera no aparece.
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const users = data?.users ?? []
    const found = users.find((u) => mismoEmail(u.email, email))
    if (found) return found.id
    if (users.length < 1000) return null
  }
  return null
}

export interface ResultadoRol {
  ok: boolean
  userId: string | null
  /** 'admin_conservado' cuando el mail era de un admin: no se le baja el rol. */
  resultado: 'owner_asignado' | 'admin_conservado' | 'error'
  error?: string
}

/**
 * Da el rol de dueño al mail del reclamo, creando el usuario si no existe. Nunca baja
 * a un admin. No tira: devuelve el error para que la ruta lo registre y lo muestre.
 */
export async function otorgarRolDueno(
  db: SupabaseClient,
  emailCrudo: string,
  userIdConocido?: string,
): Promise<ResultadoRol> {
  const email = normalizarEmail(emailCrudo)
  try {
    let userId = userIdConocido ?? null
    if (!userId) {
      const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true })
      if (data?.user) userId = data.user.id
      else if (error && /already (been )?registered|already exists/i.test(error.message)) {
        userId = await buscarUsuarioPorEmail(db, email)
      } else if (error) throw error
    }
    if (!userId) return { ok: false, userId: null, resultado: 'error', error: 'No se encontró ni se pudo crear el usuario' }

    const { data: actual, error: rolError } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
    if (rolError) throw rolError
    if ((actual as { role?: string } | null)?.role === 'admin') {
      return { ok: true, userId, resultado: 'admin_conservado' }
    }

    const { error: upsertError } = await db
      .from('user_roles')
      .upsert({ user_id: userId, email, role: 'owner' }, { onConflict: 'user_id' })
    if (upsertError) throw upsertError
    return { ok: true, userId, resultado: 'owner_asignado' }
  } catch (e) {
    return { ok: false, userId: null, resultado: 'error', error: e instanceof Error ? e.message : String(e) }
  }
}
