import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Encolado del worker de lotes: fecha de rueda por defecto + autocurado acotado.
// Supabase en memoria: cada tabla es un array y el builder filtra como PostgREST.
type Row = Record<string, unknown>
const { db } = vi.hoisted(() => ({ db: { tables: {} as Record<string, Row[]> } }))

vi.mock('@/lib/cron-auth', () => ({ authorizeCron: () => true }))
vi.mock('@/lib/supabase', () => ({
  requireServiceClient: () => ({
    from: (table: string) => {
      const rows = () => (db.tables[table] ??= [])
      const filtros: Array<(r: Row) => boolean> = []
      let op: 'select' | 'update' | 'upsert' = 'select'
      let patch: Row = {}
      let upsertRows: Row[] = []
      let rango: [number, number] | null = null
      const b: Record<string, unknown> = {}
      b.select = () => b
      b.eq = (c: string, v: unknown) => (filtros.push((r) => r[c] === v), b)
      b.gte = (c: string, v: string) => (filtros.push((r) => String(r[c]) >= v), b)
      b.lte = (c: string, v: string) => (filtros.push((r) => String(r[c]) <= v), b)
      b.gt = (c: string, v: number) => (filtros.push((r) => Number(r[c]) > v), b)
      b.range = (a: number, z: number) => ((rango = [a, z]), b)
      // Solo la forma que usa el route: 'rows_inserted.is.null,rows_inserted.eq.0'.
      b.or = () => (filtros.push((r) => r.rows_inserted == null || r.rows_inserted === 0), b)
      b.update = (p: Row) => ((op = 'update'), (patch = p), b)
      b.upsert = (rs: Row[]) => ((op = 'upsert'), (upsertRows = rs), b)
      b.then = (res: (v: unknown) => void) => {
        if (op === 'upsert') {
          // ignoreDuplicates por (date, consig, tipo).
          const key = (r: Row) => `${r.date}|${r.mag_consignataria_id}|${r.tipo}`
          const ya = new Set(rows().map(key))
          for (const r of upsertRows) if (!ya.has(key(r))) rows().push({ rows_inserted: null, ...r })
          return res({ error: null })
        }
        let hit = rows().filter((r) => filtros.every((f) => f(r)))
        if (op === 'update') {
          hit.forEach((r) => Object.assign(r, patch))
          return res({ data: hit.map((r) => ({ id: r.id })), error: null })
        }
        if (rango) hit = hit.slice(rango[0], rango[1] + 1)
        return res({ data: hit, error: null })
      }
      return b
    },
  }),
}))

import { POST } from './route'

const req = (qs: string) =>
  ({ url: `https://x.test/api/cron/mag-lots-worker?${qs}`, headers: new Headers() }) as unknown as import('next/server').NextRequest

function jobsDone(date: string, rows: number[]) {
  return rows.map((n, i) => ({
    id: `${date}-${i}`,
    date,
    mag_consignataria_id: Math.floor(i / 2) + 1,
    tipo: i % 2 ? 'INVERNADA' : 'FAENA',
    status: 'done',
    rows_inserted: n,
  }))
}

beforeEach(() => {
  db.tables = {
    mag_consignatarias: [{ mag_id: 1, active: true }, { mag_id: 2, active: true }],
    mag_scrape_queue: [],
    mag_inmag_history: [],
    mag_consignataria_sales_lots: [],
  }
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('enqueue sin fecha', () => {
  it('runner atrasado a las 00:30 BA encola la rueda de AYER, no el día sin rueda', async () => {
    vi.setSystemTime(new Date('2026-11-18T00:30:00-03:00'))
    const body = await (await POST(req('action=enqueue'))).json()
    expect(body.date).toBe('2026-11-17')
    expect(body.enqueued).toBe(4)
    expect(new Set(db.tables.mag_scrape_queue.map((r) => r.date))).toEqual(new Set(['2026-11-17']))
  })

  it('autocurado: resetea SOLO los done vacíos de un día con INMAG y sin lotes, y lo informa', async () => {
    vi.setSystemTime(new Date('2026-11-20T19:42:00-03:00'))
    db.tables.mag_inmag_history = [
      { date: '2026-11-18', head_count: 3985 }, // residuo de 1 cabeza → faltante
      { date: '2026-11-17', head_count: 10286 }, // cero lotes → faltante
      { date: '2026-11-13', head_count: 5331 }, // sano → no se toca
      { date: '2026-11-12', head_count: 2491 }, // fuera de la ventana de 7 días
    ]
    db.tables.mag_consignataria_sales_lots = [
      { date: '2026-11-18', head_count: 1 },
      ...Array.from({ length: 200 }, () => ({ date: '2026-11-13', head_count: 10 })),
    ]
    db.tables.mag_scrape_queue = [
      ...jobsDone('2026-11-18', [0, 1, null as unknown as number, 0]),
      ...jobsDone('2026-11-13', [0, 5, 0, 7]),
      ...jobsDone('2026-11-12', [0, 0, 0, 0]),
    ]
    const body = await (await POST(req('action=enqueue'))).json()

    expect(body.date).toBe('2026-11-20')
    expect(body.autocurado.desde).toBe('2026-11-14')
    expect(body.autocurado.reencoladas).toEqual([
      { date: '2026-11-17', inmag_cabezas: 10286, lotes_cabezas: 0, jobs_reseteados: 0 },
      { date: '2026-11-18', inmag_cabezas: 3985, lotes_cabezas: 1, jobs_reseteados: 3 },
    ])
    const st = (d: string) => db.tables.mag_scrape_queue.filter((r) => r.date === d).map((r) => r.status)
    // 18/11: el job que trajo 1 fila sigue done; los otros tres vuelven a pending.
    expect(st('2026-11-18').sort()).toEqual(['done', 'pending', 'pending', 'pending'])
    // 17/11 nunca se había encolado: ahora tiene sus 4 jobs.
    expect(st('2026-11-17')).toEqual(['pending', 'pending', 'pending', 'pending'])
    // El día sano y el de fuera de la ventana quedan intactos.
    expect(st('2026-11-13')).toEqual(['done', 'done', 'done', 'done'])
    expect(st('2026-11-12')).toEqual(['done', 'done', 'done', 'done'])
  })

  it('ventana=16 alcanza las ruedas viejas (ponerse al día sin UPDATEs a mano)', async () => {
    vi.setSystemTime(new Date('2026-11-20T19:42:00-03:00'))
    db.tables.mag_inmag_history = [{ date: '2026-11-05', head_count: 2512 }]
    const body = await (await POST(req('action=enqueue&ventana=16'))).json()
    expect(body.autocurado.reencoladas.map((r: { date: string }) => r.date)).toEqual(['2026-11-05'])
  })
})

describe('enqueue con fecha explícita (sin cambios)', () => {
  it('encola esa fecha tal cual, sin autocurado ni reset', async () => {
    vi.setSystemTime(new Date('2026-11-20T03:00:00-03:00'))
    db.tables.mag_inmag_history = [{ date: '2026-11-18', head_count: 3985 }]
    db.tables.mag_scrape_queue = jobsDone('2026-11-18', [0, 0, 0, 0])
    const body = await (await POST(req('action=enqueue&date=2026-11-18'))).json()
    expect(body).toEqual({ ok: true, action: 'enqueue', date: '2026-11-18', enqueued: 4, active_consignatarias: 2 })
    expect(db.tables.mag_scrape_queue.every((r) => r.status === 'done')).toBe(true)
  })
  it('fecha inválida → 400', async () => {
    const res = await POST(req('action=enqueue&date=18-11-2026'))
    expect(res.status).toBe(400)
  })
})
