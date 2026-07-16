import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { requireServiceClient } from '@/lib/supabase'
import { getPreoferta } from '@/lib/data/preofertas'
import { repPorLocalidad } from '@/lib/data/reggi-reps'

export const metadata: Metadata = { title: 'Ofertas recibidas · Pre-oferta', robots: { index: false } }
export const dynamic = 'force-dynamic'

interface Bid {
  lote_rp: string; amount: number; bidder_name: string | null; bidder_cuit: string | null
  bidder_phone: string | null; bidder_email: string; bidder_localidad: string | null
  created_at: string; relayed_at: string | null
}

const fmt = (n: number) => '$ ' + n.toLocaleString('es-AR')

export default async function AdminPreofertaPage({ params }: { params: Promise<{ slug: string }> }) {
  const auth = await requireAdmin()
  if (!auth.authorized) notFound()
  const { slug } = await params
  const p = getPreoferta(slug)
  if (!p) notFound()

  const loteLabel = (rp: string) => {
    const l = p.lotes.find((x) => x.rp === rp)
    return l ? `Lote ${l.lote} · Corral ${l.corral}` : `RP ${rp}`
  }
  const remateUrl = p.elrural_remate_id ? `https://preofertas.elrural.com/remate/${p.elrural_remate_id}` : null
  const elruralHref = (rp: string) => {
    const id = p.lotes.find((x) => x.rp === rp)?.elrural_id
    return id ? `https://preofertas.elrural.com/lote/${id}` : (remateUrl ?? '#')
  }

  const service = requireServiceClient() as unknown as SupabaseClient
  const { data } = await service
    .from('preoferta_bids')
    .select('lote_rp, amount, bidder_name, bidder_cuit, bidder_phone, bidder_email, bidder_localidad, created_at, relayed_at')
    .eq('remate_slug', p.slug)
    .order('created_at', { ascending: false })
  const bids = (data ?? []) as Bid[]

  const max: Record<string, number> = {}
  for (const b of bids) if (!max[b.lote_rp] || b.amount > max[b.lote_rp]) max[b.lote_rp] = b.amount
  const totalLotes = new Set(bids.map((b) => b.lote_rp)).size

  // ── Observabilidad de viewship ──
  const { data: viewsData } = await service
    .from('preoferta_views')
    .select('lote_rp, visitor')
    .eq('remate_slug', p.slug)
  const views = (viewsData ?? []) as Array<{ lote_rp: string | null; visitor: string | null }>
  const vistasPorLote: Record<string, number> = {}
  const unicosPorLote: Record<string, Set<string>> = {}
  const visitantesUnicos = new Set<string>()
  let vistasPagina = 0
  for (const v of views) {
    if (v.visitor) visitantesUnicos.add(v.visitor)
    if (v.lote_rp == null) { vistasPagina++; continue }
    vistasPorLote[v.lote_rp] = (vistasPorLote[v.lote_rp] ?? 0) + 1
    ;(unicosPorLote[v.lote_rp] ??= new Set()).add(v.visitor ?? 'anon')
  }
  const interesPorLote: Record<string, number> = {}
  for (const b of bids) interesPorLote[b.lote_rp] = (interesPorLote[b.lote_rp] ?? 0) + 1
  const totalVistas = views.length
  // funnel por lote, ordenado por vistas desc (sólo lotes con al menos una vista)
  const funnel = Object.keys(vistasPorLote)
    .map((rp) => ({ rp, vistas: vistasPorLote[rp], unicos: unicosPorLote[rp]?.size ?? 0, interes: interesPorLote[rp] ?? 0 }))
    .sort((a, b) => b.vistas - a.vistas)
  const convGlobal = visitantesUnicos.size > 0 ? Math.round((totalLotes / visitantesUnicos.size) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-heading text-zinc-100">Ofertas recibidas · {p.remate}</h1>
      <p className="text-zinc-400 text-data mt-1">
        {bids.length} ofertas · {totalLotes} lotes con interés · {p.consignataria}
        {remateUrl && <> · <a href={remateUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-bright">cargar en elrural →</a></>}
      </p>
      <p className="text-zinc-600 text-xxs mt-1">
        Flujo: tomás el CUIT → corrés el informe en InfoExperto → si pasa, cargás la oferta en elrural con tu user (equipara el libro). El comprador queda nuestro.
      </p>

      {/* ── Observabilidad · viewship ── */}
      <div className="mt-5 rounded-terminal border border-terminal-border bg-black/20 p-4">
        <div className="text-xxs font-terminal uppercase tracking-widest text-zinc-500 mb-3">Observabilidad · viewship</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { k: 'Visitantes únicos', v: visitantesUnicos.size },
            { k: 'Vistas totales', v: totalVistas },
            { k: 'Lotes con interés', v: totalLotes },
            { k: 'Únicos → lead', v: `${convGlobal}%` },
          ].map((s) => (
            <div key={s.k} className="rounded-terminal border border-terminal-border/60 bg-black/20 px-3 py-2.5">
              <div className="text-2xl font-mono tabular-nums text-zinc-100 leading-none">{s.v}</div>
              <div className="text-xxs text-zinc-500 mt-1">{s.k}</div>
            </div>
          ))}
        </div>

        {funnel.length > 0 ? (
          <div className="mt-3.5 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-[10px] font-terminal uppercase tracking-wider text-zinc-500 border-b border-terminal-border">
                  <th className="text-left py-1.5 pr-3">Lote</th>
                  <th className="text-right py-1.5 px-3">Vistas</th>
                  <th className="text-right py-1.5 px-3">Únicos</th>
                  <th className="text-right py-1.5 px-3">Interesados</th>
                </tr>
              </thead>
              <tbody>
                {funnel.map((f) => (
                  <tr key={f.rp} className="border-b border-terminal-border/40">
                    <td className="py-1.5 pr-3 text-zinc-300 whitespace-nowrap">{loteLabel(f.rp)}</td>
                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-zinc-100">{f.vistas}</td>
                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-zinc-400">{f.unicos}</td>
                    <td className="py-1.5 px-3 text-right font-mono tabular-nums">
                      {f.interes > 0 ? <span className="text-positive">{f.interes}</span> : <span className="text-zinc-600">0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-zinc-600 text-xs mt-3">Sin vistas registradas todavía. {vistasPagina > 0 ? `(${vistasPagina} vistas de página sin lote)` : ''}</p>
        )}
      </div>

      {bids.length === 0 ? (
        <p className="text-zinc-500 text-sm mt-8">Todavía no hay ofertas. Probá dejando una en <a href={`/preoferta/${p.slug}`} className="text-accent">/preoferta/{p.slug}</a>.</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-xxs uppercase tracking-widest text-zinc-500 border-b border-terminal-border">
                <th className="text-left py-2 pr-3">Lote</th>
                <th className="text-right py-2 px-3">Oferta</th>
                <th className="text-left py-2 px-3">Ofertante</th>
                <th className="text-left py-2 px-3">CUIT</th>
                <th className="text-left py-2 px-3">Contacto</th>
                <th className="text-left py-2 px-3">Localidad · Rep sugerido</th>
                <th className="text-left py-2 px-3">Cuándo</th>
              </tr>
            </thead>
            <tbody>
              {bids.map((b, i) => {
                const esMax = b.amount === max[b.lote_rp]
                return (
                  <tr key={i} className={`border-b border-terminal-border/60 ${esMax ? 'bg-positive/[0.05]' : ''}`}>
                    <td className="py-2.5 pr-3 text-zinc-300">
                      {loteLabel(b.lote_rp)}
                      {esMax && <span className="ml-1.5 text-xxs text-positive font-terminal">TOP</span>}
                      <a href={elruralHref(b.lote_rp)} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-xxs text-accent hover:text-accent-bright">elrural ↗</a>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-zinc-100">{fmt(b.amount)}</td>
                    <td className="py-2.5 px-3 text-zinc-200">{b.bidder_name || '—'}</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-300">{b.bidder_cuit || '—'}</td>
                    <td className="py-2.5 px-3 text-zinc-400">
                      <div>{b.bidder_phone || '—'}</div>
                      <div className="text-xxs text-zinc-600">{b.bidder_email}</div>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400">
                      <div className="text-zinc-300">{b.bidder_localidad || '—'}</div>
                      {(() => {
                        const r = b.bidder_localidad ? repPorLocalidad(b.bidder_localidad) : null
                        return r
                          ? <div className="text-xxs text-positive mt-0.5">{r.zona} · {r.reps.map((x) => `${x.nombre} ${x.tel}`).join(' · ')}</div>
                          : <div className="text-xxs text-zinc-600">sin rep asignado</div>
                      })()}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-500 text-xxs tabular-nums">{new Date(b.created_at).toLocaleString('es-AR')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
