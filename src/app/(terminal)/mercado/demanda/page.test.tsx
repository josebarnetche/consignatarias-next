/**
 * /mercado/demanda se renderiza sin base, con la base vacía y con datos, y el
 * HTML público nunca lleva datos de un lead. Base simulada: no toca producción.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

let LEADS: Record<string, unknown>[] | null = []

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {} }), usePathname: () => '/mercado/demanda', useSearchParams: () => new URLSearchParams() }))
vi.mock('@/lib/supabase', () => ({
  createServiceClient: () => (LEADS === null ? null : {
    from: () => {
      const b: Record<string, unknown> = {}
      for (const m of ['select', 'order', 'eq', 'gte', 'in']) b[m] = () => b
      b.limit = async () => ({ data: LEADS, error: null })
      b.then = (res: (v: unknown) => void) => res({ data: LEADS, error: null })
      return b
    },
  }),
}))

const lead = (id: number, p: Record<string, unknown>) => ({
  id, created_at: new Date().toISOString(), intent: 'comprar', category: 'terneros', head_count: 40 + id, hectareas: null,
  province: 'Santa Fe', status: 'new', source: null, name: 'Nombre Secreto', email: 'secreto@x.com', phone: '3415559999', zona: 'Rafaela', ...p,
})

async function render() {
  const { default: Page } = await import('./page')
  return renderToStaticMarkup(await Page())
}

describe('/mercado/demanda', () => {
  beforeEach(() => { LEADS = [] })

  it('sin Supabase (build) se renderiza vacía', async () => {
    LEADS = null
    expect(await render()).toContain('Demanda de hacienda y campos hoy')
  })

  it('las anclas #hacienda y #campos existen aunque no haya grupos', async () => {
    const html = await render()
    expect(html).toContain('id="hacienda"')
    expect(html).toContain('id="campos"')
  })

  it('con datos muestra los grupos y nunca datos de un lead', async () => {
    LEADS = [lead(1, {}), lead(2, {}), lead(3, {}), lead(4, { source: 'mcp:market_match' })]
    const html = await render()
    expect(html).toMatch(/Entre 2 y 4 compradores buscando terneros en la zona núcleo/)
    expect(html).not.toMatch(/cabezas</)
    expect(html).not.toMatch(/Nombre Secreto|secreto@x\.com|3415559999|Rafaela|Santa Fe/)
  })
})
