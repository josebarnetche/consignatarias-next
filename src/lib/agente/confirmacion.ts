/**
 * Doble opt-in de los pedidos que cargó un tercero (MCP o demanda de compra del MCP).
 *
 * Hoy un lead `mcp:…`/`demanda_compra:…` en `needs_review` espera a que José marque
 * "Contacto verificado" en /admin/leads (verificacion.ts). Con esto la verificación
 * la hace la propia persona: le llega UN mail con un link firmado; si confirma, el
 * lead pasa a `new` y el agente lo toma en la corrida siguiente. Si no confirma, no
 * se le escribe nunca más por ese pedido.
 *
 * Reglas (las mismas del agente, sin aflojar nada):
 *  · APAGADO salvo `AGENTE_DOBLE_OPTIN=on`: es un mail hacia afuera, lo prende José.
 *  · Días hábiles 8-19 (horarioHabil), una sola vez por lead, nadie dos veces el
 *    mismo día, BAJA para siempre (el `mandar` del motor filtra agente_bajas) y un
 *    tope diario propio, aparte de los 20 contactos nuevos de las ofertas.
 *  · El link no confirma en el GET (los escáneres de correo abren los links): la
 *    página muestra un botón que hace POST (/api/agente/confirmar).
 *  · El link vence a los DIAS_VIGENCIA de creado el lead.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Correo } from './mensajes'
import { pendienteVerificacion } from './verificacion'
import { DIA_MS, horarioHabil, referencia } from './reglas'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.consignatarias.com.ar'

export const DOBLE_OPTIN_ACTIVO = (process.env.AGENTE_DOBLE_OPTIN ?? 'off').toLowerCase() === 'on'
/** Pedidos de confirmación por día, aparte del tope de ofertas. */
export const MAX_CONFIRMACIONES_DIA = 10
/** Días que vale el link desde que entró el pedido. */
export const DIAS_VIGENCIA = 14
export const PLANTILLA_CONFIRMACION = 'confirmacion'

function secreto(): string {
  return process.env.AGENTE_CONFIRM_SECRET || process.env.API_KEY_PEPPER || ''
}

/** Token del par (lead, mail). Vacío si el servidor no tiene secreto: sin secreto no sale nada. */
export function tokenConfirmacion(leadId: number, email: string): string {
  const s = secreto()
  if (!s) return ''
  return createHmac('sha256', s).update(`confirmar:${leadId}:${email.trim().toLowerCase()}`).digest('base64url').slice(0, 22)
}

export function tokenConfirmacionValido(leadId: number, email: string, token: string | null | undefined): boolean {
  if (!token) return false
  const esperado = tokenConfirmacion(leadId, email)
  if (!esperado || esperado.length !== token.length) return false
  return timingSafeEqual(Buffer.from(esperado), Buffer.from(token))
}

export function urlConfirmacion(leadId: number, email: string, base = APP_URL): string {
  return `${base}/confirmar-pedido?lead=${leadId}&t=${tokenConfirmacion(leadId, email)}`
}

export function vigente(createdAt: string | Date, ahora: Date): boolean {
  return ahora.getTime() - new Date(createdAt).getTime() <= DIAS_VIGENCIA * DIA_MS
}

export interface LeadConfirmable {
  id: number
  intent: string | null
  category: string | null
  head_count: number | null
  province: string | null
  zona: string | null
  name: string | null
  email: string | null
  status: string | null
  source: string | null
  created_at: string
}

function queAsunto(l: LeadConfirmable): string {
  const que = [l.head_count ? `${l.head_count}` : null, l.category ?? 'hacienda'].filter(Boolean).join(' ')
  const donde = [l.zona, l.province].filter(Boolean).join(', ')
  const verbo = l.intent === 'vender' ? 'vender' : l.intent === 'comprar' ? 'comprar' : 'operar'
  return `${verbo} ${que}${donde ? ` en ${donde}` : ''}`
}

export function pedirConfirmacion(l: LeadConfirmable): Correo {
  const que = queAsunto(l)
  return {
    asunto: `¿Pediste ${que}? Confirmá tu pedido · Ref. ${referencia(l.id)}`,
    texto: [
      l.name ? `Hola ${l.name.split(' ')[0]},` : 'Hola,',
      '',
      `Recibimos en consignatarias.com un pedido para ${que} con este correo como contacto. Lo cargó un asistente o una integración, no un formulario del sitio, así que antes de buscar contraparte necesitamos saber que fuiste vos.`,
      '',
      'Si el pedido es tuyo, confirmalo acá (un clic):',
      urlConfirmacion(l.id, l.email ?? ''),
      '',
      'Si no lo pediste, no hagas nada: no te vamos a volver a escribir por este pedido.',
      '',
      'Saludos,',
      'Equipo de consignatarias.com',
      'www.consignatarias.com.ar',
    ].join('\n'),
  }
}

/** ¿A quién se le puede pedir confirmación en esta corrida? Puro: sin base ni red. */
export function elegirParaConfirmar(
  leads: LeadConfirmable[],
  o: { ahora: Date; yaPedidos: Set<number>; escritosHoy: Set<string>; bajas: Set<string>; enviadosHoy: number },
): LeadConfirmable[] {
  if (!horarioHabil(o.ahora)) return []
  const cupo = Math.max(0, MAX_CONFIRMACIONES_DIA - o.enviadosHoy)
  const usados = new Set(o.escritosHoy)
  const out: LeadConfirmable[] = []
  for (const l of leads) {
    if (out.length >= cupo) break
    const email = (l.email ?? '').trim().toLowerCase()
    if (!email || !pendienteVerificacion(l) || o.yaPedidos.has(l.id) || !vigente(l.created_at, o.ahora)) continue
    if (o.bajas.has(email) || usados.has(email)) continue
    usados.add(email)
    out.push(l)
  }
  return out
}

interface Ctx {
  db: SupabaseClient
  ahora: Date
  dryRun: boolean
  bajas: Set<string>
  mandar: (o: { leadId: number; para: string[]; correo: Correo; plantilla: string; conBaja?: boolean }) => Promise<string | null>
  bitacora: (leadId: number, body: string) => Promise<unknown>
  nota: (s: string) => void
}

/** Una pasada: pide confirmación a los pedidos de terceros que nunca la recibieron. */
export async function pedirConfirmaciones(ctx: Ctx, activo = DOBLE_OPTIN_ACTIVO): Promise<void> {
  if (!activo) return
  if (!secreto()) {
    ctx.nota('doble opt-in prendido pero sin AGENTE_CONFIRM_SECRET/API_KEY_PEPPER: no sale nada')
    return
  }
  const { db, ahora } = ctx
  const { data: leads } = await db
    .from('producer_leads')
    .select('id,intent,category,head_count,province,zona,name,email,status,source,created_at')
    .eq('status', 'needs_review')
    .or('source.ilike.mcp:%,source.ilike.demanda_compra:%')
    .order('created_at', { ascending: true })
    .limit(100)
  const lista = (leads ?? []) as LeadConfirmable[]
  if (!lista.length) return

  const desde = new Date(ahora.getTime() - DIA_MS).toISOString()
  const { data: previos } = await db
    .from('agente_mensajes')
    .select('lead_id,para,creado_at,clasificacion')
    .eq('dir', 'out')
    .in('lead_id', lista.map((l) => l.id))
  const yaPedidos = new Set<number>()
  for (const m of previos ?? []) if ((m.clasificacion as { plantilla?: string } | null)?.plantilla === PLANTILLA_CONFIRMACION) yaPedidos.add(m.lead_id as number)
  const { data: hoy } = await db.from('agente_mensajes').select('para,clasificacion').eq('dir', 'out').gte('creado_at', desde)
  const escritosHoy = new Set<string>()
  let enviadosHoy = 0
  for (const m of hoy ?? []) {
    for (const p of String(m.para ?? '').split(/,\s*/)) if (p) escritosHoy.add(p.toLowerCase())
    if ((m.clasificacion as { plantilla?: string } | null)?.plantilla === PLANTILLA_CONFIRMACION) enviadosHoy++
  }

  for (const l of elegirParaConfirmar(lista, { ahora, yaPedidos, escritosHoy, bajas: ctx.bajas, enviadosHoy })) {
    const id = await ctx.mandar({ leadId: l.id, para: [l.email!], correo: pedirConfirmacion(l), plantilla: PLANTILLA_CONFIRMACION, conBaja: true })
    if (id) await ctx.bitacora(l.id, `Se pidió al contacto que confirme el pedido (doble opt-in) a ${l.email}`)
  }
}
