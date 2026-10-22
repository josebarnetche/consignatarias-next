import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Las superficies que leen los agentes y los directorios nombran TODAS las tools del route.
 *
 * Por qué existe: en oct-2026 /llms.txt listaba 24 de 28 (faltaban price_seasonality,
 * international_price_gap, farmland_yield y consignatarias_band, justo las que se agregaron
 * para el comprador del exterior), /llms-full.txt 15 y la página /mcp usaba dos alias viejos
 * en castellano. Nadie lo nota: el server sigue respondiendo 200 y el directorio muestra menos
 * de lo que hay. La server card la cubre `scripts/check-mcp-manifests.mjs`.
 */
const leer = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8')

const ROUTE = leer('src/app/api/mcp/route.ts')
const bloque = ROUTE.slice(ROUTE.indexOf('const TOOLS: Tool[] = ['), ROUTE.indexOf('const PROMPTS'))
const TOOLS = [...bloque.matchAll(/^\s{4}name: '(\w+)',$/gm)].map((m) => m[1])

describe('superficies del MCP', () => {
  it('el route declara tools (si el recorte falla, el resto de los tests no prueba nada)', () => {
    expect(TOOLS.length).toBeGreaterThanOrEqual(20)
  })

  it('/llms.txt nombra cada tool', () => {
    const txt = leer('src/app/llms.txt/route.ts')
    const faltan = TOOLS.filter((t) => !txt.includes(`\\\`${t}\\\``))
    expect(faltan, `faltan en /llms.txt: ${faltan.join(', ')}`).toEqual([])
  })

  it('cada tool tiene título humano (el directorio de conectores de Claude lo exige)', () => {
    const bloqueTitulos = ROUTE.slice(ROUTE.indexOf('const TOOL_TITLES'), ROUTE.indexOf('function toolAnnotations'))
    const conTitulo = new Set([...bloqueTitulos.matchAll(/^\s+(\w+): '[^']+',$/gm)].map((m) => m[1]))
    const sinTitulo = TOOLS.filter((t) => !conTitulo.has(t))
    expect(sinTitulo, `tools sin título: ${sinTitulo.join(', ')}`).toEqual([])
  })

  it('las tools que escriben no se declaran readOnly', () => {
    // cattle_buying_request deja una demanda que trabaja el agente de operaciones: escribe.
    const escriben = ROUTE.match(/const TOOLS_QUE_ESCRIBEN = new Set\(\[([^\]]*)\]\)/)
    expect(escriben).toBeTruthy()
    expect(escriben![1]).toContain("'create_price_alert'")
    expect(escriben![1]).toContain("'cattle_buying_request'")
    const card = JSON.parse(leer('public/.well-known/mcp/server-card.json')) as {
      tools: Array<{ name: string; annotations?: { readOnlyHint?: boolean } }>
    }
    for (const t of card.tools.filter((x) => ['create_price_alert', 'cattle_buying_request'].includes(x.name))) {
      expect(t.annotations?.readOnlyHint, `${t.name} en la server card`).toBe(false)
    }
  })

  it('la página /mcp lista cada tool con su nombre canónico', () => {
    const page = leer('src/app/(terminal)/mcp/page.tsx')
    const enPagina = new Set([...page.matchAll(/\{ name: '(\w+)', desc:/g)].map((m) => m[1]))
    const faltan = TOOLS.filter((t) => !enPagina.has(t))
    const sobran = [...enPagina].filter((t) => !TOOLS.includes(t))
    expect(faltan, `faltan en /mcp: ${faltan.join(', ')}`).toEqual([])
    expect(sobran, `nombres que el route no declara (¿alias?): ${sobran.join(', ')}`).toEqual([])
  })
})
