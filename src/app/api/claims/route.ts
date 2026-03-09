import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { claimSchema } from '@/lib/validators/claim'
import { sendClaimConfirmation, sendClaimNotificationToAdmin } from '@/lib/email'

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
    const supabase = createServiceClient()

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

    // Check for duplicate pending claim
    const { data: existing } = await supabase
      .from('consignataria_claims')
      .select('id')
      .eq('consignataria_slug', consignataria_slug)
      .eq('claimant_email', claimant_email)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Ya tenés un reclamo pendiente para este perfil' },
        { status: 409 },
      )
    }

    // Insert claim
    const { error: insertError } = await supabase
      .from('consignataria_claims')
      .insert({
        consignataria_slug,
        claimant_email,
        claimant_name: claimant_name || null,
        claimant_phone: claimant_phone || null,
        claimant_role: claimant_role || null,
        cuit: cuit || null,
      })

    if (insertError) {
      console.error('Claim insert error:', insertError)
      return NextResponse.json(
        { error: 'Error al guardar el reclamo' },
        { status: 500 },
      )
    }

    // Fire emails (non-blocking)
    sendClaimConfirmation(claimant_email, consignataria.display_name, consignataria_slug)
    sendClaimNotificationToAdmin(
      consignataria.display_name,
      consignataria_slug,
      claimant_email,
      claimant_name || undefined,
      cuit || undefined,
    )

    return NextResponse.json(
      { message: 'Reclamo enviado correctamente' },
      { status: 201 },
    )
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
