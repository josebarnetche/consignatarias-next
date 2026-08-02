import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { authorizeCron } from '@/lib/cron-auth'
import { correrOvejero, enviarConsultas, MAX_CONSULTAS_DIA, OUTREACH_ACTIVO } from '@/lib/leads/ovejero'
import { whatsappLink } from '@/lib/leads/routing'
import { sendOvejeroDigest, sendConsultaLeadAConsignataria } from '@/lib/email'
import { trackCron } from '@/lib/ops'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * POST /api/cron/ovejero — el agente diario de leads (ver src/lib/leads/ovejero.ts).
 * Cruza arrendamientos, vigila el SLA de los leads sin rutear y detecta el lado
 * faltante del mercado. Manda UN digest y solo si hay algo que hacer.
 *
 * `?dryRun=1` calcula y devuelve el reporte sin mandar el mail.
 */
export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const dryRun = new URL(req.url).searchParams.get('dryRun') === '1'

  const outcome = await trackCron('ovejero', async () => {
    const db = requireServiceClient()
    const r = await correrOvejero(db)

    // Consultas del día a las firmas de la zona. En dryRun se calcula todo pero
    // no sale ni un mail. Los frenos (cupo, 30 días, una vez por lead) están en
    // enviarConsultas — acá solo se le pasa cómo enviar.
    if (!dryRun) {
      r.consultas = await enviarConsultas(db, r.ranking, ({ email, firma, lead, resumen }) =>
        sendConsultaLeadAConsignataria({
          to: email,
          firma,
          resumenLead: resumen,
          zona: lead.zona || lead.province || 'la zona',
          leadId: lead.id,
        }),
      )
      if (r.consultas.length > 0) r.hayAlgoQueHacer = true
    }

    if (!r.hayAlgoQueHacer) {
      return {
        status: 'ok' as const,
        message: 'sin novedades — no se envió digest',
        metadata: { enviado: false, ...r.totales },
      }
    }

    if (!dryRun) {
      await sendOvejeroDigest({
        matches: r.matches.map((m) => {
          const zonaOfrece = m.ofrece.zona ?? m.ofrece.province ?? ''
          const zonaBusca = m.busca.zona ?? m.busca.province ?? ''
          return {
            quienBusca: m.busca.name ?? `Lead #${m.busca.id}`,
            queBusca: `${m.busca.hectareas ?? '?'} ha en ${zonaBusca || 's/d'}`,
            quienOfrece: m.ofrece.name ?? `Lead #${m.ofrece.id}`,
            queOfrece: `${m.ofrece.hectareas ?? '?'} ha en ${zonaOfrece || 's/d'}`,
            motivo: m.motivo,
            // Mensaje distinto para cada lado: al que busca se le ofrece el campo,
            // al que ofrece se le avisa que hay interesado.
            waBusca: whatsappLink(
              m.busca.phone,
              `Hola ${m.busca.name ?? ''}, soy José de consignatarias.com.ar. Apareció un campo de ` +
                `${m.ofrece.hectareas ?? '?'} ha${zonaOfrece ? ` en ${zonaOfrece}` : ''}. ¿Te interesa que te ponga en contacto?`,
            ),
            waOfrece: whatsappLink(
              m.ofrece.phone,
              `Hola ${m.ofrece.name ?? ''}, soy José de consignatarias.com.ar. Tengo un productor buscando ` +
                `${m.busca.hectareas ?? '?'} ha${zonaBusca ? ` por ${zonaBusca}` : ''}. ¿Te paso el contacto?`,
            ),
          }
        }),
        pendientes: r.pendientes.map((p) => ({
          nombre: p.lead.name ?? `Lead #${p.lead.id}`,
          detalle:
            p.lead.intent === 'arrendar_busco'
              ? `busca ${p.lead.hectareas ?? '?'} ha en ${p.lead.zona ?? p.lead.province ?? 's/d'}`
              : p.lead.intent === 'arrendar_ofrezco'
                ? `ofrece ${p.lead.hectareas ?? '?'} ha en ${p.lead.zona ?? p.lead.province ?? 's/d'}`
                : `${p.lead.intent}${p.lead.head_count ? `, ${p.lead.head_count} cab` : ''} en ${p.lead.zona ?? p.lead.province ?? 's/d'}`,
          dias: p.diasEsperando,
          urgente: p.urgente,
          wa: p.waLink,
          email: p.lead.email,
        })),
        zonas: r.zonasSinOferta.map((z) => ({
          provincia: z.provincia,
          buscan: z.buscan,
          mensaje: z.mensajeSugerido,
          firmas: z.firmas.map((f) => ({ nombre: f.displayName, wa: f.waLink })),
        })),
        consultas: r.consultas.map((c) => ({ firma: c.firma, leadResumen: c.leadResumen, email: c.email })),
        ranking: r.ranking.slice(0, 5).map((x) => ({
          nombre: x.lead.name ?? `Lead #${x.lead.id}`,
          resumen: `${x.lead.intent} en ${x.lead.zona ?? x.lead.province ?? 's/d'}`,
          score: x.score,
          porQue: x.porQue.join(' · '),
        })),
      })
    }

    return {
      status: 'ok' as const,
      message: `El Ovejero: ${r.consultas.length} consultas enviadas, ${r.matches.length} cruces, ${r.pendientes.length} pendientes, ${r.zonasSinOferta.length} zonas sin oferta`,
      metadata: {
        enviado: !dryRun,
        dryRun,
        consultas_enviadas: r.consultas.length,
        consultas_detalle: r.consultas.map((c) => `${c.firma} <${c.email}> · ${c.leadResumen}`),
        outreach_activo: OUTREACH_ACTIVO,
        cupo_diario: MAX_CONSULTAS_DIA,
        matches: r.matches.length,
        pendientes: r.pendientes.length,
        zonas_sin_oferta: r.zonasSinOferta.length,
        ...r.totales,
        detalle: dryRun ? r : undefined,
      },
    }
  })

  const meta = (outcome.metadata ?? {}) as Record<string, unknown>
  return NextResponse.json(
    { ok: outcome.status === 'ok', message: outcome.message, ...meta },
    { status: outcome.status === 'error' ? 500 : 200 },
  )
}
