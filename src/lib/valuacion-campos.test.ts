import { describe, expect, it } from 'vitest'
import { TIERRA, tierraDe, valuarCampoTexto, zonasDe } from '@/lib/valuacion-campos'

/**
 * Corrientes por zona. Hasta 1.263.1, "Mercedes" y "Curuzú Cuatiá" caían al
 * promedio provincial (US$1.900) porque no había ninguna zona de Corrientes
 * ni tabla de departamentos: la sesión CAMPOS lo vio el 17-11-2026 al tasar
 * tres campos en esos dos departamentos.
 */
describe('Corrientes: departamentos → zona', () => {
  const ZONA = 'Centro-sur (Cuchillas)'

  it.each(['Mercedes', 'Curuzú Cuatiá', 'curuzu cuatia', 'Perugorría', 'Sauce', 'Felipe Yofre', 'Mariano I. Loza'])(
    '%s cae en el área de Cuchillas',
    (lugar) => {
      expect(tierraDe('Corrientes', lugar)?.zona).toBe(ZONA)
    },
  )

  it('el nombre de la zona también resuelve', () => {
    expect(tierraDe('Corrientes', 'Cuchillas')?.zona).toBe(ZONA)
  })

  it('un departamento sin zona relevada sigue en el valor provincial', () => {
    for (const lugar of ['Santo Tomé', 'Paso de los Libres', 'Bella Vista', 'Ituzaingó', 'NEA - campo de loma']) {
      const t = tierraDe('Corrientes', lugar)
      expect(t?.zona ?? null).toBeNull()
      expect(t?.usd_ha).toBe(1900)
    }
  })

  it('sin zona responde la fila provincial', () => {
    expect(tierraDe('Corrientes')?.zona ?? null).toBeNull()
  })

  it('Mercedes de Buenos Aires no se confunde con Mercedes de Corrientes', () => {
    expect(tierraDe('Buenos Aires', 'Mercedes')?.zona).toBe('Norte periurbano')
    expect(tierraDe('Corrientes', 'Mercedes')?.zona).toBe(ZONA)
  })

  it('la zona trae su fuente fechada y el rango publicado', () => {
    const t = tierraDe('Corrientes', 'Mercedes')!
    expect(t.fecha).toBe('2026-05')
    expect(t.fuente).toMatch(/Compañía Argentina de Tierras may-2026/)
    expect(t.p25).toBe(1200)
    expect(t.p75).toBe(1600)
    expect(t.usd_ha).toBe(1400)
    // El canon es el provincial y lo dice: no hay canon relevado para la zona.
    expect(t.canon_fuente).toMatch(/PROVINCIAL/)
  })

  it('el texto del MCP nombra la zona y no el promedio provincial', () => {
    const r = valuarCampoTexto({ provincia: 'Corrientes', zona: 'Curuzú Cuatiá', hectareas: 1000 })
    expect(r.encontrado).toBe(true)
    expect(r.texto).toContain('Valor de la hectárea en Centro-sur (Cuchillas), Corrientes: US$1.400.')
    expect(r.texto).toContain('Rango de referencia: US$1.200 a US$1.600')
  })

  it('Corrientes tiene una zona y cada fila de la base trae fuente y fecha', () => {
    expect(zonasDe('Corrientes').map((z) => z.zona)).toEqual([ZONA])
    for (const t of TIERRA.filter((x) => x.provincia === 'Corrientes')) {
      expect(t.fuente).toBeTruthy()
      expect(t.fecha).toMatch(/^\d{4}-\d{2}$/)
    }
  })
})
