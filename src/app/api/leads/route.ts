import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendLeadAlert, LEAD_ALERT_TO } from '@/lib/email'
import { z } from 'zod'
import crypto from 'crypto'

const leadSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(2, 'Nombre muy corto'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  message: z.string().max(1000).optional(),
  source: z.enum(['profile', 'go_landing', 'remate']).default('profile'),
  remateId: z.number().optional(),
})

/**
 * POST /api/leads
 * 
 * Submit a lead/inquiry for a consignataria.
 * Captured before WhatsApp redirect for follow-up.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = leadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { slug, name, phone, email, message, source, remateId } = parsed.data

    // At least phone or email required
    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Necesitamos al menos un teléfono o email para contactarte' },
        { status: 400 }
      )
    }

    // Hash IP for rate limiting (privacy-preserving)
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0] || 'unknown'
    const ipHash = crypto.createHash('sha256').update(ip + slug).digest('hex').slice(0, 16)

    const supabase = requireServiceClient()

    // Rate limit: max 3 leads per IP per consignataria per day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('consignataria_leads')
      .select('*', { count: 'exact', head: true })
      .eq('consignataria_slug', slug)
      .eq('ip_hash', ipHash)
      .gte('created_at', oneDayAgo)

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: 'Demasiadas consultas. Intentá de nuevo mañana.' },
        { status: 429 }
      )
    }

    // Insert lead
    const { error } = await supabase
      .from('consignataria_leads')
      .insert({
        consignataria_slug: slug,
        name,
        phone: phone || null,
        email: email || null,
        message: message || null,
        source,
        remate_id: remateId || null,
        ip_hash: ipHash,
      })

    if (error) {
      console.error('Lead insert error:', error)
      return NextResponse.json({ error: 'Error al guardar consulta' }, { status: 500 })
    }

    // Alerta instantánea a la firma (solo si el perfil está reclamado). El contacto
    // va completo si es PRO (featured), enmascarado si no → empuja la conversión.
    try {
      const { data: cons } = await supabase
        .from('consignatarias')
        .select('display_name, claimed_by_email, featured')
        .eq('canonical_slug', slug)
        .maybeSingle()
      const owner = (cons as { display_name?: string; claimed_by_email?: string | null; featured?: boolean } | null)
      const consignataria = owner?.display_name || slug
      if (owner?.claimed_by_email) {
        // Firma reclamada: le llega a ella (gated PRO) y Jose queda copiado en bcc.
        void sendLeadAlert({
          to: owner.claimed_by_email,
          bcc: LEAD_ALERT_TO,
          consignataria,
          slug,
          isPro: !!owner.featured,
          lead: { name, phone, email, message },
        })
      } else {
        // Sin reclamar: no hay inbox de la firma → el lead va directo a Jose, con
        // contacto completo (es alerta interna, no la ve la firma).
        void sendLeadAlert({
          to: LEAD_ALERT_TO,
          consignataria,
          slug,
          isPro: true,
          lead: { name, phone, email, message },
        })
      }
    } catch (e) {
      console.error('Lead alert error:', e)
    }

    return NextResponse.json({
      success: true,
      message: 'Consulta enviada. La consignataria te contactará pronto.'
    })
  } catch (error) {
    console.error('Lead API error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
