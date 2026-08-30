/**
 * muestras.ts — datos de EJEMPLO para el preview de los bloques del Mercado.
 *
 * Se le muestran a una firma FREE para que vea la forma de lo que compraría. Todo lo
 * de acá es **inventado a propósito**: no es el dato de nadie, ni real difuminado.
 *
 * Los nombres son deliberadamente genéricos ("Establecimiento El Ejemplo") para que
 * no se puedan confundir con un remitente de verdad ni con una casa existente. Los
 * números son plausibles —del orden de los reales— porque la muestra tiene que dejar
 * ver de qué tamaño es la información, no engañar sobre ella.
 */

import type { Cartera } from './cartera'
import type { Benchmark } from './benchmark'
import type { Participacion } from './participacion'
import type { Territorio } from './territorio'

export const CARTERA_MUESTRA: Cartera = {
  slug: 'ejemplo',
  dias: 90,
  totalClientes: 148,
  cabezas: 6420,
  concentracionTop5: 28.4,
  enRiesgo: [
    {
      nombre: 'Establecimiento El Ejemplo S.A.',
      localidad: 'Localidad',
      provincia: 'BUENOS AIRES',
      diasSilencio: 54,
      cadenciaDias: 10,
      consignaciones: 6,
      cabezas: 404,
      seFueA: null,
    },
    {
      nombre: 'Agropecuaria de Muestra S.R.L.',
      localidad: 'Localidad',
      provincia: 'BUENOS AIRES',
      diasSilencio: 68,
      cadenciaDias: 9,
      consignaciones: 5,
      cabezas: 237,
      seFueA: 'Otra casa del Mercado',
    },
    {
      nombre: 'Cabaña Sin Nombre',
      localidad: 'Localidad',
      provincia: 'BUENOS AIRES',
      diasSilencio: 47,
      cadenciaDias: 7,
      consignaciones: 4,
      cabezas: 121,
      seFueA: null,
    },
  ],
  ganados: [
    { nombre: 'Don Ejemplo e Hijos', localidad: 'Localidad', cabezas: 145, veniaDe: 'Otra casa del Mercado', desde: '2026-07-01' },
    { nombre: 'La Muestra S.A.', localidad: 'Localidad', cabezas: 117, veniaDe: 'Otra casa del Mercado', desde: '2026-07-14' },
  ],
  nuevos: [],
  top: [
    { nombre: 'El Ejemplo Grande S.A.', localidad: 'Localidad', cabezas: 1619, consignaciones: 22, pctDelVolumen: 9 },
    { nombre: 'Segunda Muestra S.A.', localidad: 'Localidad', cabezas: 761, consignaciones: 14, pctDelVolumen: 4.2 },
    { nombre: 'Tercer Ejemplo S.R.L.', localidad: 'Localidad', cabezas: 515, consignaciones: 11, pctDelVolumen: 2.9 },
  ],
}

export const BENCHMARK_MUESTRA: Benchmark = {
  slug: 'ejemplo',
  dias: 60,
  totalLotes: 640,
  totalCabezas: 5210,
  clientes: 148,
  ultimaVenta: null,
  filas: [
    { categoria: 'NOVILLO', lotes: 75, cabezas: 980, miPrecio: 4432, precioMercado: 4256, diffPct: 4.1, significativa: true, leyenda: '' },
    { categoria: 'VACA', lotes: 161, cabezas: 1740, miPrecio: 2702, precioMercado: 2792, diffPct: -3.2, significativa: true, leyenda: '' },
    { categoria: 'VAQUILLONA', lotes: 48, cabezas: 610, miPrecio: 4138, precioMercado: 4408, diffPct: -6.1, significativa: true, leyenda: '' },
    { categoria: 'NOVILLITO', lotes: 36, cabezas: 470, miPrecio: 4689, precioMercado: 4607, diffPct: 1.8, significativa: false, leyenda: '' },
    { categoria: 'TORO', lotes: 45, cabezas: 210, miPrecio: 2433, precioMercado: 2940, diffPct: -17.2, significativa: true, leyenda: '' },
  ],
  fuertes: [
    { categoria: 'NOVILLO', lotes: 75, cabezas: 980, miPrecio: 4432, precioMercado: 4256, diffPct: 4.1, significativa: true, leyenda: 'En novillo vendiste 4.1% por encima del promedio del mercado (75 lotes).' },
  ],
  debiles: [
    { categoria: 'TORO', lotes: 45, cabezas: 210, miPrecio: 2433, precioMercado: 2940, diffPct: -17.2, significativa: true, leyenda: 'En toro vendiste 17.2% por debajo del promedio del mercado (45 lotes).' },
  ],
}

export const PARTICIPACION_MUESTRA: Participacion = {
  slug: 'ejemplo',
  cabezas: 1939,
  cabezasMercado: 28458,
  cuota: 6.8,
  cuotaPrevia: 5.5,
  deltaPuntos: 1.3,
  puesto: 4,
  totalCasas: 22,
  significativo: true,
  leyenda: 'Ganaste terreno: pasaste de 5.5% a 6.8% del Mercado.',
  ranking: [
    { nombre: 'Primera casa del Mercado', cabezas: 5125, cuota: 18, esMia: false },
    { nombre: 'Segunda casa del Mercado', cabezas: 5091, cuota: 17.9, esMia: false },
    { nombre: 'Tercera casa del Mercado', cabezas: 2013, cuota: 7.1, esMia: false },
    { nombre: 'Tu casa', cabezas: 1939, cuota: 6.8, esMia: true },
    { nombre: 'Quinta casa del Mercado', cabezas: 1766, cuota: 6.2, esMia: false },
  ],
}

/**
 * Muestra del territorio para las firmas que todavía no son PRO.
 *
 * Los partidos son reales y los tamaños de rodeo también —salen del padrón— pero la
 * cartera es inventada: es una firma de ejemplo, no una casa concreta. Se elige a
 * propósito un caso con una cuota muy baja donde ya opera, porque es la situación que
 * más rápido se reconoce: "en esa zona yo tengo dos y va medio partido".
 */
export const TERRITORIO_MUESTRA: Territorio = {
  magId: 0,
  desde: '2026-05-23',
  hasta: '2026-08-30',
  totalRemitentesPropios: 186,
  totalPartidosConActividad: 106,
  presencia: [
    { partido: 'Rauch', slugProvincia: 'buenos-aires', slugDepartamento: 'rauch', propios: 2, totales: 63, cuota: 2 / 63, casas: 12, cabezasPropias: 148, stock: 455760, establecimientos: 1685, escalaMedia: 270, indice: 0.62 },
    { partido: 'Olavarría', slugProvincia: 'buenos-aires', slugDepartamento: 'olavarria', propios: 5, totales: 53, cuota: 5 / 53, casas: 13, cabezasPropias: 412, stock: 699253, establecimientos: 1634, escalaMedia: 428, indice: 0.6 },
    { partido: 'Las Flores', slugProvincia: 'buenos-aires', slugDepartamento: 'las-flores', propios: 21, totales: 52, cuota: 21 / 52, casas: 9, cabezasPropias: 1840, stock: 386412, establecimientos: 1102, escalaMedia: 351, indice: 0.63 },
  ],
  oportunidades: [
    { partido: 'Ayacucho', slugProvincia: 'buenos-aires', slugDepartamento: 'ayacucho', propios: 0, totales: 64, cuota: 0, casas: 9, cabezasPropias: 0, stock: 817651, establecimientos: 1854, escalaMedia: 441, indice: 0.61 },
    { partido: 'Trenque Lauquen', slugProvincia: 'buenos-aires', slugDepartamento: 'trenque-lauquen', propios: 0, totales: 79, cuota: 0, casas: 11, cabezasPropias: 0, stock: 361889, establecimientos: 724, escalaMedia: 500, indice: 0.66 },
    { partido: 'Adolfo Alsina', slugProvincia: 'buenos-aires', slugDepartamento: 'adolfo-alsina', propios: 0, totales: 68, cuota: 0, casas: 8, cabezasPropias: 0, stock: 245349, establecimientos: 812, escalaMedia: 302, indice: 0.64 },
  ],
}
