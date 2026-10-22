import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { requireServiceClient } from '@/lib/supabase'
import { sendInformeFichaProspecto } from '@/lib/email'
import { getProspecto } from '@/lib/pro-adquisicion/datos'
import { TIPO_OUTREACH, envioHabilitado, informeTexto, redactarInforme } from '@/lib/pro-adquisicion/prospectos'
import { urlPropuesta, tokenPropuesta } from '@/lib/propuesta/token'
import { hoyArgentina } from '@/lib/remates-en-vivo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'

/**
 * POST /api/admin/prospectos/enviar  { slug }
 *
 * Manda el informe de ficha a UNA firma no PRO. Nunca corre solo: lo dispara un
 * admin con un clic en /admin/prospectos, y además exige PRO_PROSPECTOS_ENVIO=on
 * en el entorno (apagado por defecto). Recalcula los números en el servidor —no
 * confía en lo que manda el navegador— y se niega si la firma ya es PRO, no tiene
 * mail, se dio de baja o ya recibió este informe en los últimos 30 días.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.authorized) return auth.response!

  if (!envioHabilitado()) {
    return NextResponse.json({ error: 'El envío está apagado (PRO_PROSPECTOS_ENVIO no es "on").' }, { status: 409 })
  }

  const body = (await req.json().catch(() => null)) as { slug?: unknown } | null
  const slug = typeof body?.slug === 'string' ? body.slug.trim() : ''
  if (!slug) return NextResponse.json({ error: 'Falta slug' }, { status: 400 })

  const p = await getProspecto(slug)
  if (!p) return NextResponse.json({ error: 'No es prospecto (no existe o ya es PRO)' }, { status: 404 })
  if (!p.m.email) return NextResponse.json({ error: 'La firma no tiene mail' }, { status: 422 })
  if (p.m.dadaDeBaja) return NextResponse.json({ error: 'La firma se dio de baja' }, { status: 422 })
  if (p.m.informeReciente) return NextResponse.json({ error: 'Ya recibió este informe en los últimos 30 días' }, { status: 429 })

  const token = tokenPropuesta(p.m.slug)
  const informe = redactarInforme(p, {
    appUrl: APP_URL,
    urlPropuesta: token ? urlPropuesta(p.m.slug, {}, APP_URL) : null,
    hoy: hoyArgentina(),
  })
  const res = await sendInformeFichaProspecto({
    to: p.m.email,
    asunto: informe.asunto,
    parrafos: informe.parrafos,
    numeros: informe.numeros,
    texto: informeTexto(informe),
  })
  if (!res.success) return NextResponse.json({ error: res.error ?? 'No salió' }, { status: 502 })

  await requireServiceClient()
    .from('outreach_log')
    .insert({
      type: TIPO_OUTREACH,
      consignataria_slug: p.m.slug,
      email_sent_to: p.m.email,
      notes: `vistas30=${p.m.vistas30 ?? 's/d'} pedidosZona=${p.zona.pedidos30} casosVivos=${p.zona.casosVivos.length} por=${auth.email ?? 'admin'}`,
    })
    .then(
      () => undefined,
      () => undefined,
    )

  return NextResponse.json({ ok: true, para: p.m.email, asunto: informe.asunto })
}
