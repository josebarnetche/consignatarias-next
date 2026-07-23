import type { Metadata } from 'next'
import ValorCalculator from './ValorCalculator'

// Admin-only (el layout de /admin ya gatea por role='admin'). No indexable.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function AdminValorPage() {
  return <ValorCalculator />
}
