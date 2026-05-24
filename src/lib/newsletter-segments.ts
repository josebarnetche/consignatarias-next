/**
 * Newsletter segmentation — deliver to each subscriber ONLY what they opted into.
 *
 * `newsletter_subscribers.source` records WHERE/why someone subscribed. Each
 * scheduled email targets the sources that were actually promised that content.
 * When you add a new signup point, map its source here.
 *
 * Sources audited 2026-05-24 (see signup points in code):
 *   remates, reporte-semanal, homepage   → resumen semanal de remates
 *   cierre-mensual, valuation_widget, calculadora → precio/INMAG/cierre mensual
 *   frigorificos                         → reporte de faena
 *   el-corredor                          → El Corredor (PDF mensual)
 *   exportar-datos, calendar-export, comparar-consignatarias → SOLO avisos de
 *     producto (pidieron "te avisamos de mejoras") → NO reciben emails de mercado
 *   heartbeat-test                       → test, excluido de todo
 */
export const SEGMENT_SOURCES = {
  // Weekly remates digest (Mondays)
  weekly: ['remates', 'reporte-semanal', 'homepage'],
  // Monthly Índice Novillo close (1st) — price / INMAG / arrendamiento intent
  monthlyClose: ['cierre-mensual', 'valuation_widget', 'calculadora'],
  // El Corredor PDF (1st) — lead magnet
  corredor: ['el-corredor'],
  // Monthly faena report
  faena: ['frigorificos'],
} as const

export type Segment = keyof typeof SEGMENT_SOURCES

/** Sources that asked only for product-update notices — never get market emails. */
export const PRODUCT_UPDATE_ONLY = ['exportar-datos', 'calendar-export', 'comparar-consignatarias'] as const
