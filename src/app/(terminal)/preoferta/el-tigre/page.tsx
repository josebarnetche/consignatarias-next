import type { Metadata } from 'next'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { requireServiceClient } from '@/lib/supabase'
import preoferta from '@/lib/data/preoferta-el-tigre.json'
import PreofertaClient from './PreofertaClient'

// PRUEBA interna — no indexar.
export const metadata: Metadata = {
  title: 'Pre-oferta (prueba) · 34° Remate Cabaña El Tigre',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function PreofertaElTigrePage() {
  // sesión (para saber si puede ofertar)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // valor actual por lote (máx oferta) — service role
  const service = requireServiceClient() as unknown as SupabaseClient
  const { data } = await service
    .from('preoferta_bids')
    .select('lote_rp, amount')
    .eq('remate_slug', 'el-tigre')
  const valores: Record<string, number> = {}
  const interes: Record<string, number> = {}   // observabilidad: interesados por lote
  for (const b of (data ?? []) as Array<{ lote_rp: string; amount: number }>) {
    if (!valores[b.lote_rp] || b.amount > valores[b.lote_rp]) valores[b.lote_rp] = b.amount
    interes[b.lote_rp] = (interes[b.lote_rp] ?? 0) + 1
  }

  return (
    <PreofertaClient
      remate={preoferta as unknown as PreofertaData}
      valoresIniciales={valores}
      interes={interes}
      userEmail={user?.email ?? null}
      serverNow={Date.now()}
    />
  )
}

export interface PreofertaData {
  remate: string
  fecha: string
  lugar: string
  consignataria: string
  base: number
  cierre_preoferta: string
  lotes: Array<{
    rp: string
    corral: string
    lote: string
    video: string
    fn?: string
    padre?: string
    madre?: string
    reg?: string
    ce?: string
    peso?: string
    base?: number       // base real por lote (scrape elrural)
    elrural_id?: string // id del lote en preofertas.elrural.com
  }>
}
