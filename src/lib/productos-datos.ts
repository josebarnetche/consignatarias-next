/**
 * productos-datos.ts — catálogo de los productos de datos, con su meta financiera y su
 * fecha de muerte.
 *
 * POR QUÉ ESTE ARCHIVO EXISTE
 * En este proyecto ya se construyeron dos features —alertas de precio y carga de DTE— que
 * tienen **cero uso en 48 usuarios**. Nunca se apagaron porque nunca hubo un criterio
 * escrito para apagarlas. Acá cada producto nace con una meta en pesos y una fecha: si esa
 * fecha llega sin la meta, el producto se retira. La decisión ya está tomada de antemano,
 * cuando todavía no duele.
 *
 * El catálogo es CÓDIGO y no tabla, igual que `guias-premium.ts`: el precio, la meta y la
 * fecha de corte cambian con un deploy, y así el sales page, el checkout, el sitemap y el
 * panel de control leen exactamente lo mismo. Lo único que vive en la base es la venta.
 *
 * REGLA DE PRECIO DE LA CASA: el precio se comunica como rango, no como número seco. Por
 * eso cada producto declara `precioMin`/`precioMax` además del que efectivamente se cobra.
 */

import { PRO_ABIERTO } from './plan-pro'

export type Modalidad = 'suscripcion' | 'compra-unica'

/** Las audiencias del plan de monetización. Ningún producto comparte audiencia en el mismo sprint. */
export type Audiencia =
  | 'A1-casas-mag'
  | 'A2-casas-interior'
  | 'A3-newsletter'
  | 'A4-registrados'
  | 'A5-trafico-arrendamiento'
  /** El tráfico de `/campos/valuar`: 28 usos de herramienta en 90 días, mediana de 73 s. */
  | 'A6-trafico-valuacion'
  /** Quien topa con un muro PRO: ya usa la herramienta y quiere más profundidad. */
  | 'A8-topo-con-muro'
  | 'A7-busqueda-departamento'

export interface ProductoDatos {
  slug: string
  /** Nombre comercial. Es el que ve el comprador y el que viaja a Rebill. */
  nombre: string
  /** Una línea: qué resuelve. Va en el sales page, el sitemap y el mail. */
  tagline: string
  /** La pregunta que el comprador hoy no puede contestar. Es el corazón del copy. */
  pregunta: string
  /** A quién se le vende. Una sola audiencia por producto. */
  audiencia: Audiencia
  modalidad: Modalidad

  /** Rango comunicable. Nunca se publica un precio sin su rango. */
  precioMin: number
  precioMax: number
  /** Lo que efectivamente se cobra hoy, en ARS. Siempre dentro del rango. */
  precio: number

  /** Ruta pública del sales page. */
  landing: string
  /** Ícono de marca para la tarjeta en los listados (`public/marca/iconos-color/`). */
  icono: string
  /** Ilustración de cabecera del sales page (`public/marca/ilus/`). */
  ilustracion: string
  /** Texto alternativo de la ilustración. No es decorativo: la página se lee sin imágenes. */
  ilustracionAlt: string

  /**
   * META FINANCIERA Y KILL SWITCH.
   * `metaArs` es lo que tiene que haber entrado por ESTE producto para el `fechaCorte`.
   * En suscripciones es ARS/mes recurrente; en compra única es acumulado.
   */
  metaArs: number
  /** ISO. El día que se evalúa. Si no llegó, se retira. */
  fechaCorte: string
  /** Qué se hace si no llega. Escrito ahora, no el día de la decisión. */
  siNoLlega: string

  /** Términos que este producto tiene que capturar en buscadores y en asistentes. */
  keywords: string[]
  /**
   * Publicado o todavía en preparación.
   *
   * **REGLA DURA: `true` sólo si el entregable se puede generar HOY.** Un producto no
   * publicado no aparece en el hub ni en el sitemap, y su checkout responde 404
   * (`/api/informes/checkout`), así que no hay forma de cobrar por algo que después no
   * se entrega. Su sales page sigue existiendo para poder verla y ajustarla.
   *
   * Hoy el despacho de generadores vive en `src/app/api/informes/[producto]/download`.
   */
  publicado: boolean
}

export const PRODUCTOS_DATOS: ProductoDatos[] = [
  {
    slug: 'informe-canon-arrendamiento',
    nombre: 'Informe de canon de arrendamiento',
    tagline:
      'Cuántos kilos de novillo por hectárea paga tu zona, con la serie de precios para convertirlos a pesos el día que liquidás.',
    pregunta: '¿El canon que me proponen está bien o me están corriendo?',
    audiencia: 'A5-trafico-arrendamiento',
    modalidad: 'compra-unica',
    precioMin: 15000,
    precioMax: 30000,
    precio: 19900,
    landing: '/informes/canon-de-arrendamiento',
    icono: '/marca/iconos-color/arrendamiento.png',
    ilustracion: '/marca/ilus/ilu-molino.jpg',
    ilustracionAlt: 'Molino en un campo de pastoreo al atardecer',
    metaArs: 400000,
    fechaCorte: '2026-10-24',
    siNoLlega:
      'Se retira el producto pago y la tabla del canon queda gratis como imán de suscripción. La página ya trae el 28 % del tráfico del sitio: sirve igual sin cobrar.',
    keywords: [
      'canon de arrendamiento rural',
      'cuánto se paga de arrendamiento por hectárea',
      'arrendamiento en kilos de novillo',
      'precio de arrendamiento de campo ganadero',
      'calcular canon de arrendamiento',
    ],
    publicado: true,
  },
  {
    slug: 'informe-productivo-departamento',
    nombre: 'Informe productivo de tu departamento',
    tagline:
      'Catorce años de stock, composición del rodeo y eficiencia de tu partido, contra los de al lado, con lo que dice INTA que se puede mejorar ahí.',
    pregunta: '¿Mi zona produce bien o mal, y comparada con cuál?',
    audiencia: 'A3-newsletter',
    modalidad: 'compra-unica',
    precioMin: 15000,
    precioMax: 30000,
    precio: 19900,
    landing: '/informes/productivo-departamental',
    icono: '/marca/iconos-color/indice.png',
    ilustracion: '/marca/ilus/ilu-pampa.jpg',
    ilustracionAlt: 'Vista abierta de campo pampeano con hacienda',
    metaArs: 300000,
    fechaCorte: '2026-11-21',
    siNoLlega:
      'Se retira la venta al productor y el informe pasa a ser insumo del producto co-marcado para consignatarias, que es donde el crítico ubicó el bolsillo. Las 455 fichas gratuitas quedan igual: son el activo de búsqueda.',
    keywords: [
      'stock ganadero por departamento',
      'índice de destete por partido',
      'cuántas cabezas hay en mi departamento',
      'existencias bovinas por departamento',
      'productividad ganadera por zona',
    ],
    publicado: true,
  },
  {
    slug: 'pro-territorio',
    nombre: 'PRO Territorio',
    tagline:
      'El mapa de los partidos donde tu casa no tiene un solo remitente, sobre productores que ya demostraron que mandan hacienda a Cañuelas.',
    pregunta: '¿A qué partido mando al comercial el mes que viene?',
    audiencia: 'A1-casas-mag',
    modalidad: 'suscripcion',
    precioMin: 75000,
    precioMax: 110000,
    precio: 85000,
    landing: '/para-consignatarias/pro-territorio',
    icono: '/marca/iconos-color/buscador-lupa.png',
    ilustracion: '/marca/ilus/ilu-sec-consignatarias.jpg',
    ilustracionAlt: 'Corral de remate con hacienda y operadores',
    metaArs: 255000,
    fechaCorte: '2026-10-03',
    siNoLlega:
      'Se baja el precio a la banda inferior (75.000) por un ciclo. Si tampoco entra, se discontinúa: el dato del cruce queda alimentando el informe provincial, que se le vende a otra audiencia.',
    keywords: [
      'prospección de remitentes',
      'dónde conseguir clientes consignataria de hacienda',
      'partidos que mandan hacienda a Cañuelas',
      'inteligencia comercial ganadera',
    ],
    publicado: false, // sin generador de PDF todavía: no se cobra lo que no se entrega
  },
  {
    slug: 'informe-prospeccion-provincial',
    nombre: 'Informe de prospección provincial',
    tagline:
      'Dónde está el rodeo de tu provincia, qué partidos crecen y cuáles se vacían, con la escala media de cada uno.',
    pregunta: '¿Dónde queda rodeo que todavía no tiene quién se lo venda?',
    audiencia: 'A2-casas-interior',
    modalidad: 'compra-unica',
    precioMin: 45000,
    precioMax: 90000,
    precio: 65000,
    landing: '/para-consignatarias/informe-provincial',
    icono: '/marca/iconos-color/casa-remates.png',
    ilustracion: '/marca/ilus/ilu-sec-mercado.jpg',
    ilustracionAlt: 'Tropa de hacienda en movimiento hacia el embarcadero',
    metaArs: 390000,
    fechaCorte: '2026-11-21',
    siNoLlega:
      'Se discontinúa. Es el producto con la audiencia más fría del plan (85 firmas sin dato propio que mostrarles) y el que más depende de que las fichas departamentales hayan indexado.',
    keywords: [
      'stock ganadero por provincia',
      'mapa ganadero provincial',
      'dónde hay hacienda en mi provincia',
      'informe ganadero provincial',
    ],
    publicado: true,
  },  {
    slug: 'parte-semanal-mercado',
    nombre: 'Parte semanal del mercado',
    tagline:
      'El cierre de la semana en PDF, con la lectura de si el movimiento fue señal o ruido, once años de contexto y los remates de los próximos siete días.',
    pregunta: '¿Lo de esta semana fue algo o fue ruido?',
    audiencia: 'A4-registrados',
    modalidad: 'suscripcion',
    precioMin: 8000,
    precioMax: 15000,
    precio: 9900,
    landing: '/informes/parte-semanal',
    icono: '/marca/iconos-color/indice.png',
    ilustracion: '/marca/ilus/ilu-sec-mercado.jpg',
    ilustracionAlt: 'Corrales del mercado con hacienda al amanecer',
    metaArs: 100000,
    fechaCorte: '2026-11-28',
    siNoLlega:
      'Se discontinúa la suscripción y el parte pasa a ser el contenido del newsletter gratuito, que ya sale igual. La franja de precio entre lo gratis y los informes técnicos está vacía en este mercado, y si no entra es la señal de que no existe.',
    keywords: [
      'precio del novillo esta semana',
      'reporte semanal mercado ganadero',
      'relación maíz novillo histórico',
      'cierre semanal hacienda',
      'informe semanal precios ganado',
    ],
    publicado: false, // se publica cuando exista el cobro por suscripción
  },  {
    slug: 'informe-valuacion-campo',
    nombre: 'Informe de valuación de tu zona',
    tagline:
      'Cuánto vale la hectárea donde está tu campo, por las dos vías que usa una tasación seria, con la banda real en la que se opera y sobre cuántos casos.',
    pregunta: '¿Lo que me ofrecen por mi campo está dentro de lo que se paga?',
    audiencia: 'A6-trafico-valuacion',
    modalidad: 'compra-unica',
    precioMin: 15000,
    precioMax: 30000,
    precio: 24900,
    landing: '/informes/valuacion-de-campo',
    icono: '/marca/iconos-color/arrendamiento.png',
    ilustracion: '/marca/ilus/ilu-pampa.jpg',
    ilustracionAlt: 'Campo abierto con alambrado al atardecer',
    metaArs: 300000,
    fechaCorte: '2026-11-30',
    siNoLlega:
      'Se retira el pago y la calculadora de /campos/valuar queda gratis como imán de suscripción, que es lo que ya es. La herramienta tiene 28 usos medidos en 90 días: sirve igual sin cobrar.',
    keywords: [
      'cuánto vale una hectárea',
      'precio de la hectárea por zona',
      'valor de campos ganaderos',
      'tasación de campo',
      'cuánto vale mi campo',
      'precio del campo en dólares',
    ],
    publicado: true,
  },  {
    // El plan personal, definido en `plan-pro.ts` (qué se gatea y qué no). Entra al
    // catálogo para reusar el circuito de suscripción, la meta y el kill switch — es un
    // producto más, no una excepción.
    slug: PRO_ABIERTO.slug,
    nombre: PRO_ABIERTO.nombre,
    tagline: PRO_ABIERTO.tagline,
    pregunta: '¿Dónde cae el número de hoy en su propia historia?',
    audiencia: 'A8-topo-con-muro',
    modalidad: 'suscripcion',
    precioMin: PRO_ABIERTO.precioMin,
    precioMax: PRO_ABIERTO.precioMax,
    precio: PRO_ABIERTO.precio,
    landing: '/pro',
    icono: '/marca/iconos-color/indice.png',
    ilustracion: '/marca/ilus/ilu-sec-mercado.jpg',
    ilustracionAlt: 'Pantalla de precios del mercado ganadero',
    metaArs: PRO_ABIERTO.metaArs,
    fechaCorte: PRO_ABIERTO.fechaCorte,
    siNoLlega: PRO_ABIERTO.siNoLlega,
    keywords: [
      'serie histórica precio del novillo',
      'exportar precios ganaderos csv',
      'alertas de precio hacienda',
      'datos históricos mercado ganadero',
    ],
    publicado: false, // se publica cuando Rebill permita dar de baja el debito
  },
]

export function getProducto(slug: string): ProductoDatos | null {
  return PRODUCTOS_DATOS.find((p) => p.slug === slug) ?? null
}

export function getProductosPublicados(): ProductoDatos[] {
  return PRODUCTOS_DATOS.filter((p) => p.publicado)
}

export type EstadoLanzamiento = 'en-plazo' | 'meta-cumplida' | 'vencido-sin-meta'

export interface Evaluacion {
  producto: ProductoDatos
  vendidoArs: number
  /** 0 a 1+. Cuánto de la meta se cubrió. */
  avance: number
  diasRestantes: number
  estado: EstadoLanzamiento
  /** El texto que se muestra en el panel. Dice qué hacer, no cómo viene. */
  veredicto: string
}

/**
 * Evalúa un producto contra su meta y su fecha.
 *
 * Función pura a propósito: la decisión de matar un producto no puede depender de que
 * alguien se acuerde de mirar. El panel la llama con las ventas reales y el día de hoy.
 *
 * `meta-cumplida` gana sobre la fecha: si llegó antes, llegó.
 */
export function evaluar(producto: ProductoDatos, vendidoArs: number, hoy = new Date()): Evaluacion {
  const corte = new Date(`${producto.fechaCorte}T23:59:59-03:00`)
  const diasRestantes = Math.ceil((corte.getTime() - hoy.getTime()) / 86_400_000)
  const avance = producto.metaArs > 0 ? vendidoArs / producto.metaArs : 0

  let estado: EstadoLanzamiento
  let veredicto: string

  if (vendidoArs >= producto.metaArs) {
    estado = 'meta-cumplida'
    veredicto = 'Meta cumplida. Sigue.'
  } else if (diasRestantes > 0) {
    estado = 'en-plazo'
    const unidad = producto.modalidad === 'suscripcion' ? 'ARS/mes' : 'ARS'
    veredicto = `Faltan ${diasRestantes} días y ${fmt(producto.metaArs - vendidoArs)} ${unidad}.`
  } else {
    estado = 'vencido-sin-meta'
    veredicto = `Venció el ${producto.fechaCorte} con ${Math.round(avance * 100)} % de la meta. ${producto.siNoLlega}`
  }

  return { producto, vendidoArs, avance, diasRestantes, estado, veredicto }
}

function fmt(n: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.max(0, n))
}

/** Precio comunicado. La regla de la casa es rango, nunca número seco. */
export function rangoPrecio(p: ProductoDatos): string {
  return `entre ${fmt(p.precioMin)} y ${fmt(p.precioMax)}`
}
