import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-server'
import ConsignatariaShowcase, { type Firm } from '@/components/ConsignatariaShowcase'

export const dynamic = 'force-dynamic'

/**
 * Landing PERSONALIZADA por consignataria (ABM): le mandás a cada firma su link
 * (/para-consignatarias/su-slug) y la landing se arma con SU nombre, provincia y
 * su actividad medida en el MAG. La base /para-consignatarias queda genérica.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const db = createAdminClient()
  const { data } = await db.from('consignatarias').select('display_name').eq('canonical_slug', slug).maybeSingle()
  const name = data?.display_name || 'Tu consignataria'
  return {
    title: `${name} — destacate en el mercado ganadero`,
    description: `${name} ya está en consignatarias.com.ar. Con PRO analizamos tus redes y tu web y te posicionamos donde el mercado mira.`,
    robots: { index: false, follow: false },
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = createAdminClient()

  const { data: c } = await db
    .from('consignatarias')
    .select('display_name, province, canonical_slug')
    .eq('canonical_slug', slug)
    .maybeSingle()
  if (!c) notFound()

  const [ct, r, o] = await Promise.all([
    db.from('consignatarias').select('id', { count: 'exact', head: true }),
    db.from('remates').select('id', { count: 'exact', head: true }),
    db.from('mag_consignataria_sales_lots').select('id', { count: 'exact', head: true }),
  ])
  const stats = {
    consignatarias: ct.count ?? 113,
    remates: r.count ?? 62,
    operaciones: o.count ?? 0,
    aiPorMes: 325,
  }

  // Actividad medida de la firma en el MAG (último día con datos), si opera ahí.
  let magCabezas: number | null = null
  const { data: mag } = await db
    .from('mag_consignatarias')
    .select('mag_id')
    .eq('consignataria_canonical_slug', slug)
    .maybeSingle()
  if (mag?.mag_id != null) {
    const { data: latest } = await db
      .from('mag_consignataria_sales_lots')
      .select('date')
      .eq('mag_consignataria_id', mag.mag_id)
      .order('date', { ascending: false })
      .limit(1)
    const d = latest?.[0]?.date
    if (d) {
      const { data: lots } = await db
        .from('mag_consignataria_sales_lots')
        .select('head_count')
        .eq('mag_consignataria_id', mag.mag_id)
        .eq('date', d)
      magCabezas = (lots || []).reduce((s, l) => s + (l.head_count || 0), 0) || null
    }
  }

  const firm: Firm = {
    nombre: c.display_name,
    slug: c.canonical_slug,
    provincia: c.province,
    magCabezas,
  }

  return <ConsignatariaShowcase stats={stats} firm={firm} />
}
