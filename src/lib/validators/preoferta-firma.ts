import { z } from 'zod'

/**
 * Validación de la pre-oferta que opera la FIRMA (17-10-2026).
 *
 * Archivo puro (sin servidor ni base): lo usan las rutas del API, el panel del dueño y
 * el formulario público, así la regla es una sola. Los mensajes van en castellano
 * rioplatense porque llegan tal cual a la pantalla.
 */

export const ESTADOS_PREOFERTA = ['borrador', 'publicada', 'cerrada'] as const
export type EstadoPreoferta = (typeof ESTADOS_PREOFERTA)[number]

/* ------------------------------------------------------------------ */
/*  VIDEO                                                              */
/* ------------------------------------------------------------------ */

/**
 * Hosts aceptados para el video del lote. Lista cerrada a propósito: el video se
 * incrusta (YouTube/Vimeo) o se enlaza (Drive) en una página pública con nuestra marca,
 * así que un host arbitrario sería un enlace a cualquier cosa con nuestro sello encima.
 */
const HOSTS_VIDEO: Record<string, 'youtube' | 'vimeo' | 'drive'> = {
  'youtube.com': 'youtube',
  'www.youtube.com': 'youtube',
  'm.youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'vimeo.com': 'vimeo',
  'www.vimeo.com': 'vimeo',
  'player.vimeo.com': 'vimeo',
  'drive.google.com': 'drive',
}

export type VideoLote =
  | { tipo: 'youtube'; embed: string; href: string }
  | { tipo: 'vimeo'; embed: string; href: string }
  | { tipo: 'drive'; href: string }

function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw.trim())
  } catch {
    return null
  }
}

/** true si la URL es https y de un host de video aceptado. */
export function esVideoPermitido(raw: string): boolean {
  const u = parseUrl(raw)
  return !!u && u.protocol === 'https:' && u.hostname.toLowerCase() in HOSTS_VIDEO
}

/**
 * Cómo se muestra el video: YouTube y Vimeo se incrustan (sin cookies en YouTube);
 * Drive va como enlace porque su reproductor incrustado pide permisos del archivo y
 * en la mitad de los casos muestra "solicitar acceso". Si de YouTube/Vimeo no sale
 * un id, cae a enlace en vez de romper el iframe.
 */
export function videoDelLote(raw: string | null | undefined): VideoLote | null {
  if (!raw || !esVideoPermitido(raw)) return null
  const u = parseUrl(raw)!
  const href = u.toString()
  const tipo = HOSTS_VIDEO[u.hostname.toLowerCase()]
  if (tipo === 'youtube') {
    const m = href.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/live\/|\/shorts\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/)
    if (!m) return { tipo: 'drive', href }
    return { tipo: 'youtube', embed: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1&playsinline=1`, href }
  }
  if (tipo === 'vimeo') {
    const m = u.pathname.match(/\/(?:video\/)?(\d{5,})/)
    if (!m) return { tipo: 'drive', href }
    return { tipo: 'vimeo', embed: `https://player.vimeo.com/video/${m[1]}`, href }
  }
  return { tipo: 'drive', href }
}

/* ------------------------------------------------------------------ */
/*  HELPERS DE SCHEMA                                                  */
/* ------------------------------------------------------------------ */

/** Los formularios mandan '' para "vacío": se normaliza a null antes de validar. */
const vacioANull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v)
const textoOpcional = (max: number) =>
  z.preprocess(vacioANull, z.string().trim().max(max, `Máximo ${max} caracteres`).nullable().optional())
const enteroOpcional = (min: number, max: number, campo: string) =>
  z.preprocess(
    (v) => {
      if (vacioANull(v) == null) return null
      if (typeof v !== 'string') return v
      const s = v.trim()
      // "1.500.000" (punto de miles, como se escribe acá) → 1500000. Un "450.5" NO es
      // separador de miles: queda decimal y lo rechaza el .int().
      return Number(/^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s)
    },
    z.number({ error: `${campo}: tiene que ser un número` })
      .int(`${campo}: sin decimales`)
      .min(min, `${campo}: mínimo ${min}`)
      .max(max, `${campo}: máximo ${max.toLocaleString('es-AR')}`)
      .nullable()
      .optional(),
  )

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/

/** Fin del día del remate en hora argentina (UTC−3, sin horario de verano desde 2009). */
export function finDelDiaRemate(fecha: string): number {
  return new Date(`${fecha}T23:59:59-03:00`).getTime()
}

/** ISO (timestamptz) → valor de <input type="datetime-local"> en hora argentina (UTC−3). */
export function isoALocalAr(iso: string): string {
  return new Date(Date.parse(iso) - 3 * 3600_000).toISOString().slice(0, 16)
}

/** Valor de <input type="datetime-local"> (hora argentina) → ISO con offset explícito. */
export function localArAIso(local: string): string {
  return local ? `${local}:00-03:00` : ''
}

/* ------------------------------------------------------------------ */
/*  PRE-OFERTA (el remate)                                              */
/* ------------------------------------------------------------------ */

const camposPreoferta = {
  titulo: z.string().trim().min(3, 'Poné el nombre del remate').max(160, 'Máximo 160 caracteres'),
  fecha_remate: z.string().regex(FECHA_RE, 'Fecha del remate inválida'),
  lugar: textoOpcional(160),
  cierre: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha de cierre inválida'),
  condiciones: textoOpcional(4000),
}

export const preofertaCrearSchema = z
  .object(camposPreoferta)
  .refine((d) => Date.parse(d.cierre) <= finDelDiaRemate(d.fecha_remate), {
    message: 'El cierre de las ofertas tiene que ser antes del remate (o el mismo día)',
    path: ['cierre'],
  })

export const preofertaActualizarSchema = z
  .object({
    ...camposPreoferta,
    estado: z.enum(ESTADOS_PREOFERTA),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Nada para actualizar')

export type PreofertaCrearInput = z.infer<typeof preofertaCrearSchema>
export type PreofertaActualizarInput = z.infer<typeof preofertaActualizarSchema>

/* ------------------------------------------------------------------ */
/*  LOTE                                                               */
/* ------------------------------------------------------------------ */

const camposLote = {
  titulo: z.string().trim().min(2, 'Poné un título al lote').max(160, 'Máximo 160 caracteres'),
  categoria: textoOpcional(60),
  cabezas: enteroOpcional(1, 100_000, 'Cabezas'),
  peso_kg: enteroOpcional(1, 2_000, 'Peso'),
  video_url: z.preprocess(
    vacioANull,
    z
      .string()
      .trim()
      .max(500)
      .refine(esVideoPermitido, 'El video tiene que ser un enlace https de YouTube, Vimeo o Google Drive')
      .nullable()
      .optional(),
  ),
  descripcion: textoOpcional(2000),
  precio_base: enteroOpcional(1, 1_000_000_000_000, 'Precio base'),
  orden: z.number().int().min(0).max(10_000).optional(),
}

export const loteCrearSchema = z.object(camposLote)
export const loteActualizarSchema = z
  .object(camposLote)
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Nada para actualizar')

export type LoteCrearInput = z.infer<typeof loteCrearSchema>

/* ------------------------------------------------------------------ */
/*  OFERTA (formulario público)                                         */
/* ------------------------------------------------------------------ */

export const ofertaFirmaSchema = z
  .object({
    preoferta_id: z.uuid('Pre-oferta inválida'),
    lote_id: z.uuid('Lote inválido'),
    nombre: z.string().trim().min(3, 'Ingresá tu nombre y apellido (o razón social)').max(120),
    telefono: textoOpcional(40),
    email: z.preprocess(vacioANull, z.string().trim().toLowerCase().email('Email inválido').max(160).nullable().optional()),
    monto: enteroOpcional(1, 1_000_000_000_000, 'Monto'),
    mensaje: textoOpcional(1000),
  })
  .refine((d) => (d.telefono ? d.telefono.replace(/\D/g, '').length >= 8 : false) || !!d.email, {
    message: 'Dejá un teléfono o un email para que la consignataria te contacte',
    path: ['telefono'],
  })

export type OfertaFirmaInput = z.infer<typeof ofertaFirmaSchema>

/**
 * ¿Recibe ofertas? Publicada y antes del cierre. Una sola definición para la página,
 * el sitemap y el API — si una dice "abierta" y otra no, se ofrece un formulario que
 * después rechaza.
 */
export function preofertaAbierta(p: { estado: string; cierre: string }, nowMs: number): boolean {
  return p.estado === 'publicada' && nowMs < Date.parse(p.cierre)
}
