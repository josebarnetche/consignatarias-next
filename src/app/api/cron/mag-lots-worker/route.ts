import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { authorizeCron } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * Lote-level scraper worker for MAG haciinfo000007.
 *
 * Modes (?action=):
 *   discover  — scan LisConsignatario IDs 1..N, upsert master (mag_consignatarias)
 *   enqueue   — create queue rows for date × all active consignatarias × {FAENA,INVERNADA}
 *   process   — pull ONE pending queue row, fetch + parse + insert lots, mark done
 *
 * Auth: x-cron-secret or ?secret=.
 *
 * Designed so the GH Actions runner can loop `process` 88+ times with sleeps
 * matching MAG's 1 req/min agreement (the runner does the throttling, not us).
 */

const USER_AGENT = 'consignatarias.com.ar scraper (contact: agro@memola.com.ar)'
const URL_007 = 'https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000007'

function ddmmyyyy(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function parseInt2(s: string | undefined | null): number | null {
  if (!s) return null
  const cleaned = s.replace(/[^\d-]/g, '')
  const v = parseInt(cleaned, 10)
  return Number.isFinite(v) ? v : null
}

function parseNumberEs(s: string | undefined | null): number | null {
  if (!s) return null
  const cleaned = s
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
  const v = parseFloat(cleaned)
  return Number.isFinite(v) ? v : null
}

function decodeMagText(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parses "CONSIGNATARIO: 50 ASOC. DE COOP. ARGENTINAS C.L. ... TIPO: FAENA" */
function extractConsignatariaInfo(html: string): { id: number; name: string | null } | null {
  const m = html.match(/CONSIGNATARIO:\s*(\d+)\s+([^<]*?)(?:&nbsp;){2,}/i)
  if (!m) return null
  const id = parseInt(m[1], 10)
  if (!Number.isFinite(id)) return null
  const rawName = decodeMagText(m[2])
  const name = rawName && rawName !== id.toString() ? rawName : null
  return { id, name }
}

interface ParsedLot {
  pesada: number | null
  remitente: string
  localidad: string | null
  provincia: string | null
  head_count: number | null
  category: string | null
  total_kgs: number | null
  kg_avg: number | null
  price: number | null
}

/** Parse data rows from haciinfo000007 response. */
function parseLots(html: string): ParsedLot[] {
  // Data row signature: TR with 10 TDs, first TD has <A> with onclick (pesada link).
  // Skip header rows (those have <TH>) and total rows (those start with bold Totales).
  const rows: ParsedLot[] = []
  const trMatches = html.matchAll(
    /<TR VAlign="Middle"[^>]*>\s*<TD Align="Right">\s*<A[^>]+>([^<]*)<\/[Aa]>\s*<\/TD>\s*<TD[^>]*>\s*<\/TD>\s*<TD[^>]*>([^<]*)<\/TD>\s*<TD[^>]*>([^<]*)<\/TD>\s*<TD[^>]*>([^<]*)<\/TD>\s*<TD[^>]*>([^<]*)<\/TD>\s*<TD[^>]*>([^<]*)<\/TD>\s*<TD[^>]*>([^<]*)<\/TD>\s*<TD[^>]*>([^<]*)<\/TD>\s*<TD[^>]*>([^<]*)<\/TD>/gi,
  )
  for (const m of trMatches) {
    const [, pesadaS, remitenteS, localidadS, provS, cabezasS, categoryS, kgsS, kgAvgS, priceS] = m
    const remitente = decodeMagText(remitenteS)
    if (!remitente || remitente.toLowerCase().includes('total')) continue
    rows.push({
      pesada: parseInt2(pesadaS),
      remitente,
      localidad: decodeMagText(localidadS) || null,
      provincia: decodeMagText(provS) || null,
      head_count: parseInt2(cabezasS),
      category: decodeMagText(categoryS) || null,
      total_kgs: parseNumberEs(kgsS),
      kg_avg: parseNumberEs(kgAvgS),
      price: parseNumberEs(priceS),
    })
  }
  return rows
}

async function fetchLotPage(date: string, magId: number, tipo: 'FAENA' | 'INVERNADA') {
  const dateMag = ddmmyyyy(date)
  // haciinfo000007 usa txtFECHA (fecha única), lisConsignatario (minúscula) y
  // lisTipo numérico (1=FAENA, 2=INVERNADA). Los nombres viejos (txtFECHAINI/FIN,
  // LisConsignatario mayúscula, txtTipo=palabra) eran de 000008 → el DLL los
  // ignoraba y devolvía el default (hoy, sin consignatario) → 0 filas parseadas.
  const lisTipo = tipo === 'FAENA' ? 1 : 2
  const url =
    `${URL_007}?txtFECHA=${encodeURIComponent(dateMag)}` +
    `&lisConsignatario=${magId}&lisTipo=${lisTipo}&CP=&LISTADO=SI`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  // El MAG sirve ISO-8859-1 (Latin-1). res.text() asume UTF-8 y rompe ñ/á/é
  // en los nombres de remitente (ej. "CABAÑAS" → "CABA�AS"). Decodificar Latin-1.
  const buf = await res.arrayBuffer()
  return new TextDecoder('iso-8859-1').decode(buf)
}

/* ============================================================
   Discover: scan a WINDOW of IDs, build mag_consignatarias master.
   Designed to be called repeatedly from a loop runner with delays.
   Caller iterates start=1,21,41,... with count=20.
   ============================================================ */
async function actionDiscover(startId: number, count: number) {
  const supabase = requireServiceClient()
  const today = todayIso()
  const endId = startId + count - 1
  const out = {
    range: { from: startId, to: endId },
    scanned: 0,
    active_found: 0,
    upserted: 0,
    errors: [] as Array<{ id: number; error: string }>,
  }
  for (let id = startId; id <= endId; id++) {
    out.scanned++
    let html: string
    try {
      html = await fetchLotPage(today, id, 'FAENA')
    } catch (err) {
      out.errors.push({ id, error: err instanceof Error ? err.message : 'fetch_failed' })
      continue
    }
    const info = extractConsignatariaInfo(html)
    if (!info) continue
    if (!info.name) continue // numeric-only IDs are inactive/orphan
    out.active_found++

    const { error } = await supabase.from('mag_consignatarias').upsert(
      [
        {
          mag_id: info.id,
          name: info.name,
          last_seen_at: new Date().toISOString(),
          active: true,
        },
      ],
      { onConflict: 'mag_id' },
    )
    if (error) out.errors.push({ id, error: `upsert: ${error.message}` })
    else out.upserted++
  }
  return out
}

/* ============================================================
   Enqueue: create pending jobs for date × consig × tipo
   ============================================================ */
async function actionEnqueue(date: string) {
  const supabase = requireServiceClient()
  const { data: consigs, error } = await supabase
    .from('mag_consignatarias')
    .select('mag_id')
    .eq('active', true)
  if (error) throw new Error(`list_consigs: ${error.message}`)
  if (!consigs || consigs.length === 0) {
    return { date, enqueued: 0, note: 'No active consignatarias. Run ?action=discover first.' }
  }

  const jobs: Array<{ date: string; mag_consignataria_id: number; tipo: string; status: string }> = []
  for (const c of consigs) {
    for (const tipo of ['FAENA', 'INVERNADA']) {
      jobs.push({ date, mag_consignataria_id: c.mag_id as number, tipo, status: 'pending' })
    }
  }

  const { error: insertErr } = await supabase
    .from('mag_scrape_queue')
    .upsert(jobs, { onConflict: 'date,mag_consignataria_id,tipo', ignoreDuplicates: true })

  if (insertErr) throw new Error(`enqueue: ${insertErr.message}`)
  return { date, enqueued: jobs.length, active_consignatarias: consigs.length }
}

/* ============================================================
   Process: pull 1 pending job, fetch + parse + insert
   ============================================================ */
async function actionProcessOne() {
  const supabase = requireServiceClient()

  // Atomically pick a pending job (best-effort: separate select+update)
  const { data: jobs } = await supabase
    .from('mag_scrape_queue')
    .select('id, date, mag_consignataria_id, tipo')
    .eq('status', 'pending')
    .order('enqueued_at', { ascending: true })
    .limit(1)

  if (!jobs || jobs.length === 0) {
    const { count } = await supabase
      .from('mag_scrape_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    return { processed: 0, remaining: count ?? 0 }
  }

  const job = jobs[0]
  // Mark running (best effort — concurrent runners would race here; OK for v1)
  await supabase
    .from('mag_scrape_queue')
    .update({ status: 'running', attempts: 0 })
    .eq('id', job.id as number)

  let html: string
  try {
    html = await fetchLotPage(
      job.date as string,
      job.mag_consignataria_id as number,
      job.tipo as 'FAENA' | 'INVERNADA',
    )
  } catch (err) {
    await supabase
      .from('mag_scrape_queue')
      .update({
        status: 'failed',
        last_error: err instanceof Error ? err.message : 'fetch_failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id as number)
    // Incluir remaining: sin él, el runner (que lee d.remaining) lo toma como 0
    // y corta el loop entero por un solo job fallado.
    const { count: remFetch } = await supabase
      .from('mag_scrape_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    return { processed: 0, failed_job: job.id, error: 'fetch_failed', remaining: remFetch ?? 0 }
  }

  const lots = parseLots(html)
  let rowsInserted = 0
  if (lots.length > 0) {
    const records = lots.map((l) => ({
      date: job.date,
      mag_consignataria_id: job.mag_consignataria_id,
      tipo: job.tipo,
      ...l,
    }))
    const { error: insertErr, count } = await supabase
      .from('mag_consignataria_sales_lots')
      .upsert(records, {
        onConflict: 'date,mag_consignataria_id,tipo,pesada,remitente,category',
        ignoreDuplicates: false,
        count: 'exact',
      })
    if (insertErr) {
      await supabase
        .from('mag_scrape_queue')
        .update({
          status: 'failed',
          last_error: `insert: ${insertErr.message}`,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id as number)
      const { count: remIns } = await supabase
        .from('mag_scrape_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      return { processed: 0, failed_job: job.id, error: insertErr.message, remaining: remIns ?? 0 }
    }
    rowsInserted = count ?? records.length
  }

  await supabase
    .from('mag_scrape_queue')
    .update({
      status: 'done',
      completed_at: new Date().toISOString(),
      rows_inserted: rowsInserted,
    })
    .eq('id', job.id as number)

  const { count: remaining } = await supabase
    .from('mag_scrape_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  return {
    processed: 1,
    job_id: job.id,
    date: job.date,
    consig_id: job.mag_consignataria_id,
    tipo: job.tipo,
    rows_inserted: rowsInserted,
    remaining: remaining ?? 0,
  }
}

export async function POST(req: NextRequest) {
  // Fail CLOSED in every environment. The previous check only enforced the
  // secret when NODE_ENV === 'production', leaving DB writes + outbound
  // scraping unauthenticated in any non-prod/preview runtime.
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') ?? 'process'

  try {
    if (action === 'discover') {
      const start = Math.max(1, parseInt(searchParams.get('start') ?? '1', 10) || 1)
      const count = Math.max(1, Math.min(30, parseInt(searchParams.get('count') ?? '20', 10) || 20))
      const result = await actionDiscover(start, count)
      return NextResponse.json({ ok: true, action, ...result })
    }
    if (action === 'enqueue') {
      const date = searchParams.get('date') ?? todayIso()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: 'invalid_date' }, { status: 400 })
      }
      const result = await actionEnqueue(date)
      return NextResponse.json({ ok: true, action, ...result })
    }
    if (action === 'process') {
      const result = await actionProcessOne()
      return NextResponse.json({ ok: true, action, ...result })
    }
    return NextResponse.json({ error: 'unknown_action', actions: ['discover', 'enqueue', 'process'] }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: 'worker_failed', message: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}

export const GET = POST
