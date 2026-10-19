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
import type { OrigenVisitas } from './origen-visitas'
import type { ResultadoVsMercado } from './resultado-vs-mercado'

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

/** Muestra del bloque "Quién te mira" (OrigenVisitas). Inventada, como todo lo de acá. */
export const ORIGEN_VISITAS_MUESTRA: OrigenVisitas = {
  porDia: Array.from({ length: 30 }, (_, i) => ({
    dia: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
    vistas: [2, 4, 3, 6, 1, 0, 5][i % 7] + (i % 5),
  })),
  total: 142,
  porOrigen: [
    { origen: 'buscadores', vistas: 58 },
    { origen: 'sitio', vistas: 47 },
    { origen: 'directo', vistas: 21 },
    { origen: 'ias', vistas: 9 },
    { origen: 'redes', vistas: 7 },
  ],
  porSeccion: [
    { seccion: 'remates', vistas: 26 },
    { seccion: 'directorio', vistas: 21 },
  ],
  sinDato: 0,
  ias: [
    { motor: 'ChatGPT', visitas: 6 },
    { motor: 'Copilot', visitas: 3 },
  ],
  iasTotal: 9,
  diaFuerte: 3,
}

/**
 * Muestra de "Su precio contra el mercado" (ResultadoVsMercado), para las firmas del
 * interior que todavía no son PRO. 17-10-2026. Inventada como todo lo de acá: el
 * remate, las cabezas y los precios son de ejemplo, y las bandas son del orden de
 * las del VR pero no son la banda de ningún día. Trae una fila de cada situación
 * (arriba, en la banda, debajo, sin referencia) para que se vea qué responde el panel.
 */
export const RESULTADO_VS_MERCADO_MUESTRA: ResultadoVsMercado[] = [
  {
    id: 'ejemplo-1',
    fecha: '2026-10-10',
    titulo: 'Remate de ejemplo · Feria mensual',
    provincia: 'Corrientes',
    filas: [
      {
        categoria: 'Vaca', codigo: 'VACA', cabezas: 320, pesoKg: 420, precioFirma: 3150,
        referencia: { p10: 2650, mediana: 3000, p90: 3600, lotes: 410, confianza: 'alta', base: 'rango_peso', rango: { desde_kg: 400, hasta_kg: 449 }, origen: null, fechaBanda: '2026-10-09' },
        posicion: 'en la banda, arriba de la mediana', pctVsMediana: 5, nota: 'Banda nacional de los lotes de 400–449 kg.',
      },
      {
        categoria: 'Novillito', codigo: 'NOVILLITO', cabezas: 140, pesoKg: null, precioFirma: 5150,
        referencia: { p10: 3900, mediana: 4600, p90: 5000, lotes: 480, confianza: 'alta', base: 'categoria', rango: null, origen: null, fechaBanda: '2026-10-09' },
        posicion: 'arriba de la banda', pctVsMediana: 12, nota: 'Banda nacional de la categoría.',
      },
      {
        categoria: 'Vaquillona', codigo: 'VAQUILLONA', cabezas: 95, pesoKg: 300, precioFirma: 3300,
        referencia: { p10: 3450, mediana: 4400, p90: 4900, lotes: 210, confianza: 'alta', base: 'rango_peso', rango: { desde_kg: 300, hasta_kg: 349 }, origen: null, fechaBanda: '2026-10-09' },
        posicion: 'debajo de la banda', pctVsMediana: -25, nota: 'Banda nacional de los lotes de 300–349 kg.',
      },
      {
        categoria: 'Ternero', codigo: null, cabezas: 610, pesoKg: 180, precioFirma: 5600,
        referencia: null, posicion: null, pctVsMediana: null,
        nota: 'El MAG no opera terneros por lote: no hay Valor de Referencia para esta categoría.',
      },
    ],
  },
]

/**
 * Muestra del bloque "Lo que buscan en Google sobre su firma" (BusquedasGoogle,
 * 17-10-2026). Inventada, como todo lo de acá: "La Ejemplo" no es ninguna casa. Los
 * órdenes de magnitud son los de una ficha real con tráfico de marca (miles de
 * impresiones en 90 días, decenas de clics) para que se vea el tamaño del dato.
 */
// Tipo en línea (y no un import arriba) para que este agregado sea sólo al final del archivo.
export const BUSQUEDAS_GOOGLE_MUESTRA: import('@/lib/gsc/fichas').BusquedasFicha = {
  d28: {
    dias: 28,
    desde: '2026-01-04',
    hasta: '2026-01-31',
    impresiones: 712,
    clics: 6,
    posicion: 6.4,
    consultas: [
      { query: 'la ejemplo y cia', impresiones: 251, clics: 2, posicion: 6.1 },
      { query: 'la ejemplo', impresiones: 133, clics: 1, posicion: 7.0 },
      { query: 'la ejemplo remate hoy en vivo', impresiones: 22, clics: 1, posicion: 7.4 },
      { query: 'remate la ejemplo en vivo', impresiones: 17, clics: 0, posicion: 7.8 },
      { query: 'la ejemplo consignataria', impresiones: 9, clics: 0, posicion: 5.0 },
    ],
    actualizado: '2026-02-02T12:00:00Z',
  },
  d90: {
    dias: 90,
    desde: '2025-11-03',
    hasta: '2026-01-31',
    impresiones: 2840,
    clics: 19,
    posicion: 6.5,
    consultas: [
      { query: 'la ejemplo y cia', impresiones: 1310, clics: 6, posicion: 6.2 },
      { query: 'la ejemplo', impresiones: 402, clics: 3, posicion: 7.1 },
      { query: 'la ejemplo y cia srl', impresiones: 88, clics: 1, posicion: 5.8 },
      { query: 'la ejemplo remate hoy en vivo', impresiones: 61, clics: 2, posicion: 7.5 },
      { query: 'remate la ejemplo en vivo', impresiones: 44, clics: 0, posicion: 7.7 },
      { query: 'la ejemplo consignataria', impresiones: 27, clics: 0, posicion: 5.0 },
      { query: 'la ejemplo cuit', impresiones: 15, clics: 0, posicion: 4.2 },
    ],
    actualizado: '2026-02-02T12:00:00Z',
  },
}
