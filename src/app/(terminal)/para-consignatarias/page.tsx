import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase-server'
import { getAiCitationStats } from '@/lib/ai-citations'
import ConsignatariaShowcase from '@/components/ConsignatariaShowcase'

export const metadata: Metadata = {
  title: 'Para consignatarias — publicitá tus remates donde el mercado mira',
  description:
    'Con PRO tus remates se destacan en el sitio, salen por email a la base de productores y medís cuánto te citan las IAs (ChatGPT, Copilot). El dato de referencia del mercado ganadero.',
  alternates: { canonical: 'https://www.consignatarias.com.ar/para-consignatarias' },
}

export const dynamic = 'force-dynamic'

export default async function ParaConsignatariasPage() {
  const db = createAdminClient()
  const [c, r, ai] = await Promise.all([
    db.from('consignatarias').select('id', { count: 'exact', head: true }),
    db.from('remates').select('id', { count: 'exact', head: true }),
    getAiCitationStats(),
  ])

  const stats = {
    consignatarias: c.count ?? 113,
    remates: r.count ?? 62,
    aiRefsMes: ai.aiRefsMes,
    firmsCitadas: ai.firmsCitadas,
  }

  return <ConsignatariaShowcase stats={stats} citadas={ai.citadas} />
}
