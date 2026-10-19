import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { claimReviewSchema } from '@/lib/validators/claim'
import { sendClaimApproved, sendClaimRejected } from '@/lib/email'
import { normalizarEmail, otorgarRolDueno, METODOS_VERIFICACION } from '@/lib/claims/aprobar'

type Props = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Props) {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.response!

  const { id } = await params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  const body = await req.json()
  const parsed = claimReviewSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { status, admin_notes, verificacion } = parsed.data
  const supabase = requireServiceClient()

  const { data: claim, error: fetchError } = await supabase
    .from('consignataria_claims')
    .select('*, consignatarias(display_name)')
    .eq('id', id)
    .single()

  if (fetchError || !claim) {
    return NextResponse.json({ error: 'Reclamo no encontrado' }, { status: 404 })
  }

  if (claim.status !== 'pending') {
    return NextResponse.json({ error: 'Esta solicitud ya fue procesada' }, { status: 409 })
  }

  const displayName = (claim.consignatarias as { display_name: string })?.display_name || ''

  if (status === 'rejected') {
    const { error } = await supabase
      .from('consignataria_claims')
      .update({ status, admin_notes: admin_notes || null })
      .eq('id', id)
    if (error) {
      console.error('Claim reject error:', error)
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
    }
    const envio = await sendClaimRejected(claim.claimant_email, displayName, admin_notes || undefined)
    return NextResponse.json({ message: 'Solicitud rechazada', aviso_enviado: !!envio && !envio.error })
  }

  // ORDEN (revisión del 17-10-2026): primero la ficha, verificando que se escribió;
  // recién después el reclamo pasa a aprobado. Antes un update que no tocaba ninguna
  // fila (o fallaba) dejaba el reclamo "aprobado" y la ficha sin dueño.
  const email = normalizarEmail(claim.claimant_email)
  const nota = [`Identidad: ${METODOS_VERIFICACION[verificacion!]}.`, admin_notes].filter(Boolean).join(' ')

  const { data: actual } = await supabase
    .from('consignatarias')
    .select('claimed_by_email')
    .eq('canonical_slug', claim.consignataria_slug)
    .maybeSingle()
  const duenoActual = normalizarEmail((actual as { claimed_by_email?: string | null } | null)?.claimed_by_email)
  if (duenoActual && duenoActual !== email) {
    return NextResponse.json(
      { error: 'La ficha ya tiene otro titular. Liberala primero si corresponde cambiarlo.' },
      { status: 409 },
    )
  }

  const { data: fichas, error: fichaError } = await supabase
    .from('consignatarias')
    .update({ verified: true, claimed_at: new Date().toISOString(), claimed_by_email: email })
    .eq('canonical_slug', claim.consignataria_slug)
    .select('canonical_slug')
  if (fichaError || !fichas?.length) {
    console.error('Consignataria claim profile error:', fichaError ?? 'ninguna fila con ese slug')
    return NextResponse.json({ error: 'No se pudo asignar la ficha: el reclamo sigue pendiente' }, { status: 500 })
  }

  const { error: claimError } = await supabase
    .from('consignataria_claims')
    .update({ status: 'approved', admin_notes: nota })
    .eq('id', id)
  if (claimError) {
    console.error('Claim update error:', claimError)
    return NextResponse.json({ error: 'La ficha quedó asignada pero el reclamo no se pudo marcar aprobado' }, { status: 500 })
  }

  const { error: otrosError } = await supabase
    .from('consignataria_claims')
    .update({ status: 'rejected', admin_notes: 'Otra solicitud fue aprobada' })
    .eq('consignataria_slug', claim.consignataria_slug)
    .eq('status', 'pending')
    .neq('id', id)
  if (otrosError) console.error('Claim auto-reject error:', otrosError)

  const rol = await otorgarRolDueno(supabase, email)
  if (!rol.ok) console.error('Consignataria owner role error:', rol.error)

  const envio = await sendClaimApproved(email, displayName, `consignatarias/${claim.consignataria_slug}`)

  return NextResponse.json({
    message: 'Solicitud aprobada',
    rol: rol.resultado,
    aviso_enviado: !!envio && !envio.error,
    ...(rol.ok ? {} : { advertencia: `La ficha quedó asignada pero el rol de dueño falló: ${rol.error}` }),
  })
}
