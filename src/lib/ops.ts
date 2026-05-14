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
import { waitUntil } from '@vercel/functions'

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

export type OpsEventType =
  | 'api_call'
  | 'webhook_received'
  | 'cron_started'
  | 'cron_finished'
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

export const EXPECTED_CRONS: Record<string, number> = {
  // Daily (24h cadence)
  'scrape-auctions': 24,
  'mag-detailed-prices': 24,
  'mag-lots-pipeline': 24,
  'mag-lots-discover': 24,
  'mag-remitentes': 24,
  'backfill-inmag': 24,
  'backfill-usd': 24,
  'remate-reminders': 24,
  'new-remate-alerts': 24,
  'quota-alerts': 24,
  'post-remate-outreach': 24,
  // Weekly (168h cadence)
  'weekly-newsletter': 168,
  'el-corredor-publish': 168,
  // Monthly (~720h cadence)
  'monthly-metrics': 720,
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
        metadata: input.metadata ?? {},
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
        metadata,
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
        metadata,
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
