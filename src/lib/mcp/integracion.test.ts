import { describe, it, expect } from 'vitest'
import { esIntegracionAnonima, conAvisoIntegracion, META_AVISO } from './integracion'

describe('aviso a integraciones anónimas', () => {
  it('sin auth y sin UA es una integración; con UA o con key, no', () => {
    expect(esIntegracionAnonima({ ua: null, has_auth: false })).toBe(true)
    expect(esIntegracionAnonima({ ua: '  ', has_auth: false })).toBe(true)
    expect(esIntegracionAnonima({ ua: 'claude-desktop/1.0', has_auth: false })).toBe(false)
    expect(esIntegracionAnonima({ ua: null, has_auth: true })).toBe(false)
  })

  it('agrega una línea al final y el aviso en _meta, una sola vez', () => {
    const r = conAvisoIntegracion({ content: [{ type: 'text', text: 'INMAG 4250' }] })
    expect(r.content[0].text).toMatch(/^INMAG 4250\n\n¿Integraste/)
    expect(r._meta?.[META_AVISO]).toBeTruthy()
    expect(conAvisoIntegracion(r).content[0].text.match(/Integraste/g)).toHaveLength(1)
  })

  it('no toca los errores', () => {
    const e = { content: [{ type: 'text', text: 'falló' }], isError: true }
    expect(conAvisoIntegracion(e)).toBe(e)
  })
})
