import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { claimSchema } from '@/lib/validators/claim'
import { sendClaimNotificationToAdmin } from '@/lib/email'
import { getProfile } from '@/lib/data/consignataria-slugs'
import { enforceRateLimit, clientIp, rateLimitedResponse } from '@/lib/rate-limit-db'

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

    // Durable rate limit — this endpoint sends a real OTP/magic-link to the
    // submitted address. Bound per-IP and per-email so it can't be looped into
    // a mailbox-flooding / Supabase-auth-quota-exhaustion tool.
    for (const [id, limit] of [
      [`ip:${clientIp(req)}`, 10],
      [`email:${claimant_email.toLowerCase()}`, 3],
    ] as const) {
      const rl = await enforceRateLimit({ action: 'claims', identity: id, limit, windowSeconds: 3600 })
      if (!rl.ok) return rateLimitedResponse(rl.retryAfter)
    }
    const supabase = requireServiceClient()

    // Look up the consignataria. ~18 canonical profiles have no DB row yet (orphans);
    // for those, seed a minimal row from the static registry so the real owner can claim
    // instead of hitting a 404. Only canonical_slug + display_name are required — the
    // rest of the columns carry DB defaults (verified=false, featured=false, etc.).
    let consignataria: { canonical_slug: string; display_name: string; claimed_at: string | null } | null = null
    const { data: existing } = await supabase
      .from('consignatarias')
      .select('canonical_slug, display_name, claimed_at')
      .eq('canonical_slug', consignataria_slug)
      .maybeSingle()
    consignataria = existing

    if (!consignataria) {
      const staticProfile = getProfile(consignataria_slug)
      if (!staticProfile) {
        return NextResponse.json(
          { error: 'Consignataria no encontrada' },
          { status: 404 },
        )
      }
      const { data: seeded, error: seedError } = await supabase
        .from('consignatarias')
        .upsert(
          { canonical_slug: staticProfile.canonicalSlug, display_name: staticProfile.displayName },
          { onConflict: 'canonical_slug' },
        )
        .select('canonical_slug, display_name, claimed_at')
        .single()
      if (seedError || !seeded) {
        return NextResponse.json(
          { error: 'No se pudo iniciar el reclamo. Intentá de nuevo.' },
          { status: 500 },
        )
      }
      consignataria = seeded
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

    // Notify admin so the MANUAL review actually happens. Awaited + logged so a
    // missing RESEND key / send failure is VISIBLE in logs instead of silently
    // dropping the claim into a black hole. Never fail the request — claim is saved.
    try {
      await sendClaimNotificationToAdmin(
        consignataria.display_name,
        consignataria_slug,
        claimant_email,
        claimant_name || undefined,
        cuit || undefined,
      )
    } catch (e) {
      console.error('[claims] admin notification FAILED — review pending claim manually:', consignataria_slug, e)
    }

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
