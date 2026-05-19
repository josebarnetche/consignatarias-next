/**
 * senasa-habilitados.ts — lookup layer for SENASA registry snapshot.
 *
 * Source data is produced by `scripts/scrape-senasa-habilitados.mjs` which
 * pulls the official "Exportar TODO" XLS from
 *   https://aps2.senasa.gov.ar/registros/faces/publico/establecimientos/tc_frigorificospublico.jsp
 * across Ciclo I/II/III, normalizes CUIT to 11-digit string, and writes
 * `senasa-habilitados.json` keyed by CUIT.
 *
 * Use:
 *   getSenasaRecord(cuit)       → SenasaRecord | null
 *   getSenasaScrapedAt()        → ISO string ("YYYY-MM-DDThh:mm:ssZ")
 *   isHabilitadoVigente(cuit)   → boolean
 */

import data from './senasa-habilitados.json'

export interface SenasaRecord {
  cuit: string
  tipo: string
  propietario: string
  nombre: string
  domicilio: string
  provincia: string
  partido: string
  localidad: string
  nroOficial: string
  actividades: string[]
  ciclos: string[]
}

interface Snapshot {
  scrapedAt: string
  source: string
  ciclos: string[]
  totalRowsScraped: number
  distinctCuits: number
  unparsableCuits: number
  byCuit: Record<string, SenasaRecord>
}

const snapshot = data as Snapshot

/** Strip dashes/spaces from CUIT, return 11-digit string or null. */
export function normalizeCuit(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  return digits.length === 11 ? digits : null
}

/** Lookup a record by CUIT (any format). Returns null if not found. */
export function getSenasaRecord(rawCuit: string | null | undefined): SenasaRecord | null {
  const cuit = normalizeCuit(rawCuit)
  if (!cuit) return null
  return snapshot.byCuit[cuit] ?? null
}

/** True if the CUIT appears in the current SENASA habilitados registry. */
export function isHabilitadoVigente(rawCuit: string | null | undefined): boolean {
  return getSenasaRecord(rawCuit) !== null
}

/** Snapshot timestamp as YYYY-MM-DD (UTC). */
export function getSenasaScrapedDate(): string {
  return snapshot.scrapedAt.slice(0, 10)
}

/** Full ISO timestamp of the last snapshot. */
export function getSenasaScrapedAt(): string {
  return snapshot.scrapedAt
}

/** Total habilitados in the current snapshot — for marketing copy. */
export function getSenasaHabilitadosCount(): number {
  return snapshot.distinctCuits
}
