import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tokenPropuesta, tokenPropuestaValido, urlPropuesta } from './token'

describe('token de la propuesta PRO', () => {
  beforeEach(() => {
    vi.stubEnv('PROPUESTA_SECRET', 'secreto-de-prueba')
    vi.stubEnv('API_KEY_PEPPER', 'pepper-de-prueba')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('es determinista por slug y distinto entre firmas', () => {
    const a = tokenPropuesta('colombo-y-magliano')
    expect(a).toHaveLength(22)
    expect(tokenPropuesta('colombo-y-magliano')).toBe(a)
    expect(tokenPropuesta('colombo-y-colombo')).not.toBe(a)
  })

  it('valida el token correcto y rechaza uno ajeno, vacío o truncado', () => {
    const t = tokenPropuesta('colombo-y-magliano')
    expect(tokenPropuestaValido('colombo-y-magliano', t)).toBe(true)
    expect(tokenPropuestaValido('colombo-y-colombo', t)).toBe(false)
    expect(tokenPropuestaValido('colombo-y-magliano', '')).toBe(false)
    expect(tokenPropuestaValido('colombo-y-magliano', undefined)).toBe(false)
    expect(tokenPropuestaValido('colombo-y-magliano', t.slice(0, 10))).toBe(false)
  })

  it('usa PROPUESTA_SECRET y, si falta, cae al pepper', () => {
    const conSecreto = tokenPropuesta('afa')
    vi.stubEnv('PROPUESTA_SECRET', '')
    const conPepper = tokenPropuesta('afa')
    expect(conPepper).toHaveLength(22)
    expect(conPepper).not.toBe(conSecreto)
  })

  it('sin ningún secreto no emite token y nada valida (falla cerrada)', () => {
    vi.stubEnv('PROPUESTA_SECRET', '')
    vi.stubEnv('API_KEY_PEPPER', '')
    expect(tokenPropuesta('afa')).toBe('')
    expect(tokenPropuestaValido('afa', '')).toBe(false)
    expect(tokenPropuestaValido('afa', 'cualquiera')).toBe(false)
  })

  it('arma el link con token, contacto y nota', () => {
    const url = urlPropuesta('afa', { contacto: 'Juan Pérez', nota: 'Hola' }, 'https://x.test')
    const u = new URL(url)
    expect(u.pathname).toBe('/propuesta/afa')
    expect(u.searchParams.get('t')).toBe(tokenPropuesta('afa'))
    expect(u.searchParams.get('contacto')).toBe('Juan Pérez')
    expect(u.searchParams.get('nota')).toBe('Hola')
  })
})
