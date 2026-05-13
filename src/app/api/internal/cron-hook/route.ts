import { NextRequest, NextResponse } from 'next/server'
import { startCronRun, finishCronRun, logEvent } from '@/lib/ops'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/internal/cron-hook
 *
 * Internal webhook for GH Actions workflows to report start/finish of runs.
 * Populates `cron_runs` (read by /admin/ops cron health table).
 *
 * NOT WIRED YET FROM WORKFLOWS — v1.15 will add the calls from
 * `.github/workflows/*.yml` (typically a final step that POSTs here on success
 * or on failure with `if: always()`).
 *
 * Auth: bearer token via `Authorization: Bearer <INTERNAL_API_SECRET>`.
 *
 * Body:
 *   {
 *     "workflow_name": "scrape-auctions",
 *     "phase": "start" | "finish",
 *     "run_id": 12345,                 // required for phase=finish (returned by phase=start)
 *     "status": "ok" | "error" | "timeout",   // required for phase=finish
 *     "message": "optional human-readable note",
 *     "metadata": { "any": "json" }
 *   }
 *
 * Example workflow snippet (for v1.15):
 *
 *   - name: Notify cron-hook (start)
 *     id: cronstart
 *     run: |
 *       RUN_ID=$(curl -s -X POST "$BASE_URL/api/internal/cron-hook" \
 *         -H "Authorization: Bearer $INTERNAL_API_SECRET" \
 *         -H "Content-Type: application/json" \
 *         -d '{"workflow_name":"scrape-auctions","phase":"start"}' \
 *         | jq -r .run_id)
 *       echo "run_id=$RUN_ID" >> $GITHUB_OUTPUT
 *
 *   - name: Notify cron-hook (finish)
 *     if: always()
 *     run: |
 *       STATUS="ok"
 *       [ "${{ job.status }}" != "success" ] && STATUS="error"
 *       curl -s -X POST "$BASE_URL/api/internal/cron-hook" \
 *         -H "Authorization: Bearer $INTERNAL_API_SECRET" \
 *         -H "Content-Type: application/json" \
 *         -d "{\"workflow_name\":\"scrape-auctions\",\"phase\":\"finish\",\"run_id\":${{ steps.cronstart.outputs.run_id }},\"status\":\"$STATUS\"}"
 */

const SECRET = process.env.INTERNAL_API_SECRET

function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
}

export async function POST(req: NextRequest) {
  if (!SECRET) {
    return NextResponse.json(
      { error: 'not_configured', message: 'INTERNAL_API_SECRET not set on server.' },
      { status: 503 },
    )
  }

  const header = req.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null
  if (!token || token !== SECRET) return unauthorized()

  let body: {
    workflow_name?: string
    phase?: 'start' | 'finish'
    run_id?: number
    status?: 'ok' | 'error' | 'timeout'
    message?: string | null
    metadata?: Record<string, unknown>
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { workflow_name, phase, run_id, status, message, metadata = {} } = body

  if (!workflow_name || typeof workflow_name !== 'string') {
    return NextResponse.json({ error: 'missing_workflow_name' }, { status: 400 })
  }

  if (phase === 'start') {
    const id = await startCronRun(workflow_name, metadata)
    if (id === null) {
      return NextResponse.json({ error: 'db_insert_failed' }, { status: 500 })
    }
    void logEvent({
      eventType: 'cron_started',
      status: 'ok',
      route: '/api/internal/cron-hook',
      metadata: { workflow_name, run_id: id, ...metadata },
    })
    return NextResponse.json({ ok: true, run_id: id })
  }

  if (phase === 'finish') {
    if (typeof run_id !== 'number') {
      return NextResponse.json({ error: 'missing_run_id' }, { status: 400 })
    }
    if (status !== 'ok' && status !== 'error' && status !== 'timeout') {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
    }
    const updated = await finishCronRun(run_id, status, message ?? null, metadata)
    if (!updated) {
      return NextResponse.json({ error: 'db_update_failed' }, { status: 500 })
    }
    void logEvent({
      eventType: 'cron_finished',
      status: status === 'ok' ? 'ok' : status === 'timeout' ? 'timeout' : 'error',
      route: '/api/internal/cron-hook',
      metadata: { workflow_name, run_id, message, ...metadata },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'invalid_phase', expected: ['start', 'finish'] }, { status: 400 })
}
