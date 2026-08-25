import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireServiceClient } from '@/lib/supabase'
import { enforceRateLimit, clientIp, rateLimitedResponse } from '@/lib/rate-limit-db'
import { estimateOperation, matchConsignatarias, whatsappLink, DEFAULT_FEE_PCT } from '@/lib/leads/routing'
import { triageLead, dedupeKey, DEDUPE_WINDOW_HOURS } from '@/lib/leads/triage'
import { sendProducerLeadOps, sendProducerLeadConfirmation, sendFrigorificoLeadAlert } from '@/lib/email'
import { getFrigorificoProfile } from '@/lib/dal/frigorificos'
import { z } from 'zod'
import crypto from 'crypto'

export const runtime = 'nodejs'

/**
 * POST /api/producer-leads
 *
 * Captura de intención de PRODUCTOR desde las herramientas gratis (arrendamiento,
 * valuation, mercado, remates). Es el top-of-funnel de la máquina de lead-gen a
 * performance: guardamos el lead, estimamos el valor de la operación + fee 1%,
 * matcheamos consignatarias de la zona y disparamos el ops-alert a Jose para que
 * lo rutee por WhatsApp/teléfono (las firms no usan la web). Cobramos al cierre.
 *
 * Distinto de /api/leads (ese es una consulta atada a un perfil ya elegido).
 */

const schema = z.object({
  intent: z.enum(['vender', 'comprar', 'arrendar', 'consignar', 'tasar', 'arrendar_ofrezco', 'arrendar_busco']),
  category: z.string().max(40).optional(),
  headCount: z.number().int().positive().max(100000).optional(),
  hectareas: z.number().int().positive().max(1000000).optional(),
  desiredPriceArs: z.number().positive().max(1e12).optional(),
  province: z.string().max(60).optional(),
  zona: z.string().max(120).optional(),
  name: z.string().min(2, 'Nombre muy corto').max(120),
  phone: z.string().max(40).optional(),
  email: z.string().email('Email inválido').max(160).optional(),
  message: z.string().max(1000).optional(),
  source: z.string().max(80).default('producer-lead'),
})

// producer_leads todavía no está en database.types → cliente sin tipar.
function db(): SupabaseClient {
  return requireServiceClient() as unknown as SupabaseClient
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req)
    const rl = await enforceRateLimit({ action: 'producer-lead', identity: `ip:${ip}`, limit: 6, windowSeconds: 3600 })
    if (!rl.ok) return rateLimitedResponse(rl.retryAfter)

    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }
    const d = parsed.data

    // Necesitamos una vía de contacto: teléfono o email.
    if (!d.phone && !d.email) {
      return NextResponse.json({ error: 'Dejanos un teléfono o email para que te contacten' }, { status: 400 })
    }

    // El estimador de valor/fee es de VENTA de hacienda (cabezas × peso × INMAG).
    // En arrendamiento NO aplica (el "80" son hectáreas, no vacas) → sin valor de
    // hacienda; el negocio ahí es el canon/spread, que se evalúa con hectáreas +
    // precio deseado.
    const isArrendamiento = d.intent.startsWith('arrendar')
    const { estimatedValueArs, feeArs, feePct } = isArrendamiento
      ? { estimatedValueArs: null as number | null, feeArs: null as number | null, feePct: DEFAULT_FEE_PCT }
      : estimateOperation({ headCount: d.headCount, category: d.category })
    const ipHash = crypto.createHash('sha256').update(ip + d.name).digest('hex').slice(0, 16)

    const supabase = db()

    // DEDUP — el mismo contacto, con la misma intención, dentro de las 24 h es un
    // solo lead. Pasó de verdad: el par 13/14 (mismo mail, mismo pedido, mismo día)
    // y el 11/12. Se responde 200 con el id existente para que el formulario no le
    // muestre un error a alguien que simplemente apretó enviar dos veces.
    const dkey = dedupeKey({ email: d.email, phone: d.phone, intent: d.intent })
    if (dkey) {
      const desde = new Date(Date.now() - DEDUPE_WINDOW_HOURS * 3600 * 1000).toISOString()
      const { data: previos } = await supabase
        .from('producer_leads')
        .select('id, email, phone, intent')
        .eq('intent', d.intent)
        .gte('created_at', desde)
        .limit(50)

      const yaEsta = (previos || []).find(
        (p: { email: string | null; phone: string | null; intent: string }) =>
          dedupeKey({ email: p.email, phone: p.phone, intent: p.intent }) === dkey,
      ) as { id: number } | undefined

      if (yaEsta) {
        return NextResponse.json({ ok: true, leadId: yaEsta.id, duplicate: true }, { status: 200 })
      }
    }

    // TRIAGE — lo que no se puede rutear no entra como 'new', entra como
    // 'needs_review' para que lo mire una persona. Ni el Ovejero ni el ruteo
    // automático tocan un lead en revisión. Nunca se descarta solo.
    const triage = triageLead({
      intent: d.intent,
      province: d.province,
      zona: d.zona,
      headCount: d.headCount,
      hectareas: d.hectareas,
      message: d.message,
      name: d.name,
    })

    const { data: inserted, error } = await supabase
      .from('producer_leads')
      .insert({
        intent: d.intent,
        category: d.category ?? null,
        head_count: isArrendamiento ? null : (d.headCount ?? null),
        hectareas: isArrendamiento ? (d.hectareas ?? d.headCount ?? null) : (d.hectareas ?? null),
        desired_price_ars: d.desiredPriceArs ?? null,
        province: d.province ?? null,
        zona: d.zona ?? null,
        name: d.name,
        phone: d.phone ?? null,
        email: d.email ?? null,
        message: d.message ?? null,
        source: d.source,
        estimated_value_ars: estimatedValueArs,
        fee_pct: feePct,
        fee_ars: feeArs,
        status: triage.status,
        notes: triage.motivo,
        ip_hash: ipHash,
      })
      .select('id')
      .single()

    if (error || !inserted) {
      console.error('producer_lead insert error:', error)
      return NextResponse.json({ error: 'No pudimos guardar tu consulta' }, { status: 500 })
    }
    const leadId = (inserted as { id: number }).id

    // Acuse de recibo al productor (si dejó email): confirma que la recibimos,
    // que lo contactamos por email, y le deja el WhatsApp directo del founder.
    // reply-to = agro@memola.com.ar. No bloquea la respuesta.
    if (d.email) {
      sendProducerLeadConfirmation({
        to: d.email,
        name: d.name,
        intent: d.intent,
        zona: d.zona,
        province: d.province,
      }).catch((e) => console.error('producer_lead confirmation error:', e))
    }

    // Re-ruteo automático a la planta si el lead es para un frigorífico específico
    // (source=frigorifico:<cuit>): la planta se entera sola, con el contacto del
    // productor GATEADO. Para avanzar responde el mail → cae en agro@ y conectamos
    // (queda la comisión). Menos intervención manual. No bloquea.
    if (d.source.startsWith('frigorifico:')) {
      const cuit = d.source.slice('frigorifico:'.length)
      getFrigorificoProfile(cuit)
        .then((prof) => {
          const to = prof?.email || prof?.claimedByEmail
          if (!prof || !to) return
          return sendFrigorificoLeadAlert({
            to,
            frigorificoName: prof.name || 'tu frigorífico',
            lead: {
              category: d.category,
              headCount: d.headCount,
              province: d.province,
              zona: d.zona,
              desiredPriceArs: d.desiredPriceArs,
              message: d.message,
            },
          })
        })
        .catch((err) => console.error('frigorifico lead re-route error:', err))
    }

    // Match de firmas de la zona + ops-alert a Jose (driver del ruteo).
    // No bloquea la respuesta al usuario si el mail falla.
    //
    // Un lead en revisión NO dispara el alert: el alert existe para prearmar el
    // WhatsApp a una consignataria, y no se le prearma un mensaje a una firma por
    // un lead que todavía no sabemos si es un lead. Queda visible en /admin/leads
    // con su motivo en `notes`, que es donde se revisa.
    if (triage.status === 'new') {
      try {
        const matches = await matchConsignatarias(supabase, { province: d.province, zona: d.zona, limit: 5 })
        const waText = `Hola, tengo un productor interesado (${d.intent}${d.headCount ? `, ${d.headCount} cab` : ''}${d.zona ? `, ${d.zona}` : ''}) vía consignatarias.com. ¿Te lo paso?`
        await sendProducerLeadOps({
          leadId,
          intent: d.intent,
          category: d.category,
          headCount: isArrendamiento ? undefined : d.headCount,
          hectareas: isArrendamiento ? (d.hectareas ?? d.headCount) : d.hectareas,
          desiredPriceArs: d.desiredPriceArs,
          province: d.province,
          zona: d.zona,
          source: d.source,
          lead: { name: d.name, phone: d.phone, email: d.email, message: d.message },
          estimatedValueArs,
          feeArs,
          feePct,
          matches: matches.map((m) => ({
            displayName: m.displayName,
            slug: m.slug,
            province: m.province,
            location: m.location,
            featured: m.featured,
            contactable: m.contactable,
            phone: m.phone,
            waLink: whatsappLink(m.whatsapp || m.phone, waText),
          })),
        })
      } catch (e) {
        console.error('producer_lead ops-alert error:', e)
      }
    }

    return NextResponse.json({ success: true, message: 'Listo. Te contactamos a la brevedad.' })
  } catch (e) {
    console.error('producer-leads API error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
