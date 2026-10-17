/**
 * resultado-vs-mercado.ts — "Su precio contra el mercado" para las firmas que NO
 * rematan en Cañuelas. (17-10-2026)
 *
 * POR QUÉ EXISTE
 * `benchmark.ts` compara a una casa contra las otras 21 del MAG con los lotes que
 * scrapeamos. Sirve para 22 firmas. Las otras —Reggi en Corrientes y casi todo el
 * interior— no tienen un solo lote nuestro: rematan en su predio y el precio queda
 * en su planilla. Para ellas el único dato posible es el que la firma carga
 * (`auction_results`, pestaña Resultados del panel) y la única vara que tenemos es
 * el Valor de Referencia (`vr.ts`).
 *
 * QUÉ PUEDE DECIR Y QUÉ NO (la regla de `vr.ts`: nunca inventar precisión)
 *  · El VR es la banda P10/mediana/P90 de los lotes del MAG (Cañuelas), en ARS por
 *    kg vivo. Es una referencia NACIONAL. Con base suficiente se ajusta por origen
 *    de la hacienda, pero ese ajuste es de nuestra base, no un precio provincial.
 *    No hay serie oficial de precios de Corrientes con la que comparar.
 *  · Se compara contra la banda DE LA FECHA del remate. Con inflación en pesos, un
 *    remate de agosto contra la banda de octubre diría "vendiste 15% abajo" sin que
 *    nadie vendiera mal. Si el remate cae en la ventana vigente (30 días) se usa la
 *    banda vigente —la única que tiene rango de peso y ajuste de origen—; si es más
 *    viejo, la de `vr_bandas_history` de ese día; si no hay ninguna, NO se compara.
 *  · Con base fina (10 a 29 lotes) la banda colapsa en la mediana: se da el % contra
 *    la mediana y no se ubica en la banda.
 *  · Un precio 4 veces arriba o abajo de la mediana casi seguro no está en $/kg vivo
 *    (precio por cabeza, kg totales). No se clasifica: se avisa.
 *  · Ternero/ternera: el MAG no los opera por lote. Sin referencia, y se dice.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  categoriaALote,
  getReferencia,
  getReferenciaPorPeso,
  normalizarProvincia,
  PROVINCIA_NOMBRE,
  vrIsoRestar,
  vrVentana,
  MIN_LOTES_BANDA,
  MIN_LOTES_BANDA_COMPLETA,
  VR_METODOLOGIA,
  type VrConfianza,
} from '@/lib/vr'
import { etiquetaCategoria, SLUGS_SIN_VR } from './resultado-categorias'

/** Cuántos días después del último dato del VR se sigue aceptando la banda vigente.
 *  El VR se recalcula con las ruedas del MAG (Mar/Mié/Vie): un remate del sábado
 *  todavía no tiene banda nueva, y la de la semana es la que corresponde. */
export const TOLERANCIA_DIAS_VIGENTE = 7

/** Distancia máxima entre la fecha del remate y el punto de la serie histórica. */
export const TOLERANCIA_DIAS_HISTORICO = 7

/** Razón precio/mediana fuera de la cual el precio no parece estar en $/kg vivo. */
export const RAZON_FUERA_DE_ESCALA = 4

/** Cuántos remates muestra el panel. */
export const RESULTADOS_A_MOSTRAR = 3

export type PosicionBanda =
  | 'debajo de la banda'
  | 'en la banda, debajo de la mediana'
  | 'en la banda, arriba de la mediana'
  | 'arriba de la banda'

/** De dónde sale la banda: la vigente por rango de peso, la vigente por categoría o la serie del día. */
export type BaseReferencia = 'rango_peso' | 'categoria' | 'historico'

/** Una fila de `auction_results.category_results`, tal como puede venir (vieja o nueva). */
export interface FilaResultadoCargada {
  category?: unknown
  categoria_vr?: unknown
  heads?: unknown
  peso_kg?: unknown
  avg_price?: unknown
  max_price?: unknown
}

export interface ResultadoCargado {
  id: string
  auction_date: string
  auction_title: string
  category_results: unknown
}

/** Punto de `vr_bandas_history` (la banda de 30 días calculada ese día). */
export interface PuntoHistorico {
  date: string
  category: string
  p10: number
  mediana: number
  p90: number
  lotes: number
}

export interface ReferenciaUsada {
  p10: number
  mediana: number
  p90: number
  lotes: number
  confianza: Exclude<VrConfianza, 'sin_base'>
  base: BaseReferencia
  /** Rango de peso de la banda, si se usó el del lote. */
  rango: { desde_kg: number; hasta_kg: number } | null
  /** Ajuste por origen aplicado (código de 3 letras y factor), si hubo base. */
  origen: { provincia: string; factor: number } | null
  /** Fecha del último dato de la banda usada. */
  fechaBanda: string
}

export interface ComparacionCategoria {
  /** Etiqueta legible de la categoría (la del desplegable o el texto libre viejo). */
  categoria: string
  /** Código del dato de lote (VACA, NOVILLO…) o null si no tiene equivalente. */
  codigo: string | null
  cabezas: number | null
  pesoKg: number | null
  /** Precio promedio de la firma, ARS por kg vivo. */
  precioFirma: number | null
  referencia: ReferenciaUsada | null
  /** null cuando no se puede ubicar: sin base, base fina, sin precio o fuera de escala. */
  posicion: PosicionBanda | null
  /** % del precio de la firma contra la mediana, con un decimal. */
  pctVsMediana: number | null
  /** Siempre presente: qué se usó o por qué no hay comparación. */
  nota: string
}

export interface ResultadoVsMercado {
  id: string
  fecha: string
  titulo: string
  /** Nombre legible de la provincia de la firma, si la tenemos. */
  provincia: string | null
  filas: ComparacionCategoria[]
}

/* ── Lectura defensiva del JSON ─────────────────────────────────────────────── */

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/** `category_results` es JSON libre: se lee fila por fila y se descarta lo que no tenga categoría. */
export function leerFilas(json: unknown): FilaResultadoCargada[] {
  if (!Array.isArray(json)) return []
  return json.filter(
    (f): f is FilaResultadoCargada => !!f && typeof f === 'object' && !!str((f as FilaResultadoCargada).category),
  )
}

/* ── Clasificación ──────────────────────────────────────────────────────────── */

export function ubicarEnBanda(precio: number, b: { p10: number; mediana: number; p90: number }): PosicionBanda {
  if (precio < b.p10) return 'debajo de la banda'
  if (precio > b.p90) return 'arriba de la banda'
  return precio < b.mediana ? 'en la banda, debajo de la mediana' : 'en la banda, arriba de la mediana'
}

function confianzaPorLotes(lotes: number): VrConfianza {
  if (lotes < MIN_LOTES_BANDA) return 'sin_base'
  if (lotes < MIN_LOTES_BANDA_COMPLETA) return 'baja'
  return lotes >= 100 ? 'alta' : 'media'
}

function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000)
}

/** ¿La fecha del remate cae en la ventana de la banda vigente? */
export function enVentanaVigente(fecha: string, ventana = vrVentana()): boolean {
  return fecha >= ventana.desde && diasEntre(fecha, ventana.hasta) <= TOLERANCIA_DIAS_VIGENTE
}

/** El punto de la serie más cercano ANTERIOR o igual a la fecha, dentro de la tolerancia. */
export function puntoHistorico(
  historico: PuntoHistorico[],
  codigo: string,
  fecha: string,
): PuntoHistorico | null {
  let mejor: PuntoHistorico | null = null
  for (const p of historico) {
    if (p.category !== codigo || p.date > fecha) continue
    if (diasEntre(fecha, p.date) > TOLERANCIA_DIAS_HISTORICO) continue
    if (!mejor || p.date > mejor.date) mejor = p
  }
  return mejor
}

function referenciaVigente(
  categoria: string,
  pesoKg: number | null,
  provincia: string | null,
): { ref: ReferenciaUsada | null; nota: string } {
  // Con peso, primero el rango de peso (no tiene ajuste de origen: la base por
  // rango × provincia no alcanza). Sin rango, la banda de categoría con origen.
  if (pesoKg) {
    const porPeso = getReferenciaPorPeso(categoria, pesoKg)
    if (porPeso.banda && porPeso.base === 'rango_peso' && porPeso.rango && porPeso.confianza !== 'sin_base') {
      return {
        ref: {
          p10: porPeso.banda.p10,
          mediana: porPeso.banda.mediana,
          p90: porPeso.banda.p90,
          lotes: porPeso.banda.lotes,
          confianza: porPeso.confianza,
          base: 'rango_peso',
          rango: porPeso.rango,
          origen: null,
          fechaBanda: porPeso.fecha_dato,
        },
        nota: `Banda nacional de los lotes de ${porPeso.rango.desde_kg}–${porPeso.rango.hasta_kg} kg (${porPeso.banda.lotes} lotes en ${porPeso.ventana_dias} días).`,
      }
    }
  }

  const general = getReferencia(categoria, provincia ?? undefined)
  if (!general.banda || general.confianza === 'sin_base') {
    return { ref: null, nota: general.limites[general.limites.length - 1] }
  }
  const origen = general.origen ? { provincia: general.origen.provincia, factor: general.origen.factor } : null
  const partes = [
    origen
      ? `Banda de la categoría con ajuste por origen ${PROVINCIA_NOMBRE[origen.provincia] ?? origen.provincia} (×${origen.factor.toFixed(3)}).`
      : 'Banda nacional de la categoría.',
  ]
  if (pesoKg) partes.push(`No hay ${MIN_LOTES_BANDA_COMPLETA} lotes de ${pesoKg} kg en la ventana: se usa toda la categoría, que es más ancha.`)
  if (provincia && !origen) partes.push('Sin base para ajustar por la provincia de la firma.')
  return {
    ref: {
      p10: general.banda.p10,
      mediana: general.banda.mediana,
      p90: general.banda.p90,
      lotes: general.banda.lotes,
      confianza: general.confianza,
      base: 'categoria',
      rango: null,
      origen,
      fechaBanda: general.fecha_dato,
    },
    nota: partes.join(' '),
  }
}

function referenciaHistorica(
  codigo: string,
  fecha: string,
  historico: PuntoHistorico[],
): { ref: ReferenciaUsada | null; nota: string } {
  const p = puntoHistorico(historico, codigo, fecha)
  if (!p) {
    return {
      ref: null,
      nota: 'No tenemos la banda de esa fecha. No se compara contra la de hoy: con la inflación en pesos, la diferencia sería de calendario, no de precio.',
    }
  }
  const confianza = confianzaPorLotes(p.lotes)
  if (confianza === 'sin_base') {
    return { ref: null, nota: `La banda de esa fecha tenía ${p.lotes} lotes (mínimo ${MIN_LOTES_BANDA}). Sin base para comparar.` }
  }
  const fina = confianza === 'baja'
  return {
    ref: {
      p10: fina ? p.mediana : p.p10,
      mediana: p.mediana,
      p90: fina ? p.mediana : p.p90,
      lotes: p.lotes,
      confianza,
      base: 'historico',
      rango: null,
      origen: null,
      fechaBanda: p.date,
    },
    nota: `Banda nacional de la categoría al ${p.date} (${p.lotes} lotes). Para fechas pasadas no hay rango de peso ni ajuste por origen.`,
  }
}

/**
 * Compara un resultado cargado contra el VR. Función pura salvo por la lectura del
 * VR vigente (`vr-bandas.json`, que es un import estático).
 *
 * @param opts.provincia  provincia de la firma (nombre o código), para el ajuste de origen.
 * @param opts.historico  puntos de `vr_bandas_history` que cubran la fecha, si el remate
 *                        es anterior a la ventana vigente. Sin ellos, esos remates no se comparan.
 * @param opts.ventana    ventana vigente (inyectable para tests).
 */
export function compararResultado(
  r: ResultadoCargado,
  opts: { provincia?: string | null; historico?: PuntoHistorico[]; ventana?: { desde: string; hasta: string } } = {},
): ResultadoVsMercado {
  const provincia = opts.provincia?.trim() || null
  const vigente = enVentanaVigente(r.auction_date, opts.ventana ?? vrVentana())

  const filas = leerFilas(r.category_results).map((f): ComparacionCategoria => {
    const slug = str(f.categoria_vr)
    const texto = str(f.category) as string
    const categoria = (slug && etiquetaCategoria(slug)) || texto
    // Filas nuevas traen el slug; las viejas, texto libre ("Vacas", "novillos") que
    // `categoriaALote` resuelve si es una categoría que el VR conoce.
    const claveVr = slug ?? texto
    const codigo = categoriaALote(claveVr)
    const pesoKg = num(f.peso_kg)
    const precioFirma = num(f.avg_price)
    const base = { categoria, codigo, cabezas: num(f.heads), pesoKg, precioFirma }

    const sinVr = (SLUGS_SIN_VR as readonly string[]).includes(slug ?? '') || /^terner[oa]s?$/i.test(texto)
    if (sinVr) {
      return { ...base, referencia: null, posicion: null, pctVsMediana: null, nota: 'El MAG no opera terneros por lote: no hay Valor de Referencia para esta categoría.' }
    }
    if (!codigo) {
      return { ...base, referencia: null, posicion: null, pctVsMediana: null, nota: `"${texto}" no tiene equivalente en las categorías que mide el VR.` }
    }

    const { ref, nota } = vigente
      ? referenciaVigente(claveVr, pesoKg, provincia)
      : referenciaHistorica(codigo, r.auction_date, opts.historico ?? [])

    if (!ref) return { ...base, referencia: null, posicion: null, pctVsMediana: null, nota }
    if (!precioFirma) {
      return { ...base, referencia: ref, posicion: null, pctVsMediana: null, nota: `Sin precio promedio cargado. ${nota}` }
    }

    const razon = precioFirma / ref.mediana
    if (razon > RAZON_FUERA_DE_ESCALA || razon < 1 / RAZON_FUERA_DE_ESCALA) {
      return {
        ...base,
        referencia: ref,
        posicion: null,
        pctVsMediana: null,
        nota: 'El precio no parece estar en $ por kg vivo (¿precio por cabeza o por kg totales?). No se compara.',
      }
    }

    const pctVsMediana = Math.round((razon - 1) * 1000) / 10
    if (ref.confianza === 'baja') {
      return {
        ...base,
        referencia: ref,
        posicion: null,
        pctVsMediana,
        nota: `Base fina (${ref.lotes} lotes): se compara sólo contra la mediana, sin banda. ${nota}`,
      }
    }
    return { ...base, referencia: ref, posicion: ubicarEnBanda(precioFirma, ref), pctVsMediana, nota }
  })

  const cod = provincia ? normalizarProvincia(provincia) : null
  return {
    id: r.id,
    fecha: r.auction_date,
    titulo: r.auction_title,
    provincia: provincia ? (cod && PROVINCIA_NOMBRE[cod]) || provincia : null,
    filas,
  }
}

/* ── Lectura (server) ───────────────────────────────────────────────────────── */

/**
 * Los últimos remates cargados por la firma, comparados contra el VR.
 *
 * Lee por slug O por quien los cargó: una firma con dos usuarios ve los de los dos,
 * y un resultado viejo cargado antes de un cambio de slug no se pierde.
 *
 * Devuelve null si falla la lectura (el panel no se muestra: un array vacío
 * invitaría a cargar un remate que quizás ya está cargado) y [] si no hay ninguno.
 */
export async function getResultadosVsMercado(
  db: SupabaseClient,
  userId: string,
  slug: string,
): Promise<ResultadoVsMercado[] | null> {
  // Slug y uuid sólo llevan [a-z0-9-]; se valida igual antes de armar el filtro `or`,
  // que es texto y se rompería (o se ampliaría) con una coma o un paréntesis.
  if (!/^[a-z0-9-]+$/i.test(slug) || !/^[0-9a-f-]+$/i.test(userId)) return null

  const [res, firma] = await Promise.all([
    db
      .from('auction_results')
      .select('id, auction_date, auction_title, category_results')
      .or(`consignataria_slug.eq.${slug},submitted_by.eq.${userId}`)
      .order('auction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(RESULTADOS_A_MOSTRAR),
    db.from('consignatarias').select('province').eq('canonical_slug', slug).maybeSingle(),
  ])
  if (res.error) return null
  const resultados = (res.data ?? []) as ResultadoCargado[]
  if (resultados.length === 0) return []

  const provincia = (firma.data as { province: string | null } | null)?.province ?? null

  // Serie histórica sólo si algún remate cae fuera de la ventana vigente.
  const ventana = vrVentana()
  const viejos = resultados.filter((r) => !enVentanaVigente(r.auction_date, ventana))
  const historico: PuntoHistorico[] = []
  if (viejos.length > 0) {
    // Una consulta por fecha (son 3 como mucho): un solo rango entre el remate más
    // viejo y el más nuevo podía cubrir meses y cortarse en el límite de filas.
    const fechas = [...new Set(viejos.map((r) => r.auction_date))]
    const lecturas = await Promise.all(
      fechas.map((f) =>
        db
          .from('vr_bandas_history')
          .select('date, category, p10, mediana, p90, lotes')
          .eq('metodologia', VR_METODOLOGIA)
          .gte('date', vrIsoRestar(f, TOLERANCIA_DIAS_HISTORICO))
          .lte('date', f),
      ),
    )
    // Si la serie no se puede leer, los remates viejos quedan "sin banda de esa
    // fecha" —que es verdad— en vez de compararse contra la de hoy.
    for (const l of lecturas) if (!l.error && l.data) historico.push(...(l.data as PuntoHistorico[]))
  }

  return resultados.map((r) => compararResultado(r, { provincia, historico, ventana }))
}
