import { NextRequest, NextResponse } from 'next/server'
import { requireServiceClient } from '@/lib/supabase'
import { authorizeCron } from '@/lib/cron-auth'
import {
  VENTANA_AUTOCURADO_DIAS,
  diasConLotesFaltantes,
  fechaDeRueda,
  restarDias,
  type DiaInmag,
} from '@/lib/mag-lots-rueda'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

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

/**
 * La fecha de hoy en BUENOS AIRES, no en UTC.
 *
 * Mismo bug que tumbó el INMAG en agosto, en otro cron. El workflow está agendado 22:42
 * UTC (19:42 ART), pero GitHub Actions lo retrasa seguido: las cargas sanas tienen
 * `scraped_at` ~23:05 UTC y las vacías ~00:36-00:53 UTC. Pasada la medianoche UTC,
 * `toISOString()` devuelve el día SIGUIENTE en Argentina —una fecha sin rueda— así que la
 * cola se arma para un día que no existe, los 128 items se procesan, devuelven cero filas
 * y se marcan `done` sin error.
 *
 * Efecto medido al 17-sep-2026: `mag_consignataria_sales_lots` venía de 241/324/286/400
 * filas por rueda hasta el 25-ago y desde el 26 quedó en CERO durante diez ruedas
 * seguidas, con dos días de 2 filas de residuo. Tres semanas con el workflow en verde.
 * Esa tabla alimenta `/api/lots`, uno de los dos endpoints Enterprise pagos: se estuvo
 * ofreciendo acceso a un feed vacío.
 *
 * Desde v1.261.3 el encolado por defecto NO usa esto sino `fechaDeRueda()` (lib/mag-lots-rueda):
 * con atrasos de más de 4h18 la corrida arrancaba pasada la medianoche ART y volvía a
 * encolar el día siguiente. Queda solo para `discover`, que no depende de la fecha.
 */
function todayIso(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  })
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
  return (
    s
      .replace(/&nbsp;/g, ' ')
      .replace(/&aacute;/gi, 'á')
      .replace(/&eacute;/gi, 'é')
      .replace(/&iacute;/gi, 'í')
      .replace(/&oacute;/gi, 'ó')
      .replace(/&uacute;/gi, 'ú')
      .replace(/&ntilde;/gi, 'ñ')
      /**
       * La Ñ que el ORIGEN ya sirve rota.
       *
       * `ï¿½` son los bytes EF BF BD —el carácter de reemplazo U+FFFD— leídos como
       * Latin-1. No es un error de nuestro decoder: el MAG ya publica ese reemplazo, así
       * que ninguna elección de encoding lo arregla y hay que repararlo acá.
       *
       * En la práctica siempre es una Ñ: CAÑUELAS, CHAÑAR LADEADO, PEÑA, VILLA CAÑÁS,
       * CARCARAÑÁ, CAÑADA DE GÓMEZ. Sin esto, CAÑUELAS entra como una localidad distinta
       * de sí misma y el cruce con el padrón de partidos la pierde.
       */
      .replace(/ï¿½|�/g, 'Ñ')
      .replace(/\s+/g, ' ')
      .trim()
  )
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
type Supa = ReturnType<typeof requireServiceClient>

async function listarConsigsActivas(supabase: Supa): Promise<number[]> {
  const { data: consigs, error } = await supabase
    .from('mag_consignatarias')
    .select('mag_id')
    .eq('active', true)
  if (error) throw new Error(`list_consigs: ${error.message}`)
  return (consigs ?? []).map((c) => c.mag_id as number)
}

/** Idempotente: ignoreDuplicates deja intactos los jobs que ya existen (done o no). */
async function encolarFecha(supabase: Supa, date: string, consigIds: number[]): Promise<number> {
  const jobs: Array<{ date: string; mag_consignataria_id: number; tipo: string; status: string }> = []
  for (const id of consigIds) {
    for (const tipo of ['FAENA', 'INVERNADA']) {
      jobs.push({ date, mag_consignataria_id: id, tipo, status: 'pending' })
    }
  }
  const { error: insertErr } = await supabase
    .from('mag_scrape_queue')
    .upsert(jobs, { onConflict: 'date,mag_consignataria_id,tipo', ignoreDuplicates: true })
  if (insertErr) throw new Error(`enqueue: ${insertErr.message}`)
  return jobs.length
}

async function actionEnqueue(date: string) {
  const supabase = requireServiceClient()
  const consigIds = await listarConsigsActivas(supabase)
  if (consigIds.length === 0) {
    return { date, enqueued: 0, note: 'No active consignatarias. Run ?action=discover first.' }
  }
  const enqueued = await encolarFecha(supabase, date, consigIds)
  return { date, enqueued, active_consignatarias: consigIds.length }
}

/**
 * Encolado POR DEFECTO (sin `date`): la rueda de `fechaDeRueda()` + autocurado.
 *
 * Autocurado: el upsert con ignoreDuplicates hace que una fecha que quedó `done` vacía
 * (cola armada antes de que el MAG publicara, o para el día equivocado) no se reprocese
 * nunca. Acá, para cada día de la ventana con INMAG con cabezas y lotes faltantes
 * (`diasConLotesFaltantes`), se encola lo que falte y se vuelven a `pending` SOLO los
 * jobs de ese día que quedaron `done` con 0/null filas. Un job que trajo filas no se
 * toca, y los lotes se upsertean por su clave natural, así que reprocesar no duplica.
 * Costo acotado: un día que el MAG publique de verdad con pocos lotes se reintenta
 * como mucho durante la ventana.
 *
 * `-f date=` y `backfill_month` NO pasan por acá: siguen encolando su fecha tal cual.
 */
async function actionEnqueueDefault(now: Date, ventanaDias: number) {
  const supabase = requireServiceClient()
  const rueda = fechaDeRueda(now)
  const desde = restarDias(rueda, ventanaDias - 1)
  const consigIds = await listarConsigsActivas(supabase)
  if (consigIds.length === 0) {
    return { date: rueda, enqueued: 0, note: 'No active consignatarias. Run ?action=discover first.' }
  }
  const enqueued = await encolarFecha(supabase, rueda, consigIds)

  const { data: inmag, error: inmagErr } = await supabase
    .from('mag_inmag_history')
    .select('date, head_count')
    .gte('date', desde)
    .lte('date', rueda)
    .gt('head_count', 0)
  if (inmagErr) throw new Error(`autocurado_inmag: ${inmagErr.message}`)

  const lotesPorFecha: Record<string, number> = {}
  for (const d of (inmag ?? []) as DiaInmag[]) {
    const { data: lots, error: lotsErr } = await supabase
      .from('mag_consignataria_sales_lots')
      .select('head_count')
      .eq('date', d.date)
      .range(0, 999)
    if (lotsErr) throw new Error(`autocurado_lots ${d.date}: ${lotsErr.message}`)
    // 1000 filas = el tope de PostgREST: el día está lejos de faltante, no hace falta la suma exacta.
    lotesPorFecha[d.date] =
      (lots ?? []).length >= 1000
        ? Number.POSITIVE_INFINITY
        : (lots ?? []).reduce((acc, l) => acc + ((l.head_count as number | null) ?? 0), 0)
  }

  const reencoladas: Array<{
    date: string
    inmag_cabezas: number
    lotes_cabezas: number
    jobs_reseteados: number
  }> = []
  for (const f of diasConLotesFaltantes((inmag ?? []) as DiaInmag[], lotesPorFecha)) {
    if (f.date !== rueda) await encolarFecha(supabase, f.date, consigIds)
    const { data: reset, error: resetErr } = await supabase
      .from('mag_scrape_queue')
      .update({ status: 'pending', attempts: 0, completed_at: null, rows_inserted: null, last_error: null })
      .eq('date', f.date)
      .eq('status', 'done')
      .or('rows_inserted.is.null,rows_inserted.eq.0')
      .select('id')
    if (resetErr) throw new Error(`autocurado_reset ${f.date}: ${resetErr.message}`)
    const jobsReseteados = (reset ?? []).length
    // La rueda del día casi siempre "falta" (sus jobs recién se encolan): solo se informa
    // si de verdad hubo que resetear algo, para que la lista sea la de días curados.
    if (f.date !== rueda || jobsReseteados > 0) reencoladas.push({ ...f, jobs_reseteados: jobsReseteados })
  }

  return {
    date: rueda,
    enqueued,
    active_consignatarias: consigIds.length,
    autocurado: {
      desde,
      hasta: rueda,
      dias_con_inmag: (inmag ?? []).length,
      reencoladas,
    },
  }
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
    // Newest-first: el mercado reciente (lo que alimenta el pulso "en vivo" y el
    // intel) se scrapea primero; el histórico viejo se backfillea después.
    .order('date', { ascending: false })
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

/* ============================================================
   Process BATCH: drena varios jobs en una sola llamada, con un delay
   corto entre hits al MAG (el 1 req/min era precaución, no un acuerdo).
   Así el runner hace pocas llamadas y la cola de un día entra en el
   límite de 3h de GH Actions. Corta por count, por presupuesto de
   tiempo (margen bajo maxDuration) o por cola vacía.
   ============================================================ */
async function actionProcessBatch(count: number, delayMs: number, budgetMs: number) {
  const started = Date.now()
  let processed = 0
  let failed = 0
  let rowsInserted = 0
  let remaining = 0
  let iterations = 0
  for (let i = 0; i < count; i++) {
    const r = await actionProcessOne()
    iterations++
    remaining = (r.remaining as number) ?? 0
    processed += (r.processed as number) ?? 0
    rowsInserted += (r.rows_inserted as number) ?? 0
    if (r.failed_job) failed++
    // Cola vacía (no procesó nada y no queda nada pendiente) → cortar.
    if (((r.processed as number) ?? 0) === 0 && remaining === 0) break
    // Presupuesto de tiempo: dejar margen bajo maxDuration (300s).
    if (Date.now() - started > budgetMs) break
    if (i < count - 1) await new Promise((res) => setTimeout(res, delayMs))
  }
  return { processed, failed, rows_inserted: rowsInserted, remaining, iterations }
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
      const date = searchParams.get('date')
      if (date === null || date === '') {
        // Sin fecha: la rueda la decide fechaDeRueda() (no "hoy al arrancar") + autocurado.
        // `ventana` (1-31, default 7) existe para ponerse al día a mano sin UPDATEs.
        const ventana = Math.max(
          1,
          Math.min(31, parseInt(searchParams.get('ventana') ?? '', 10) || VENTANA_AUTOCURADO_DIAS),
        )
        const result = await actionEnqueueDefault(new Date(), ventana)
        return NextResponse.json({ ok: true, action, ...result })
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: 'invalid_date' }, { status: 400 })
      }
      const result = await actionEnqueue(date)
      return NextResponse.json({ ok: true, action, ...result })
    }
    if (action === 'process') {
      const count = Math.max(1, Math.min(2000, parseInt(searchParams.get('count') ?? '1', 10) || 1))
      const delayMs = Math.max(0, Math.min(65000, parseInt(searchParams.get('delay') ?? '3000', 10) || 3000))
      if (count === 1) {
        const result = await actionProcessOne()
        return NextResponse.json({ ok: true, action, ...result })
      }
      const result = await actionProcessBatch(count, delayMs, 260_000)
      return NextResponse.json({ ok: true, action, count, delayMs, ...result })
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
