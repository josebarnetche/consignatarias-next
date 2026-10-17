import type { Metadata } from 'next'
import { AdminPageHeader } from '@/components/admin/kit'
import ValorCalculator from './ValorCalculator'

// Admin-only (el layout de /admin ya gatea por role='admin'). No indexable.
export const metadata: Metadata = { title: 'Calculadora de valor · Admin', robots: { index: false, follow: false } }

export default function AdminValorPage() {
  return (
    <>
      <AdminPageHeader
        title="Calculadora de valor"
        description="Venta de hacienda: originás el lead, lo conectás con un colega y cobrás el punto. Jugá con las palancas."
      />
      <ValorCalculator />
    </>
  )
}
