/**
 * Newsletter segmentation — deliver to each subscriber ONLY what they opted into.
 *
 * `newsletter_subscribers.source` records WHERE/why someone subscribed. Each
 * scheduled email targets the sources that were actually promised that content.
 * When you add a new signup point, ideally map its source here — but if you
 * forget, `isWeeklyRecipient` is FAIL-SAFE: any unmapped source falls into the
 * weekly digest so a new subscriber is never silently dropped.
 *
 * Sources audited 2026-05-31 (see signup points in code):
 *   remates, reporte-semanal, homepage, web, fab, manual, rebill → resumen semanal
 *   cierre-mensual, valuation_widget, calculadora → precio/INMAG/cierre mensual
 *   frigorificos                         → reporte de faena
 *   el-corredor                          → El Corredor (PDF mensual)
 *   exportar-datos, calendar-export, comparar-consignatarias → SOLO avisos de
 *     producto (pidieron "te avisamos de mejoras") → NO reciben emails de mercado
 *   heartbeat-test / test*               → test, excluido de todo
 *
 * segmentFixes 2026-06 (cerrar el gap de sources que caían mal al weekly por el fail-safe):
 *   alerta-arrendamiento → monthlyClose  (mismo contenido que cierre-mensual: el promedio
 *                                          del novillo para liquidar el canon)
 *   alerta-inmag         → monthlyClose  (mínimo viable: recibe el cierre mensual del INMAG;
 *                                          la promesa "cuando se mueva" queda aspiracional
 *                                          hasta que exista un cron de alerta real)
 *   watchlist-notify     → weekly (EXPLÍCITO, no por fail-safe): mientras los crons de
 *                                          subasta (remate-reminders/new-remate-alerts) estén
 *                                          en disabled/, el weekly es lo único que el sitio cumple.
 *                                          Re-mapear a un segmento de subasta-por-firma cuando se prendan.
 */
export const SEGMENT_SOURCES = {
  // Weekly remates digest (Mondays). watchlist-notify va EXPLÍCITO acá (no por fail-safe)
  // hasta que existan crons de subasta-por-firma; cuando se prendan, re-mapear a su segmento.
  weekly: ['remates', 'reporte-semanal', 'homepage', 'watchlist-notify'],
  // Monthly Índice Novillo close (1st) — price / INMAG / arrendamiento intent.
  // alerta-arrendamiento + alerta-inmag reciben el cierre mensual (mismo número del INMAG).
  monthlyClose: ['cierre-mensual', 'valuation_widget', 'calculadora', 'alerta-arrendamiento', 'alerta-inmag'],
  // El Corredor PDF (1st) — lead magnet
  corredor: ['el-corredor'],
  // Monthly faena report
  faena: ['frigorificos'],
} as const

export type Segment = keyof typeof SEGMENT_SOURCES

/** Sources that asked only for product-update notices — never get market emails. */
export const PRODUCT_UPDATE_ONLY = ['exportar-datos', 'calendar-export', 'comparar-consignatarias'] as const

/** Test/diagnostic sources — excluded from every send. */
export const EXCLUDED_SOURCES = ['heartbeat-test'] as const

function norm(source: string | null | undefined): string {
  return (source ?? '').trim().toLowerCase()
}

/** A source explicitly claimed by faena / monthlyClose / corredor (their own content). */
function inSpecificSegment(s: string): boolean {
  return (
    (SEGMENT_SOURCES.faena as readonly string[]).includes(s) ||
    (SEGMENT_SOURCES.monthlyClose as readonly string[]).includes(s) ||
    (SEGMENT_SOURCES.corredor as readonly string[]).includes(s)
  )
}

function isExcluded(s: string): boolean {
  return (EXCLUDED_SOURCES as readonly string[]).includes(s) || s.startsWith('test')
}

/**
 * FAIL-SAFE weekly recipient test. True for the explicit weekly sources AND for
 * any UNMAPPED source — so new signup points default into the general weekly
 * digest instead of being silently dropped. Excludes test sources, product-only
 * sources, and subscribers who opted into a specific segment (faena/cierre/corredor),
 * who get their own content rather than the weekly.
 */
export function isWeeklyRecipient(source: string | null | undefined): boolean {
  const s = norm(source)
  if (!s) return true // empty source → general newsletter
  if (isExcluded(s)) return false
  if ((PRODUCT_UPDATE_ONLY as readonly string[]).includes(s)) return false
  if (inSpecificSegment(s)) return false
  return true // weekly explicit + everything unmapped
}
