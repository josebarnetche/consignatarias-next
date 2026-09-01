import rematesData from './remates.json'

/**
 * La rueda de remates de la Expo Rural de Mercedes (Corrientes).
 *
 * POR QUÉ ES UNA SECCIÓN Y NO UNA FILA MÁS DEL CALENDARIO
 * Medido contra nuestra propia base de 1.009 remates, agrupando por sede y buscando la
 * ventana de 14 días con más firmas distintas, Mercedes queda **tercera del país**:
 *
 *   1. Palermo (Capital Federal) .... 11 firmas / 15 remates  ← Expo Rural nacional
 *   2. San Nicolás .................. 9 firmas / 10 remates   ← Expoagro
 *   3. MERCEDES ..................... 6 firmas / 7 remates
 *   4. Rauch ........................ 4 firmas / 6 remates
 *
 * Las dos que la superan son las megamuestras nacionales. Entre las sociedades rurales
 * del interior no hay nada parecido: la siguiente junta cuatro firmas.
 *
 * El número NO se escribe a mano — `posicionNacional()` lo recalcula desde `remates.json`
 * en cada build. Si el año que viene Rauch junta ocho firmas, la página lo va a decir.
 */

export const EXPO = {
  edicion: 117,
  anio: 2026,
  nombre: '117ª Exposición Nacional de Ganadería, Industria y Comercio',
  entidad: 'Sociedad Rural de Mercedes',
  provincia: 'Corrientes',
  muestraDesde: '2026-09-10',
  muestraHasta: '2026-09-13',
} as const

export type Modalidad = 'televisado' | 'streaming' | 'fisico'

export interface RemateExpo {
  fecha: string
  /** Cómo se lo nombra en el cronograma. */
  firma: string
  /** Perfil en nuestro directorio, cuando la firma está. */
  slug?: string
  modalidad: Modalidad
  categoria?: string
  hora?: string
  /** Qué se sabe de más, en la voz del cronograma. */
  nota?: string
  /**
   * De dónde salió el dato. `campana` = cronograma de la SRM, que es fuente primaria
   * porque la campaña la operamos nosotros; `plan-vivo` = además publicado y verificable
   * en srm-expo117-plan.vercel.app.
   */
  fuente: 'plan-vivo' | 'campana'
}

/**
 * El cronograma. Los cuatro del medio están publicados en el plan vivo de la campaña;
 * los tres de los extremos vienen del cronograma de la SRM.
 */
export const REMATES_EXPO: RemateExpo[] = [
  {
    fecha: '2026-09-04',
    firma: 'RDI',
    modalidad: 'televisado',
    fuente: 'campana',
  },
  {
    fecha: '2026-09-09',
    firma: 'HK Agro',
    slug: 'hk-agro',
    modalidad: 'televisado',
    categoria: 'invernada',
    hora: '18:00',
    nota: 'Abre la rueda, el día que entran los animales a la muestra.',
    fuente: 'plan-vivo',
  },
  {
    fecha: '2026-09-10',
    firma: 'Javier U. Ávalos y UMC',
    slug: 'umc-villaguay',
    modalidad: 'streaming',
    categoria: 'especial',
    hora: '18:00',
    nota: 'Primer día de muestra.',
    fuente: 'plan-vivo',
  },
  {
    fecha: '2026-09-11',
    firma: 'Gananor Pujol',
    slug: 'gananor-pujol',
    modalidad: 'televisado',
    categoria: 'especial',
    hora: '18:00',
    fuente: 'plan-vivo',
  },
  {
    fecha: '2026-09-12',
    firma: 'Remate de reproductores de la 117ª',
    modalidad: 'fisico',
    categoria: 'reproductores',
    nota: 'El remate de la Expo, en el predio: lo que se juró esa semana sale a la venta.',
    fuente: 'plan-vivo',
  },
  {
    fecha: '2026-09-16',
    firma: 'Javier U. Ávalos y UMC',
    slug: 'umc-villaguay',
    modalidad: 'fisico',
    nota: 'El mismo binomio que remató por streaming el 10, ahora en pista.',
    fuente: 'campana',
  },
  {
    fecha: '2026-09-17',
    firma: 'Trumil / La Morenita',
    modalidad: 'fisico',
    categoria: 'reproductores',
    nota: 'Cierra la rueda.',
    fuente: 'campana',
  },
]

const DIA_MS = 86_400_000

interface RemateBase {
  date?: string
  location?: string
  consignatariaName?: string
}

export interface PlazaComparada {
  sede: string
  firmas: number
  remates: number
}

/**
 * Recorre la base y devuelve, para cada sede, la ventana de 14 días con más firmas
 * distintas. Es la medida que importa: muchos remates de una sola casa son una casa
 * activa; muchas casas en la misma plaza y la misma quincena son una plaza.
 */
export function plazasPorConcentracion(ventanaDias = 14): PlazaComparada[] {
  const porSede = new Map<string, { etiqueta: string; items: Array<{ fecha: number; firma: string }> }>()

  for (const r of rematesData as RemateBase[]) {
    const sede = (r.location ?? '').trim()
    const fecha = r.date ?? ''
    if (!sede || fecha.length !== 10) continue
    const ms = Date.parse(`${fecha}T00:00:00Z`)
    if (Number.isNaN(ms)) continue
    // La misma plaza viene escrita de varias formas —"San Nicolas de los Arroyos,
    // Buenos Aires" y "SAN NICOLAS DE LOS ARROYOS, BUENOS AIRES"— y sin unificarlas
    // Expoagro se contaba dos veces, partido en dos entradas más chicas que la real.
    const clave = normalizarSede(sede)
    const entrada = porSede.get(clave) ?? { etiqueta: sede, items: [] }
    // Se conserva la grafía más prolija (la que no está toda en mayúsculas).
    if (sede === sede.toUpperCase() ? false : entrada.etiqueta === entrada.etiqueta.toUpperCase()) {
      entrada.etiqueta = sede
    }
    entrada.items.push({ fecha: ms, firma: normalizarFirma(r.consignatariaName) })
    porSede.set(clave, entrada)
  }

  const salida: PlazaComparada[] = []
  for (const { etiqueta, items } of porSede.values()) {
    items.sort((a, b) => a.fecha - b.fecha)
    let mejor = { firmas: 0, remates: 0 }
    for (const { fecha } of items) {
      const dentro = items.filter((x) => x.fecha >= fecha && x.fecha <= fecha + (ventanaDias - 1) * DIA_MS)
      const firmas = new Set(dentro.map((x) => x.firma)).size
      if (firmas > mejor.firmas || (firmas === mejor.firmas && dentro.length > mejor.remates)) {
        mejor = { firmas, remates: dentro.length }
      }
    }
    salida.push({ sede: etiqueta, ...mejor })
  }

  return salida.sort((a, b) => b.firmas - a.firmas || b.remates - a.remates)
}

/** Misma plaza escrita distinto: minúsculas, sin tildes y sin puntuación. */
function normalizarSede(sede: string): string {
  return sede
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Misma casa escrita distinto: "UMC S.A." y "UMC SA" no son dos firmas. */
function normalizarFirma(nombre: string | undefined): string {
  return (nombre ?? '?')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(s\.?a\.?|s\.?r\.?l\.?|y cia\.?|cia\.?|ltda\.?)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * ¿Todavía tiene sentido destacarla?
 *
 * Un destacado de un evento que ya pasó es peor que ningún destacado: envejece la home
 * de remates y quema la credibilidad del resto. Vale hasta el día del último remate
 * inclusive; después, el bloque desaparece solo y la página queda como archivo.
 */
export function expoVigente(hoy = new Date()): boolean {
  const ultimo = REMATES_EXPO[REMATES_EXPO.length - 1]?.fecha
  if (!ultimo) return false
  return hoy.toISOString().slice(0, 10) <= ultimo
}

export interface PosicionNacional {
  puesto: number
  firmas: number
  remates: number
  /** Las plazas que la superan, si alguna. */
  porEncima: PlazaComparada[]
}

/**
 * En qué puesto del país queda la rueda de Mercedes.
 *
 * Se compara contra sedes distintas de Mercedes misma: la base la tiene cargada
 * parcialmente (cuatro de los siete), así que incluirla sería competir contra una
 * versión incompleta de sí misma.
 */
export function posicionNacional(): PosicionNacional {
  const firmas = new Set(REMATES_EXPO.map((r) => r.firma)).size
  const otras = plazasPorConcentracion().filter((p) => !/mercedes/i.test(p.sede))
  const porEncima = otras.filter((p) => p.firmas > firmas)
  return { puesto: porEncima.length + 1, firmas, remates: REMATES_EXPO.length, porEncima }
}
