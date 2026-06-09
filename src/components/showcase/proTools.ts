/**
 * Canonical config for the 5 PRO Usuario tools, shared by the home showcase and
 * the /pro tour. The mini-previews here render ONLY real, public data (the free
 * gancho of each tool) — never the gated PRO numbers, never fabricated values
 * (brand rule #1). The premium "decision" layer stays gated inside each tool.
 */

export interface ProTool {
  /** Stable id (used as anchor + analytics key). */
  id: string
  /** Tool destination (the real page where the gancho→PRO gate lives). */
  href: string
  /** Short, real hook — the verb that names what it decides. */
  title: string
  /** One-line promise: the DECISION it supports, not the data it shows. */
  hook: string
  /** The honest free→PRO split: what you get free vs what PRO unlocks. */
  freeLabel: string
  proLabel: string
}

export const PRO_TOOLS: ProTool[] = [
  {
    id: 'vender-ahora',
    href: '/mercado/vender-ahora',
    title: '¿Vendo ahora?',
    hook: 'Si conviene vender hoy o aguantar, leído sobre el percentil en dólares reales.',
    freeLabel: 'Valor de tu lote hoy',
    proLabel: 'Veredicto vender / aguantar',
  },
  {
    id: 'neto-en-mano',
    href: '/calculadora',
    title: 'Neto en mano',
    hook: 'Del bruto INMAG al neto real: comisión, gastos y flete descontados.',
    freeLabel: 'Bruto a precio de mercado',
    proLabel: 'Neto en ARS, USD y $/kg',
  },
  {
    id: 'comparador',
    href: '/comparar',
    title: 'Comparador',
    hook: 'A quién le conviene venderle: medios de pago y días de cobro, lado a lado.',
    freeLabel: 'Remates y provincias',
    proLabel: 'Medios de pago + cobro',
  },
  {
    id: 'spread',
    href: '/mercado/spread',
    title: 'Spread maíz/novillo',
    hook: 'Si el engorde a corral cierra: a cuántos puntos estás del umbral de rentabilidad.',
    freeLabel: 'Relación del día',
    proLabel: 'Holgura vs umbral 12:1',
  },
  {
    id: 'historico',
    href: '/mercado/inmag',
    title: 'Histórico y estacionalidad',
    hook: 'La década completa del INMAG: cuándo del año conviene vender, mes por mes.',
    freeLabel: 'INMAG de hoy',
    proLabel: 'Serie histórica en CSV + mes×año',
  },
]

/** Upgrade link for a tool, preserving the return-after-pay route. */
export function upgradeHref(toolHref: string): string {
  return `/upgrade?next=${encodeURIComponent(toolHref)}`
}
