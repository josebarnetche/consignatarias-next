import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { srcClaro } from './marca-claro'

const PUBLIC = join(__dirname, '../../../public')

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? archivos(p) : [p]
  })
}

describe('srcClaro', () => {
  it('apunta a la variante -claro de las familias de marca', () => {
    expect(srcClaro('/marca/ilus/ilu-pampa.jpg')).toBe('/marca/ilus/ilu-pampa-claro.jpg')
    expect(srcClaro('/marca/iconos-color/alerta.png')).toBe('/marca/iconos-color/alerta-claro.png')
    expect(srcClaro('/marca/hero-pampa-mobile.webp')).toBe('/marca/hero-pampa-mobile-claro.webp')
    expect(srcClaro('/marca/martillazo.svg')).toBe('/marca/martillazo-claro.svg')
  })

  it('deja sin variante lo que no es de marca o no tiene tema', () => {
    expect(srcClaro('/logos/colombo.png')).toBeNull()
    expect(srcClaro('/marca/email/isotipo-cielo.png')).toBeNull()
    expect(srcClaro('/og-image.png')).toBeNull()
    expect(srcClaro(undefined)).toBeNull()
  })

  it('cada imagen de marca con variante tiene su archivo -claro (correr scripts/marca-variantes-claro.sh)', () => {
    const faltan = archivos(join(PUBLIC, 'marca'))
      .map((p) => '/' + relative(PUBLIC, p).split('\\').join('/'))
      .filter((u) => !/-claro\.[a-z]+$/.test(u))
      .map((u) => srcClaro(u))
      .filter((c): c is string => !!c && !existsSync(join(PUBLIC, c)))
    expect(faltan).toEqual([])
  })
})
