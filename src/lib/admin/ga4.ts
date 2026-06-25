import { JWT } from 'google-auth-library'

/**
 * GA4 weekly traffic, leído del server vía la Analytics Data API v1beta.
 *
 * Diseño deliberado de SOFT-FAIL: si faltan las credenciales (GA4_SA_KEY +
 * GA4_PROPERTY_ID) o cualquier paso falla, devolvemos `null`. El card que
 * consume esto NUNCA debe romper la página: con `null` muestra un fallback
 * honesto + un proxy first-party (profile_views). NO hardcodeamos secretos.
 *
 * Credenciales esperadas (en Vercel, NO en el repo):
 *  - GA4_SA_KEY: el JSON completo del service account (con client_email +
 *    private_key). Puede venir como JSON crudo o base64 del JSON.
 *  - GA4_PROPERTY_ID: el numeric property id (ej. "123456789", sin "properties/").
 */

const ANALYTICS_DATA_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'

/** Una fila por día del sparkline diario. */
export interface Ga4DailyPoint {
  /** "YYYYMMDD" tal como lo devuelve GA4. */
  date: string
  sessions: number
}

/** Un canal de adquisición (sessionDefaultChannelGroup). */
export interface Ga4Channel {
  channel: string
  sessions: number
}

/** Una métrica con su valor actual, previo y % de cambio. */
export interface Ga4Metric {
  current: number
  previous: number
  /** % de cambio vs período previo. `null` si previo es 0 (no inventamos ∞). */
  changePct: number | null
}

export interface Ga4Weekly {
  sessions: Ga4Metric
  users: Ga4Metric
  pageViews: Ga4Metric
  /** Duración media de sesión en segundos. */
  avgSessionDuration: Ga4Metric
  /** Serie diaria (últimos 7 días) para el sparkline. */
  daily: Ga4DailyPoint[]
  topChannels: Ga4Channel[]
}

interface ServiceAccountKey {
  client_email?: string
  private_key?: string
}

/** Parsea GA4_SA_KEY: acepta JSON crudo o base64 del JSON. `null` si no parsea. */
function parseServiceAccountKey(raw: string): ServiceAccountKey | null {
  const tryParse = (s: string): ServiceAccountKey | null => {
    try {
      const obj = JSON.parse(s)
      if (obj && typeof obj === 'object') return obj as ServiceAccountKey
      return null
    } catch {
      return null
    }
  }
  // Primero como JSON directo.
  let parsed = tryParse(raw)
  if (parsed) return parsed
  // Si no, intentamos como base64 del JSON.
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf-8')
    parsed = tryParse(decoded)
    if (parsed) return parsed
  } catch {
    /* noop */
  }
  return null
}

const changePct = (current: number, previous: number): number | null => {
  if (!previous) return null
  return ((current - previous) / previous) * 100
}

// Tipos mínimos de la respuesta de runReport (v1beta).
interface Ga4Row {
  dimensionValues?: { value?: string }[]
  metricValues?: { value?: string }[]
}
interface Ga4ReportResponse {
  rows?: Ga4Row[]
}

/**
 * Devuelve el resumen semanal de GA4, o `null` ante cualquier falla (soft-fail).
 * No lanza nunca: todo error se traga y se reporta como `null`.
 */
export async function getGa4Weekly(): Promise<Ga4Weekly | null> {
  const rawKey = process.env.GA4_SA_KEY
  const propertyId = process.env.GA4_PROPERTY_ID

  if (!rawKey || !propertyId) return null

  const sa = parseServiceAccountKey(rawKey)
  if (!sa?.client_email || !sa?.private_key) return null

  try {
    const client = new JWT({
      email: sa.client_email,
      key: sa.private_key,
      scopes: [ANALYTICS_DATA_SCOPE],
    })

    const property = propertyId.startsWith('properties/')
      ? propertyId
      : `properties/${propertyId}`
    const endpoint = `https://analyticsdata.googleapis.com/v1beta/${property}:runReport`

    // Tres reports en paralelo: totales (2 períodos), diario, canales.
    const totalsBody = {
      dateRanges: [
        { startDate: '7daysAgo', endDate: 'yesterday', name: 'current' },
        { startDate: '14daysAgo', endDate: '8daysAgo', name: 'previous' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
      ],
      dimensions: [{ name: 'dateRange' }],
    }

    const dailyBody = {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
      metrics: [{ name: 'sessions' }],
      dimensions: [{ name: 'date' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }

    const channelsBody = {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
      metrics: [{ name: 'sessions' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 5,
    }

    const post = async (body: unknown): Promise<Ga4ReportResponse> => {
      const res = await client.request<Ga4ReportResponse>({
        url: endpoint,
        method: 'POST',
        data: body,
      })
      return res.data
    }

    const [totals, daily, channels] = await Promise.all([
      post(totalsBody),
      post(dailyBody),
      post(channelsBody),
    ])

    // Totales: una fila por dateRange (dimensionValues[0].value === 'current'|'previous').
    const rowFor = (name: string): Ga4Row | undefined =>
      totals.rows?.find((r) => r.dimensionValues?.[0]?.value === name)
    const cur = rowFor('current')
    const prev = rowFor('previous')

    const metricAt = (row: Ga4Row | undefined, i: number): number => {
      const v = row?.metricValues?.[i]?.value
      const n = v != null ? Number(v) : 0
      return Number.isNaN(n) ? 0 : n
    }

    const buildMetric = (i: number): Ga4Metric => {
      const current = metricAt(cur, i)
      const previous = metricAt(prev, i)
      return { current, previous, changePct: changePct(current, previous) }
    }

    const dailyPoints: Ga4DailyPoint[] = (daily.rows ?? []).map((r) => ({
      date: r.dimensionValues?.[0]?.value ?? '',
      sessions: Number(r.metricValues?.[0]?.value ?? 0) || 0,
    }))

    const topChannels: Ga4Channel[] = (channels.rows ?? []).map((r) => ({
      channel: r.dimensionValues?.[0]?.value || '(sin asignar)',
      sessions: Number(r.metricValues?.[0]?.value ?? 0) || 0,
    }))

    // Si GA4 respondió pero sin nada útil, tratamos como sin dato.
    if (!totals.rows?.length && !dailyPoints.length) return null

    return {
      sessions: buildMetric(0),
      users: buildMetric(1),
      pageViews: buildMetric(2),
      avgSessionDuration: buildMetric(3),
      daily: dailyPoints,
      topChannels,
    }
  } catch {
    // Cualquier falla (auth, red, permisos, schema) → soft-fail.
    return null
  }
}
