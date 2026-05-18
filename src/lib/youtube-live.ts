/**
 * youtube-live.ts — match cattle auctions to YouTube channels for "live" UX.
 *
 * Why this exists:
 *   The scraper attaches `youtubeUrl` to remates only AFTER they're broadcast
 *   (when the live archive is published). So `/remates/en-vivo` always saw 0
 *   upcoming streams. But many consignatarias broadcast EVERY auction on the
 *   same channel — if we know the channel, we can surface upcoming auctions
 *   as "probably live" with a link to the channel's /streams tab where the
 *   user lands on whatever's scheduled or currently live.
 *
 * Match strategy:
 *   1. Resolve the auction's `consignatariaSlug` to its canonical via
 *      `getCanonicalSlug` (so variants like `ivan-l-o-farrell-s-r-l` route
 *      to the same channel as `ivan-l-ofarrell-srl`).
 *   2. Look up the canonical in the in-memory canonical→channel map built
 *      from `youtube-channels.json`.
 *   3. Return either a direct video URL (if `youtubeUrl` exists on the
 *      remate) or a channel `/streams` URL (probable live).
 *
 * Coverage today: ~53% of upcoming remates have a mapped channel.
 */

import youtubeChannels from './data/youtube-channels.json'
import { getCanonicalSlug } from './data/consignataria-slugs'

interface YoutubeChannelInfo {
  channelId: string
  channelUrl: string
  channelTitle: string
  subscribers?: number | null
  latestVideo?: unknown
  lastChecked?: string
}

/** Build a canonical → channel map once at module load. */
const channelsByCanonical: Map<string, YoutubeChannelInfo> = (() => {
  const map = new Map<string, YoutubeChannelInfo>()
  for (const [rawSlug, info] of Object.entries(
    youtubeChannels as unknown as Record<string, YoutubeChannelInfo>,
  )) {
    const canonical = getCanonicalSlug(rawSlug) ?? rawSlug
    if (!map.has(canonical)) {
      map.set(canonical, info)
    }
  }
  return map
})()

/**
 * Get the YouTube channel for a consignataria, if known.
 * Accepts any slug variant — resolves to canonical internally.
 */
export function getChannelForSlug(rawSlug: string | null | undefined): YoutubeChannelInfo | null {
  if (!rawSlug) return null
  const canonical = getCanonicalSlug(rawSlug) ?? rawSlug
  return channelsByCanonical.get(canonical) ?? null
}

/**
 * Resolve the best YouTube URL for an auction:
 *   - If the auction has a direct `youtubeUrl`, return that (confirmed stream).
 *   - Otherwise, if the consignataria has a known channel, return the channel's
 *     `/streams` URL (probable broadcast — channel may be live or have scheduled
 *     streams the user can join).
 *   - Otherwise null.
 */
export function resolveYoutubeUrl(
  auction: { consignatariaSlug?: string | null; youtubeUrl?: string | null },
): { url: string; confidence: 'confirmed' | 'probable' } | null {
  if (auction.youtubeUrl) {
    return { url: auction.youtubeUrl, confidence: 'confirmed' }
  }
  const channel = getChannelForSlug(auction.consignatariaSlug ?? null)
  if (channel) {
    // /streams shows scheduled + live + recent — the most useful entry point
    // when we don't have a specific stream URL.
    const url = channel.channelUrl.replace(/\/$/, '') + '/streams'
    return { url, confidence: 'probable' }
  }
  return null
}

/**
 * Count how many remates from a list have any resolvable YouTube URL
 * (confirmed + probable combined). Useful for SEO copy on /remates/en-vivo.
 */
export function countResolvable(
  remates: Array<{ consignatariaSlug?: string | null; youtubeUrl?: string | null }>,
): { confirmed: number; probable: number; total: number } {
  let confirmed = 0
  let probable = 0
  for (const r of remates) {
    const res = resolveYoutubeUrl(r)
    if (!res) continue
    if (res.confidence === 'confirmed') confirmed++
    else probable++
  }
  return { confirmed, probable, total: confirmed + probable }
}
