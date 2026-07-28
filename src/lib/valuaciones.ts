/**
 * Valuaciones para agentes: tropa de hacienda y arrendamiento de campo.
 * REGLA (datos reales): todo sale de market-prices.json (MAG + dolarapi del
 * scrape diario). No hay precios provinciales de hacienda ni canon regional
 * "oficial" por provincia — cuando falta el dato, se responde con la
 * referencia nacional o con escenarios EXPLÍCITOS, nunca con un número inventado.
 */
import marketPrices from '@/lib/data/market-prices.json'
import { INMAG_DATE } from '@/lib/inmag'

const mp = marketPrices as unknown as {
  inmag: { current: number }
  categories: Record<string, { current: number; sioWeek?: string }>
  usdBlue: { current: number }
  usdOficial: { current: number }
  lastUpdate: string
  arrendamientoOficial?: { date: string; index: number; periodIndex: number; source: string }
}

const fmtArs = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')
const fmtUsd = (n: number) => 'US$' + Math.round(n).toLocaleString('es-AR')

/** Pesos vivos típicos de venta por categoría (kg), usados SOLO si el caller no pasa kg. */
export const KG_DEFAULT: Record<string, number> = {
  novillos: 450,
  novillitos: 390,
  vaquillonas: 380,
  vacas: 470,
  toros: 700,
  terneros: 220,
}

export interface ValuacionTropa {
  texto: string
  data: Record<string, unknown>
}

export function valuarTropa(opts: {
  categoria: string
  cabezas: number
  kgPromedio?: number
  provincia?: string
}): ValuacionTropa {
  const categoria = opts.categoria.toLowerCase()
  const cat = mp.categories[categoria]
  if (!cat) throw new Error(`Categoría inválida. Válidas: ${Object.keys(mp.categories).join(', ')}`)
  if (!Number.isFinite(opts.cabezas) || opts.cabezas <= 0 || opts.cabezas > 100_000) throw new Error('Cabezas inválidas (1 a 100.000).')

  const kg = opts.kgPromedio && opts.kgPromedio > 50 && opts.kgPromedio < 1200 ? opts.kgPromedio : KG_DEFAULT[categoria] ?? 400
  const kgAsumido = !(opts.kgPromedio && opts.kgPromedio > 50 && opts.kgPromedio < 1200)
  const precioKg = cat.current
  const totalArs = precioKg * kg * opts.cabezas
  const totalUsdBlue = totalArs / mp.usdBlue.current
  const totalUsdOficial = totalArs / mp.usdOficial.current
  const porCabezaArs = precioKg * kg

  const notaProvincia = opts.provincia
    ? `\nNota: no existe una serie oficial de precios por provincia — esta valuación usa la referencia nacional del MAG (Cañuelas), que es el precio de referencia del mercado también para ${opts.provincia}.`
    : ''

  const texto =
    `Valuación de tropa — ${opts.cabezas} ${categoria} × ${kg} kg${kgAsumido ? ' (peso típico asumido; pasá kg_promedio para afinar)' : ''}\n\n` +
    `Precio de referencia: ${fmtArs(precioKg)}/kg vivo (MAG, categoría ${categoria}, obs. semanal; INMAG del ${INMAG_DATE})\n` +
    `Por cabeza: ${fmtArs(porCabezaArs)}\n` +
    `TOTAL TROPA: ${fmtArs(totalArs)}\n` +
    `En dólares: ${fmtUsd(totalUsdBlue)} (blue ${fmtArs(mp.usdBlue.current)}) · ${fmtUsd(totalUsdOficial)} (oficial ${fmtArs(mp.usdOficial.current)})\n` +
    `${notaProvincia}\n` +
    `Es una valuación de referencia, no una cotización: el precio final lo define el remate. ` +
    `Para venderla: https://www.consignatarias.com.ar/consignatarias`

  return {
    texto,
    data: {
      categoria,
      cabezas: opts.cabezas,
      kg_promedio: kg,
      kg_asumido: kgAsumido,
      precio_kg_ars: precioKg,
      total_ars: Math.round(totalArs),
      total_usd_blue: Math.round(totalUsdBlue),
      total_usd_oficial: Math.round(totalUsdOficial),
      usd_blue: mp.usdBlue.current,
      usd_oficial: mp.usdOficial.current,
      fecha_indice: INMAG_DATE,
      fuente: 'Mercado Agroganadero (MAG) + dolarapi.com',
      provincia: opts.provincia ?? null,
    },
  }
}

/** Escenarios de canon típicos si el caller no trae el kg/ha/año pactado. */
const ESCENARIOS_KG_HA_ANIO = [40, 60, 80, 100]

export function valuarArrendamiento(opts: {
  hectareas: number
  kgHaAnio?: number
  provincia?: string
}): ValuacionTropa {
  if (!Number.isFinite(opts.hectareas) || opts.hectareas <= 0 || opts.hectareas > 1_000_000) throw new Error('Hectáreas inválidas (1 a 1.000.000).')
  const arr = mp.arrendamientoOficial
  const indice = arr?.periodIndex ?? arr?.index ?? mp.inmag.current
  const fuenteIndice = arr
    ? `índice oficial de arrendamientos del MAG (haciinfo000013) al ${arr.date}: ${fmtArs(indice)}/kg`
    : `INMAG del ${INMAG_DATE}: ${fmtArs(indice)}/kg`

  const usd = mp.usdBlue.current
  const linea = (kgHa: number) => {
    const anualArs = kgHa * indice * opts.hectareas
    return `· ${kgHa} kg/ha/año → ${fmtArs(anualArs)}/año (${fmtUsd(anualArs / usd)}) · ${fmtArs(anualArs / 12)}/mes`
  }

  const conKg = opts.kgHaAnio && opts.kgHaAnio > 0 && opts.kgHaAnio <= 500

  const cuerpo = conKg
    ? linea(opts.kgHaAnio as number)
    : `El canon ganadero se pacta en kg de novillo por hectárea por año y depende de la aptitud del campo` +
      `${opts.provincia ? ` (en ${opts.provincia} varía fuerte entre zonas)` : ''} — no hay un valor oficial por provincia. ` +
      `Escenarios sobre ${opts.hectareas.toLocaleString('es-AR')} ha:\n` +
      ESCENARIOS_KG_HA_ANIO.map(linea).join('\n')

  const texto =
    `Arrendamiento ganadero — ${opts.hectareas.toLocaleString('es-AR')} ha${opts.provincia ? ` en ${opts.provincia}` : ''}\n\n` +
    `Valor del kg para arrendamientos: ${fuenteIndice}\n\n${cuerpo}\n\n` +
    `Dólar blue: ${fmtArs(usd)} (dolarapi.com). Calculadora completa: https://www.consignatarias.com.ar/mercado/arrendamiento`

  return {
    texto,
    data: {
      hectareas: opts.hectareas,
      kg_ha_anio: conKg ? opts.kgHaAnio : null,
      escenarios_kg_ha_anio: conKg ? null : ESCENARIOS_KG_HA_ANIO,
      indice_ars_kg: indice,
      fuente_indice: arr?.source ?? 'INMAG (MAG)',
      fecha_indice: arr?.date ?? INMAG_DATE,
      usd_blue: usd,
      anual_ars_por_kg_ha: Math.round(indice * opts.hectareas),
      provincia: opts.provincia ?? null,
    },
  }
}
