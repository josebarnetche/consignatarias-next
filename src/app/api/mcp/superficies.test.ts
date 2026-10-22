import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const leer = (ruta: string) => readFileSync(join(process.cwd(), ruta), 'utf8')

const ROUTE = leer('src/app/api/mcp/route.ts')

/**
 * Las superficies del MCP, sincronizadas por test.
 *
 * El 21-10-2026 `llms.txt` y `llms-full.txt` listaban 24 tools cuando el server
 * tenía 29 (faltaban consignatarias_band, international_price_gap,
 * price_seasonality, farmland_yield y market_match), y /mcp mostraba alias en
 * castellano como si fueran tools. Nadie lo notó porque nada falla: el server
 * sigue respondiendo y las páginas siguen renderizando.
 *
 * La fuente de verdad es el array `TOOLS` de route.ts. Cada nombre que esté ahí
 * tiene que aparecer, con su nombre canónico, en las otras tres superficies.
 */
function toolsCanonicas(): string[] {
  const inicio = ROUTE.indexOf('const TOOLS: Tool[] = [')
  const fin = ROUTE.indexOf('const PROMPTS', inicio)
  if (inicio < 0 || fin < 0) throw new Error('No encontré el array TOOLS en route.ts')
  const bloque = ROUTE.slice(inicio, fin)
  // Las tools se declaran a 4 espacios de indentación; los `name:` más
  // profundos (dentro de los run) no son tools.
  return [...bloque.matchAll(/^ {4}name: '([a-z0-9_]+)'/gm)].map((m) => m[1])
}

/** Coincidencia exacta: `value_farmland` no vale por aparecer dentro de `value_farmland_rent`. */
function aparece(texto: string, nombre: string): boolean {
  return new RegExp(`(?<![a-z0-9_])${nombre}(?![a-z0-9_])`).test(texto)
}

const SUPERFICIES = {
  'llms.txt': 'src/app/llms.txt/route.ts',
  'llms-full.txt': 'src/app/llms-full.txt/route.ts',
  '/mcp': 'src/app/(terminal)/mcp/page.tsx',
} as const

describe('superficies del MCP sincronizadas con route.ts', () => {
  const tools = toolsCanonicas()

  it('el array TOOLS de route.ts se puede leer y no tiene duplicados', () => {
    expect(tools.length).toBeGreaterThanOrEqual(29)
    expect(new Set(tools).size).toBe(tools.length)
    expect(tools).toContain('market_match')
  })

  for (const [superficie, ruta] of Object.entries(SUPERFICIES)) {
    it(`${superficie} lista todas las tools con su nombre canónico`, () => {
      const texto = leer(ruta)
      const faltan = tools.filter((t) => !aparece(texto, t))
      expect(faltan, `faltan en ${ruta}`).toEqual([])
    })
  }

  it('/mcp no presenta alias como si fueran tools', () => {
    const pagina = leer(SUPERFICIES['/mcp'])
    const nombresListados = [...pagina.matchAll(/\{ name: '([a-z0-9_]+)', desc:/g)].map((m) => m[1])
    expect(nombresListados.filter((n) => !tools.includes(n))).toEqual([])
    expect(nombresListados.length).toBe(tools.length)
  })
})
