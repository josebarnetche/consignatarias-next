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
 * DE-GATEO (03-10-2026, decisión de Jose). El server ya no cobra NADA en la superficie
 * de consulta. El techo de profundidad existió entre el 31-ago y el 03-oct: la medición
 * de 89 días mostró que tocaba 22 llamadas de 11.231 (4 orígenes, todos escáneres de
 * directorios), y que el 98,2% del uso era anónimo sin un solo pago. Un techo que no
 * defiende nada y sí nos saca de las citas se saca.
 *
 * Lo que SÍ se sigue cobrando es la DESCARGA MASIVA fila por fila (/api/x402/* y los
 * exports Enterprise) y la REDISTRIBUCIÓN (/licencia-datos): es donde cobra el sector
 * (NYSE US$1.000/mes de redistribución contra US$50 el asiento), y es lo único que
 * protege el activo propio — la serie empalmada desde 2015 y la banda VR.
 */
describe('las tools responden sin techo ni cupo (de-gateo)', () => {
  it('ninguna tool de lectura recorta por profundidad', () => {
    // aplicarTecho queda invocado con autorizado=true: la consulta va completa para
    // cualquiera. Si alguien vuelve a pasarle el flag de auth, esto se rompe.
    expect(ROUTE).toContain('aplicarTecho(pedido, true)')
    expect(ROUTE).not.toMatch(/aplicarTecho\(\s*pedido\s*,\s*auth\.autorizado\s*\)/)
  })

  it('la serie de dispersión va completa', () => {
    expect(ROUTE).not.toMatch(/auth\.autorizado\s*\?\s*pedidos\s*:\s*Math\.min/)
  })

  it('las valuaciones no tienen cupo diario', () => {
    // El cálculo es local y sin I/O: el tope solo nos quitaba uso.
    expect(ROUTE).not.toContain("action: 'mcp_valuacion'")
    expect(ROUTE).not.toContain('cupoValuacionMsg')
  })

  it('una key inválida no degrada a gratis en silencio', () => {
    // Sigue valiendo: el que cree estar autenticado tiene que enterarse de que no lo está.
    expect(ROUTE).toContain('autorizacionEnterprise')
    expect(ROUTE).toContain("if ('error' in auth) return fail(auth.error)")
  })

  it('la descarga masiva y la redistribución siguen siendo lo pago', () => {
    // Es la única frontera que queda. Si desaparece de la copia, el activo propio
    // (serie empalmada 2015→, banda VR) queda sin ninguna defensa declarada.
    expect(ROUTE).toContain('/api/x402/inmag-historico')
    expect(ROUTE).toMatch(/descarga masiva/i)
  })

  it('los cupos anti-abuso de ESCRITURA siguen en pie', () => {
    // De-gatear la lectura no es abrir la escritura: alertas y demanda crean filas,
    // mandan mail y se pueden usar para spamear.
    expect(ROUTE).toContain("action: 'mcp_alerta_free'")
    expect(ROUTE).toContain("action: 'demanda_compra'")
  })
})

/**
 * Naming. La review automática de Glama (4,1/5, octubre 2026) marcó lo único
 * concreto que se podía arreglar: mezclábamos inglés y español en los nombres y
 * los patrones eran inconsistentes. La regla quedó fijada acá para que no vuelva
 * a desprolijarse, y con ella la promesa de no romper a quien ya nos usaba.
 */
describe('naming de las tools', () => {
  const nombres = () => {
    const bloque = ROUTE.slice(ROUTE.indexOf('const TOOLS: Tool[] = ['), ROUTE.indexOf('const PROMPTS'))
    return [...bloque.matchAll(/^\s{4}name: '(\w+)',$/gm)].map((m) => m[1])
  }

  it('ninguna tool arranca con un verbo en inglés', () => {
    const ingles = nombres().filter((n) => /^(get|list|fetch|search|create|find)_/.test(n))
    expect(ingles, `nombres en inglés: ${ingles.join(', ')}`).toEqual([])
  })

  it('todas son snake_case', () => {
    const raras = nombres().filter((n) => !/^[a-z][a-z0-9_]*$/.test(n))
    expect(raras).toEqual([])
  })

  it('los nombres viejos siguen resolviendo: renombrar no puede romper a un cliente ajeno', () => {
    const mapa = ROUTE.match(/const ALIAS_DE_TOOL: Record<string, string> = \{([\s\S]*?)\n\}/)
    expect(mapa).toBeTruthy()
    const alias = Object.fromEntries(
      [...mapa![1].matchAll(/^\s*(\w+): '(\w+)',$/gm)].map((m) => [m[1], m[2]]),
    )
    expect(Object.keys(alias).length).toBeGreaterThanOrEqual(8)
    // Cada alias tiene que apuntar a una tool que exista hoy.
    const vivas = new Set(nombres())
    for (const [viejo, nuevo] of Object.entries(alias)) {
      expect(vivas.has(nuevo), `${viejo} → ${nuevo} no existe`).toBe(true)
    }
    // Y la resolución tiene que estar cableada en tools/call.
    expect(ROUTE).toContain('ALIAS_DE_TOOL[name] ?? name')
  })
})
