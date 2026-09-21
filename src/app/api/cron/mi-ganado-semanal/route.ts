import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { valuarHistorico } from '@/lib/ganado-historial'
import { valuarRodeo, ratiosDesdeRodeo, inmagPromedio } from '@/lib/rodeo-vr'
import { armarResumenSemanal } from '@/lib/mi-ganado-semanal'
import { traerSerieInmag, traerSerieBlue, loteDesdeJson } from '@/lib/series-mercado'
import { sendResumenRodeo } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Cron de los lunes: el Valor de Referencia del rodeo a cada usuario que lo pidió en
 * /mi-ganado (`user_ganado.alerts_opt_in = true`).
 *
 * El opt-in existía desde mayo y el envío no: ver lib/mi-ganado-semanal.ts.
 *
 * `?dry=1` arma todos los mails y devuelve lo que mandaría (sin emails ni montos: sólo
 * conteos y asuntos) sin enviar nada. GET = dry.
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

  const { data: filas, error } = await service
    .from('user_ganado')
    .select('user_id, items')
    .eq('alerts_opt_in', true)

  if (error) {
    console.error('[mi-ganado-semanal] no se pudo leer user_ganado:', error.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  const [inmag, blue] = await Promise.all([traerSerieInmag(service), traerSerieBlue(service)])

  const resultados: Array<{ estado: string; asunto?: string }> = []
  let enviados = 0

  for (const f of filas ?? []) {
    const lote = loteDesdeJson(f.items)
    if (lote.length === 0) {
      resultados.push({ estado: 'sin_rodeo' })
      continue
    }
    const rodeo = valuarRodeo(lote)
    const ancla = inmagPromedio(inmag, rodeo.ventana.desde, rodeo.ventana.hasta)
    const ratios = ancla ? ratiosDesdeRodeo(rodeo, ancla) : new Map<string, number>()
    const serie = valuarHistorico({ lote, inmag, blue, ratios })
    const resumen = armarResumenSemanal(rodeo, serie)
    if (!resumen) {
      // Rodeo sin ningún lote con precio observado: no se manda un número inventado.
      resultados.push({ estado: 'sin_referencia' })
      continue
    }
    if (dry) {
      resultados.push({ estado: 'se_enviaria', asunto: resumen.asunto })
      continue
    }

    const { data: u } = await service.auth.admin.getUserById(f.user_id as string)
    const email = u?.user?.email
    if (!email) {
      resultados.push({ estado: 'sin_email' })
      continue
    }
    try {
      await sendResumenRodeo({ to: email, ...resumen })
      enviados++
      resultados.push({ estado: 'enviado' })
    } catch (err) {
      console.error('[mi-ganado-semanal] envío falló:', err)
      resultados.push({ estado: 'error_envio' })
    }
  }

  const conteo = resultados.reduce<Record<string, number>>((acc, r) => {
    acc[r.estado] = (acc[r.estado] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({
    ok: true,
    dry,
    anotados: filas?.length ?? 0,
    enviados,
    conteo,
    // En dry se ven los asuntos para revisar el tono; nunca el email del destinatario.
    ...(dry ? { asuntos: resultados.filter((r) => r.asunto).map((r) => r.asunto) } : {}),
  })
}

/** GET = dry run. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  url.searchParams.set('dry', '1')
  return POST(new NextRequest(url, { method: 'POST', headers: req.headers }))
}
