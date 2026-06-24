/**
 * Shared "EN VIVO" model for /admin/overview + /api/admin/live.
 *
 * First-party only: reads the `profile_views` table (cada fila = un usuario
 * viendo un perfil). No GA4 server-side. Resolves the human display name from
 * the slug cuando es barato (curated registry), si no muestra el slug.
 *
 * Soft-fails to empty/zero everywhere — el panel nunca rompe por un error de
 * lectura.
 */

import { createServiceClient } from '@/lib/supabase'
import { getProfile, consignatariaProfilePath } from '@/lib/data/consignataria-slugs'

export type EntityType = 'consignataria' | 'frigorifico'

export interface LiveView {
  type: EntityType
  slug: string
  name: string
  href: string
  viewedAt: string
  referrerHost: string | null
  device: 'Mobile' | 'Desktop'
}

export interface TopProfile {
  type: EntityType
  slug: string
  name: string
  href: string
  count: number
}

export interface LiveCounts {
  v5m: number
  v1h: number
  v24h: number
}

export interface LivePayload {
  counts: LiveCounts
  recent: LiveView[]
  topProfiles: TopProfile[]
}

interface RawView {
  entity_type: string
  entity_slug: string
  viewed_at: string
  referrer: string | null
  user_agent: string | null
}

/* ------------------------------------------------------------------ */
/*  PARSERS — soft-fail siempre                                        */
/* ------------------------------------------------------------------ */

/** Host del referrer (sin www.). Null si no parsea o no hay referrer. */
export function referrerHost(referrer: string | null): string | null {
  if (!referrer) return null
  try {
    return new URL(referrer).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/** Heurística simple Mobile/Desktop desde el user_agent. */
export function deviceFromUA(ua: string | null): 'Mobile' | 'Desktop' {
  if (!ua) return 'Desktop'
  return /Mobi|Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(ua)
    ? 'Mobile'
    : 'Desktop'
}

/** Resuelve nombre + link de la ficha desde (type, slug). */
export function resolveEntity(type: EntityType, slug: string): { name: string; href: string } {
  if (type === 'consignataria') {
    const profile = getProfile(slug)
    return {
      name: profile?.displayName ?? slug,
      href: consignatariaProfilePath(slug),
    }
  }
  // Frigorífico: no hay registry curado barato → mostramos el slug humanizado.
  const name = slug
    .split('-')
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
  return { name, href: `/frigorificos/${slug}` }
}

function normalizeType(t: string): EntityType {
  return t === 'frigorifico' ? 'frigorifico' : 'consignataria'
}

/* ------------------------------------------------------------------ */
/*  FETCH                                                              */
/* ------------------------------------------------------------------ */

/**
 * Lee profile_views: últimas ~30 vistas + agregados de la ventana 24h
 * (counts 5m/1h/24h + top perfiles 24h). Una sola query a 24h y todo
 * se computa en memoria → barato y consistente.
 */
export async function getLivePayload(recentLimit = 30): Promise<LivePayload> {
  const empty: LivePayload = {
    counts: { v5m: 0, v1h: 0, v24h: 0 },
    recent: [],
    topProfiles: [],
  }

  const supabase = createServiceClient()
  if (!supabase) return empty

  const now = Date.now()
  const since24h = new Date(now - 24 * 3_600_000).toISOString()

  const { data, error } = await supabase
    .from('profile_views')
    .select('entity_type, entity_slug, viewed_at, referrer, user_agent')
    .gte('viewed_at', since24h)
    .order('viewed_at', { ascending: false })
    .limit(5000)

  if (error || !data) return empty

  const rows = data as RawView[]
  const t5m = now - 5 * 60_000
  const t1h = now - 60 * 60_000

  let v5m = 0
  let v1h = 0
  const counts = new Map<string, { type: EntityType; slug: string; count: number }>()

  for (const r of rows) {
    const ms = new Date(r.viewed_at).getTime()
    if (ms >= t5m) v5m++
    if (ms >= t1h) v1h++
    const type = normalizeType(r.entity_type)
    const key = `${type}:${r.entity_slug}`
    const cur = counts.get(key)
    if (cur) cur.count++
    else counts.set(key, { type, slug: r.entity_slug, count: 1 })
  }

  const recent: LiveView[] = rows.slice(0, recentLimit).map((r) => {
    const type = normalizeType(r.entity_type)
    const { name, href } = resolveEntity(type, r.entity_slug)
    return {
      type,
      slug: r.entity_slug,
      name,
      href,
      viewedAt: r.viewed_at,
      referrerHost: referrerHost(r.referrer),
      device: deviceFromUA(r.user_agent),
    }
  })

  const topProfiles: TopProfile[] = Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((c) => {
      const { name, href } = resolveEntity(c.type, c.slug)
      return { type: c.type, slug: c.slug, name, href, count: c.count }
    })

  return {
    counts: { v5m, v1h, v24h: rows.length },
    recent,
    topProfiles,
  }
}

/** Vistas por hora de las últimas 24h (24 buckets, índice 0 = hace 23h). */
export async function getViewsByHour(): Promise<number[]> {
  const supabase = createServiceClient()
  const buckets = new Array(24).fill(0) as number[]
  if (!supabase) return buckets

  const now = Date.now()
  const since24h = new Date(now - 24 * 3_600_000).toISOString()
  const { data, error } = await supabase
    .from('profile_views')
    .select('viewed_at')
    .gte('viewed_at', since24h)
    .limit(20000)

  if (error || !data) return buckets

  for (const r of data as { viewed_at: string }[]) {
    const ageH = (now - new Date(r.viewed_at).getTime()) / 3_600_000
    const idx = 23 - Math.floor(ageH)
    if (idx >= 0 && idx < 24) buckets[idx]++
  }
  return buckets
}
