import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import {
  construirSerieUsd,
  evaluar,
  fueraDeCooldown,
  redactar,
  UMBRAL,
  VENTANA,
  COOLDOWN_DIAS,
} from '@/lib/alertas/novillo-usd'
import { sendAlertaNovilloUsd } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Cron diario de la alerta del novillo en dólares.
 *
 * Corre todos los días y **casi siempre no hace nada**: eso es el diseño, no una falla. La
 * regla (±12 % entre dos medias de 20 ruedas, con 30 días de silencio) da unas cinco
 * señales por año sobre la serie 2015-2026.
 *
 * `?dry=1` evalúa y devuelve el resultado sin mandar nada ni escribir el disparo. Sirve
 * para ver cómo viene la serie sin gastar cupo de Resend.
 *
 * Auth: `x-cron-secret` o `?secret=`, igual que el resto de los crons.
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  const envSecret = process.env.CRON_SECRET?.replace(/\r\n$/, '').trim()
  if (!envSecret || cronSecret !== envSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dry = req.nextUrl.searchParams.get('dry') === '1'
  const service = requireServiceClient()

  let serie
  try {
    serie = await construirSerieUsd(service)
  } catch (err) {
    console.error('[alerta-novillo] no se pudo armar la serie:', err)
    return NextResponse.json({ error: 'serie_error' }, { status: 500 })
  }

  const e = evaluar(serie)
  if (!e) {
    return NextResponse.json({ ok: true, evaluado: false, motivo: 'serie_corta', ruedas: serie.length })
  }

  // Último disparo: es el registro de cooldown.
  const { data: ultimo } = await service
    .from('alerta_novillo_usd_disparos')
    .select('disparada_at')
    .order('disparada_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const ultimoISO = ultimo?.disparada_at ?? null
  const enSilencio = !fueraDeCooldown(ultimoISO)

  const base = {
    ok: true,
    evaluado: true,
    delta: Number(e.delta.toFixed(4)),
    actual: Number(e.actual.toFixed(3)),
    previo: Number(e.previo.toFixed(3)),
    hasta: e.hasta,
    ruedas: e.ruedas,
    umbral: UMBRAL,
    ventana: VENTANA,
    cruzaUmbral: e.cruzaUmbral,
    ultimoDisparo: ultimoISO,
    enSilencio,
  }

  if (!e.cruzaUmbral) {
    return NextResponse.json({ ...base, disparo: false, motivo: 'dentro_del_umbral' })
  }
  if (enSilencio) {
    // Cruzó, pero ya sonó hace menos de 30 días. Es el caso que evita que un mismo
    // movimiento largo dispare todas las semanas.
    return NextResponse.json({
      ...base,
      disparo: false,
      motivo: `cooldown_${COOLDOWN_DIAS}d`,
    })
  }
  if (dry) {
    return NextResponse.json({ ...base, disparo: false, motivo: 'dry_run', habriaDisparado: true })
  }

  const { data: subs, error: errSubs } = await service
    .from('alerta_novillo_usd_suscriptores')
    .select('email')
    .is('unsubscribed_at', null)

  if (errSubs) {
    console.error('[alerta-novillo] no se pudieron leer los suscriptores:', errSubs.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  const destinatarios = (subs ?? []).map((s) => s.email)
  const { asunto, cuerpo } = redactar(e, ultimoISO)

  // El disparo se registra ANTES de enviar. Si el envío se cae a la mitad, el cooldown
  // ya está puesto y mañana no vuelve a mandarle a los que sí recibieron.
  const { data: disparo, error: errDisparo } = await service
    .from('alerta_novillo_usd_disparos')
    .insert({
      fecha_corte: e.hasta,
      promedio_actual: e.actual,
      promedio_previo: e.previo,
      delta: e.delta,
      destinatarios: destinatarios.length,
      meta: { asunto, umbral: UMBRAL, ventana: VENTANA, ruedas: e.ruedas },
    })
    .select('id')
    .single()

  if (errDisparo) {
    console.error('[alerta-novillo] no se pudo registrar el disparo:', errDisparo.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  let enviados = 0
  for (const email of destinatarios) {
    try {
      await sendAlertaNovilloUsd({ to: email, asunto, cuerpo, delta: e.delta })
      enviados++
    } catch (err) {
      console.error(`[alerta-novillo] envío falló para ${email}:`, err)
    }
  }

  await service
    .from('alerta_novillo_usd_disparos')
    .update({ enviados })
    .eq('id', disparo.id)

  return NextResponse.json({ ...base, disparo: true, destinatarios: destinatarios.length, enviados })
}

/** GET = dry run. Cómodo para mirar cómo viene la serie desde el navegador. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  url.searchParams.set('dry', '1')
  return POST(new NextRequest(url, { method: 'POST', headers: req.headers }))
}
