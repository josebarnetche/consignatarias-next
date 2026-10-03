import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { jsonLd } from './json-ld'

const SRC = join(__dirname, '../..')
function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? archivos(p) : /\.(tsx?|jsx?)$/.test(n) ? [p] : []
  })
}

describe('jsonLd', () => {
  it('no deja cerrar el <script> con texto de usuario', () => {
    const payload = { sameAs: 'https://x.com/</script><script>alert(1)</script>' }
    const out = jsonLd(payload)
    expect(out).not.toMatch(/<\/script/i)
    expect(out).not.toContain('<')
    expect(JSON.parse(out)).toEqual(payload)
  })

  it('escapa & > y los separadores de línea U+2028/U+2029 sin cambiar el contenido', () => {
    const payload = { a: 'Faena & Invernada > 300 kg', b: 'línea\u2028otra\u2029fin' }
    const out = jsonLd(payload)
    expect(out).not.toMatch(/[&>\u2028\u2029]/)
    expect(JSON.parse(out)).toEqual(payload)
  })

  it('todo JSON-LD del sitio pasa por jsonLd() (nunca JSON.stringify directo)', () => {
    const malos = archivos(SRC).filter((p) => /__html:\s*JSON\.stringify\(/.test(readFileSync(p, 'utf8')))
    expect(malos).toEqual([])
  })
})
