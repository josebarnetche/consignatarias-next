/**
 * origen-visitas.ts — "quién te mira, cuándo y desde dónde", con lo que de verdad se mide.
 *
 * Es el bloque que sostiene la promesa "Analytics de tu perfil" de PRO Consignataria.
 * Antes el panel mostraba un solo número (vistas en 30 días) y la promesa hablaba de
 * "cuándo y desde dónde": no había nada atrás. Este módulo arma las tres respuestas:
 *
 *   - CUÁNDO: vistas por día, últimos 30 días (`profile_views.viewed_at`).
 *   - DESDE DÓNDE: el origen de cada visita (`profile_views.referrer`, que desde el
 *     17-10-2026 es el `document.referrer` real; antes era la propia ficha y se cuenta
 *     aparte como "sin dato", nunca como "dentro del sitio").
 *   - LAS IAs: visitas que llegaron desde ChatGPT, Copilot, Gemini… a la ficha de la
 *     firma (`ai_referrals`, el beacon que dispara AnalyticsProvider). Es la medición
 *     por firma de "aparecer en la respuesta de las IAs".
 *
 * "Quién" no se promete con nombre: una visita anónima no tiene nombre. El quién con
 * nombre y teléfono son los leads, que van en su propia pestaña.
 */

export type Origen = 'buscadores' | 'ias' | 'redes' | 'sitio' | 'directo' | 'otros' | 'sin_dato'

export const ORIGEN_LABEL: Record<Origen, string> = {
  buscadores: 'Google y otros buscadores',
  ias: 'Asistentes de IA',
  redes: 'WhatsApp y redes',
  sitio: 'Desde el sitio',
  directo: 'Directo (link o QR)',
  otros: 'Otros sitios',
  sin_dato: 'Sin dato de origen',
}

/** Dónde del sitio llegó: el directorio, el calendario, la portada… */
export type SeccionSitio = 'directorio' | 'remates' | 'portada' | 'mercado' | 'otras'

export const SECCION_LABEL: Record<SeccionSitio, string> = {
  directorio: 'Directorio de consignatarias',
  remates: 'Calendario y fichas de remate',
  portada: 'Portada',
  mercado: 'Precios y mercado',
  otras: 'Otras páginas',
}

const BUSCADORES = /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org|yandex\.[a-z]+|baidu\.com|search\.brave\.com)$/
const IAS = /(^|\.)(chatgpt\.com|chat\.openai\.com|openai\.com|perplexity\.ai|copilot\.microsoft\.com|gemini\.google\.com|claude\.ai|you\.com|phind\.com|poe\.com|grok\.com|x\.ai|chat\.deepseek\.com|chat\.mistral\.ai|kagi\.com)$/
const REDES = /(^|\.)(facebook\.com|fb\.com|instagram\.com|whatsapp\.com|wa\.me|t\.co|x\.com|twitter\.com|linkedin\.com|lnkd\.in|youtube\.com|tiktok\.com|telegram\.org|t\.me)$/
const PROPIO = /(^|\.)consignatarias\.com(\.ar)?$/

function parse(url: string): URL | null {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

/**
 * Clasifica una visita por su referrer.
 * `fichaPath` es la ruta de la propia ficha: un referrer igual a ella es el registro
 * viejo (el header del POST), no una visita que vino "desde el sitio".
 */
export function clasificarOrigen(
  referrer: string | null | undefined,
  fichaPath: string,
): { origen: Origen; seccion?: SeccionSitio } {
  if (!referrer) return { origen: 'directo' }
  const u = parse(referrer)
  if (!u) return { origen: 'otros' }
  const host = u.hostname.toLowerCase()

  if (PROPIO.test(host)) {
    const path = u.pathname.replace(/\/+$/, '') || '/'
    if (path === fichaPath || path.startsWith(fichaPath + '/')) return { origen: 'sin_dato' }
    if (path === '/') return { origen: 'sitio', seccion: 'portada' }
    if (path.startsWith('/consignatarias') || path.startsWith('/comparar')) return { origen: 'sitio', seccion: 'directorio' }
    if (path.startsWith('/remates') || path.startsWith('/calendario')) return { origen: 'sitio', seccion: 'remates' }
    if (path.startsWith('/mercado') || path.startsWith('/vr') || path.startsWith('/precios')) return { origen: 'sitio', seccion: 'mercado' }
    return { origen: 'sitio', seccion: 'otras' }
  }
  if (IAS.test(host)) return { origen: 'ias' }
  if (BUSCADORES.test(host)) return { origen: 'buscadores' }
  if (REDES.test(host)) return { origen: 'redes' }
  return { origen: 'otros' }
}

const ENGINE_LABEL: Record<string, string> = {
  chatgpt: 'ChatGPT',
  copilot: 'Copilot',
  gemini: 'Gemini',
  claude: 'Claude',
  perplexity: 'Perplexity',
  grok: 'Grok',
  deepseek: 'DeepSeek',
}

/** `bing-organico` vive en la misma tabla pero es búsqueda, no una IA. */
export function esMotorIA(engine: string | null | undefined): boolean {
  return !!engine && engine !== 'bing-organico'
}

export function nombreMotor(engine: string): string {
  return ENGINE_LABEL[engine] ?? engine.charAt(0).toUpperCase() + engine.slice(1)
}

export interface OrigenVisitas {
  /** Vistas por día, 30 entradas (la más vieja primero), fecha YYYY-MM-DD. */
  porDia: { dia: string; vistas: number }[]
  total: number
  /** Conteo por origen, sin los "sin dato". Ordenado de mayor a menor. */
  porOrigen: { origen: Origen; vistas: number }[]
  /** Detalle de "desde el sitio". */
  porSeccion: { seccion: SeccionSitio; vistas: number }[]
  /** Vistas registradas antes de que se midiera el origen. */
  sinDato: number
  /** Visitas que llegaron desde una IA a la ficha, últimos 90 días, por motor. */
  ias: { motor: string; visitas: number }[]
  iasTotal: number
  /** Día de la semana con más vistas (0 = domingo), null si hay muy pocas. */
  diaFuerte: number | null
}

export const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** Fecha YYYY-MM-DD en hora argentina (UTC−3, sin horario de verano). */
function diaAR(iso: string): string {
  return new Date(new Date(iso).getTime() - 3 * 3600_000).toISOString().slice(0, 10)
}

/** Función pura: arma el bloque con las filas ya leídas. */
export function construirOrigenVisitas(
  vistas: { viewed_at: string; referrer: string | null }[],
  aiRefs: { engine: string | null }[],
  fichaPath: string,
  hoyISO: string = new Date().toISOString(),
): OrigenVisitas {
  const hoy = diaAR(hoyISO)
  const dias: string[] = []
  for (let i = 29; i >= 0; i--) {
    dias.push(new Date(Date.parse(hoy + 'T12:00:00Z') - i * 86400_000).toISOString().slice(0, 10))
  }
  const porDiaMap = new Map(dias.map((d) => [d, 0]))
  const origenes = new Map<Origen, number>()
  const secciones = new Map<SeccionSitio, number>()
  const semana = [0, 0, 0, 0, 0, 0, 0]
  let sinDato = 0

  for (const v of vistas) {
    const d = diaAR(v.viewed_at)
    if (porDiaMap.has(d)) porDiaMap.set(d, porDiaMap.get(d)! + 1)
    semana[new Date(d + 'T12:00:00Z').getUTCDay()]++
    const { origen, seccion } = clasificarOrigen(v.referrer, fichaPath)
    if (origen === 'sin_dato') {
      sinDato++
      continue
    }
    origenes.set(origen, (origenes.get(origen) ?? 0) + 1)
    if (seccion) secciones.set(seccion, (secciones.get(seccion) ?? 0) + 1)
  }

  const motores = new Map<string, number>()
  for (const r of aiRefs) {
    if (!esMotorIA(r.engine)) continue
    const m = nombreMotor(r.engine!)
    motores.set(m, (motores.get(m) ?? 0) + 1)
  }

  const total = vistas.length
  const max = Math.max(...semana)
  // Con menos de 14 vistas el "día fuerte" es ruido.
  const diaFuerte = total >= 14 && max > 0 ? semana.indexOf(max) : null

  return {
    porDia: dias.map((dia) => ({ dia, vistas: porDiaMap.get(dia)! })),
    total,
    porOrigen: [...origenes.entries()].map(([origen, n]) => ({ origen, vistas: n })).sort((a, b) => b.vistas - a.vistas),
    porSeccion: [...secciones.entries()].map(([seccion, n]) => ({ seccion, vistas: n })).sort((a, b) => b.vistas - a.vistas),
    sinDato,
    ias: [...motores.entries()].map(([motor, n]) => ({ motor, visitas: n })).sort((a, b) => b.visitas - a.visitas),
    iasTotal: [...motores.values()].reduce((a, b) => a + b, 0),
    diaFuerte,
  }
}
