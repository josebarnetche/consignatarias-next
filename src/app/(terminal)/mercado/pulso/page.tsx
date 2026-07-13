import type { Metadata } from 'next'
import MagPulse from '@/components/MagPulse'
import MarketIntelPanel from '@/components/MarketIntelPanel'

export const metadata: Metadata = {
  title: 'Pulso del mercado — Cañuelas en vivo',
  description:
    'La actividad del Mercado Agroganadero de Cañuelas, operación por operación: cabezas por consignatario del último cierre. El mercado de referencia, medido.',
  alternates: { canonical: 'https://www.consignatarias.com.ar/mercado/pulso' },
}

export const dynamic = 'force-dynamic'

export default function PulsoPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="relative overflow-hidden rounded-xl mb-4">
        <img
          src="/marca/patterns/09-ondas.jpg"
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#09090b]/40 via-[#09090b]/70 to-[#09090b]" aria-hidden="true" />
        <div className="relative py-4">
          <div className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-1">Mercado / Pulso</div>
          <h1 className="text-xl font-heading text-zinc-100 mb-1">Pulso del mercado</h1>
          <p className="text-zinc-500 text-sm max-w-xl">
            La actividad del Mercado Agroganadero de Cañuelas, medida operación por operación: cuántas cabezas
            movió cada consignatario en el último cierre. Es el mercado que fija la referencia (~12% nacional).
          </p>
        </div>
      </div>
      <MagPulse />
      <div className="mt-5">
        <MarketIntelPanel />
      </div>
    </div>
  )
}
