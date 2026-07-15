import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { requireServiceClient } from '@/lib/supabase'
import { getPreoferta } from '@/lib/data/preofertas'

export const metadata: Metadata = { title: 'Ofertas recibidas · Pre-oferta', robots: { index: false } }
export const dynamic = 'force-dynamic'

interface Bid {
  lote_rp: string; amount: number; bidder_name: string | null; bidder_cuit: string | null
  bidder_phone: string | null; bidder_email: string; created_at: string; relayed_at: string | null
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
    .select('lote_rp, amount, bidder_name, bidder_cuit, bidder_phone, bidder_email, created_at, relayed_at')
    .eq('remate_slug', p.slug)
    .order('created_at', { ascending: false })
  const bids = (data ?? []) as Bid[]

  const max: Record<string, number> = {}
  for (const b of bids) if (!max[b.lote_rp] || b.amount > max[b.lote_rp]) max[b.lote_rp] = b.amount
  const totalLotes = new Set(bids.map((b) => b.lote_rp)).size

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
