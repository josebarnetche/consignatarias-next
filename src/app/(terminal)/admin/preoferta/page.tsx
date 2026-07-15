import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { requireServiceClient } from '@/lib/supabase'
import { getAllPreofertas } from '@/lib/data/preofertas'

export const metadata: Metadata = { title: 'Pre-ofertas · Admin', robots: { index: false } }
export const dynamic = 'force-dynamic'

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
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-heading text-zinc-100">Pre-ofertas — ofertas recibidas</h1>
      <p className="text-zinc-400 text-data mt-1">Elegí un remate para ver los leads (ofertante, CUIT, monto) y cargarlos en elrural.</p>
      <div className="mt-5 space-y-2">
        {preofertas.map((p) => {
          const c = count[p.slug]
          const abierta = Date.now() < new Date(p.cierre_preoferta).getTime()
          return (
            <Link key={p.slug} href={`/admin/preoferta/${p.slug}`}
              className="flex items-center justify-between gap-3 rounded-terminal border border-terminal-border bg-black/20 hover:border-accent/50 p-3.5 transition-colors">
              <div>
                <div className="text-zinc-100 font-medium">{p.remate}</div>
                <div className="text-zinc-500 text-xs">{p.consignataria} · {p.cabana}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-zinc-100 tabular-nums">{c?.ofertas ?? 0} <span className="text-zinc-500 text-xs">ofertas</span></div>
                <div className="text-xxs font-terminal uppercase tracking-wider">{abierta ? <span className="text-positive">abierta</span> : <span className="text-zinc-600">cerrada</span>}</div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
