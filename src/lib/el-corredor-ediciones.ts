/**
 * El Corredor — archivo de ediciones para la web (/el-corredor y /el-corredor/[edicion]).
 *
 * Lógica pura: recibe el manifest (public/el-corredor/manifest.json) y el respaldo de
 * hechos transcriptos (src/lib/data/el-corredor-hechos.json) y devuelve una lista de
 * ediciones lista para pintar. No lee archivos: quien llama pasa `existe(ruta)` para
 * confirmar que la tapa o la imagen OG de una edición vieja están en /public.
 *
 * ⚠️ Esto es para PÁGINAS (se reconstruyen en cada deploy, y cada edición nueva es un
 * commit → deploy). Lo que decide QUÉ edición se ENVÍA por mail sigue leyendo el
 * manifest en el request (`loadCorredorManifest`), nunca esto.
 *
 * FORMATO QUE ESPERAMOS DEL MANIFEST (todo lo nuevo es opcional; publish.py lo puede
 * ir sumando sin romper nada). Va tanto en `current` como en cada ítem de `history`:
 *
 *   "hechos":  ["texto plano del hecho 1", …]          // los 5 de la pág. 2 del PDF
 *   "faltantes": ["SIO Carnes"]                         // lo que la edición no pudo medir
 *   "cita":    "texto de la cita, si se quiere fijar"    // si falta, se arma acá
 *   "piezas": [
 *     { "tipo": "ig",     "ruta": "/el-corredor/ig-octubre-2026-1.png",     "titulo": "4 números del mes" },
 *     { "tipo": "estado", "ruta": "/el-corredor/estado-octubre-2026-1.png", "titulo": "Semáforo",
 *       "texto": "línea opcional que acompaña la pieza al compartirla" }
 *   ]
 *   // tipo 'ig' = 1080×1350 (feed), 'estado' = 1080×1920 (estado de WhatsApp / historia).
 *   // ruta: absoluta del sitio (empieza con /el-corredor/) o URL https.
 */

export const SITE = 'https://www.consignatarias.com.ar'

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const

export type TipoPieza = 'ig' | 'estado'

export interface Pieza {
  tipo: TipoPieza
  ruta: string
  titulo: string
  texto?: string
}

/** Lo que puede venir en un ítem del manifest (current o history). Todo lo nuevo es opcional. */
export interface ManifestItem {
  ym: string
  edition_label?: string
  edition_short?: string
  month_slug?: string
  pdf_path: string
  cover_path?: string
  og_path?: string
  published_at?: string
  hechos?: unknown
  faltantes?: unknown
  cita?: unknown
  piezas?: unknown
}

export interface ManifestCorredor {
  current: ManifestItem
  history?: ManifestItem[]
}

export interface RespaldoHechos {
  ediciones: Record<string, { hechos?: string[]; faltantes?: string[] }>
}

export interface Edicion {
  ym: string
  slug: string
  /** "Octubre 2026" */
  titulo: string
  /** "10/2026" — numeración del manual de marca (Edición MM/AAAA). */
  numero: string
  path: string
  url: string
  pdfPath: string
  coverPath: string | null
  ogPath: string | null
  publicadaEl: string | null
  hechos: string[]
  faltantes: string[]
  piezas: Pieza[]
  cita: string
  esVigente: boolean
}

const YM_RE = /^(\d{4})-(0[1-9]|1[0-2])$/

/** "2026-10" → "octubre-2026". Devuelve null si el ym no es válido. */
export function slugDeYm(ym: string): string | null {
  const m = YM_RE.exec(ym)
  if (!m) return null
  return `${MESES[Number(m[2]) - 1]}-${m[1]}`
}

/** "octubre-2026" → "2026-10". Devuelve null si el slug no es una edición posible. */
export function ymDeSlug(slug: string): string | null {
  const m = /^([a-z]+)-(\d{4})$/.exec(slug)
  if (!m) return null
  const i = (MESES as readonly string[]).indexOf(m[1])
  if (i < 0) return null
  return `${m[2]}-${String(i + 1).padStart(2, '0')}`
}

function tituloDeYm(ym: string): string {
  const [y, mm] = ym.split('-')
  const mes = MESES[Number(mm) - 1]
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${y}`
}

/**
 * Texto de un hecho, limpio para HTML y para compartir: sin etiquetas (el generador
 * los escribe con <span class="fuerte">), sin espacios dobles y sin el doble signo
 * que dejaba la plantilla ("bajó -1,1%" → "bajó 1,1%", "+0,8% pp" → "+0,8 pp").
 */
export function limpiarHecho(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/\b(subió|ganó)\s+\+/g, '$1 ')
    .replace(/\b(bajó|perdió)\s+-/g, '$1 ')
    .replace(/([+-]?\d+(?:,\d+)?)%\s*pp\b/g, '$1 pp')
    .trim()
}

function listaDeTextos(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map(limpiarHecho)
}

/** Valida las piezas del manifest: descarta lo que no tenga tipo conocido, ruta segura o título. */
export function normalizarPiezas(raw: unknown): Pieza[] {
  if (!Array.isArray(raw)) return []
  const out: Pieza[] = []
  for (const p of raw) {
    if (!p || typeof p !== 'object') continue
    const { tipo, ruta, titulo, texto } = p as Record<string, unknown>
    if (tipo !== 'ig' && tipo !== 'estado') continue
    if (typeof ruta !== 'string' || typeof titulo !== 'string' || !titulo.trim()) continue
    const rutaOk = (ruta.startsWith('/el-corredor/') && !ruta.includes('..')) || ruta.startsWith('https://')
    if (!rutaOk) continue
    out.push({
      tipo,
      ruta,
      titulo: titulo.trim(),
      ...(typeof texto === 'string' && texto.trim() ? { texto: texto.trim() } : {}),
    })
  }
  return out
}

/** URL absoluta de una ruta del sitio (o la URL tal cual si ya es absoluta). */
export function absoluta(ruta: string): string {
  return ruta.startsWith('http') ? ruta : `${SITE}${ruta}`
}

/** La cita lista para copiar. La atribución es la condición de uso de los datos. */
export function citaDeEdicion(e: Pick<Edicion, 'titulo' | 'numero' | 'url'>): string {
  return `El Corredor, edición ${e.numero} (${e.titulo}). Mesa de mercado de consignatarias.com.ar. ${e.url}`
}

/**
 * Arma el archivo de ediciones, de la más nueva a la más vieja.
 * `current` completa los campos que `history` no trae (tapa, OG); los hechos salen
 * del manifest y, si no están, del respaldo transcripto.
 */
export function listarEdiciones(
  manifest: ManifestCorredor,
  respaldo: RespaldoHechos = { ediciones: {} },
  existe: (rutaPublica: string) => boolean = () => true,
): Edicion[] {
  const porYm = new Map<string, ManifestItem>()
  for (const h of manifest.history ?? []) {
    if (h && typeof h.ym === 'string' && YM_RE.test(h.ym)) porYm.set(h.ym, { ...h })
  }
  const cur = manifest.current
  if (cur && YM_RE.test(cur.ym)) porYm.set(cur.ym, { ...porYm.get(cur.ym), ...cur })

  const ediciones: Edicion[] = []
  for (const [ym, it] of porYm) {
    const slug = slugDeYm(ym)!
    if (typeof it.pdf_path !== 'string' || !it.pdf_path.startsWith('/el-corredor/')) continue
    const coverDerivada = `/el-corredor/cover-${slug}.png`
    const ogDerivada = `/el-corredor/og-${slug}.png`
    const cover = it.cover_path ?? (existe(coverDerivada) ? coverDerivada : null)
    const og = it.og_path ?? (existe(ogDerivada) ? ogDerivada : null)
    const [y, mm] = ym.split('-')
    const path = `/el-corredor/${slug}`
    const hechosManifest = listaDeTextos(it.hechos)
    const extra = respaldo.ediciones[ym]
    const base = {
      ym,
      slug,
      titulo: tituloDeYm(ym),
      numero: `${mm}/${y}`,
      path,
      url: `${SITE}${path}`,
    }
    ediciones.push({
      ...base,
      pdfPath: it.pdf_path,
      coverPath: cover,
      ogPath: og,
      publicadaEl: typeof it.published_at === 'string' ? it.published_at : null,
      hechos: hechosManifest.length ? hechosManifest : listaDeTextos(extra?.hechos),
      faltantes: (() => {
        const f = listaDeTextos(it.faltantes)
        return f.length ? f : listaDeTextos(extra?.faltantes)
      })(),
      piezas: normalizarPiezas(it.piezas),
      cita: typeof it.cita === 'string' && it.cita.trim() ? it.cita.trim() : citaDeEdicion(base),
      esVigente: ym === cur?.ym,
    })
  }
  return ediciones.sort((a, b) => (a.ym < b.ym ? 1 : -1))
}

/** Anterior (más vieja) y siguiente (más nueva) de una edición, para navegar el archivo. */
export function vecinas(ediciones: Edicion[], ym: string): { anterior: Edicion | null; siguiente: Edicion | null } {
  const i = ediciones.findIndex((e) => e.ym === ym)
  if (i < 0) return { anterior: null, siguiente: null }
  return { anterior: ediciones[i + 1] ?? null, siguiente: ediciones[i - 1] ?? null }
}

/** Mensaje de WhatsApp de una edición: el primer hecho + el link. El dato viaja con su origen. */
export function mensajeWhatsApp(e: Pick<Edicion, 'titulo' | 'hechos' | 'url'>, pieza?: Pieza): string {
  const titulo = `El Corredor · ${e.titulo}`
  const linea = pieza?.texto ?? pieza?.titulo ?? e.hechos[0]
  return [titulo, linea, e.url].filter(Boolean).join('\n\n')
}

/** Recorta un texto en el último espacio antes de `max` caracteres y agrega "…". */
export function recortar(s: string, max: number): string {
  if (s.length <= max) return s
  const corte = s.lastIndexOf(' ', max - 1)
  return `${s.slice(0, corte > 0 ? corte : max - 1).replace(/[\s,.:;]+$/, '')}…`
}

/** Fecha de publicación legible ("1 de noviembre de 2026"), en hora argentina. */
export function fechaLarga(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const art = new Date(d.getTime() - 3 * 3600 * 1000)
  return `${art.getUTCDate()} de ${MESES[art.getUTCMonth()]} de ${art.getUTCFullYear()}`
}
