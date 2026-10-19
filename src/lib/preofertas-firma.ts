import type { ServiceClient } from '@/lib/supabase'
import { getProfile } from '@/lib/data/consignataria-slugs'
import { preofertaAbierta, type EstadoPreoferta } from '@/lib/validators/preoferta-firma'

/**
 * Pre-ofertas que carga y opera la FIRMA desde su panel (17-10-2026).
 *
 * Convive con el registro estático de `lib/data/preofertas.ts` (El Tigre), que queda
 * intacto: aquel es un remate de cabaña con pedigree y espejo de elrural; esto es la
 * versión que cualquier consignataria PRO arma sola — remate, lotes con video y las
 * ofertas que le dejan los interesados antes del martillo.
 *
 * Todas las lecturas reciben el service client: las tablas tienen RLS sin políticas
 * públicas, así que el filtro "solo lo publicado" vive acá y no en la base.
 */

export interface LoteFirma {
  id: string
  orden: number
  titulo: string
  categoria: string | null
  cabezas: number | null
  peso_kg: number | null
  video_url: string | null
  descripcion: string | null
  precio_base: number | null
}

export interface PreofertaFirma {
  id: string
  consignataria_slug: string
  titulo: string
  fecha_remate: string
  lugar: string | null
  cierre: string
  condiciones: string | null
  estado: EstadoPreoferta
  /** Remate del panel al que pertenece ("AAAA-MM-DD|LOCALIDAD"), si se creó desde uno. */
  remate_clave?: string | null
  created_at: string
  updated_at: string
  lotes: LoteFirma[]
}

/** Lo que la firma ve de cada oferta. Solo sale hacia el dueño: nunca a una página pública. */
export interface OfertaRecibida {
  id: string
  preoferta_id: string
  lote_id: string | null
  lote_titulo: string | null
  nombre: string | null
  telefono: string | null
  email: string | null
  monto: number | null
  mensaje: string | null
  fecha: string
}

/** Versión pública: con el nombre de la firma para mostrar. */
export interface PreofertaFirmaPublica extends PreofertaFirma {
  consignataria_nombre: string
}

const COLUMNAS_PREOFERTA = 'id, consignataria_slug, titulo, fecha_remate, lugar, cierre, condiciones, estado, remate_clave, created_at, updated_at'
const COLUMNAS_LOTE = 'id, preoferta_id, orden, titulo, categoria, cabezas, peso_kg, video_url, descripcion, precio_base'

type FilaPreoferta = Omit<PreofertaFirma, 'lotes' | 'estado'> & { estado: string }
type FilaLote = LoteFirma & { preoferta_id: string }

/** Ordena los lotes por `orden` y, a igual orden, por título (estable entre cargas). */
export function ordenarLotes<T extends { orden: number; titulo: string }>(lotes: T[]): T[] {
  return [...lotes].sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo, 'es'))
}

/** Arma las pre-ofertas con sus lotes. Puro: lo prueba el test sin base. */
export function armarPreofertas(filas: FilaPreoferta[], lotes: FilaLote[]): PreofertaFirma[] {
  const porPreoferta = new Map<string, LoteFirma[]>()
  for (const l of lotes) {
    const { preoferta_id, ...lote } = l
    const lista = porPreoferta.get(preoferta_id) ?? []
    lista.push({ ...lote, precio_base: lote.precio_base == null ? null : Number(lote.precio_base) })
    porPreoferta.set(preoferta_id, lista)
  }
  return filas.map((p) => ({
    ...p,
    estado: p.estado as EstadoPreoferta,
    lotes: ordenarLotes(porPreoferta.get(p.id) ?? []),
  }))
}

/** Nombre público de la firma: el del directorio canónico, o el slug si no figura. */
export function nombreFirma(slug: string): string {
  return getProfile(slug)?.displayName ?? slug
}

async function lotesDe(db: ServiceClient, ids: string[]): Promise<FilaLote[]> {
  if (ids.length === 0) return []
  const { data } = await db.from('preofertas_firma_lotes').select(COLUMNAS_LOTE).in('preoferta_id', ids)
  return (data ?? []) as FilaLote[]
}

/** Todas las pre-ofertas de una firma (cualquier estado), la más reciente primero. Para el panel. */
export async function getPreofertasDeFirma(db: ServiceClient, slug: string): Promise<PreofertaFirma[]> {
  const { data, error } = await db
    .from('preofertas_firma')
    .select(COLUMNAS_PREOFERTA)
    .eq('consignataria_slug', slug)
    .order('fecha_remate', { ascending: false })
  if (error || !data) return []
  const filas = data as FilaPreoferta[]
  return armarPreofertas(filas, await lotesDe(db, filas.map((p) => p.id)))
}

/** Una pre-oferta de la firma (cualquier estado), para las rutas del dueño. */
export async function getPreofertaDeFirma(db: ServiceClient, slug: string, id: string): Promise<PreofertaFirma | null> {
  const { data } = await db
    .from('preofertas_firma')
    .select(COLUMNAS_PREOFERTA)
    .eq('id', id)
    .eq('consignataria_slug', slug)
    .maybeSingle()
  if (!data) return null
  return armarPreofertas([data as FilaPreoferta], await lotesDe(db, [id]))[0]
}

/**
 * Las ofertas que recibió la firma, en todas sus pre-ofertas, la más nueva primero.
 * Trae el contacto del interesado: SOLO para el panel del dueño.
 */
export async function getOfertasDeFirma(db: ServiceClient, slug: string): Promise<OfertaRecibida[]> {
  const preofertas = await getPreofertasDeFirma(db, slug)
  if (preofertas.length === 0) return []
  const tituloLote = new Map<string, string>()
  for (const p of preofertas) for (const l of p.lotes) tituloLote.set(l.id, l.titulo)

  const { data } = await db
    .from('preoferta_bids')
    .select('id, preoferta_firma_id, lote_firma_id, bidder_name, bidder_phone, bidder_email, amount, mensaje, created_at')
    .in('preoferta_firma_id', preofertas.map((p) => p.id))
    .order('created_at', { ascending: false })
    .limit(1000)
  return (data ?? []).map((b) => ({
    id: b.id,
    preoferta_id: b.preoferta_firma_id ?? '',
    lote_id: b.lote_firma_id,
    lote_titulo: b.lote_firma_id ? tituloLote.get(b.lote_firma_id) ?? null : null,
    nombre: b.bidder_name,
    telefono: b.bidder_phone,
    email: b.bidder_email,
    monto: b.amount == null ? null : Number(b.amount),
    mensaje: b.mensaje,
    fecha: b.created_at,
  }))
}

/**
 * Pre-ofertas de todas las firmas que reciben ofertas AHORA (publicadas y antes del
 * cierre). Para /preofertas y el sitemap. Sin service client (build) devuelve [].
 */
export async function getPreofertasFirmaAbiertas(db: ServiceClient | null, nowMs: number): Promise<PreofertaFirmaPublica[]> {
  if (!db) return []
  const { data, error } = await db
    .from('preofertas_firma')
    .select(COLUMNAS_PREOFERTA)
    .eq('estado', 'publicada')
    .gt('cierre', new Date(nowMs).toISOString())
    .order('cierre', { ascending: true })
  if (error || !data) return []
  const filas = data as FilaPreoferta[]
  return armarPreofertas(filas, await lotesDe(db, filas.map((p) => p.id)))
    .filter((p) => preofertaAbierta(p, nowMs) && p.lotes.length > 0)
    .map((p) => ({ ...p, consignataria_nombre: nombreFirma(p.consignataria_slug) }))
}

/**
 * Una pre-oferta para su página pública: publicada o cerrada (la cerrada queda visible
 * como registro, con noindex y sin formulario). El borrador no existe para el público.
 */
export async function getPreofertaFirmaPublica(db: ServiceClient | null, id: string): Promise<PreofertaFirmaPublica | null> {
  if (!db || !/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data } = await db
    .from('preofertas_firma')
    .select(COLUMNAS_PREOFERTA)
    .eq('id', id)
    .in('estado', ['publicada', 'cerrada'])
    .maybeSingle()
  if (!data) return null
  const [p] = armarPreofertas([data as FilaPreoferta], await lotesDe(db, [id]))
  return { ...p, consignataria_nombre: nombreFirma(p.consignataria_slug) }
}

/** URL pública de la ficha. Una sola definición para página, sitemap, mail y panel. */
export function urlPreofertaFirma(id: string): string {
  return `/preofertas/f/${id}`
}
