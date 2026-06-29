/**
 * Aggregator Stream Matcher — complemento de match-youtube-videos.ts
 *
 * Por qué existe:
 *   ~47 consignatarias con remates próximos NO tienen canal propio: las transmiten
 *   AGREGADORES (Canal Rural, Rosgan, Entre Surcos y Corrales). El matcher de canal
 *   propio no las cubre. Este corre como 2da pasada: para cada remate de HOY sin
 *   youtubeUrl, busca en los canales agregadores un stream EN VIVO / UPCOMING cuyo
 *   título matchee el nombre de la consignataria, y se lo attachea.
 *
 * Precisión (validada sobre streams reales de Canal Rural + Entre Surcos):
 *   - Exige keyword "remate|feria|subasta" en el título.
 *   - Needle estricta (multi-palabra ≥6 o ≥8 chars, sin sufijos societarios/genéricos).
 *   Esto elimina los falsos positivos de topónimos (ej. "Hasenkamp" pueblo) y palabras
 *   genéricas. Sin esto, mapear a ciegas mete links errados — peor que no tener link.
 *
 * Uso: npx ts-node scripts/match-aggregator-streams.ts   (requiere YOUTUBE_API_KEY)
 * Corre DESPUÉS de match-youtube-videos.ts (solo toca remates que quedaron sin youtubeUrl).
 */
import fs from 'fs'
import path from 'path'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search'

const channelsPath = path.join(__dirname, '../src/lib/data/youtube-channels.json')
const rematesPath = path.join(__dirname, '../src/lib/data/remates.json')

interface ChannelInfo { channelId: string; channelTitle: string; isAggregator?: boolean }
interface Remate {
  id: number
  date: string
  consignatariaName: string
  consignatariaSlug: string
  youtubeUrl?: string | null
  status?: string
}
interface SearchResult {
  items?: Array<{ id: { videoId: string }; snippet: { title: string } }>
}

function getToday(): string {
  const now = new Date()
  now.setHours(now.getHours() - 3) // ART (GMT-3)
  return now.toISOString().split('T')[0]
}

/* ----- matching (lógica validada) ----- */
function strip(s: string): string {
  return s
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
}
// Needle distintiva del nombre de la consignataria (sin sufijos societarios ni genéricos).
function needleOf(name: string): string | null {
  const core = strip(name)
    .replace(/\b(s a|s r l|srl|sa|scl|ltda|y cia|cia|sac|sociedad|coop|cooperativa|consignataria|hnos|e hijos|rural|ganadera|y)\b/g, ' ')
    .replace(/\s+/g, ' ').trim()
  if ((core.includes(' ') && core.length >= 6) || core.length >= 8) return core
  return null // demasiado genérica para matchear sin falsos positivos
}
const REMATE_KW = /\b(remate|feria|subasta)\b/
function titleMatches(title: string, needle: string): boolean {
  const t = ' ' + strip(title) + ' '
  return REMATE_KW.test(t) && t.includes(' ' + needle + ' ')
}

/* ----- fetch de streams en vivo/programados de un canal ----- */
async function liveStreams(channelId: string): Promise<Array<{ videoId: string; title: string }>> {
  const out: Array<{ videoId: string; title: string }> = []
  for (const eventType of ['live', 'upcoming'] as const) {
    const params = new URLSearchParams({
      part: 'snippet', channelId, type: 'video', eventType, maxResults: '20', key: YOUTUBE_API_KEY!,
    })
    try {
      const res = await fetch(`${YOUTUBE_SEARCH_URL}?${params}`)
      const data: SearchResult = await res.json()
      for (const it of data.items ?? []) out.push({ videoId: it.id.videoId, title: it.snippet.title })
    } catch (e) {
      console.error(`  ! error ${eventType} @ ${channelId}:`, (e as Error).message)
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  return out
}

async function main() {
  console.log('📡 Aggregator Stream Matcher\n===========================\n')
  if (!YOUTUBE_API_KEY) { console.error('❌ Set YOUTUBE_API_KEY'); process.exit(1) }

  const channelMap: Record<string, ChannelInfo> = JSON.parse(fs.readFileSync(channelsPath, 'utf-8'))
  const remates: Remate[] = JSON.parse(fs.readFileSync(rematesPath, 'utf-8'))
  const today = getToday()

  const aggregators = Object.values(channelMap).filter((c) => c.isAggregator)
  const todayRemates = remates.filter((r) => r.date === today && r.status !== 'completed' && !r.youtubeUrl)
  console.log(`📅 ${today} · agregadores: ${aggregators.map((a) => a.channelTitle).join(', ')}`)
  console.log(`🎯 remates de hoy sin youtubeUrl: ${todayRemates.length}\n`)
  if (todayRemates.length === 0) { console.log('Nada que matchear.'); return }

  // 1) juntar todos los streams en vivo/programados de los agregadores
  const streams: Array<{ videoId: string; title: string; channel: string }> = []
  for (const agg of aggregators) {
    const s = await liveStreams(agg.channelId)
    for (const x of s) streams.push({ ...x, channel: agg.channelTitle })
    console.log(`  ${agg.channelTitle}: ${s.length} streams en vivo/programados`)
  }
  console.log('')

  // 2) matchear cada remate de hoy contra los títulos
  const updates: Array<{ id: number; youtubeUrl: string }> = []
  for (const r of todayRemates) {
    const needle = needleOf(r.consignatariaName)
    if (!needle) continue
    const hit = streams.find((s) => titleMatches(s.title, needle))
    if (hit) {
      const url = `https://www.youtube.com/watch?v=${hit.videoId}`
      updates.push({ id: r.id, youtubeUrl: url })
      console.log(`  ✅ ${r.consignatariaName} → ${hit.channel}: "${hit.title.slice(0, 50)}"`)
    }
  }

  console.log(`\n📊 matcheados: ${updates.length}/${todayRemates.length}`)
  if (updates.length > 0) {
    const updated = remates.map((r) => {
      const u = updates.find((x) => x.id === r.id)
      return u ? { ...r, youtubeUrl: u.youtubeUrl } : r
    })
    fs.writeFileSync(rematesPath, JSON.stringify(updated, null, 2))
    console.log(`✅ remates.json actualizado con ${updates.length} URLs de agregadores`)
  }
}

main().catch(console.error)
