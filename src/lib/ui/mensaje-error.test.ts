import { describe, expect, it } from 'vitest'
import { mensajeError } from './mensaje-error'

describe('mensajeError', () => {
  it('texto plano', () => expect(mensajeError({ error: 'No autorizado' }, 'x')).toBe('No autorizado'))
  it('objeto del rate limit', () => expect(mensajeError({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Límite' } }, 'x')).toBe('Límite'))
  it('sin error o basura', () => {
    expect(mensajeError(null, 'x')).toBe('x')
    expect(mensajeError({ error: { code: 1 } }, 'x')).toBe('x')
  })
})
