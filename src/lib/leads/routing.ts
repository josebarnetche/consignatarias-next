/**
 * routing.ts — Motor de ruteo y economía de un producer_lead.
 *
 * Dos trabajos:
 *  1) matchConsignatarias(): dado un lead (provincia), devuelve las firmas
 *     candidatas ordenadas por prioridad — featured (partner PRO) primero, luego
 *     las que tienen contacto cargado, luego el resto de la zona. El registro de
 *     consignatarias guarda la provincia en mayúsculas y a veces con acentos/case
 *     mezclado, así que normalizamos ambos lados antes de comparar.
 *  2) estimateOperation(): valor potencial de la operación (cabezas × peso ref ×
 *     INMAG) y el fee del 1% que cobramos AL CIERRE. Es un potencial para priorizar
 *     qué lead perseguir, no una factura.
 *
 * Nota de realidad: la mayoría de las firmas no tiene teléfono/WhatsApp en la DB.
 * El ruteo fino lo opera Jose con los teléfonos del backoffice; este motor le da
 * los candidatos ordenados y el ops-alert se los sirve listos para WhatsApp.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import marketPrices from '@/lib/data/market-prices.json'
import { getProfile } from '@/lib/data/consignataria-slugs'
import rematesData from '@/lib/data/remates.json'

export const DEFAULT_FEE_PCT = 1.0

/** Normaliza provincia/localidad para comparar: sin acentos, upper, sin dobles espacios. */
export function normalizeGeo(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Peso vivo de referencia por categoría (kg) para estimar el valor de la operación. */
const REF_WEIGHT_KG: Record<string, number> = {
  novillos: 430,
  novillitos: 350,
  vaquillonas: 330,
  vacas: 420,
  toros: 650,
  terneros: 190,
  invernada: 220,
  cria: 190,
}
const DEFAULT_WEIGHT_KG = 400

function inmagPrice(): number {
  const v = (marketPrices as { inmag?: { current?: number } }).inmag?.current
  return typeof v === 'number' && v > 0 ? v : 4300
}

export interface OperationEstimate {
  /** Valor potencial de la operación en ARS (null si no hay cabezas para estimar). */
  estimatedValueArs: number | null
  /** Fee potencial (1% del valor) en ARS. */
  feeArs: number | null
  feePct: number
}

/**
 * Valor potencial de la operación y fee. Si no hay cabezas (p.ej. arrendar/tasar),
 * devuelve null en valor — el lead igual vale, sólo que no se prioriza por monto.
 */
export function estimateOperation(opts: {
  headCount?: number | null
  category?: string | null
  feePct?: number
}): OperationEstimate {
  const feePct = opts.feePct ?? DEFAULT_FEE_PCT
  const heads = typeof opts.headCount === 'number' && opts.headCount > 0 ? opts.headCount : null
  if (!heads) return { estimatedValueArs: null, feeArs: null, feePct }
  const weight = REF_WEIGHT_KG[(opts.category || '').toLowerCase()] ?? DEFAULT_WEIGHT_KG
  const estimatedValueArs = Math.round(heads * weight * inmagPrice())
  const feeArs = Math.round((estimatedValueArs * feePct) / 100)
  return { estimatedValueArs, feeArs, feePct }
}

export interface MatchedFirm {
  slug: string
  displayName: string
  province: string | null
  location: string | null
  phone: string | null
  whatsapp: string | null
  featured: boolean
  verified: boolean
  /** true si tiene teléfono o WhatsApp cargado en la DB. */
  contactable: boolean
  /** true si la localidad de la firma coincide con la zona declarada del lead. */
  zoneMatch: boolean
  /** Puntaje con el que se ordenó. Se expone para poder auditar el ruteo. */
  score: number
  /** Motivos legibles del puntaje — para el digest del Ovejero y /admin/leads. */
  porQue: string[]
}

/**
 * Palabras que aparecen en una zona escrita a mano y no identifican un lugar.
 * Sin esto, "partido de 25 de Mayo" matchearía contra cualquier firma cuyo
 * `location` diga "PARTIDO".
 */
const ZONA_STOPWORDS = new Set([
  'PARTIDO', 'DEPARTAMENTO', 'DEPTO', 'PROVINCIA', 'PROV', 'ZONA', 'LOCALIDAD',
  'CAMPO', 'PARAJE', 'CERCA', 'SOBRE', 'ENTRE', 'DESDE', 'HASTA',
])

/**
 * Localidades donde cada firma REMATÓ de verdad, según el calendario scrapeado.
 *
 * La sede declarada no sirve para rutear a las casas grandes: A.J. Mendizabal,
 * Colombo y Magliano y Rosgan tienen `location` = "Buenos Aires" (la ciudad), así
 * que por localidad no matchean nunca con Darregueira ni con 25 de Mayo, aunque
 * operen ahí. Dónde remata una firma es un dato **observado**, no declarado, y de
 * los 914 remates del calendario 865 traen localidad.
 *
 * Se arma una sola vez por proceso. Sirvió al primer intento: el lead de Elisabet
 * ("Isla, partido de 25 de Mayo") no matcheaba con nadie, y en 25 de Mayo rematan
 * Ferias Rurales de 25 de Mayo, Daniel Blanco y Martín Lalor.
 */
/**
 * Clave de identidad de una firma por su NOMBRE, no por su slug.
 *
 * Hace falta porque el slug está desincronizado entre las tres fuentes: la DB dice
 * `lalor`, el registro canónico dice `lalor`, y el scrape emite `martin-g-lalor-s-a`
 * y `martin-g-lalor` para la misma casa. El nombre, en cambio, cruza las tres:
 * "Martin G. Lalor SA" y "MARTÍN G. LALOR S.A." colapsan a "MARTIN G LALOR".
 *
 * Quita acentos, puntuación y el sufijo societario, que es exactamente lo que varía.
 */
function nombreClave(nombre: string | null | undefined): string {
  if (!nombre) return ''
  return normalizeGeo(nombre)
    .replace(/[.,]/g, '')
    .replace(/\b(S\s?A\s?C\s?A|S\s?A\s?C\s?I|S\s?C\s?A|S\s?R\s?L|S\s?A\s?S|SA|SRL|SACA|SCA|SAS|LTDA|CIA)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

interface HuellaRemates {
  localidades: Set<string>
  /** provincia normalizada → cuántos remates hizo ahí. */
  provincias: Map<string, number>
}

/**
 * Cuántos remates hacen falta en una provincia para decir que la firma "opera ahí".
 *
 * Con umbral 1 el ruteo se rompía al revés: Reggi y Cía (Corrientes, partner PRO)
 * tiene UN remate en Buenos Aires y con eso se colaba —con el bonus de partner— en
 * todos los leads bonaerenses; la Cooperativa Guillermo Lehmann (Santa Fe) entraba
 * en Misiones con dos. Un remate suelto es una transmisión por pantalla o un error
 * de scrape, no presencia. Tres ya es un patrón.
 *
 * No se aplica a las LOCALIDADES: rematar una vez en un pueblo es mucho más
 * específico que aparecer una vez en una provincia entera.
 */
const MIN_REMATES_PROVINCIA = 3

/**
 * Dónde remató cada firma de verdad, según el calendario scrapeado.
 *
 * La sede declarada no alcanza para rutear a las casas grandes: A.J. Mendizabal,
 * Colombo y Magliano y Rosgan tienen `location` = "Buenos Aires" (la ciudad), así
 * que por localidad no matchean nunca con Darregueira ni con 25 de Mayo aunque
 * operen ahí. Peor: **Martín G. Lalor figura en CAPITAL FEDERAL y remata en 25 de
 * Mayo**, así que el filtro por provincia la descartaba antes de siquiera mirar la
 * zona. Dónde remata una firma es dato observado; de los 914 remates, 865 traen
 * localidad.
 *
 * Se indexa por slug canónico Y por nombre-clave, y se consulta por los dos, porque
 * ninguna de las dos llaves sola cubre todos los casos.
 */
const huellaPorFirma: Map<string, HuellaRemates> = (() => {
  const idx = new Map<string, HuellaRemates>()
  const remates = rematesData as Array<{
    consignatariaSlug?: string
    consignatariaName?: string
    location?: string | null
    province?: string | null
  }>

  for (const r of remates) {
    if (!r.location && !r.province) continue

    const llaves = new Set<string>()
    if (r.consignatariaSlug) {
      llaves.add(getProfile(r.consignatariaSlug)?.canonicalSlug ?? r.consignatariaSlug)
    }
    const nk = nombreClave(r.consignatariaName)
    if (nk) llaves.add(`nombre:${nk}`)

    for (const k of llaves) {
      const h = idx.get(k) ?? { localidades: new Set<string>(), provincias: new Map<string, number>() }
      if (r.location) h.localidades.add(normalizeGeo(r.location))
      if (r.province) {
        const p = normalizeGeo(r.province)
        h.provincias.set(p, (h.provincias.get(p) ?? 0) + 1)
      }
      idx.set(k, h)
    }
  }
  return idx
})()

/**
 * Huella de remates de una firma, buscada por slug y por nombre.
 *
 * Las dos llaves pueden apuntar a la misma casa (el scrape emite `martin-g-lalor-s-a`
 * y el registro `lalor`), así que los conteos se suman con cuidado: si ambas llaves
 * existen y son la misma fila, sumarlas duplicaría — pero como el índice se arma
 * agregando AMBAS llaves por cada remate, cada remate ya está contado una vez en
 * cada una. Se toma el máximo por provincia, no la suma.
 */
function huellaDe(firma: { canonical_slug: string; display_name: string }): HuellaRemates {
  const porSlug = huellaPorFirma.get(firma.canonical_slug)
  const porNombre = huellaPorFirma.get(`nombre:${nombreClave(firma.display_name)}`)
  if (!porSlug && !porNombre) return { localidades: new Set(), provincias: new Map() }
  if (!porNombre) return porSlug!
  if (!porSlug) return porNombre

  const provincias = new Map(porSlug.provincias)
  for (const [p, n] of porNombre.provincias) {
    provincias.set(p, Math.max(provincias.get(p) ?? 0, n))
  }
  return {
    localidades: new Set([...porSlug.localidades, ...porNombre.localidades]),
    provincias,
  }
}

/**
 * ¿La firma opera en la zona declarada del lead?
 *
 * La zona del lead es texto libre escrito por el productor ("Isla, partido de
 * 25 de Mayo (BA)"), así que se compara de dos formas: el string entero en ambas
 * direcciones, y token por token contra `location` / `region_operativa`.
 *
 * LÍMITE CONOCIDO: es comparación de strings, no geografía. "nueve de julio" no
 * matchea contra "9 DE JULIO", y no sabe que Darregueira está en Puán. Cuando el
 * volumen justifique resolver eso, este es el punto de entrada — el mismo que el
 * Ovejero marca en `compatibilidadZona()`. Hasta entonces, un `zoneMatch=false`
 * significa "no pude probar que sea de la zona", no "no es de la zona".
 */
function matchZona(
  zonaLead: string,
  firma: { canonical_slug: string; display_name: string; location: string | null; region_operativa: string | null },
): { match: boolean; motivo: string | null } {
  if (!zonaLead) return { match: false, motivo: null }

  const declarados = [normalizeGeo(firma.location), normalizeGeo(firma.region_operativa)].filter(Boolean)
  const rematadas = [...huellaDe(firma).localidades]

  // Tokens de la zona escrita a mano. 5+ caracteres para que "ISLA" o "MAYO" no
  // arrastren falsos positivos; sin stopwords para que "partido" no matchee todo.
  const tokens = zonaLead
    .split(/[^A-Z0-9]+/)
    .filter((t) => t.length >= 5 && !ZONA_STOPWORDS.has(t))

  const coincide = (campos: string[]) =>
    campos.some((c) => c.includes(zonaLead) || zonaLead.includes(c)) ||
    tokens.some((t) => campos.some((c) => c.includes(t)))

  // La sede declarada primero: si la firma ES de la zona, eso es lo más fuerte.
  if (coincide(declarados)) {
    return { match: true, motivo: `opera en ${firma.location ?? firma.region_operativa}` }
  }

  // Si no, dónde remató de verdad.
  if (coincide(rematadas)) {
    const donde = rematadas.find((c) => c.includes(zonaLead) || zonaLead.includes(c) || tokens.some((t) => c.includes(t)))
    return { match: true, motivo: `remata en ${donde}` }
  }

  return { match: false, motivo: null }
}

/**
 * Firmas candidatas para un lead, ordenadas por prioridad de ruteo.
 *
 * Orden: **zona (200)** → featured/partner (100) → contactable (20) → verified (5).
 *
 * La zona pesa MÁS que el destaque a propósito: una firma PRO que no opera donde
 * está la hacienda no puede resolver el lead, y mandárselo quema el lead y la
 * relación con la firma. Entre dos firmas de la misma zona, gana la partner.
 *
 * Antes esta función recibía sólo `province` y el resultado era inservible en las
 * provincias grandes: los cuatro leads de Buenos Aires de julio/agosto 2026 salían
 * con las MISMAS tres candidatas, empatadas en 25 puntos, y el desempate terminaba
 * siendo el orden en que la DB devolvía las filas. Un lead de Nueve de Julio y uno
 * de Saavedra —a 400 km— iban a la misma firma.
 */
export async function matchConsignatarias(
  db: SupabaseClient,
  opts: { province?: string | null; zona?: string | null; limit?: number },
): Promise<MatchedFirm[]> {
  const targetProv = normalizeGeo(opts.province)
  const targetZona = normalizeGeo(opts.zona)
  const limit = opts.limit ?? 5

  // Traemos las firmas con datos de contacto/ubicación. Filtrar por provincia en JS
  // porque en la DB viene en distintos casings ("BUENOS AIRES" vs "Corrientes").
  const { data } = await db
    .from('consignatarias')
    .select('canonical_slug, display_name, province, location, region_operativa, phone, whatsapp, featured, verified')
    .limit(1000)

  const rows = (data || []) as Array<{
    canonical_slug: string
    display_name: string
    province: string | null
    location: string | null
    region_operativa: string | null
    phone: string | null
    whatsapp: string | null
    featured: boolean | null
    verified: boolean | null
  }>

  // GUARD — sólo firmas con perfil público.
  //
  // La tabla `consignatarias` y el registro canónico de slugs están desincronizados:
  // al 21-ago-2026 hay 30 filas cuyo slug NO resuelve a ningún perfil (sufijo
  // societario: `gregorio-aberasturi-s-r-l` en la DB vs `gregorio-aberasturi` en el
  // registro) y 26 perfiles canónicos sin fila. Sin este filtro, el ruteo puede
  // elegir una firma que no tiene página en el sitio: el productor recibiría el
  // nombre de una casa que no puede ver, y la firma un lead que no puede atender
  // desde un panel que no existe. Filtrar es lo correcto aunque se achique la
  // cantera — mandar mal un lead cuesta más que no mandarlo.
  //
  // Esto NO arregla la desincronización, sólo evita que haga daño. El merge de las
  // 30 huérfanas es una migración de datos aparte (hay que decidir slug ganador y
  // reapuntar profile_views / leads / subscriptions).
  const conPerfil = rows.filter((r) => !!getProfile(r.canonical_slug))

  // El filtro por provincia mira el domicilio Y dónde remata la firma. Sólo el
  // domicilio dejaba afuera a las casas inscriptas en Capital que trabajan en el
  // interior: Martín G. Lalor figura en CAPITAL FEDERAL y remata en 25 de Mayo,
  // así que un lead de 25 de Mayo la descartaba de entrada — la firma correcta era
  // justamente la excluida.
  const inZone = targetProv
    ? conPerfil.filter(
        (r) =>
          normalizeGeo(r.province) === targetProv ||
          normalizeGeo(r.region_operativa).includes(targetProv) ||
          normalizeGeo(r.location).includes(targetProv) ||
          (huellaDe(r).provincias.get(targetProv) ?? 0) >= MIN_REMATES_PROVINCIA,
      )
    : conPerfil

  const mapped: MatchedFirm[] = inZone.map((r) => {
    const zona = targetZona ? matchZona(targetZona, r) : { match: false, motivo: null }
    const zoneMatch = zona.match
    const contactable = !!(r.phone || r.whatsapp)
    const featured = !!r.featured
    const verified = !!r.verified

    const porQue: string[] = []
    if (zona.motivo) porQue.push(zona.motivo)
    if (featured) porQue.push('partner PRO')
    if (contactable) porQue.push('tiene contacto cargado')
    if (verified) porQue.push('perfil verificado')
    if (porQue.length === 0) porQue.push('sólo coincide la provincia')

    return {
      slug: r.canonical_slug,
      displayName: r.display_name,
      province: r.province,
      location: r.location,
      phone: r.phone,
      whatsapp: r.whatsapp,
      featured,
      verified,
      contactable,
      zoneMatch,
      score:
        (zoneMatch ? 200 : 0) + (featured ? 100 : 0) + (contactable ? 20 : 0) + (verified ? 5 : 0),
      porQue,
    }
  })

  // Desempate por nombre: sin esto el orden entre firmas empatadas lo decide el
  // orden de filas de Postgres, que no está garantizado — el mismo lead podía
  // rutear a firmas distintas en dos corridas. Alfabético no es "mejor", pero es
  // reproducible y auditable, que es lo que hace falta para poder revisar un ruteo.
  return mapped
    .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName, 'es'))
    .slice(0, limit)
}

/**
 * wa.me link con mensaje pre-armado.
 *
 * OJO CON EL 9. WhatsApp exige que los móviles argentinos vayan en formato
 * `54 9 <área> <número>`. Sin ese 9, `wa.me` abre un cartel de "número inválido"
 * en vez del chat. La versión anterior armaba `54` + los dígitos tal cual, así que
 * un teléfono guardado como "2214189529" —que es como vienen casi todos los del
 * backoffice— generaba `wa.me/542214189529` y **no abría nada**. Todos los links
 * que el Ovejero prearmaba para el outreach a consignatarias salían así.
 *
 * Los fijos no llevan 9, pero WhatsApp tampoco funciona sobre un fijo: si el número
 * cargado es de línea, el link falla con o sin el 9. Se optimiza para el caso que
 * puede funcionar.
 */
export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return null

  // Normalizar a número nacional, sin el 54 de país ni el 0 de larga distancia.
  let nacional = digits.startsWith('54') ? digits.slice(2) : digits
  nacional = nacional.replace(/^0/, '')

  // NO se intenta sacar el "15" viejo ("221 15 4189529"). Para eso hay que saber
  // dónde termina el código de área, y en Argentina puede tener 2, 3 o 4 dígitos
  // (11 / 221 / 2914) — sin una tabla de áreas, cualquier heurística por posición
  // mutila números válidos. Un número con 15 va a fallar; uno bien cargado, no.

  // Anteponer el 9 de móvil salvo que ya esté.
  const conNueve = nacional.startsWith('9') ? nacional : `9${nacional}`

  return `https://wa.me/54${conNueve}?text=${encodeURIComponent(text)}`
}
