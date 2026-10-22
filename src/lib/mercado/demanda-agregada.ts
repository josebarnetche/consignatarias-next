/**
 * Demanda y oferta abiertas en la mesa de consignatarias.com, AGREGADAS y
 * k-anónimas, para la página pública /mercado/demanda.
 *
 * Es la misma mesa que cruza el closer y que consulta la tool MCP
 * `market_match`, pero mirada de arriba: cuántos compran, cuántos venden,
 * cuántos buscan campo, por categoría y región. Nunca quién.
 *
 * Reglas de anonimato (con test, ver demanda-agregada.test.ts):
 *  · la salida no lleva nombre, email, teléfono, zona, localidad, provincia,
 *    id ni precio pedido de ningún lead: solo RANGOS de cantidad ("2 a 4") y
 *    rótulos genéricos ("el NEA", "la zona núcleo");
 *  · un grupo con menos de K_MIN leads no se muestra por separado: primero se
 *    junta en "otras zonas" de su categoría, después en "otras categorías" de
 *    su lado del mercado, y si ni así llega a K_MIN queda solo en el total;
 *  · NI conteos exactos NI volumen (segunda revisión, 21-10-2026): comparando
 *    la página hora a hora, o cargando pedidos falsos por el formulario público,
 *    la diferencia de un conteo o de un volumen exacto daba las cabezas y la
 *    fecha de alta de una persona. Los rangos ("2 a 4", "5 a 9", "10 o más")
 *    solo cambian cuando se cruza un tramo;
 *  · la categoría pasa por una lista cerrada: el campo es texto libre y no se
 *    publica lo que alguien haya escrito ahí;
 *  · un pedido de más de VENTANA_DIAS días no cuenta: la mesa es de hoy.
 */
import { ladoDe, ESTADOS_ABIERTOS, type LeadFila } from './leads-mesa'
import { regionDe, lugarGenerico } from './geo-ar'

/** Un grupo con menos pedidos que esto no se muestra por separado. */
export const K_MIN = 2

/** Tramos de publicación. Un conteo exacto se deduce por diferencia; un tramo, mucho menos. */
export function rangoConteo(n: number): string | null {
  if (n < K_MIN) return null
  if (n <= 4) return '2 a 4'
  if (n <= 9) return '5 a 9'
  return '10 o más'
}

/**
 * Orígenes que cualquiera puede generar sin verificar el contacto (un agente con
 * `registrar`, un `cattle_buying_request`). NO cuentan en ningún agregado: con
 * un pedido falso en la región de alguien se completaba su grupo y quedaba a la
 * vista (revisión del 21-10-2026). Cuentan cuando una persona los revisa y
 * les cambia el origen o el estado.
 */
export function origenSinVerificar(source: string | null | undefined): boolean {
  return /^(mcp:|demanda_compra:)/.test(source ?? '')
}

export const VENTANA_DIAS = 90
const DIA_MS = 86_400_000

export type VerticalDemanda = 'hacienda' | 'campos'
/** compran/venden para hacienda; buscan/ofrecen para campos. */
export type LadoDemanda = 'compran' | 'venden' | 'buscan' | 'ofrecen'

export interface GrupoDemanda {
  /** Slug estable, sin datos de nadie: sirve de ancla y de `source` del CTA. */
  id: string
  vertical: VerticalDemanda
  lado: LadoDemanda
  /**
   * Hacienda: categoría de la lista cerrada (`terneros`, `vacas`…).
   * Campos: `arrendamiento` o `venta`. null = "otras categorías".
   */
  categoria: string | null
  /** "la zona núcleo", "el NEA"… u "otras zonas". Nunca la provincia. */
  zona: string
  /** "2 a 4", "5 a 9", "10 o más". Nunca el número exacto. */
  rango: string
  /** "Entre 2 y 4 compradores buscando terneros en la zona núcleo". */
  frase: string
}

export interface TotalLado {
  vertical: VerticalDemanda
  lado: LadoDemanda
  rango: string
}

export interface DemandaAgregada {
  /** Hay al menos un grupo publicable. */
  hay: boolean
  /** Rango del total de pedidos que entraron en la cuenta; null si son menos de K_MIN. */
  rangoTotal: string | null
  /** Solo los lados con K_MIN pedidos o más. */
  totales: TotalLado[]
  grupos: GrupoDemanda[]
  ventanaDias: number
  kMin: number
}

/** Lista cerrada. Lo que no esté acá se publica como "otras categorías". */
const CATEGORIAS: Record<string, string> = {
  novillo: 'novillos', novillos: 'novillos',
  novillito: 'novillitos', novillitos: 'novillitos',
  vaquillona: 'vaquillonas', vaquillonas: 'vaquillonas',
  vaca: 'vacas', vacas: 'vacas',
  toro: 'toros', toros: 'toros',
  ternero: 'terneros', terneros: 'terneros',
  ternera: 'terneras', terneras: 'terneras',
}

export function categoriaPublica(c: string | null | undefined): string | null {
  if (!c) return null
  const k = c.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
  return CATEGORIAS[k] ?? null
}

interface Item {
  vertical: VerticalDemanda
  lado: LadoDemanda
  categoria: string | null
  region: string | null
  zona: string
}

/** Pasa un lead al rótulo público. null = no cuenta en la página. */
function aItem(l: LeadFila, desde: number): Item | null {
  // La página es pública: un lead que el triage no se animó a llamar lead (posible
  // spam) no infla los conteos. market_match sí lo cuenta, pero con menos peso.
  if (!ESTADOS_ABIERTOS.has(l.status) || l.status === 'needs_review') return null
  if (origenSinVerificar(l.source)) return null
  const t = Date.parse(l.created_at)
  if (!Number.isFinite(t) || t < desde) return null
  // Tasar es pedir asesoramiento, no ofrecer ni buscar: no es mesa.
  if (l.intent === 'tasar') return null
  const r = ladoDe(l)
  if (!r) return null
  const region = regionDe(l.province)
  const zona = region ? lugarGenerico(l.province) : 'otras zonas'
  if (r.vertical === 'hacienda') {
    return {
      vertical: 'hacienda',
      lado: r.lado === 'demanda' ? 'compran' : 'venden',
      categoria: categoriaPublica(l.category),
      region, zona,
    }
  }
  return {
    vertical: 'campos',
    lado: r.lado === 'demanda' ? 'buscan' : 'ofrecen',
    categoria: r.operacion,
    region, zona,
  }
}

const DE_RANGO: Record<string, string> = { '2 a 4': 'Entre 2 y 4', '5 a 9': 'Entre 5 y 9', '10 o más': '10 o más' }

function frase(g: Omit<GrupoDemanda, 'frase' | 'id'>): string {
  const n = DE_RANGO[g.rango] ?? g.rango
  const donde = g.zona === 'otras zonas' ? 'en otras zonas' : `en ${g.zona}`
  if (g.vertical === 'hacienda') {
    const que = g.categoria ?? 'hacienda de otras categorías'
    return g.lado === 'compran' ? `${n} compradores buscando ${que} ${donde}` : `${n} vendedores de ${que} ${donde}`
  }
  if (g.categoria === 'arrendamiento') {
    return g.lado === 'buscan' ? `${n} personas buscando campo para arrendar ${donde}` : `${n} campos ofrecidos en arrendamiento ${donde}`
  }
  if (g.categoria === 'venta') {
    return g.lado === 'buscan' ? `${n} personas buscando campo para comprar ${donde}` : `${n} campos en venta ${donde}`
  }
  return g.lado === 'buscan' ? `${n} personas buscando campo ${donde}` : `${n} campos ofrecidos ${donde}`
}

function slug(...partes: (string | null)[]): string {
  return partes
    .map((p) => (p ?? 'otras').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    .join('-')
}

interface GrupoInterno extends GrupoDemanda {
  /** Solo para ordenar y sumar adentro; NUNCA sale de este archivo. */
  n: number
}

function armarGrupo(base: Pick<Item, 'vertical' | 'lado' | 'categoria' | 'zona'>, items: Item[], regionKey: string): GrupoInterno {
  const sinFrase = {
    vertical: base.vertical,
    lado: base.lado,
    categoria: base.categoria,
    zona: base.zona,
    rango: rangoConteo(items.length) as string,
  }
  return { id: slug(base.vertical, base.lado, base.categoria, regionKey), ...sinFrase, frase: frase(sinFrase), n: items.length }
}

const ORDEN_LADO: Record<LadoDemanda, number> = { compran: 0, venden: 1, buscan: 2, ofrecen: 3 }

/**
 * Agrega la mesa. Pura: no lee la base ni el reloj si se le pasa `ahora`.
 * Recibe las filas tal como vienen de `producer_leads` y devuelve solo rangos.
 */
export function agregarDemanda(leads: LeadFila[], ahora = Date.now()): DemandaAgregada {
  const desde = ahora - VENTANA_DIAS * DIA_MS
  const items = leads.map((l) => aItem(l, desde)).filter((i): i is Item => i !== null)

  const grupos: GrupoInterno[] = []
  // Nivel 1: vertical · lado · categoría · región.
  const porLadoCat = new Map<string, Item[]>()
  for (const i of items) {
    const k = `${i.vertical}|${i.lado}|${i.categoria ?? ''}`
    porLadoCat.set(k, [...(porLadoCat.get(k) ?? []), i])
  }
  // Lo que no llega a K_MIN en su categoría baja a "otras categorías" de su lado.
  const restoLado = new Map<string, Item[]>()
  for (const [k, lista] of porLadoCat) {
    const [vertical, lado] = k.split('|')
    const ladoKey = `${vertical}|${lado}`
    const porRegion = new Map<string, Item[]>()
    const sueltos: Item[] = []
    for (const i of lista) {
      if (!i.region || i.categoria === null) { sueltos.push(i); continue }
      porRegion.set(i.region, [...(porRegion.get(i.region) ?? []), i])
    }
    for (const [region, rl] of porRegion) {
      if (rl.length >= K_MIN) grupos.push(armarGrupo(rl[0], rl, region))
      else sueltos.push(...rl)
    }
    // Nivel 2: "otras zonas" de la misma categoría.
    if (lista[0].categoria !== null && sueltos.length >= K_MIN) {
      grupos.push(armarGrupo({ ...sueltos[0], zona: 'otras zonas' }, sueltos, 'otras-zonas'))
    } else {
      restoLado.set(ladoKey, [...(restoLado.get(ladoKey) ?? []), ...sueltos])
    }
  }
  // Nivel 3: "otras categorías" del mismo lado, sin región. Si no junta K_MIN, solo total.
  for (const lista of restoLado.values()) {
    if (lista.length >= K_MIN) {
      grupos.push(armarGrupo({ ...lista[0], categoria: null, zona: 'otras zonas' }, lista, 'otras-zonas'))
    }
  }

  grupos.sort((a, b) =>
    (a.vertical === b.vertical ? 0 : a.vertical === 'hacienda' ? -1 : 1) ||
    ORDEN_LADO[a.lado] - ORDEN_LADO[b.lado] ||
    b.n - a.n ||
    a.id.localeCompare(b.id),
  )

  const porLado = new Map<string, { vertical: VerticalDemanda; lado: LadoDemanda; n: number }>()
  for (const i of items) {
    const k = `${i.vertical}|${i.lado}`
    const t = porLado.get(k) ?? { vertical: i.vertical, lado: i.lado, n: 0 }
    t.n += 1
    porLado.set(k, t)
  }
  const totales: TotalLado[] = [...porLado.values()]
    .filter((t) => t.n >= K_MIN)
    .sort((a, b) => (a.vertical === b.vertical ? 0 : a.vertical === 'hacienda' ? -1 : 1) || ORDEN_LADO[a.lado] - ORDEN_LADO[b.lado])
    .map((t) => ({ vertical: t.vertical, lado: t.lado, rango: rangoConteo(t.n) as string }))

  return {
    hay: grupos.length > 0,
    rangoTotal: rangoConteo(items.length),
    totales,
    // Se saca `n` antes de devolver: lo público es el rango.
    grupos: grupos.map(({ n: _n, ...g }) => g),
    ventanaDias: VENTANA_DIAS,
    kMin: K_MIN,
  }
}

export const DEMANDA_VACIA: DemandaAgregada = {
  hay: false, rangoTotal: null, totales: [], grupos: [], ventanaDias: VENTANA_DIAS, kMin: K_MIN,
}

/** Columnas que necesita la agregación. Sin name/phone/email: no hacen falta. */
export const COLUMNAS_DEMANDA = 'id,created_at,intent,category,head_count,hectareas,province,status,source'
