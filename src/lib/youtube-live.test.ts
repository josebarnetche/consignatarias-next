import { describe, it, expect } from 'vitest'
import youtubeChannels from './data/youtube-channels.json'
import { getChannelForSlug } from './youtube-live'
import { resolverStream } from './streams'

const canales = youtubeChannels as unknown as Record<
  string,
  { channelId: string; channelUrl: string; channelTitle: string }
>

describe('youtube-channels.json: el mapa firma → canal que usa la pared en vivo', () => {
  it('cada canal tiene un channelId de YouTube bien formado, URL y título', () => {
    for (const [slug, c] of Object.entries(canales)) {
      expect(c.channelId, slug).toMatch(/^UC[A-Za-z0-9_-]{22}$/)
      expect(c.channelUrl, slug).toMatch(/^https:\/\/www\.youtube\.com\//)
      expect(c.channelTitle?.trim(), slug).toBeTruthy()
    }
  })

  it('no hay dos firmas apuntando al mismo canal', () => {
    const ids = Object.values(canales).map((c) => c.channelId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

/**
 * Néstor Hugo Fuentes tenía canal mapeado (`nestor-fuentes`) pero el scraper
 * publica sus remates como `nestor-hugo-fuentes` (19 de 23 en remates.json al
 * 19-11-2026), un slug que no canonicalizaba. La pared en vivo no lo veía: 6
 * remates en los 30 días siguientes quedaban sin canal.
 */
describe('Néstor Hugo Fuentes llega a su canal desde cualquier slug del scraper', () => {
  const ID = 'UCJRdd9PKH4VYpvWPP5dly7A'
  for (const slug of ['nestor-fuentes', 'nestor-hugo-fuentes', 'nestor-hugo-fuentes-s-a']) {
    it(slug, () => {
      expect(getChannelForSlug(slug)?.channelId).toBe(ID)
      const s = resolverStream({ consignatariaSlug: slug, youtubeUrl: null })
      expect(s?.tipo).toBe('canal')
      expect(s?.embedUrl).toContain(`channel=${ID}`)
    })
  }
})
