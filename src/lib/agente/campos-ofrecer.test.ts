import { describe, expect, it } from 'vitest'
import { ofrecerCampos } from './campos-agente'

// Martes 27-10-2026, 14:00 ART: día hábil, dentro del horario de contactos nuevos.
const ahora = new Date('2026-10-27T17:00:00Z')
const datos = { tipo: 'campo', hectareas: 85, aptitud: 'agrícola', zona: 'Villaguay', provincia: 'Entre Ríos' }
const caso = (o: Record<string, unknown> = {}) => ({ lead_id: 501, lado: 'vende', tandas: 0, estado: 'ofreciendo', datos, ...o })
const firma = (slug: string, email: string, province = 'ENTRE RIOS') => ({ canonical_slug: slug, display_name: slug, email, province })

/** Base falsa: cada tabla devuelve sus filas sin mirar los filtros; registra updates e inserts. */
function dbFalsa(t: { casos: unknown[]; leads: unknown[]; firmas: unknown[]; ofertasDelCaso?: unknown[]; recientes?: unknown[] }) {
  const updates: Array<Record<string, unknown>> = []
  const inserts: unknown[] = []
  const filas: Record<string, unknown[]> = { agente_casos: t.casos, producer_leads: t.leads, consignatarias: t.firmas }
  // agente_ofertas: filtrada por lead_id = las del caso; si no, las de las últimas 24 h.
  const q = (tabla: string) => {
    let porLead = false
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'in', 'order', 'lte', 'gte', 'limit', 'not']) b[m] = () => b
    b.eq = (col: string) => { if (col === 'lead_id') porLead = true; return b }
    b.then = (r: (v: { data: unknown[]; count: number }) => unknown) => {
      const rows = tabla === 'agente_ofertas' ? (porLead ? t.ofertasDelCaso ?? [] : t.recientes ?? []) : filas[tabla] ?? []
      return r({ data: rows, count: rows.length })
    }
    return b
  }
  let id = 900
  const db = {
    from: (tabla: string) => ({
      ...q(tabla),
      update: (row: Record<string, unknown>) => ({ eq: async () => { updates.push({ tabla, ...row }); return { error: null } } }),
      insert: (row: unknown) => { inserts.push(row); return { select: () => ({ single: async () => ({ data: { id: ++id }, error: null }) }) } },
      delete: () => ({ eq: async () => ({ error: null }) }),
    }),
  }
  return { db, updates, inserts }
}

function ctx(db: unknown, bajas: string[] = []) {
  const enviados: string[][] = []
  const avisos: string[] = []
  return {
    enviados,
    avisos,
    c: {
      db: db as never, ahora, dryRun: false, bajas: new Set(bajas),
      mandar: async (o: { para: string[] }) => { enviados.push(o.para); return 'msg-1' },
      bitacora: async () => null,
      avisar: async (titulo: string) => { avisos.push(titulo) },
      nota: () => {},
    },
  }
}

describe('ofrecerCampos', () => {
  const firmas = [firma('firma-a', 'a@example.com'), firma('firma-b', 'b@example.com'), firma('firma-c', 'c@example.com')]

  it('ofrece a 3 firmas de la provincia y suma una tanda', async () => {
    const f = dbFalsa({ casos: [caso()], leads: [{ id: 501, email: 'juan.perez@example.com' }], firmas })
    const x = ctx(f.db)
    await ofrecerCampos(x.c)
    expect(x.enviados).toEqual([['a@example.com'], ['b@example.com'], ['c@example.com']])
    expect(f.updates.at(-1)).toMatchObject({ tabla: 'agente_casos', tandas: 1 })
  })

  it('no ofrece el campo de un dueño dado de baja: lo retira', async () => {
    const f = dbFalsa({ casos: [caso()], leads: [{ id: 501, email: 'juan.perez@example.com' }], firmas })
    const x = ctx(f.db, ['juan.perez@example.com'])
    await ofrecerCampos(x.c)
    expect(x.enviados).toEqual([])
    expect(f.updates).toContainEqual(expect.objectContaining({ estado: 'retirado' }))
  })

  it('no le ofrece al dueño su propio campo aunque figure como firma', async () => {
    const f = dbFalsa({ casos: [caso()], leads: [{ id: 501, email: 'a@example.com' }], firmas })
    const x = ctx(f.db)
    await ofrecerCampos(x.c)
    expect(x.enviados.flat()).not.toContain('a@example.com')
  })

  it('si las firmas que quedan solo esperan la regla de 24 h, reintenta mañana y no escala', async () => {
    const recientes = firmas.map((r) => ({ email: r.email })) // recibieron otra oferta hoy, de otro caso
    const f = dbFalsa({ casos: [caso()], leads: [{ id: 501, email: 'juan.perez@example.com' }], firmas, recientes })
    const x = ctx(f.db)
    await ofrecerCampos(x.c)
    expect(x.enviados).toEqual([])
    expect(x.avisos).toEqual([])
    expect(f.updates).toEqual([expect.objectContaining({ tabla: 'agente_casos', proximo_at: '2026-10-28T17:00:00.000Z' })])
  })

  it('si ya se les ofreció a todas las de la zona, escala', async () => {
    const ofertasDelCaso = firmas.map((r) => ({ email: r.email, estado: 'sin_respuesta' }))
    const f = dbFalsa({ casos: [caso({ tandas: 1 })], leads: [{ id: 501, email: 'juan.perez@example.com' }], firmas, ofertasDelCaso })
    const x = ctx(f.db)
    await ofrecerCampos(x.c)
    expect(x.avisos[0]).toContain('no quedan consignatarias')
  })

  it('al llegar a 3 tandas escala diciendo que se agotaron', async () => {
    const f = dbFalsa({ casos: [caso({ tandas: 3 })], leads: [{ id: 501, email: 'juan.perez@example.com' }], firmas })
    const x = ctx(f.db)
    await ofrecerCampos(x.c)
    expect(x.enviados).toEqual([])
    expect(x.avisos[0]).toContain('se agotaron las 3 tandas')
  })

  it('sin provincia escala con ese motivo', async () => {
    const f = dbFalsa({ casos: [caso({ datos: { ...datos, provincia: null } })], leads: [{ id: 501, email: 'juan.perez@example.com' }], firmas })
    const x = ctx(f.db)
    await ofrecerCampos(x.c)
    expect(x.avisos[0]).toContain('falta la provincia')
  })
})
