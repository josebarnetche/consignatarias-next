import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { claimReviewSchema } from '@/lib/validators/claim'
import { sendClaimApproved, sendClaimRejected } from '@/lib/email'

type Props = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Props) {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.response!

  const { id } = await params

  // Validate UUID format
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

  const { status, admin_notes } = parsed.data
  const supabase = requireServiceClient()

  // Fetch the claim
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

  // Update claim status
  const { error: updateError } = await supabase
    .from('frigorifico_claims')
    .update({ status, admin_notes: admin_notes || null })
    .eq('id', id)

  if (updateError) {
    console.error('Frigorifico claim update error:', updateError)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }

  if (status === 'approved') {
    // Upsert frigorifico_profiles row
    await supabase
      .from('frigorifico_profiles')
      .upsert({
        cuit: claim.frigorifico_cuit,
        display_name: claim.frigorifico_name,
        verified: true,
        claimed_at: new Date().toISOString(),
        claimed_by_email: claim.claimant_email,
      }, { onConflict: 'cuit' })

    // Auto-reject other pending claims for this frigorifico
    await supabase
      .from('frigorifico_claims')
      .update({ status: 'rejected', admin_notes: 'Otra solicitud fue aprobada' })
      .eq('frigorifico_cuit', claim.frigorifico_cuit)
      .eq('status', 'pending')
      .neq('id', id)

    // Auto-invite: create Supabase Auth user + owner role
    try {
      const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
        email: claim.claimant_email,
        email_confirm: true,
      })

      if (!createError && authUser?.user) {
        await supabase.from('user_roles').upsert({
          user_id: authUser.user.id,
          email: claim.claimant_email,
          role: 'owner',
        }, { onConflict: 'user_id' })
      } else if (createError?.message?.includes('already been registered')) {
        // User already exists — ensure they have owner role
        const { data: existingUser } = await supabase.auth.admin.listUsers()
        const found = existingUser?.users?.find(u => u.email === claim.claimant_email)
        if (found) {
          await supabase.from('user_roles').upsert({
            user_id: found.id,
            email: claim.claimant_email,
            role: 'owner',
          }, { onConflict: 'user_id' })
        }
      }
    } catch (e) {
      console.error('Auto-invite error:', e)
      // Non-blocking — claim is already approved
    }

    sendClaimApproved(claim.claimant_email, claim.frigorifico_name, `frigorificos/${claim.frigorifico_cuit}`)
  } else {
    sendClaimRejected(claim.claimant_email, claim.frigorifico_name, admin_notes || undefined)
  }

  return NextResponse.json({ message: `Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'}` })
}
