/**
 * /banda — lo que la página necesita sobre la Banda Consignatarias, sin calcularla.
 *
 * El cálculo vive en `banda-consignatarias.ts` (`bandaSemanal`) y es el mismo que
 * devuelve la tool MCP `consignatarias_band`: la página no recalcula percentiles,
 * amplitudes ni la cita. Acá sólo hay lo que el MCP no necesita y la página sí —
 * qué se publica, la escala de las barras, la serie para dibujar y el texto
 * accesible del gráfico.
 *
 * Todo puro, sin base ni red: se testea con puntos armados a mano.
 */
import { MIN_LOTES_BANDA_COMPLETA, etiquetaCategoria } from '@/lib/vr'
import type { CategoriaSemana, PuntoBanda } from './banda-consignatarias'

/**
 * Mínimo de lotes para publicar la banda de una categoría. Es la regla que ya usa
 * /vr (`getBandasPublicas`) y la que aplica `compute-vr-bandas.mjs` antes de
 * escribir la serie: debajo de 30 lotes se informa la mediana sola, sin banda, y
 * una página que es SÓLO la banda no tiene qué mostrar. No es un umbral nuevo.
 */
export const MIN_LOTES_PUBLICAR = MIN_LOTES_BANDA_COMPLETA

/**
 * Los puntos que se pueden publicar. Un punto sin `lotes` (el de hace una semana
 * cuando se arma desde el JSON, que sólo trae amplitud y mediana) pasa: su
 * categoría ya pasó el mínimo cuando entró a la serie.
 */
export function puntosPublicables(puntos: PuntoBanda[]): PuntoBanda[] {
  return puntos.filter((p) => p.lotes == null || p.lotes >= MIN_LOTES_PUBLICAR)
}

/** Forma mínima de `vr-bandas.json` que hace falta para el respaldo. */
export interface ArchivoBanda {
  fecha_dato_hasta: string
  categorias: Record<string, { p10: number; mediana: number; p90: number; amplitud_pct: number; lotes: number }>
  tendencia?: Record<string, { date: string; amplitud: number; mediana: number }[]>
}

/**
 * Respaldo cuando la serie de la base no responde (build sin credenciales, caída).
 *
 * Arma, por categoría, el punto vigente completo y UN punto de siete o más días
 * antes. Con eso `bandaSemanal` calcula el cambio semanal igual que con la serie,
 * pero NO puede ubicar el dato contra su historia (le faltan semanas) y por lo
 * tanto no afirma récords: la tendencia corta del JSON son 12 puntos, y decir "el
 * valor más alto de la serie" sobre 12 puntos sería falsa precisión.
 */
export function puntosDesdeArchivo(archivo: ArchivoBanda): PuntoBanda[] {
  const corte = archivo.fecha_dato_hasta
  const semanaPrevia = new Date(Date.parse(`${corte}T12:00:00Z`) - 7 * 86_400_000).toISOString().slice(0, 10)
  const out: PuntoBanda[] = []
  for (const [category, b] of Object.entries(archivo.categorias)) {
    out.push({ date: corte, category, p10: b.p10, mediana: b.mediana, p90: b.p90, amplitud_pct: b.amplitud_pct, lotes: b.lotes })
    const antes = (archivo.tendencia?.[category] ?? []).filter((t) => t.date <= semanaPrevia).sort((x, y) => x.date.localeCompare(y.date))
    const t = antes[antes.length - 1]
    if (t) out.push({ date: t.date, category, p10: null, mediana: t.mediana, p90: null, amplitud_pct: t.amplitud, lotes: null })
  }
  return out
}

/** Serie de amplitud de una categoría, lista para dibujar. */
export interface SerieCategoria {
  categoria: string
  puntos: { date: string; amplitud: number }[]
}

/**
 * La serie de amplitud por categoría, en el orden en que la página lista las
 * categorías (el de la banda de hoy) y con las que no estén en ese orden al final.
 * Una categoría con menos de dos puntos no es una serie: se descarta.
 */
export function serieAmplitud(puntos: PuntoBanda[], orden: string[] = []): SerieCategoria[] {
  const porCat = new Map<string, Map<string, number>>()
  for (const p of puntosPublicables(puntos)) {
    if (p.amplitud_pct == null) continue
    const m = porCat.get(p.category) ?? new Map<string, number>()
    m.set(p.date, p.amplitud_pct) // una fecha, un punto: si viniera repetida, gana la última
    porCat.set(p.category, m)
  }
  const rango = (c: string) => {
    const i = orden.indexOf(c)
    return i < 0 ? orden.length : i
  }
  return [...porCat.entries()]
    .map(([categoria, m]) => ({
      categoria,
      puntos: [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, amplitud]) => ({ date, amplitud })),
    }))
    .filter((s) => s.puntos.length >= 2)
    .sort((a, b) => rango(a.categoria) - rango(b.categoria) || a.categoria.localeCompare(b.categoria))
}

/** Paso "redondo" (1, 2, 2,5 o 5 × 10ⁿ) más chico que cubre `bruto`. */
export function pasoRedondo(bruto: number): number {
  if (!(bruto > 0)) return 1
  const exp = 10 ** Math.floor(Math.log10(bruto))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * exp >= bruto) return m * exp
  return 10 * exp
}

export interface EscalaRangos {
  min: number
  max: number
  ticks: number[]
}

/**
 * Eje común de las barras: todas las categorías en la misma escala de $/kg, para
 * que la barra larga sea la banda ancha y no un efecto del zoom. Arranca y termina
 * en un múltiplo del paso, con unas cuatro divisiones.
 */
export function escalaRangos(cats: { p10: number; p90: number }[]): EscalaRangos {
  if (cats.length === 0) return { min: 0, max: 1, ticks: [0, 1] }
  const lo = Math.min(...cats.map((c) => c.p10))
  const hi = Math.max(...cats.map((c) => c.p90))
  const paso = pasoRedondo((hi - lo || hi || 1) / 4)
  const min = Math.floor(lo / paso) * paso
  let max = Math.ceil(hi / paso) * paso
  if (max === min) max = min + paso
  const ticks: number[] = []
  for (let t = min; t <= max + paso / 1000; t += paso) ticks.push(Number(t.toFixed(6)))
  return { min, max, ticks }
}

/** Posición de un valor sobre la escala, en % del ancho (0–100). */
export function posicionPct(v: number, e: EscalaRangos): number {
  const pct = ((v - e.min) / (e.max - e.min)) * 100
  return Math.max(0, Math.min(100, Number(pct.toFixed(2))))
}

/** 2026-10-30 → 30/10/2026, sin pasar por la zona horaria. */
export function fechaCorta(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}

const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
const pct = (n: number) => `${n.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`

/**
 * El gráfico dicho en palabras, para `aria-label`. Un lector de pantalla tiene que
 * llevarse lo mismo que el que mira las barras: los tres precios y la amplitud de
 * cada categoría. La tabla de abajo repite el dato con estructura.
 */
export function descripcionRangos(fecha: string, cats: CategoriaSemana[]): string {
  if (cats.length === 0) return `Banda Consignatarias al ${fechaCorta(fecha)}: sin categorías con base suficiente.`
  const filas = cats.map(
    (c) =>
      `${etiquetaCategoria(c.categoria)}: P10 ${pesos(c.p10)}, mediana ${pesos(c.mediana)}, P90 ${pesos(c.p90)}, amplitud ${pct(c.amplitudPct)}`,
  )
  return `Banda Consignatarias al ${fechaCorta(fecha)}, en pesos por kilo vivo. ${filas.join('. ')}.`
}

/** La serie de una categoría dicha en palabras, para el `aria-label` de su gráfico. */
export function descripcionSerie(s: SerieCategoria): string {
  const a = s.puntos[0]
  const z = s.puntos[s.puntos.length - 1]
  const valores = s.puntos.map((p) => p.amplitud)
  return (
    `Amplitud de la Banda Consignatarias de ${etiquetaCategoria(s.categoria).toLowerCase()}: ${pct(a.amplitud)} el ${fechaCorta(a.date)} ` +
    `y ${pct(z.amplitud)} el ${fechaCorta(z.date)}; mínimo ${pct(Math.min(...valores))}, máximo ${pct(Math.max(...valores))}, ${s.puntos.length} puntos.`
  )
}

export interface GeometriaSerie {
  /** Atributo `d` de la línea. */
  d: string
  ultimo: { x: number; y: number }
  min: number
  max: number
}

/**
 * La línea de una serie en un lienzo de `ancho` × `alto`. El eje Y es el rango de
 * la propia categoría (con un punto de aire), no uno común: lo que se lee es si
 * esa categoría se abre o se cierra, y en un eje común las de poca variación
 * quedarían planas.
 */
export function geometriaSerie(s: SerieCategoria, ancho: number, alto: number, margen = 4): GeometriaSerie {
  const valores = s.puntos.map((p) => p.amplitud)
  const min = Math.floor(Math.min(...valores) - 1)
  const max = Math.ceil(Math.max(...valores) + 1)
  const n = s.puntos.length
  const x = (i: number) => margen + (n === 1 ? 0 : ((ancho - margen * 2) * i) / (n - 1))
  const y = (v: number) => margen + (alto - margen * 2) * (1 - (v - min) / (max - min))
  const r = (k: number) => Number(k.toFixed(1))
  const d = s.puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${r(x(i))} ${r(y(p.amplitud))}`).join(' ')
  return { d, ultimo: { x: r(x(n - 1)), y: r(y(valores[n - 1])) }, min, max }
}
