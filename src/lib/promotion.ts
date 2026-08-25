/**
 * promotion.ts — la distribución de un remate, auditable.
 *
 * Responde la pregunta que una consignataria hace en la primera reunión: **"¿a
 * cuántos les llegó mi remate?"**. Hasta ahora "distribución" era una palabra sin
 * respaldo: el newsletter semanal salía, priorizaba a las firmas PRO, y no dejaba
 * registro de quién había aparecido ni ante cuánta gente.
 *
 * REGLA: se registra lo que se envió DE VERDAD (envíos exitosos), no el tamaño de la
 * lista. Si de 95 suscriptores el envío falló en 7, se registran 88. Un número que la
 * firma pueda auditar vale más que uno grande.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export const CANALES = [
  'newsletter', 'alerta_remate', 'outreach', 'calendario', 'widget', 'demanda',
] as const
export type Canal = (typeof CANALES)[number]

export const CANAL_LABEL: Record<Canal, string> = {
  newsletter: 'Newsletter semanal',
  alerta_remate: 'Alerta de remate',
  outreach: 'Email directo',
  calendario: 'Calendario suscripto',
  widget: 'Widget en tu sitio',
  demanda: 'Aviso de demanda',
}

export interface CampaignInput {
  canal: Canal
  consignatariaSlug: string
  remateId?: number | null
  remateTitle?: string | null
  remateDate?: string | null
  destinatarios: number
  ref?: string | null
  meta?: Record<string, unknown> | null
}

/**
 * Registra una tanda de campañas (una fila por firma promocionada).
 *
 * Se hace en lote porque el caso real es el envío semanal: un mail que menciona 10
 * remates de N firmas genera N filas de una. Nunca lanza: perder el registro de
 * distribución es malo, pero abortar un envío que ya salió por eso sería peor.
 */
export async function registrarCampanas(
  db: SupabaseClient | null,
  campanas: CampaignInput[],
): Promise<number> {
  if (!db || campanas.length === 0) return 0
  try {
    const filas = campanas.map((c) => ({
      canal: c.canal,
      consignataria_slug: c.consignatariaSlug,
      remate_id: c.remateId ?? null,
      remate_title: c.remateTitle ?? null,
      remate_date: c.remateDate ?? null,
      destinatarios: Math.max(0, Math.round(c.destinatarios)),
      ref: c.ref ?? null,
      meta: c.meta ?? null,
    }))
    const { error } = await db.from('promotion_campaigns').insert(filas)
    if (error) {
      console.error('[promotion] no se pudieron registrar las campañas:', error)
      return 0
    }
    return filas.length
  } catch (e) {
    console.error('[promotion] excepción al registrar campañas:', e)
    return 0
  }
}

export interface ResumenDistribucion {
  /** Total de destinatarios alcanzados en la ventana. */
  alcance: number
  /** Cuántas veces se promocionó algo de la firma. */
  campanas: number
  porCanal: Array<{ canal: Canal; label: string; campanas: number; alcance: number }>
  /** Lo más reciente, para poder decir "tu remate del X salió el Y ante Z personas". */
  ultimas: Array<{
    canal: Canal
    label: string
    remateTitle: string | null
    remateDate: string | null
    destinatarios: number
    fecha: string
  }>
}

/**
 * Qué distribución recibió una firma en los últimos `dias`.
 *
 * Devuelve null si no hubo ninguna: el panel prefiere no mostrar el bloque antes que
 * mostrar un cero que parece un error del sistema.
 */
export async function getDistribucion(
  db: SupabaseClient | null,
  slug: string,
  dias = 30,
): Promise<ResumenDistribucion | null> {
  if (!db) return null
  try {
    const desde = new Date(Date.now() - dias * 24 * 3600 * 1000).toISOString()
    const { data, error } = await db
      .from('promotion_campaigns')
      .select('canal, remate_title, remate_date, destinatarios, created_at')
      .eq('consignataria_slug', slug)
      .gte('created_at', desde)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error || !data || data.length === 0) return null

    const filas = data as Array<{
      canal: Canal
      remate_title: string | null
      remate_date: string | null
      destinatarios: number
      created_at: string
    }>

    const porCanalMap = new Map<Canal, { campanas: number; alcance: number }>()
    let alcance = 0
    for (const f of filas) {
      alcance += f.destinatarios
      const prev = porCanalMap.get(f.canal) ?? { campanas: 0, alcance: 0 }
      porCanalMap.set(f.canal, {
        campanas: prev.campanas + 1,
        alcance: prev.alcance + f.destinatarios,
      })
    }

    return {
      alcance,
      campanas: filas.length,
      porCanal: [...porCanalMap.entries()]
        .map(([canal, v]) => ({ canal, label: CANAL_LABEL[canal] ?? canal, ...v }))
        .sort((a, b) => b.alcance - a.alcance),
      ultimas: filas.slice(0, 5).map((f) => ({
        canal: f.canal,
        label: CANAL_LABEL[f.canal] ?? f.canal,
        remateTitle: f.remate_title,
        remateDate: f.remate_date,
        destinatarios: f.destinatarios,
        fecha: f.created_at,
      })),
    }
  } catch (e) {
    console.error('[promotion] error al leer distribución:', e)
    return null
  }
}
