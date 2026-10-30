import { describe, expect, it } from 'vitest'
import { PLANTILLAS_EXENTAS, TOPE_PROACTIVOS_24H, esExenta, puedeMandarProactivo, topeParaTodos, type MensajeLog } from './tope'

// Datos ficticios: el repo es público.
const JUAN = 'juan.perez@example.com'
const FIRMA = 'ventas@firma-ejemplo.example.com'
const ahora = new Date('2026-10-22T15:00:00Z')
const haceHoras = (h: number) => new Date(ahora.getTime() - h * 3_600_000).toISOString()

const salio = (para: string, h: number, leadId = 1): MensajeLog => ({ dir: 'out', de: 'agente@example.com', para, lead_id: leadId, creado_at: haceHoras(h) })
const entro = (de: string, h: number, leadId = 1): MensajeLog => ({ dir: 'in', de, para: 'agente@example.com', lead_id: leadId, creado_at: haceHoras(h) })

describe('puedeMandarProactivo', () => {
  it('el tope es uno por día', () => {
    expect(TOPE_PROACTIVOS_24H).toBe(1)
  })

  it('sin correos en 24 h sale', () => {
    expect(puedeMandarProactivo(JUAN, [], 'pedir_datos', { ahora, leadId: 1 })).toMatchObject({ ok: true, por: 'libre' })
  })

  it('el caso del 22-10: oferta + presentación en el día → el pedido de datos espera', () => {
    const log = [salio(JUAN, 6, 7), entro(JUAN, 3, 7), salio(`${JUAN}, ${FIRMA}`, 3, 7)]
    const v = puedeMandarProactivo(JUAN, log, 'pedir_datos', { ahora, leadId: 9 })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.hasta.toISOString()).toBe(new Date(new Date(haceHoras(3)).getTime() + 86_400_000).toISOString())
  })

  it('vale para todas las plantillas proactivas, también las de campo y las que no conoce', () => {
    const log = [salio(JUAN, 2)]
    for (const p of ['oferta', 'recordatorio_oferta', 'seguimiento', 'pedir_datos', 'aviso_ofreciendo', 'sin_contraparte', 'confirmacion', 'campo_arrendamiento', 'campo_recordatorio', 'oferta_campo', 'plantilla_nueva'])
      expect(puedeMandarProactivo(JUAN, log, p, { ahora, leadId: 2 }).ok, p).toBe(false)
  })

  it('la ventana es móvil: a las 24 h exactas se libera', () => {
    expect(puedeMandarProactivo(JUAN, [salio(JUAN, 23.9)], 'oferta', { ahora }).ok).toBe(false)
    expect(puedeMandarProactivo(JUAN, [salio(JUAN, 24)], 'oferta', { ahora }).ok).toBe(true)
    expect(puedeMandarProactivo(JUAN, [salio(JUAN, 30)], 'oferta', { ahora }).ok).toBe(true)
  })

  it('compara la dirección sin mayúsculas ni espacios, y dentro de una lista de destinatarios', () => {
    const log = [salio(`otro@example.com,  JUAN.Perez@Example.com`, 1)]
    expect(puedeMandarProactivo(' Juan.Perez@example.com ', log, 'oferta', { ahora }).ok).toBe(false)
    expect(puedeMandarProactivo('maria.gomez@example.com', log, 'oferta', { ahora }).ok).toBe(true)
  })

  it('no confunde una dirección que contiene a otra', () => {
    expect(puedeMandarProactivo(JUAN, [salio('x.juan.perez@example.com', 1)], 'oferta', { ahora }).ok).toBe(true)
  })

  it('exentas: BAJA, presentación tras ACEPTO, traslados y aviso de comisión salen igual', () => {
    const log = [salio(JUAN, 1), salio(JUAN, 2)]
    for (const p of ['baja', 'presentacion', 'presentacion_campo', 'traslado_contraparte', 'traslado_productor', 'aviso_comision']) {
      expect(esExenta(p)).toBe(true)
      expect(puedeMandarProactivo(JUAN, log, p, { ahora })).toMatchObject({ ok: true, por: 'exenta' })
    }
    expect(Object.keys(PLANTILLAS_EXENTAS)).not.toContain('oferta')
    expect(esExenta('toString')).toBe(false)
  })

  it('respuesta directa: escribió en ESTE caso después de lo último que le mandamos', () => {
    const log = [salio(JUAN, 5, 3), entro(JUAN, 1, 3)]
    expect(puedeMandarProactivo(JUAN, log, 'pedir_datos', { ahora, leadId: 3 })).toMatchObject({ ok: true, por: 'respuesta' })
  })

  it('la respuesta es una por mensaje: después de contestarle, lo siguiente espera', () => {
    const log = [salio(JUAN, 5, 3), entro(JUAN, 2, 3), salio(JUAN, 1, 3)]
    expect(puedeMandarProactivo(JUAN, log, 'pedir_datos', { ahora, leadId: 3 }).ok).toBe(false)
  })

  it('lo que escribió en OTRO caso no habilita un correo de este', () => {
    const log = [salio(FIRMA, 5, 3), entro(FIRMA, 1, 3)]
    expect(puedeMandarProactivo(FIRMA, log, 'oferta', { ahora, leadId: 4 }).ok).toBe(false)
    expect(puedeMandarProactivo(FIRMA, log, 'oferta', { ahora }).ok).toBe(false)
  })

  it('un mensaje entrante de otra persona no cuenta como respuesta', () => {
    const log = [salio(JUAN, 5, 3), entro(FIRMA, 1, 3)]
    expect(puedeMandarProactivo(JUAN, log, 'seguimiento', { ahora, leadId: 3 }).ok).toBe(false)
  })

  it('con tope mayor se cuenta la ventana y se libera con el más viejo de los que cuentan', () => {
    const log = [salio(JUAN, 20), salio(JUAN, 10), salio(JUAN, 2)]
    const v = puedeMandarProactivo(JUAN, log, 'oferta', { ahora, tope: 2 })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.hasta.getTime()).toBe(new Date(haceHoras(10)).getTime() + 86_400_000)
    expect(puedeMandarProactivo(JUAN, [salio(JUAN, 2)], 'oferta', { ahora, tope: 2 }).ok).toBe(true)
  })

  it('ignora filas del futuro o con fecha inválida', () => {
    const log: MensajeLog[] = [{ ...salio(JUAN, -1) }, { ...salio(JUAN, 1), creado_at: 'no-es-fecha' }]
    expect(puedeMandarProactivo(JUAN, log, 'oferta', { ahora }).ok).toBe(true)
  })
})

describe('topeParaTodos', () => {
  it('un correo a dos partes sale entero o espera entero, hasta el último que se libera', () => {
    const log = [salio(JUAN, 20), salio(FIRMA, 2)]
    const v = topeParaTodos([JUAN, FIRMA], log, 'seguimiento', { ahora })
    expect(v.ok).toBe(false)
    if (!v.ok) {
      expect(v.hasta.getTime()).toBe(new Date(haceHoras(2)).getTime() + 86_400_000)
      expect(v.motivo).toContain(FIRMA)
    }
    expect(topeParaTodos([JUAN, FIRMA], [], 'seguimiento', { ahora }).ok).toBe(true)
    expect(topeParaTodos([JUAN, FIRMA], log, 'presentacion', { ahora }).ok).toBe(true)
  })
})

describe('motor.ts difiere cada correo proactivo antes de mandarlo', () => {
  it('mandar() pasa por el tope, y cada plantilla proactiva del motor tiene su tope() previo', async () => {
    const fs = await import('node:fs')
    const src = fs.readFileSync(new URL('./motor.ts', import.meta.url), 'utf8')
    const cuerpoMandar = src.slice(src.indexOf('const mandar = async'), src.indexOf('const escalar = async'))
    expect(cuerpoMandar).toContain('tope(para, o.plantilla, o.leadId)')
    for (const p of ['pedir_datos', 'aviso_ofreciendo', 'recordatorio_oferta', 'sin_contraparte', 'seguimiento']) expect(src, p).toMatch(new RegExp(`tope\\([^)]*'${p}'|plantillaCaso = [^\\n]*'${p}'`))
    expect(src).toContain("tope([p], 'oferta', lead.id)")
  })
})
