/**
 * Prospectos PRO: qué firma está más cerca de pagar y qué decirle.
 *
 * Puro (sin base): recibe las métricas ya medidas y devuelve el puntaje, los
 * motivos y el correo redactado. La carga vive en `datos.ts`.
 *
 * Reglas de esta pieza:
 *  - Toda cifra del correo sale de una métrica medida. Una métrica `null` (no se
 *    pudo medir) NO aparece en el correo: nunca un cero inventado.
 *  - El correo NO se manda solo. Lo manda un admin con un clic y sólo si
 *    `PRO_PROSPECTOS_ENVIO=on` está en Vercel (ver `envioHabilitado`).
 *  - Nada de datos personales de productores: la demanda va agregada (cuántos
 *    pedidos, qué categorías, qué provincias).
 */
import { distanciaProvincia } from '@/lib/agente/contrapartes'

export const PRECIO_PRO_ARS = 45_000
/** Días entre dos correos de este tipo a la misma firma. */
export const COOLDOWN_DIAS = 30
/** Tipo con el que se registra el envío en outreach_log. */
export const TIPO_OUTREACH = 'pro_informe_ficha'

/** El interruptor: apagado salvo que alguien lo encienda a propósito en Vercel. */
export function envioHabilitado(env: Record<string, string | undefined> = process.env): boolean {
  return (env.PRO_PROSPECTOS_ENVIO ?? '').trim().toLowerCase() === 'on'
}

/** Un pedido de hacienda (lead de productor o caso del agente), sin datos personales. */
export interface PedidoZona {
  provincia: string | null
  lado: 'vende' | 'compra'
  categoria: string | null
  cabezas: number | null
}

/** Una operación que el agente le ofreció a una firma PRO. */
export interface OfertaAPro {
  provincia: string | null
  lado: 'vende' | 'compra'
  categoria: string | null
  cabezas: number | null
}

export interface MetricasFirma {
  slug: string
  nombre: string
  provincia: string | null
  email: string | null
  telefono: string | null
  verificada: boolean
  reclamada: boolean
  /** Visitas a la ficha (todas las variantes del slug). null = no se pudo medir. */
  vistas30: number | null
  vistasPrevias30: number | null
  /** En cuántos días distintos de los últimos 30 hubo al menos una visita. */
  diasConVisitas30: number | null
  /** Visitas del día con más visitas de los últimos 30. */
  maxDia30: number | null
  /** Impresiones en Google de la ficha, últimos 28 días (gsc_fichas). */
  googleImpresiones28: number | null
  rematesProximos: number
  /** Correos automáticos que ya recibió (outreach_log) y cuántos contestó. */
  correosPrevios: number
  respuestasPrevias: number
  ultimoCorreo: string | null
  /** Ya recibió ESTE informe dentro del cooldown. */
  informeReciente: boolean
  dadaDeBaja: boolean
}

export interface ContextoZona {
  /** Pedidos de productores de los últimos 30 días, de todo el país. */
  pedidos30: PedidoZona[]
  /** Ofertas que el agente mandó a firmas PRO desde que existe. */
  ofertasAPro: OfertaAPro[]
  /** Casos vivos del agente (con cabezas ≥ mínimo) que hoy buscan contraparte. */
  casosVivos: PedidoZona[]
}

export interface Prospecto {
  m: MetricasFirma
  puntaje: number
  motivos: string[]
  alertas: string[]
  /** Demanda medida en su provincia y limítrofes. */
  zona: {
    pedidos30: number
    pedidosProvincia30: number
    casosVivos: PedidoZona[]
    ofertasAPro: number
  }
  canal: 'mail' | 'telefono' | 'ninguno'
}

const cerca = (a: string | null, b: string | null) => distanciaProvincia(a, b) !== null

/**
 * Puntaje explicable. Pesa más la CONSTANCIA (días distintos con visitas) que el
 * volumen: un solo celular que recarga la ficha 40 veces en una tarde no es un
 * mercado mirándola. El volumen cuenta, pero topeado a 3 visitas por día con visitas.
 */
export function puntuar(m: MetricasFirma, ctx: ContextoZona): Prospecto {
  const motivos: string[] = []
  const alertas: string[] = []
  let puntaje = 0

  const dias = m.diasConVisitas30 ?? 0
  const vistas = m.vistas30 ?? 0
  if (m.vistas30 != null && m.diasConVisitas30 != null) {
    puntaje += dias * 3 + Math.min(vistas, dias * 3)
    if (vistas > 0) motivos.push(`${vistas} visitas a la ficha en 30 días, en ${dias} días distintos`)
  }
  const pico = m.maxDia30 != null && vistas >= 10 && m.maxDia30 > vistas / 2
  if (pico) alertas.push(`${m.maxDia30} de las ${vistas} visitas fueron en un solo día: puede ser una sola persona`)
  // Una suba que es un solo pico no es tendencia.
  if (!pico && m.vistas30 != null && m.vistasPrevias30 != null && m.vistasPrevias30 > 0 && m.vistas30 >= m.vistasPrevias30 * 1.2) {
    puntaje += 5
    motivos.push(`subiendo: ${m.vistasPrevias30} → ${m.vistas30} visitas mes contra mes`)
  }
  if (m.googleImpresiones28 != null && m.googleImpresiones28 > 0) {
    puntaje += Math.min(10, Math.round(m.googleImpresiones28 / 50))
    motivos.push(`${m.googleImpresiones28.toLocaleString('es-AR')} apariciones en Google (28 días)`)
  }

  const pedidosZona = ctx.pedidos30.filter((p) => cerca(m.provincia, p.provincia))
  const pedidosProvincia = pedidosZona.filter((p) => distanciaProvincia(m.provincia, p.provincia) === 0)
  const casosZona = ctx.casosVivos.filter((p) => cerca(m.provincia, p.provincia))
  const ofertasZona = ctx.ofertasAPro.filter((o) => cerca(m.provincia, o.provincia))
  puntaje += pedidosProvincia.length * 4 + (pedidosZona.length - pedidosProvincia.length) * 2 + casosZona.length * 6
  if (pedidosZona.length) motivos.push(`${pedidosZona.length} pedidos de hacienda en su zona (30 días)`)
  if (casosZona.length) motivos.push(`${casosZona.length} operaciones abiertas del agente en su zona`)

  if (m.rematesProximos > 0) {
    puntaje += Math.min(10, m.rematesProximos * 2)
    motivos.push(`${m.rematesProximos} ${m.rematesProximos === 1 ? 'remate próximo publicado' : 'remates próximos publicados'}`)
  }
  if (m.verificada || m.reclamada) {
    puntaje += 5
    motivos.push(m.reclamada ? 'reclamó su ficha' : 'ficha verificada')
  }

  const canal: Prospecto['canal'] = m.email ? 'mail' : m.telefono ? 'telefono' : 'ninguno'
  if (canal !== 'mail') puntaje = Math.round(puntaje / 2)
  if (m.correosPrevios >= 3 && m.respuestasPrevias === 0) {
    alertas.push(`recibió ${m.correosPrevios} correos automáticos y no contestó ninguno: mejor llamar`)
  }
  if (m.dadaDeBaja) alertas.push('se dio de baja de los correos: sólo por teléfono')

  return {
    m,
    puntaje,
    motivos,
    alertas,
    zona: { pedidos30: pedidosZona.length, pedidosProvincia30: pedidosProvincia.length, casosVivos: casosZona, ofertasAPro: ofertasZona.length },
    canal,
  }
}

export function ordenar(ps: Prospecto[]): Prospecto[] {
  return [...ps].sort((a, b) => b.puntaje - a.puntaje || (b.m.vistas30 ?? 0) - (a.m.vistas30 ?? 0) || a.m.nombre.localeCompare(b.m.nombre, 'es'))
}

const nf = (n: number) => n.toLocaleString('es-AR')

function resumenPedido(p: PedidoZona): string {
  const cab = p.cabezas ? `${nf(p.cabezas)} ` : ''
  const cat = (p.categoria ?? 'hacienda').toLowerCase()
  const donde = p.provincia ? ` en ${p.provincia}` : ''
  return `${p.lado === 'compra' ? 'compra de' : 'venta de'} ${cab}${cat}${donde}`
}

export interface InformeRedactado {
  asunto: string
  /** Párrafos de texto plano; el HTML lo arma email.ts. */
  parrafos: string[]
  /** Viñetas con los números del mes. */
  numeros: string[]
  enlaceActivar: string
  enlacePropuesta: string | null
}

/**
 * El informe que se le manda a la firma: sus números, la demanda de su zona y lo
 * que PRO le habría dado. Voz de José, sin adjetivos sobre los números.
 */
export function redactarInforme(p: Prospecto, ctx: { appUrl: string; urlPropuesta: string | null; hoy: string }): InformeRedactado {
  const { m, zona } = p
  const numeros: string[] = []
  if (m.vistas30 != null && m.vistas30 > 0) {
    numeros.push(
      m.diasConVisitas30 != null
        ? `${nf(m.vistas30)} visitas a la ficha de ${m.nombre}, en ${m.diasConVisitas30} días distintos.`
        : `${nf(m.vistas30)} visitas a la ficha de ${m.nombre}.`,
    )
  }
  if (m.googleImpresiones28 != null && m.googleImpresiones28 > 0) {
    numeros.push(`${nf(m.googleImpresiones28)} veces que la ficha apareció en Google (últimos 28 días).`)
  }
  if (zona.pedidos30 > 0) {
    numeros.push(`${nf(zona.pedidos30)} pedidos para comprar o vender hacienda que entraron al sitio desde ${m.provincia ?? 'su zona'} y provincias vecinas.`)
  }
  if (m.rematesProximos > 0) {
    numeros.push(`${nf(m.rematesProximos)} ${m.rematesProximos === 1 ? 'remate próximo publicado' : 'remates próximos publicados'} en el calendario.`)
  }

  const parrafos: string[] = []
  parrafos.push(`Hola, equipo de ${m.nombre}:`)
  parrafos.push('Les escribo de consignatarias.com.ar con los números de su ficha en los últimos 30 días. Salen de nuestra base, no son estimaciones:')

  const agente =
    zona.casosVivos.length > 0
      ? `Hoy hay ${zona.casosVivos.length === 1 ? 'una operación abierta' : `${zona.casosVivos.length} operaciones abiertas`} en su zona buscando contraparte (${zona.casosVivos
          .slice(0, 3)
          .map(resumenPedido)
          .join('; ')}). Esas operaciones se les ofrecen primero a las firmas PRO.`
      : 'Desde octubre, las operaciones de hacienda que entran por el sitio se les ofrecen primero a las firmas PRO de la zona.'
  parrafos.push(
    `${agente} Si la firma acepta el contacto y la operación se concreta, cobramos el 1%; si no, nada. ${m.nombre} hoy no las recibe porque no es PRO.`,
  )
  parrafos.push(
    `PRO cuesta ARS ${nf(PRECIO_PRO_ARS)} por mes y se cancela cuando quieran. Además de las operaciones, la firma va primera en el directorio y en el calendario, sus remates salen primeros en el newsletter semanal y las consultas de productores le llegan con nombre y contacto.`,
  )
  if (ctx.urlPropuesta) parrafos.push(`Armamos la propuesta con los datos de ${m.nombre}: ${ctx.urlPropuesta}`)
  parrafos.push(`Para activarlo: ${ctx.appUrl}/consignatarias/${m.slug}/activar`)
  parrafos.push('Si prefieren hablarlo, respondan este correo y los llamo.')
  parrafos.push('Saludos,\nJosé Barnetche — consignatarias.com.ar')

  const asunto =
    m.vistas30 != null && m.vistas30 > 0
      ? `${m.nombre}: ${nf(m.vistas30)} visitas a su ficha en 30 días`
      : `${m.nombre}: los números de su ficha en consignatarias.com.ar`

  return {
    asunto,
    parrafos,
    numeros,
    enlaceActivar: `${ctx.appUrl}/consignatarias/${m.slug}/activar`,
    enlacePropuesta: ctx.urlPropuesta,
  }
}

/** El mismo informe en texto plano (para copiar o para la parte text/plain). */
export function informeTexto(i: InformeRedactado): string {
  const [saludo, intro, ...resto] = i.parrafos
  return [saludo, intro, i.numeros.map((n) => `• ${n}`).join('\n'), ...resto].filter(Boolean).join('\n\n')
}

/** Guion corto para WhatsApp, para la firma que no contesta mails. */
export function guionWhatsapp(p: Prospecto): string {
  const partes = [`Hola, les escribo de consignatarias.com.ar.`]
  if (p.m.vistas30) partes.push(`La ficha de ${p.m.nombre} tuvo ${nf(p.m.vistas30)} visitas en los últimos 30 días.`)
  if (p.zona.casosVivos.length) partes.push(`Hoy hay ${p.zona.casosVivos.length} operaciones de hacienda abiertas en su zona que se les ofrecen a las firmas PRO.`)
  partes.push('¿Les puedo contar en 5 minutos cómo funciona?')
  return partes.join(' ')
}
