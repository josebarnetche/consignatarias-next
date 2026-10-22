/**
 * El motor del agente: una corrida cada 15 minutos (`/api/cron/agente`).
 *
 *  1. Lee la casilla y actúa sobre cada respuesta (acepta → presenta, pregunta →
 *     traslada, cerró → registra la comisión, baja → no escribe más).
 *  2. Toma los leads de hacienda nuevos: el modelo decide si son una operación
 *     de verdad y saca los datos.
 *  3. Avanza cada caso que tiene algo pendiente: pedir datos, ofrecer a la
 *     siguiente tanda, hacer seguimiento.
 *
 * Todo lo que sale queda en `agente_mensajes` y en la bitácora del lead
 * (`lead_activity`), así que /admin/leads muestra la historia completa.
 *
 * Sin `AGENTE_IMAP_PASSWORD` no sale nada: un agente que escribe y no puede leer
 * las respuestas promete y no cumple.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import frigorificosData from '@/lib/data/frigorificos.json'
import { puedeFaenarBovinos } from '@/lib/frigorificos/faena'
import { getFeaturedSlugs } from '@/lib/featured'
import { logActivity, type ActivityOutcome } from '@/lib/leads/activity'
import { LEAD_ALERT_TO } from '@/lib/email'
import { CABEZAS_MINIMAS } from '@/lib/leads/calidad'
import { elegirContrapartes, type Candidato } from './contrapartes'
import { leadDeDemanda, type Demanda } from './demanda'
import { enviar, leerBandeja, CASILLA, type Entrante } from './correo'
import { triageLead, leerRespuesta } from './ia'
import * as M from './mensajes'
import { ordenarCola } from './cola'
import { tomable } from './verificacion'
import { esCasoDeHacienda, trabajarCampos } from './campos-agente'
import { comisionEstimada } from './tablero'
import {
  DIAS_ESPERA_CONTRAPARTE,
  MAX_CONTACTOS_NUEVOS_DIA,
  MAX_RECORDATORIOS,
  MAX_TANDAS,
  OFERTAS_POR_TANDA,
  RECORDATORIO_CONTRAPARTE_DIAS,
  SEGUIMIENTO_DIAS,
  brutoDeCierre,
  comisionArs,
  debeEscalar,
  enDias,
  esAutomatica,
  esRemitenteSistema,
  faltantes,
  filtraContacto,
  horarioHabil,
  horarioRespuesta,
  leerReferencia,
  pareceAceptacion,
  pareceBaja,
  sinCita,
  unirDatos,
  type DatosHacienda,
  type EstadoCaso,
  type Intencion,
  type Lado,
} from './reglas'

const ACTOR = 'agente'
const MAX_TRIAGE_POR_CORRIDA = 10
/** Motivo del caso que todavía no tiene a quién ofrecerse (se reintenta cada día). */
const SIN_CANDIDATOS = 'todavía sin contrapartes en la zona'

interface Lead {
  id: number
  intent: string
  category: string | null
  head_count: number | null
  province: string | null
  zona: string | null
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  source: string | null
  desired_price_ars: number | null
  status: string
}

interface Caso {
  lead_id: number
  lado: Lado
  estado: EstadoCaso
  datos: DatosHacienda
  recordatorios: number
  tandas: number
  proximo_at: string
  motivo: string | null
}

interface Oferta {
  id: number
  lead_id: number
  tipo: 'frigorifico' | 'firma' | 'lead'
  ref: string
  nombre: string
  email: string
  estado: string
  seguimientos: number
  enviada_at: string
  presentada_at: string | null
  proximo_at: string | null
}

export interface Informe {
  dryRun: boolean
  bandeja: { leidos: number; errores: string[] }
  nuevos: number
  descartados: number
  enviados: number
  escalados: number
  cierres: number
  notas: string[]
}

const LEAD_COLS = 'id,intent,category,head_count,province,zona,name,email,phone,message,source,desired_price_ars,status'

export async function correrAgente(db: SupabaseClient, opts: { dryRun?: boolean; ahora?: Date } = {}): Promise<Informe> {
  const ahora = opts.ahora ?? new Date()
  const dryRun = !!opts.dryRun || !process.env.AGENTE_IMAP_PASSWORD
  const inf: Informe = { dryRun, bandeja: { leidos: 0, errores: [] }, nuevos: 0, descartados: 0, enviados: 0, escalados: 0, cierres: 0, notas: [] }
  if (!process.env.AGENTE_IMAP_PASSWORD) inf.notas.push('sin AGENTE_IMAP_PASSWORD: corre en seco, no manda nada')

  /* ---------------- utilidades con la base ---------------- */

  const leerLead = async (id: number): Promise<Lead | null> => {
    const { data } = await db.from('producer_leads').select(LEAD_COLS).eq('id', id).maybeSingle()
    return (data as Lead) ?? null
  }
  const leerCaso = async (id: number): Promise<Caso | null> => {
    const { data } = await db.from('agente_casos').select('*').eq('lead_id', id).maybeSingle()
    return (data as Caso) ?? null
  }
  const guardarCaso = async (id: number, cambios: Partial<Caso> & { motivo?: string }) => {
    if (dryRun) return
    await db.from('agente_casos').update({ ...cambios, actualizado_at: new Date().toISOString() }).eq('lead_id', id)
  }
  const guardarOferta = async (id: number, cambios: Record<string, unknown>) => {
    if (dryRun) return
    await db.from('agente_ofertas').update(cambios).eq('id', id)
  }
  const bitacora = (leadId: number, body: string, outcome?: ActivityOutcome | null, meta?: Record<string, unknown>) =>
    dryRun ? Promise.resolve(true) : logActivity(db, { leadId, kind: 'sistema', outcome: outcome ?? null, body, actor: ACTOR, meta: meta ?? null })

  const bajas = new Set<string>()
  {
    const { data } = await db.from('agente_bajas').select('email')
    for (const r of data ?? []) bajas.add(String(r.email).toLowerCase())
  }

  /** Manda y registra. Devuelve el Message-ID, o null si no salió. */
  const mandar = async (o: {
    leadId: number
    ofertaId?: number | null
    para: string[]
    correo: M.Correo
    plantilla: string
    enRespuestaA?: string | null
    conBaja?: boolean
  }): Promise<string | null> => {
    const para = o.para.map((p) => p.trim().toLowerCase()).filter((p) => p && !bajas.has(p))
    if (para.length === 0) return null
    if (dryRun) {
      inf.notas.push(`[seco] ${o.plantilla} → ${para.join(', ')} · ${o.correo.asunto}`)
      return `<seco-${Math.random()}>`
    }
    const r = await enviar({ para, correo: o.correo, enRespuestaA: o.enRespuestaA, conBaja: o.conBaja })
    if (!r.ok) {
      inf.notas.push(`no salió ${o.plantilla} a ${para.join(', ')}: ${r.error}`)
      return null
    }
    inf.enviados++
    await db.from('agente_mensajes').insert({
      lead_id: o.leadId,
      oferta_id: o.ofertaId ?? null,
      dir: 'out',
      de: CASILLA,
      para: para.join(', '),
      asunto: o.correo.asunto,
      cuerpo: o.correo.texto,
      message_id: r.messageId,
      in_reply_to: o.enRespuestaA ?? null,
      clasificacion: { plantilla: o.plantilla },
    })
    return r.messageId
  }

  /** A José: solo cierres y lo que el agente no debe resolver solo. */
  const escalar = async (titulo: string, cuerpo: string, responderA?: string) => {
    inf.escalados++
    if (dryRun) {
      inf.notas.push(`[seco] escalaría: ${titulo}`)
      return
    }
    await enviar({
      para: LEAD_ALERT_TO,
      correo: { asunto: `[Agente] ${titulo}`, texto: `${cuerpo}\n\n—\nBitácora completa en https://www.consignatarias.com.ar/admin/leads` },
      responderA,
    })
  }

  /* ---------------- 1. bandeja ---------------- */

  if (horarioRespuesta(ahora) && process.env.AGENTE_IMAP_PASSWORD && !opts.dryRun) {
    try {
      inf.bandeja = await leerBandeja((m) => procesarEntrante(m))
    } catch (e) {
      inf.bandeja.errores.push(e instanceof Error ? e.message : String(e))
    }
  }

  async function procesarEntrante(m: Entrante) {
    // Idempotencia: el message_id es único. Si ya está, ya se procesó.
    const { data: ya } = await db.from('agente_mensajes').select('id').eq('message_id', m.messageId).maybeSingle()
    if (ya) return
    const texto = sinCita(m.texto)

    // ¿A qué caso pertenece? Primero por el hilo, después por la referencia del asunto, después por quién escribe.
    let leadId: number | null = null
    let ofertaId: number | null = null
    let plantillaPrevia: string | null = null
    const ids = [m.inReplyTo, ...m.references].filter(Boolean) as string[]
    if (ids.length) {
      const { data } = await db.from('agente_mensajes').select('lead_id,oferta_id,clasificacion').eq('dir', 'out').in('message_id', ids).order('creado_at', { ascending: false }).limit(1)
      if (data?.[0]) {
        leadId = data[0].lead_id
        ofertaId = data[0].oferta_id
        plantillaPrevia = (data[0].clasificacion as { plantilla?: string } | null)?.plantilla ?? null
      }
    }
    if (!leadId) {
      const ref = leerReferencia(m.asunto)
      if (ref) {
        leadId = ref.leadId
        ofertaId = ref.ofertaId
      }
    }
    if (!leadId) {
      const { data: of } = await db.from('agente_ofertas').select('id,lead_id').eq('email', m.de).order('enviada_at', { ascending: false }).limit(1)
      if (of?.[0]) {
        leadId = of[0].lead_id
        ofertaId = of[0].id
      } else {
        const { data: ld } = await db.from('producer_leads').select('id').ilike('email', m.de).order('created_at', { ascending: false }).limit(1)
        if (ld?.[0]) leadId = ld[0].id
      }
    }

    const registrar = (clasificacion: Record<string, unknown>) =>
      db.from('agente_mensajes').insert({
        lead_id: leadId,
        oferta_id: ofertaId,
        dir: 'in',
        de: m.de,
        para: CASILLA,
        asunto: m.asunto,
        cuerpo: m.texto.slice(0, 20000),
        message_id: m.messageId,
        in_reply_to: m.inReplyTo,
        clasificacion,
      })

    if (esAutomatica(m.asunto, m.texto, m.headers)) {
      await registrar({ tipo: 'automatica' })
      return
    }

    const lead = leadId ? await leerLead(leadId) : null
    const caso = leadId ? await leerCaso(leadId) : null
    if (!lead || !caso) {
      if (esRemitenteSistema(m.de)) {
        await registrar({ tipo: 'sistema' })
        return
      }
      await registrar({ tipo: 'sin_caso' })
      await escalar(`Correo sin caso de ${m.de}`, `Llegó a ${CASILLA} y no lo pude asociar a ningún caso.\n\nAsunto: ${m.asunto}\n\n${texto}`, m.de)
      return
    }

    // Un caso escalado lo lleva José a mano (p. ej. el #48, faena kosher): el agente no
    // contesta ni presenta a nadie, solo le reenvía lo que entra con responder-a quien escribió.
    if (caso.estado === 'escalado') {
      await registrar({ tipo: 'caso_manual' })
      await escalar(
        `${m.de} respondió en el caso #${lead.id} (lo llevás vos)`,
        `De: ${m.de}\nAsunto: ${m.asunto}\n\n${texto}\n\nSi respondés este correo, le llega directo a ${m.de}.`,
        m.de,
      )
      await bitacora(lead.id, `Respuesta de ${m.de} reenviada a José (caso manual)`, 'contesto')
      return
    }

    // Un caso de campo (arrendamiento, tasación) no lo cierra el agente: lo que contesta
    // el lead le llega a José, que es quien resuelve el circuito con un corredor (campos-agente.ts).
    if (!esCasoDeHacienda(caso.datos)) {
      await registrar({ tipo: 'caso_campo' })
      await escalar(
        `${m.de} respondió en el caso de campo #${lead.id}`,
        `De: ${m.de}\nAsunto: ${m.asunto}\n\n${texto}\n\nSi respondés este correo, le llega directo a ${m.de}.`,
        m.de,
      )
      await guardarCaso(lead.id, { estado: 'escalado', motivo: 'el lead contestó: lo sigue José' })
      await bitacora(lead.id, `Respuesta de ${m.de} reenviada a José (caso de campo)`, 'contesto')
      return
    }

    const { data: ofRow } = ofertaId ? await db.from('agente_ofertas').select('*').eq('id', ofertaId).maybeSingle() : { data: null }
    const of = (ofRow as Oferta | null) ?? null
    const esProductor = !!lead.email && lead.email.toLowerCase() === m.de
    const quien: 'productor' | 'contraparte' = esProductor ? 'productor' : of ? 'contraparte' : 'productor'

    // La baja se respeta siempre, con o sin modelo.
    if (pareceBaja(texto)) {
      await registrar({ tipo: 'baja' })
      await db.from('agente_bajas').upsert({ email: m.de, motivo: `respondió BAJA (caso ${lead.id})` })
      await mandar({ leadId: lead.id, para: [m.de], correo: M.bajaConfirmada(), plantilla: 'baja', enRespuestaA: m.messageId })
      bajas.add(m.de)
      if (quien === 'contraparte' && of) await guardarOferta(of.id, { estado: 'rechazo', respondida_at: new Date().toISOString() })
      else await guardarCaso(lead.id, { estado: 'retirado', motivo: 'el productor pidió la baja' })
      await bitacora(lead.id, `${m.de} pidió la baja`, 'no_interesa')
      return
    }

    const leida = await leerRespuesta({
      quien,
      lado: caso.lado,
      etapa: of ? `oferta ${of.estado}` : caso.estado,
      resumen: M.resumenHacienda(caso.datos),
      asunto: m.asunto,
      texto,
    })
    let intencion: Intencion
    if (leida) intencion = { tipo: leida.tipo, escalar: leida.escalar, motivo: leida.motivo }
    else intencion = pareceAceptacion(texto) && quien === 'contraparte' ? { tipo: 'acepta' } : { tipo: 'otro', motivo: 'sin modelo' }
    await registrar({ ...intencion, quien, datos: leida?.datos ?? null, cierre: leida?.cierre ?? null })

    // El productor respondiendo a un traslado: su respuesta va a la contraparte.
    if (quien === 'productor' && plantillaPrevia === 'traslado_productor' && of && !debeEscalar(intencion, texto) && intencion.tipo !== 'retira') {
      const bloqueo = filtraContacto(texto, lead)
      if (bloqueo) {
        await escalar(`Respuesta del productor #${lead.id} sin trasladar`, `No la trasladé a ${of.nombre} porque ${bloqueo}.\n\n${texto}`, m.de)
        return
      }
      await mandar({ leadId: lead.id, ofertaId: of.id, para: [of.email], correo: M.traslado({ leadId: lead.id, ofertaId: of.id, datos: caso.datos, aQuien: 'contraparte', nombre: null, pregunta: texto }), plantilla: 'traslado_contraparte', conBaja: true })
      await bitacora(lead.id, `Respuesta del productor trasladada a ${of.nombre}`, 'contesto')
      return
    }

    if (debeEscalar(intencion, texto)) {
      await escalar(
        `${quien === 'productor' ? 'El productor' : of?.nombre ?? m.de} escribió algo para vos · caso #${lead.id}`,
        `Caso #${lead.id}: ${M.resumenHacienda(caso.datos)} (${caso.estado}).\nLo leí como "${intencion.tipo}": ${intencion.motivo ?? ''}\n\nDe: ${m.de}\nAsunto: ${m.asunto}\n\n${texto}\n\nSi respondés este correo, le llega directo a ${m.de}.`,
        m.de,
      )
      await bitacora(lead.id, `Escalado a José: ${intencion.motivo ?? intencion.tipo}`, 'pendiente')
      return
    }

    const ahoraIso = new Date().toISOString()

    if (quien === 'contraparte' && of) {
      switch (intencion.tipo) {
        case 'acepta': {
          if (!['enviada', 'sin_respuesta'].includes(of.estado)) return
          await guardarOferta(of.id, { estado: 'acepto', aceptacion: texto.slice(0, 2000), respondida_at: ahoraIso })
          const id = await mandar({
            leadId: lead.id,
            ofertaId: of.id,
            para: [lead.email!, of.email],
            correo: M.presentacion({ leadId: lead.id, ofertaId: of.id, lado: caso.lado, datos: caso.datos, productor: { nombre: lead.name, email: lead.email, phone: lead.phone }, contraparte: { nombre: of.nombre, email: of.email } }),
            plantilla: 'presentacion',
            enRespuestaA: m.messageId,
          })
          if (!id) return
          await guardarOferta(of.id, { estado: 'presentada', presentada_at: ahoraIso, proximo_at: enDias(ahora, SEGUIMIENTO_DIAS[0]).toISOString() })
          await guardarCaso(lead.id, { estado: 'presentado' })
          if (!dryRun) await db.from('producer_leads').update({ status: 'routed', routed_at: ahoraIso }).eq('id', lead.id)
          await bitacora(lead.id, `${of.nombre} aceptó la comisión del 1% por escrito y los presenté`, 'interesado', { oferta_id: of.id })
          return
        }
        case 'rechaza':
          await guardarOferta(of.id, { estado: 'rechazo', respondida_at: ahoraIso })
          await bitacora(lead.id, `${of.nombre} no está interesado`, 'no_interesa')
          return
        case 'pregunta': {
          const pregunta = leida?.pregunta || texto
          await mandar({ leadId: lead.id, ofertaId: of.id, para: [lead.email!], correo: M.traslado({ leadId: lead.id, ofertaId: of.id, datos: caso.datos, aQuien: 'productor', nombre: lead.name, pregunta }), plantilla: 'traslado_productor' })
          await guardarOferta(of.id, { respondida_at: ahoraIso })
          await bitacora(lead.id, `${of.nombre} preguntó: ${pregunta.slice(0, 300)} (trasladado al productor)`, 'contesto')
          return
        }
        default:
          break // cerrada / caida / avanzando: igual que si lo dice el productor
      }
    }

    if (intencion.tipo === 'datos' && quien === 'productor' && leida?.datos) {
      const datos = unirDatos(caso.datos, leida.datos as DatosHacienda)
      const completo = faltantes(datos).length === 0
      await guardarCaso(lead.id, {
        datos,
        ...(caso.estado === 'pidiendo_datos' && completo ? { estado: 'nuevo' as EstadoCaso, proximo_at: ahoraIso } : {}),
      })
      await bitacora(lead.id, `El productor mandó datos: ${M.resumenHacienda(datos)}`, 'contesto')
      return
    }

    if (intencion.tipo === 'retira') {
      await guardarCaso(lead.id, { estado: 'retirado', motivo: intencion.motivo })
      if (!dryRun) await db.from('producer_leads').update({ status: 'lost' }).eq('id', lead.id)
      await bitacora(lead.id, `El productor se retiró: ${intencion.motivo ?? ''}`, 'no_interesa')
      return
    }

    // Cierre, caída o avance de una presentación. Si no vino por el hilo de una
    // oferta, se toma la última presentada del caso.
    let presentada = of && ['presentada', 'acepto'].includes(of.estado) ? of : null
    if (!presentada && ['cerrada', 'caida', 'avanzando'].includes(intencion.tipo)) {
      const { data } = await db.from('agente_ofertas').select('*').eq('lead_id', lead.id).eq('estado', 'presentada').order('presentada_at', { ascending: false }).limit(1)
      presentada = (data?.[0] as Oferta) ?? null
    }
    if (!presentada) {
      await escalar(`No supe qué hacer con un correo · caso #${lead.id}`, `Lo leí como "${intencion.tipo}" pero el caso está en "${caso.estado}".\n\nDe: ${m.de}\n\n${texto}`, m.de)
      return
    }

    if (intencion.tipo === 'avanzando') {
      await guardarOferta(presentada.id, { proximo_at: enDias(ahora, 10).toISOString() })
      await bitacora(lead.id, `Siguen hablando con ${presentada.nombre}`, 'pendiente')
      return
    }
    if (intencion.tipo === 'caida') {
      await guardarOferta(presentada.id, { estado: 'caida', proximo_at: null })
      const { count } = await db.from('agente_ofertas').select('id', { count: 'exact', head: true }).eq('lead_id', lead.id).eq('estado', 'presentada').neq('id', presentada.id)
      if (!count) await guardarCaso(lead.id, { estado: 'ofreciendo', proximo_at: ahoraIso })
      await bitacora(lead.id, `No se dio con ${presentada.nombre}; vuelvo a ofrecer`, 'no_interesa')
      return
    }
    if (intencion.tipo === 'cerrada') {
      const c = leida?.cierre ?? null
      const cierre = {
        cabezas: c?.cabezas ?? caso.datos.cabezas ?? null,
        precio_kg: c?.precio_kg ?? null,
        peso_kg: c?.peso_kg ?? caso.datos.peso_kg ?? null,
        bruto_ars: c?.bruto_ars ?? null,
      }
      const bruto = brutoDeCierre(cierre)
      const comision = bruto ? comisionArs(bruto) : null
      await guardarOferta(presentada.id, { estado: 'cerrada', cierre: { ...cierre, bruto_ars: bruto, comision_ars: comision, informado_por: m.de, texto: texto.slice(0, 1000) }, proximo_at: null })
      await guardarCaso(lead.id, { estado: 'cerrado' })
      if (!dryRun) await db.from('producer_leads').update({ status: 'won', closed_at: ahoraIso, fee_ars: comision }).eq('id', lead.id)
      inf.cierres++
      if (bruto && comision) {
        await mandar({ leadId: lead.id, ofertaId: presentada.id, para: [presentada.email], correo: M.avisoComision({ leadId: lead.id, ofertaId: presentada.id, contraparte: presentada.nombre, datos: caso.datos, brutoArs: bruto, comisionArs: comision }), plantilla: 'aviso_comision' })
      }
      await escalar(
        `CIERRE · caso #${lead.id} · ${comision ? `comisión $${comision.toLocaleString('es-AR')}` : 'falta el monto'}`,
        [
          `Se cerró ${M.resumenHacienda(caso.datos)} con ${presentada.nombre} (${presentada.email}).`,
          `Cabezas: ${cierre.cabezas ?? '?'} · precio/kg: ${cierre.precio_kg ?? '?'} · peso: ${cierre.peso_kg ?? '?'} · bruto: ${bruto ?? '?'}`,
          comision
            ? `Comisión 1%: $${comision.toLocaleString('es-AR')}. Ya le avisé a ${presentada.nombre} que le llega la factura de Memola: falta emitirla.`
            : 'No tengo el monto: preguntale a las partes el bruto y facturá el 1%. A la contraparte NO le mandé aviso de comisión.',
          `Aceptación por escrito guardada en la oferta #${presentada.id}.`,
          '',
          `Lo que escribió ${m.de}:`,
          texto,
        ].join('\n'),
      )
      await bitacora(lead.id, `CERRADO con ${presentada.nombre}${comision ? ` · comisión $${comision.toLocaleString('es-AR')}` : ''}`, 'cerrado', { oferta_id: presentada.id, bruto, comision })
      return
    }

    await escalar(`No supe qué hacer con un correo · caso #${lead.id}`, `Lo leí como "${intencion.tipo}".\n\nDe: ${m.de}\n\n${texto}`, m.de)
  }

  /* ---------------- 2. leads nuevos ---------------- */

  // Las demandas de compra entran como leads de compra (una vez cada una).
  {
    const { data: demandas } = await db.from('demanda_compra').select('*').eq('status', 'active')
    if (demandas?.length) {
      const fuentes = demandas.map((d) => `demanda_compra:${d.id}`)
      const { data: ya } = await db.from('producer_leads').select('source').in('source', fuentes)
      const cargadas = new Set((ya ?? []).map((r) => r.source))
      const propios = LEAD_ALERT_TO.map((e) => e.toLowerCase())
      for (const d of demandas as Demanda[]) {
        if (cargadas.has(`demanda_compra:${d.id}`)) continue
        const fila = leadDeDemanda(d, propios)
        if (!fila) continue
        if (dryRun) {
          inf.notas.push(`[seco] demanda #${d.id} → lead de compra`)
          continue
        }
        await db.from('producer_leads').insert(fila)
      }
    }
  }

  {
    const { data: tomados } = await db.from('agente_casos').select('lead_id')
    const yaTomados = new Set((tomados ?? []).map((r) => r.lead_id))
    const { data: leads } = await db
      .from('producer_leads')
      .select(LEAD_COLS)
      .in('intent', ['vender', 'comprar'])
      .in('status', ['new', 'needs_review'])
      .order('created_at', { ascending: true })
    // Un lead del MCP en needs_review no se toma hasta que una persona lo verifique (verificacion.ts).
    const pendientes = ((leads ?? []) as Lead[]).filter((l) => !yaTomados.has(l.id) && tomable(l)).slice(0, MAX_TRIAGE_POR_CORRIDA)
    for (const l of pendientes) {
      const t = await triageLead(l)
      if (!t) {
        inf.notas.push(`#${l.id}: sin modelo, queda para la próxima`)
        continue
      }
      const base: DatosHacienda = {
        cabezas: l.head_count,
        categoria: l.category,
        zona: l.zona,
        provincia: l.province,
        precio_pedido_kg: l.desired_price_ars && l.desired_price_ars > 100 ? Number(l.desired_price_ars) : null,
      }
      const datos = unirDatos(base, t.datos as DatosHacienda)
      const chico = !!datos.cabezas && datos.cabezas < CABEZAS_MINIMAS
      const sirve = t.es_operacion && !!t.lado && !!l.email && !chico
      const estado: EstadoCaso = sirve ? 'nuevo' : 'descartado'
      const motivo = sirve
        ? t.motivo
        : !l.email
          ? 'sin email para trabajarlo'
          : chico && t.es_operacion
            ? `chico: ${datos.cabezas} cabezas, debajo del mínimo de ${CABEZAS_MINIMAS}`
            : t.motivo
      if (sirve) inf.nuevos++
      else inf.descartados++
      if (dryRun) {
        inf.notas.push(`[seco] #${l.id} → ${estado} (${t.lado ?? '-'}): ${motivo} · ${M.resumenHacienda(datos)}`)
        continue
      }
      await db.from('agente_casos').insert({ lead_id: l.id, lado: t.lado ?? (l.intent === 'comprar' ? 'compra' : 'vende'), estado, datos, motivo })
      await bitacora(l.id, sirve ? `El agente tomó el caso: ${motivo}` : `El agente lo descartó: ${motivo}`, sirve ? 'pendiente' : null)
    }
  }

  /* ---------------- 3. casos con algo pendiente ---------------- */

  const enviadasHoy = async (): Promise<number> => {
    const desde = new Date(ahora.getTime() - 86_400_000).toISOString()
    const { count } = await db.from('agente_ofertas').select('id', { count: 'exact', head: true }).gte('enviada_at', desde)
    return count ?? 0
  }

  let candidatosCache: Candidato[] | null = null
  const candidatos = async (): Promise<Candidato[]> => {
    if (candidatosCache) return candidatosCache
    const lista: Candidato[] = []
    const padron = new Map((frigorificosData as Array<{ cuit: string; province: string; matricula?: string | null }>).map((f) => [f.cuit, f]))
    const { data: frigs } = await db.from('frigorifico_profiles').select('cuit,display_name,email_ruteo,opera,notas_internas').not('email_ruteo', 'is', null)
    for (const f of frigs ?? []) {
      const email = String(f.email_ruteo).split(/[,;\s]+/).find((e) => e.includes('@'))
      if (!email) continue
      const p = padron.get(f.cuit)
      lista.push({ tipo: 'frigorifico', ref: f.cuit, nombre: f.display_name, email, provincia: p?.province ?? null, faenaBovina: puedeFaenarBovinos(p?.matricula ?? null), notas: f.notas_internas, opera: f.opera })
    }
    // Firmas: las PRO reciben todo; las demás con mail, solo pedidos de compra
    // (José, 21-10: "les avisamos que estamos buscando y después no buscamos").
    // Con AGENTE_FIRMAS=todas en Vercel también reciben la hacienda que se vende.
    const pro = await getFeaturedSlugs()
    const { data: firmas } = await db.from('consignatarias').select('canonical_slug,display_name,email,province').not('email', 'is', null)
    for (const f of firmas ?? []) if (f.email) lista.push({ tipo: 'firma', ref: f.canonical_slug, nombre: f.display_name, email: f.email, provincia: f.province, pro: pro.has(f.canonical_slug) })
    const { data: otros } = await db.from('agente_casos').select('lead_id,lado,datos').in('estado', ['nuevo', 'pidiendo_datos', 'ofreciendo', 'presentado', 'sin_contraparte'])
    if (otros?.length) {
      const { data: ls } = await db.from('producer_leads').select('id,email').in('id', otros.map((o) => o.lead_id))
      const mail = new Map((ls ?? []).map((l) => [l.id, l.email]))
      for (const o of otros) {
        // Un caso de campo (arrendamiento, tasación) no es contraparte de hacienda (campos-agente.ts).
        if (!esCasoDeHacienda(o.datos)) continue
        const d = o.datos as DatosHacienda
        const email = mail.get(o.lead_id)
        if (email) lista.push({ tipo: 'lead', ref: String(o.lead_id), nombre: `un productor de ${d.zona ?? d.provincia ?? 'la zona'}`, email, provincia: d.provincia ?? d.zona ?? null, categoria: d.categoria, cabezas: d.cabezas, lado: o.lado as Lado })
      }
    }
    candidatosCache = lista
    return lista
  }

  // Leads de campo (arrendamiento, tasación): solo con AGENTE_TIPOS=on, y solo al lead que consultó.
  await trabajarCampos({ db, ahora, dryRun, mandar, bitacora: (id, body) => bitacora(id, body), avisar: escalar, nota: (n) => inf.notas.push(n) })

  const { data: vencidos } = await db.from('agente_casos').select('*').in('estado', ['nuevo', 'pidiendo_datos', 'ofreciendo']).lte('proximo_at', ahora.toISOString()).order('proximo_at').limit(30)
  // Los que esperan respuesta o se quedaron sin contraparte también se miran: si
  // apareció un lead del otro lado (un cruce real), se le ofrece sin esperar la tanda.
  const { data: enEspera } = await db.from('agente_casos').select('*').in('estado', ['ofreciendo', 'sin_contraparte']).gt('proximo_at', ahora.toISOString()).limit(50)
  const { data: sinContraparte } = await db.from('agente_casos').select('*').eq('estado', 'sin_contraparte').lte('proximo_at', ahora.toISOString()).limit(50)
  const vistos = new Set<number>()
  const aMirar = [...(vencidos ?? []), ...(enEspera ?? []), ...(sinContraparte ?? [])]
    .filter((c) => esCasoDeHacienda(c.datos)) // los de campo los trabaja campos-agente.ts
    .filter((c) => (vistos.has(c.lead_id) ? false : (vistos.add(c.lead_id), true)))
  // Por plata esperada primero (cola.ts): el cupo diario de contactos va a lo que más puede dejar.
  for (const caso of ordenarCola(aMirar as Caso[], (c) => comisionEstimada(c.datos))) {
    const lead = await leerLead(caso.lead_id)
    if (!lead?.email) continue
    const falta = faltantes(caso.datos)

    const vencido = new Date(caso.proximo_at) <= ahora && caso.estado !== 'sin_contraparte'

    if (caso.estado === 'nuevo' || caso.estado === 'pidiendo_datos') {
      if (!horarioRespuesta(ahora)) continue
      // Debajo de 40 cabezas no le interesa a nadie (regla de José, calidad.ts): no se ofrece.
      if (falta.length === 0 && (caso.datos.cabezas ?? 0) < CABEZAS_MINIMAS) {
        await guardarCaso(lead.id, { estado: 'descartado', motivo: `chico: ${caso.datos.cabezas} cabezas, debajo del mínimo de ${CABEZAS_MINIMAS}` })
        await bitacora(lead.id, `No se ofrece: ${caso.datos.cabezas} cabezas, debajo del mínimo de ${CABEZAS_MINIMAS}`)
        continue
      }
      if (falta.length === 0) {
        await mandar({ leadId: lead.id, para: [lead.email], correo: M.avisoOfreciendo({ leadId: lead.id, nombre: lead.name, lado: caso.lado, datos: caso.datos }), plantilla: 'aviso_ofreciendo' })
        await guardarCaso(lead.id, { estado: 'ofreciendo', proximo_at: ahora.toISOString() })
        await bitacora(lead.id, `Datos completos (${M.resumenHacienda(caso.datos)}): empiezo a ofrecer`, 'pendiente')
        continue
      }
      if (caso.estado === 'pidiendo_datos' && caso.recordatorios >= MAX_RECORDATORIOS) {
        await guardarCaso(lead.id, { estado: 'dormido', motivo: `no completó: ${falta.join(', ')}` })
        await bitacora(lead.id, `Dormido: nunca mandó ${falta.join(', ')}`, 'sin_respuesta')
        continue
      }
      const recordatorio = caso.estado === 'pidiendo_datos'
      const id = await mandar({ leadId: lead.id, para: [lead.email], correo: M.pedirDatos({ leadId: lead.id, nombre: lead.name, lado: caso.lado, datos: caso.datos, faltan: falta, recordatorio }), plantilla: 'pedir_datos' })
      if (id) {
        await guardarCaso(lead.id, { estado: 'pidiendo_datos', recordatorios: recordatorio ? caso.recordatorios + 1 : 0, proximo_at: enDias(ahora, recordatorio ? 5 : 3).toISOString() })
        await bitacora(lead.id, `Le pedí al productor: ${falta.join(', ')}`, 'pendiente')
      }
      continue
    }

    // ofreciendo (o sin contraparte, a la espera de un cruce)
    if (!horarioHabil(ahora)) continue
    const { data: ofs } = await db.from('agente_ofertas').select('*').eq('lead_id', lead.id)
    const ofertas = (ofs ?? []) as Oferta[]
    if (ofertas.some((o) => ['acepto', 'presentada'].includes(o.estado))) continue
    const limite = enDias(ahora, -DIAS_ESPERA_CONTRAPARTE).toISOString()
    for (const o of ofertas) if (o.estado === 'enviada' && o.enviada_at < limite) await guardarOferta(o.id, { estado: 'sin_respuesta' })
    const esperando = ofertas.filter((o) => o.estado === 'enviada' && o.enviada_at >= limite)

    // Un recordatorio, uno solo, a quien no contestó en dos días. En el mismo hilo.
    const corte = enDias(ahora, -RECORDATORIO_CONTRAPARTE_DIAS).toISOString()
    for (const o of esperando.filter((x) => x.enviada_at < corte && x.seguimientos === 0 && !bajas.has(x.email))) {
      const { data: orig } = await db.from('agente_mensajes').select('message_id').eq('oferta_id', o.id).eq('dir', 'out').order('creado_at').limit(1)
      const id = await mandar({ leadId: lead.id, ofertaId: o.id, para: [o.email], correo: M.recordatorioOferta({ leadId: lead.id, ofertaId: o.id, lado: caso.lado, datos: caso.datos }), plantilla: 'recordatorio_oferta', enRespuestaA: orig?.[0]?.message_id ?? null, conBaja: true })
      if (id) {
        await guardarOferta(o.id, { seguimientos: 1 })
        await bitacora(lead.id, `Recordatorio a ${o.nombre}`, 'pendiente', { oferta_id: o.id })
      }
    }

    const cupo = MAX_CONTACTOS_NUEVOS_DIA - (await enviadasHoy())
    if (cupo <= 0) {
      inf.notas.push('cupo diario de contactos nuevos agotado')
      break
    }
    const yaConsultados = new Set(ofertas.map((o) => `${o.tipo}:${o.ref}`))
    // Un lead que ya recibió este caso, o que ofreció el suyo a este, no se cruza dos veces.
    const { data: cruzadas } = await db.from('agente_ofertas').select('lead_id').eq('tipo', 'lead').eq('ref', String(lead.id))
    for (const c of cruzadas ?? []) yaConsultados.add(`lead:${c.lead_id}`)
    yaConsultados.add(`lead:${lead.id}`)
    // A nadie se le escribe dos veces en el mismo día, aunque sea por casos distintos.
    const { data: recientes } = await db.from('agente_ofertas').select('email').gte('enviada_at', new Date(ahora.getTime() - 86_400_000).toISOString())
    const bloqueados = new Set([...bajas, ...(recientes ?? []).map((r) => String(r.email).toLowerCase()), lead.email.toLowerCase()])

    const firmasTodas = process.env.AGENTE_FIRMAS === 'todas'
    const todos = (await candidatos()).filter(
      (c) => (c.tipo !== 'lead' || c.lado !== caso.lado) && (c.tipo !== 'firma' || c.pro || caso.lado === 'compra' || firmasTodas),
    )
    // Un cruce con otro lead (comprador ⇄ vendedor reales) es lo que más cierra:
    // no espera la tanda, ni el límite de tandas.
    const cruces = elegirContrapartes({ lado: caso.lado, datos: caso.datos, candidatos: todos.filter((c) => c.tipo === 'lead'), yaConsultados, bajas: bloqueados, cuantos: Math.min(OFERTAS_POR_TANDA, cupo) })
    const tocaTanda = vencido && esperando.length === 0 && caso.estado === 'ofreciendo'
    if (!tocaTanda && cruces.length === 0) {
      if (caso.estado === 'ofreciendo' && esperando.length && vencido) {
        const primera = esperando.map((o) => o.enviada_at).sort()[0]
        await guardarCaso(lead.id, { proximo_at: enDias(new Date(primera), DIAS_ESPERA_CONTRAPARTE).toISOString() })
      }
      continue
    }
    const elegidos = !tocaTanda
      ? cruces
      : caso.tandas >= MAX_TANDAS
        ? cruces
        : elegirContrapartes({ lado: caso.lado, datos: caso.datos, candidatos: todos, yaConsultados, bajas: bloqueados, cuantos: Math.min(OFERTAS_POR_TANDA, cupo) })

    if (elegidos.length === 0 && ofertas.length === 0) {
      // Nadie a quién ofrecerle todavía: al cliente no se le dice nada (antes le
      // llegaba "lo ofrecimos a 0 contrapartes" una hora después de "ya estamos
      // buscando"). Se vuelve a buscar cada día y a José se le avisa una sola vez.
      if (caso.motivo !== SIN_CANDIDATOS) {
        await escalar(
          `Sin a quién ofrecer · caso #${lead.id}`,
          `${caso.lado === 'compra' ? 'Busca' : 'Vende'} ${M.resumenHacienda(caso.datos)} y con las reglas actuales no hay ningún lead, frigorífico ni firma en la zona para ofrecérselo. Lo vuelvo a buscar todos los días; si aparece un cruce sale solo.`,
        )
        await bitacora(lead.id, 'Todavía no hay contrapartes en la zona: se vuelve a buscar cada día', 'pendiente')
      }
      await guardarCaso(lead.id, { estado: 'ofreciendo', motivo: SIN_CANDIDATOS, proximo_at: enDias(ahora, 1).toISOString() })
      continue
    }

    if (elegidos.length === 0) {
      const consultadas = ofertas.length
      await mandar({ leadId: lead.id, para: [lead.email], correo: M.sinContraparte({ leadId: lead.id, nombre: lead.name, lado: caso.lado, datos: caso.datos, consultadas }), plantilla: 'sin_contraparte' })
      await guardarCaso(lead.id, { estado: 'sin_contraparte', motivo: consultadas ? `${consultadas} consultadas, ninguna aceptó` : 'no hay contrapartes en la zona' })
      await bitacora(lead.id, consultadas ? `Sin comprador después de ${consultadas} consultas` : 'No hay contrapartes con mail en la zona', 'no_interesa')
      continue
    }

    for (const c of elegidos) {
      if (dryRun) {
        await mandar({ leadId: lead.id, para: [c.email], correo: M.oferta({ leadId: lead.id, ofertaId: 0, lado: caso.lado, datos: caso.datos, contraparte: c.tipo === 'lead' ? 'ustedes' : c.nombre }), plantilla: 'oferta' })
        continue
      }
      const { data: nueva, error } = await db.from('agente_ofertas').insert({ lead_id: lead.id, tipo: c.tipo, ref: c.ref, nombre: c.nombre, email: c.email.toLowerCase() }).select('id').single()
      if (error || !nueva) continue
      const correo = M.oferta({ leadId: lead.id, ofertaId: nueva.id, lado: caso.lado, datos: caso.datos, contraparte: c.tipo === 'lead' ? 'ustedes' : c.nombre })
      const bloqueo = filtraContacto(correo.texto, lead)
      if (bloqueo) {
        await db.from('agente_ofertas').delete().eq('id', nueva.id)
        await escalar(`Oferta frenada · caso #${lead.id}`, `No mandé la oferta a ${c.nombre} porque ${bloqueo}. Revisá los datos del caso.`)
        continue
      }
      const id = await mandar({ leadId: lead.id, ofertaId: nueva.id, para: [c.email], correo, plantilla: 'oferta', conBaja: true })
      if (!id) await db.from('agente_ofertas').delete().eq('id', nueva.id)
      else await bitacora(lead.id, `Ofrecido a ${c.nombre} (${c.tipo})`, 'pendiente', { oferta_id: nueva.id })
    }
    if (caso.estado === 'sin_contraparte') {
      await guardarCaso(lead.id, { estado: 'ofreciendo', motivo: 'apareció un cruce con otro lead', proximo_at: enDias(ahora, DIAS_ESPERA_CONTRAPARTE).toISOString() })
      await bitacora(lead.id, 'Apareció una contraparte nueva: vuelvo a ofrecer', 'pendiente')
    } else if (tocaTanda) {
      await guardarCaso(lead.id, { tandas: caso.tandas + 1, proximo_at: enDias(ahora, DIAS_ESPERA_CONTRAPARTE).toISOString() })
    }
  }

  /* ---------------- 4. seguimiento de presentaciones ---------------- */

  if (horarioHabil(ahora)) {
    const { data: pres } = await db.from('agente_ofertas').select('*').eq('estado', 'presentada').lte('proximo_at', ahora.toISOString()).limit(20)
    for (const o of (pres ?? []) as Oferta[]) {
      const caso = await leerCaso(o.lead_id)
      const lead = await leerLead(o.lead_id)
      if (!caso || !lead?.email) continue
      if (o.seguimientos >= SEGUIMIENTO_DIAS.length) {
        await guardarOferta(o.id, { estado: 'caida', proximo_at: null })
        await bitacora(lead.id, `Sin novedades de ${o.nombre} después de ${o.seguimientos} seguimientos: la doy por caída`, 'sin_respuesta')
        continue
      }
      const id = await mandar({ leadId: lead.id, ofertaId: o.id, para: [lead.email, o.email], correo: M.seguimiento({ leadId: lead.id, ofertaId: o.id, datos: caso.datos, contraparte: o.nombre, vez: o.seguimientos }), plantilla: 'seguimiento' })
      if (!id) continue
      const siguiente = SEGUIMIENTO_DIAS[o.seguimientos + 1]
      const base = o.presentada_at ? new Date(o.presentada_at) : ahora
      await guardarOferta(o.id, { seguimientos: o.seguimientos + 1, proximo_at: siguiente ? enDias(base, siguiente).toISOString() : enDias(ahora, 14).toISOString() })
    }
  }

  return inf
}
