import { describe, expect, it } from 'vitest'
import { envioHabilitado, informeTexto, ordenar, puntuar, redactarInforme, type ContextoZona, type MetricasFirma } from './prospectos'

const base: MetricasFirma = {
  slug: 'firma-x',
  nombre: 'Firma X SA',
  provincia: 'ENTRE RIOS',
  email: 'hola@firmax.com.ar',
  telefono: '+54 343 4000000',
  verificada: false,
  reclamada: false,
  vistas30: 20,
  vistasPrevias30: 10,
  diasConVisitas30: 10,
  maxDia30: 4,
  googleImpresiones28: null,
  rematesProximos: 0,
  correosPrevios: 0,
  respuestasPrevias: 0,
  ultimoCorreo: null,
  informeReciente: false,
  dadaDeBaja: false,
}
const vacio: ContextoZona = { pedidos30: [], ofertasAPro: [], casosVivos: [] }
const ctxInforme = { appUrl: 'https://www.consignatarias.com.ar', urlPropuesta: null, hoy: '2026-10-21' }

describe('envioHabilitado', () => {
  it('está apagado salvo PRO_PROSPECTOS_ENVIO=on', () => {
    expect(envioHabilitado({})).toBe(false)
    expect(envioHabilitado({ PRO_PROSPECTOS_ENVIO: '1' })).toBe(false)
    expect(envioHabilitado({ PRO_PROSPECTOS_ENVIO: 'true' })).toBe(false)
    expect(envioHabilitado({ PRO_PROSPECTOS_ENVIO: ' ON ' })).toBe(true)
  })
})

describe('puntuar', () => {
  it('la constancia pesa más que un pico de un solo día', () => {
    const constante = puntuar({ ...base, slug: 'a', vistas30: 30, diasConVisitas30: 15, maxDia30: 4 }, vacio)
    const pico = puntuar({ ...base, slug: 'b', vistas30: 80, diasConVisitas30: 5, maxDia30: 41, vistasPrevias30: 80 }, vacio)
    expect(constante.puntaje).toBeGreaterThan(pico.puntaje)
    expect(pico.alertas.join(' ')).toMatch(/un solo día/)
  })

  it('suma la demanda de su provincia y limítrofes, no la de lejos', () => {
    const ctx: ContextoZona = {
      pedidos30: [
        { provincia: 'Entre Ríos', lado: 'compra', categoria: 'terneros', cabezas: 60 },
        { provincia: 'Corrientes', lado: 'vende', categoria: 'vacas', cabezas: 50 },
        { provincia: 'Mendoza', lado: 'vende', categoria: 'terneros', cabezas: 70 },
      ],
      ofertasAPro: [],
      casosVivos: [{ provincia: 'Santa Fe', lado: 'compra', categoria: 'vacas', cabezas: 200 }],
    }
    const p = puntuar(base, ctx)
    expect(p.zona.pedidos30).toBe(2)
    expect(p.zona.pedidosProvincia30).toBe(1)
    expect(p.zona.casosVivos).toHaveLength(1)
    expect(p.puntaje).toBe(puntuar(base, vacio).puntaje + 4 + 2 + 6)
  })

  it('sin mail vale la mitad y avisa a quien no contestó nunca', () => {
    const conMail = puntuar(base, vacio)
    const sinMail = puntuar({ ...base, email: null, correosPrevios: 5 }, vacio)
    expect(sinMail.canal).toBe('telefono')
    expect(sinMail.puntaje).toBe(Math.round(conMail.puntaje / 2))
    expect(sinMail.alertas.join(' ')).toMatch(/mejor llamar/)
  })

  it('ordena por puntaje', () => {
    const a = puntuar({ ...base, slug: 'a', diasConVisitas30: 2, vistas30: 2 }, vacio)
    const b = puntuar({ ...base, slug: 'b' }, vacio)
    expect(ordenar([a, b]).map((p) => p.m.slug)).toEqual(['b', 'a'])
  })
})

describe('redactarInforme', () => {
  it('cada cifra del correo es una métrica medida', () => {
    const ctx: ContextoZona = { ...vacio, casosVivos: [{ provincia: 'Entre Ríos', lado: 'compra', categoria: 'terneros', cabezas: 60 }] }
    const i = redactarInforme(puntuar({ ...base, googleImpresiones28: 1234, rematesProximos: 2 }, ctx), ctxInforme)
    const t = informeTexto(i)
    expect(i.asunto).toBe('Firma X SA: 20 visitas a su ficha en 30 días')
    expect(t).toContain('20 visitas a la ficha de Firma X SA, en 10 días distintos')
    expect(t).toContain('1.234 veces que la ficha apareció en Google')
    expect(t).toContain('2 remates próximos')
    expect(t).toContain('compra de 60 terneros en Entre Ríos')
    expect(t).toContain('ARS 45.000')
    expect(t).toContain('https://www.consignatarias.com.ar/consignatarias/firma-x/activar')
  })

  it('una métrica que no se pudo medir no aparece (nunca un cero inventado)', () => {
    const i = redactarInforme(puntuar({ ...base, vistas30: null, diasConVisitas30: null, maxDia30: null, vistasPrevias30: null }, vacio), ctxInforme)
    const t = informeTexto(i)
    expect(t).not.toMatch(/visitas a la ficha/)
    expect(t).not.toMatch(/\b0 /)
    expect(i.asunto).toBe('Firma X SA: los números de su ficha en consignatarias.com.ar')
  })

  it('no lleva datos personales: sólo agregados de la demanda', () => {
    const ctx: ContextoZona = { ...vacio, casosVivos: [{ provincia: 'Entre Ríos', lado: 'vende', categoria: 'novillos', cabezas: 80 }] }
    const t = informeTexto(redactarInforme(puntuar(base, ctx), ctxInforme))
    expect(t).not.toContain('@')
  })
})
