import { describe, expect, it } from 'vitest'
import {
  brutoDeCierre,
  comisionArs,
  comprometePrecio,
  debeEscalar,
  esAutomatica,
  esRemitenteSistema,
  faltantes,
  filtraContacto,
  horarioHabil,
  leerReferencia,
  pareceAceptacion,
  pareceBaja,
  referencia,
  sinCita,
  unirDatos,
  vaAFaena,
} from './reglas'
import { distanciaProvincia, elegirContrapartes, type Candidato } from './contrapartes'
import * as M from './mensajes'
import { categoriaDemanda, leadDeDemanda, provinciaDemanda } from './demanda'
import { armarTablero, comisionEstimada, proximoPaso, type CasoFila, type OfertaFila } from './tablero'

const productor = { name: 'Juan Pérez Gorostiaga', email: 'juanpg@gmail.com', phone: '+54 9 2923 445566' }
const datos = { cabezas: 40, categoria: 'novillos', zona: 'Saavedra', provincia: 'Buenos Aires', peso_kg: 420 }

describe('reglas', () => {
  it('pide cabezas, categoría y zona antes de ofrecer', () => {
    expect(faltantes({})).toEqual(['cabezas', 'categoria', 'zona'])
    expect(faltantes(datos)).toEqual([])
    expect(faltantes({ cabezas: 10, categoria: 'vacas', provincia: 'Chaco' })).toEqual([])
  })

  it('une datos sin pisar lo conocido con vacíos', () => {
    expect(unirDatos({ cabezas: 40, zona: 'Saavedra' }, { cabezas: null, zona: '', categoria: 'vacas' })).toEqual({ cabezas: 40, zona: 'Saavedra', categoria: 'vacas' })
  })

  it('la invernada no va a frigorífico; el gordo sí', () => {
    expect(vaAFaena('novillos')).toBe(true)
    expect(vaAFaena('vacas')).toBe(true)
    expect(vaAFaena('terneros')).toBe(false)
    expect(vaAFaena('Terneros invernada')).toBe(false)
    expect(vaAFaena(null)).toBe(false)
  })

  it('comisión del 1% sobre el bruto', () => {
    expect(comisionArs(73_960_000)).toBe(739_600)
    expect(brutoDeCierre({ cabezas: 40, peso_kg: 430, precio_kg: 4300 })).toBe(73_960_000)
    expect(brutoDeCierre({ bruto_ars: 1000 })).toBe(1000)
    expect(brutoDeCierre({ cabezas: 40 })).toBeNull()
  })

  it('ACEPTO y BAJA se reconocen sin modelo', () => {
    expect(pareceAceptacion('ACEPTO\n\nSaludos')).toBe(true)
    expect(pareceAceptacion('Sí, acepto. Pasame el contacto')).toBe(true)
    expect(pareceAceptacion('No acepto')).toBe(false)
    expect(pareceBaja('BAJA')).toBe(true)
    expect(pareceBaja('no me escriban más')).toBe(true)
    expect(pareceBaja('Me interesa, ¿qué peso tienen?')).toBe(false)
  })

  it('escala lo legal y la negociación de comisión', () => {
    expect(debeEscalar({ tipo: 'acepta' }, 'ACEPTO')).toBe(false)
    expect(debeEscalar({ tipo: 'otro' }, 'hola')).toBe(true)
    expect(debeEscalar({ tipo: 'rechaza' }, 'esto es una estafa, llamo a mi abogado')).toBe(true)
    expect(debeEscalar({ tipo: 'pregunta' }, '¿la comisión se puede bajar?')).toBe(true)
    expect(debeEscalar({ tipo: 'pregunta' }, '¿qué peso tienen?')).toBe(false)
  })

  it('reconoce respuestas automáticas', () => {
    expect(esAutomatica('Respuesta automática: fuera de la oficina', '')).toBe(true)
    expect(esAutomatica('Re: Hacienda', 'ok', { 'auto-submitted': 'auto-replied' })).toBe(true)
    expect(esAutomatica('Re: Hacienda', 'ACEPTO')).toBe(false)
  })

  it('reconoce remitentes de sistemas', () => {
    expect(esRemitenteSistema('team@email.hostinger.com')).toBe(true)
    expect(esRemitenteSistema('no-reply@algo.com')).toBe(true)
    expect(esRemitenteSistema('hacienda@frigorifico.com.ar')).toBe(false)
    expect(esRemitenteSistema('juanpg@gmail.com')).toBe(false)
  })

  it('separa lo escrito de la cita', () => {
    expect(sinCita('ACEPTO\n\nEl lun, 19 oct 2026 a las 10:00, Consignatarias escribió:\n> Hacienda')).toBe('ACEPTO')
    expect(sinCita('Tengo 40\n> cita')).toBe('Tengo 40')
  })

  it('la referencia del asunto ida y vuelta', () => {
    expect(leerReferencia(`Re: Hacienda disponible · Ref. ${referencia(12, 34)}`)).toEqual({ leadId: 12, ofertaId: 34 })
    expect(leerReferencia('RE: algo Ref. C-7')).toEqual({ leadId: 7, ofertaId: null })
    expect(leerReferencia('sin ref')).toBeNull()
  })

  it('horario hábil argentino', () => {
    expect(horarioHabil(new Date('2026-10-19T13:00:00Z'))).toBe(true) // lunes 10 ART
    expect(horarioHabil(new Date('2026-10-19T23:30:00Z'))).toBe(false) // lunes 20:30 ART
    expect(horarioHabil(new Date('2026-10-18T13:00:00Z'))).toBe(false) // domingo
  })

  it('detecta datos del productor y promesas de precio', () => {
    expect(filtraContacto('escribile a juanpg@gmail.com', productor)).toMatch(/mail/)
    expect(filtraContacto('llamalo al 2923-445566', productor)).toMatch(/teléfono/)
    expect(filtraContacto('el señor Gorostiaga tiene', productor)).toMatch(/nombre/)
    expect(filtraContacto('40 novillos en Saavedra', productor)).toBeNull()
    expect(comprometePrecio('cerramos a $4300 el kilo')).toBe(true)
    expect(comprometePrecio('el productor pretende $4300/kg')).toBe(false)
  })
})

describe('contrapartes', () => {
  const frig = (ref: string, provincia: string, extra: Partial<Candidato> = {}): Candidato => ({ tipo: 'frigorifico', ref, nombre: ref, email: `${ref}@f.com`, provincia, ...extra })

  it('provincia y limítrofes', () => {
    expect(distanciaProvincia('Buenos Aires', 'BUENOS AIRES')).toBe(0)
    expect(distanciaProvincia('Entre Ríos', 'CORRIENTES')).toBe(1)
    expect(distanciaProvincia('Misiones', 'MENDOZA')).toBeNull()
    expect(distanciaProvincia('Ciudad Autónoma de Buenos Aires', 'Buenos Aires')).toBe(1)
  })

  it('no ofrece a plantas que no faenan bovinos, ni lejos, ni dos veces', () => {
    const candidatos = [
      frig('lejos', 'MENDOZA'),
      frig('porcino', 'BUENOS AIRES', { notas: 'PORCINO, no bovino' }),
      frig('suspendida', 'BUENOS AIRES', { faenaBovina: false }),
      frig('cerrada', 'BUENOS AIRES', { opera: false }),
      frig('ya', 'BUENOS AIRES'),
      frig('limitrofe', 'LA PAMPA'),
      frig('local', 'BUENOS AIRES'),
      { tipo: 'lead', ref: '9', nombre: 'x', email: 'comprador@x.com', provincia: 'Córdoba', categoria: 'novillos' } as Candidato,
    ]
    const r = elegirContrapartes({ lado: 'vende', datos, candidatos, yaConsultados: new Set(['frigorifico:ya']), bajas: new Set(), cuantos: 5 })
    expect(r.map((c) => c.ref)).toEqual(['local', '9', 'limitrofe'])
  })

  it('la invernada y los pedidos de compra no van a frigoríficos', () => {
    const candidatos = [frig('local', 'BUENOS AIRES'), { tipo: 'firma', ref: 'f', nombre: 'F', email: 'f@f.com', provincia: 'Buenos Aires' } as Candidato]
    expect(elegirContrapartes({ lado: 'vende', datos: { ...datos, categoria: 'terneros' }, candidatos, yaConsultados: new Set(), bajas: new Set(), cuantos: 3 }).map((c) => c.ref)).toEqual(['f'])
    expect(elegirContrapartes({ lado: 'compra', datos, candidatos, yaConsultados: new Set(), bajas: new Set(), cuantos: 3 }).map((c) => c.ref)).toEqual(['f'])
  })

  it('respeta las bajas', () => {
    const r = elegirContrapartes({ lado: 'vende', datos, candidatos: [frig('local', 'BUENOS AIRES')], yaConsultados: new Set(), bajas: new Set(['local@f.com']), cuantos: 3 })
    expect(r).toEqual([])
  })
})

describe('mensajes', () => {
  it('la oferta no lleva nada del productor y explica la comisión', () => {
    const c = M.oferta({ leadId: 12, ofertaId: 34, lado: 'vende', datos: { ...datos, precio_pedido_kg: 4300 }, contraparte: 'Frigorífico X' })
    expect(filtraContacto(c.texto, productor)).toBeNull()
    expect(filtraContacto(c.asunto, productor)).toBeNull()
    expect(c.texto).toMatch(/ACEPTO/)
    expect(c.texto).toMatch(/1% sobre el bruto/)
    expect(c.texto).toMatch(/BAJA/)
    expect(c.asunto).toMatch(/Ref\. C-12-34/)
    expect(comprometePrecio(c.texto)).toBe(false)
  })

  it('en un cruce entre leads le habla a "ustedes" y al comprador lo llama comprador', () => {
    const c = M.oferta({ leadId: 50, ofertaId: 7, lado: 'compra', datos: { cabezas: 60, categoria: 'terneros', provincia: 'Entre Ríos' }, contraparte: 'ustedes' })
    expect(c.texto).toMatch(/Un comprador nos pidió ayuda para conseguir hacienda como la que ustedes ofrecen/)
    expect(c.texto).toMatch(/contacto directo del comprador/)
    expect(c.texto).not.toMatch(/ustedes puede\b/)
  })

  it('el recordatorio a la contraparte va en el hilo y no lleva datos del productor', () => {
    const c = M.recordatorioOferta({ leadId: 12, ofertaId: 34, lado: 'vende', datos })
    expect(c.asunto).toMatch(/^Re: Hacienda disponible: .*Ref\. C-12-34/)
    expect(filtraContacto(c.texto, productor)).toBeNull()
    expect(comprometePrecio(c.texto)).toBe(false)
    expect(c.texto).toMatch(/ACEPTO/)
  })

  it('la presentación sí lleva el contacto de las dos partes', () => {
    const c = M.presentacion({ leadId: 12, ofertaId: 34, lado: 'vende', datos, productor: { nombre: productor.name, email: productor.email, phone: productor.phone }, contraparte: { tipo: 'frigorifico', nombre: 'Frigorífico X', email: 'hacienda@x.com' } })
    expect(c.texto).toContain(productor.email)
    expect(c.texto).toContain('hacienda@x.com')
    expect(c.texto).toMatch(/directamente entre ustedes/)
  })

  it('la presentación de una venta dice quién vende y quién compra', () => {
    const c = M.presentacion({ leadId: 12, ofertaId: 34, lado: 'vende', datos, productor: { nombre: productor.name, email: productor.email, phone: productor.phone }, contraparte: { tipo: 'frigorifico', nombre: 'Frigorífico X', email: 'hacienda@x.com' } })
    expect(c.texto).toContain('Frigorífico X (frigorífico, interesado en comprar) confirmó que le interesa la hacienda:')
    expect(c.texto).toContain(`· Vende — productor que nos escribió: ${productor.name} · ${productor.email} · ${productor.phone}`)
    expect(c.texto).toContain('· Compra — frigorífico: Frigorífico X · hacienda@x.com')
    expect(c.texto).toMatch(/Equipo de consignatarias\.com/)
  })

  it('la presentación de un pedido de compra dice quién vende y quién compra', () => {
    const c = M.presentacion({ leadId: 12, ofertaId: 34, lado: 'compra', datos, productor: { nombre: productor.name, email: productor.email, phone: productor.phone }, contraparte: { tipo: 'firma', nombre: 'Consignataria Ejemplo SA', email: 'ventas@ejemplo.com' } })
    expect(c.texto).toContain('Consignataria Ejemplo SA (consignataria, con hacienda para vender) confirmó que le interesa el pedido:')
    expect(c.texto).toContain(`· Compra — productor que nos escribió: ${productor.name}`)
    expect(c.texto).toContain('· Vende — consignataria: Consignataria Ejemplo SA · ventas@ejemplo.com')
  })

  it('una contraparte lead se nombra por su rol, nunca como "un productor de X"', () => {
    const sinNombre = M.presentacion({ leadId: 12, ofertaId: 34, lado: 'vende', datos, productor: { nombre: productor.name, email: productor.email, phone: null }, contraparte: { tipo: 'lead', nombre: 'un productor de Rosario', email: 'otro@ejemplo.com' } })
    expect(sinNombre.texto).not.toMatch(/un productor de/i)
    expect(sinNombre.texto).toContain('El productor que busca hacienda confirmó que le interesa la hacienda:')
    expect(sinNombre.texto).toContain('· Compra — productor: otro@ejemplo.com')

    const conNombre = M.presentacion({ leadId: 12, ofertaId: 34, lado: 'compra', datos, productor: { nombre: productor.name, email: productor.email, phone: null }, contraparte: { tipo: 'lead', nombre: 'Ana Gómez', email: 'otro@ejemplo.com', phone: '+54 9 341 000000' } })
    expect(conNombre.texto).toContain('Ana Gómez (productor, con hacienda para vender) confirmó que le interesa el pedido:')
    expect(conNombre.texto).toContain('· Vende — productor: Ana Gómez · otro@ejemplo.com · +54 9 341 000000')
    expect(conNombre.texto).toContain(`· Compra — productor que nos escribió: ${productor.name} · ${productor.email}`)
  })

  it('ningún correo al productor promete precio', () => {
    for (const c of [
      M.pedirDatos({ leadId: 1, nombre: 'juan', lado: 'vende', datos: {}, faltan: ['cabezas'] }),
      M.avisoOfreciendo({ leadId: 1, nombre: 'juan', lado: 'vende', datos }),
      M.sinContraparte({ leadId: 1, nombre: null, lado: 'vende', datos, consultadas: 3 }),
    ]) {
      expect(comprometePrecio(c.texto)).toBe(false)
      expect(c.texto).toMatch(/Equipo de consignatarias\.com/)
    }
  })

  it('saluda por el nombre de pila, o sin nombre si no parece uno', () => {
    expect(M.pedirDatos({ leadId: 1, nombre: 'JUAN carlos', lado: 'vende', datos: {}, faltan: ['zona'] }).texto.startsWith('Hola Juan,')).toBe(true)
    expect(M.pedirDatos({ leadId: 1, nombre: 'a@b.com', lado: 'vende', datos: {}, faltan: ['zona'] }).texto.startsWith('Hola,')).toBe(true)
  })

  it('el HTML escapa', () => {
    expect(M.aHtml('<script>')).toContain('&lt;script&gt;')
  })
})

describe('demandas de compra', () => {
  const d = { id: 3, categoria: 'vaca_gorda', cabezas: 200, provincia: 'santa fe', email: 'Compras@Tradefood.com.ar', origen: 'web', status: 'active', notas: null, consiente_contacto: true, created_at: '2026-10-20T12:48:55Z' }

  it('se vuelven leads de compra con categoría y provincia normalizadas', () => {
    const f = leadDeDemanda(d, [])!
    expect(f).toMatchObject({ intent: 'comprar', category: 'vacas', head_count: 200, province: 'Santa Fe', email: 'compras@tradefood.com.ar', source: 'demanda_compra:3', status: 'new' })
    expect(String(f.message)).toMatch(/200 cabezas vacas en Santa Fe/)
    expect(provinciaDemanda('Entre Rios')).toBe('Entre Ríos')
    expect(categoriaDemanda('terneros')).toBe('terneros')
  })

  it('no carga las propias, las de prueba ni las inactivas', () => {
    expect(leadDeDemanda({ ...d, email: 'jose@x.com' }, ['jose@x.com'])).toBeNull()
    expect(leadDeDemanda({ ...d, notas: 'demo del growth engine' }, [])).toBeNull()
    expect(leadDeDemanda({ ...d, status: 'paused' }, [])).toBeNull()
    expect(leadDeDemanda({ ...d, email: null }, [])).toBeNull()
    expect(leadDeDemanda({ ...d, email: 'operaciones@example.com' }, [])).toBeNull()
    expect(leadDeDemanda({ ...d, email: 'ganaderia+alerts@example.org' }, [])).toBeNull()
    expect(leadDeDemanda({ ...d, email: 'compras@campo.test' }, [])).toBeNull()
    expect(leadDeDemanda({ ...d, origen: 'mcp' }, [])).toMatchObject({ status: 'needs_review' })
    // Solo avisos de remates: no entra al agente
    expect(leadDeDemanda({ ...d, consiente_contacto: false }, [])).toBeNull()
    expect(leadDeDemanda({ ...d, consiente_contacto: undefined }, [])).toBeNull()
  })

  it('un comprador de terneros en Entre Ríos cruza con un vendedor de Santa Fe', () => {
    const vendedor: Candidato = { tipo: 'lead', ref: '29', nombre: 'un productor de El Rabón', email: 'v@x.com', provincia: 'Santa Fe', categoria: 'terneros', cabezas: 40, lado: 'vende' }
    const r = elegirContrapartes({ lado: 'compra', datos: { cabezas: 60, categoria: 'terneros', provincia: 'Entre Ríos' }, candidatos: [vendedor], yaConsultados: new Set(), bajas: new Set(), cuantos: 3 })
    expect(r.map((c) => c.ref)).toEqual(['29'])
  })
})

describe('tablero', () => {
  const caso = (lead_id: number, estado: CasoFila['estado'], cabezas: number | null): CasoFila => ({ lead_id, lado: 'vende', estado, datos: { cabezas, categoria: 'novillos', provincia: 'Buenos Aires' }, motivo: null, tandas: 0, proximo_at: '2026-10-21T11:00:00Z', actualizado_at: '2026-10-21T00:00:00Z' })
  const of = (lead_id: number, estado: string, respondida: boolean, comision?: number): OfertaFila => ({ lead_id, tipo: 'firma', nombre: 'F', estado, enviada_at: '2026-10-20T13:00:00Z', respondida_at: respondida ? '2026-10-20T15:00:00Z' : null, cierre: comision ? { comision_ars: comision } : null })

  it('separa potencial, en juego y cerrada, y deja afuera los casos a mano', () => {
    const t = armarTablero(
      [caso(1, 'ofreciendo', 50), caso(2, 'presentado', 40), caso(3, 'escalado', 300), caso(4, 'pidiendo_datos', null), caso(5, 'descartado', 10)],
      [of(1, 'enviada', false), of(2, 'presentada', true), of(9, 'cerrada', true, 739_600)],
    )
    expect(t.plata.potencial).toBe(comisionEstimada({ cabezas: 50, categoria: 'novillos' }))
    expect(t.plata.enJuego).toBe(comisionEstimada({ cabezas: 40, categoria: 'novillos' }))
    expect(t.plata.cerrada).toBe(739_600)
    expect(t.plata.sinEstimar).toBe(1)
    expect(t.vivos.map((v) => v.lead_id)).toEqual([1, 2, 3, 4])
    expect(t.vivos.find((v) => v.lead_id === 3)?.comision).toBeNull()
    expect(t.porEstado.descartado).toBe(1)
    expect(t.ofertas).toMatchObject({ enviadas: 3, respondidas: 2, aceptadas: 2, esperando: 1 })
  })

  it('dice el próximo paso en palabras', () => {
    const ahora = new Date('2026-10-21T12:00:00Z')
    expect(proximoPaso({ estado: 'ofreciendo', proximo_at: '2026-10-24T12:00:00Z' }, ahora)).toMatch(/en 3 días/)
    expect(proximoPaso({ estado: 'nuevo', proximo_at: '2026-10-21T11:00:00Z' }, ahora)).toBe('arranca en la próxima corrida')
  })
})
