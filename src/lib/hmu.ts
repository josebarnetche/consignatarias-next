/**
 * howmuchusers.wtf — scoreboard público de usuarios reales.
 * Docs: https://howmuchusers.wtf/en/docs/api
 *
 * Dos keys:
 *   HMU_SECRET_KEY (server) → user.created / user.deleted / user.activated / subscription.* + todo lo público
 *   NEXT_PUBLIC_HMU_PUBLIC_KEY (browser) → page.viewed / session.started / custom
 *
 * Fire-and-forget: nunca bloquea ni rompe el request. Sin key → no-op.
 */

const HMU_BASE = 'https://howmuchusers.wtf/api/v1'

export type HmuEvent =
  | 'user.created'
  | 'user.deleted'
  | 'user.activated'
  | 'subscription.started'
  | 'subscription.cancelled'
  | 'session.started'
  | 'page.viewed'
  | (string & {})

export interface HmuEventInput {
  event: HmuEvent
  user_id?: string
  created_at?: string
  idempotency_key?: string
  props?: Record<string, string | number | boolean | null>
}

async function post(path: string, key: string, body: unknown, timeoutMs = 4000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(`${HMU_BASE}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      cache: 'no-store',
    })
  } finally {
    clearTimeout(t)
  }
}

/** Server-side. Un evento o batch (≤100). Nunca lanza. */
export function hmuTrack(input: HmuEventInput | HmuEventInput[]): void {
  const key = process.env.HMU_SECRET_KEY
  if (!key) return
  const body = Array.isArray(input) ? { events: input } : input
  void post('/events', key, body).catch(() => {})
}

/** Server-side. Import histórico (≤1000 por request, 20 req/h). Devuelve la respuesta cruda. */
export async function hmuImportUsers(users: { user_id: string; created_at: string }[]) {
  const key = process.env.HMU_SECRET_KEY
  if (!key) throw new Error('HMU_SECRET_KEY no configurada')
  const res = await post('/users/import', key, { users }, 20000)
  const text = await res.text()
  return { status: res.status, body: text }
}

/** Server-side. Estado del proyecto (live, total_users, last_event_at, errores del día). */
export async function hmuStatus() {
  const key = process.env.HMU_SECRET_KEY
  if (!key) return null
  const res = await fetch(`${HMU_BASE}/status`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: 'no-store',
  })
  return res.ok ? res.json() : null
}
