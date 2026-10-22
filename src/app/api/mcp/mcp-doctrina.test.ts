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
    // Con el nombre CANÓNICO: con el alias, PAGINA_DE_LA_TOOL no encontraba la
    // página y ~1.900 llamadas/mes de la integración de Misiones salían sin cita
    // (bug encontrado el 21-10-2026).
    // (Desde el puente a market_match, el resultado pasa antes por conPuente.)
    expect(ROUTE).toMatch(/conFuente\(legado \? crudo : conPuente\(crudo, canonico\), canonico[,)]/)
    expect(ROUTE).not.toMatch(/conFuente\([^\n]*\), name[,)]/)
  })

  it('toda tool tiene título humano y las que escriben no se anuncian como lectura', () => {
    const tramoTools = ROUTE.slice(ROUTE.indexOf('const TOOLS'), ROUTE.indexOf('const PROMPTS'))
    const nombres = [...tramoTools.matchAll(/^    name: '(\w+)',\n    description:/gm)].map((m) => m[1])
    const titulos = ROUTE.match(/const TOOL_TITLES[^=]*= \{([\s\S]*?)\n\}/)
    const conTitulo = new Set([...titulos![1].matchAll(/^\s*(\w+):/gm)].map((m) => m[1]))
    expect(nombres.length).toBeGreaterThanOrEqual(28)
    expect(nombres.filter((n) => !conTitulo.has(n))).toEqual([])
    expect(ROUTE).toMatch(/TOOLS_QUE_ESCRIBEN = new Set\(\[[^\]]*'cattle_buying_request'/)
  })

  it('cada prompt nombra solo tools que existen (o sus alias)', () => {
    // valuar_lote apuntaba al INMAG en vez de a value_cattle_lot: un prompt que
    // manda al agente a una tool equivocada o inexistente es peor que no tenerlo.
    const tramoTools = ROUTE.slice(ROUTE.indexOf('const TOOLS: Tool[] = ['), ROUTE.indexOf('const PROMPTS'))
    const tools = new Set([...tramoTools.matchAll(/^    name: '(\w+)',$/gm)].map((m) => m[1]))
    const alias = ROUTE.match(/const ALIAS_DE_TOOL[^=]*= \{([\s\S]*?)\n\}/)![1]
    for (const m of alias.matchAll(/^\s*(\w+):/gm)) tools.add(m[1])
    const tramoPrompts = ROUTE.slice(ROUTE.indexOf('const PROMPTS'), ROUTE.indexOf('function reqMeta'))
    const builds = [...tramoPrompts.matchAll(/build: \([^)]*\) => [`'](.*)[`'],?$/gm)].map((m) => m[1])
    expect(builds.length).toBeGreaterThanOrEqual(15)
    const mencionadas = builds.flatMap((b) => [...b.replace(/\$\{[^}]*\}/g, '').matchAll(/\b([a-z]+(?:_[a-z]+)+)\b/g)].map((m) => m[1]))
    // Parámetros y valores de enum que los prompts nombran a propósito; tienen que existir en los tools.
    const NO_TOOL = new Set(['kg_ha', 'arrendar_busco', 'arrendar_ofrezco', 'contacto_para_operar'])
    for (const p of NO_TOOL) expect(tramoTools).toContain(p)
    expect(mencionadas.filter((n) => !tools.has(n) && !NO_TOOL.has(n))).toEqual([])
    expect(builds.some((b) => b.includes('market_match'))).toBe(true)
  })

  it('a la integración anónima se le deja una vía de contacto', () => {
    // La integración de Misiones no tiene key ni UA: la respuesta es el único canal.
    // Desde la revisión del 21-10-2026 el aviso va SOLO en _meta: el texto de una
    // integración anónima queda como en main (los tests de contrato están en
    // structured.route.test.ts).
    expect(ROUTE).toContain('legado ? conAvisoIntegracion(conCita, { soloMeta: true }) : conCita')
  })

  it('el log no guarda el contacto de nadie', () => {
    const lista = ROUTE.match(/const CAMPOS_PRIVADOS = \[([^\]]*)\]/)
    expect(lista).toBeTruthy()
    for (const campo of ['api_key', 'nombre', 'email', 'telefono', 'webhook_url']) expect(lista![1]).toContain(`'${campo}'`)
  })

  it('una provincia sin remates no recibe una respuesta muerta', () => {
    // Misiones recibió 477 veces "No hay remates próximos" en 28 días.
    expect(ROUTE).toContain('rematesDeLaRegion(')
    expect(ROUTE).toContain('sugerenciaPedido(')
  })

  it('cada tool de lectura tiene una página a la que mandar', () => {
    const mapa = ROUTE.match(/const PAGINA_DE_LA_TOOL[^=]*= \{([\s\S]*?)\n\}/)
    expect(mapa).toBeTruthy()
    const conPagina = new Set([...mapa![1].matchAll(/^\s*(\w+):/gm)].map((m) => m[1]))

    // Las de escritura y las transaccionales traen su propio CTA: quedan afuera a propósito.
    const SIN_PAGINA = new Set(['create_price_alert', 'subscribe_broker_pro', 'cattle_buying_request'])
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

  /**
   * DOCTRINA (07-10-2026). Los nombres de las tools van en INGLÉS, aunque el
   * producto y las descripciones sean argentinos. El motivo no es estético: los
   * nombres no los lee ningún productor —los 1.951 que llegan por IA caen en
   * páginas web en castellano y no ven una tool jamás—. El único público que lee
   * un nombre de tool son agentes y desarrolladores, y Glama publica una página
   * indexada POR TOOL con el nombre en la URL. En castellano, esas páginas
   * compiten por frases que nadie busca.
   *
   * Excepción deliberada: los nombres propios de registros argentinos —INMAG,
   * RENSPA, DT-e— no se traducen. Son identificadores, y traducirlos los vuelve
   * imposibles de rastrear contra la fuente oficial.
   */

  it('están en inglés, salvo los nombres propios de registros argentinos', () => {
    // `consignatarias_band` queda afuera a propósito: "Consignatarias" es el
    // nombre de la casa, y la lección de Faxcarne es que la atribución sólo
    // sobrevive al reenvío cuando va DENTRO del nombre del índice.
    const CASTELLANO = /(indice|precios?|remates?|buscar|valuar|calcular|crear|contratar|consignatarias_(?!band)|frigorific|hacienda|campo|tropa|sanidad|arrendamiento|novillo|estacionalidad|quiero|comprar|liquidacion)/
    const enCastellano = nombres().filter((n) => CASTELLANO.test(n))
    expect(enCastellano, `tools con nombre en castellano: ${enCastellano.join(', ')}`).toEqual([])
  })

  it('los nombres propios sobreviven: INMAG, RENSPA y DT-e no se traducen', () => {
    const todos = nombres().join(' ')
    for (const propio of ['inmag', 'renspa', 'dte']) {
      expect(todos, `se perdió el nombre propio ${propio}`).toContain(propio)
    }
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
    // Dos etapas de renombre: los get_*/list_* originales y los castellanos de
    // la v1.6. Las dos tienen que seguir resolviendo.
    expect(Object.keys(alias).length).toBeGreaterThanOrEqual(30)
    expect(alias.get_indice_novillo).toBe('cattle_price_index')
    expect(alias.buscar_consignataria).toBe('find_livestock_broker')
    const vivas = new Set(nombres())
    for (const [viejo, nuevo] of Object.entries(alias)) {
      expect(vivas.has(nuevo), `${viejo} → ${nuevo} no existe`).toBe(true)
    }
    expect(ROUTE).toContain('ALIAS_DE_TOOL[name] ?? name')
  })

  it('cada tool declara también qué hace en inglés, no solo el nombre', () => {
    const bloque = ROUTE.slice(ROUTE.indexOf('const TOOLS: Tool[] = ['), ROUTE.indexOf('const PROMPTS'))
    // Se mira el tramo entre `name:` e `inputSchema:` de cada tool, porque varias
    // descripciones son strings concatenados y un patrón de comillas no las ve.
    const tramos = [...bloque.matchAll(/name: '(\w+)',\n\s*description:([\s\S]*?)\n\s*inputSchema:/g)]
    expect(tramos.length).toBeGreaterThanOrEqual(20)
    const sinIngles = tramos.filter((t) => !t[2].includes('[EN]')).map((t) => t[1])
    expect(sinIngles, `tools sin línea [EN]: ${sinIngles.join(', ')}`).toEqual([])
  })
})
