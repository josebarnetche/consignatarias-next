import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireServiceClient } from '@/lib/supabase'
import { enforceRateLimit, clientIp, rateLimitedResponse } from '@/lib/rate-limit-db'
import { estimateOperation, matchConsignatarias, whatsappLink } from '@/lib/leads/routing'
import { getAllProfiles } from '@/lib/data/consignataria-slugs'
import { sendProducerLeadOps, sendLeadAlert } from '@/lib/email'
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
  intent: z.enum(['vender', 'comprar', 'arrendar', 'consignar', 'tasar']),
  category: z.string().max(40).optional(),
  headCount: z.number().int().positive().max(100000).optional(),
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

    const { estimatedValueArs, feeArs, feePct } = estimateOperation({ headCount: d.headCount, category: d.category })
    const ipHash = crypto.createHash('sha256').update(ip + d.name).digest('hex').slice(0, 16)

    const supabase = db()

    // Pre-ruteo automático: si el lead viene del detalle de un remate
    // (source=remate:<slug>), ya sabemos la firma → lo ruteamos directo a esa
    // consignataria en vez de dejarlo en 'new' esperando ruteo manual. El slug del
    // remate puede ser una variante → lo resolvemos al canónico.
    const remateRaw = d.source.startsWith('remate:') ? d.source.slice('remate:'.length) : null
    let routedSlug: string | null = null
    let routedFirm: { displayName: string; claimedByEmail: string | null; featured: boolean } | null = null
    if (remateRaw) {
      const prof = getAllProfiles().find((p) => p.canonicalSlug === remateRaw || p.allSlugs.includes(remateRaw))
      routedSlug = prof?.canonicalSlug ?? remateRaw
      const { data: firm } = await supabase
        .from('consignatarias')
        .select('display_name, claimed_by_email, featured')
        .eq('canonical_slug', routedSlug)
        .maybeSingle()
      const f = firm as { display_name?: string; claimed_by_email?: string | null; featured?: boolean } | null
      routedFirm = f
        ? { displayName: f.display_name || routedSlug, claimedByEmail: f.claimed_by_email ?? null, featured: !!f.featured }
        : null
    }

    const nowIso = new Date().toISOString()
    const { data: inserted, error } = await supabase
      .from('producer_leads')
      .insert({
        intent: d.intent,
        category: d.category ?? null,
        head_count: d.headCount ?? null,
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
        status: routedSlug ? 'routed' : 'new',
        routed_to_slug: routedSlug,
        routed_at: routedSlug ? nowIso : null,
        ip_hash: ipHash,
      })
      .select('id')
      .single()

    if (error || !inserted) {
      console.error('producer_lead insert error:', error)
      return NextResponse.json({ error: 'No pudimos guardar tu consulta' }, { status: 500 })
    }
    const leadId = (inserted as { id: number }).id

    // Notificaciones (no bloquean la respuesta al usuario si el mail falla).
    try {
      // 1) Pre-ruteado a una firma con perfil RECLAMADO → se lo mandamos directo
      //    (reclamar = opt-in). PRO ve el contacto completo, Free enmascarado con
      //    CTA a PRO. Cierra el loop sin intervención manual.
      if (routedFirm?.claimedByEmail && routedSlug) {
        await sendLeadAlert({
          to: routedFirm.claimedByEmail,
          consignataria: routedFirm.displayName,
          slug: routedSlug,
          isPro: routedFirm.featured,
          lead: { name: d.name, phone: d.phone, email: d.email, message: d.message },
        })
      }

      // 2) Ops-alert a Jose (siempre) — supervisa y cobra el 1%. Si está pre-ruteado,
      //    mostramos la firma destino; si no, las candidatas de la zona para rutear.
      const matches = routedSlug ? [] : await matchConsignatarias(supabase, { province: d.province, limit: 5 })
      const waText = `Hola, tengo un productor interesado (${d.intent}${d.headCount ? `, ${d.headCount} cab` : ''}${d.zona ? `, ${d.zona}` : ''}) vía consignatarias.com. ¿Te lo paso?`
      await sendProducerLeadOps({
        leadId,
        intent: d.intent,
        category: d.category,
        headCount: d.headCount,
        province: d.province,
        zona: d.zona,
        source: d.source,
        lead: { name: d.name, phone: d.phone, email: d.email, message: d.message },
        estimatedValueArs,
        feeArs,
        feePct,
        routedTo: routedFirm && routedSlug
          ? { displayName: routedFirm.displayName, slug: routedSlug, claimed: !!routedFirm.claimedByEmail, featured: routedFirm.featured }
          : null,
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
      console.error('producer_lead notify error:', e)
    }

    return NextResponse.json({
      success: true,
      message: routedFirm
        ? `Listo. ${routedFirm.displayName} te va a contactar.`
        : 'Listo. Una consignataria de tu zona te va a contactar.',
    })
  } catch (e) {
    console.error('producer-leads API error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
