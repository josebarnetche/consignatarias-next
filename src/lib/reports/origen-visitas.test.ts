import { describe, it, expect } from 'vitest'
import { clasificarOrigen, construirOrigenVisitas, esMotorIA } from './origen-visitas'

const FICHA = '/consignatarias/reggi'

describe('clasificarOrigen', () => {
  it('el registro viejo (referrer = la propia ficha) es "sin dato", no "desde el sitio"', () => {
    expect(clasificarOrigen('https://www.consignatarias.com.ar/consignatarias/reggi', FICHA).origen).toBe('sin_dato')
  })

  it('distingue buscadores, IAs, redes y directo', () => {
    expect(clasificarOrigen('https://www.google.com.ar/', FICHA).origen).toBe('buscadores')
    expect(clasificarOrigen('https://chatgpt.com/', FICHA).origen).toBe('ias')
    expect(clasificarOrigen('https://copilot.microsoft.com/chats/x', FICHA).origen).toBe('ias')
    // gemini.google.com es una IA aunque el dominio sea de Google.
    expect(clasificarOrigen('https://gemini.google.com/app', FICHA).origen).toBe('ias')
    expect(clasificarOrigen('https://l.facebook.com/l.php', FICHA).origen).toBe('redes')
    expect(clasificarOrigen(null, FICHA).origen).toBe('directo')
    expect(clasificarOrigen('https://example.org/', FICHA).origen).toBe('otros')
  })

  it('dentro del sitio dice desde qué sección', () => {
    expect(clasificarOrigen('https://www.consignatarias.com.ar/consignatarias', FICHA)).toEqual({ origen: 'sitio', seccion: 'directorio' })
    expect(clasificarOrigen('https://www.consignatarias.com.ar/remates/hoy', FICHA)).toEqual({ origen: 'sitio', seccion: 'remates' })
    expect(clasificarOrigen('https://www.consignatarias.com.ar/', FICHA)).toEqual({ origen: 'sitio', seccion: 'portada' })
  })
})

describe('construirOrigenVisitas', () => {
  const hoy = '2026-10-17T15:00:00Z'

  it('arma 30 días, separa los sin dato y cuenta las IAs sin bing-organico', () => {
    const r = construirOrigenVisitas(
      [
        { viewed_at: '2026-10-17T13:00:00Z', referrer: 'https://www.google.com/' },
        { viewed_at: '2026-10-16T13:00:00Z', referrer: 'https://www.consignatarias.com.ar/consignatarias/reggi' },
        { viewed_at: '2026-10-16T14:00:00Z', referrer: 'https://www.consignatarias.com.ar/remates' },
      ],
      [{ engine: 'chatgpt' }, { engine: 'chatgpt' }, { engine: 'copilot' }, { engine: 'bing-organico' }],
      FICHA,
      hoy,
    )
    expect(r.porDia).toHaveLength(30)
    expect(r.porDia.at(-1)).toEqual({ dia: '2026-10-17', vistas: 1 })
    expect(r.porDia.at(-2)).toEqual({ dia: '2026-10-16', vistas: 2 })
    expect(r.total).toBe(3)
    expect(r.sinDato).toBe(1)
    expect(r.porOrigen).toEqual([
      { origen: 'buscadores', vistas: 1 },
      { origen: 'sitio', vistas: 1 },
    ])
    expect(r.ias).toEqual([
      { motor: 'ChatGPT', visitas: 2 },
      { motor: 'Copilot', visitas: 1 },
    ])
    expect(r.iasTotal).toBe(3)
    expect(r.diaFuerte).toBeNull()
  })

  it('bing-organico no es una IA', () => {
    expect(esMotorIA('bing-organico')).toBe(false)
    expect(esMotorIA('chatgpt')).toBe(true)
  })
})
