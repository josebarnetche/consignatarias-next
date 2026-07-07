import type { Metadata } from 'next'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase-server'
import NovilloEnDolares, { type NovilloDay, type NovilloPoint } from '@/components/NovilloEnDolares'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'El novillo argentino en dólares · 2015 → hoy | Consignatarias.com.ar',
  description:
    'Cuánto valía un novillo argentino en dólares en los días clave de la Argentina, desde 2015. INMAG diario cruzado con el dólar blue — del cepo de Macri al récord de hoy. Serie histórica completa vía Enterprise API + MCP.',
}

// Días importantes de Argentina (2015→). El copy usa los números reales de la serie.
const FIXED: { date: string; label: string; ctx: string }[] = [
  {
    date: '2015-12-17',
    label: 'Macri libera el cepo',
    ctx: 'El primer sinceramiento cambiario. El dólar saltó de golpe y el novillo quedó valuado cerca de 800 dólares — el techo de la era que arrancaba.',
  },
  {
    date: '2018-08-30',
    label: 'La corrida de 2018',
    ctx: 'La corrida se comió al peso más rápido que a la hacienda. En dólares, el novillo se derrumbó casi 300 dólares respecto de 2015 — la misma vaca, la mitad de valor.',
  },
  {
    date: '2019-08-12',
    label: 'Lunes negro post-PASO',
    ctx: 'Las PASO devaluaron todo en un día. Pero el ganado, medido en dólares, casi no se movió: el peso es el que se derrite, no el animal.',
  },
  {
    date: '2020-03-20',
    label: 'Arranca la cuarentena',
    ctx: 'Pandemia, cepo reforzado y brecha que se abría. El novillo planchado en dólares — la hacienda como refugio mientras el peso se licuaba.',
  },
  {
    date: '2021-10-15',
    label: 'El novillo más barato en dólares',
    ctx: 'El piso de toda la serie. Con la brecha cambiaria en su peor momento, nunca un novillo argentino valió tan poco medido en dólares blue.',
  },
  {
    date: '2023-08-14',
    label: 'Milei gana la PASO',
    ctx: 'Otro piso. El mercado ya descontaba el salto que se venía: hacienda regalada en dólares a la espera de la corrección.',
  },
  {
    date: '2023-12-13',
    label: 'La devaluación de Milei',
    ctx: 'El oficial pasó de 350 a 800 pesos de un día para el otro. El novillo, en dólares, recuperó de golpe unos 250 dólares por cabeza.',
  },
  {
    date: '2024-12-10',
    label: 'Un año de Milei',
    ctx: 'Con la brecha cerrándose y la inflación cediendo, el ganado se revaluó fuerte en dólares. Casi 1.000 dólares la cabeza.',
  },
]

type RpcDay = { date: string; inmag: number | null; blue: number | null; usd_blue: number | null; usd_oficial: number | null }

export default async function ElNovilloEnDolaresPage() {
  const db = createAdminClient() as unknown as SupabaseClient

  const { count: totalDays } = await createAdminClient()
    .from('mag_inmag_history')
    .select('*', { count: 'exact', head: true })
    .not('inmag_value', 'is', null)

  const { data: seriesRaw } = await db.rpc('novillo_usd_series')
  const series: NovilloPoint[] = ((seriesRaw as { date: string; usd: number }[] | null) || []).map((p) => ({
    date: p.date,
    usd: Number(p.usd),
  }))
  const hoy = series.length ? series[series.length - 1].date : '2026-07-03'

  const curated = [
    ...FIXED,
    {
      date: hoy,
      label: 'Hoy · el récord',
      ctx: 'El novillo argentino nunca valió tanto en dólares en toda la serie. De 446 a más de 1.200 dólares — la misma hacienda, otro país.',
    },
  ]

  const { data: daysRaw } = await db.rpc('novillo_usd_days', { p_dates: curated.map((c) => c.date) })
  const byDate = new Map(((daysRaw as RpcDay[] | null) || []).map((r) => [r.date, r]))

  const days: NovilloDay[] = curated
    .map((c) => {
      const v = byDate.get(c.date)
      return {
        date: c.date,
        label: c.label,
        ctx: c.ctx,
        usd_blue: Number(v?.usd_blue ?? 0),
        usd_oficial: Number(v?.usd_oficial ?? 0),
        inmag: Number(v?.inmag ?? 0),
        blue: Number(v?.blue ?? 0),
      }
    })
    .filter((d) => d.usd_blue > 0)

  if (days.length === 0 || series.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center text-zinc-400 font-mono text-sm">
        No se pudo cargar la serie histórica en este momento.
      </div>
    )
  }

  return <NovilloEnDolares days={days} series={series} totalDays={totalDays ?? 2254} />
}
