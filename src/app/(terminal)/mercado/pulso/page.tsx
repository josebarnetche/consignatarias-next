import type { Metadata } from 'next'
import MagPulse from '@/components/MagPulse'

export const metadata: Metadata = {
  title: 'Pulso del mercado — Cañuelas en vivo',
  description:
    'La actividad del Mercado Agroganadero de Cañuelas, operación por operación: cabezas por consignatario del último cierre. El mercado de referencia, medido.',
}

export const dynamic = 'force-dynamic'

export default function PulsoPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-4">
        <div className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-1">Mercado / Pulso</div>
        <h1 className="text-xl font-heading text-zinc-100 mb-1">Pulso del mercado</h1>
        <p className="text-zinc-500 text-sm max-w-xl">
          La actividad del Mercado Agroganadero de Cañuelas, medida operación por operación: cuántas cabezas
          movió cada consignatario en el último cierre. Es el mercado que fija la referencia (~12% nacional).
        </p>
      </div>
      <MagPulse />
    </div>
  )
}
