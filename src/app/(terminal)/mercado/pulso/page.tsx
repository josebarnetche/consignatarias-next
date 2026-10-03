import { ImagenTema } from '@/components/ui/ImagenTema'
import type { Metadata } from 'next'
import MagPulse from '@/components/MagPulse'
import MarketIntelPanel from '@/components/MarketIntelPanel'
import type { SupabaseClient } from '@supabase/supabase-js'
import { adminClientOpcional } from '@/lib/supabase-server'
import { calcularPulsoMercado, type PulsoMercado } from '@/lib/market-pulse'

export const metadata: Metadata = {
  title: 'Pulso del mercado — Cañuelas en vivo',
  description:
    'La actividad del Mercado Agroganadero de Cañuelas, operación por operación: cabezas por consignatario del último cierre. El mercado de referencia, medido.',
  alternates: { canonical: 'https://www.consignatarias.com.ar/mercado/pulso' },
}

// El pulso se calcula en el server y viaja en el HTML; antes la página era force-dynamic
// y aun así el dato llegaba solo por fetch a /api/ (bloqueado en robots). Los lotes del MAG
// entran Mar/Mié/Vie a las 16:00: una hora de ISR alcanza y sobra.
export const revalidate = 3600

async function pulsoInicial(): Promise<PulsoMercado | null> {
  const db = adminClientOpcional()
  if (!db) return null
  try {
    return await calcularPulsoMercado(db as unknown as SupabaseClient)
  } catch {
    // Sin base no se cae la página: MagPulse lo pide al cargar, como antes.
    return null
  }
}

export default async function PulsoPage() {
  const pulso = await pulsoInicial()
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="relative overflow-hidden rounded-xl mb-4">
        <ImagenTema
          src="/marca/patterns/09-ondas.jpg"
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/70 to-zinc-950" aria-hidden="true" />
        <div className="relative py-4">
          <div className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-1">Mercado / Pulso</div>
          <h1 className="text-xl font-heading text-zinc-100 mb-1">Pulso del mercado</h1>
          <p className="text-zinc-500 text-sm max-w-xl">
            La actividad del Mercado Agroganadero de Cañuelas, medida operación por operación: cuántas cabezas
            movió cada consignatario en el último cierre. Es el mercado que fija la referencia (~12% nacional).
          </p>
        </div>
      </div>
      <MagPulse inicial={pulso} />
      <div className="mt-5">
        <MarketIntelPanel />
      </div>
    </div>
  )
}
