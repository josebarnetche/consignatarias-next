import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase-server'
import { getAiCitationStats } from '@/lib/ai-citations'
import remates from '@/lib/data/remates.json'
import { rematesDesdeHoy } from '@/lib/remates-conteo'
import { hoyArgentina } from '@/lib/remates-en-vivo'
import { getAllProfiles } from '@/lib/data/consignataria-slugs'
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
  const [c, ai] = await Promise.all([
    db.from('consignatarias').select('id', { count: 'exact', head: true }),
    getAiCitationStats(),
  ])

  const stats = {
    consignatarias: c.count ?? getAllProfiles().length,
    // La tabla `remates` quedó congelada el 9-mar-2026 con 36 filas: contarla acá
    // daba una plataforma 30 veces más chica que la real, justo en la página que le
    // vende a las firmas. El sitio entero corre sobre remates.json — 78 importadores.
    // (El fallback anterior era `?? 62`, un número que no salía de ningún lado.)
    remates: rematesDesdeHoy(remates, hoyArgentina()).length,
    aiRefsMes: ai.aiRefsMes,
    firmsCitadas: ai.firmsCitadas,
  }

  return <ConsignatariaShowcase stats={stats} citadas={ai.citadas} />
}
