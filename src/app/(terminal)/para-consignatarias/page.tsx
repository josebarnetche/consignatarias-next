import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase-server'
import ConsignatariaShowcase from '@/components/ConsignatariaShowcase'

export const metadata: Metadata = {
  title: 'Para consignatarias — sumá tu firma al mercado medido',
  description:
    'consignatarias.com.ar es el observatorio del mercado ganadero de referencia: precios, remates y el dato de Cañuelas operación por operación. Con PRO tus remates llegan más lejos.',
}

export const dynamic = 'force-dynamic'

export default async function ParaConsignatariasPage() {
  const db = createAdminClient()
  const [c, r, o] = await Promise.all([
    db.from('consignatarias').select('id', { count: 'exact', head: true }),
    db.from('remates').select('id', { count: 'exact', head: true }),
    db.from('mag_consignataria_sales_lots').select('id', { count: 'exact', head: true }),
  ])

  const stats = {
    consignatarias: c.count ?? 113,
    remates: r.count ?? 62,
    operaciones: o.count ?? 0,
    aiPorMes: 325, // referrals de IA/mes (dato de tráfico; ver memoria consignatarias-traffic)
  }

  return <ConsignatariaShowcase stats={stats} />
}
