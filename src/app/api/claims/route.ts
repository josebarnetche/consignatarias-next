import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { claimSchema } from '@/lib/validators/claim'
import { sendClaimNotificationToAdmin } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = claimSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { consignataria_slug, claimant_email, claimant_name, claimant_phone, claimant_role, cuit } = parsed.data
    const supabase = requireServiceClient()

    // Verify consignataria exists
    const { data: consignataria, error: lookupError } = await supabase
      .from('consignatarias')
      .select('canonical_slug, display_name, claimed_at')
      .eq('canonical_slug', consignataria_slug)
      .single()

    if (lookupError || !consignataria) {
      return NextResponse.json(
        { error: 'Consignataria no encontrada' },
        { status: 404 },
      )
    }

    // Check if already claimed
    if (consignataria.claimed_at) {
      return NextResponse.json(
        { error: 'Este perfil ya fue reclamado' },
        { status: 409 },
      )
    }

    // SECURITY: insert as PENDING (not approved). The magic-link send below
    // is harmless — it lands in the real owner's inbox if the email is correct,
    // or in the attacker's if not. Approval (status='approved' + consignataria
    // verified flag + role assignment) is gated by the admin claims UI.
    //
    // TODO v1.15 — add /api/claims/[id]/confirm endpoint that flips
    // status='approved' + verified=true when the magic-link recipient
    // completes their first session for this email. Today, admin reviews
    // pending claims in /admin/claims and uses the existing approval flow
    // (see src/app/api/admin/claims/[id]/route.ts).
    const { error: insertError } = await supabase
      .from('consignataria_claims')
      .insert({
        consignataria_slug,
        claimant_email,
        claimant_name: claimant_name || null,
        claimant_phone: claimant_phone || null,
        claimant_role: claimant_role || null,
        cuit: cuit || null,
        status: 'pending',
      })

    if (insertError) {
      console.error('Claim insert error:', insertError)
      return NextResponse.json(
        { error: 'Error al guardar la solicitud' },
        { status: 500 },
      )
    }

    // Send magic link so the (presumed) owner can prove possession of the
    // inbox. We do NOT create the auth user or assign 'owner' role here —
    // that happens on admin approval.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'
    try {
      await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: claimant_email,
        options: {
          redirectTo: `${appUrl}/auth/callback?next=/dashboard`,
        },
      })
      // The generateLink with admin API doesn't send the email automatically.
      // Use signInWithOtp via a server-side call instead:
    } catch {
      // Non-blocking
    }

    // Send magic link via OTP (this actually sends the email)
    try {
      const { createClient: createAnonClient } = await import('@supabase/supabase-js')
      const anonClient = createAnonClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      await anonClient.auth.signInWithOtp({
        email: claimant_email,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback?next=/dashboard`,
        },
      })
    } catch (e) {
      console.error('Magic link send error:', e)
    }

    // Notify admin (non-blocking) — admin can review and revoke if needed
    sendClaimNotificationToAdmin(
      consignataria.display_name,
      consignataria_slug,
      claimant_email,
      claimant_name || undefined,
      cuit || undefined,
    )

    return NextResponse.json(
      {
        message:
          'Solicitud recibida. Revisaremos el reclamo y, una vez aprobado, podrás acceder a tu panel desde el link que enviamos por email.',
      },
      { status: 201 },
    )
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
