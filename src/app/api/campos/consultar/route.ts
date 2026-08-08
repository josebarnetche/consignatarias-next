import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireServiceClient } from '@/lib/supabase'
import { enforceRateLimit, clientIp, rateLimitedResponse } from '@/lib/rate-limit-db'
import { sendProducerLeadOps } from '@/lib/email'
import { fmtHa } from '@/lib/campos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/campos/consultar — alguien pregunta por un campo publicado.
 *
 * Entra como producer_lead (así lo levanta El Ovejero y el board de /admin/leads)
 * con source `campo:<id>`. El contacto de quien ofrece NO se devuelve nunca:
 * la conexión la hace Jose.
 */
const schema = z.object({
  campo_id: z.coerce.number().int().positive(),
  nombre: z.string().min(2).max(120),
  telefono: z.string().min(6).max(40),
  email: z.string().email().optional().nullable().or(z.literal('')),
  mensaje: z.string().max(500).optional().nullable(),
})

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = await enforceRateLimit({ action: 'consultar_campo', identity: `ip:${ip}`, limit: 10, windowSeconds: 86_400 })
  if (!rl.ok) return rateLimitedResponse(rl.retryAfter)

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }
  const d = parsed.data

  try {
    const db = requireServiceClient()
    const { data: campo } = await db
      .from('campos')
      .select('id, hectareas, provincia, partido, operacion, consultas')
      .eq('id', d.campo_id)
      .eq('status', 'publicado')
      .maybeSingle()

    if (!campo) return NextResponse.json({ error: 'Campo no disponible.' }, { status: 404 })

    const zona = campo.partido || campo.provincia
    const resumen = `${fmtHa(campo.hectareas)} en ${zona}`

    const { data: lead, error } = await db
      .from('producer_leads')
      .insert({
        intent: campo.operacion === 'venta' ? 'comprar' : 'arrendar_busco',
        province: campo.provincia,
        zona,
        hectareas: campo.hectareas,
        name: d.nombre.trim(),
        phone: d.telefono.trim(),
        email: d.email?.trim().toLowerCase() || null,
        message: `Consulta por el campo #${campo.id} (${resumen}). ${d.mensaje?.trim() ?? ''}`.trim(),
        source: `campo:${campo.id}`,
        status: 'new',
        ip_hash: ip,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[campos/consultar] insert:', error.message)
      return NextResponse.json({ error: 'No se pudo registrar la consulta.' }, { status: 500 })
    }

    await db.from('campos').update({ consultas: (campo.consultas ?? 0) + 1 }).eq('id', campo.id)

    sendProducerLeadOps({
      leadId: lead.id,
      intent: campo.operacion === 'venta' ? 'comprar' : 'arrendar_busco',
      hectareas: campo.hectareas,
      province: campo.provincia,
      zona,
      source: `campo:${campo.id}`,
      lead: { name: d.nombre, phone: d.telefono, email: d.email || null, message: d.mensaje || null },
      matches: [],
    })

    return NextResponse.json({ ok: true, mensaje: 'Consulta recibida.' })
  } catch (e) {
    console.error('[campos/consultar]', e)
    return NextResponse.json({ error: 'Error inesperado.' }, { status: 500 })
  }
}
