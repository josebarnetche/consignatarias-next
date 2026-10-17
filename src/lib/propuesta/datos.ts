/**
 * Datos de la propuesta PRO de una firma (/propuesta/<slug>).
 *
 * Regla de esta página: cada cifra sale de una fuente verificable y lleva su período.
 * Si una consulta falla, la cifra vuelve `null` y la página OMITE la línea — nunca
 * pone un cero que no midió ni un número estimado. Un cero medido sí se devuelve
 * (0), y la página lo dice tal cual.
 *
 * Conteos con `head: true` siempre que se puede: PostgREST corta en 1.000 filas sin
 * avisar, y un conteo que se queda en 1.000 es exactamente el tipo de número que una
 * firma después no puede reproducir.
 */
import 'server-only'
import rematesData from '@/lib/data/remates.json'
import type { Auction } from '@/lib/db/schema'
import { getAllProfiles, getAuctionsForProfile, type ConsignatariaProfile } from '@/lib/data/consignataria-slugs'
import { getLogoUrl } from '@/lib/data/logo-map'
import { createServiceClient } from '@/lib/supabase'
import { esMotorIA, nombreMotor } from '@/lib/reports/origen-visitas'
import { getParticipacion } from '@/lib/reports/participacion'
import { hoyArgentina } from '@/lib/remates-en-vivo'

const auctions = rematesData as unknown as Auction[]
const DIA = 86_400_000

/** YYYY-MM-DD de hace `n` días, contado desde hoy en Argentina. */
function fechaHaceDias(hoy: string, n: number): string {
  return new Date(Date.parse(`${hoy}T12:00:00Z`) - n * DIA).toISOString().slice(0, 10)
}

export interface RemateResumen {
  fecha: string
  titulo: string
  lugar: string | null
}

export interface DatosFirma {
  logoUrl: string | null
  proximos: RemateResumen[]
  remates90: number
  /** null = no se pudo medir (se omite la línea). */
  vistas30: number | null
  ia90: { total: number; porMotor: { motor: string; visitas: number }[] } | null
  seguidores: number | null
  consultas90: number | null
  /** Sólo si la firma opera en el Mercado Agroganadero de Cañuelas. */
  mag: { cabezas: number; puesto: number; totalCasas: number; cuota: number } | null
}

export interface DatosSitio {
  firmas: number
  proximosCalendario: number
  /** Visitas desde asistentes de IA al sitio entero. */
  iaMesAnterior: { mes: string; visitas: number } | null
  ia90: number | null
}

/** Etiqueta "septiembre de 2026" del mes calendario anterior y su rango [desde, hasta). */
function mesAnterior(hoy: string): { etiqueta: string; desde: string; hasta: string } {
  const [y, m] = hoy.split('-').map(Number)
  const anioPrev = m === 1 ? y - 1 : y
  const mesPrev = m === 1 ? 12 : m - 1
  const pad = (n: number) => String(n).padStart(2, '0')
  // Bordes en hora argentina (UTC−3): el mes arranca a las 03:00 UTC.
  const desde = `${anioPrev}-${pad(mesPrev)}-01T03:00:00Z`
  const hasta = `${y}-${pad(m)}-01T03:00:00Z`
  const etiqueta = new Date(Date.UTC(anioPrev, mesPrev - 1, 15)).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return { etiqueta, desde, hasta }
}

export async function getDatosFirma(profile: ConsignatariaProfile): Promise<DatosFirma> {
  const slug = profile.canonicalSlug
  const hoy = hoyArgentina()
  const desde90 = fechaHaceDias(hoy, 90)

  // Calendario: los remates de la firma (todas sus variantes de slug, sin duplicados
  // de fuente) tal como los publica el sitio.
  const propios = getAuctionsForProfile(auctions, slug)
  const proximos = propios
    .filter((a) => a.date >= hoy)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((a) => ({ fecha: a.date, titulo: a.title, lugar: a.location ?? null }))
  const remates90 = propios.filter((a) => a.date >= desde90 && a.date < hoy).length

  const db = createServiceClient()
  const base: DatosFirma = {
    logoUrl: getLogoUrl(slug),
    proximos,
    remates90,
    vistas30: null,
    ia90: null,
    seguidores: null,
    consultas90: null,
    mag: null,
  }
  if (!db) return base

  const hace30 = new Date(Date.now() - 30 * DIA).toISOString()
  const hace90 = new Date(Date.now() - 90 * DIA).toISOString()
  const fichaPath = `/consignatarias/${slug}`
  // Vistas, seguidores y consultas se guardan con el slug que tenía la URL: se suman
  // todas las variantes de la firma para no perder las que entraron por un alias.
  const slugs = [...new Set([slug, ...profile.allSlugs])]

  const [logo, vistas, ia, seguidores, consultas, mag] = await Promise.all([
    (async () => {
      try {
        const { data } = await db.from('consignatarias').select('logo_url').eq('canonical_slug', slug).maybeSingle()
        return data?.logo_url ?? null
      } catch {
        return null
      }
    })(),
    (async () => {
      try {
        const { count, error } = await db
          .from('profile_views')
          .select('*', { count: 'exact', head: true })
          .eq('entity_type', 'consignataria')
          .in('entity_slug', slugs)
          .gte('viewed_at', hace30)
        return error ? null : (count ?? 0)
      } catch {
        return null
      }
    })(),
    (async () => {
      try {
        const { data, error } = await db
          .from('ai_referrals')
          .select('engine, path')
          .gte('created_at', hace90)
          .like('path', `${fichaPath}%`)
          .limit(5000)
        if (error) return null
        // El LIKE deja pasar /consignatarias/<slug>-otra: se filtra la ruta exacta,
        // y `bing-organico` vive en la misma tabla pero es búsqueda, no una IA.
        const filas = (data ?? []).filter((r) => {
          const p = (r.path ?? '').split(/[?#]/)[0].replace(/\/+$/, '')
          return esMotorIA(r.engine) && (p === fichaPath || p.startsWith(fichaPath + '/'))
        })
        const porMotor = new Map<string, number>()
        for (const r of filas) {
          const m = nombreMotor(r.engine)
          porMotor.set(m, (porMotor.get(m) ?? 0) + 1)
        }
        return {
          total: filas.length,
          porMotor: [...porMotor.entries()].map(([motor, visitas]) => ({ motor, visitas })).sort((a, b) => b.visitas - a.visitas),
        }
      } catch {
        return null
      }
    })(),
    (async () => {
      try {
        const { count, error } = await db
          .from('user_favorites')
          .select('*', { count: 'exact', head: true })
          .in('consignataria_slug', slugs)
        return error ? null : (count ?? 0)
      } catch {
        return null
      }
    })(),
    (async () => {
      try {
        const { count, error } = await db
          .from('consignataria_leads')
          .select('*', { count: 'exact', head: true })
          .in('consignataria_slug', slugs)
          .gte('created_at', hace90)
        return error ? null : (count ?? 0)
      } catch {
        return null
      }
    })(),
    (async () => {
      try {
        // getParticipacion devuelve null si la firma no opera en el MAG.
        const p = await getParticipacion(db, slug, 30)
        if (!p || p.cabezas <= 0 || p.puesto <= 0) return null
        // Sólo el agregado propio: el ranking trae nombres de otras casas y no se publica.
        return { cabezas: p.cabezas, puesto: p.puesto, totalCasas: p.totalCasas, cuota: p.cuota }
      } catch {
        return null
      }
    })(),
  ])

  return {
    ...base,
    logoUrl: logo || base.logoUrl,
    vistas30: vistas,
    ia90: ia,
    seguidores,
    consultas90: consultas,
    mag,
  }
}

export async function getDatosSitio(): Promise<DatosSitio> {
  const hoy = hoyArgentina()
  const out: DatosSitio = {
    firmas: getAllProfiles().length,
    proximosCalendario: auctions.filter((a) => a.date >= hoy).length,
    iaMesAnterior: null,
    ia90: null,
  }
  const db = createServiceClient()
  if (!db) return out

  const mes = mesAnterior(hoy)
  const hace90 = new Date(Date.now() - 90 * DIA).toISOString()
  const [mesCount, ia90] = await Promise.all([
    (async () => {
      try {
        const { count, error } = await db
          .from('ai_referrals')
          .select('*', { count: 'exact', head: true })
          .neq('engine', 'bing-organico')
          .gte('created_at', mes.desde)
          .lt('created_at', mes.hasta)
        return error ? null : (count ?? 0)
      } catch {
        return null
      }
    })(),
    (async () => {
      try {
        const { count, error } = await db
          .from('ai_referrals')
          .select('*', { count: 'exact', head: true })
          .neq('engine', 'bing-organico')
          .gte('created_at', hace90)
        return error ? null : (count ?? 0)
      } catch {
        return null
      }
    })(),
  ])
  out.iaMesAnterior = mesCount === null ? null : { mes: mes.etiqueta, visitas: mesCount }
  out.ia90 = ia90
  return out
}
