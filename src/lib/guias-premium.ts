/**
 * Guías premium — catálogo de PDFs pagos (compra única, no suscripción).
 *
 * Es la tercera línea de ingreso del sitio, y la primera que NO es recurrente:
 * el API/MCP y PRO Consignataria se cobran por mes; esto se cobra una vez y se
 * entrega un archivo. Por eso vive fuera de `subscriptions` y de `planes`: no
 * otorga tier, no vence, no se cancela — se compró o no se compró.
 *
 * El catálogo es código (no tabla) a propósito: el precio, el archivo maestro y
 * el índice del PDF cambian con un deploy, y así el sales page, el checkout y la
 * ruta de descarga leen exactamente lo mismo. La única fuente de verdad del
 * ENTITLEMENT sigue siendo la tabla `guia_purchases`.
 */

export interface GuiaPremium {
  slug: string
  /** Título comercial (el que ve el comprador y el que viaja a Rebill). */
  title: string
  /** Año de la edición. Es parte del producto: se vende por estar al día. */
  edicion: string
  /** Qué cambió en el mundo real y esta edición sí refleja. Va en tapa y en el sales page. */
  actualizacion: string
  /** Una línea: qué resuelve. Se usa en el sales page y en el mail. */
  tagline: string
  /** Precio en ARS. Rebill factura en ARS (ver CLAUDE.md § revenue lines). */
  priceArs: number
  /** Nombre del archivo maestro dentro de `private/guias/`. NO va en /public. */
  file: string
  /** Páginas del PDF — dato del sales page; se actualiza al regenerar. */
  pages: number
  /** Versión del contenido. Cambia cuando se re-edita la guía. */
  version: string
  /** Última actualización del contenido (ISO date). */
  updatedAt: string
  /** Ruta pública del sales page. */
  landing: string
}

export const GUIAS_PREMIUM: GuiaPremium[] = [
  {
    slug: 'abrir-una-consignataria',
    title: 'Cómo abrir tu consignataria de hacienda — Guía 2026',
    edicion: '2026',
    actualizacion:
      'Actualizada a agosto de 2026: el RUCA ya no rige para ganados y carnes. El trámite va por SIOCAL (Res. SAGyP 50/2025).',
    tagline:
      'El paso a paso real —matrícula, SIOCAL, ARCA, SENASA, plata y marketing— para poner una consignataria a operar en Argentina.',
    priceArs: 100000,
    file: 'abrir-una-consignataria-v1.pdf',
    pages: 53, // lo imprime scripts/guia-apertura/build.mjs al regenerar el maestro
    version: '1.0',
    updatedAt: '2026-08-19',
    landing: '/como-abrir-una-consignataria',
  },
]

export function getGuiaPremium(slug: string): GuiaPremium | null {
  return GUIAS_PREMIUM.find((g) => g.slug === slug) ?? null
}

/** Precio formateado en pesos, sin decimales — como se muestra en todo el sitio. */
export function formatArs(n: number): string {
  return `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
}
