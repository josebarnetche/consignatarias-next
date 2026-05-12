import rematesData from './data/remates.json'
import frigorificosData from './data/frigorificos.json'
import consignatariasData from './data/consignatarias.json'
import { getAllProfiles } from './data/consignataria-slugs'
import type { Auction } from './db/schema'

/**
 * Single source of truth for "how big is the platform" numbers
 * shown across landing, /enterprise, /planes, layouts, etc.
 *
 * All counts derived at build/import time from JSON data, so they
 * never drift between surfaces.
 */

const remates = rematesData as Auction[]

export const PLATFORM_STATS = {
  remates: remates.length,
  consignatariasRaw: consignatariasData.length,
  consignatariasCanonical: getAllProfiles().length,
  frigorificos: frigorificosData.length,
  provincias: new Set(remates.map((r) => r.province)).size,
  // Hardcoded — TODO: derive from newsletter_subscribers table at request time if needed
  newsletterSubscribers: 500,
} as const

export type PlatformStats = typeof PLATFORM_STATS
