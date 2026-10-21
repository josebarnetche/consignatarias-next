/**
 * El agente con los leads de campo: arrendamiento (busco/ofrezco), búsqueda de
 * campo y tasación. Noche del 21-10-2026.
 *
 * Qué hace y qué NO:
 *  · Le escribe SOLO a quien nos consultó: le pide los datos que faltan (ha,
 *    aptitud, zona, plazo) o, si pidió una tasación, le pregunta si es para
 *    vender o arrendar. Nunca escribe a contrapartes: arrendamiento tiene bloqueo
 *    legal (matrícula de corredor, `tipos.ts`) y campo/tasación no tienen comisión.
 *  · Cuando el caso tiene los datos (o el lead contesta), pasa a `escalado`: lo
 *    sigue José a mano, que es quien puede resolver el circuito con un corredor.
 *  · Está APAGADO salvo `AGENTE_TIPOS=on`. Prenderlo es decisión de José.
 *
 * Los casos se guardan en `agente_casos` con `datos.tipo` ≠ 'hacienda' (sin
 * migración: `datos` es jsonb). El motor de hacienda los saltea (`esCasoDeHacienda`).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { tipoDeIntent, type TipoOperacion } from './tipos'
import { faltantesCampo, pedirDatosCampo, calificarTasacion, type DatosCampo } from './mensajes-tipos'
import type { Correo } from './mensajes'
import { MAX_RECORDATORIOS, enDias, horarioRespuesta, type EstadoCaso, type Lado } from './reglas'

export const TIPOS_CAMPO_ACTIVOS = (process.env.AGENTE_TIPOS ?? 'off').toLowerCase() === 'on'
/** Días entre el pedido de datos y el recordatorio. */
export const DIAS_RECORDATORIO_CAMPO = 3
/** Tope de leads de campo nuevos por corrida: goteo, no tanda. */
export const MAX_CAMPOS_POR_CORRIDA = 5

export const INTENTS_CAMPO = ['arrendar_busco', 'arrendar_ofrezco', 'arrendar', 'busca-campo', 'comprar_campo', 'vender_campo', 'tasar'] as const

export interface DatosCaso extends DatosCampo {
  tipo: TipoOperacion
}

/** ¿El caso es de hacienda? Los viejos no tienen `tipo`: son todos de hacienda. */
export function esCasoDeHacienda(datos: unknown): boolean {
  const t = (datos as { tipo?: string } | null)?.tipo
  return !t || t === 'hacienda'
}

export interface LeadCampo {
  id: number
  intent: string
  name: string | null
  email: string | null
  province: string | null
  zona: string | null
  hectareas: number | null
  category: string | null
}

export function ladoDeIntent(intent: string): Lado {
  return /busco|busca|comprar/.test(intent) ? 'compra' : 'vende'
}

export function datosDeLead(l: LeadCampo): DatosCaso {
  return {
    tipo: tipoDeIntent(l.intent) ?? 'campo',
    hectareas: l.hectareas,
    // El formulario no pregunta aptitud; `category` a veces la trae ("ganadero").
    aptitud: l.category && /ganad|agr[ií]c|mixt|tambo|forest/i.test(l.category) ? l.category : null,
    zona: l.zona,
    provincia: l.province,
  }
}

export type Accion =
  | { tipo: 'tomar'; estado: EstadoCaso; datos: DatosCaso; correo: Correo | null; motivo: string; proximo: Date }
  | { tipo: 'recordar'; correo: Correo; proximo: Date }
  | { tipo: 'dormir'; motivo: string }
  | { tipo: 'nada' }

/** Lead nuevo de campo: qué caso abrir y qué escribirle. Puro. */
export function planNuevo(l: LeadCampo, ahora: Date): Accion {
  const datos = datosDeLead(l)
  if (!l.email) return { tipo: 'nada' }
  if (datos.tipo === 'tasacion') {
    return {
      tipo: 'tomar',
      estado: 'pidiendo_datos',
      datos,
      correo: calificarTasacion({ leadId: l.id, nombre: l.name, zona: [l.zona, l.province].filter(Boolean).join(', ') || null }),
      motivo: 'tasación: le preguntamos si es para vender o arrendar',
      proximo: enDias(ahora, DIAS_RECORDATORIO_CAMPO),
    }
  }
  const faltan = faltantesCampo(datos)
  if (faltan.length) {
    return {
      tipo: 'tomar',
      estado: 'pidiendo_datos',
      datos,
      correo: pedirDatosCampo({ leadId: l.id, nombre: l.name, intent: l.intent, faltan }),
      motivo: `${datos.tipo}: faltan ${faltan.join(', ')}`,
      proximo: enDias(ahora, DIAS_RECORDATORIO_CAMPO),
    }
  }
  return {
    tipo: 'tomar',
    estado: 'escalado',
    datos,
    correo: null,
    motivo: `${datos.tipo} con datos completos: lo sigue José (no sale a contrapartes, ver tipos.ts)`,
    proximo: ahora,
  }
}

/** Caso de campo esperando datos: recordar una vez más o dormirlo. Puro. */
export function planPendiente(
  caso: { estado: string; recordatorios: number; proximo_at: string; datos: DatosCaso },
  l: LeadCampo,
  ahora: Date,
): Accion {
  if (caso.estado !== 'pidiendo_datos' || new Date(caso.proximo_at) > ahora || !l.email) return { tipo: 'nada' }
  if (caso.recordatorios >= MAX_RECORDATORIOS) return { tipo: 'dormir', motivo: 'no contestó los recordatorios' }
  const correo =
    caso.datos.tipo === 'tasacion'
      ? { ...calificarTasacion({ leadId: l.id, nombre: l.name, zona: l.province }), asunto: `Recordatorio: sobre la tasación de tu campo [C-${l.id}]` }
      : pedirDatosCampo({ leadId: l.id, nombre: l.name, intent: l.intent, faltan: faltantesCampo(caso.datos), recordatorio: true })
  return { tipo: 'recordar', correo, proximo: enDias(ahora, DIAS_RECORDATORIO_CAMPO * 2) }
}

export interface Ctx {
  db: SupabaseClient
  ahora: Date
  dryRun: boolean
  mandar: (o: { leadId: number; para: string[]; correo: Correo; plantilla: string }) => Promise<string | null>
  bitacora: (leadId: number, body: string) => Promise<unknown>
  /** Aviso a José (el `escalar` del motor). Un caso que pasa a él sin aviso queda olvidado. */
  avisar?: (titulo: string, cuerpo: string, responderA?: string) => Promise<unknown>
  nota: (s: string) => void
}

/** Una pasada sobre los leads de campo. No hace nada si `AGENTE_TIPOS` no está en 'on'. */
export async function trabajarCampos(ctx: Ctx, activo = TIPOS_CAMPO_ACTIVOS): Promise<void> {
  if (!activo) return
  if (!horarioRespuesta(ctx.ahora)) return
  const { db, ahora } = ctx
  const cols = 'id,intent,name,email,province,zona,hectareas,category'

  const { data: tomados } = await db.from('agente_casos').select('lead_id')
  const ya = new Set((tomados ?? []).map((r) => r.lead_id as number))
  const { data: nuevos } = await db
    .from('producer_leads')
    .select(cols)
    .in('intent', [...INTENTS_CAMPO])
    .in('status', ['new', 'needs_review'])
    .order('created_at', { ascending: true })
  for (const l of ((nuevos ?? []) as LeadCampo[]).filter((x) => !ya.has(x.id)).slice(0, MAX_CAMPOS_POR_CORRIDA)) {
    const a = planNuevo(l, ahora)
    if (a.tipo !== 'tomar') continue
    if (!ctx.dryRun) {
      await db.from('agente_casos').insert({
        lead_id: l.id,
        lado: ladoDeIntent(l.intent),
        estado: a.estado,
        datos: a.datos,
        motivo: a.motivo,
        proximo_at: a.proximo.toISOString(),
      })
    }
    if (a.correo) await ctx.mandar({ leadId: l.id, para: [l.email!], correo: a.correo, plantilla: `campo_${a.datos.tipo}` })
    if (a.estado === 'escalado' && ctx.avisar) {
      const d = a.datos
      await ctx.avisar(
        `Caso de ${d.tipo} #${l.id} con datos completos (lo seguís vos)`,
        [
          `${l.name ?? 'Sin nombre'} · ${l.intent}`,
          `${d.hectareas ?? '?'} ha · ${d.aptitud ?? 'aptitud s/d'} · ${[d.zona, d.provincia].filter(Boolean).join(', ') || 'zona s/d'}`,
          '',
          'El agente no le ofrece a contrapartes (bloqueo legal o sin comisión, ver src/lib/agente/tipos.ts).',
        ].join('\n'),
        l.email ?? undefined,
      )
    }
    await ctx.bitacora(l.id, `El agente tomó el caso (${a.datos.tipo}): ${a.motivo}`)
  }

  const { data: pend } = await db.from('agente_casos').select('*').eq('estado', 'pidiendo_datos').lte('proximo_at', ahora.toISOString()).limit(30)
  for (const caso of (pend ?? []) as Array<{ lead_id: number; estado: string; recordatorios: number; proximo_at: string; datos: DatosCaso }>) {
    if (esCasoDeHacienda(caso.datos)) continue
    const { data: lr } = await db.from('producer_leads').select(cols).eq('id', caso.lead_id).maybeSingle()
    if (!lr) continue
    const a = planPendiente(caso, lr as LeadCampo, ahora)
    if (a.tipo === 'recordar') {
      await ctx.mandar({ leadId: caso.lead_id, para: [(lr as LeadCampo).email!], correo: a.correo, plantilla: `campo_recordatorio` })
      if (!ctx.dryRun) {
        await db
          .from('agente_casos')
          .update({ recordatorios: caso.recordatorios + 1, proximo_at: a.proximo.toISOString(), actualizado_at: ahora.toISOString() })
          .eq('lead_id', caso.lead_id)
      }
    } else if (a.tipo === 'dormir') {
      if (!ctx.dryRun) await db.from('agente_casos').update({ estado: 'dormido', motivo: a.motivo, actualizado_at: ahora.toISOString() }).eq('lead_id', caso.lead_id)
      await ctx.bitacora(caso.lead_id, `Caso de campo dormido: ${a.motivo}`)
    }
  }
}
