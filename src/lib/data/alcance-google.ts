/**
 * Alcance del sitio en Google — dato de Search Console (propiedad
 * sc-domain:consignatarias.com.ar), bajado con `node scripts/gsc-historico.mjs`.
 *
 * Es lo que la landing le muestra a una consignataria cuando le ofrece PRO: no el
 * tamaño de una lista, sino cuántas veces apareció el sitio en una búsqueda. Se
 * actualiza a mano al regenerar `reports/gsc/historico-diario.csv` (la serie de GSC
 * arranca el 6-mar-2026 en esta propiedad). Octubre es parcial: GSC llega con 2-3
 * días de atraso.
 */
export const ALCANCE_GOOGLE = {
  impresiones: 1_078_731,
  clics: 18_804,
  desde: '2026-03-06',
  hasta: '2026-10-14',
  /** GA4 (properties/481391781), sesiones de los últimos 30 días al 16-10-2026. */
  visitasMes: 7_919,
  porMes: [
    { mes: 'mar', impresiones: 14_252, parcial: true },
    { mes: 'abr', impresiones: 19_413 },
    { mes: 'may', impresiones: 27_000 },
    { mes: 'jun', impresiones: 119_557 },
    { mes: 'jul', impresiones: 206_085 },
    { mes: 'ago', impresiones: 240_772 },
    { mes: 'sep', impresiones: 307_086 },
    { mes: 'oct', impresiones: 144_566, parcial: true },
  ],
} as const
