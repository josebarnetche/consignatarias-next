'use client'

import Link from 'next/link'

interface Consignataria {
  display_name: string
  canonical_slug: string
  verified: boolean
}

interface Claim {
  id: string
  consignataria_slug: string
  status: string
  created_at: string
  consignatarias: { display_name: string; canonical_slug: string } | null
}

interface Auction {
  title: string
  date: string
  location: string
  time: string | null
}

interface AuctionResult {
  id: string
  auction_date: string
  auction_title: string
  total_heads_sold: number | null
  average_price: number | null
}

interface Props {
  email: string
  consignataria: Consignataria | null
  claims: Claim[]
  auctions: Auction[]
  auctionResults: AuctionResult[]
}

function formatDate(d: string) {
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

export default function DashboardClient({ email, consignataria, claims, auctions, auctionResults }: Props) {
  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      {/* Header */}
      <div className="terminal-panel">
        <div className="terminal-panel-header">
          <span className="text-zinc-200 text-label tracking-widest">MI PANEL</span>
        </div>
        <div className="px-panel py-3">
          <span className="text-xxs text-zinc-500 font-terminal">{email}</span>
        </div>
      </div>

      {/* Consignataria */}
      {consignataria && (
        <div className="terminal-panel">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="text-zinc-200 text-label tracking-widest">MI CONSIGNATARIA</span>
            {consignataria.verified && (
              <span className="text-xxs font-terminal px-1.5 py-0.5 border border-positive/30 text-positive rounded-terminal">
                VERIFICADA
              </span>
            )}
          </div>
          <div className="px-panel py-3 space-y-2">
            <div className="text-data font-terminal text-zinc-200">
              {consignataria.display_name}
            </div>
            <Link
              href={`/consignatarias/${consignataria.canonical_slug}`}
              className="text-xxs text-accent font-terminal hover:underline"
            >
              Ver perfil público →
            </Link>
          </div>
        </div>
      )}

      {/* Upcoming auctions */}
      {auctions.length > 0 && (
        <div className="terminal-panel">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="text-zinc-200 text-label tracking-widest">PRÓXIMOS REMATES</span>
            <span className="text-xxs text-zinc-600 font-terminal">{auctions.length}</span>
          </div>
          <div className="divide-y divide-terminal-border">
            {auctions.map((a, i) => (
              <div key={i} className="px-panel py-2 flex items-center gap-4">
                <span className="text-xxs font-terminal text-zinc-500 tabular-nums w-12 flex-shrink-0">
                  {formatDate(a.date)}
                </span>
                {a.time && (
                  <span className="text-xxs font-terminal text-zinc-600 w-12 flex-shrink-0">
                    {a.time}
                  </span>
                )}
                <span className="text-data font-terminal text-zinc-300 flex-1 truncate">
                  {a.title}
                </span>
                <span className="text-xxs font-terminal text-zinc-600 hidden sm:inline">
                  {a.location}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auction results */}
      {consignataria && (
        <div className="terminal-panel">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="text-zinc-200 text-label tracking-widest">RESULTADOS</span>
            <Link
              href="/dashboard/resultados/nuevo"
              className="text-xxs font-terminal text-accent hover:underline"
            >
              Cargar resultado →
            </Link>
          </div>
          {auctionResults.length > 0 ? (
            <div className="divide-y divide-terminal-border">
              {auctionResults.map(r => (
                <div key={r.id} className="px-panel py-2 flex items-center gap-4">
                  <span className="text-xxs font-terminal text-zinc-500 tabular-nums w-12 flex-shrink-0">
                    {formatDate(r.auction_date)}
                  </span>
                  <span className="text-data font-terminal text-zinc-300 flex-1 truncate">
                    {r.auction_title}
                  </span>
                  {r.total_heads_sold != null && (
                    <span className="text-xxs font-terminal text-zinc-500 hidden sm:inline">
                      {r.total_heads_sold} cab.
                    </span>
                  )}
                  {r.average_price != null && (
                    <span className="text-xxs font-terminal text-positive tabular-nums">
                      ${Number(r.average_price).toLocaleString('es-AR')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-panel py-3">
              <span className="text-xxs font-terminal text-zinc-600">
                No hay resultados cargados. Subí los resultados de tus remates completados.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Claims status */}
      {claims.length > 0 && (
        <div className="terminal-panel">
          <div className="terminal-panel-header">
            <span className="text-zinc-200 text-label tracking-widest">MIS SOLICITUDES</span>
          </div>
          <div className="divide-y divide-terminal-border">
            {claims.map(claim => (
              <div key={claim.id} className="px-panel py-2 flex items-center gap-4">
                <span className="text-data font-terminal text-zinc-300 flex-1">
                  {claim.consignatarias?.display_name || claim.consignataria_slug}
                </span>
                <span className={`text-xxs font-terminal px-1.5 py-0.5 border rounded-terminal ${
                  claim.status === 'pending'
                    ? 'border-warning/30 text-warning'
                    : claim.status === 'approved'
                    ? 'border-positive/30 text-positive'
                    : 'border-negative/30 text-negative'
                }`}>
                  {claim.status === 'pending' ? 'PENDIENTE'
                    : claim.status === 'approved' ? 'APROBADA'
                    : 'RECHAZADA'}
                </span>
                <span className="text-xxs font-terminal text-zinc-600">
                  {formatDate(claim.created_at.slice(0, 10))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No consignataria */}
      {!consignataria && claims.length === 0 && (
        <div className="terminal-panel">
          <div className="px-panel py-6 text-center space-y-2">
            <p className="text-zinc-500 text-data font-terminal">
              No tenés una consignataria verificada.
            </p>
            <Link
              href="/consignatarias"
              className="text-xxs text-accent font-terminal hover:underline"
            >
              Buscá tu consignataria y solicitá la verificación →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
