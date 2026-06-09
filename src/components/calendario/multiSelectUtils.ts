import type { Auction } from '@/lib/db/schema'

// ---------------------------------------------------------------------------
// Localidad / provincia grouping helpers for the multi-localidad calendar export.
// All data comes from remates.json (real source). Nothing is fabricated here.
// ---------------------------------------------------------------------------

/** Canonical key for a localidad: strip accents + uppercase the "Ciudad" part of
 * "Ciudad, Provincia". Mirrors the normalizeCity() used in /remates/ciudad. */
export function localidadKey(location: string | null | undefined): string {
  const city = (location || '').split(',')[0].trim()
  return city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

/** Title-case display label for a localidad, from the raw "Ciudad" segment. */
export function localidadLabel(location: string | null | undefined): string {
  const city = (location || '').split(',')[0].trim()
  if (!city) return 'Sin localidad'
  return city
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}

export interface Localidad {
  /** Stable selection id: `${province}::${localidadKey}` */
  id: string
  /** Display label, title-cased (e.g. "San Justo"). */
  label: string
  /** Province this localidad belongs to (canonical, uppercased). */
  province: string
  /** Number of upcoming auctions in this localidad. */
  count: number
}

export interface ProvinceGroup {
  province: string
  count: number
  localidades: Localidad[]
}

/** Build the province → localidad tree from a list of (already date-filtered)
 * auctions. Localidades are deduped by canonical key, label = first seen with the
 * cleanest casing. Sorted: provinces A→Z, localidades A→Z. */
export function buildLocalidadTree(auctions: Auction[]): ProvinceGroup[] {
  // province -> (localidadKey -> { label, count })
  const tree = new Map<string, Map<string, { label: string; count: number }>>()

  for (const a of auctions) {
    const province = (a.province || 'SIN PROVINCIA').trim().toUpperCase()
    const key = localidadKey(a.location)
    if (!tree.has(province)) tree.set(province, new Map())
    const locs = tree.get(province)!
    const existing = locs.get(key)
    if (existing) {
      existing.count += 1
    } else {
      locs.set(key, { label: localidadLabel(a.location), count: 1 })
    }
  }

  const groups: ProvinceGroup[] = []
  for (const [province, locs] of tree) {
    const localidades: Localidad[] = []
    let total = 0
    for (const [key, { label, count }] of locs) {
      total += count
      localidades.push({ id: `${province}::${key}`, label, province, count })
    }
    localidades.sort((x, y) => x.label.localeCompare(y.label, 'es'))
    groups.push({ province, count: total, localidades })
  }
  groups.sort((x, y) => x.province.localeCompare(y.province, 'es'))
  return groups
}

/** Map a selection id back to the (province, localidadKey) pair used to match
 * auctions. */
export function matchesSelection(auction: Auction, selectedIds: Set<string>): boolean {
  const province = (auction.province || 'SIN PROVINCIA').trim().toUpperCase()
  const id = `${province}::${localidadKey(auction.location)}`
  return selectedIds.has(id)
}

// ---------------------------------------------------------------------------
// .ics generation — client-side mirror of /api/calendario/ical so the export
// can span MANY localidades without touching the API contract.
// ---------------------------------------------------------------------------

function escapeIcal(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function formatIcalDate(date: string, time: string | null): string {
  const d = date.replace(/-/g, '')
  if (time) {
    const t = time.replace(':', '') + '00'
    return `${d}T${t}`
  }
  return d
}

function dtEndFor(date: string, time: string | null): string {
  if (!time) return formatIcalDate(date, null)
  const [hStr, mStr] = time.split(':')
  const end = `${parseInt(hStr, 10) + 3}:${mStr}`
  return formatIcalDate(date, end)
}

/** Build a VCALENDAR string from the given auctions. Same shape/fields as the
 * server route so subscribed calendars stay consistent. */
export function buildIcal(auctions: Auction[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Consignatarias.com.ar//Calendario de Remates//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Remates Ganaderos Argentina',
    'X-WR-TIMEZONE:America/Argentina/Buenos_Aires',
  ]

  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  for (const a of auctions) {
    const dtStart = formatIcalDate(a.date, a.time)
    const dtEnd = dtEndFor(a.date, a.time)
    const summary = `${a.consignatariaName} - ${a.type.toUpperCase()}`
    const description = [
      a.title,
      `Tipo: ${a.type}`,
      a.estimatedHeads ? `Cabezas estimadas: ${a.estimatedHeads}` : '',
      a.catalogUrl ? `Catálogo: ${a.catalogUrl}` : '',
      a.youtubeUrl ? `Transmisión: ${a.youtubeUrl}` : '',
      `Ver más: https://www.consignatarias.com.ar/consignatarias/${a.consignatariaSlug}`,
    ]
      .filter(Boolean)
      .join('\\n')

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:remate-${a.id}@consignatarias.com.ar`)
    lines.push(`DTSTAMP:${stamp}`)
    lines.push(`DTSTART:${dtStart}`)
    lines.push(`DTEND:${dtEnd}`)
    lines.push(`SUMMARY:${escapeIcal(summary)}`)
    lines.push(`DESCRIPTION:${escapeIcal(description)}`)
    lines.push(`LOCATION:${escapeIcal(a.location)}`)
    lines.push(`GEO:${a.province}`)
    lines.push(`CATEGORIES:REMATE,${a.type.toUpperCase()},${a.province}`)
    if (a.catalogUrl) lines.push(`URL:${a.catalogUrl}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}
