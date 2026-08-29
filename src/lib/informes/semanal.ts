import marketPrices from '@/lib/data/market-prices.json'
import maizNovillo from '@/lib/data/maiz-novillo-historico.json'
import remates from '@/lib/data/remates.json'

/**
 * semanal.ts — arma el Parte Semanal del Mercado.
 *
 * QUÉ LO DIFERENCIA DEL REPORTE DIARIO GRATIS
 * Ya existe `/reporte-semanal` con un PDF gratuito (`generateReportePDF`) que trae el
 * precio del día, el macro y las categorías. Repetir eso y cobrarlo sería vender lo mismo
 * dos veces. Este parte agrega lo único que no se consigue en ningún otro lado:
 *
 *  1. **Contexto histórico propio.** La serie del INMAG y la relación maíz/novillo desde
 *     2015 — dónde cae el número de esta semana dentro de once años.
 *  2. **Señal contra ruido.** Un movimiento semanal se compara con la volatilidad típica
 *     de la serie. Si no se distingue del ruido, el parte lo dice en vez de titularlo.
 *  3. **La misma semana de los años anteriores.** Estacionalidad real, no impresión.
 *
 * Un boletín de noticias del sector es gratis en varios lados. Esto no es un boletín: es
 * la lectura del número con su historia al lado.
 */

interface PuntoSerie {
  date: string
  value: number
  volume?: number
}

interface MercadoJson {
  inmag: { current: number; prev: number; change: number; series: PuntoSerie[] }
  categories: Record<string, { current: number; prev: number; change: number }>
  corn: { current: number; prev: number; change: number; unit: string }
  usdBlue: { current: number; prev: number }
  usdOficial: { current: number; prev: number }
  lastUpdate: string
}

interface Remate {
  date: string
  title?: string
  location?: string
  province?: string
  consignataria?: string
  type?: string
}

const M = marketPrices as unknown as MercadoJson
const MN = maizNovillo as { serie: { mes: string; ratio: number }[]; umbral_referencia: number; fuentes: string }

export interface Lectura {
  /** El número, ya formateado para leer. */
  valor: string
  /** Qué pasó, en una línea. */
  titular: string
  /** El contexto que lo hace interpretable. */
  contexto: string
  /** true si el movimiento se distingue de la volatilidad típica de la serie. */
  esSenal: boolean
}

export interface ParteSemanal {
  semanaISO: string
  fechaCorte: string
  compradorEmail: string
  generadoISO: string

  novillo: Lectura
  dolarizado: Lectura
  maizNovillo: Lectura
  categorias: Array<{ nombre: string; precio: number; variacion: number }>
  /** Remates de los próximos 7 días. */
  agenda: Array<{ fecha: string; firma: string; lugar: string; tipo: string }>
  /** El mismo período de los años anteriores, para leer la estacionalidad. */
  estacional: Array<{ anio: number; valor: number | null }>
  fuentes: string
}

function fmt(n: number, dec = 0): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

/** Ruedas que se promedian para representar "una semana". El MAG opera 2-4 veces por semana. */
const RUEDAS_SEMANA = 3

/**
 * Cambio semanal: promedio de las últimas N ruedas contra el de las N anteriores.
 *
 * NO se usa la variación contra la rueda anterior. Esta serie tiene una mediana de 2,6 %
 * de cambio diario y saltos reales de hasta 21 % —días de poco volumen mueven el
 * promedio—, así que comparar una rueda contra otra mide ruido de composición, no
 * mercado. Promediando tres ruedas contra tres, el ruido de un día flojo se diluye y
 * queda el movimiento.
 */
function cambioSemanal(serie: PuntoSerie[], hasta = serie.length): number | null {
  const fin = serie.slice(Math.max(0, hasta - RUEDAS_SEMANA), hasta)
  const ini = serie.slice(Math.max(0, hasta - 2 * RUEDAS_SEMANA), Math.max(0, hasta - RUEDAS_SEMANA))
  if (fin.length < RUEDAS_SEMANA || ini.length < RUEDAS_SEMANA) return null
  const prom = (xs: PuntoSerie[]) => xs.reduce((s, p) => s + p.value, 0) / xs.length
  const a = prom(ini)
  if (!a) return null
  return (prom(fin) - a) / a
}

/**
 * La vara: desvío estándar de los cambios semanales a lo largo de toda la serie.
 *
 * Se calcula sobre la MISMA métrica que después se evalúa. Medir el movimiento de la
 * semana contra la volatilidad de un día era comparar peras con manzanas y dejaba el
 * umbral en ±10 %, tan alto que nada llegaba a ser noticia nunca.
 */
function volatilidadSemanal(serie: PuntoSerie[]): number {
  const cambios: number[] = []
  for (let i = 2 * RUEDAS_SEMANA; i <= serie.length; i++) {
    const c = cambioSemanal(serie, i)
    if (c != null) cambios.push(c)
  }
  if (cambios.length < 2) return 0
  const media = cambios.reduce((s, c) => s + c, 0) / cambios.length
  const varianza = cambios.reduce((s, c) => s + (c - media) ** 2, 0) / (cambios.length - 1)
  return Math.sqrt(varianza)
}

/** Percentil de un valor dentro de una serie, 0 a 100. */
function percentil(valores: number[], v: number): number {
  if (!valores.length) return 0
  const menores = valores.filter((x) => x < v).length
  return Math.round((menores / valores.length) * 100)
}

function semanaISO(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dia = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - dia)
  const inicio = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const semana = Math.ceil(((t.getTime() - inicio.getTime()) / 86400000 + 1) / 7)
  return `${t.getUTCFullYear()}-S${String(semana).padStart(2, '0')}`
}

function fechaCorta(iso: string): string {
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}-${MESES[Number(m) - 1] ?? m}-${a}`
}

export function armarParteSemanal(compradorEmail: string, hoy = new Date()): ParteSemanal {
  const serie = M.inmag.series

  // --- Novillo en pesos ---
  // El cambio de la semana y la vara contra la que se juzga salen de la misma métrica.
  const cambio = cambioSemanal(serie) ?? M.inmag.change / 100
  const umbralSemanal = volatilidadSemanal(serie)
  const esSenal = Math.abs(cambio) > umbralSemanal

  const novillo: Lectura = {
    valor: `ARS ${fmt(M.inmag.current)}/kg`,
    titular: esSenal
      ? `${cambio >= 0 ? 'Subió' : 'Bajó'} ${fmt(Math.abs(cambio) * 100, 1)} % en la semana`
      : `Sin cambios que se distingan del ruido (${fmt(cambio * 100, 1)} %)`,
    contexto: esSenal
      ? `El movimiento supera la volatilidad típica de la serie (±${fmt(umbralSemanal * 100, 1)} % semanal).`
      : `La serie se mueve ±${fmt(umbralSemanal * 100, 1)} % por semana sin que pase nada. Este movimiento entra ahí adentro.`,
    esSenal,
  }

  // --- El mismo novillo, en dólares ---
  const usdKg = M.usdBlue.current ? M.inmag.current / M.usdBlue.current : 0
  const usdKgPrev = M.usdBlue.prev ? M.inmag.prev / M.usdBlue.prev : 0
  const cambioUsd = usdKgPrev ? (usdKg - usdKgPrev) / usdKgPrev : 0
  const dolarizado: Lectura = {
    valor: `USD ${fmt(usdKg, 2)}/kg`,
    titular:
      Math.abs(cambioUsd - cambio) > 0.005
        ? `En dólares se movió ${fmt(cambioUsd * 100, 1)} %, distinto que en pesos`
        : `En dólares acompañó al peso (${fmt(cambioUsd * 100, 1)} %)`,
    contexto: `Al blue de ARS ${fmt(M.usdBlue.current)}. El oficial está en ${fmt(M.usdOficial.current)}: contra ése el kilo da USD ${fmt(M.inmag.current / (M.usdOficial.current || 1), 2)}.`,
    esSenal: Math.abs(cambioUsd) > umbralSemanal,
  }

  // --- Maíz / novillo, con once años de contexto ---
  const ratios = MN.serie.map((p) => p.ratio)
  const ultimoRatio = ratios[ratios.length - 1]
  const ratioSpot = M.corn.current ? M.inmag.current / M.usdBlue.current / (M.corn.current / 1000) : 0
  const pct = percentil(ratios, ratioSpot)
  const maizNovilloL: Lectura = {
    valor: `${fmt(ratioSpot, 1)} kg de maíz por kilo de novillo`,
    titular:
      pct >= 75
        ? 'La relación favorece al que engorda: el novillo compra más maíz que de costumbre'
        : pct <= 25
          ? 'La relación aprieta al que engorda: el novillo compra menos maíz que de costumbre'
          : 'La relación está en su rango habitual',
    contexto: `Percentil ${pct} de la serie mensual ${MN.serie[0].mes} a ${MN.serie[MN.serie.length - 1].mes} (${MN.serie.length} meses). El último cierre mensual fue ${fmt(ultimoRatio, 1)}.`,
    esSenal: pct >= 80 || pct <= 20,
  }

  // --- Categorías ---
  const NOMBRES: Record<string, string> = {
    novillos: 'Novillo',
    novillitos: 'Novillito',
    vaquillonas: 'Vaquillona',
    vacas: 'Vaca',
    toros: 'Toro',
    terneros: 'Ternero',
  }
  const categorias = Object.entries(M.categories).map(([k, v]) => ({
    nombre: NOMBRES[k] ?? k,
    precio: v.current,
    variacion: v.change,
  }))

  // --- Agenda de los próximos 7 días ---
  const hoyISO = hoy.toISOString().slice(0, 10)
  const finISO = new Date(hoy.getTime() + 7 * 86400000).toISOString().slice(0, 10)
  const agenda = (remates as Remate[])
    .filter((r) => r.date >= hoyISO && r.date <= finISO)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 14)
    .map((r) => ({
      fecha: fechaCorta(r.date),
      firma: r.consignataria ?? r.title ?? 'Sin firma',
      lugar: [r.location, r.province].filter(Boolean).join(', ') || '—',
      tipo: r.type ?? '—',
    }))

  // --- La misma semana, en años anteriores ---
  const mesDia = hoyISO.slice(5, 10)
  const anios = [...new Set(serie.map((p) => Number(p.date.slice(0, 4))))].sort()
  const estacional = anios.map((anio) => {
    const objetivo = `${anio}-${mesDia}`
    // El punto más cercano a la misma fecha de ese año, dentro de 10 días.
    let mejor: PuntoSerie | null = null
    let mejorDist = Infinity
    for (const p of serie) {
      if (!p.date.startsWith(String(anio))) continue
      const dist = Math.abs(new Date(p.date).getTime() - new Date(objetivo).getTime())
      if (dist < mejorDist) {
        mejorDist = dist
        mejor = p
      }
    }
    return {
      anio,
      valor: mejor && mejorDist <= 10 * 86400000 ? mejor.value : null,
    }
  })

  return {
    semanaISO: semanaISO(hoy),
    fechaCorte: fechaCorta(M.lastUpdate),
    compradorEmail,
    generadoISO: hoy.toISOString().slice(0, 10),
    novillo,
    dolarizado,
    maizNovillo: maizNovilloL,
    categorias,
    agenda,
    estacional,
    fuentes: `Novillo e índice: Mercado Agroganadero de Cañuelas, cierre al ${fechaCorta(M.lastUpdate)}. ${MN.fuentes}`,
  }
}
