/**
 * Lotes de hacienda publicados por deCampoaCampo (dCaC).
 *
 * QUÉ SE TOMA Y QUÉ NO
 * Solo los lotes que dCaC linkea desde sus DOS páginas públicas de precios
 * (invernada y Cañuelas). Cada una muestra 6 lotes a la vez, así que el catálogo
 * se ACUMULA con las corridas diarias. Los sku son secuenciales (33986, 33962…)
 * y recorrer el rango daría la base entera: no se hace. Se toma lo publicado,
 * no lo adivinable.
 *
 * El dato sale del JSON-LD `Product` que cada ficha publica para los crawlers
 * (name, image, description, sku, brand, offers) — no de raspar el maquetado,
 * que cambia y miente. Si dCaC saca el JSON-LD, el scraper deja de encontrar
 * lotes y lo dice, en vez de inventar un parseo frágil.
 *
 * NO se copian fotos: se guarda la URL pública que ellos mismos declaran en el
 * JSON-LD. Cada lote se publica con atribución y enlace a la ficha original.
 * El precio NO se toma: nosotros aportamos la referencia de mercado (banda VR),
 * que es lo nuestro.
 */

const BASE = 'https://www.decampoacampo.com'
const PAGINAS = [
  `${BASE}/__dcac/outside/precios/invernada`,
  `${BASE}/__dcac/outside/canuelas/precios`,
]
// Identificarse y dejar contacto es lo correcto al leer el sitio de un tercero.
const UA = 'ConsignatariasBot/1.0 (+https://www.consignatarias.com.ar/mcp; agro@memola.com.ar)'
const PAUSA_MS = 1200
const DIAS_ACTIVO = 21

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

async function bajar(url) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 20_000)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: ctrl.signal })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

/** Los links de ficha que la página pública muestra hoy. */
function enlacesDeLotes(html) {
  const vistos = new Set()
  for (const m of html.matchAll(/href="(\/__dcac\/\d[^"]*-(\d+))"/g)) vistos.add(m[1])
  return [...vistos]
}

/** JSON-LD Product de la ficha. Devuelve null si no está (y eso es un hallazgo, no un error). */
function productoJsonLd(html) {
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1].trim())
      const nodos = Array.isArray(j) ? j : j['@graph'] ? j['@graph'] : [j]
      const p = nodos.find((n) => n && (n['@type'] === 'Product' || n['@type']?.includes?.('Product')))
      if (p) return p
    } catch {
      /* un bloque mal formado no invalida los demás */
    }
  }
  return null
}

const CATEGORIAS = [
  ['vacas con cria', 'vacas_con_cria'], ['vacas prenadas', 'vacas_prenadas'], ['vacas preñadas', 'vacas_prenadas'],
  ['vaquillonas prenadas', 'vaquillonas_prenadas'], ['vaquillonas preñadas', 'vaquillonas_prenadas'],
  ['vaquillonas para madre', 'vaquillonas_madre'], ['terneros y terneras', 'terneros'],
  ['novillitos', 'novillitos'], ['novillos', 'novillos'], ['vaquillonas', 'vaquillonas'],
  ['terneras', 'terneras'], ['terneros', 'terneros'], ['vacas', 'vacas'], ['toros', 'toros'],
]

/** Categoría canónica a partir del título del lote. */
function categoriaDe(titulo) {
  const t = titulo.toLowerCase()
  for (const [aguja, codigo] of CATEGORIAS) if (t.includes(aguja)) return codigo
  return null
}

const PROVINCIAS = [
  'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa',
  'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tucumán',
]
const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Provincia mencionada en la descripción ("de la zona de Chaco"). null si no la declara. */
function provinciaDe(texto) {
  const t = sinTildes(texto || '')
  for (const p of PROVINCIAS) if (t.includes(sinTildes(p))) return p
  return null
}

/** Un lote normalizado a partir de su ficha. */
function lote(url, p) {
  const titulo = String(p.name || '').trim()
  if (!titulo) return null
  const sku = String(p.sku || p.mpn || url.match(/-(\d+)$/)?.[1] || '').trim()
  if (!sku) return null
  const desc = String(p.description || '').trim()
  const cabezas = Number(titulo.match(/^(\d+)\s/)?.[1]) || null
  const kg = Number(titulo.match(/(\d+)\s*kg/i)?.[1]) || null
  const imagen = (Array.isArray(p.image) ? p.image[0] : p.image) || null
  return {
    sku,
    titulo,
    categoria: categoriaDe(titulo),
    cabezas,
    kg_promedio: kg,
    raza: String(p.brand?.name || '').trim() || null,
    provincia: provinciaDe(desc) || provinciaDe(titulo),
    descripcion: desc || null,
    imagen_url: imagen,
    url: url.startsWith('http') ? url : BASE + url,
    fuente: 'deCampoaCampo',
  }
}

/**
 * Corre la pasada del día y devuelve el catálogo mergeado con el que ya había.
 * Nunca borra: un lote que dejó de publicarse queda con `activo:false` y su
 * `ultima_vez`, que es justamente el dato de cuánto duró en vidriera.
 */
export async function scrapeLotesDcac(previo = []) {
  const hoy = new Date().toISOString().slice(0, 10)
  const porSku = new Map(previo.map((l) => [String(l.sku), l]))
  const fichas = new Set()

  for (const pagina of PAGINAS) {
    const html = await bajar(pagina)
    if (!html) {
      console.warn(`  ⚠ dCaC: no respondió ${pagina}`)
      continue
    }
    const enlaces = enlacesDeLotes(html)
    if (enlaces.length === 0) console.warn(`  ⚠ dCaC: 0 fichas en ${pagina} (¿cambió el maquetado?)`)
    enlaces.forEach((e) => fichas.add(e))
    await dormir(PAUSA_MS)
  }

  let nuevos = 0
  let sinJsonLd = 0
  for (const ficha of fichas) {
    const html = await bajar(BASE + ficha)
    await dormir(PAUSA_MS)
    if (!html) continue
    const producto = productoJsonLd(html)
    if (!producto) {
      sinJsonLd++
      continue
    }
    const l = lote(ficha, producto)
    if (!l) continue
    const anterior = porSku.get(l.sku)
    porSku.set(l.sku, {
      ...l,
      primera_vez: anterior?.primera_vez || hoy,
      ultima_vez: hoy,
      activo: true,
    })
    if (!anterior) nuevos++
  }

  // Lo que no apareció hoy: se marca inactivo pasados DIAS_ACTIVO sin verlo.
  const limite = new Date(Date.now() - DIAS_ACTIVO * 86_400_000).toISOString().slice(0, 10)
  for (const l of porSku.values()) {
    if (l.ultima_vez !== hoy) l.activo = l.ultima_vez >= limite
  }

  if (sinJsonLd > 0) console.warn(`  ⚠ dCaC: ${sinJsonLd} fichas sin JSON-LD Product`)
  const todos = [...porSku.values()].sort((a, b) => (b.ultima_vez || '').localeCompare(a.ultima_vez || '') || Number(b.sku) - Number(a.sku))
  const activos = todos.filter((l) => l.activo).length
  console.log(`  dCaC lotes: ${fichas.size} fichas vistas · ${nuevos} nuevos · ${activos} activos · ${todos.length} en total`)
  return todos
}
