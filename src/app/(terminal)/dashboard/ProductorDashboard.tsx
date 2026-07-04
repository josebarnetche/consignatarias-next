import Link from 'next/link'

interface UpcomingRemate {
  id: number
  date: string
  time: string | null
  consignatariaName: string
  consignatariaSlug: string
  location: string
}

interface Props {
  email: string
  /** Valor de la hacienda hoy (ARS) — null si no cargó */
  herdValueArs: number | null
  herdCabezas: number
  followedCount: number
  /** Próximos remates de las consignatarias seguidas */
  upcoming: UpcomingRemate[]
  marksCount: number
}

function fmt(n: number): string {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

function fmtFecha(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

/**
 * Panel del PRODUCTOR — la mayoría de los registros. Su loop: cargar hacienda
 * (valor diario) + seguir consignatarias (aviso cuando publican remate) +
 * marcar remates. El flujo de reclamar perfil (consignataria/frigorífico) queda
 * como card secundaria, no como portada.
 */
export default function ProductorDashboard({ email, herdValueArs, herdCabezas, followedCount, upcoming, marksCount }: Props) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <div>
        <h1 className="text-2xl font-terminal text-zinc-100 mb-1">Tu panel</h1>
        <p className="text-zinc-500 text-xxs font-terminal">{email}</p>
      </div>

      {/* Mi hacienda — el valor primero */}
      <section className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <span>Mi ganado</span>
          <Link href="/mi-ganado" className="text-xxs text-accent uppercase tracking-wider hover:text-accent-bright -my-2 py-2 pl-3">
            {herdValueArs != null ? 'Administrar →' : 'Cargar →'}
          </Link>
        </div>
        <div className="px-panel py-4">
          {herdValueArs != null ? (
            <>
              <div className="text-xxs text-zinc-500 uppercase tracking-wider mb-1">Valor hoy · {fmt(herdCabezas)} cab.</div>
              <div className="text-3xl text-positive font-mono font-medium tabular-nums">${fmt(herdValueArs)}</div>
            </>
          ) : (
            <p className="text-sm text-zinc-400">
              Cargá tu hacienda una vez y vuelve valuada al INMAG de cada día.
            </p>
          )}
        </div>
      </section>

      {/* Consignatarias seguidas + sus próximos remates */}
      <section className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <span>Tus consignatarias</span>
          <span className="text-xxs text-zinc-500 tabular-nums">{followedCount} seguida{followedCount === 1 ? '' : 's'}</span>
        </div>
        {followedCount === 0 ? (
          <div className="px-panel py-4">
            <p className="text-sm text-zinc-400 mb-3">
              Seguí a las consignatarias con las que operás y te avisamos cuando publican un remate o catálogo.
            </p>
            <Link
              href="/consignatarias"
              className="inline-flex items-center justify-center min-h-[40px] px-4 bg-accent hover:bg-sky-300 text-zinc-950 text-xxs font-terminal font-bold uppercase tracking-wider rounded-sm transition-colors"
            >
              Buscar consignatarias →
            </Link>
          </div>
        ) : (
          <div className="px-panel py-2">
            <div className="text-xxs text-zinc-500 uppercase tracking-wider px-cell pt-1 pb-2">Próximos remates de las que seguís</div>
            {upcoming.map((r) => (
              <Link
                key={r.id}
                href={`/consignatarias/${r.consignatariaSlug}`}
                className="flex items-center gap-2.5 px-cell min-h-[40px] py-2 border-b border-terminal-border hover:bg-accent/[0.03] group"
              >
                <span className="w-[44px] flex-shrink-0 tabular-nums text-data font-terminal text-zinc-400">{fmtFecha(r.date)}</span>
                <span className="w-[36px] flex-shrink-0 text-data font-terminal text-zinc-500 tabular-nums">{r.time ?? '—'}</span>
                <span className="flex-1 min-w-0 text-data font-terminal text-zinc-200 truncate group-hover:text-accent">{r.consignatariaName}</span>
                <span className="hidden sm:inline text-xxs text-zinc-500 truncate max-w-[120px]">{r.location.split(',')[0]}</span>
              </Link>
            ))}
            {upcoming.length === 0 && (
              <p className="px-cell py-3 text-data text-zinc-500 font-terminal">
                Las consignatarias que seguís no tienen remates programados. Te avisamos cuando publiquen.
              </p>
            )}
            <div className="flex items-center justify-between pt-2 pb-1">
              <Link href="/mi-cuenta/favoritos" className="text-xxs text-zinc-500 hover:text-zinc-300">Administrar seguidas</Link>
              <Link href="/consignatarias" className="text-xxs text-accent uppercase tracking-wider hover:text-accent-bright -my-2 py-2 pl-3">Seguir más →</Link>
            </div>
          </div>
        )}
      </section>

      {/* Remates marcados */}
      <section className="terminal-panel">
        <div className="px-panel py-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm text-zinc-200 mb-0.5">Remates marcados</p>
            <p className="text-xxs text-zinc-500">
              {marksCount > 0
                ? `${fmt(marksCount)} marcado${marksCount === 1 ? '' : 's'} — tu historial de remates.`
                : 'Marcá los remates que te interesan o en los que estuviste.'}
            </p>
          </div>
          <Link href="/remates" className="text-xxs text-accent uppercase tracking-wider hover:text-accent-bright whitespace-nowrap">Ver calendario →</Link>
        </div>
      </section>

      {/* Alertas y arranque */}
      <section className="terminal-panel">
        <div className="px-panel py-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm text-zinc-200 mb-0.5">Alertas y resumen semanal</p>
            <p className="text-xxs text-zinc-500">Activá los avisos desde tu cuenta — checklist de arranque incluido.</p>
          </div>
          <Link href="/cuenta" className="text-xxs text-accent uppercase tracking-wider hover:text-accent-bright whitespace-nowrap">Ir a mi cuenta →</Link>
        </div>
      </section>

      {/* B2B — secundario, no portada */}
      <section className="border border-zinc-800 bg-zinc-900/30 rounded p-4">
        <p className="text-xxs text-zinc-500 leading-relaxed">
          ¿Operás una consignataria o un frigorífico?{' '}
          <Link href="/consignatarias" className="text-zinc-300 hover:text-accent underline underline-offset-2">Buscá tu consignataria</Link>{' '}
          o{' '}
          <Link href="/frigorificos" className="text-zinc-300 hover:text-accent underline underline-offset-2">tu frigorífico</Link>{' '}
          y reclamá el perfil para editarlo, publicar remates y ver analytics.
        </p>
      </section>
    </div>
  )
}
