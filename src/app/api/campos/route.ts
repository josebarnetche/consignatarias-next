import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireServiceClient } from '@/lib/supabase'
import { enforceRateLimit, clientIp, rateLimitedResponse } from '@/lib/rate-limit-db'
import { sendCampoPublicadoOps } from '@/lib/email'
import { APTITUDES, OPERACIONES, slugCampo } from '@/lib/campos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/campos — publicar un campo (arrendamiento o venta).
 *
 * Entra como `pendiente`: nada sale al aire sin revisión. El contacto del oferente
 * se guarda pero NO se publica nunca — las consultas pasan por nosotros.
 */
const schema = z.object({
  operacion: z.enum(OPERACIONES),
  hectareas: z.coerce.number().positive().max(1_000_000),
  provincia: z.string().min(2).max(60),
  partido: z.string().max(80).optional().nullable(),
  aptitud: z.enum(APTITUDES).optional().nullable(),
  descripcion: z.string().max(2000).optional().nullable(),
  mejoras: z.string().max(1000).optional().nullable(),
  precio_kg_ha_mes: z.coerce.number().positive().max(100).optional().nullable(),
  precio_usd_ha: z.coerce.number().positive().optional().nullable(),
  capacidad_cabezas: z.coerce.number().int().positive().max(100_000).optional().nullable(),
  contacto_nombre: z.string().max(120).optional().nullable(),
  contacto_email: z.string().email().optional().nullable(),
  contacto_telefono: z.string().max(40).optional().nullable(),
  consignataria_slug: z.string().max(120).optional().nullable(),
})

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = await enforceRateLimit({ action: 'publicar_campo', identity: `ip:${ip}`, limit: 5, windowSeconds: 86_400 })
  if (!rl.ok) return rateLimitedResponse(rl.retryAfter)

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', detalles: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }
  const d = parsed.data

  if (!d.contacto_email && !d.contacto_telefono) {
    return NextResponse.json({ error: 'Dejanos un email o un teléfono para poder contactarte.' }, { status: 400 })
  }
  if (d.operacion !== 'venta' && !d.precio_kg_ha_mes) {
    return NextResponse.json(
      { error: 'Para arrendamiento necesitamos el canon en kg de novillo por hectárea por mes. Si no lo tenés definido, poné el del año pasado y lo ajustamos.' },
      { status: 400 },
    )
  }
  if (d.operacion !== 'arrendamiento' && !d.precio_usd_ha) {
    return NextResponse.json({ error: 'Para venta necesitamos el precio en dólares por hectárea.' }, { status: 400 })
  }

  try {
    const db = requireServiceClient()
    const { data, error } = await db
      .from('campos')
      .insert({
        operacion: d.operacion,
        hectareas: d.hectareas,
        provincia: d.provincia.trim(),
        partido: d.partido?.trim() || null,
        aptitud: d.aptitud || null,
        descripcion: d.descripcion?.trim() || null,
        mejoras: d.mejoras?.trim() || null,
        precio_kg_ha_mes: d.precio_kg_ha_mes ?? null,
        precio_usd_ha: d.precio_usd_ha ?? null,
        capacidad_cabezas: d.capacidad_cabezas ?? null,
        contacto_nombre: d.contacto_nombre?.trim() || null,
        contacto_email: d.contacto_email?.trim().toLowerCase() || null,
        contacto_telefono: d.contacto_telefono?.trim() || null,
        origen: d.consignataria_slug ? 'consignataria' : 'web',
        consignataria_slug: d.consignataria_slug || null,
        origin_ip: ip,
        status: 'pendiente',
      })
      .select('id, operacion, hectareas, provincia, partido')
      .single()

    if (error) {
      console.error('[api/campos] insert:', error.message)
      return NextResponse.json({ error: 'No se pudo publicar el campo.' }, { status: 500 })
    }

    // El slug necesita el id, así que se completa después del insert.
    const slug = slugCampo(data)
    await db.from('campos').update({ slug }).eq('id', data.id)

    sendCampoPublicadoOps({
      id: data.id,
      resumen: `${d.operacion} · ${d.hectareas} ha en ${d.partido || d.provincia}`,
      precio:
        d.operacion === 'venta'
          ? `US$${d.precio_usd_ha}/ha`
          : `${d.precio_kg_ha_mes} kg/ha/mes`,
      contacto: [d.contacto_nombre, d.contacto_telefono, d.contacto_email].filter(Boolean).join(' · '),
    })

    return NextResponse.json({
      ok: true,
      id: data.id,
      slug,
      mensaje: 'Recibimos tu campo. Lo revisamos y lo publicamos en el día; si falta algún dato te escribimos.',
    })
  } catch (e) {
    console.error('[api/campos]', e)
    return NextResponse.json({ error: 'Error inesperado.' }, { status: 500 })
  }
}
