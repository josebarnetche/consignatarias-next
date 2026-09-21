/**
 * Valuaciones para agentes: tropa de hacienda y arrendamiento de campo.
 *
 * REGLA (datos reales): todo sale de market-prices.json (MAG + dolarapi del scrape
 * diario) y, para la BANDA de la tropa, de vr-bandas.json (dato de lote observado —
 * ver `vr.ts`). No hay precios provinciales de hacienda ni canon regional "oficial"
 * por provincia — cuando falta el dato, se responde con la referencia nacional o con
 * escenarios EXPLÍCITOS, nunca con un número inventado.
 *
 * `valuarTropa` devuelve tres puntas (p10/mediana/p90) cuando hay base de lotes, y
 * colapsa en el precio MAG cuando no la hay.
 *
 * CAMBIO DE CONTRATO, no es retrocompatible en el VALOR: cuando hay banda,
 * `total_ars` se calcula con la MEDIANA DE LOTE y no con el precio de categoría
 * del MAG. Las dos medidas difieren hasta ~25% (novillito, vaquillona, toro)
 * porque miden cosas distintas: el MAG publica una observación semanal de un
 * corte, la mediana sale de todos los lotes de la categoría. Se eligió la
 * mediana porque es el precio al que efectivamente se opera. El valor anterior
 * no se pierde: va en `precio_kg_mag`, y la brecha en `brecha_vs_mag_pct`.
 */
import marketPrices from '@/lib/data/market-prices.json'
import { INMAG_DATE } from '@/lib/inmag'
import { getReferencia, valuarConBanda } from '@/lib/vr'

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

  // VR: la banda observada en el dato de lote. Cuando no hay base, `banda` viene
  // null y las tres puntas colapsan en el precio MAG — nunca se inventa un rango.
  const ref = getReferencia(categoria, opts.provincia)
  const v = valuarConBanda(ref, kg, opts.cabezas, precioKg)

  // El precio EFECTIVAMENTE usado para el total. Con banda es la mediana de lote;
  // sin banda, el precio MAG. Se expone como tal para que la respuesta cierre:
  // precio_kg_usado × kg × cabezas === total_ars, siempre.
  const precioKgUsado = v.usó_banda ? ref.banda!.mediana : precioKg
  const totalArs = v.central
  const totalUsdBlue = totalArs / mp.usdBlue.current
  const totalUsdOficial = totalArs / mp.usdOficial.current
  const porCabezaArs = Math.round(totalArs / opts.cabezas)

  // La mediana de lote y el precio de categoría del MAG NO son la misma medida:
  // el MAG publica una observación semanal de un corte determinado, la mediana
  // sale de todos los lotes de la categoría. La brecha llega a ~25% en novillito,
  // vaquillona y toro. Callarla sería el peor de los dos mundos, así que cuando
  // es material se declara en la respuesta.
  const brechaPct = precioKg > 0 ? ((precioKgUsado / precioKg) - 1) * 100 : 0
  const notaBrecha =
    v.usó_banda && Math.abs(brechaPct) >= 5
      ? `La mediana de lote (${fmtArs(precioKgUsado)}/kg) está ${brechaPct > 0 ? 'por encima' : 'por debajo'} del precio de categoría del MAG (${fmtArs(precioKg)}/kg) en ${Math.abs(brechaPct).toFixed(0)}%: son medidas distintas — el MAG publica una observación semanal de un corte, la mediana sale de todos los lotes de la categoría.`
      : null

  const bloqueBanda = v.usó_banda
    ? `Banda observada: ${fmtArs(ref.banda!.p10)} – ${fmtArs(ref.banda!.p90)}/kg (mediana ${fmtArs(ref.banda!.mediana)}), ` +
      `sobre ${ref.banda!.lotes.toLocaleString('es-AR')} lotes y ${ref.banda!.cabezas.toLocaleString('es-AR')} cabezas de los últimos ${ref.ventana_dias} días.\n` +
      `Conservador: ${fmtArs(v.conservador)} · CENTRAL: ${fmtArs(v.central)} · Optimista: ${fmtArs(v.optimista)}\n`
    : `Precio de referencia: ${fmtArs(precioKg)}/kg vivo (MAG, categoría ${categoria}, obs. semanal; INMAG del ${INMAG_DATE})\n` +
      `TOTAL TROPA: ${fmtArs(totalArs)}\n`

  const texto =
    `Valuación de tropa — ${opts.cabezas} ${categoria} × ${kg} kg${kgAsumido ? ' (peso típico asumido; pasá kg_promedio para afinar)' : ''}\n\n` +
    bloqueBanda +
    `Por cabeza: ${fmtArs(porCabezaArs)}\n` +
    `En dólares: ${fmtUsd(totalUsdBlue)} (blue ${fmtArs(mp.usdBlue.current)}) · ${fmtUsd(totalUsdOficial)} (oficial ${fmtArs(mp.usdOficial.current)})\n\n` +
    [...ref.limites, ...(notaBrecha ? [notaBrecha] : [])].map((l) => `· ${l}`).join('\n') +
    `\nMetodología: ${ref.metodologia} — ${ref.url_metodologia}\n` +
    `El precio final lo define el remate. Para venderla: https://www.consignatarias.com.ar/consignatarias`

  return {
    texto,
    data: {
      categoria,
      cabezas: opts.cabezas,
      kg_promedio: kg,
      kg_asumido: kgAsumido,
      // `precio_kg_ars` es el precio con el que se calculó el total, para que la
      // respuesta cierre sola. El de categoría del MAG va aparte, no se pierde.
      precio_kg_ars: precioKgUsado,
      precio_kg_mag: precioKg,
      brecha_vs_mag_pct: v.usó_banda ? Number(brechaPct.toFixed(1)) : 0,
      // OJO: con banda, `total_ars` pasó a ser la MEDIANA DE LOTE, no el precio
      // MAG × kg. No es retrocompatible en el valor (hasta ~25% de diferencia);
      // sí lo es en forma. El cambio es deliberado: la mediana de lote es el
      // precio al que se opera. `precio_kg_mag` conserva la medida anterior.
      total_ars: Math.round(totalArs),
      total_usd_blue: Math.round(totalUsdBlue),
      total_usd_oficial: Math.round(totalUsdOficial),
      usd_blue: mp.usdBlue.current,
      usd_oficial: mp.usdOficial.current,
      fecha_indice: INMAG_DATE,
      fuente: 'Mercado Agroganadero (MAG) + dolarapi.com',
      provincia: opts.provincia ?? null,
      // VR v1.0
      referencia: ref,
      valuacion: {
        conservador_ars: v.conservador,
        central_ars: v.central,
        optimista_ars: v.optimista,
        uso_banda: v.usó_banda,
      },
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
