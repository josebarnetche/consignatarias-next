import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Lo que se fija acá es la frontera del de-gateo: la CONSULTA es libre, el
 * BARRIDO no. Si alguien afloja esto, vuelve a quedar abierta la puerta por la
 * que en septiembre de 2026 una sola IP se llevó el directorio en seis días.
 *
 * Y lo inverso importa igual: el productor que busca una firma por nombre o un
 * frigorífico por CUIT no se tiene que enterar de que el techo existe.
 */

const enforceRateLimit = vi.fn(async () => ({ ok: true, retryAfter: 0 }))
vi.mock('@/lib/rate-limit-db', () => ({
  enforceRateLimit: (...a: unknown[]) => enforceRateLimit(...(a as [])),
  clientIp: () => '1.2.3.4',
}))

const { techoListado, ventanaAcotada, FILAS_ANONIMAS, LLAMADAS_DIA_ANONIMAS, VENTANA_MAX_DIAS } =
  await import('./techo-listados')

const req = new Request('https://www.consignatarias.com.ar/api/mcp')

beforeEach(() => {
  enforceRateLimit.mockClear()
  enforceRateLimit.mockResolvedValue({ ok: true, retryAfter: 0 })
})

describe('techo de listados del MCP', () => {
  it('no deja enumerar sin credencial, aunque sea la primera llamada del día', async () => {
    const v = await techoListado({
      tool: 'buscar_consignataria', req, autorizado: false,
      pedido: 25, tope: 25, porDefecto: 8, enumera: true,
    })
    expect(v.limite).toBe(0)
    expect(v.corte).toContain('credencial')
    // El corte por enumeración no consume cupo: no tiene sentido castigar dos veces.
    expect(enforceRateLimit).not.toHaveBeenCalled()
  })

  it('la consulta acotada pasa, recortada a pocas filas', async () => {
    const v = await techoListado({
      tool: 'buscar_frigorifico', req, autorizado: false,
      pedido: 30, tope: 30, porDefecto: 10,
    })
    expect(v.corte).toBeNull()
    expect(v.limite).toBe(FILAS_ANONIMAS)
  })

  it('pedir menos de lo permitido devuelve lo pedido, no el techo', async () => {
    const v = await techoListado({
      tool: 'buscar_frigorifico', req, autorizado: false,
      pedido: 2, tope: 30, porDefecto: 10,
    })
    expect(v.limite).toBe(2)
  })

  it('con credencial no hay techo más que el tope de la tool', async () => {
    const v = await techoListado({
      tool: 'buscar_consignataria', req, autorizado: true,
      pedido: 999, tope: 25, porDefecto: 8, enumera: true,
    })
    expect(v.corte).toBeNull()
    expect(v.limite).toBe(25)
    expect(enforceRateLimit).not.toHaveBeenCalled()
  })

  it('corta cuando se agota el cupo diario, y dice cuándo vuelve', async () => {
    enforceRateLimit.mockResolvedValue({ ok: false, retryAfter: 7200 })
    const v = await techoListado({
      tool: 'list_remates', req, autorizado: false,
      pedido: 10, tope: 50, porDefecto: 10,
    })
    expect(v.limite).toBe(0)
    expect(v.corte).toContain(String(LLAMADAS_DIA_ANONIMAS))
    expect(v.corte).toContain('2 h')
  })
})

describe('ventana de la actividad del MAG', () => {
  it('recorta la ventana larga sin credencial y lo declara', () => {
    const { desde, nota } = ventanaAcotada('2025-01-01', '2026-01-01', false)
    expect(desde).toBe('2025-12-01')
    expect(nota).toContain(String(VENTANA_MAX_DIAS))
  })

  it('no toca una ventana corta ni molesta a quien pregunta por su semana', () => {
    const { desde, nota } = ventanaAcotada('2026-09-01', '2026-09-08', false)
    expect(desde).toBe('2026-09-01')
    expect(nota).toBeNull()
  })

  it('con credencial la ventana va entera', () => {
    const { desde, nota } = ventanaAcotada('2015-01-01', '2026-01-01', true)
    expect(desde).toBe('2015-01-01')
    expect(nota).toBeNull()
  })
})
