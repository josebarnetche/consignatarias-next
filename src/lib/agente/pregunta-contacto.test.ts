/**
 * La contraparte pregunta (v1.262.2). Caso real del 18-11-2026, con datos inventados:
 * una consignataria contestó una oferta "Comprador buscando: 65 terneros" pidiendo un
 * teléfono, el modelo lo leyó `pregunta` y el motor se lo trasladó al COMPRADOR con
 * "Hola Oferta, Un interesado en tu hacienda pregunta: ...".
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { pidePasarContacto, respondeContactoDirecto, tocaRecordatorioOferta, traePreguntaDeHacienda } from './reglas'
import { cobroCorto, respuestaPideContacto } from './mensajes-contacto'
import * as M from './mensajes'
import { puedeMandarProactivo, type MensajeLog } from './tope'

/* ---------------- detección del pedido de contacto ---------------- */

describe('pidePasarContacto', () => {
  const piden = [
    '¿Pueden pasar un número de teléfono de contacto para comunicarse?',
    'por favor pasar un numero de teléfono para poder comunicarme',
    'Pasame el contacto',
    'Pásenme el WhatsApp del comprador así lo llamamos',
    '¿Me mandan el celular?',
    'Necesito el mail del productor',
    '¿Con quién hablo?',
    'Buenas, con quien me comunico por esta hacienda?',
    '¿Cuál es el teléfono del vendedor?',
    'Podrían facilitarnos los datos de contacto del dueño',
    'Quisiera hablar directamente con el productor',
    '¿Quién es el comprador?',
    'Tendrán un wsp para coordinar?',
  ]
  for (const t of piden) it(`pide contacto: «${t}»`, () => expect(pidePasarContacto(t)).toBe(true))

  const noPiden = [
    '¿Qué peso promedio tienen los terneros?',
    '¿El número de cabezas es fijo o puede variar?',
    '¿Pueden confirmar el número de tropa y el RENSPA?',
    'Les paso nuestra cotización por mail mañana',
    'Les mando un mail con la propuesta',
    '¿Están vacunados contra aftosa?',
    'Quedo en contacto, gracias',
  ]
  for (const t of noPiden) it(`no pide contacto: «${t}»`, () => expect(pidePasarContacto(t)).toBe(false))
})

describe('respondeContactoDirecto', () => {
  const t = '¿Pueden pasar un número de teléfono de contacto para comunicarse?'
  it('pregunta u "otro" con pedido de contacto: se contesta a la firma', () => {
    expect(respondeContactoDirecto({ tipo: 'pregunta' }, t)).toBe(true)
    expect(respondeContactoDirecto({ tipo: 'otro', motivo: 'sin modelo' }, t)).toBe(true)
  })
  it('lo que José debe ver sigue escalando: comisión, tema legal, el modelo pidió escalar', () => {
    expect(respondeContactoDirecto({ tipo: 'pregunta' }, `${t} ¿La comisión del 1% es negociable?`)).toBe(false)
    expect(respondeContactoDirecto({ tipo: 'pregunta' }, `${t} Lo consulto con mi abogado`)).toBe(false)
    expect(respondeContactoDirecto({ tipo: 'pregunta', escalar: true }, t)).toBe(false)
  })
  it('un ACEPTO, un rechazo o una pregunta de hacienda no son pedidos de contacto', () => {
    expect(respondeContactoDirecto({ tipo: 'acepta' }, 'ACEPTO, pasame el teléfono')).toBe(false)
    expect(respondeContactoDirecto({ tipo: 'rechaza' }, 'no, gracias')).toBe(false)
    expect(respondeContactoDirecto({ tipo: 'pregunta' }, '¿Qué peso tienen?')).toBe(false)
  })
  it('pedido mixto: se detecta la pregunta de hacienda para que José la vea', () => {
    expect(traePreguntaDeHacienda('Pasame el teléfono. ¿Qué peso tienen?')).toBe(true)
    expect(traePreguntaDeHacienda('por favor pasar un numero de teléfono para poder comunicarme')).toBe(false)
  })
})

/* ---------------- la respuesta a la firma ---------------- */

const datosCompra = { cabezas: 65, categoria: 'terneros', zona: 'Localidad Ejemplo', provincia: 'Provincia Ejemplo' }

describe('respuestaPideContacto', () => {
  it('modo éxito: el texto acordado, con el cobro de cobroCorto', () => {
    const c = respuestaPideContacto({ leadId: 50, ofertaId: 90, lado: 'compra', datos: datosCompra, modo: 'exito' })
    expect(c.texto).toContain(
      'Para pasarles el contacto directo del comprador, respondan ACEPTO a este correo (servicio de contacto: 1% del bruto solo si la operación se concreta). Apenas llegue, se lo enviamos.',
    )
    expect(c.asunto).toBe('Re: Comprador buscando: 65 terneros en Localidad Ejemplo, Provincia Ejemplo · Ref. C-50-90')
  })
  it('modo tarifa: la condición sale del mismo helper (un solo lugar)', () => {
    const c = respuestaPideContacto({ leadId: 50, ofertaId: 90, lado: 'vende', datos: datosCompra, modo: 'tarifa', tarifaArs: 45_000 })
    expect(c.texto).toContain(`(${cobroCorto('tarifa', 45_000)})`)
    expect(c.texto).toContain('del vendedor')
    expect(c.asunto).toMatch(/^Re: Hacienda disponible/)
  })
  it('no negocia ni promete nada más', () => {
    const c = respuestaPideContacto({ leadId: 50, ofertaId: 90, lado: 'compra', datos: datosCompra, modo: 'exito' })
    expect(c.texto).not.toMatch(/negoci|descuento|rebaj/i)
  })
  it('es una respuesta en el hilo: el tope diario la deja salir (escribió después de la oferta)', () => {
    const ahora = new Date('2026-11-18T15:00:00Z')
    const log: MensajeLog[] = [
      { dir: 'out', de: 'agente@x.test', para: 'ventas@firma-ejemplo.test', lead_id: 50, creado_at: '2026-11-18T12:00:00Z' },
      { dir: 'in', de: 'ventas@firma-ejemplo.test', para: 'agente@x.test', lead_id: 50, creado_at: '2026-11-18T14:59:00Z' },
    ]
    const v = puedeMandarProactivo('ventas@firma-ejemplo.test', log, 'respuesta_contacto', { ahora, leadId: 50 })
    expect(v).toMatchObject({ ok: true, por: 'respuesta' })
    // Sin haber escrito, el mismo correo esperaría: no es un pase libre.
    expect(puedeMandarProactivo('ventas@firma-ejemplo.test', log.slice(0, 1), 'respuesta_contacto', { ahora, leadId: 50 }).ok).toBe(false)
  })
})

/* ---------------- saludo y traslado al lead ---------------- */

describe('saludo: un rótulo no es un nombre', () => {
  it('"Oferta por lote" (OfertaLote.tsx) no saluda "Hola Oferta"', () => {
    const c = M.traslado({ leadId: 50, ofertaId: 90, datos: datosCompra, aQuien: 'productor', nombre: 'Oferta por lote', pregunta: '¿Qué peso tienen?', lado: 'compra', tipo: 'firma' })
    expect(c.texto).not.toMatch(/Oferta/)
    expect(c.texto.startsWith('Hola,')).toBe(true)
    for (const rotulo of ['Oferta', 'Consulta web', 'Comprador', 'Sin nombre', 'Lead MCP']) expect(M.nombrePila(rotulo)).toBe('')
    expect(M.nombrePila('juana pérez')).toBe('Juana')
  })
  it('la presentación tampoco muestra el rótulo como nombre del productor', () => {
    const c = M.presentacion({ leadId: 50, ofertaId: 90, lado: 'compra', datos: datosCompra, productor: { nombre: 'Oferta por lote', email: 'comprador@ejemplo.test', phone: null }, contraparte: { tipo: 'firma', nombre: 'Firma Ejemplo SA', email: 'ventas@firma-ejemplo.test' } })
    expect(c.texto).not.toContain('Oferta por lote')
    expect(c.texto).toContain('comprador@ejemplo.test')
  })
})

describe('traslado al lead: comprador o vendedor', () => {
  const t = (lado: 'vende' | 'compra', tipo?: 'firma' | 'frigorifico' | 'lead') =>
    M.traslado({ leadId: 50, ofertaId: 90, datos: datosCompra, aQuien: 'productor', nombre: 'Juana', pregunta: '¿Qué peso tienen?', lado, tipo }).texto
  it('al comprador: quien puede cubrir su pedido, no "interesado en tu hacienda"', () => {
    expect(t('compra', 'firma')).toContain('Una consignataria que puede cubrir tu pedido pregunta:')
    expect(t('compra', 'frigorifico')).toContain('Un frigorífico que puede cubrir tu pedido pregunta:')
    expect(t('compra', 'firma')).not.toContain('tu hacienda')
  })
  it('al vendedor: interesado en su hacienda', () => {
    expect(t('vende', 'firma')).toContain('Una consignataria interesada en tu hacienda pregunta:')
    expect(t('vende')).toContain('Un interesado en tu hacienda pregunta:')
  })
  it('la vuelta a la contraparte nombra al comprador cuando el lead compra', () => {
    const c = M.traslado({ leadId: 50, ofertaId: 90, datos: datosCompra, aQuien: 'contraparte', nombre: null, pregunta: 'Pesan 180 kg', lado: 'compra', tipo: 'firma' })
    expect(c.texto).toContain('Le trasladamos su consulta al comprador')
  })
})

/* ---------------- recordatorio genérico en pausa ---------------- */

describe('tocaRecordatorioOferta', () => {
  const ahora = new Date('2026-11-25T15:00:00Z')
  it('a los 7 días sin respuesta toca el recordatorio', () => {
    expect(tocaRecordatorioOferta({ seguimientos: 0, enviada_at: '2026-11-18T12:00:00Z', respondida_at: null }, ahora)).toBe(true)
  })
  it('si la contraparte ya contestó (pregunta, pedido de contacto), no hay "les reenvío la consulta"', () => {
    expect(tocaRecordatorioOferta({ seguimientos: 0, enviada_at: '2026-11-18T12:00:00Z', respondida_at: '2026-11-18T15:00:00Z' }, ahora)).toBe(false)
  })
})

/* ---------------- el motor de punta a punta (base falsa en memoria) ---------------- */

const enviados: { para: string[]; asunto: string; texto: string }[] = []
let entrante: { texto: string; tipo: string } = { texto: '', tipo: 'pregunta' }

vi.mock('./correo', () => ({
  CASILLA: 'agente@x.test',
  enviar: vi.fn(async (o: { para: string[]; correo: { asunto: string; texto: string } }) => {
    enviados.push({ para: o.para, asunto: o.correo.asunto, texto: o.correo.texto })
    return { ok: true, messageId: `<out-${enviados.length}@x.test>` }
  }),
  leerBandeja: vi.fn(async (procesar: (m: unknown) => Promise<void>) => {
    await procesar({
      messageId: '<in-1@firma-ejemplo.test>',
      inReplyTo: null,
      references: [],
      de: 'ventas@firma-ejemplo.test',
      asunto: 'Re: Comprador buscando: 65 terneros · Ref. C-50-90',
      texto: entrante.texto,
      headers: {},
    })
    return { leidos: 1, errores: [] }
  }),
}))
vi.mock('./ia', () => ({
  triageLead: vi.fn(async () => null),
  leerRespuesta: vi.fn(async () => ({ tipo: entrante.tipo, escalar: false, motivo: 'test', pregunta: entrante.texto, datos: null, cierre: null })),
}))
vi.mock('./dominios', () => ({ crearChequeoMx: () => async () => true }))
vi.mock('@/lib/featured', () => ({ getFeaturedSlugs: async () => new Set<string>() }))

type Fila = Record<string, unknown>
/** Una base en memoria con lo que usa el motor: filtros reales, sin red. */
function baseFalsa(tablas: Record<string, Fila[]>) {
  const rows = (t: string) => (tablas[t] ??= [])
  const from = (t: string) => {
    const filtros: ((r: Fila) => boolean)[] = []
    let op: { tipo: 'select' | 'update' | 'insert' | 'delete' | 'upsert'; val?: Fila | Fila[] } = { tipo: 'select' }
    let lim = Infinity
    const run = () => {
      if (op.tipo === 'insert' || op.tipo === 'upsert') {
        const nuevas = (Array.isArray(op.val) ? op.val : [op.val!]).map((v, i) => ({ id: rows(t).length + 1000 + i, ...v }))
        rows(t).push(...nuevas)
        return nuevas
      }
      const hit = rows(t).filter((r) => filtros.every((f) => f(r)))
      if (op.tipo === 'update') for (const r of hit) Object.assign(r, op.val)
      if (op.tipo === 'delete') tablas[t] = rows(t).filter((r) => !hit.includes(r))
      return hit.slice(0, lim)
    }
    const q: Record<string, unknown> = {
      select: () => q,
      insert: (v: Fila | Fila[]) => ((op = { tipo: 'insert', val: v }), q),
      upsert: (v: Fila) => ((op = { tipo: 'upsert', val: v }), q),
      update: (v: Fila) => ((op = { tipo: 'update', val: v }), q),
      delete: () => ((op = { tipo: 'delete' }), q),
      eq: (c: string, v: unknown) => (filtros.push((r) => r[c] === v), q),
      neq: (c: string, v: unknown) => (filtros.push((r) => r[c] !== v), q),
      in: (c: string, v: unknown[]) => (filtros.push((r) => v.includes(r[c])), q),
      gte: (c: string, v: string) => (filtros.push((r) => String(r[c] ?? '') >= v), q),
      gt: (c: string, v: string) => (filtros.push((r) => String(r[c] ?? '') > v), q),
      lte: (c: string, v: string) => (filtros.push((r) => String(r[c] ?? '') <= v), q),
      ilike: (c: string, v: string) => (filtros.push((r) => String(r[c] ?? '').toLowerCase() === v.toLowerCase()), q),
      not: (c: string) => (filtros.push((r) => r[c] != null), q),
      or: () => q,
      order: () => q,
      limit: (n: number) => ((lim = n), q),
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      single: async () => ({ data: run()[0] ?? null, error: null }),
      then: (res: (v: { data: Fila[]; error: null; count: number }) => unknown) => {
        const data = run()
        return Promise.resolve({ data, error: null, count: data.length }).then(res)
      },
    }
    return q
  }
  return { from, rpc: async () => ({ data: true, error: null }) } as unknown as SupabaseClient
}

function tablasCaso50(): Record<string, Fila[]> {
  return {
    producer_leads: [{ id: 50, intent: 'comprar', category: 'terneros', head_count: 65, province: 'Provincia Ejemplo', zona: 'Localidad Ejemplo', name: 'Oferta por lote', email: 'comprador@ejemplo.test', phone: '+54 9 000 1234567', message: null, source: 'lote:demo', desired_price_ars: null, status: 'new' }],
    agente_casos: [{ lead_id: 50, lado: 'compra', estado: 'ofreciendo', datos: datosCompra, recordatorios: 0, tandas: 1, proximo_at: '2026-12-01T12:00:00Z', motivo: null }],
    agente_ofertas: [{ id: 90, lead_id: 50, tipo: 'firma', ref: 'firma-ejemplo', nombre: 'Firma Ejemplo SA', email: 'ventas@firma-ejemplo.test', estado: 'enviada', seguimientos: 0, enviada_at: '2026-11-18T12:00:00Z', presentada_at: null, proximo_at: null, respondida_at: null }],
    agente_mensajes: [],
    agente_bajas: [],
    demanda_compra: [],
    lead_activity: [],
  }
}

describe('motor: la firma pregunta (sábado 12 h: lee la bandeja, no ofrece)', () => {
  // Sábado 21-11-2026 12:00 AR: horario de respuesta sí, hábil no (no sale ninguna oferta nueva).
  const ahora = new Date('2026-11-21T15:00:00Z')
  let correrAgente: typeof import('./motor').correrAgente
  // El motor importa medio sitio: se carga una vez, fuera del tiempo de cada test.
  beforeAll(async () => {
    correrAgente = (await import('./motor')).correrAgente
  }, 60_000)
  beforeEach(() => {
    enviados.length = 0
    process.env.AGENTE_IMAP_PASSWORD = 'test'
  })

  it('pide un teléfono: la respuesta va a la firma y al lead no le llega nada', async () => {
    entrante = { texto: 'Buenas, por favor pasar un numero de teléfono para poder comunicarme', tipo: 'pregunta' }
    const tablas = tablasCaso50()
    await correrAgente(baseFalsa(tablas), { ahora })
    const alLead = enviados.filter((e) => e.para.includes('comprador@ejemplo.test'))
    const aLaFirma = enviados.filter((e) => e.para.includes('ventas@firma-ejemplo.test'))
    expect(alLead).toHaveLength(0)
    expect(aLaFirma).toHaveLength(1)
    expect(aLaFirma[0].texto).toContain('Para pasarles el contacto directo del comprador, respondan ACEPTO')
    // Nada del lead viaja en la respuesta, y la oferta sigue esperando el ACEPTO.
    expect(aLaFirma[0].texto).not.toContain('comprador@ejemplo.test')
    expect(aLaFirma[0].texto).not.toContain('1234567')
    const of = tablas.agente_ofertas[0]
    expect(of.estado).toBe('enviada')
    expect(of.respondida_at).toBeTruthy()
    const salida = tablas.agente_mensajes.find((r) => r.dir === 'out')
    expect(salida?.clasificacion).toEqual({ plantilla: 'respuesta_contacto' })
    expect(salida?.in_reply_to).toBe('<in-1@firma-ejemplo.test>')
  })

  it('una pregunta de hacienda sí se traslada al comprador, sin "Hola Oferta" y con su lado', async () => {
    entrante = { texto: '¿Qué peso promedio tienen los terneros?', tipo: 'pregunta' }
    const tablas = tablasCaso50()
    await correrAgente(baseFalsa(tablas), { ahora })
    const alLead = enviados.filter((e) => e.para.includes('comprador@ejemplo.test'))
    expect(alLead).toHaveLength(1)
    expect(alLead[0].texto).not.toMatch(/Hola Oferta/)
    expect(alLead[0].texto).toContain('Una consignataria que puede cubrir tu pedido pregunta:')
    expect(enviados.filter((e) => e.para.includes('ventas@firma-ejemplo.test'))).toHaveLength(0)
  })
})
