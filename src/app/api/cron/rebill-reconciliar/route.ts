import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { logEvent } from '@/lib/ops'
import { sendInformePurchaseDelivery, sendGuiaPurchaseDelivery } from '@/lib/email'
import { getProducto } from '@/lib/productos-datos'
import { getGuiaPremium } from '@/lib/guias-premium'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Reconciliación contra Rebill: el pago manda, el webhook es sólo el camino rápido.
 *
 * POR QUÉ EXISTE. El 05-10-2026 Jose pagó un informe de su bolsillo y no le llegó
 * nada. El webhook había entrado firmado y nuestro endpoint lo rechazó con 401
 * porque `REBILL_WEBHOOK_SECRET` no coincide con el secret del panel de Rebill.
 * Al revisar, **ningún webhook de Rebill validó nunca**: `informe_purchases`,
 * `guia_purchases` y `processed_webhook_events` estaban vacías desde que existen.
 * Es decir: durante meses, cualquiera que pagara no recibía nada, y la única
 * manera de enterarse era que alguien lo notara.
 *
 * Un webhook es un único punto de falla sin red: si el secret se desalinea, si
 * Rebill agota los reintentos, o si un deploy toma el request a mitad de camino,
 * el cliente pagó y se quedó sin su producto. Esto cierra ese agujero: cada 10
 * minutos pregunta a Rebill qué cobró de verdad y otorga lo que falte.
 *
 * Es idempotente por `rebill_payment_id`: si el webhook ya lo procesó, acá no
 * pasa nada. Y no cobra, no reembolsa y no toca Rebill: solo lee.
 */

const REBILL_API = 'https://api.rebill.com/v3'
/** Ventana de pagos a revisar. Amplia a propósito: un pago perdido no caduca. */
const DIAS = 7

type PagoRebill = {
  id: string
  createdAt: string
  amount: number
  currency: string
  status: string
  customer?: { id?: string; email?: string; firstName?: string }
  metadata?: Record<string, string>
}

async function pagosAprobados(secretKey: string): Promise<PagoRebill[]> {
  const res = await fetch(`${REBILL_API}/payments?limit=100`, {
    headers: { 'x-api-key': secretKey },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Rebill respondió ${res.status}`)
  const body = await res.json()
  const corte = Date.now() - DIAS * 86_400_000
  return (body?.records || []).filter(
    (p: PagoRebill) => p?.status === 'approved' && Date.parse(p.createdAt) >= corte,
  )
}

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  const envSecret = process.env.CRON_SECRET?.replace(/\r\n$/, '').trim()
  if (!envSecret || cronSecret !== envSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const secretKey = process.env.REBILL_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json({ error: 'REBILL_SECRET_KEY sin configurar' }, { status: 503 })
  }

  const sb = requireServiceClient()
  const otorgados: string[] = []
  const yaEstaban: string[] = []
  const errores: string[] = []

  let pagos: PagoRebill[] = []
  try {
    pagos = await pagosAprobados(secretKey)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'error desconocido'
    logEvent({ eventType: 'rebill_reconciliar', status: 'error', route: '/api/cron/rebill-reconciliar',
               metadata: { motivo: 'no se pudo leer Rebill', detalle: msg } })
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  for (const p of pagos) {
    const kind = p.metadata?.kind
    const email = (p.customer?.email || p.metadata?.customerEmail || '').toLowerCase().trim()
    if (!kind || !email) continue

    try {
      if (kind === 'informe_purchase') {
        const slug = p.metadata?.productoSlug
        const variante = p.metadata?.variante || ''
        if (!slug) continue
        const { data: existe } = await sb
          .from('informe_purchases')
          .select('id')
          .eq('rebill_payment_id', p.id)
          .maybeSingle()
        if (existe) { yaEstaban.push(p.id); continue }

        const producto = getProducto(slug)
        const { error } = await sb.from('informe_purchases').insert({
          producto_slug: slug,
          variante_slug: variante,
          variante_label: p.metadata?.varianteLabel || null,
          email,
          status: 'paid',
          amount_ars: p.currency === 'ARS' ? p.amount : null,
          rebill_payment_id: p.id,
          rebill_customer_id: p.customer?.id || null,
          purchased_at: p.createdAt,
          meta: { alta: 'reconciliacion', motivo: 'el webhook no otorgó este pago' },
        })
        if (error) throw new Error(error.message)

        if (producto) {
          await sendInformePurchaseDelivery({
            to: email,
            producto: { slug: producto.slug, nombre: producto.nombre, tagline: (producto as { tagline?: string }).tagline || '' },
            variante: variante || null,
            varianteLabel: p.metadata?.varianteLabel || null,
          })
          await sb.from('informe_purchases')
            .update({ delivery_email_at: new Date().toISOString() })
            .eq('rebill_payment_id', p.id)
        }
        otorgados.push(`${p.id} · informe ${slug}${variante ? `/${variante}` : ''} → ${email}`)
      } else if (kind === 'guia_purchase') {
        const slug = p.metadata?.guiaSlug || p.metadata?.productoSlug
        if (!slug) continue
        const { data: existe } = await sb
          .from('guia_purchases')
          .select('id')
          .eq('rebill_payment_id', p.id)
          .maybeSingle()
        if (existe) { yaEstaban.push(p.id); continue }

        const { error } = await sb.from('guia_purchases').insert({
          guia_slug: slug,
          email,
          status: 'paid',
          amount_ars: p.currency === 'ARS' ? p.amount : null,
          rebill_payment_id: p.id,
          purchased_at: p.createdAt,
          meta: { alta: 'reconciliacion', motivo: 'el webhook no otorgó este pago' },
        })
        if (error) throw new Error(error.message)

        const guia = getGuiaPremium(slug)
        if (guia) await sendGuiaPurchaseDelivery({ to: email, guia: { slug: guia.slug, title: guia.title, tagline: guia.tagline } })
        otorgados.push(`${p.id} · guía ${slug} → ${email}`)
      }
    } catch (e) {
      errores.push(`${p.id}: ${e instanceof Error ? e.message : 'error'}`)
    }
  }

  // Se registra SIEMPRE, incluso sin trabajo: una corrida que no encuentra nada es
  // la prueba de que el webhook está haciendo su parte, y eso también hay que verlo.
  logEvent({
    eventType: 'rebill_reconciliar',
    status: errores.length ? 'error' : 'ok',
    route: '/api/cron/rebill-reconciliar',
    metadata: { revisados: pagos.length, otorgados: otorgados.length, ya_estaban: yaEstaban.length, errores },
  })

  return NextResponse.json({
    ok: errores.length === 0,
    revisados: pagos.length,
    otorgados,
    ya_estaban: yaEstaban.length,
    errores,
  })
}
