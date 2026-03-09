import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { claimReviewSchema } from '@/lib/validators/claim'
import { sendClaimApproved, sendClaimRejected } from '@/lib/email'

type Props = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Props) {
  const auth = requireAdmin(req)
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

  const { status, admin_notes } = parsed.data
  const supabase = createServiceClient()

  // Fetch the claim
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

  // Update claim status
  const { error: updateError } = await supabase
    .from('consignataria_claims')
    .update({ status, admin_notes: admin_notes || null })
    .eq('id', id)

  if (updateError) {
    console.error('Claim update error:', updateError)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }

  const displayName = (claim.consignatarias as { display_name: string })?.display_name || ''

  if (status === 'approved') {
    // Mark consignataria as claimed
    await supabase
      .from('consignatarias')
      .update({
        verified: true,
        claimed_at: new Date().toISOString(),
        claimed_by_email: claim.claimant_email,
      })
      .eq('canonical_slug', claim.consignataria_slug)

    // Auto-reject other pending claims for this consignataria
    await supabase
      .from('consignataria_claims')
      .update({ status: 'rejected', admin_notes: 'Otra solicitud fue aprobada' })
      .eq('consignataria_slug', claim.consignataria_slug)
      .eq('status', 'pending')
      .neq('id', id)

    sendClaimApproved(claim.claimant_email, displayName, claim.consignataria_slug)
  } else {
    sendClaimRejected(claim.claimant_email, displayName, admin_notes || undefined)
  }

  return NextResponse.json({ message: `Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'}` })
}
