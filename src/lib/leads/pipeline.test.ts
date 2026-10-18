import { describe, expect, it } from 'vitest'
import { esEtapa, etapaDe, origenConsulta } from './pipeline'

describe('pipeline de consultas', () => {
  it('acepta sólo las cuatro etapas', () => {
    expect(esEtapa('contacted')).toBe(true)
    expect(esEtapa('won')).toBe(false)
    expect(esEtapa(null)).toBe(false)
  })
  it('un estado vacío o desconocido es una consulta nueva', () => {
    expect(etapaDe(null)).toBe('new')
    expect(etapaDe('routed')).toBe('new')
    expect(etapaDe('converted')).toBe('converted')
  })
  it('nombra el origen en castellano', () => {
    expect(origenConsulta('whatsapp_profile')).toBe('WhatsApp desde tu perfil')
    expect(origenConsulta(null)).toBe('Sin dato')
  })
})
