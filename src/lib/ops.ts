/**
 * v1.14 observability — write-side helpers for ops_events and cron_runs.
 *
 * - logEvent(): fire-and-forget. Never throws to caller. Use with `void`.
 * - startCronRun / finishCronRun: book-end a workflow run.
 * - getCronHealth(): read-side summary per workflow with age vs expected cadence.
 *
 * All writes go through createAdminClient() (service-role, bypasses RLS).
 */

import { createAdminClient } from '@/lib/supabase-server'
import type { Json } from '@/lib/database.types'
import { waitUntil } from '@vercel/functions'

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

export type OpsEventType =
  | 'api_call'
  | 'mcp_call'
  | 'webhook_received'
  | 'cron_started'
  | 'cron_finished'
  | 'form_submit'
  | 'x402_payment'
  | 'error'

export type OpsStatus = 'ok' | 'error' | 'timeout'

export interface LogEventInput {
  eventType: OpsEventType
  status: OpsStatus
  userId?: string | null
  apiKeyId?: string | null
  requestId?: string | null
  route?: string | null
  latencyMs?: number | null
  statusCode?: number | null
  metadata?: Record<string, unknown>
}

export type CronStatus = 'running' | 'ok' | 'error' | 'timeout'

export interface CronHealthRow {
  workflow_name: string
  last_run_at: string | null
  age_hours: number | null
  status: CronStatus | null
  expected_interval_hours: number
}

/* ------------------------------------------------------------------ */
/*  EXPECTED CRON CADENCES                                             */
/*                                                                     */
/*  Used by getCronHealth() to compute whether a workflow is overdue. */
/*  Keep workflow_name keys aligned with .github/workflows/*.yml names.*/
/* ------------------------------------------------------------------ */

// Cadencias derivadas de los cron reales en .github/workflows/*.yml (verificado
// 2026-07-12). NO incluir: manuales (workflow_dispatch: backfill-inmag/usd,
// mag-lots-discover) ni deshabilitados (disabled/: mag-remitentes, remate-reminders,
// new-remate-alerts, monthly-metrics, pro-consignataria-outreach) — no son crons
// programados y ensuciaban el dashboard como "nunca corrió"/"overdue". Los no
// listados caen a 24h por default (getCronHealth), así que TODO scheduled va acá.
export const EXPECTED_CRONS: Record<string, number> = {
  // Diarios (24h)
  'scrape-auctions': 24,            // 14:00 ART
  'post-remate-outreach': 24,       // ventana horaria 14-22h
  'price-alerts': 24,               // 21:17
  'trial-nudges': 24,               // 13:17
  'mcp-consumption-alert': 24,      // 09:00 ART — primer tools/call identificado
  // data-freshness-alert NO va acá: es un alert GitHub-native (::error::), no loguea a
  // cron_runs → mostraba falso "nunca corrió". Su falla es visible en GitHub Actions.
  // Días laborables / parciales — tolerancia mayor para no marcar overdue el finde
  'mag-detailed-prices': 72,        // Lun-Vie 22:37 → hueco máx ~72h (Vie→Lun)
  'mag-lots-pipeline': 100,         // Mar/Mié/Vie 22:42 → hueco máx ~96h
  // Semanales (168h) — lunes
  'quota-alerts': 168,              // (era 24, mal: corre solo los lunes)
  'weekly-newsletter': 168,
  // scrape-senasa-habilitados: movido de mensual a semanal (lunes). GitHub salteaba
  // el cron mensual (no disparó jun ni jul-2026); cambia poco → casi siempre no-op.
  'scrape-senasa-habilitados': 168,
  'scrape-faena-hembras': 168,       // Lunes — ancla nacional % hembras (PDF mensual MAGyP)
  // weekly-digest removido: el workflow ya no existe (falso "overdue" permanente).
  // Mensuales (~720h)
  'arrendamiento-cierre': 720,      // día 3 (faltaba → default 24 daba falso overdue)
  'el-corredor-publish': 720,       // día 1 (era 168, mal: es mensual)
  'faena-newsletter': 720,          // día 3
  'monthly-close': 720,             // día 1
}

/* ------------------------------------------------------------------ */
/*  logEvent — fire-and-forget                                         */
/* ------------------------------------------------------------------ */

/**
 * Fire-and-forget event insert. Never throws.
 *
 * On Vercel, the function may return its HTTP response before a void-discarded
 * Promise completes, and the runtime kills any in-flight Supabase request mid-
 * flight. `waitUntil()` registers the work to be awaited *after* the response
 * is sent, so the insert always completes. In dev / non-Vercel runtimes
 * waitUntil falls back to a normal promise pump.
 *
 * Pattern:
 *   void logEvent({ eventType: 'api_call', status: 'ok', requestId, ... })
 */
export function logEvent(input: LogEventInput): void {
  const promise = (async () => {
    try {
      const admin = createAdminClient()
      const { error } = await admin.from('ops_events').insert({
        event_type: input.eventType,
        status: input.status,
        user_id: input.userId ?? null,
        api_key_id: input.apiKeyId ?? null,
        request_id: input.requestId ?? null,
        route: input.route ?? null,
        latency_ms: input.latencyMs ?? null,
        status_code: input.statusCode ?? null,
        metadata: (input.metadata ?? {}) as Json,
      })
      if (error) {
        console.error('[ops.logEvent] insert error:', error.message)
      }
    } catch (err) {
      console.error('[ops.logEvent] unexpected error:', err)
    }
  })()

  try {
    waitUntil(promise)
  } catch {
    // Outside Vercel (local dev, scripts) waitUntil throws; the promise
    // still resolves in-process so this branch is safe to swallow.
  }
}

/* ------------------------------------------------------------------ */
/*  startCronRun / finishCronRun                                       */
/* ------------------------------------------------------------------ */

/**
 * Insert a `cron_runs` row in status='running'. Returns the new row id, or
 * null on failure (never throws).
 */
export async function startCronRun(
  workflowName: string,
  metadata: Record<string, unknown> = {},
): Promise<number | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('cron_runs')
      .insert({
        workflow_name: workflowName,
        status: 'running',
        metadata: metadata as Json,
      })
      .select('id')
      .single()
    if (error || !data) {
      console.error('[ops.startCronRun] insert error:', error?.message)
      return null
    }
    return data.id as number
  } catch (err) {
    console.error('[ops.startCronRun] unexpected error:', err)
    return null
  }
}

/**
 * Update an existing cron_runs row with finished_at + final status.
 * Status must be one of 'ok' | 'error' | 'timeout'. Returns true on success.
 */
export async function finishCronRun(
  id: number,
  status: Exclude<CronStatus, 'running'>,
  message?: string | null,
  metadata: Record<string, unknown> = {},
): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('cron_runs')
      .update({
        finished_at: new Date().toISOString(),
        status,
        message: message ?? null,
        metadata: metadata as Json,
      })
      .eq('id', id)
    if (error) {
      console.error('[ops.finishCronRun] update error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('[ops.finishCronRun] unexpected error:', err)
    return false
  }
}

/* ------------------------------------------------------------------ */
/*  trackCron — wrap a cron handler so it self-logs to cron_runs        */
/* ------------------------------------------------------------------ */

export interface CronOutcome {
  /** Final status; defaults to 'ok'. */
  status?: Exclude<CronStatus, 'running'>
  /** Human-readable note shown in /admin/ops. */
  message?: string
  /** Arbitrary run data — e.g. { sent, total, skipped }. */
  metadata?: Record<string, unknown>
}

/**
 * Runs `fn` while recording a cron_runs row (running → ok/error) so the run is
 * visible in /admin/ops with its sent counts. Returns fn's outcome; the route
 * builds its HTTP response from `outcome.metadata`. Never lets logging failures
 * break the cron. Call AFTER the auth check so unauthorized hits aren't logged.
 */
export async function trackCron(
  workflowName: string,
  fn: () => Promise<CronOutcome>,
): Promise<CronOutcome> {
  const id = await startCronRun(workflowName)
  try {
    const outcome = await fn()
    if (id) await finishCronRun(id, outcome.status ?? 'ok', outcome.message ?? null, outcome.metadata ?? {})
    return outcome
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (id) await finishCronRun(id, 'error', msg)
    throw err
  }
}

/* ------------------------------------------------------------------ */
/*  getCronHealth — read-side summary                                  */
/* ------------------------------------------------------------------ */

/**
 * Returns one row per expected workflow in EXPECTED_CRONS, plus any workflow
 * that appears in cron_runs but is not declared. For each workflow:
 *   - last_run_at: most recent started_at
 *   - age_hours: hours since last run (null if no runs yet)
 *   - status: status of last run
 *   - expected_interval_hours: declared cadence
 *
 * Sorted: never-run first, then by oldest age.
 */
export async function getCronHealth(): Promise<CronHealthRow[]> {
  const admin = createAdminClient()

  // Pull the latest 500 rows; that's plenty to compute a per-workflow last_run.
  // For volumes >>500 runs/day the right move is a DB view; flat for now.
  const { data, error } = await admin
    .from('cron_runs')
    .select('workflow_name, started_at, status')
    .order('started_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[ops.getCronHealth] select error:', error.message)
    // Still return the declared list with nulls so the UI shows something.
    return Object.entries(EXPECTED_CRONS).map(([workflow_name, expected_interval_hours]) => ({
      workflow_name,
      last_run_at: null,
      age_hours: null,
      status: null,
      expected_interval_hours,
    }))
  }

  const latestByWorkflow = new Map<string, { started_at: string; status: CronStatus }>()
  for (const row of data ?? []) {
    if (!latestByWorkflow.has(row.workflow_name)) {
      latestByWorkflow.set(row.workflow_name, {
        started_at: row.started_at as string,
        status: row.status as CronStatus,
      })
    }
  }

  const allWorkflows = new Set<string>([
    ...Object.keys(EXPECTED_CRONS),
    ...latestByWorkflow.keys(),
  ])

  const now = Date.now()
  const rows: CronHealthRow[] = Array.from(allWorkflows).map((name) => {
    const latest = latestByWorkflow.get(name)
    const lastRunMs = latest ? new Date(latest.started_at).getTime() : null
    const age_hours = lastRunMs !== null ? (now - lastRunMs) / 3_600_000 : null
    return {
      workflow_name: name,
      last_run_at: latest?.started_at ?? null,
      age_hours: age_hours !== null ? Math.round(age_hours * 10) / 10 : null,
      status: latest?.status ?? null,
      expected_interval_hours: EXPECTED_CRONS[name] ?? 24,
    }
  })

  // Sort: never-run first, then oldest age first.
  rows.sort((a, b) => {
    if (a.age_hours === null && b.age_hours === null) return a.workflow_name.localeCompare(b.workflow_name)
    if (a.age_hours === null) return -1
    if (b.age_hours === null) return 1
    return b.age_hours - a.age_hours
  })

  return rows
}

/**
 * Deja una promesa corriendo después de devolver la respuesta.
 *
 * En Vercel la función se muere apenas responde, así que un `void promesa` suelto
 * se pierde en silencio. Eso ya había pasado con el aviso de lead a la firma: el
 * mail se "mandaba" con `void` y podía no salir nunca sin dejar rastro.
 *
 * Fuera de Vercel (dev, scripts) `waitUntil` tira, y la promesa igual se resuelve
 * en proceso — por eso el catch vacío es seguro.
 */
export function enviarEnSegundoPlano(promesa: Promise<unknown>): void {
  const seguro = promesa.catch((e) => {
    console.error('[enviarEnSegundoPlano] falló:', e)
  })
  try {
    waitUntil(seguro)
  } catch {
    /* dev/scripts: la promesa se resuelve igual en proceso */
  }
}
