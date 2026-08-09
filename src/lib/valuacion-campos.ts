/**
 * VALUACIÓN DE CAMPOS — cuánto vale una hectárea, en dólares.
 *
 * Dos caminos que se cruzan, como en cualquier tasación seria:
 *
 *  1. POR RENTA. Un campo vale, a grandes rasgos, veinte años de su arrendamiento.
 *     El canon se pacta en kilos de novillo por hectárea por mes, así que ese
 *     número ya viene ajustado por la calidad del campo: nadie paga en Chubut lo
 *     que paga en Pergamino. Se anualiza, se pasa a dólares al novillo de hoy y se
 *     multiplica por los años de repago.
 *
 *  2. POR COMPARABLES. Relevamiento propio de precios de venta por provincia
 *     (`tierra-por-kilo.json`): mediana y rango p25-p75 de operaciones y avisos
 *     reales, con la productividad de la zona en kg/ha/año.
 *
 * El resultado que se muestra pondera los dos. Cuando difieren mucho, eso también
 * es información: un campo cuyo canon implica mucho más que el comparable de la
 * zona está caro de arrendar, o es mejor que el promedio de su provincia.
 *
 * Los años de repago NO son 20 fijos: salen del relevamiento por provincia
 * (`anos_repago` = usd_ha ÷ producción bruta anual en USD) y se traducen a años de
 * arrendamiento con la relación canon/producción. En la pampa húmeda dan ~20; en
 * la estepa patagónica, muchos más — porque ahí la tierra no se paga con pasto.
 */
import tierraRaw from '@/lib/data/tierra-por-kilo.json'
import marketPrices from '@/lib/data/market-prices.json'

const mp = marketPrices as unknown as {
  inmag: { current: number; series?: Array<{ date: string; value: number; volume: number }> }
  usdBlue: { current: number }
}

export interface ProvinciaTierra {
  provincia: string
  region: string
  /** Zona dentro de la provincia ("zona núcleo", "cuenca del Salado"). Opcional:
   *  las filas sin zona son el valor provincial y sirven de respaldo. */
  zona?: string | null
  n: number
  usd_ha: number
  p25: number
  p75: number
  kg_ha_ano: number
  /** Canon típico de la zona, en kg de novillo por ha por mes. Cuando existe, se
   *  usa como sugerencia; el canon del aviso concreto siempre manda. */
  kg_ha_mes_canon?: number | null
  /**
   * De dónde salió ese canon. Cuando está cargado, el canon fue RELEVADO (avisos
   * o estudios) y no derivado de la productividad: manda sobre el supuesto del
   * 30%, porque es lo que se paga y no lo que suponemos que se paga.
   */
  canon_fuente?: string | null
  usd_por_kg: number
  anos_repago: number
  /**
   * A qué se dedica la tierra en esa zona. NO es decorativo: define si el campo
   * se puede valuar por canon ganadero. La zona núcleo vale US$18.500/ha porque
   * produce soja, no porque críe novillos — tasarla por kilos de hacienda daría
   * un número disparatado. En esas zonas mostramos el comparable y lo decimos.
   */
  aptitud?: 'ganadera' | 'mixta' | 'agricola' | 'forestal' | null
  fuente?: string | null
  fecha?: string | null
}

/**
 * Novillo de referencia en dólares. Va FIJO a propósito: `anos_repago` y los años
 * de arrendamiento describen una relación estructural entre lo que vale la tierra
 * y lo que produce. Si se movieran con el dólar del día, la tasación de un mismo
 * campo cambiaría por razones que no tienen nada que ver con el campo.
 */
const NOVILLO_REF = 2.92

export const TIERRA: ProvinciaTierra[] = tierraRaw as ProvinciaTierra[]

/** Solo las filas provinciales (sin zona), para selectores y tablas resumen. */
export const TIERRA_PROVINCIAS: ProvinciaTierra[] = TIERRA.filter((t) => !t.zona)

/** Las zonas relevadas dentro de una provincia, para el selector del tasador. */
export function zonasDe(provincia: string | null | undefined): ProvinciaTierra[] {
  if (!provincia) return []
  const p = normalizar(provincia)
  return TIERRA.filter((t) => !!t.zona && normalizar(t.provincia) === p)
}

/** El canon se liquida con el PROMEDIO DEL MES ANTERIOR, no con el precio de hoy. */
export function promedioMesAnterior(): { valor: number; etiqueta: string; ruedas: number } {
  const serie = mp.inmag.series ?? []
  const hoy = new Date()
  const y = hoy.getUTCMonth() === 0 ? hoy.getUTCFullYear() - 1 : hoy.getUTCFullYear()
  const m = hoy.getUTCMonth() === 0 ? 12 : hoy.getUTCMonth()
  const ym = `${y}-${String(m).padStart(2, '0')}`
  const delMes = serie.filter((p) => p.date.startsWith(ym))
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  if (delMes.length === 0) {
    return { valor: mp.inmag.current, etiqueta: 'último dato disponible', ruedas: 0 }
  }
  const prom = delMes.reduce((s, p) => s + p.value, 0) / delMes.length
  return { valor: prom, etiqueta: `promedio de ${MESES[m - 1]} ${y}`, ruedas: delMes.length }
}

function normalizar(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * De qué zona es cada partido. Un aviso dice "Pergamino", no "zona núcleo", así
 * que sin esta tabla la ficha de un campo se tasaría siempre con el promedio de
 * la provincia y las zonas relevadas no servirían para nada.
 *
 * Los partidos de referencia son los que publican las propias series (Compañía
 * Argentina de Tierras para Buenos Aires) más los limítrofes que comparten
 * ambiente. Un partido que no figura cae al valor provincial, que es lo correcto:
 * mejor el promedio que una zona forzada.
 */
export const ZONA_POR_PARTIDO: Record<string, Record<string, string>> = {
  'buenos aires': {
    'Zona núcleo': 'pergamino, rojas, salto, colon, arrecifes, ramallo, san nicolas, san pedro, baradero, capitan sarmiento',
    'Centro oeste': 'bragado, 9 de julio, nueve de julio, general viamonte, lincoln, chivilcoy, alberti, chacabuco, junin, general arenales',
    'Sudeste': 'balcarce, tandil, loberia, benito juarez, olavarria, azul',
    'Oeste': 'general villegas, rivadavia, trenque lauquen, pehuajo, carlos tejedor, america, salliquelo, pellegrini',
    'Sud triguera': 'tres arroyos, san cayetano, necochea, coronel dorrego, adolfo gonzales chaves, coronel pringles',
    'Cuenca del Salado': 'chascomus, general belgrano, dolores, castelli, pila, rauch, las flores, maipu, ayacucho, magdalena, punta indio, lezama, monte, roque perez, saladillo, general guido, tordillo, general lavalle, general madariaga, brandsen, chapadmalal',
    'Norte periurbano': 'mercedes, lujan, suipacha, navarro, san andres de giles, exaltacion de la cruz, canuelas, general rodriguez, marcos paz, san antonio de areco',
  },
  'santa fe': {
    'Sur núcleo': 'constitucion, general lopez, caseros, rosario, san lorenzo, belgrano, iriondo, san jeronimo, venado tuerto, casilda, canada de gomez, firmat',
    'Centro': 'castellanos, las colonias, san martin, la capital, rafaela, esperanza, san justo, sunchales',
    'Norte': 'vera, general obligado, san javier, 9 de julio, nueve de julio, san cristobal, garay, reconquista, tostado',
  },
  'entre rios': {
    'Oeste': 'victoria, diamante, parana, nogoya, gualeguay',
    'Este': 'gualeguaychu, colon, concordia, uruguay, san salvador, villaguay',
    'Norte': 'federal, feliciano, la paz, federacion, tala',
  },
}

function zonaPorPartido(provincia: string, zona: string): string | null {
  const mapa = ZONA_POR_PARTIDO[normalizar(provincia)]
  if (!mapa) return null
  const z = normalizar(zona)
  for (const [nombreZona, partidos] of Object.entries(mapa)) {
    if (partidos.split(',').some((x) => {
      const px = x.trim()
      return z === px || z.includes(px) || px.includes(z)
    })) {
      return nombreZona
    }
  }
  return null
}

/**
 * Busca la referencia más específica que exista: primero la zona dentro de la
 * provincia, y si no hay, el valor provincial. Un campo en Pergamino no se tasa
 * con el promedio de Buenos Aires si tenemos el dato de la zona núcleo.
 */
export function tierraDe(provincia: string | null | undefined, zona?: string | null): ProvinciaTierra | null {
  if (!provincia) return null
  const p = normalizar(provincia)
  const enProvincia = TIERRA.filter(
    (t) => normalizar(t.provincia) === p || p.includes(normalizar(t.provincia)) || normalizar(t.provincia).includes(p),
  )
  if (enProvincia.length === 0) return null

  if (zona) {
    const z = normalizar(zona)
    const porZona = enProvincia.find((t) => {
      if (!t.zona) return false
      const tz = normalizar(t.zona)
      return tz === z || z.includes(tz) || tz.includes(z)
    })
    if (porZona) return porZona

    // No coincidió con el nombre de la zona: probamos si lo que vino es un partido.
    const porNombreDePartido = zonaPorPartido(provincia, zona)
    if (porNombreDePartido) {
      const t = enProvincia.find((x) => x.zona === porNombreDePartido)
      if (t) return t
    }
  }
  // Sin zona o sin match: la fila provincial (la que no declara zona), o la primera.
  return enProvincia.find((t) => !t.zona) ?? enProvincia[0]
}

/**
 * Cuántos años de arrendamiento equivalen al valor de la tierra en esa zona.
 *
 * Dos caminos, y el primero es mucho mejor:
 *
 *  1. CANON RELEVADO. Si sabemos lo que se paga de verdad en la zona, los años
 *     salen de dividir el valor de la hectárea por ese canon. Nada de supuestos.
 *  2. DERIVADO. Si no, se asume que el canon es ~30% de la producción bruta.
 *
 * El relevamiento de agosto de 2026 mostró que la diferencia no es menor: en
 * Corrientes el supuesto del 30% daba 35 años, y el canon publicado por la UNNE
 * (24-48 kg/ha/año) da 18 — prácticamente lo mismo que los 18 que dan los avisos
 * del Salado, que es otro dato, de otra fuente y de otra provincia. Cuando dos
 * relevamientos independientes convergen en el mismo número, el que estaba mal
 * era el supuesto.
 */
const PROPORCION_CANON_SOBRE_PRODUCCION = 0.3
const ANOS_POR_DEFECTO = 20

export function anosDeArrendamiento(t: ProvinciaTierra | null): { anos: number; propio: boolean } {
  if (!t) return { anos: ANOS_POR_DEFECTO, propio: false }
  if (t.canon_fuente && t.kg_ha_mes_canon) {
    const canonAnualUsd = t.kg_ha_mes_canon * 12 * NOVILLO_REF
    return { anos: Math.round(t.usd_ha / canonAnualUsd), propio: true }
  }
  return { anos: Math.round(t.anos_repago / PROPORCION_CANON_SOBRE_PRODUCCION), propio: true }
}

export interface Valuacion {
  /** Lo que se muestra grande. */
  usdHa: number
  usdTotal: number
  /** Las dos vías, para el detalle. */
  porRenta: { usdHa: number; usdTotal: number; canonAnualUsdHa: number; anos: number } | null
  porComparables: { usdHa: number; p25: number; p75: number; n: number; region: string } | null
  /** Cuánto se apartan entre sí, en %. Alto = el campo se sale del promedio de su zona. */
  brecha: number | null
  confianza: 'alta' | 'media' | 'baja'
  novilloUsdKg: number
  provinciaEnBase: string | null
  /** Qué referencia se terminó usando: la zona puntual o el promedio provincial. */
  referenciaUsada: string | null
  /** Zona agrícola: el canon ganadero no explica el precio de esa tierra. */
  esAgricola: boolean
  /**
   * La tierra de la zona equivale a muchos más años de arrendamiento que en la
   * pampa. No es un error de cálculo: es que ahí el precio no lo pone el pasto.
   */
  masAniosQueLaPampa: boolean
}

/**
 * Valúa un campo. Con canon usa las dos vías; sin canon, solo comparables.
 */
export function valuarCampo(opts: {
  hectareas: number
  provincia: string | null
  zona?: string | null
  kgHaMes?: number | null
}): Valuacion {
  const { valor: novilloArs } = promedioMesAnterior()
  const novilloUsdKg = novilloArs / mp.usdBlue.current
  const t = tierraDe(opts.provincia, opts.zona)

  // En zona agrícola la tierra no se paga con pasto: el canon ganadero no explica
  // su valor y usarlo daría un número muy por debajo del mercado real.
  const esAgricola = t?.aptitud === 'agricola'

  let porRenta: Valuacion['porRenta'] = null
  if (opts.kgHaMes && opts.kgHaMes > 0 && !esAgricola) {
    const { anos } = anosDeArrendamiento(t)
    const canonAnualUsdHa = opts.kgHaMes * 12 * novilloUsdKg
    const usdHa = canonAnualUsdHa * anos
    porRenta = { usdHa, usdTotal: usdHa * opts.hectareas, canonAnualUsdHa, anos }
  }

  const porComparables: Valuacion['porComparables'] = t
    ? { usdHa: t.usd_ha, p25: t.p25, p75: t.p75, n: t.n, region: t.region }
    : null

  // Ponderación: la renta manda cuando existe (es el campo concreto, no el promedio
  // provincial), pero el comparable la ancla para que no se dispare.
  let usdHa: number
  let confianza: Valuacion['confianza']
  if (porRenta && porComparables) {
    usdHa = porRenta.usdHa * 0.6 + porComparables.usdHa * 0.4
    confianza = porComparables.n >= 8 ? 'alta' : 'media'
  } else if (porRenta) {
    usdHa = porRenta.usdHa
    confianza = 'baja'
  } else if (porComparables) {
    usdHa = porComparables.usdHa
    confianza = porComparables.n >= 8 ? 'media' : 'baja'
  } else {
    usdHa = 0
    confianza = 'baja'
  }

  const brecha =
    porRenta && porComparables && porComparables.usdHa > 0
      ? ((porRenta.usdHa - porComparables.usdHa) / porComparables.usdHa) * 100
      : null

  return {
    usdHa,
    usdTotal: usdHa * opts.hectareas,
    porRenta,
    porComparables,
    brecha,
    confianza,
    novilloUsdKg,
    provinciaEnBase: t?.provincia ?? null,
    referenciaUsada: t ? (t.zona ? `${t.zona}, ${t.provincia}` : t.provincia) : null,
    esAgricola,
    masAniosQueLaPampa: (porRenta?.anos ?? 0) > 30,
  }
}

/** Canon mensual y anual en plata, liquidado con el promedio del mes anterior. */
export function canonEnPlata(hectareas: number, kgHaMes: number) {
  const { valor, etiqueta, ruedas } = promedioMesAnterior()
  const mensualArs = kgHaMes * hectareas * valor
  return {
    mensualArs,
    anualArs: mensualArs * 12,
    mensualUsd: mensualArs / mp.usdBlue.current,
    porHaMensualArs: kgHaMes * valor,
    referencia: valor,
    etiqueta,
    ruedas,
  }
}
