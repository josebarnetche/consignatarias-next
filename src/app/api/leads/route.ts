import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
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

    return NextResponse.json({ 
      success: true, 
      message: 'Consulta enviada. La consignataria te contactará pronto.' 
    })
  } catch (error) {
    console.error('Lead API error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
