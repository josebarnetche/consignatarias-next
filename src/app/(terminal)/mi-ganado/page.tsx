import { Metadata } from 'next'
import marketPrices from '@/lib/data/market-prices.json'
import { INMAG_DATE } from '@/lib/inmag'
import MiGanadoClient from './MiGanadoClient'

export const metadata: Metadata = {
  title: 'Mi Ganado · Cuánto vale tu rodeo hoy, medido en lo que se vendió',
  description: 'Cargá tu hacienda una vez y mirá su Valor de Referencia: lo que se pagó por lotes de la misma categoría y peso en el Mercado Agroganadero, con el rango y los lotes que lo sostienen. Gratis con tu cuenta.',
  alternates: { canonical: 'https://www.consignatarias.com.ar/mi-ganado' },
  robots: { index: false, follow: true }, // personal/auth page — keep out of the index
}

/**
 * La valuación NO usa `market-prices.json → categories`: ese campo alterna entre el
 * precio observado y un ratio fijo sobre el INMAG según el día (ver lib/rodeo-vr.ts).
 * De acá sólo pasan el INMAG del día y el blue, que son series observadas.
 */
export default function MiGanadoPage() {
  return (
    <MiGanadoClient
      inmag={{ current: marketPrices.inmag.current, change: marketPrices.inmag.change }}
      usdBlue={{ current: marketPrices.usdBlue.current }}
      lastUpdate={INMAG_DATE}
    />
  )
}
