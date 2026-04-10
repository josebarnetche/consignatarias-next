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

    // Insert claim as auto-approved
    const { error: insertError } = await supabase
      .from('consignataria_claims')
      .insert({
        consignataria_slug,
        claimant_email,
        claimant_name: claimant_name || null,
        claimant_phone: claimant_phone || null,
        claimant_role: claimant_role || null,
        cuit: cuit || null,
        status: 'approved',
      })

    if (insertError) {
      console.error('Claim insert error:', insertError)
      return NextResponse.json(
        { error: 'Error al guardar la solicitud' },
        { status: 500 },
      )
    }

    // Auto-approve: mark consignataria as claimed + verified
    await supabase
      .from('consignatarias')
      .update({
        verified: true,
        claimed_at: new Date().toISOString(),
        claimed_by_email: claimant_email,
      })
      .eq('canonical_slug', consignataria_slug)

    // Create Supabase Auth user (or get existing) + assign owner role
    try {
      const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
        email: claimant_email,
        email_confirm: true,
      })

      if (!createError && authUser?.user) {
        await supabase.from('user_roles').upsert({
          user_id: authUser.user.id,
          email: claimant_email,
          role: 'owner',
        }, { onConflict: 'user_id' })
      } else if (createError?.message?.includes('already been registered')) {
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const found = existingUsers?.users?.find(u => u.email === claimant_email)
        if (found) {
          await supabase.from('user_roles').upsert({
            user_id: found.id,
            email: claimant_email,
            role: 'owner',
          }, { onConflict: 'user_id' })
        }
      }
    } catch (e) {
      console.error('Auto-invite error:', e)
    }

    // Send magic link so user can log in immediately
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
      { message: 'Perfil verificado. Revisa tu email para acceder a tu panel.' },
      { status: 201 },
    )
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
