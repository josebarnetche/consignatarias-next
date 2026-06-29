/**
 * Modelo "REMATE EN VIVO" — capa de lectura para el ticker.
 *
 * Lee live_remate_session (sesión activa) + live_remate_lot (lotes parseados por el
 * worker off-Vercel). Calcula promedios corrientes por categoría (mediana, robusta).
 * Soft-fails a null/vacío: el ticker nunca rompe la página.
 *
 * IMPORTANTE: el precio es LECTURA AUTOMÁTICA PRELIMINAR (transcripción del cantaleo),
 * no el promedio oficial. La UI debe rotularlo así.
 */
import { createServiceClient } from '@/lib/supabase'

export interface LiveLot {
  categoria: string
  precio: number
  cabezas: number | null
  at: string
}
export interface LiveCatAvg {
  categoria: string
  n: number
  mediana: number
}
export interface LiveRematePayload {
  active: boolean
  session: {
    id: string
    youtubeUrl: string | null
    consignataria: string | null
    location: string | null
    startedAt: string
    lastSeen: string
    staleSec: number
  } | null
  current: LiveLot | null
  recent: LiveLot[]
  averages: LiveCatAvg[]
}

const EMPTY: LiveRematePayload = { active: false, session: null, current: null, recent: [], averages: [] }
const STALE_LIMIT_SEC = 180 // si el worker no escribe hace 3 min, lo damos por caído

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

export async function getLiveRemate(): Promise<LiveRematePayload> {
  const sb = createServiceClient()
  if (!sb) return EMPTY
  try {
    const { data: sessions } = await sb
      .from('live_remate_session')
      .select('*')
      .eq('status', 'live')
      .order('last_seen', { ascending: false })
      .limit(1)
    const s = sessions?.[0]
    if (!s) return EMPTY

    const staleSec = Math.round((Date.now() - new Date(s.last_seen).getTime()) / 1000)
    if (staleSec > STALE_LIMIT_SEC) return EMPTY // worker caído → no mostramos ticker fantasma

    const { data: lotsRaw } = await sb
      .from('live_remate_lot')
      .select('categoria,precio,cabezas,created_at')
      .eq('session_id', s.id)
      .order('created_at', { ascending: false })
      .limit(120)
    const lots = lotsRaw ?? []

    const recent: LiveLot[] = lots.slice(0, 12).map((l) => ({
      categoria: l.categoria, precio: l.precio, cabezas: l.cabezas, at: l.created_at,
    }))
    const byCat = new Map<string, number[]>()
    for (const l of lots) {
      if (!l.categoria || !l.precio) continue
      if (!byCat.has(l.categoria)) byCat.set(l.categoria, [])
      byCat.get(l.categoria)!.push(l.precio)
    }
    const averages: LiveCatAvg[] = [...byCat.entries()]
      .map(([categoria, ps]) => ({ categoria, n: ps.length, mediana: median(ps) }))
      .sort((a, b) => b.n - a.n)

    return {
      active: true,
      session: {
        id: s.id, youtubeUrl: s.youtube_url, consignataria: s.consignataria,
        location: s.location, startedAt: s.started_at, lastSeen: s.last_seen, staleSec,
      },
      current: recent[0] ?? null,
      recent,
      averages,
    }
  } catch {
    return EMPTY
  }
}
