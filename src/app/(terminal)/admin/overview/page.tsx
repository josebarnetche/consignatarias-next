import { Suspense } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { SectionSkeleton } from '@/components/admin/metricas/SectionSkeleton'
import Badge from '@/components/ui/Badge'
import { AdminPageHeader, AdminSection, AdminEmpty } from '@/components/admin/kit'
import LiveActivityFeed from '@/components/admin/LiveActivityFeed'
import AutoRefresh from '@/components/admin/AutoRefresh'
import WeeklyTrafficCard from '@/components/admin/WeeklyTrafficCard'
import { getEnVivoData } from '@/components/admin/metricas/en-vivo-data'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata: Metadata = { title: 'En vivo · Admin' }

/**
 * /admin/overview — "En vivo": SOLO el comportamiento de la audiencia.
 *
 *   1. Actividad (feed que pollea /api/admin/live cada 10 s + vistas 5 min/1 h/24 h)
 *   2. Perfiles más vistos 24 h · vistas por hora + reparto consignatarias/frigoríficos
 *   3. Tráfico 7 días (GA4 o, sin GA4, vistas propias por día)
 *
 * Lo que NO está acá, a propósito (vive en un solo lugar):
 *   - Pendientes, crons en rojo, errores 24 h, newsletter, firmas PRO → /admin (Hoy)
 *   - Ingresos, conversión, frescura de datos, outreach, email → /admin/dashboard (Negocio)
 *   - Detalle de crons y errores → /admin/ops
 *
 * La página entera se re-renderiza cada 45 s (<AutoRefresh/>). Una sola lectura
 * de profile_views por render (getEnVivoData).
 */

const nf = (n: number) => n.toLocaleString('es-AR')

/** Hora local (ART) de un bucket: índice 23 = la hora en curso. */
function horaDeBucket(i: number): string {
  const ms = Date.now() - (23 - i) * 3_600_000
  return new Date(ms).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    hour12: false,
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

function HourlyBars({ buckets }: { buckets: number[] }) {
  const max = Math.max(1, ...buckets)
  return (
    <div className="flex items-end gap-px h-16" role="img" aria-label="Vistas por hora en las últimas 24 horas">
      {buckets.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-t-[1px] ${i >= 22 ? 'bg-live' : 'bg-zinc-700'}`}
          style={{ height: `${Math.max(v > 0 ? 6 : 2, Math.round((v / max) * 100))}%` }}
          title={`${horaDeBucket(i)} h: ${nf(v)} vista${v === 1 ? '' : 's'}`}
        />
      ))}
    </div>
  )
}

export default async function AdminEnVivoPage() {
  const { ok, live, hourly, split } = await getEnVivoData(30)

  const peakIdx = hourly.reduce((best, v, i) => (v > hourly[best] ? i : best), 0)
  const splitTotal = split.consignataria + split.frigorifico
  const consigPct = splitTotal > 0 ? Math.round((split.consignataria / splitTotal) * 100) : 0

  return (
    <>
      <AutoRefresh intervalMs={45_000} />
      <AdminPageHeader
        title="En vivo"
        meta="actualiza cada 45 s"
        description="Quién está mirando qué: ahora, en la última hora y en las últimas 24 horas."
      />

      {!ok && (
        <p className="terminal-panel px-panel py-2 text-xxs text-zinc-500 font-terminal">
          No se pudieron leer las vistas de perfil. Los números en cero no son reales.
        </p>
      )}

      <LiveActivityFeed initial={live} />

      <div className="grid gap-px lg:grid-cols-2">
        <AdminSection title="Perfiles más vistos · 24 h" flush>
          {live.topProfiles.length === 0 ? (
            <AdminEmpty>Ningún perfil tuvo vistas en las últimas 24 horas.</AdminEmpty>
          ) : (
            <ol>
              {live.topProfiles.map((p, i) => (
                <li
                  key={`${p.type}:${p.slug}`}
                  className="border-b border-terminal-border last:border-b-0 px-panel py-1.5 flex items-center gap-2"
                >
                  <span className="w-5 text-right text-xxs text-zinc-500 tabular-nums font-terminal">{i + 1}</span>
                  <Badge tone={p.type === 'frigorifico' ? 'warning' : 'accent'}>
                    {p.type === 'frigorifico' ? 'Frig.' : 'Cons.'}
                  </Badge>
                  <Link
                    href={p.href}
                    className="flex-1 min-w-0 truncate text-data font-terminal text-ink hover:text-accent transition-colors"
                    title={p.name}
                  >
                    {p.name}
                  </Link>
                  {p.type === 'consignataria' && (
                    <Link
                      href={`/admin/consignatarias?slug=${encodeURIComponent(p.slug)}`}
                      className="hidden sm:inline text-xxs text-zinc-500 hover:text-accent font-terminal"
                    >
                      editar
                    </Link>
                  )}
                  <span className="w-12 text-right text-data font-terminal tabular-nums text-zinc-300">{nf(p.count)}</span>
                </li>
              ))}
            </ol>
          )}
        </AdminSection>

        <AdminSection
          title="Vistas por hora · 24 h"
          action={
            hourly[peakIdx] > 0 ? (
              <span className="text-xxs text-zinc-500 font-terminal tabular-nums">
                pico {nf(hourly[peakIdx])} a las {horaDeBucket(peakIdx)} h
              </span>
            ) : undefined
          }
        >
          <div className="space-y-4">
            <div>
              <HourlyBars buckets={hourly} />
              <div className="mt-1 flex justify-between text-xxs font-terminal text-zinc-500">
                <span>hace 24 h</span>
                <span>hace 12 h</span>
                <span className="text-live">últimas 2 h</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xxs font-terminal mb-1 tabular-nums">
                <span className="text-accent">
                  Consignatarias {consigPct}% · {nf(split.consignataria)}
                </span>
                <span className="text-warning">
                  {nf(split.frigorifico)} · {100 - consigPct}% Frigoríficos
                </span>
              </div>
              <div className="h-2 w-full rounded-[2px] overflow-hidden bg-zinc-800 flex" aria-hidden>
                {splitTotal > 0 && (
                  <>
                    <div className="h-full bg-accent" style={{ width: `${consigPct}%` }} />
                    <div className="h-full bg-warning" style={{ width: `${100 - consigPct}%` }} />
                  </>
                )}
              </div>
              <p className="mt-1 text-xxs text-zinc-500 font-terminal">Reparto de todas las vistas de perfil de las últimas 24 horas.</p>
            </div>
          </div>
        </AdminSection>
      </div>

      <Suspense fallback={<SectionSkeleton title="Tráfico · 7 días" rows={5} />}>
        <WeeklyTrafficCard />
      </Suspense>
    </>
  )
}
