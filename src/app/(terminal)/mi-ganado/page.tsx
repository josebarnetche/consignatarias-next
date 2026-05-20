import { Metadata } from 'next'
import marketPrices from '@/lib/data/market-prices.json'
import MiGanadoClient from './MiGanadoClient'

export const metadata: Metadata = {
  title: 'Mi Ganado · Cuánto vale tu hacienda hoy al INMAG',
  description: 'Cargá tu hacienda una vez y mirá cuánto vale hoy al precio INMAG, actualizado cada día hábil. Gratis con tu cuenta. Tu rodeo, tu número, siempre a mano.',
  alternates: { canonical: 'https://www.consignatarias.com.ar/mi-ganado' },
  robots: { index: false, follow: true }, // personal/auth page — keep out of the index
}

export default function MiGanadoPage() {
  return (
    <MiGanadoClient
      prices={{
        inmag: marketPrices.inmag,
        categories: marketPrices.categories,
        usdBlue: marketPrices.usdBlue,
      }}
      lastUpdate={marketPrices.lastUpdate}
    />
  )
}
