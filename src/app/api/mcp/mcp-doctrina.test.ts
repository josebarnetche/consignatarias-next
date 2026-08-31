import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROUTE = readFileSync(join(process.cwd(), 'src/app/api/mcp/route.ts'), 'utf8')

/**
 * La doctrina del MCP, sostenida por tests.
 *
 * Se escribió el 31-ago-2026 después de medir el server por primera vez en serio:
 * de 100.526 llamadas, 97.290 eran handshake de ~20 crawlers de registries y sólo
 * 3.240 uso real — anónimo, sin una sola visita atribuible al sitio, y con la única
 * tool de captura exigiendo un webhook que ningún productor tiene.
 *
 * Cada regla de acá abajo se rompe sola con un cambio bienintencionado, y romperla
 * no se nota: el server sigue respondiendo 200.
 */
describe('doctrina del server MCP', () => {
  it('la alerta no exige webhook: un productor no tiene uno', () => {
    // El param que sirve a una persona es `email`. Si `webhook_url` vuelve a ser
    // obligatorio, la única tool de escritura queda otra vez sólo para developers.
    expect(ROUTE).toContain("required: ['categoria', 'umbral']")
    expect(ROUTE).not.toContain("required: ['categoria', 'umbral', 'webhook_url']")
  })

  it('acepta email o webhook, pero no deja crear una alerta sin destino', () => {
    expect(ROUTE).toContain('if (!email && !webhook)')
  })

  it('las tools de consulta devuelven la fuente con UTM', () => {
    // Sin esto el agente se queda con el dato y nosotros no existimos: el tráfico
    // no llega al sitio, que es donde están los productos que sí cobran.
    expect(ROUTE).toContain('utm_source=mcp')
    expect(ROUTE).toContain('conFuente(await tool.run(args, req), name)')
  })

  it('cada tool de lectura tiene una página a la que mandar', () => {
    const mapa = ROUTE.match(/const PAGINA_DE_LA_TOOL[^=]*= \{([\s\S]*?)\n\}/)
    expect(mapa).toBeTruthy()
    const conPagina = new Set([...mapa![1].matchAll(/^\s*(\w+):/gm)].map((m) => m[1]))

    // Las de escritura y las transaccionales traen su propio CTA: quedan afuera a propósito.
    const SIN_PAGINA = new Set(['crear_alerta_precio', 'contratar_pro_consignataria', 'quiero_comprar'])
    // Sólo el array TOOLS: PROMPTS declara `name` con la misma forma y no son tools.
    const bloque = ROUTE.slice(ROUTE.indexOf('const TOOLS: Tool[] = ['), ROUTE.indexOf('const PROMPTS'))
    const declaradas = [...bloque.matchAll(/^\s{4}name: '(\w+)',$/gm)].map((m) => m[1])
    const huerfanas = declaradas.filter((t) => !conPagina.has(t) && !SIN_PAGINA.has(t))

    expect(huerfanas, `tools sin página de destino: ${huerfanas.join(', ')}`).toEqual([])
  })

  it('el origen se hashea: agrupa sesiones, no identifica personas', () => {
    expect(ROUTE).toContain('function origenId')
    expect(ROUTE).toContain('createHash')
    // La IP cruda nunca debe salir del hash hacia el identificador de origen.
    expect(ROUTE).not.toMatch(/origen:\s*(ip|clientIp)/)
  })
})

/**
 * El techo de profundidad histórica es lo ÚNICO que el server cobra en la superficie
 * de lectura. Se puso el 31-ago-2026 con el dato en la mano: toca 6 de 350 llamadas
 * reales. Las reglas de acá abajo son las que lo hacen tolerable — sin ellas es
 * simplemente una puerta cerrada, y una puerta cerrada nos saca de las citas.
 */
describe('el techo de profundidad histórica', () => {
  it('recorta y lo declara: nunca niega la consulta', () => {
    // Si esto se vuelve un `fail(...)`, el agente se queda sin nada que mostrar y
    // deja de llamar la tool. El preview recortado es la única forma que vende.
    expect(ROUTE).toContain('notaDeRecorte')
    expect(ROUTE).toContain('recortado: true')
  })

  it('marca el recorte en el JSON, no sólo en la prosa', () => {
    // Un agente no debería tener que parsear castellano para saber que la serie
    // que recibió está incompleta.
    expect(ROUTE).toContain('ruedas_ocultas')
    expect(ROUTE).toContain('desde_pedido')
  })

  it('una key inválida no degrada a gratis en silencio', () => {
    expect(ROUTE).toContain('autorizacionEnterprise')
    expect(ROUTE).toContain("if ('error' in auth) return fail(auth.error)")
  })

  it('el techo no se aplica a ninguna otra tool de lectura', () => {
    // La profundidad de la serie es la excepción, no el comienzo de una tendencia.
    const usos = ROUTE.match(/aplicarTecho\(/g) ?? []
    expect(usos.length).toBe(1)
  })
})
