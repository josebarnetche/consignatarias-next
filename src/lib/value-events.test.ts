import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { isValueEvent, VALUE_EVENTS } from './value-events'

/**
 * Un `emitValueBeacon('x')` con un nombre que no está en VALUE_EVENTS no rompe nada
 * visible: `/api/track/event` lo rechaza y el evento se pierde en silencio. Eso es lo
 * peor que puede pasarle a una métrica de embudo — el 30-sep el embudo del informe
 * mostraba 25 vistas y 0 checkouts, y hubo que probar la compra a mano para saber si
 * faltaba la venta o faltaba la medición.
 *
 * Este test recorre el código y exige que todo evento emitido esté declarado.
 */
function archivosFuente(dir: string, out: string[] = []): string[] {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) archivosFuente(ruta, out)
    else if (/\.tsx?$/.test(nombre) && !/\.test\.tsx?$/.test(nombre)) out.push(ruta)
  }
  return out
}

describe('VALUE_EVENTS', () => {
  it('declara todos los eventos que el código emite', () => {
    const sinDeclarar: string[] = []
    for (const ruta of archivosFuente('src')) {
      const src = readFileSync(ruta, 'utf-8')
      for (const m of src.matchAll(/emitValueBeacon\(\s*'([a-z0-9_]+)'/g)) {
        if (!isValueEvent(m[1])) sinDeclarar.push(`${m[1]} (${ruta})`)
      }
    }
    expect(sinDeclarar).toEqual([])
  })

  it('tiene el embudo del informe completo, en orden de cercanía a la plata', () => {
    const embudo = [
      'informe_view',
      'informe_cta_click',
      'informe_variante_select',
      'informe_checkout_start',
    ] as const
    for (const e of embudo) expect(isValueEvent(e)).toBe(true)
    expect(VALUE_EVENTS.informe_variante_select.weight).toBeLessThan(
      VALUE_EVENTS.informe_checkout_start.weight,
    )
  })
})
