import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { sendExpoMercedesAviso } from '@/lib/email'
import { capForFreePlan } from '@/lib/email-limits'
import { trackCron } from '@/lib/ops'
import { authorizeCron } from '@/lib/cron-auth'
import { REMATES_EXPO, casasConfirmadas, expoVigente } from '@/lib/data/expo-mercedes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const URL_PAGINA = 'https://www.consignatarias.com.ar/remates/expo-rural-mercedes?utm_source=email&utm_medium=aviso&utm_campaign=expo-mercedes-2026'

/**
 * Aviso puntual de la rueda de remates de la Expo de Mercedes.
 *
 * NO ENVÍA POR DEFECTO. Sin `?enviar=1` devuelve el HTML del mail y la lista exacta de
 * destinatarios, y no toca Resend. Es a propósito: un envío a medio centenar de personas
 * —entre ellas un banco, dos universidades y varios frigoríficos— se mira antes de
 * soltarlo, y una vez que salió no vuelve.
 *
 * A QUIÉNES
 * A los que pidieron contenido de mercado y de remates. Se excluye `frigorificos`
 * explícitamente: ese segmento recibe su reporte de faena el día 3 y le llegarían dos
 * mails nuestros el mismo día. Es la misma lógica de no-duplicación que ya usa el blast
 * de El Corredor.
 *
 * Auth: ADMIN_SECRET como Bearer o ?secret=.
 */
const AUDIENCIA = ['el-corredor', 'reporte-semanal', 'remates']

export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const enviar = req.nextUrl.searchParams.get('enviar') === '1'

  // Pasado el último remate el aviso pierde sentido y no se manda ni a la fuerza:
  // un mail que anuncia algo que ya pasó es peor que no mandar nada.
  if (!expoVigente()) {
    return NextResponse.json(
      { error: 'la rueda ya terminó', ultimo: REMATES_EXPO[REMATES_EXPO.length - 1]?.fecha },
      { status: 409 },
    )
  }

  const supabase = requireServiceClient()
  const { data: subs, error } = await supabase
    .from('newsletter_subscribers')
    .select('email, source')
    .eq('status', 'active')
    .in('source', AUDIENCIA)

  if (error) {
    return NextResponse.json({ error: 'no se pudo leer la lista', detalle: error.message }, { status: 500 })
  }

  const destinatarios = (subs ?? []).filter((s) => s.email)
  const casas = casasConfirmadas().length
  const remates = REMATES_EXPO.map((r) => ({
    fecha: r.fecha,
    firma: r.firma,
    cabania: r.cabania,
    hora: r.hora,
    modalidad: r.modalidad === 'fisico' ? 'en pista' : r.modalidad,
    categoria: r.categoria,
  }))

  // ── Modo preview (el default) ───────────────────────────────────────────────
  if (!enviar) {
    return NextResponse.json({
      modo: 'preview — NO se envió nada',
      para_enviar: 'repetir la llamada con ?enviar=1',
      asunto: 'Siete remates en Mercedes, del 4 al 17',
      destinatarios_total: destinatarios.length,
      por_origen: destinatarios.reduce<Record<string, number>>((acc, s) => {
        const origen = s.source ?? '(sin origen)'
        acc[origen] = (acc[origen] ?? 0) + 1
        return acc
      }, {}),
      emails: destinatarios.map((s) => s.email).sort(),
      remates_en_el_mail: remates.length,
      casas,
    })
  }

  // ── Envío real ──────────────────────────────────────────────────────────────
  const outcome = await trackCron('expo-mercedes-aviso', async () => {
    const { toSend, skipped } = capForFreePlan(destinatarios)
    let sent = 0
    const errors: string[] = []

    for (const sub of toSend) {
      try {
        const r = await sendExpoMercedesAviso({ to: sub.email, remates, casas, url: URL_PAGINA })
        if (r.success) sent++
        else errors.push(`${sub.email}: ${r.error}`)
        // El plan gratuito de Resend limita por segundo; el resto de los envíos
        // masivos del sitio usa la misma pausa.
        await new Promise((r) => setTimeout(r, 500))
      } catch (err) {
        errors.push(`${sub.email}: ${err}`)
      }
    }

    return {
      status: errors.length > 0 && sent === 0 ? ('error' as const) : ('ok' as const),
      message: `Aviso Expo Mercedes enviado: ${sent}/${destinatarios.length}`,
      metadata: {
        sent,
        total: destinatarios.length,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      },
    }
  })

  return NextResponse.json(outcome.metadata ?? { ok: true })
}

/** GET = preview, para poder mirarlo desde el navegador sin miedo a mandar. */
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const url = new URL(req.url)
  url.searchParams.delete('enviar')
  return POST(new NextRequest(url, { method: 'POST', headers: req.headers }))
}
