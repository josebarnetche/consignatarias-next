/* Observed prices reported by the consignataria for a given auction.
   Server-rendered (crawlable + citable). Named source, honest framing:
   the firm declares a min/max range per category; we surface the range and
   its midpoint as a reference — never as a weighted average we didn't compute. */
import promediosData from '@/lib/data/remate-promedios.json'

type Categoria = { label: string; segmento: 'faena' | 'invernada' | 'cria'; min: number; max: number }
type Remate = {
  fecha: string
  feria?: string
  plaza: string
  provincia: string
  totalCabezas?: number
  ingresoGordo?: number
  ingresoInvernada?: number
  proximoRemate?: string
  categorias: Categoria[]
}
type Entry = { fuente: string; remates: Remate[] }

const SEGMENTO_LABEL: Record<Categoria['segmento'], string> = {
  invernada: 'Invernada',
  faena: 'Faena',
  cria: 'Cría',
}

const ars = (n: number) => `$${n.toLocaleString('es-AR')}`
const fechaLarga = (iso: string) =>
  new Date(`${iso}T12:00:00-03:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

export function getObservedPrices(slug: string): Entry | null {
  const entry = (promediosData as unknown as Record<string, Entry>)[slug]
  if (!entry || !entry.remates?.length) return null
  return entry
}

/** Latest reported auction for the consignataria, or null. */
export function getLatestRemate(slug: string): { fuente: string; remate: Remate } | null {
  const entry = getObservedPrices(slug)
  if (!entry) return null
  const remate = [...entry.remates].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
  return { fuente: entry.fuente, remate }
}

export function ObservedPricesSection({ slug }: { slug: string }) {
  const latest = getLatestRemate(slug)
  if (!latest) return null
  const { fuente, remate } = latest
  const segments: Categoria['segmento'][] = ['invernada', 'faena', 'cria']
  const origen = [remate.feria, remate.plaza].filter(Boolean).join(' · ')

  return (
    <section className="max-w-6xl mx-auto px-4 pt-10" id="precios-observados">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
        <h2 className="text-lg font-semibold text-white">
          Precios del remate · {origen}
        </h2>
        <span className="text-xs text-slate-500 tabular-nums">{fechaLarga(remate.fecha)}</span>
      </div>
      <p className="text-sm text-slate-400 mb-4">
        Valores $/kg vivo reportados por <span className="text-slate-200">{fuente}</span> para su remate
        en {remate.plaza}, {remate.provincia}.
        {typeof remate.totalCabezas === 'number' && (
          <> Ingreso total: <span className="tabular-nums text-slate-300">{remate.totalCabezas.toLocaleString('es-AR')}</span> cabezas
            {typeof remate.ingresoGordo === 'number' && typeof remate.ingresoInvernada === 'number' && (
              <span className="text-slate-600"> ({remate.ingresoGordo} gordo · {remate.ingresoInvernada} invernada)</span>
            )}.
          </>
        )}
      </p>

      {segments.map((seg) => {
        const cats = remate.categorias.filter((c) => c.segmento === seg)
        if (!cats.length) return null
        return (
          <div key={seg} className="mb-5">
            <h3 className="text-xs uppercase tracking-wider text-amber-500/80 mb-2">{SEGMENTO_LABEL[seg]}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-slate-500 text-left border-b border-slate-800">
                    <th className="py-1.5 pr-4 font-medium">Categoría</th>
                    <th className="py-1.5 px-3 font-medium text-right">Mínimo</th>
                    <th className="py-1.5 px-3 font-medium text-right">Máximo</th>
                    <th className="py-1.5 pl-3 font-medium text-right">Observado<span className="text-slate-600 font-normal"> (punto medio)</span></th>
                  </tr>
                </thead>
                <tbody>
                  {cats.map((c) => {
                    const mid = Math.round((c.min + c.max) / 2)
                    return (
                      <tr key={c.label} className="border-b border-slate-900">
                        <td className="py-1.5 pr-4 text-slate-300">{c.label}</td>
                        <td className="py-1.5 px-3 text-right text-slate-500 tabular-nums">{ars(c.min)}</td>
                        <td className="py-1.5 px-3 text-right text-slate-500 tabular-nums">{ars(c.max)}</td>
                        <td className="py-1.5 pl-3 text-right text-white tabular-nums font-medium">{ars(mid)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      <p className="text-xs text-slate-600 leading-relaxed">
        Fuente: <span className="text-slate-400">{fuente}</span> — informe de remate del {fechaLarga(remate.fecha)}.
        El precio observado es el punto medio del rango declarado por la firma (no un promedio ponderado).
        {remate.proximoRemate && <> Próximo remate: {fechaLarga(remate.proximoRemate)}.</>}
      </p>
    </section>
  )
}
