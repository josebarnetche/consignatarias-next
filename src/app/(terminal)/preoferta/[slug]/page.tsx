import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'
import { getPreoferta } from '@/lib/data/preofertas'
import PreofertaClient from './PreofertaClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const p = getPreoferta(slug)
  return { title: p ? `Pre-oferta · ${p.remate}` : 'Pre-oferta', robots: { index: false, follow: false } }
}

export default async function PreofertaPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lote?: string }>
}) {
  const { slug } = await params
  const { lote } = await searchParams
  const preoferta = getPreoferta(slug)
  if (!preoferta) notFound()
  const initialLote = preoferta.lotes.some((l) => l.rp === lote) ? lote! : (preoferta.lotes[0]?.rp ?? null)

  // sesión (para ofertar)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const service = requireServiceClient() as unknown as SupabaseClient

  // "Valor actual" = espejo del libro de elrural (cron scrape-preoferta-mirror).
  const { data: mirror } = await service
    .from('preoferta_mirror')
    .select('valores')
    .eq('remate_slug', preoferta.slug)
    .maybeSingle()
  const valores: Record<string, number> = { ...((mirror?.valores as Record<string, number>) ?? {}) }

  // Nuestras ofertas: cuentan como interés (leads) Y elevan el valor actual —
  // el valor mostrado = máx(libro elrural, nuestra mejor oferta).
  const { data } = await service
    .from('preoferta_bids')
    .select('lote_rp, amount')
    .eq('remate_slug', preoferta.slug)
  const interes: Record<string, number> = {}
  for (const b of (data ?? []) as Array<{ lote_rp: string; amount: number }>) {
    interes[b.lote_rp] = (interes[b.lote_rp] ?? 0) + 1
    if (!valores[b.lote_rp] || b.amount > valores[b.lote_rp]) valores[b.lote_rp] = b.amount
  }

  return (
    <PreofertaClient
      remate={preoferta}
      valoresIniciales={valores}
      interes={interes}
      userEmail={user?.email ?? null}
      serverNow={Date.now()}
      initialLote={initialLote}
    />
  )
}
