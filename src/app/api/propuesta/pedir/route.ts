import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCanonicalSlug, getProfile } from '@/lib/data/consignataria-slugs'
import { getDatosFirma, getDatosSitio } from '@/lib/propuesta/datos'
import { urlPropuesta } from '@/lib/propuesta/token'
import { BENEFICIOS_PRO_CONSIGNATARIA } from '@/lib/pro-consignataria-beneficios'
import { ALCANCE_GOOGLE } from '@/lib/data/alcance-google'
import { sendPropuestaPro } from '@/lib/email'
import { checkRateLimit, getClientId } from '@/lib/rate-limit'
import { logEvent } from '@/lib/ops'

export const dynamic = 'force-dynamic'

const schema = z.object({
  slug: z.string().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  nombre: z.string().trim().max(80).optional(),
})

/**
 * POST /api/propuesta/pedir  { slug, email, nombre? }
 *
 * La firma pide la propuesta PRO por mail desde el checkout (17-10-2026): antes de
 * pagar quiere saber qué incluye, o mandársela a su socio. Le llega la propuesta con
 * la marca, sus números en el sitio y el link a la versión completa imprimible; a
 * nosotros nos llega en copia oculta, que es el aviso de que hay una firma mirando.
 *
 * Los números de la firma que van en el mail son los mismos de la propuesta y salen
 * de datos que el sitio ya publica o que no comprometen a nadie (remates, visitas,
 * cuota sobre cabezas del MAG, que es dato público agregado).
 */
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Revisá el mail.' }, { status: 400 })
  const { email, nombre } = parsed.data

  const ip = getClientId(req)
  if (!checkRateLimit(`propuesta:${ip}`).success || !checkRateLimit(`propuesta:${email}`).success) {
    return NextResponse.json({ error: 'Ya te la mandamos. Si no llegó, revisá spam o probá en un minuto.' }, { status: 429 })
  }

  const slug = getCanonicalSlug(parsed.data.slug.trim())
  const profile = slug ? getProfile(slug) : null
  if (!slug || !profile) return NextResponse.json({ error: 'Consignataria no encontrada.' }, { status: 404 })

  const [firma, sitio] = await Promise.all([
    getDatosFirma(profile).catch(() => null),
    getDatosSitio().catch(() => null),
  ])
  const n = (x: number) => x.toLocaleString('es-AR')
  const datosFirma: { valor: string; texto: string }[] = []
  if (firma) {
    if (firma.proximos.length) datosFirma.push({ valor: n(firma.proximos.length), texto: 'remates próximos publicados en nuestro calendario' })
    if (firma.vistas30) datosFirma.push({ valor: n(firma.vistas30), texto: 'visitas a su ficha en los últimos 30 días' })
    if (firma.ia90?.total) datosFirma.push({ valor: n(firma.ia90.total), texto: 'visitas a su ficha que llegaron desde asistentes de IA, últimos 90 días' })
    if (firma.mag) {
      datosFirma.push({
        valor: `${firma.mag.cuota.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`,
        texto: `de las cabezas operadas en el Mercado de Cañuelas (30 días): puesto ${firma.mag.puesto} de ${firma.mag.totalCasas} casas`,
      })
    }
  }

  const desde = new Date(ALCANCE_GOOGLE.desde + 'T12:00:00').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const res = await sendPropuestaPro(email, {
    firma: profile.displayName,
    slug,
    linkPropuesta: urlPropuesta(slug, { contacto: nombre }),
    datosFirma,
    beneficios: BENEFICIOS_PRO_CONSIGNATARIA,
    sitio: { impresiones: n(ALCANCE_GOOGLE.impresiones), desde, ia90: sitio?.ia90 ?? null },
  })

  const ok = !!res && !res.error
  logEvent({
    eventType: 'form_submit',
    status: ok ? 'ok' : 'error',
    route: '/api/propuesta/pedir',
    metadata: { slug, dominio: email.split('@')[1], enviado: ok, ...(res?.error ? { error: res.error.message } : {}) },
  })
  if (!ok) return NextResponse.json({ error: 'No pudimos mandar el mail. Escribinos a agro@memola.com.ar.' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
