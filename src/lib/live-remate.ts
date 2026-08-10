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
  unidad: 'kg' | 'cabeza'
  cabezas: number | null
  at: string
}
export interface LiveCatAvg {
  categoria: string
  unidad: 'kg' | 'cabeza'
  n: number
  mediana: number
}
export interface LiveTranscriptBlock {
  texto: string
  at: string
}
export interface LiveRematePayload {
  active: boolean
  session: {
    id: string
    youtubeUrl: string | null
    consignataria: string | null
    consignatariaSlug: string | null
    location: string | null
    startedAt: string
    lastSeen: string
    staleSec: number
  } | null
  current: LiveLot | null
  recent: LiveLot[]
  averages: LiveCatAvg[]
  transcript: LiveTranscriptBlock[]
}

const EMPTY: LiveRematePayload = { active: false, session: null, current: null, recent: [], averages: [], transcript: [] }
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
      .select('*')
      .eq('session_id', s.id)
      .order('created_at', { ascending: false })
      .limit(120)
    // `unidad` es de 20260810; database.types.ts aún no la conoce — regenerar
    // tipos y tipar el select en el próximo commit.
    const lots = (lotsRaw ?? []) as Array<{
      categoria: string | null; precio: number | null; cabezas: number | null
      created_at: string; unidad?: 'kg' | 'cabeza'
    }>

    const recent: LiveLot[] = lots.slice(0, 12).map((l) => ({
      categoria: l.categoria ?? '', precio: l.precio ?? 0,
      unidad: l.unidad ?? 'kg', cabezas: l.cabezas, at: l.created_at,
    }))
    // Mediana por (categoría, unidad): un remate de cabaña no promedia
    // $/cabeza con $/kg aunque la categoría coincida.
    const byCat = new Map<string, { unidad: 'kg' | 'cabeza'; ps: number[] }>()
    for (const l of lots) {
      if (!l.categoria || !l.precio) continue
      const unidad = l.unidad ?? 'kg'
      const k = `${l.categoria}|${unidad}`
      if (!byCat.has(k)) byCat.set(k, { unidad, ps: [] })
      byCat.get(k)!.ps.push(l.precio)
    }
    const averages: LiveCatAvg[] = [...byCat.entries()]
      .map(([k, { unidad, ps }]) => ({
        categoria: k.split('|')[0], unidad, n: ps.length, mediana: median(ps),
      }))
      .sort((a, b) => b.n - a.n)

    // El subtítulo del cantaleo: últimos bloques transcriptos, cronológicos.
    // `live_remate_transcript` es de 20260810 — mismo caso de tipos que unidad.
    const { data: trRaw } = await (sb as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (k: string, v: string) => {
            order: (c: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: Array<{ texto: string; created_at: string }> | null }>
            }
          }
        }
      }
    })
      .from('live_remate_transcript')
      .select('texto,created_at')
      .eq('session_id', s.id)
      .order('created_at', { ascending: false })
      .limit(20)
    const transcript: LiveTranscriptBlock[] = (trRaw ?? [])
      .map((t) => ({ texto: t.texto, at: t.created_at }))
      .reverse()

    return {
      active: true,
      session: {
        id: s.id, youtubeUrl: s.youtube_url, consignataria: s.consignataria,
        // consignataria_slug es de 20260810; database.types.ts aún no la
        // conoce — regenerar tipos y sacar este cast en el próximo commit.
        consignatariaSlug: (s as { consignataria_slug?: string | null }).consignataria_slug ?? null,
        location: s.location, startedAt: s.started_at, lastSeen: s.last_seen, staleSec,
      },
      current: recent[0] ?? null,
      recent,
      averages,
      transcript,
    }
  } catch {
    return EMPTY
  }
}
