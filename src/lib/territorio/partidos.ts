import { getDepartamentosPublicables, type Departamento } from '@/lib/productividad/panel'

/**
 * partidos.ts — traduce el origen declarado de un lote del MAG al partido del padrón.
 *
 * POR QUÉ HACE FALTA
 * `mag_consignataria_sales_lots.localidad` **no son localidades: son partidos**, escritos
 * con las abreviaturas del mercado (`GRAL. VILLEGAS`, `CNEL. SUAREZ`, `A. ALSINA`) y de
 * vez en cuando con el pueblo en lugar de la cabecera (`CARHUÉ`, `PIEDRITAS`). El padrón
 * oficial los escribe completos. Sin traducirlos, 38 de 117 orígenes no encuentran su
 * partido y el cruce con el stock se cae justo en los más grandes.
 *
 * Con esto, el origen de cada lote se puede parar al lado del rodeo de ese partido: cuánta
 * hacienda hay, cuántos establecimientos, y cuántos productores de ahí ya mandan al MAG.
 * Es el insumo de PRO Territorio.
 *
 * CÓMO MANTENERLO
 * El diccionario es sólo para lo que la normalización no resuelve. Si aparece un origen
 * nuevo sin mapear, el test de cobertura lo delata antes de que llegue a un panel.
 */

/** Sin acentos, sin puntuación, en mayúsculas. Resuelve la mayoría de los casos. */
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

/**
 * Lo que la normalización no puede resolver sola.
 *
 * Tres familias:
 *  · **Abreviaturas del mercado** — `GRAL.`, `CNEL.`, iniciales sueltas.
 *  · **Números escritos con cifra** que el padrón escribe con palabra, igual que en el
 *    panel (`9 DE JULIO` → `Nueve de Julio`).
 *  · **Pueblos que no son cabecera** — el remitente declara de dónde salió la hacienda,
 *    no el partido: Carhué es Adolfo Alsina, Piedritas y Santa Regina son General
 *    Villegas, Gorchs es General Belgrano.
 *
 * El sufijo ` B` de algunos orígenes (`AYACUCHO B`, `RIVADAVIA B`) es el desambiguador de
 * provincia del propio mercado: hay un Ayacucho en San Luis y una Rivadavia en Mendoza.
 */
const ALIAS: Record<string, string> = {
  // Números con cifra → palabra (el padrón los renombró; ver ALIAS_DEPARTAMENTOS del panel)
  '25 DE MAYO': 'VEINTICINCO DE MAYO',
  '9 DE JULIO': 'NUEVE DE JULIO',

  // Abreviaturas de tratamiento
  'GRAL ALVARADO': 'GENERAL ALVARADO',
  'GRAL ALVEAR': 'GENERAL ALVEAR',
  'GRAL ARENALES': 'GENERAL ARENALES',
  'GRAL BELGRANO': 'GENERAL BELGRANO',
  'GRAL GUIDO': 'GENERAL GUIDO',
  'GRAL LA MADRID': 'GENERAL LA MADRID',
  'GRAL LAS HERAS': 'GENERAL LAS HERAS',
  'GRAL LAVALLE B': 'GENERAL LAVALLE',
  'GRAL MADARIAGA': 'GENERAL MADARIAGA',
  'GRAL PAZ': 'GENERAL PAZ',
  'GRAL PINTO': 'GENERAL PINTO',
  'GRAL PUEYRREDON': 'GENERAL PUEYRREDON',
  'GRAL RODRIGUEZ': 'GENERAL RODRIGUEZ',
  'GRAL VIAMONTE': 'GENERAL VIAMONTE',
  'GRAL VILLEGAS': 'GENERAL VILLEGAS',
  'CNEL DORREGO': 'CORONEL DORREGO',
  'CNEL PRINGLES': 'CORONEL PRINGLES',
  'CNEL SUAREZ': 'CORONEL SUAREZ',
  'H IRIGOYEN': 'HIPOLITO YRIGOYEN',
  'L N ALEM B': 'LEANDRO N ALEM',
  'SAN A DE ARECO': 'SAN ANTONIO DE ARECO',
  'SAN A GILES': 'SAN ANDRES DE GILES',
  'A ALSINA': 'ADOLFO ALSINA',

  // El padrón usa el nombre completo
  BRANDSEN: 'CORONEL BRANDSEN',
  'FLORENTINO AMEGHINO': 'AMEGHINO',

  // Sufijo de desambiguación de provincia del propio mercado
  'AYACUCHO B': 'AYACUCHO',
  'RIVADAVIA B': 'RIVADAVIA',

  // Pueblo declarado en vez de la cabecera del partido
  CARHUE: 'ADOLFO ALSINA',
  AMERICA: 'RIVADAVIA',
  PIEDRITAS: 'GENERAL VILLEGAS',
  'SANTA REGINA': 'GENERAL VILLEGAS',
  GORCHS: 'GENERAL BELGRANO',
  'VERONICA PDO PUNTA': 'PUNTA INDIO',
  'MAR DEL PLATA': 'GENERAL PUEYRREDON',
}

/**
 * Orígenes que NO son un partido bonaerense y se descartan a propósito.
 *
 * `PICHINCHA` es un barrio de Rosario y `E. CRUZ` no corresponde a ningún partido de la
 * provincia; entre los dos suman 5 lotes. Se listan en vez de ignorarlos en silencio para
 * que el test de cobertura no los cuente como agujeros.
 */
export const SIN_PARTIDO = new Set(['PICHINCHA', 'E CRUZ'])

let cache: Map<string, Departamento> | null = null

function padron(): Map<string, Departamento> {
  cache ??= new Map(
    getDepartamentosPublicables()
      .filter((d) => d.provincia === 'BUENOS AIRES')
      .map((d) => [normalizar(d.nombre), d]),
  )
  return cache
}

/**
 * Resuelve el origen declarado de un lote al partido del padrón.
 *
 * Devuelve `null` cuando el origen no es un partido bonaerense o cuando no hay
 * correspondencia — nunca adivina.
 */
export function partidoDeOrigen(localidad: string | null | undefined): Departamento | null {
  if (!localidad) return null
  const n = normalizar(localidad)
  if (!n || SIN_PARTIDO.has(n)) return null
  return padron().get(ALIAS[n] ?? n) ?? null
}

/** Los orígenes que no se pudieron resolver. Alimenta el test de cobertura. */
export function origenesSinResolver(localidades: string[]): string[] {
  return [
    ...new Set(
      localidades.filter((l) => {
        const n = normalizar(l)
        return n && !SIN_PARTIDO.has(n) && !partidoDeOrigen(l)
      }),
    ),
  ]
}
