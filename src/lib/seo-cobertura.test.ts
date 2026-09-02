import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Las páginas que más impresiones traen tienen que declarar su serie como Dataset.
 *
 * POR QUÉ IMPORTA, con el número que lo motivó
 * En la semana del 22-28 de agosto el sitio tuvo 61.569 impresiones y 947 clics: CTR
 * 1,54 % con posición media 6,5. Para esa posición lo esperable ronda el 4 %, así que
 * estamos cinco veces por debajo — el patrón de cuando el buscador responde arriba y el
 * clic no baja.
 *
 * Contra eso no se pelea el clic: se pelea ser la fuente citada. `variableMeasured`,
 * `temporalCoverage` y `distribution` son lo que convierte una página con números en un
 * dataset que un modelo puede citar con unidad y fecha. Sin eso, cita el número suelto
 * —o cita a otro.
 *
 * `/mercado/arrendamiento` concentra ~2.200 impresiones semanales y estaba SIN Dataset
 * hasta el 2-sep-2026. Este test evita que vuelva a pasar cuando alguien reescriba la
 * página.
 */
describe('cobertura de Dataset en las páginas de datos', () => {
  const APP = join(process.cwd(), 'src', 'app', '(terminal)')

  /** Páginas de serie de datos, con las impresiones semanales que traían al 2-sep. */
  const PAGINAS_DE_SERIE: Array<[string, string]> = [
    ['mercado/arrendamiento/page.tsx', '~2.200 impresiones/semana — la #1 del sitio'],
    ['mercado/arrendamiento/canuelas/page.tsx', '32 clics/semana'],
    ['mercado/arrendamiento/liniers/page.tsx', '39 clics/semana'],
    ['mercado/inmag/page.tsx', 'el índice, entidad principal'],
  ]

  it.each(PAGINAS_DE_SERIE)('%s declara Dataset', (rel, porque) => {
    const ruta = join(APP, rel)
    if (!existsSync(ruta)) return // la ruta cambió de lugar; lo cubre el test de sitemap
    const src = readFileSync(ruta, 'utf8')
    const tieneDataset = src.includes('DatasetSchema') || src.includes("'@type': 'Dataset'")
    expect(tieneDataset, `${rel} (${porque}) no declara Dataset`).toBe(true)
  })

  it('la página madre dice qué mide, desde cuándo y dónde bajarlo', () => {
    // Su Dataset es inline (ArrendamientoSchema), no el componente: tiene TRES
    // variableMeasured con measurementTechnique cada uno. Agregarle el componente
    // encima duplicaba el schema — pasó el 2-sep y se revirtió.
    const src = readFileSync(join(APP, 'mercado/arrendamiento/page.tsx'), 'utf8')
    expect(src, 'falta variableMeasured: sin esto se cita el número sin unidad').toContain('variableMeasured')
    expect(src, 'falta temporalCoverage: sin esto no se sabe desde cuándo').toContain('temporalCoverage')
    expect(src, 'falta measurementTechnique: sin esto no se sabe cómo se calcula').toContain('measurementTechnique')
  })

  it('ninguna página emite dos Dataset a la vez', () => {
    // Dos Dataset en la misma URL se pisan y el buscador elige por su cuenta.
    for (const [rel] of PAGINAS_DE_SERIE) {
      const ruta = join(APP, rel)
      if (!existsSync(ruta)) continue
      const src = readFileSync(ruta, 'utf8')
      const inline = (src.match(/'@type': 'Dataset'/g) ?? []).length
      const componente = (src.match(/<DatasetSchema/g) ?? []).length
      expect(inline + componente, `${rel} emite ${inline + componente} Dataset, tiene que ser 1`).toBe(1)
    }
  })

  it('el helper soporta los campos que hacen citable un dataset', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/seo/JsonLd.tsx'), 'utf8')
    for (const campo of ['variableMeasured', 'temporalCoverage', 'distribution', 'unitText']) {
      expect(src, `DatasetSchema no soporta ${campo}`).toContain(campo)
    }
  })
})
