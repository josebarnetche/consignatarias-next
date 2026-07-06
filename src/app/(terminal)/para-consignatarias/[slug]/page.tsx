import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-server'
import { getAiCitationStats } from '@/lib/ai-citations'
import ConsignatariaShowcase, { type Firm } from '@/components/ConsignatariaShowcase'

export const dynamic = 'force-dynamic'

/**
 * Landing PERSONALIZADA por consignataria (ABM): le mandás a cada firma su link
 * (/para-consignatarias/su-slug) y la landing se arma con SU nombre, provincia,
 * su actividad medida en el MAG y cuántas veces la citó una IA. Base genérica.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const db = createAdminClient()
  const { data } = await db.from('consignatarias').select('display_name').eq('canonical_slug', slug).maybeSingle()
  const name = data?.display_name || 'Tu consignataria'
  return {
    title: `${name} — publicitá tus remates`,
    description: `${name} ya está en consignatarias.com.ar. Con PRO destacás tus remates, salen por email y medís cuánto te citan las IAs.`,
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

  const [ct, r, ai] = await Promise.all([
    db.from('consignatarias').select('id', { count: 'exact', head: true }),
    db.from('remates').select('id', { count: 'exact', head: true }),
    getAiCitationStats(),
  ])
  const stats = {
    consignatarias: ct.count ?? 113,
    remates: r.count ?? 62,
    aiRefsMes: ai.aiRefsMes,
    firmsCitadas: ai.firmsCitadas,
  }
  const mine = ai.citadas.find((x) => x.slug === slug)

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
    aiCitas: mine?.refs ?? 0,
    aiEngines: mine?.engines ?? null,
  }

  return <ConsignatariaShowcase stats={stats} citadas={ai.citadas} firm={firm} />
}
