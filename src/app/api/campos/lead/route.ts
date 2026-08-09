import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireServiceClient } from '@/lib/supabase'
import { enforceRateLimit, clientIp, rateLimitedResponse } from '@/lib/rate-limit-db'
import { sendProducerLeadOps, sendValuacionAlDueno, sendBusquedaConfirmada } from '@/lib/email'
import { tierraDe, valuarCampo } from '@/lib/valuacion-campos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/campos/lead — captación propia del embudo de campos.
 *
 * Dos lados de la misma pinza, y los dos leads son NUESTROS:
 *
 *  · `busco`  — alguien busca campo para arrendar o comprar. Vale incluso con la
 *    sección vacía: es una lista de espera de demanda real, y es el argumento
 *    para conseguir oferta ("tengo doce productores buscando en tu zona").
 *  · `tengo`  — el dueño de un campo que quiere saber cuánto vale. Llega desde el
 *    tasador, que es donde ya puso provincia, superficie y canon.
 *
 * La relación no se deriva a nadie: entra a producer_leads y la conecta Jose.
 */
const schema = z.object({
  tipo: z.enum(['busco', 'tengo']),
  operacion: z.enum(['arrendar', 'comprar']).optional().nullable(),
  provincia: z.string().min(2).max(80),
  zona: z.string().max(120).optional().nullable(),
  hectareas: z.coerce.number().positive().max(1_000_000).optional().nullable(),
  nombre: z.string().min(2).max(120),
  telefono: z.string().min(6).max(40),
  email: z.string().email().optional().nullable().or(z.literal('')),
  mensaje: z.string().max(500).optional().nullable(),
  origen: z.string().max(60).optional().nullable(),
})

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = await enforceRateLimit({
    action: 'campos_lead',
    identity: `ip:${ip}`,
    limit: 8,
    windowSeconds: 86_400,
  })
  if (!rl.ok) return rateLimitedResponse(rl.retryAfter)

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  const d = parsed.data

  // El intent tiene CHECK en la base: solo estos valores entran.
  const intent =
    d.tipo === 'tengo' ? 'tasar' : d.operacion === 'comprar' ? 'comprar' : 'arrendar_busco'

  // Guardamos la referencia de valor del momento: dentro de seis meses el lead
  // sigue diciendo contra qué número lo miramos, y eso no se puede reconstruir.
  const ref = tierraDe(d.provincia, d.zona ?? null)
  const referencia = ref
    ? `Referencia al alta: US$${Math.round(ref.usd_ha).toLocaleString('es-AR')}/ha en ${ref.zona ?? ref.provincia}.`
    : ''

  const resumen =
    d.tipo === 'tengo'
      ? `Tiene un campo${d.hectareas ? ` de ${d.hectareas} ha` : ''} en ${d.zona ? `${d.zona}, ` : ''}${d.provincia} y quiere saber cuánto vale.`
      : `Busca campo para ${d.operacion === 'comprar' ? 'comprar' : 'arrendar'}${d.hectareas ? `, ~${d.hectareas} ha` : ''} en ${d.zona ? `${d.zona}, ` : ''}${d.provincia}.`

  try {
    const db = requireServiceClient()
    const { data: lead, error } = await db
      .from('producer_leads')
      .insert({
        intent,
        province: d.provincia.trim(),
        zona: d.zona?.trim() || null,
        hectareas: d.hectareas ?? null,
        name: d.nombre.trim(),
        phone: d.telefono.trim(),
        email: d.email?.trim().toLowerCase() || null,
        message: [resumen, d.mensaje?.trim(), referencia].filter(Boolean).join(' '),
        source: `campos:${d.tipo}${d.origen ? `:${d.origen}` : ''}`,
        status: 'new',
        ip_hash: ip,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[campos/lead] insert:', error.message)
      return NextResponse.json({ error: 'No se pudo registrar.' }, { status: 500 })
    }

    // Lo que le prometimos en la página, cumplido en el acto. Si esto queda para
    // hacerlo a mano, el formulario promete algo que no entrega.
    if (d.email) {
      const url = ref
        ? `https://www.consignatarias.com.ar/campos/valor-hectarea/${ref.provincia
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')}`
        : null
      if (d.tipo === 'tengo' && ref) {
        const v = valuarCampo({
          hectareas: d.hectareas ?? 1,
          provincia: d.provincia,
          zona: d.zona ?? null,
          kgHaMes: ref.kg_ha_mes_canon ?? null,
        })
        void sendValuacionAlDueno({
          to: d.email.trim().toLowerCase(),
          nombre: d.nombre.trim(),
          provincia: ref.provincia,
          zona: ref.zona ?? null,
          hectareas: d.hectareas ?? null,
          usdHa: v.usdHa,
          p25: ref.p25,
          p75: ref.p75,
          usdTotal: d.hectareas ? v.usdHa * d.hectareas : null,
          referencia: v.referenciaUsada ?? ref.provincia,
          canonKgHaMes: ref.kg_ha_mes_canon ?? null,
          esAgricola: v.esAgricola,
          fuente: ref.fuente ?? null,
        }).catch(() => {})
      } else if (d.tipo === 'busco') {
        void sendBusquedaConfirmada({
          to: d.email.trim().toLowerCase(),
          nombre: d.nombre.trim(),
          provincia: d.provincia.trim(),
          zona: d.zona?.trim() || null,
          hectareas: d.hectareas ?? null,
          operacion: d.operacion === 'comprar' ? 'comprar' : 'arrendar',
          usdHa: ref?.usd_ha ?? null,
          canonKgHaMes: ref?.kg_ha_mes_canon ?? null,
          referencia: url,
        }).catch(() => {})
      }
    }

    await sendProducerLeadOps({
      leadId: lead.id,
      intent,
      hectareas: d.hectareas ?? null,
      province: d.provincia.trim(),
      zona: d.zona?.trim() || null,
      source: `campos:${d.tipo}`,
      // Sin matches a propósito: el aviso interno es para que lo trabaje Jose,
      // no para proponer a quién derivarlo. La relación no se reparte.
      matches: [],
      lead: {
        name: d.nombre.trim(),
        phone: d.telefono.trim(),
        email: d.email?.trim().toLowerCase() || null,
        message: [resumen, referencia].filter(Boolean).join(' '),
      },
    }).catch(() => {})

    return NextResponse.json({ ok: true, id: lead.id })
  } catch (e) {
    console.error('[campos/lead]', e)
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 })
  }
}
