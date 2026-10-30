/**
 * El agente con los leads de campo: arrendamiento (busco/ofrezco), búsqueda de
 * campo y tasación. Noche del 21-10-2026.
 *
 * Qué hace y qué NO:
 *  · Le escribe a quien nos consultó: le pide los datos que faltan (ha,
 *    aptitud, zona, plazo) o, si pidió una tasación, le pregunta si es para
 *    vender o arrendar.
 *  · VENTA DE CAMPO (José, 26-10-2026): con los datos completos el caso pasa a
 *    `ofreciendo` y se les ofrece a consignatarias de la provincia (después las
 *    limítrofes), OFERTAS_POR_TANDA por tanda. Las consignatarias tienen la
 *    matrícula; el sitio es un portal que no intermedia y solo ofrece el contacto.
 *    Mismas reglas que hacienda: días hábiles, cupo diario compartido, nadie dos
 *    veces en 24 h, BAJA para siempre, el contacto sale solo tras ACEPTO escrito.
 *  · Arrendamiento y búsquedas de campo siguen sin contrapartes: con los datos
 *    completos pasan a `escalado` y los sigue José a mano.
 *  · Está APAGADO salvo `AGENTE_TIPOS=on`. Prenderlo es decisión de José.
 *
 * Los casos se guardan en `agente_casos` con `datos.tipo` ≠ 'hacienda' (sin
 * migración: `datos` es jsonb). El motor de hacienda los saltea (`esCasoDeHacienda`).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { tipoDeIntent, type TipoOperacion } from './tipos'
import { faltantesCampo, pedirDatosCampo, calificarTasacion, type DatosCampo } from './mensajes-tipos'
import type { Correo } from './mensajes'
import { tomable } from './verificacion'
import { ofertaCampo, resumenCampo } from './mensajes-tipos'
import { distanciaProvincia } from './contrapartes'
import {
  DIAS_ESPERA_CONTRAPARTE,
  MAX_CONTACTOS_NUEVOS_DIA,
  MAX_RECORDATORIOS,
  MAX_TANDAS,
  OFERTAS_POR_TANDA,
  enDias,
  horarioHabil,
  horarioRespuesta,
  type EstadoCaso,
  type Lado,
} from './reglas'

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
  status?: string | null
  source?: string | null
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
  if (sePuedeOfrecer(datos, ladoDeIntent(l.intent))) {
    return { tipo: 'tomar', estado: 'ofreciendo', datos, correo: null, motivo: `venta de campo con datos completos: ${resumenCampo(datos)}`, proximo: ahora }
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

/** Solo la venta de un campo sale a consignatarias (José, 26-10-2026). */
export function sePuedeOfrecer(datos: DatosCaso, lado: Lado): boolean {
  return datos.tipo === 'campo' && lado === 'vende' && faltantesCampo(datos).length === 0
}

export interface FirmaCampo {
  ref: string
  nombre: string
  email: string
  provincia: string | null
}

/**
 * A qué consignatarias ofrecer un campo: la misma provincia primero, después las
 * limítrofes; nunca una con BAJA, una ya consultada por este caso o una a la que
 * se le escribió en las últimas 24 h. Puro.
 */
export function elegirFirmasCampo(o: {
  provincia: string | null | undefined
  firmas: FirmaCampo[]
  excluir: Set<string>
  cuantos: number
}): FirmaCampo[] {
  if (o.cuantos <= 0) return []
  const vistas = new Set<string>()
  return o.firmas
    .map((f) => ({ f, d: distanciaProvincia(o.provincia, f.provincia) }))
    .filter(({ f, d }) => {
      const e = f.email.trim().toLowerCase()
      if (d === null || !e || o.excluir.has(e) || vistas.has(e)) return false
      vistas.add(e)
      return true
    })
    .sort((a, b) => (a.d ?? 9) - (b.d ?? 9) || a.f.nombre.localeCompare(b.f.nombre))
    .slice(0, o.cuantos)
    .map(({ f }) => f)
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
  mandar: (o: { leadId: number; ofertaId?: number | null; para: string[]; correo: Correo; plantilla: string; conBaja?: boolean }) => Promise<string | null>
  /** Mails con BAJA (en minúscula). Nunca se les escribe. */
  bajas?: Set<string>
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
  const cols = 'id,intent,name,email,province,zona,hectareas,category,status,source'

  const { data: tomados } = await db.from('agente_casos').select('lead_id')
  const ya = new Set((tomados ?? []).map((r) => r.lead_id as number))
  const { data: nuevos } = await db
    .from('producer_leads')
    .select(cols)
    .in('intent', [...INTENTS_CAMPO])
    .in('status', ['new', 'needs_review'])
    .order('created_at', { ascending: true })
  // Mismo resguardo que hacienda: un lead del MCP sin verificar no se toma (verificacion.ts).
  for (const l of ((nuevos ?? []) as LeadCampo[]).filter((x) => !ya.has(x.id) && tomable({ status: x.status ?? 'new', source: x.source })).slice(0, MAX_CAMPOS_POR_CORRIDA)) {
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

/**
 * Ofrece las ventas de campo en `ofreciendo` a consignatarias de la zona. Una tanda
 * cada DIAS_ESPERA_CONTRAPARTE días, hasta MAX_TANDAS, mientras ninguna haya
 * aceptado. Solo en días hábiles y dentro del cupo diario que comparte con hacienda.
 */
export async function ofrecerCampos(ctx: Ctx): Promise<void> {
  const { db, ahora } = ctx
  if (!horarioHabil(ahora)) return
  // Sin filtrar por tipo, 20 casos de hacienda vencidos dejarían afuera a los de campo: se trae más y por antigüedad.
  const { data: casos } = await db.from('agente_casos').select('*').eq('estado', 'ofreciendo').lte('proximo_at', ahora.toISOString()).order('proximo_at').limit(100)
  const deCampo = ((casos ?? []) as Array<{ lead_id: number; lado: Lado; tandas: number; datos: DatosCaso }>).filter(
    (c) => !esCasoDeHacienda(c.datos) && sePuedeOfrecer(c.datos, c.lado),
  )
  if (deCampo.length === 0) return

  const { data: fs } = await db.from('consignatarias').select('canonical_slug,display_name,email,province').not('email', 'is', null)
  const firmas: FirmaCampo[] = (fs ?? []).map((f) => ({ ref: String(f.canonical_slug), nombre: String(f.display_name), email: String(f.email), provincia: f.province as string | null }))

  const { data: ls } = await db.from('producer_leads').select('id,email').in('id', deCampo.map((c) => c.lead_id))
  const mailLead = new Map((ls ?? []).map((l) => [Number(l.id), l.email ? String(l.email).toLowerCase() : null]))

  for (const caso of deCampo) {
    const mailDuenio = mailLead.get(caso.lead_id) ?? null
    // Un dueño con BAJA no se ofrece: si una firma aceptara, su contacto le llegaría sin que él lo sepa.
    if (!mailDuenio || ctx.bajas?.has(mailDuenio)) {
      if (!ctx.dryRun) await db.from('agente_casos').update({ estado: 'retirado', motivo: mailDuenio ? 'el email del dueño está dado de baja' : 'el dueño no tiene email', actualizado_at: ahora.toISOString() }).eq('lead_id', caso.lead_id)
      await ctx.bitacora(caso.lead_id, 'Campo retirado: el dueño no tiene email o está de baja')
      continue
    }
    // Mismo cupo que hacienda (motor.ts, enviadasHoy): ofertas de las últimas 24 h.
    const desde = new Date(ahora.getTime() - 86_400_000).toISOString()
    const { count: hoy } = await db.from('agente_ofertas').select('id', { count: 'exact', head: true }).gte('enviada_at', desde)
    const cupo = MAX_CONTACTOS_NUEVOS_DIA - (hoy ?? 0)
    if (cupo <= 0) {
      ctx.nota('cupo diario de contactos nuevos agotado (campos)')
      return
    }
    const { data: ofs } = await db.from('agente_ofertas').select('email,estado').eq('lead_id', caso.lead_id)
    if ((ofs ?? []).some((o) => ['acepto', 'presentada'].includes(String(o.estado)))) continue
    const { data: recientes } = await db.from('agente_ofertas').select('email').gte('enviada_at', desde)
    const yaOfrecidas = (ofs ?? []).map((r) => String(r.email).toLowerCase())
    const excluir = new Set([...(ctx.bajas ?? []), mailDuenio, ...yaOfrecidas, ...(recientes ?? []).map((r) => String(r.email).toLowerCase())])

    const escalarCampo = async (motivo: string, cuerpo: string) => {
      if (!ctx.dryRun) await db.from('agente_casos').update({ estado: 'escalado', motivo: `campo: ${motivo}`, actualizado_at: ahora.toISOString() }).eq('lead_id', caso.lead_id)
      await ctx.avisar?.(`Campo #${caso.lead_id}: ${motivo}`, `${resumenCampo(caso.datos)}. ${cuerpo} Lo seguís vos.`)
      await ctx.bitacora(caso.lead_id, `Campo: ${motivo}, pasa a José`)
    }
    if (caso.tandas >= MAX_TANDAS) {
      await escalarCampo(`se agotaron las ${MAX_TANDAS} tandas`, `Se ofreció a ${yaOfrecidas.length} y ninguna aceptó.`)
      continue
    }
    if (!caso.datos.provincia) {
      await escalarCampo('falta la provincia', 'Sin provincia no sé a qué consignatarias ofrecerlo.')
      continue
    }
    const elegidas = elegirFirmasCampo({ provincia: caso.datos.provincia, firmas, excluir, cuantos: Math.min(OFERTAS_POR_TANDA, cupo) })
    if (elegidas.length === 0) {
      // Si quedan firmas que solo esperan por la regla de las 24 h, se reintenta mañana.
      const sinRecientes = new Set([...(ctx.bajas ?? []), mailDuenio, ...yaOfrecidas])
      const quedan = elegirFirmasCampo({ provincia: caso.datos.provincia, firmas, excluir: sinRecientes, cuantos: 1 })
      if (quedan.length > 0) {
        if (!ctx.dryRun) await db.from('agente_casos').update({ proximo_at: enDias(ahora, 1).toISOString(), actualizado_at: ahora.toISOString() }).eq('lead_id', caso.lead_id)
        continue
      }
      await escalarCampo('no quedan consignatarias de la zona para ofrecer', `Se ofreció a ${yaOfrecidas.length} y ninguna aceptó.`)
      continue
    }
    let salieron = 0
    for (const f of elegidas) {
      if (ctx.dryRun) {
        await ctx.mandar({ leadId: caso.lead_id, para: [f.email], correo: ofertaCampo({ leadId: caso.lead_id, ofertaId: 0, datos: caso.datos }), plantilla: 'oferta_campo', conBaja: true })
        continue
      }
      const { data: nueva, error } = await db.from('agente_ofertas').insert({ lead_id: caso.lead_id, tipo: 'firma', ref: f.ref, nombre: f.nombre, email: f.email.toLowerCase() }).select('id').single()
      if (error || !nueva) continue
      const id = await ctx.mandar({ leadId: caso.lead_id, ofertaId: nueva.id, para: [f.email], correo: ofertaCampo({ leadId: caso.lead_id, ofertaId: nueva.id, datos: caso.datos }), plantilla: 'oferta_campo', conBaja: true })
      if (!id) await db.from('agente_ofertas').delete().eq('id', nueva.id)
      else {
        salieron++
        await ctx.bitacora(caso.lead_id, `Campo ofrecido a ${f.nombre}`)
      }
    }
    // Una tanda que no salió (envíos fallidos) no cuenta: se reintenta en la próxima corrida.
    if (!ctx.dryRun && salieron > 0) {
      await db
        .from('agente_casos')
        .update({ tandas: caso.tandas + 1, proximo_at: enDias(ahora, DIAS_ESPERA_CONTRAPARTE).toISOString(), actualizado_at: ahora.toISOString() })
        .eq('lead_id', caso.lead_id)
    } else if (!ctx.dryRun) {
      await db.from('agente_casos').update({ proximo_at: enDias(ahora, 1).toISOString(), actualizado_at: ahora.toISOString() }).eq('lead_id', caso.lead_id)
    }
  }
}
