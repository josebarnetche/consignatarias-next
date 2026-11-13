import { describe, it, expect, vi, beforeEach } from 'vitest'

// Resend no lanza cuando la API rechaza: devuelve `{ error }`. El envío de El Corredor
// registra en el_corredor_envios solo lo que salió, y la continuación del día 2 retoma
// el resto. Si un rechazo (el tope diario, sin ir más lejos) se leyera como éxito, ese
// suscriptor quedaría marcado como enviado y no lo recibiría nunca.
const send = vi.fn()
vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  },
}))
vi.mock('./ops', () => ({ logEvent: vi.fn(), enviarEnSegundoPlano: vi.fn() }))

describe('el envío de El Corredor', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test'
    send.mockReset()
  })

  it('un rechazo de Resend es una falla, no un envío', async () => {
    send.mockResolvedValue({ data: null, error: { name: 'daily_quota_exceeded', message: 'tope diario' } })
    const { sendElCorredorDelivery } = await import('./email')
    const r = await sendElCorredorDelivery('a@ejemplo.com', 'Noviembre · 2026', 'https://x/el-corredor/noviembre-2026.pdf')
    expect(r.success).toBe(false)
    expect(r.error).toContain('daily_quota_exceeded')
  })

  it('un envío aceptado es un éxito', async () => {
    send.mockResolvedValue({ data: { id: 'em_1' }, error: null })
    const { sendElCorredorDelivery } = await import('./email')
    const r = await sendElCorredorDelivery('a@ejemplo.com', 'Noviembre · 2026', 'https://x/el-corredor/noviembre-2026.pdf')
    expect(r.success).toBe(true)
  })

  it('la corrección tampoco toma un rechazo por éxito', async () => {
    send.mockResolvedValue({ data: null, error: { name: 'rate_limit_exceeded', message: 'x' } })
    const { sendElCorredorCorreccion } = await import('./email')
    const r = await sendElCorredorCorreccion('a@ejemplo.com', 'Noviembre · 2026', 'https://x/el-corredor/noviembre-2026.pdf')
    expect(r.success).toBe(false)
  })
})
