import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { requireServiceClient } from '@/lib/supabase'
import { getAllPreofertas } from '@/lib/data/preofertas'
import { AdminPageHeader, AdminSection, AdminEmpty } from '@/components/admin/kit'
import Badge from '@/components/ui/Badge'

export const metadata: Metadata = { title: 'Pre-ofertas · Admin', robots: { index: false } }
export const dynamic = 'force-dynamic'

const nf = (n: number) => n.toLocaleString('es-AR')

export default async function AdminPreofertasIndex() {
  const auth = await requireAdmin()
  if (!auth.authorized) notFound()

  const preofertas = getAllPreofertas()
  const service = requireServiceClient() as unknown as SupabaseClient
  const { data } = await service.from('preoferta_bids').select('remate_slug, lote_rp')
  const rows = (data ?? []) as Array<{ remate_slug: string; lote_rp: string }>
  const count: Record<string, { ofertas: number; lotes: Set<string> }> = {}
  for (const r of rows) {
    count[r.remate_slug] = count[r.remate_slug] ?? { ofertas: 0, lotes: new Set() }
    count[r.remate_slug].ofertas++
    count[r.remate_slug].lotes.add(r.lote_rp)
  }

  return (
    <>
      <AdminPageHeader
        title="Pre-ofertas"
        meta={`${nf(rows.length)} ofertas recibidas`}
        description="Elegí un remate para ver los leads (ofertante, CUIT, monto) y cargarlos en elrural."
      />

      <AdminSection title="Remates" flush>
        {preofertas.length === 0 ? (
          <AdminEmpty>No hay remates con pre-oferta cargados.</AdminEmpty>
        ) : (
          <ul>
            {preofertas.map((p) => {
              const c = count[p.slug]
              const abierta = Date.now() < new Date(p.cierre_preoferta).getTime()
              return (
                <li key={p.slug} className="border-b border-terminal-border last:border-b-0">
                  <Link
                    href={`/admin/preoferta/${p.slug}`}
                    className="group flex items-center justify-between gap-3 px-panel py-3 transition-colors hover:bg-accent/5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-data font-terminal text-ink group-hover:text-accent">{p.remate}</div>
                      <div className="truncate text-xxs font-terminal text-zinc-500">
                        {p.consignataria} · {p.cabana}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right font-terminal">
                        <div className="text-data tabular-nums text-ink">
                          {nf(c?.ofertas ?? 0)} <span className="text-xxs text-zinc-500">ofertas</span>
                        </div>
                        <div className="text-xxs tabular-nums text-zinc-500">
                          {nf(c?.lotes.size ?? 0)} lotes con interés
                        </div>
                      </div>
                      <Badge tone={abierta ? 'positive' : 'neutral'}>{abierta ? 'Abierta' : 'Cerrada'}</Badge>
                      <span className="text-zinc-500 group-hover:text-accent font-terminal" aria-hidden>
                        →
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </AdminSection>
    </>
  )
}
