import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/admin-auth'
import { requireServiceClient, type ServiceClient } from '@/lib/supabase'
import { mismoEmail } from '@/lib/claims/aprobar'
import { getConsignatariaPlanStatus } from '@/lib/features'
import { getProfile } from '@/lib/data/consignataria-slugs'
import { enforceRateLimit, rateLimitedResponse } from '@/lib/rate-limit-db'
import { urlPreofertaFirma } from '@/lib/preofertas-firma'

/**
 * Autorización de las rutas del dueño de /api/consignatarias/[slug]/preofertas
 * (17-10-2026). Mismo criterio que el PATCH del perfil (sesión + claimed_by_email vía
 * `mismoEmail`), más los admins, que pueden operar cualquier firma — Memola arma la
 * primera pre-oferta con la firma al lado.
 *
 * El gate de plan: la pre-oferta es función de PRO Consignataria. Sin PRO se puede
 * cerrar o borrar lo que ya existe (una firma que dejó de pagar no queda con un remate
 * abierto que no puede apagar), pero no crear, editar ni publicar. El admin no pasa por
 * el gate: si Memola decide publicar por una firma, es decisión comercial suya.
 */

export const MENSAJE_SOLO_PRO =
  'Las pre-ofertas son parte de PRO Consignataria. Activá el plan para cargar lotes y recibir ofertas: /planes#consignataria'

export type ContextoFirma =
  | { ok: false; response: Response }
  | { ok: true; db: ServiceClient; email: string; esAdmin: boolean; esPro: boolean }

export async function autorizarFirma(slug: string): Promise<ContextoFirma> {
  const auth = await requireAuth()
  if (!auth.authorized) return { ok: false, response: auth.response! }
  const email = auth.email ?? ''
  const esAdmin = auth.role === 'admin'

  const db = requireServiceClient()
  const { data: firma } = await db
    .from('consignatarias')
    .select('claimed_by_email')
    .eq('canonical_slug', slug)
    .maybeSingle()

  if (!esAdmin) {
    if (!firma) return { ok: false, response: NextResponse.json({ error: 'Consignataria no encontrada' }, { status: 404 }) }
    if (!mismoEmail(firma.claimed_by_email, email)) {
      return { ok: false, response: NextResponse.json({ error: 'No sos el propietario de este perfil' }, { status: 403 }) }
    }
  } else if (!firma && !getProfile(slug)) {
    // El admin puede operar una firma que nunca editó su ficha, pero tiene que existir.
    return { ok: false, response: NextResponse.json({ error: 'Consignataria no encontrada' }, { status: 404 }) }
  }

  // Tope de escrituras por usuario: un panel normal hace decenas por remate, no cientos.
  const rl = await enforceRateLimit({ action: 'preofertas_firma_write', identity: `user:${email.toLowerCase()}`, limit: 200, windowSeconds: 3600 })
  if (!rl.ok) return { ok: false, response: rateLimitedResponse(rl.retryAfter) }

  const esPro = esAdmin || (await getConsignatariaPlanStatus(slug)).isPro
  return { ok: true, db, email, esAdmin, esPro }
}

export function respuestaSoloPro(): NextResponse {
  return NextResponse.json({ error: MENSAJE_SOLO_PRO, code: 'requiere_pro' }, { status: 403 })
}

/** Mensaje de error de validación de zod, el primero, legible en pantalla. */
export function errorDeValidacion(issues: { message: string }[]): NextResponse {
  return NextResponse.json({ error: issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
}

/** Lee el body como JSON; null si no lo es. */
export async function leerJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    return null
  }
}

/** Refresca el listado público y la ficha: el listado es ISR y no se enteraría solo. */
export function refrescarPublico(id?: string): void {
  try {
    revalidatePath('/preofertas')
    if (id) revalidatePath(urlPreofertaFirma(id))
  } catch {
    /* fuera de un request (tests) no hay caché que invalidar */
  }
}
