import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentSession } from '@/lib/user-tier'
import { hasApiAccess } from '@/lib/api-keys'
import { getAllReports, getReportStatsForUser } from '@/lib/reports'

export const metadata: Metadata = {
  title: 'Mis reportes',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default async function ReportesPage() {
  const { user, tier } = await getCurrentSession()
  if (!user) {
    redirect('/login?next=/cuenta/reportes')
  }
  // Access: PRO Usuario OR any Enterprise tier
  const isEnterprise = await hasApiAccess(user.id)
  if (tier !== 'pro' && !isEnterprise) {
    redirect('/upgrade?next=/cuenta/reportes')
  }

  const reports = getAllReports()
  const stats = await getReportStatsForUser(user.id)

  // Sort by publishedAt desc
  const sorted = [...reports].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  )

  const totalDownloads = Object.values(stats).reduce(
    (sum, s) => sum + s.downloadCount,
    0,
  )
  const reportsDownloaded = Object.keys(stats).length

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 text-xxs font-terminal uppercase tracking-wider text-zinc-500">
          <Link href="/cuenta" className="hover:text-zinc-300">
            Tu cuenta
          </Link>
          <span>/</span>
          <span className="text-zinc-300">Mis reportes</span>
        </div>
        <h1 className="text-xl font-heading text-zinc-100 mb-2">
          <span className="inline-flex w-9 h-9 rounded bg-zinc-100 items-center justify-center align-middle mr-2" aria-hidden="true">
            <img src="/marca/iconos-color/guia-dte.png" alt="" className="w-6 h-6" />
          </span>
          Mis reportes
        </h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          Reportes premium incluidos en tu plan PRO. Descargás cuantas veces
          necesites — registramos el conteo para que sepas qué ya descargaste.
        </p>
      </div>

      {/* Stats strip */}
      <div className="terminal-panel mb-6">
        <div className="terminal-panel-header">Tu actividad</div>
        <div className="grid grid-cols-3 gap-px bg-terminal-border">
          <div className="bg-terminal-panel px-4 py-3">
            <div className="text-zinc-100 text-lg font-terminal tabular-nums">
              {reports.length}
            </div>
            <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mt-1">
              Reportes disponibles
            </div>
          </div>
          <div className="bg-terminal-panel px-4 py-3">
            <div className="text-zinc-100 text-lg font-terminal tabular-nums">
              {reportsDownloaded}
            </div>
            <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mt-1">
              Ya descargados
            </div>
          </div>
          <div className="bg-terminal-panel px-4 py-3">
            <div className="text-zinc-100 text-lg font-terminal tabular-nums">
              {totalDownloads}
            </div>
            <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mt-1">
              Total descargas
            </div>
          </div>
        </div>
      </div>

      {/* Reports list */}
      <div className="terminal-panel">
        <div className="terminal-panel-header">Catálogo</div>
        <div className="divide-y divide-terminal-border">
          {sorted.map((r) => {
            const stat = stats[r.slug]
            const downloaded = !!stat
            return (
              <div
                key={r.slug}
                className="px-panel py-4 flex flex-col md:flex-row md:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-zinc-200 font-medium text-data">
                      {r.title}
                    </span>
                    {r.tag && (
                      <span
                        className="px-1.5 py-0.5 text-xxs font-terminal uppercase tracking-wider"
                        style={{
                          background: 'rgba(56, 189, 248, 0.12)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          borderRadius: '2px',
                        }}
                      >
                        {r.tag}
                      </span>
                    )}
                    <span className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider">
                      {r.format}
                      {r.pages ? ` · ${r.pages} pág` : ''}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-data leading-relaxed mb-1">
                    {r.description}
                  </p>
                  <div className="text-zinc-500 text-xxs">
                    Publicado: {formatDate(r.publishedAt)}
                    {downloaded && (
                      <>
                        <span className="text-zinc-700 mx-2">·</span>
                        <span className="text-zinc-400">
                          Descargado {stat.downloadCount}{' '}
                          {stat.downloadCount === 1 ? 'vez' : 'veces'}
                        </span>
                        <span className="text-zinc-700 mx-2">·</span>
                        <span>Última: {formatDate(stat.lastDownloadedAt)}</span>
                      </>
                    )}
                  </div>
                </div>
                <a
                  href={`/api/reportes/${r.slug}/download`}
                  className="terminal-btn whitespace-nowrap"
                  style={
                    downloaded
                      ? undefined
                      : {
                          borderColor: 'rgba(56, 189, 248, 0.6)',
                          color: '#38bdf8',
                        }
                  }
                >
                  {downloaded ? 'Descargar de nuevo' : 'Descargar →'}
                </a>
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-zinc-600 font-mono text-xxs text-center mt-8">
        ¿Falta un reporte? Escribinos a{' '}
        <a
          href="mailto:agro@memola.com.ar"
          className="text-zinc-500 hover:text-zinc-300 underline-offset-2 hover:underline"
        >
          agro@memola.com.ar
        </a>
        .
      </p>
    </div>
  )
}
