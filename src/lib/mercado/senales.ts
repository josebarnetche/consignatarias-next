/**
 * Señales de mercado derivadas: estacionalidad, poder de compra de la hacienda y
 * entrada de capital. Es lo que convierte un precio en una decisión.
 *
 * POR QUÉ EXISTE. Hasta la v1.5 el MCP contestaba "cuánto vale" y nada más. Un
 * precio suelto no le sirve a un agente que tiene que recomendar algo: necesita
 * saber si ese precio está alto o bajo *para esta época del año*, qué compra esa
 * hacienda, y qué rinde un dólar puesto en un campo argentino. Eso es lo que las
 * consultoras del sector venden en PDF una vez por mes.
 *
 * TODO SE CALCULA SOBRE DÓLARES, NO SOBRE PESOS. Con 33 % de inflación anual, una
 * serie nominal en pesos sube siempre y cualquier "estacionalidad" calculada sobre
 * ella mide la inflación, no el ciclo ganadero. El INMAG dolarizado al blue es la
 * única base que deja comparar septiembre de 2026 con septiembre de 2019.
 */

export interface PuntoDiario {
  date: string
  valor: number
}

export interface PuntoMensual {
  ym: string
  valor: number
  ruedas: number
}

/** Promedios mensuales a partir de la serie diaria. */
export function aMensual(puntos: PuntoDiario[]): PuntoMensual[] {
  const acc = new Map<string, number[]>()
  for (const p of puntos) {
    if (!Number.isFinite(p.valor) || p.valor <= 0) continue
    const ym = p.date.slice(0, 7)
    if (!acc.has(ym)) acc.set(ym, [])
    acc.get(ym)!.push(p.valor)
  }
  return [...acc.entries()]
    .map(([ym, v]) => ({ ym, valor: v.reduce((s, x) => s + x, 0) / v.length, ruedas: v.length }))
    .sort((a, b) => a.ym.localeCompare(b.ym))
}

const mediana = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const

export interface Estacionalidad {
  /** Índice típico de cada mes: 1,00 es el promedio del año. */
  indicePorMes: { mes: number; nombre: string; indice: number; anios: number }[]
  /** Dónde está el mes consultado contra su propia norma. */
  mesConsultado: {
    ym: string
    nombre: string
    indiceActual: number
    indiceTipico: number
    desvioPct: number
    lectura: 'barata' | 'cara' | 'en_su_nivel'
  } | null
  aniosBase: number
  nota: string
}

/** Mínimo de años para que un índice mensual signifique algo. */
export const MIN_ANIOS_ESTACIONAL = 4

/**
 * Índice estacional del precio: cuánto vale cada mes respecto de su entorno.
 *
 * MÉTODO: razón sobre media móvil centrada de 12 meses. Cada mes se divide por el
 * promedio de los doce meses centrados en él, y el índice del mes calendario es la
 * MEDIANA de esas razones entre años.
 *
 * ⚠️ POR QUÉ NO ALCANZA CON DIVIDIR POR EL PROMEDIO DEL AÑO. Esa versión más
 * simple saca el escalón entre años pero NO la tendencia dentro del año: con una
 * serie que se duplica en doce meses, diciembre queda arriba de enero por el puro
 * arrastre y el método "descubre" un pico estacional en diciembre que no existe.
 * Lo detectó un test con una serie sintética de ciclo conocido. La media móvil
 * centrada sí lo corrige, porque compara cada mes contra su propio vecindario.
 *
 * Se usa la MEDIANA entre años, no el promedio: 2020 y 2021 tuvieron saltos que
 * arrastran una media y no representan ningún septiembre típico.
 */
export function estacionalidad(mensual: PuntoMensual[], ymConsultado?: string): Estacionalidad {
  const serie = [...mensual].sort((a, b) => a.ym.localeCompare(b.ym))
  const V = 12
  const ratios = new Map<number, number[]>()
  const razonPorYm = new Map<string, number>()

  // La media móvil centrada necesita 6 meses de cada lado, así que los extremos
  // de la serie no producen razón. Es el costo del método y es preferible a
  // inventar un valor para los bordes.
  for (let i = V / 2; i + V / 2 < serie.length; i++) {
    const ventana = serie.slice(i - V / 2, i + V / 2)
    if (ventana.length < V) continue
    const ma = ventana.reduce((s2, p) => s2 + p.valor, 0) / ventana.length
    if (!(ma > 0)) continue
    const r = serie[i].valor / ma
    const mes = Number(serie[i].ym.slice(5, 7))
    if (!ratios.has(mes)) ratios.set(mes, [])
    ratios.get(mes)!.push(r)
    razonPorYm.set(serie[i].ym, r)
  }

  const crudos = [...ratios.entries()].map(([mes, rs]) => ({ mes, idx: mediana(rs), anios: rs.length }))
  // Normalizar para que los doce índices promedien 1,00: así "1,05" se lee
  // directamente como "5 % más caro que un mes cualquiera".
  const escala = crudos.length ? crudos.reduce((s2, c) => s2 + c.idx, 0) / crudos.length : 1
  const indicePorMes = crudos
    .map((c) => ({
      mes: c.mes,
      nombre: MESES_ES[c.mes - 1],
      indice: Number((c.idx / (escala || 1)).toFixed(3)),
      anios: c.anios,
    }))
    .sort((a, b) => a.mes - b.mes)

  const aniosBase = new Set([...razonPorYm.keys()].map((ym) => ym.slice(0, 4))).size

  let mesConsultado: Estacionalidad['mesConsultado'] = null
  if (ymConsultado) {
    const mes = Number(ymConsultado.slice(5, 7))
    const tip = indicePorMes.find((x) => x.mes === mes)
    const act = razonPorYm.get(ymConsultado)
    if (tip && act != null && tip.indice > 0) {
      const actualNorm = act / (escala || 1)
      const desvio = Number((100 * (actualNorm / tip.indice - 1)).toFixed(1))
      mesConsultado = {
        ym: ymConsultado,
        nombre: MESES_ES[mes - 1],
        indiceActual: Number(actualNorm.toFixed(3)),
        indiceTipico: tip.indice,
        desvioPct: desvio,
        // 3 % es el ruido de un promedio mensual: por debajo de eso no se afirma nada.
        lectura: desvio <= -3 ? 'barata' : desvio >= 3 ? 'cara' : 'en_su_nivel',
      }
    }
  }

  return {
    indicePorMes,
    mesConsultado,
    aniosBase,
    nota:
      `Índice estacional sobre el INMAG en dólares, ${aniosBase} años. Razón sobre media ` +
      'móvil centrada de 12 meses, mediana entre años, normalizado a 1,00. Por encima de ' +
      '1,00 el mes suele ser caro; por debajo, barato. Se calcula en dólares porque una ' +
      'serie en pesos mide la inflación, no el ciclo. Los últimos 6 meses no tienen índice ' +
      'todavía: la media móvil centrada necesita medio año por delante.',
  }
}

export interface ZonaTierra {
  provincia: string
  zona: string | null
  usd_ha: number | null
  kg_ha_ano: number | null
  anos_repago: number | null
  aptitud?: string | null
  n?: number | null
  fecha?: string | null
}

export interface EntradaZona {
  provincia: string
  zona: string | null
  usdHa: number
  /** Kilos de novillo que cuesta una hectárea. La hacienda como unidad de cuenta. */
  kgNovilloPorHa: number
  /** Renta anual del campo en kg de novillo por hectárea (lo que paga un arrendatario). */
  kgHaAno: number | null
  rentaAnualUsdHa: number | null
  /** Renta sobre el valor de la tierra. */
  rendimientoPct: number | null
  aniosRepago: number | null
  hectareasPorPresupuesto: number | null
  observaciones: number | null
  fechaDato: string | null
}

/**
 * Qué compra un dólar en campo argentino, y qué renta.
 *
 * El rendimiento sale del canon de arrendamiento, que en Argentina se pacta en
 * KILOS DE NOVILLO por hectárea y por año — no en pesos. Por eso el número es
 * estable aunque el peso se mueva, y por eso es el que mira un comprador de
 * afuera: le dice cuánta carne produce su dólar, sin pasar por el tipo de cambio.
 *
 * ⚠️ Sólo campo de aptitud GANADERA. La tierra agrícola se valúa por lo que
 * produce de soja o maíz y mezclarla acá da un rendimiento que no existe.
 */
export function entradaDeCapital(
  zonas: ZonaTierra[],
  precioNovilloUsdKg: number,
  presupuestoUsd?: number,
): EntradaZona[] {
  if (!(precioNovilloUsdKg > 0)) return []
  return zonas
    .filter((z) => (z.aptitud ?? 'ganadera').toLowerCase() === 'ganadera' && (z.usd_ha ?? 0) > 0)
    .map((z) => {
      const usdHa = z.usd_ha as number
      const rentaUsd = z.kg_ha_ano != null ? z.kg_ha_ano * precioNovilloUsdKg : null
      return {
        provincia: z.provincia,
        zona: z.zona ?? null,
        usdHa,
        kgNovilloPorHa: Math.round(usdHa / precioNovilloUsdKg),
        kgHaAno: z.kg_ha_ano ?? null,
        rentaAnualUsdHa: rentaUsd != null ? Number(rentaUsd.toFixed(1)) : null,
        rendimientoPct: rentaUsd != null ? Number(((100 * rentaUsd) / usdHa).toFixed(2)) : null,
        aniosRepago: z.anos_repago ?? null,
        hectareasPorPresupuesto:
          presupuestoUsd && presupuestoUsd > 0 ? Math.floor(presupuestoUsd / usdHa) : null,
        observaciones: z.n ?? null,
        fechaDato: z.fecha ?? null,
      }
    })
    .sort((a, b) => (b.rendimientoPct ?? -1) - (a.rendimientoPct ?? -1))
}

export interface PosicionHistorica {
  valor: number
  promedio: number
  desvioPct: number
  lectura: 'por_encima' | 'por_debajo' | 'en_promedio'
  n: number
}

/**
 * Dónde está un valor contra su propia historia. Es el patrón que usan todos los
 * informes del sector ("opera un 18,9 % por encima de su promedio de 5 años") y
 * sin él un número no se puede leer.
 */
export function posicionHistorica(serie: number[], valor: number): PosicionHistorica | null {
  const limpia = serie.filter((x) => Number.isFinite(x) && x > 0)
  if (limpia.length < 12 || !(valor > 0)) return null
  const promedio = limpia.reduce((s, x) => s + x, 0) / limpia.length
  const desvio = Number((100 * (valor / promedio - 1)).toFixed(1))
  return {
    valor,
    promedio: Number(promedio.toFixed(2)),
    desvioPct: desvio,
    lectura: desvio >= 3 ? 'por_encima' : desvio <= -3 ? 'por_debajo' : 'en_promedio',
    n: limpia.length,
  }
}
