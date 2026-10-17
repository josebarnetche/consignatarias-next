import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { claimReviewSchema } from '@/lib/validators/claim'
import { sendClaimApproved, sendClaimRejected } from '@/lib/email'
import { normalizarEmail, otorgarRolDueno, METODOS_VERIFICACION } from '@/lib/claims/aprobar'

type Props = { params: Promise<{ id: string }> }

/**
 * Aprobar o rechazar el reclamo de la ficha de un frigorífico.
 *
 * ORDEN (revisión del 17-10-2026): primero se escribe el perfil y se revisa el error;
 * recién después el reclamo pasa a `approved`. Antes era al revés y sin mirar errores:
 * un reclamo podía figurar aprobado sin que la ficha hubiera quedado a nombre de nadie.
 * Aprobar exige decir cómo se verificó la identidad (`verificacion`), que queda escrito
 * en el reclamo. El sello público de "verificado" además exige SENASA vigente (eso lo
 * decide la ficha, frigorificos/[slug]).
 */
export async function PATCH(req: NextRequest, { params }: Props) {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.response!

  const { id } = await params

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
  }

  const body = await req.json()
  const parsed = claimReviewSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos invalidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { status, admin_notes, verificacion } = parsed.data
  const supabase = requireServiceClient()

  const { data: claim, error: fetchError } = await supabase
    .from('frigorifico_claims')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !claim) {
    return NextResponse.json({ error: 'Reclamo no encontrado' }, { status: 404 })
  }

  if (claim.status !== 'pending') {
    return NextResponse.json({ error: 'Esta solicitud ya fue procesada' }, { status: 409 })
  }

  if (status === 'rejected') {
    const { error } = await supabase
      .from('frigorifico_claims')
      .update({ status, admin_notes: admin_notes || null })
      .eq('id', id)
    if (error) {
      console.error('Frigorifico claim reject error:', error)
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
    }
    const envio = await sendClaimRejected(claim.claimant_email, claim.frigorifico_name, admin_notes || undefined)
    return NextResponse.json({ message: 'Solicitud rechazada', aviso_enviado: !!envio && !envio.error })
  }

  const email = normalizarEmail(claim.claimant_email)
  const nota = [`Identidad: ${METODOS_VERIFICACION[verificacion!]}.`, admin_notes].filter(Boolean).join(' ')

  // 0) Si la ficha ya tiene otro dueño, no se pisa: eso se resuelve a mano.
  const { data: actual } = await supabase
    .from('frigorifico_profiles')
    .select('claimed_by_email')
    .eq('cuit', claim.frigorifico_cuit)
    .maybeSingle()
  const duenoActual = normalizarEmail((actual as { claimed_by_email?: string | null } | null)?.claimed_by_email)
  if (duenoActual && duenoActual !== email) {
    return NextResponse.json(
      { error: 'La ficha ya tiene otro titular. Liberala primero si corresponde cambiarlo.' },
      { status: 409 },
    )
  }

  // 1) La ficha a nombre de quien reclama. Si falla, el reclamo sigue pendiente.
  const { error: perfilError } = await supabase
    .from('frigorifico_profiles')
    .upsert({
      cuit: claim.frigorifico_cuit,
      display_name: claim.frigorifico_name,
      verified: true,
      claimed_at: new Date().toISOString(),
      claimed_by_email: email,
    }, { onConflict: 'cuit' })
  if (perfilError) {
    console.error('Frigorifico profile upsert error:', perfilError)
    return NextResponse.json({ error: 'No se pudo asignar la ficha: el reclamo sigue pendiente' }, { status: 500 })
  }

  // 2) El reclamo, aprobado.
  const { error: claimError } = await supabase
    .from('frigorifico_claims')
    .update({ status: 'approved', admin_notes: nota })
    .eq('id', id)
  if (claimError) {
    console.error('Frigorifico claim update error:', claimError)
    return NextResponse.json({ error: 'La ficha quedó asignada pero el reclamo no se pudo marcar aprobado' }, { status: 500 })
  }

  // 3) Los otros pedidos pendientes de la misma planta, rechazados.
  const { error: otrosError } = await supabase
    .from('frigorifico_claims')
    .update({ status: 'rejected', admin_notes: 'Otra solicitud fue aprobada' })
    .eq('frigorifico_cuit', claim.frigorifico_cuit)
    .eq('status', 'pending')
    .neq('id', id)
  if (otrosError) console.error('Frigorifico claim auto-reject error:', otrosError)

  // 4) El rol de dueño (nunca baja a un admin).
  const rol = await otorgarRolDueno(supabase, email)
  if (!rol.ok) console.error('Frigorifico owner role error:', rol.error)

  // 5) El aviso: se espera y se informa.
  const envio = await sendClaimApproved(email, claim.frigorifico_name, `frigorificos/${claim.frigorifico_cuit}`)

  return NextResponse.json({
    message: 'Solicitud aprobada',
    rol: rol.resultado,
    aviso_enviado: !!envio && !envio.error,
    ...(rol.ok ? {} : { advertencia: `La ficha quedó asignada pero el rol de dueño falló: ${rol.error}` }),
  })
}
