import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { requireServiceClient } from '@/lib/supabase'
import { getPreoferta } from '@/lib/data/preofertas'
import { repPorLocalidad } from '@/lib/data/reggi-reps'
import { AdminPageHeader, AdminSection, AdminEmpty, KpiRow, KpiCell } from '@/components/admin/kit'
import Stat from '@/components/ui/Stat'
import Badge from '@/components/ui/Badge'

export const metadata: Metadata = { title: 'Ofertas recibidas · Pre-oferta', robots: { index: false } }
export const dynamic = 'force-dynamic'

// URL /admin/preoferta/{slug}: se enlaza desde los mails de aviso — no mover.

interface Bid {
  lote_rp: string; amount: number; bidder_name: string | null; bidder_cuit: string | null
  bidder_phone: string | null; bidder_email: string; bidder_localidad: string | null
  created_at: string; relayed_at: string | null
}

const fmt = (n: number) => '$ ' + n.toLocaleString('es-AR')
const nf = (n: number) => n.toLocaleString('es-AR')

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
    <>
      <AdminPageHeader
        title={`Ofertas recibidas · ${p.remate}`}
        meta={`${nf(bids.length)} ofertas · ${nf(totalLotes)} lotes con interés`}
        description={
          <>
            <Link href="/admin/preoferta" className="text-accent">← Pre-ofertas</Link> · {p.consignataria}
          </>
        }
        actions={
          remateUrl ? (
            <a href={remateUrl} target="_blank" rel="noopener noreferrer" className="terminal-btn-primary">
              Cargar en elrural ↗
            </a>
          ) : undefined
        }
      />

      <div className="terminal-panel px-panel py-2 text-xxs font-terminal text-zinc-500">
        Flujo: tomás el CUIT → corrés el informe en InfoExperto → si pasa, cargás la oferta en elrural con tu user
        (equipara el libro). El comprador queda nuestro.
      </div>

      {/* ── Observabilidad · viewship ── */}
      <KpiRow cols={4}>
        <KpiCell><Stat label="Visitantes únicos" value={nf(visitantesUnicos.size)} /></KpiCell>
        <KpiCell><Stat label="Vistas totales" value={nf(totalVistas)} /></KpiCell>
        <KpiCell><Stat label="Lotes con interés" value={nf(totalLotes)} /></KpiCell>
        <KpiCell><Stat label="Únicos → lead" value={`${convGlobal}%`} /></KpiCell>
      </KpiRow>

      <AdminSection title="Vistas por lote" flush>
        {funnel.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="terminal-table">
              <thead>
                <tr>
                  <th>Lote</th>
                  <th className="num">Vistas</th>
                  <th className="num">Únicos</th>
                  <th className="num">Interesados</th>
                </tr>
              </thead>
              <tbody>
                {funnel.map((f) => (
                  <tr key={f.rp}>
                    <td className="text-zinc-300">{loteLabel(f.rp)}</td>
                    <td className="num text-ink">{f.vistas}</td>
                    <td className="num text-zinc-400">{f.unicos}</td>
                    <td className="num">
                      {f.interes > 0 ? <span className="text-positive">{f.interes}</span> : <span className="text-zinc-500">0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmpty>
            Sin vistas registradas todavía. {vistasPagina > 0 ? `(${vistasPagina} vistas de página sin lote)` : ''}
          </AdminEmpty>
        )}
      </AdminSection>

      <AdminSection title="Ofertas" flush>
        {bids.length === 0 ? (
          <AdminEmpty>
            Todavía no hay ofertas. Probá dejando una en{' '}
            <a href={`/preoferta/${p.slug}`} className="text-accent">/preoferta/{p.slug}</a>.
          </AdminEmpty>
        ) : (
          <div className="overflow-x-auto">
            <table className="terminal-table">
              <thead>
                <tr>
                  <th>Lote</th>
                  <th className="num">Oferta</th>
                  <th>Ofertante</th>
                  <th>CUIT</th>
                  <th>Contacto</th>
                  <th>Localidad · rep sugerido</th>
                  <th>Cuándo</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((b, i) => {
                  const esMax = b.amount === max[b.lote_rp]
                  const r = b.bidder_localidad ? repPorLocalidad(b.bidder_localidad) : null
                  return (
                    <tr key={i} className={esMax ? 'bg-positive/5' : ''}>
                      <td className="text-zinc-300">
                        {loteLabel(b.lote_rp)}
                        {esMax && <Badge tone="positive" className="ml-1.5">Top</Badge>}
                        <a
                          href={elruralHref(b.lote_rp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1.5 text-xxs text-accent hover:text-accent-bright"
                        >
                          elrural ↗
                        </a>
                      </td>
                      <td className="num text-ink">{fmt(b.amount)}</td>
                      <td className="text-zinc-300">{b.bidder_name || '—'}</td>
                      <td className="tabular-nums text-zinc-300">{b.bidder_cuit || '—'}</td>
                      <td className="text-zinc-400">
                        <div>{b.bidder_phone || '—'}</div>
                        <div className="text-xxs text-zinc-500">{b.bidder_email}</div>
                      </td>
                      <td className="text-zinc-400">
                        <div className="text-zinc-300">{b.bidder_localidad || '—'}</div>
                        {r ? (
                          <div className="mt-0.5 text-xxs text-positive">
                            {r.zona} · {r.reps.map((x) => `${x.nombre} ${x.tel}`).join(' · ')}
                          </div>
                        ) : (
                          <div className="text-xxs text-zinc-500">sin rep asignado</div>
                        )}
                      </td>
                      <td className="text-xxs tabular-nums text-zinc-500">{new Date(b.created_at).toLocaleString('es-AR')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>
    </>
  )
}
