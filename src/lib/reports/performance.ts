/**
 * performance.ts — el mes de una consignataria, en números propios.
 *
 * POR QUÉ EXISTE
 * El reporte que se le manda a una firma era una ficha institucional: sus remates,
 * sus provincias, sus cabezas. Todo eso ya lo sabe. Lo que no sabe —y es lo único
 * que justifica pagar— es cuánta gente la miró, cuántos la contactaron, y si eso
 * mejoró o empeoró. Este módulo calcula exactamente eso y lo usan el panel y el PDF.
 *
 * LA REGLA QUE NO SE ROMPE: no declarar una mejora que no se puede distinguir del
 * ruido. Con los volúmenes reales del sitio (una firma puede pasar de 3 a 6 contactos
 * en un mes) el "+100%" es matemáticamente cierto y comercialmente una mentira. Ver
 * `clasificarCambio()`.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/** Eventos de `value_events` que son un contacto real hacia la firma. */
const EVENTOS_CONTACTO = [
  'contact_web', 'contact_whatsapp', 'contact_phone', 'contact_email',
] as const

/** Eventos de interés en un remate: no son contacto, pero son intención. */
const EVENTOS_INTERES = ['live_click', 'catalog_click'] as const

export interface MetricasMes {
  /** 'YYYY-MM' */
  mes: string
  vistas: number
  contactos: number
  /** Desglose de `contactos` por canal. */
  porCanal: Record<string, number>
  interes: number
  /** Leads con nombre y contacto (no clics anónimos). */
  leads: number
  remates: number
}

export type Direccion = 'sube' | 'baja' | 'igual'
export type Confianza = 'señal' | 'ruido' | 'sin_base'

export interface Cambio {
  actual: number
  anterior: number
  delta: number
  /** Null cuando el mes anterior fue 0 — un porcentaje sobre cero no significa nada. */
  deltaPct: number | null
  direccion: Direccion
  confianza: Confianza
  /** Frase lista para mostrar, honesta sobre lo que se puede afirmar. */
  leyenda: string
}

export interface Performance {
  slug: string
  actual: MetricasMes
  anterior: MetricasMes
  cambios: {
    vistas: Cambio
    contactos: Cambio
    leads: Cambio
  }
  /** Posición entre las firmas de su provincia por contactos. Null si no hay con qué comparar. */
  ranking: { posicion: number; total: number; provincia: string } | null
  /** Qué conviene hacer este mes, derivado de los números. Nunca inventa. */
  recomendaciones: string[]
}

/**
 * ¿El cambio es señal o es ruido?
 *
 * Los conteos de eventos se comportan como un proceso de Poisson: la fluctuación
 * esperada mes a mes es del orden de √n aunque no pase absolutamente nada. Se toma
 * 2√(anterior+1) como banda de ruido —dos desvíos, ~95%— y sólo se llama "señal" a
 * lo que la supera. Es la versión mínima y auditable de la doctrina de medición del
 * proyecto (`modelo-zibecchi`): antes de decir que algo mejoró, hay que poder
 * distinguirlo del ruido de fondo.
 *
 * Con menos de 5 eventos en ambos meses no se afirma nada: `sin_base`.
 */
export function clasificarCambio(actual: number, anterior: number, etiqueta: string): Cambio {
  const delta = actual - anterior
  const deltaPct = anterior > 0 ? Math.round((delta / anterior) * 100) : null
  const direccion: Direccion = delta > 0 ? 'sube' : delta < 0 ? 'baja' : 'igual'

  const banda = 2 * Math.sqrt(anterior + 1)
  let confianza: Confianza
  let leyenda: string

  if (actual < 5 && anterior < 5) {
    confianza = 'sin_base'
    leyenda = `Muy pocos datos para comparar (${anterior} → ${actual} ${etiqueta}).`
  } else if (Math.abs(delta) <= banda) {
    confianza = 'ruido'
    leyenda = `Se mantiene: ${anterior} → ${actual} ${etiqueta}. La diferencia entra en la variación normal de un mes a otro.`
  } else {
    confianza = 'señal'
    leyenda =
      direccion === 'sube'
        ? `Subió de verdad: ${anterior} → ${actual} ${etiqueta}.`
        : `Bajó de verdad: ${anterior} → ${actual} ${etiqueta}.`
  }

  return { actual, anterior, delta, deltaPct, direccion, confianza, leyenda }
}

/** Primer día del mes, en ISO, desplazado `offset` meses hacia atrás. */
function inicioDeMes(ref: Date, offset = 0): Date {
  return new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - offset, 1))
}

function claveMes(d: Date): string {
  return d.toISOString().slice(0, 7)
}

async function metricasDe(
  db: SupabaseClient,
  slug: string,
  desde: Date,
  hasta: Date,
  remates: number,
): Promise<MetricasMes> {
  const d = desde.toISOString()
  const h = hasta.toISOString()

  const [vistasRes, eventosRes, leadsRes] = await Promise.all([
    db
      .from('profile_views')
      .select('id', { count: 'exact', head: true })
      .eq('entity_type', 'consignataria')
      .eq('entity_slug', slug)
      .gte('viewed_at', d)
      .lt('viewed_at', h),
    db
      .from('value_events')
      .select('event')
      .eq('entity_slug', slug)
      .gte('created_at', d)
      .lt('created_at', h)
      .limit(5000),
    db
      .from('consignataria_leads')
      .select('id', { count: 'exact', head: true })
      .eq('consignataria_slug', slug)
      .gte('created_at', d)
      .lt('created_at', h),
  ])

  const porCanal: Record<string, number> = {}
  let contactos = 0
  let interes = 0
  for (const row of (eventosRes.data ?? []) as { event: string }[]) {
    if ((EVENTOS_CONTACTO as readonly string[]).includes(row.event)) {
      contactos++
      porCanal[row.event] = (porCanal[row.event] ?? 0) + 1
    } else if ((EVENTOS_INTERES as readonly string[]).includes(row.event)) {
      interes++
    }
  }

  return {
    mes: claveMes(desde),
    vistas: vistasRes.count ?? 0,
    contactos,
    porCanal,
    interes,
    leads: leadsRes.count ?? 0,
    remates,
  }
}

/**
 * Ranking por contactos entre las firmas de la misma provincia.
 *
 * Se rankea por CONTACTOS y no por vistas a propósito: las vistas las mueve el SEO
 * —o sea, nosotros— y no dicen nada sobre la firma. El contacto es lo que le pasa a
 * ella. Devuelve null si en la provincia no hay al menos 3 firmas con actividad:
 * salir "1° de 1" no es un dato, es un chiste.
 */
async function rankingProvincial(
  db: SupabaseClient,
  slug: string,
  desde: Date,
  hasta: Date,
): Promise<Performance['ranking']> {
  const { data: firma } = await db
    .from('consignatarias')
    .select('province')
    .eq('canonical_slug', slug)
    .maybeSingle()
  const provincia = (firma as { province: string | null } | null)?.province
  if (!provincia) return null

  const { data: pares } = await db
    .from('consignatarias')
    .select('canonical_slug')
    .eq('province', provincia)
    .limit(300)
  const slugs = (pares ?? []).map((p: { canonical_slug: string }) => p.canonical_slug)
  if (slugs.length < 3) return null

  const { data: eventos } = await db
    .from('value_events')
    .select('entity_slug, event')
    .in('entity_slug', slugs)
    .in('event', EVENTOS_CONTACTO as unknown as string[])
    .gte('created_at', desde.toISOString())
    .lt('created_at', hasta.toISOString())
    .limit(10000)

  const conteo = new Map<string, number>()
  for (const e of (eventos ?? []) as { entity_slug: string }[]) {
    conteo.set(e.entity_slug, (conteo.get(e.entity_slug) ?? 0) + 1)
  }
  if (conteo.size < 3) return null

  const orden = [...conteo.entries()].sort((a, b) => b[1] - a[1])
  const posicion = orden.findIndex(([s]) => s === slug)
  if (posicion < 0) return null

  return { posicion: posicion + 1, total: orden.length, provincia }
}

/**
 * Qué hacer este mes. Sale de los números, nunca de un catálogo de consejos.
 * Si no hay nada concreto que decir, devuelve lista vacía — mejor callarse que
 * llenar el reporte de obviedades.
 */
export function recomendar(p: Omit<Performance, 'recomendaciones'>): string[] {
  const out: string[] = []
  const { actual, cambios } = p

  if (actual.vistas > 30 && actual.contactos === 0) {
    out.push(
      `Te vieron ${actual.vistas} veces y nadie te contactó. Suele ser que falta el WhatsApp cargado en el perfil, o que no hay un remate próximo publicado.`,
    )
  }
  if (actual.remates === 0) {
    out.push('No tenés ningún remate publicado este mes. El remate es lo que trae las visitas al perfil.')
  }
  if (actual.contactos > 0 && actual.leads === 0) {
    out.push(
      `Tuviste ${actual.contactos} contactos anónimos y ningún lead con datos. Los contactos con nombre y teléfono llegan cuando el visitante entra con cuenta.`,
    )
  }
  if (cambios.contactos.confianza === 'señal' && cambios.contactos.direccion === 'baja') {
    out.push('Los contactos bajaron por encima de la variación normal. Vale mirar si cambió algo en el perfil o en la agenda de remates.')
  }
  const canalTop = Object.entries(actual.porCanal).sort((a, b) => b[1] - a[1])[0]
  if (canalTop && canalTop[1] >= 3) {
    const nombre = { contact_whatsapp: 'WhatsApp', contact_web: 'la web', contact_phone: 'el teléfono', contact_email: 'el email' }[canalTop[0]] ?? canalTop[0]
    out.push(`La mayoría te contacta por ${nombre} (${canalTop[1]} de ${actual.contactos}).`)
  }

  return out
}

/**
 * Performance de una firma para un mes dado (por defecto, el mes en curso),
 * comparada contra el mes anterior.
 *
 * `rematesPorMes` lo pasa el llamador porque los remates viven en un JSON estático
 * (`remates.json`), no en la base — mantenerlo afuera evita que este módulo tenga que
 * importar 900 filas para contar dos.
 */
export async function getPerformance(
  db: SupabaseClient,
  slug: string,
  opts: { ref?: Date; rematesPorMes?: Record<string, number> } = {},
): Promise<Performance> {
  const ref = opts.ref ?? new Date()
  const rpm = opts.rematesPorMes ?? {}

  const inicioActual = inicioDeMes(ref)
  const inicioAnterior = inicioDeMes(ref, 1)
  const finActual = inicioDeMes(ref, -1)

  const [actual, anterior, ranking] = await Promise.all([
    metricasDe(db, slug, inicioActual, finActual, rpm[claveMes(inicioActual)] ?? 0),
    metricasDe(db, slug, inicioAnterior, inicioActual, rpm[claveMes(inicioAnterior)] ?? 0),
    rankingProvincial(db, slug, inicioActual, finActual),
  ])

  const base = {
    slug,
    actual,
    anterior,
    cambios: {
      vistas: clasificarCambio(actual.vistas, anterior.vistas, 'visitas'),
      contactos: clasificarCambio(actual.contactos, anterior.contactos, 'contactos'),
      leads: clasificarCambio(actual.leads, anterior.leads, 'leads'),
    },
    ranking,
  }

  return { ...base, recomendaciones: recomendar(base) }
}

const MES_LARGO = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** '2026-08' → 'agosto 2026'. */
export function nombreMes(clave: string): string {
  const [a, m] = clave.split('-')
  return `${MES_LARGO[Number(m) - 1] ?? clave} ${a}`
}

const CANAL_LABEL: Record<string, string> = {
  contact_whatsapp: 'WhatsApp',
  contact_web: 'Web',
  contact_phone: 'Teléfono',
  contact_email: 'Email',
}

/**
 * Reemplaza los caracteres que las fuentes core de jsPDF no saben dibujar.
 *
 * jsPDF con Helvetica codifica en WinAnsi, que no tiene flecha ni comillas
 * tipográficas: la leyenda "46 → 30 visitas" salía impresa como "46 ! 30 visitas"
 * en el PDF que la firma le muestra a su socio. Los acentos y la ñ sí entran, así
 * que sólo hay que tocar estos.
 */
function aWinAnsi(s: string): string {
  return s
    .replace(/→/g, 'a')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
}

/**
 * Adapta una `Performance` a lo que el PDF necesita.
 *
 * Vive acá y no en el módulo de PDF para que el generador no tenga que conocer la
 * forma interna de `Cambio` — si mañana cambia la clasificación de señal/ruido, el
 * PDF no se entera.
 */
export function aResumenPDF(p: Performance) {
  return {
    mesActual: nombreMes(p.actual.mes),
    mesAnterior: nombreMes(p.anterior.mes),
    filas: [
      { titulo: 'visitas al perfil', c: p.cambios.vistas },
      { titulo: 'contactos recibidos', c: p.cambios.contactos },
      { titulo: 'leads con datos', c: p.cambios.leads },
    ].map(({ titulo, c }) => ({
      titulo,
      actual: c.actual,
      anterior: c.anterior,
      leyenda: aWinAnsi(c.leyenda),
      esSeñal: c.confianza === 'señal',
      sube: c.direccion === 'sube',
    })),
    porCanal: Object.entries(p.actual.porCanal)
      .sort((a, b) => b[1] - a[1])
      .map(([canal, n]) => ({ canal: CANAL_LABEL[canal] ?? canal, n })),
    ranking: p.ranking
      ? aWinAnsi(`${p.ranking.posicion}º de ${p.ranking.total} en ${p.ranking.provincia} por contactos recibidos`)
      : null,
    recomendaciones: p.recomendaciones.map(aWinAnsi),
  }
}

/** Cuenta los remates de una firma por mes, desde el calendario estático. */
export function rematesPorMes(
  remates: Array<{ consignatariaSlug?: string; date?: string }>,
  slug: string,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of remates) {
    if (r.consignatariaSlug !== slug || !r.date) continue
    const k = r.date.slice(0, 7)
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}
