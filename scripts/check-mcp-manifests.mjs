/**
 * check-mcp-manifests — coherencia de las tres copias del manifiesto MCP.
 *
 * POR QUÉ EXISTE
 * El manifiesto vive en tres archivos y cada uno se rompe distinto:
 *
 *   mcp-registry/server.json            ← el que se PUBLICA (`mcp-publisher publish`)
 *   server.json                         ← copia en la raíz
 *   public/.well-known/mcp/server.json  ← descubrimiento: lo lee un cliente MCP
 *
 * Los tres errores que ya cometimos, cada uno ahora con su check:
 *   1. Publicar una versión que no coincide con la del repo (el bump quedó a medias).
 *   2. Pasarse de los 100 caracteres que el REGISTRY acepta como descripción.
 *   3. Pisar la descripción larga del `.well-known` con la corta del registry.
 *      El cap de 100 es del registry y NO aplica acá: el `.well-known` es la
 *      superficie que un cliente lee al descubrir el server y admite texto largo.
 *   4. Dejar la server card (`.well-known/mcp/server-card.json`) vieja: en oct-2026 decía
 *      v1.5.0 y 24 tools con los nombres en castellano de antes, y eso mostraba Smithery.
 *
 * QUÉ NO CUBRE (explícito)
 *   • No valida contra el JSON Schema oficial (requiere red; el publisher ya lo hace).
 *   • No compara con lo que está publicado en el registry (requiere red).
 *   • No resuelve la divergencia de `$schema` entre mcp-registry/ y la raíz: son
 *     schemas distintos a propósito hasta que se decida cuál adoptar. Solo exige
 *     que name/version/description coincidan, que es lo que rompe una publicación.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const raíz = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** El que se publica. El cap de 100 caracteres sale de la API del registry. */
const PUBLICADO = 'mcp-registry/server.json'
const COPIA_RAIZ = 'server.json'
const WELL_KNOWN = 'public/.well-known/mcp/server.json'
/** Server card: la leen Smithery y los escáneres sin handshake. Versión + tools en sync. */
const SERVER_CARD = 'public/.well-known/mcp/server-card.json'
const ROUTE = 'src/app/api/mcp/route.ts'
const CAP_REGISTRY = 100
/** Piso del `.well-known`: si bajó de acá, alguien le pegó la descripción corta. */
const MIN_WELL_KNOWN = 200

const leer = (rel) => {
  try {
    return JSON.parse(readFileSync(resolve(raíz, rel), 'utf8'))
  } catch (e) {
    return { __error: e.message }
  }
}

const errores = []
const avisos = []

const pub = leer(PUBLICADO)
const root = leer(COPIA_RAIZ)
const wk = leer(WELL_KNOWN)

for (const [rel, d] of [[PUBLICADO, pub], [COPIA_RAIZ, root], [WELL_KNOWN, wk]]) {
  if (d.__error) errores.push(`${rel}: no se pudo leer — ${d.__error}`)
}

if (errores.length === 0) {
  // 1. name y version iguales en los tres
  for (const campo of ['name', 'version']) {
    const vals = new Set([pub[campo], root[campo], wk[campo]])
    if (vals.size !== 1) {
      errores.push(
        `\`${campo}\` no coincide entre las tres copias: ` +
          `${PUBLICADO}=${pub[campo]} · ${COPIA_RAIZ}=${root[campo]} · ${WELL_KNOWN}=${wk[campo]}`,
      )
    }
  }

  // 2. cap del registry en los dos que se publican
  for (const [rel, d] of [[PUBLICADO, pub], [COPIA_RAIZ, root]]) {
    const n = (d.description ?? '').length
    if (n > CAP_REGISTRY) {
      errores.push(`${rel}: descripción de ${n} caracteres, el registry acepta ${CAP_REGISTRY}.`)
    }
  }
  if ((pub.description ?? '') !== (root.description ?? '')) {
    errores.push(`La descripción de ${PUBLICADO} y ${COPIA_RAIZ} difiere — se publica la primera.`)
  }

  // 3. el .well-known NO debe quedar con la descripción corta
  const nwk = (wk.description ?? '').length
  if (nwk < MIN_WELL_KNOWN) {
    errores.push(
      `${WELL_KNOWN}: descripción de ${nwk} caracteres. Es la superficie de descubrimiento y ` +
        `NO tiene el cap de ${CAP_REGISTRY} — parece pisada con la versión corta del registry.`,
    )
  }

  // 4. el endpoint remoto tiene que estar y ser https
  const remote = (pub.remotes ?? [])[0]
  if (!remote) errores.push(`${PUBLICADO}: sin \`remotes\` — el registry exige un endpoint.`)
  else if (!String(remote.url ?? '').startsWith('https://')) {
    errores.push(`${PUBLICADO}: el remote no es https (${remote.url}).`)
  }

  // 5. La server card (`/.well-known/mcp/server-card.json`) es lo que Smithery y otros
  //    escáneres leen cuando no pueden (o no quieren) hacer el handshake. En oct-2026 seguía
  //    en v1.5.0 con 24 tools y nombres viejos, y Smithery mostraba eso. Tiene que coincidir
  //    en versión con el manifiesto y declarar EXACTAMENTE las tools del route.
  const card = leer(SERVER_CARD)
  if (card.__error) {
    errores.push(`${SERVER_CARD}: no se pudo leer — ${card.__error}`)
  } else {
    if (card.name !== pub.name) errores.push(`${SERVER_CARD}: name=${card.name}, el manifiesto dice ${pub.name}.`)
    if (card.version !== pub.version) {
      errores.push(`${SERVER_CARD}: version=${card.version}, el manifiesto está en ${pub.version}.`)
    }
    try {
      const route = readFileSync(resolve(raíz, ROUTE), 'utf8')
      const vRoute = route.match(/const SERVER_INFO = \{[\s\S]*?version: '([^']+)'/)?.[1]
      if (vRoute && vRoute !== pub.version) {
        errores.push(`${ROUTE}: SERVER_INFO.version=${vRoute}, el manifiesto está en ${pub.version}.`)
      }
      // Mismo recorte que mcp-doctrina.test.ts: sólo el array TOOLS (PROMPTS usa `name` igual).
      const bloque = route.slice(route.indexOf('const TOOLS: Tool[] = ['), route.indexOf('const PROMPTS'))
      const enRoute = new Set([...bloque.matchAll(/^\s{4}name: '(\w+)',$/gm)].map((m) => m[1]))
      const enCard = new Set((card.tools ?? []).map((t) => t.name))
      const faltan = [...enRoute].filter((n) => !enCard.has(n))
      const sobran = [...enCard].filter((n) => !enRoute.has(n))
      if (faltan.length) errores.push(`${SERVER_CARD}: faltan tools del route: ${faltan.join(', ')}.`)
      if (sobran.length) errores.push(`${SERVER_CARD}: tools que el route no declara: ${sobran.join(', ')}.`)
    } catch (e) {
      errores.push(`${ROUTE}: no se pudo leer — ${e.message}`)
    }
  }

  // 6. CLAUDE.md declara la versión del registry: que no quede vieja
  try {
    const cm = readFileSync(resolve(raíz, 'CLAUDE.md'), 'utf8')
    const m = cm.match(/cattle-market` v(\d+\.\d+\.\d+)/)
    if (m && m[1] !== pub.version) {
      avisos.push(`CLAUDE.md declara v${m[1]} y el manifiesto está en v${pub.version}.`)
    }
  } catch {
    /* CLAUDE.md es opcional para este check */
  }
}

if (errores.length) {
  console.error('✗ check-mcp-manifests:')
  for (const e of errores) console.error(`  · ${e}`)
  process.exit(1)
}
for (const a of avisos) console.warn(`⚠ check-mcp-manifests: ${a}`)
console.log(
  `✓ check-mcp-manifests: OK — v${pub.version}, ` +
    `registry ${(pub.description ?? '').length}/${CAP_REGISTRY} chars, ` +
    `.well-known ${(wk.description ?? '').length} chars.`,
)
