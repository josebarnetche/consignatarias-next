import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { requireServiceClient } from '@/lib/supabase'
import { getCanonicalSlug, getProfile } from '@/lib/data/consignataria-slugs'
import { METODOS_VERIFICACION, normalizarEmail, otorgarRolDueno } from '@/lib/claims/aprobar'
import { sendClaimApproved } from '@/lib/email'

/**
 * POST /api/admin/firmas/alta  { slug, email, verificacion, nota? }
 *
 * Alta de una firma por el admin (17-10-2026): el camino para cuando la firma acepta
 * la propuesta por teléfono o en una reunión y no va a completar el formulario de
 * reclamo. Hace en un paso lo mismo que aprobar un reclamo —con el mismo orden y las
 * mismas reglas—: la ficha a nombre del mail, el reclamo aprobado con el método de
 * verificación escrito, el rol de dueño y el mail de bienvenida con el acceso.
 *
 * No pisa a un titular existente: si la ficha ya es de otro mail, responde 409.
 * No activa PRO: eso es el pago (o el destaque manual, que se marca aparte).
 */
const schema = z.object({
  slug: z.string().min(1).max(120),
  email: z.string().email().max(254).transform((e) => normalizarEmail(e)),
  verificacion: z.enum(Object.keys(METODOS_VERIFICACION) as [keyof typeof METODOS_VERIFICACION, ...(keyof typeof METODOS_VERIFICACION)[]]),
  nota: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.response!

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const { email, verificacion, nota } = parsed.data
  const slug = getCanonicalSlug(parsed.data.slug.trim())
  const perfil = slug ? getProfile(slug) : null
  if (!slug || !perfil) return NextResponse.json({ error: 'Consignataria no encontrada' }, { status: 404 })

  const db = requireServiceClient()

  const { data: actual } = await db
    .from('consignatarias')
    .select('claimed_by_email')
    .eq('canonical_slug', slug)
    .maybeSingle()
  const dueno = normalizarEmail((actual as { claimed_by_email?: string | null } | null)?.claimed_by_email)
  if (dueno && dueno !== email) {
    return NextResponse.json({ error: 'La ficha ya tiene otro titular. Liberala primero si corresponde cambiarlo.' }, { status: 409 })
  }

  // 1) La ficha a nombre del mail (siembra la fila si la firma nunca editó su ficha).
  const { data: escrita, error: fichaError } = await db
    .from('consignatarias')
    .upsert(
      {
        canonical_slug: slug,
        display_name: perfil.displayName,
        verified: true,
        claimed_at: new Date().toISOString(),
        claimed_by_email: email,
      },
      { onConflict: 'canonical_slug' },
    )
    .select('canonical_slug')
  if (fichaError || !escrita?.length) {
    return NextResponse.json({ error: `No se pudo asignar la ficha: ${fichaError?.message ?? 'sin filas'}` }, { status: 500 })
  }

  // 2) El reclamo, ya aprobado, con cómo se verificó. Los pendientes de otros mails
  //    para la misma firma se rechazan, igual que al aprobar uno.
  const notaFinal = [`Alta por admin (${auth.email}).`, `Identidad: ${METODOS_VERIFICACION[verificacion]}.`, nota]
    .filter(Boolean)
    .join(' ')
  const { error: claimError } = await db.from('consignataria_claims').insert({
    consignataria_slug: slug,
    claimant_email: email,
    status: 'approved',
    admin_notes: notaFinal,
  })
  if (claimError) console.error('[alta firma] claim insert:', claimError)
  await db
    .from('consignataria_claims')
    .update({ status: 'rejected', admin_notes: 'La ficha se dio de alta a otro mail' })
    .eq('consignataria_slug', slug)
    .eq('status', 'pending')
    .neq('claimant_email', email)

  // 3) Rol de dueño (crea el usuario si no existe; nunca baja a un admin).
  const rol = await otorgarRolDueno(db, email)

  // 4) Bienvenida con el acceso: entra con su mail en /login, sin contraseña.
  const envio = await sendClaimApproved(email, perfil.displayName, `consignatarias/${slug}`)

  try {
    revalidatePath(`/consignatarias/${slug}`)
  } catch { /* fuera de un request de Next */ }

  return NextResponse.json({
    ok: true,
    slug,
    rol: rol.resultado,
    aviso_enviado: !!envio && !envio.error,
    ...(rol.ok ? {} : { advertencia: `La ficha quedó asignada pero el rol de dueño falló: ${rol.error}` }),
  })
}
