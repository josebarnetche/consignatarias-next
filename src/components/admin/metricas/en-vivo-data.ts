import 'server-only'
import { createServiceClient } from '@/lib/supabase'
import {
  deviceFromUA,
  referrerHost,
  resolveEntity,
  type EntityType,
  type LivePayload,
  type LiveView,
  type TopProfile,
} from '@/lib/admin/live'

/**
 * Datos de /admin/overview ("En vivo") en UNA sola lectura de profile_views
 * (antes: getLivePayload + getViewsByHour = dos lecturas de la misma ventana).
 *
 * Devuelve el mismo `LivePayload` que GET /api/admin/live (para que el feed
 * arranque pintado y el polling lo pise sin saltos) más:
 *   - `hourly`: 24 buckets (índice 0 = hace 23 h, 23 = la hora en curso).
 *   - `split`: vistas 24 h por tipo sobre TODAS las filas (antes se aproximaba
 *     con el top-8, que sesgaba a favor de las fichas más vistas).
 *
 * Soft-fail: si la lectura falla, todo en cero y `ok: false`.
 */

export interface EnVivoData {
  ok: boolean
  live: LivePayload
  hourly: number[]
  split: Record<EntityType, number>
}

interface RawView {
  entity_type: string
  entity_slug: string
  viewed_at: string
  referrer: string | null
  user_agent: string | null
}

const H = 3_600_000

export async function getEnVivoData(recentLimit = 30): Promise<EnVivoData> {
  const hourly = new Array(24).fill(0) as number[]
  const split: Record<EntityType, number> = { consignataria: 0, frigorifico: 0 }
  const empty: EnVivoData = {
    ok: false,
    live: { counts: { v5m: 0, v1h: 0, v24h: 0 }, recent: [], topProfiles: [] },
    hourly,
    split,
  }

  const db = createServiceClient()
  if (!db) return empty

  const now = Date.now()
  const { data, error } = await db
    .from('profile_views')
    .select('entity_type, entity_slug, viewed_at, referrer, user_agent')
    .gte('viewed_at', new Date(now - 24 * H).toISOString())
    .order('viewed_at', { ascending: false })
    .limit(20000)
  if (error || !data) return empty

  const rows = data as RawView[]
  const t5m = now - 5 * 60_000
  const t1h = now - H
  let v5m = 0
  let v1h = 0
  const byProfile = new Map<string, { type: EntityType; slug: string; count: number }>()

  for (const r of rows) {
    const ms = new Date(r.viewed_at).getTime()
    if (ms >= t5m) v5m++
    if (ms >= t1h) v1h++
    const idx = 23 - Math.floor((now - ms) / H)
    if (idx >= 0 && idx < 24) hourly[idx]++
    const type: EntityType = r.entity_type === 'frigorifico' ? 'frigorifico' : 'consignataria'
    split[type]++
    const key = `${type}:${r.entity_slug}`
    const cur = byProfile.get(key)
    if (cur) cur.count++
    else byProfile.set(key, { type, slug: r.entity_slug, count: 1 })
  }

  const recent: LiveView[] = rows.slice(0, recentLimit).map((r) => {
    const type: EntityType = r.entity_type === 'frigorifico' ? 'frigorifico' : 'consignataria'
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

  const topProfiles: TopProfile[] = Array.from(byProfile.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((c) => ({ ...c, ...resolveEntity(c.type, c.slug) }))

  return {
    ok: true,
    live: { counts: { v5m, v1h, v24h: rows.length }, recent, topProfiles },
    hourly,
    split,
  }
}
