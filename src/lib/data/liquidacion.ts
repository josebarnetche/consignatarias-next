/**
 * Índice de Liquidación — participación de hembras en la hacienda.
 *
 * DOS capas, honestas y distintas:
 *  1. Histórico NACIONAL (faena, 1998-2019): serie oficial MAGyP/DNCCA. Es la
 *     faena nacional (rezagada), telón de fondo de largo plazo. Congelada en 2019.
 *  2. Serie propia de CAÑUELAS (operado, 2026→): % de hembras en la hacienda
 *     operada en el Mercado Agroganadero. Es un INDICADOR ADELANTADO (leading),
 *     más granular, propietario — se actualiza con cada rueda. NO es la faena
 *     nacional: son métricas relacionadas pero distintas (no comparar 1:1).
 *
 * Una participación de hembras alta señala LIQUIDACIÓN (descarga de vientres);
 * baja señala RETENCIÓN (armado de rodeo).
 */
import { requireServiceClient } from '@/lib/supabase'
import historicoRaw from './faena-hembras-nacional-historico.json'
import trimestralRaw from './faena-hembras-nacional-trimestral.json'
import actualRaw from './faena-hembras-nacional-actual.json'

export interface PuntoHembras {
  mes: string // YYYY-MM
  pct: number
  cabezas?: number
}

export const HISTORICO_NACIONAL = historicoRaw as {
  fuente: string
  fuente_url: string
  metrica: string
  descripcion: string
  cobertura: string
  serie: PuntoHembras[]
}

// Serie nacional CONTINUA: histórico mensual MAGyP (1998→2019-08) + trimestral IPCVA
// (2019-2025, puntos posteriores a 2019-08 ubicados en el mes de cierre del trimestre).
// Es la misma métrica (faena de hembras nacional) → se une sin gap.
export const SERIE_NACIONAL: PuntoHembras[] = (() => {
  const hist = (historicoRaw as { serie: PuntoHembras[] }).serie
  const ultimoHist = hist[hist.length - 1].mes
  const tri = (trimestralRaw as { serie: PuntoHembras[] }).serie.filter((p) => p.mes > ultimoHist)
  return [...hist, ...tri].sort((a, b) => a.mes.localeCompare(b.mes))
})()

/**
 * Serie mensual de % hembras operadas en Cañuelas, desde que hay dato (may-2026).
 * Usa el RPC get_canuelas_hembras_mensual (agrega en la base: leer los lotes crudos
 * vía PostgREST se capea en 1.000 filas y devolvía sólo parte del primer mes).
 * Hembras = vacas + vaquillonas (regex ^VAC|^VAQ en el RPC).
 */
export async function getCanuelasHembrasMensual(): Promise<PuntoHembras[]> {
  const service = requireServiceClient()
  // Cast: el RPC es nuevo (migración 20260713) y aún no está en los tipos generados.
  const { data, error } = await service.rpc('get_canuelas_hembras_mensual' as never)
  if (error || !data) return []
  return (data as { mes: string; hembras: number; total: number }[]).map((r) => ({
    mes: r.mes,
    pct: r.total > 0 ? Math.round((Number(r.hembras) / Number(r.total)) * 1000) / 10 : 0,
    cabezas: Number(r.total),
  }))
}

export interface NacionalActual {
  mes_informe: string | null
  anio: string
  pct_hembras: number
  pct_hembras_anio_previo: number | null
  faena_total_cabezas: number | null
  fuente: string
  fuente_url: string
}

export const NACIONAL_ACTUAL = actualRaw as NacionalActual

export interface LiquidacionSnapshot {
  actual: PuntoHembras | null // último mes de Cañuelas
  canuelas: PuntoHembras[] // serie propia (2026→)
  nacional: PuntoHembras[] // histórico nacional (1998-2019)
  nacionalActual: NacionalActual // ancla nacional actual (YTD, PDF mensual MAGyP)
  interpretacion: string
  fuenteNacional: { nombre: string; url: string }
}

// IMPORTANTE: el operado en Cañuelas corre estructuralmente por encima de la faena
// NACIONAL (Cañuelas concentra venta de vaca/vaquillona). No se aplican los umbrales
// de la faena nacional (~43-44% equilibrio) a este nivel: la señal está en la magnitud
// de la participación y en su TENDENCIA, no en compararla 1:1 con el histórico nacional.
export const LIQUIDACION_CAVEAT =
  'El % de hembras operadas en Cañuelas corre por encima del de la faena nacional (Cañuelas concentra venta de vientres). No comparar 1:1 con la serie histórica nacional: la lectura útil es el nivel y su tendencia rueda a rueda.'

function interpretar(pct: number | null): string {
  if (pct == null) return 'Sin dato reciente.'
  const cab = Math.round(pct / 10)
  const base = `${cab} de cada 10 cabezas operadas fueron hembras. `
  if (pct >= 55) return base + 'Participación muy alta: señal de liquidación (fuerte descarga de vientres).'
  if (pct >= 48) return base + 'Participación elevada: sesgo a la liquidación.'
  return base + 'Participación moderada para el mercado.'
}

export async function getLiquidacion(): Promise<LiquidacionSnapshot> {
  const canuelas = await getCanuelasHembrasMensual()
  const actual = canuelas.length > 0 ? canuelas[canuelas.length - 1] : null
  return {
    actual,
    canuelas,
    nacional: SERIE_NACIONAL,
    nacionalActual: NACIONAL_ACTUAL,
    interpretacion: interpretar(actual?.pct ?? null),
    fuenteNacional: { nombre: HISTORICO_NACIONAL.fuente, url: HISTORICO_NACIONAL.fuente_url },
  }
}
