import { describe, expect, it } from 'vitest'
import { formaDelSecret } from './rebill-firma'

describe('formaDelSecret', () => {
  it('reconoce un signing secret de Rebill (whsec_ + 64 hex)', () => {
    const r = formaDelSecret(`whsec_${'a1'.repeat(32)}`)
    expect(r).toEqual({ secret_forma: 'whsec', secret_largo: 70 })
  })

  it('detecta que se cargó el id del webhook (we_ + 32 hex) en vez del secret', () => {
    const r = formaDelSecret(`we_${'f2'.repeat(16)}`)
    expect(r).toEqual({ secret_forma: 'id_de_webhook', secret_largo: 35 })
  })

  it('cualquier otra cosa es "otra", incluido vacío', () => {
    expect(formaDelSecret('algo-raro').secret_forma).toBe('otra')
    expect(formaDelSecret(undefined)).toEqual({ secret_forma: 'otra', secret_largo: 0 })
    expect(formaDelSecret(`whsec_${'a'.repeat(10)}`).secret_forma).toBe('otra')
  })

  it('nunca devuelve el valor del secret', () => {
    const secret = `whsec_${'0123456789abcdef'.repeat(4)}`
    expect(JSON.stringify(formaDelSecret(secret))).not.toContain('0123456789')
  })
})
