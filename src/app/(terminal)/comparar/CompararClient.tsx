'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProUpgradePrompt from '@/components/ProUpgradePrompt'
import { useSessionTier } from '@/lib/use-session-tier'

const FREE_LIMIT = 3
const _PRO_LIMIT = 5 // Reserved for future use

const METODO_LABELS: Record<string, string> = {
  'transferencia': 'Transferencia',
  'cheque': 'Cheque',
  'efectivo': 'Efectivo',
  'al-rinde': 'Al rinde',
  'al-gancho': 'Al gancho',
  'usd-billete': 'USD billete',
  'usdt': 'USDT',
  'permuta': 'Permuta',
  'mercado-pago': 'Mercado Pago',
}

interface MediosPagoSummary {
  metodos: string[]
  plazoMin: number | null
}

function fmtPlazo(dias: number | null): string {
  if (dias === null) return '—'
  if (dias === 0) return 'Contado'
  if (dias === 1) return '1 día'
  return `${dias} días`
}

interface ConsignatariaStats {
  slug: string
  name: string
  totalRemates: number
  upcomingRemates: number
  provincias: string[]
  tipos: string[]
  totalCabezas: number
  verified: boolean
}

const TYPE_LABELS: Record<string, string> = {
  general: 'General',
  invernada: 'Invernada',
  cria: 'Cría',
  especial: 'Especial',
  reproductores: 'Reproductores',
}

function fmt(n: number): string {
  return n.toLocaleString('es-AR')
}

export default function CompararClient({ consignatarias }: { consignatarias: ConsignatariaStats[] }) {
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [email, setEmail] = useState('')
  const [emailSaved, setEmailSaved] = useState(false)

  const filtered = search.trim()
    ? consignatarias.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.provincias.some(p => p.toLowerCase().includes(search.toLowerCase()))
      )
    : consignatarias

  function toggleSelect(slug: string) {
    if (selected.includes(slug)) {
      setSelected(selected.filter(s => s !== slug))
    } else if (selected.length < FREE_LIMIT) {
      setSelected([...selected, slug])
    }
  }

  const atFreeLimit = selected.length >= FREE_LIMIT

  async function saveEmail() {
    if (!email.trim() || emailSaved) return
    
    try {
      await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'comparar-consignatarias' }),
      })
      setEmailSaved(true)
    } catch {
      // Continue
    }
  }

  const selectedConsignatarias = selected.map(slug =>
    consignatarias.find(c => c.slug === slug)!
  ).filter(Boolean)

  // Medios de pago + plazo de cobro — PRO. Fetched on demand (never baked into
  // the static HTML) and only when the user is PRO.
  const session = useSessionTier()
  const [medios, setMedios] = useState<Record<string, MediosPagoSummary>>({})

  useEffect(() => {
    if (session.tier !== 'pro' || selected.length === 0) return
    const slugs = selected.join(',')
    fetch(`/api/consignatarias/medios-pago?slugs=${encodeURIComponent(slugs)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.result) setMedios((prev) => ({ ...prev, ...j.result }))
      })
      .catch(() => {})
  }, [session.tier, selected])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/consignatarias" className="text-xxs font-terminal text-accent hover:text-accent-bright mb-4 inline-block">
          ← Ver directorio
        </Link>
        <h1 className="text-2xl font-terminal text-zinc-100 mb-3">
          Comparar Consignatarias
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Seleccioná hasta {FREE_LIMIT} consignatarias para comparar lado a lado. 
          Analizá remates programados, cobertura geográfica y tipos de operación.
        </p>
        {atFreeLimit && (
          <div className="mt-4">
            <ProUpgradePrompt 
              benefit="Tu remate llega a +500 productores cada semana. Destacalo."
              context="comparar"
              variant="card"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selection Panel */}
        <div className="lg:col-span-1">
          <div className="terminal-panel sticky top-4">
            <div className="terminal-panel-header">
              Seleccionar ({selected.length}/{FREE_LIMIT})
            </div>
            
            {/* Search */}
            <div className="px-panel py-3 border-b border-terminal-border">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o provincia..."
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200 placeholder-zinc-500"
              />
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {filtered.slice(0, 50).map(c => (
                <button
                  key={c.slug}
                  onClick={() => toggleSelect(c.slug)}
                  disabled={!selected.includes(c.slug) && atFreeLimit}
                  className={`w-full px-panel py-3 text-left border-b border-terminal-border transition-colors
                    ${selected.includes(c.slug) 
                      ? 'bg-accent/10 border-l-2 border-l-accent' 
                      : 'hover:bg-zinc-800/50'}
                    ${!selected.includes(c.slug) && atFreeLimit 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-200">{c.name}</span>
                    {c.verified && (
                      <span className="text-xxs text-emerald-400">✓</span>
                    )}
                  </div>
                  <div className="text-xxs text-zinc-500 mt-1">
                    {c.totalRemates} remates · {c.provincias.slice(0, 2).join(', ')}
                    {c.provincias.length > 2 && ` +${c.provincias.length - 2}`}
                  </div>
                </button>
              ))}
            </div>

            {filtered.length > 50 && (
              <div className="px-panel py-2 text-xxs text-zinc-500 text-center border-t border-terminal-border">
                +{filtered.length - 50} más. Usá el buscador.
              </div>
            )}
          </div>
        </div>

        {/* Comparison Panel */}
        <div className="lg:col-span-2">
          {selectedConsignatarias.length === 0 ? (
            <div className="terminal-panel">
              <div className="px-panel py-12 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-accent/5 border border-accent/20 mb-2">
                  <svg className="w-8 h-8 text-accent/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-zinc-300 font-terminal font-medium mb-1">
                    Comparador listo
                  </p>
                  <p className="text-xxs text-zinc-500 font-terminal">
                    Seleccioná consignatarias del panel izquierdo para ver la comparación
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xxs text-zinc-600 font-terminal pt-2">
                  <span>←</span>
                  <span>Buscá y hacé click para agregar</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Comparison Table */}
              <div className="terminal-panel overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-terminal-border">
                      <th className="px-panel py-3 text-left text-xxs text-zinc-500 uppercase tracking-wider font-terminal">
                        Métrica
                      </th>
                      {selectedConsignatarias.map(c => (
                        <th key={c.slug} className="px-4 py-3 text-left text-xxs text-zinc-500 uppercase tracking-wider font-terminal">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-200 normal-case">{c.name.slice(0, 20)}</span>
                            {c.verified && <span className="text-emerald-400">✓</span>}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Total Remates */}
                    <tr className="border-b border-terminal-border">
                      <td className="px-panel py-3 text-sm text-zinc-400">
                        Total remates
                      </td>
                      {selectedConsignatarias.map(c => (
                        <td key={c.slug} className="px-4 py-3 text-sm text-zinc-200 font-mono">
                          {c.totalRemates}
                        </td>
                      ))}
                    </tr>

                    {/* Upcoming */}
                    <tr className="border-b border-terminal-border">
                      <td className="px-panel py-3 text-sm text-zinc-400">
                        Próximos remates
                      </td>
                      {selectedConsignatarias.map(c => (
                        <td key={c.slug} className="px-4 py-3 text-sm text-emerald-400 font-mono">
                          {c.upcomingRemates}
                        </td>
                      ))}
                    </tr>

                    {/* Cabezas */}
                    <tr className="border-b border-terminal-border">
                      <td className="px-panel py-3 text-sm text-zinc-400">
                        Cabezas (est.)
                      </td>
                      {selectedConsignatarias.map(c => (
                        <td key={c.slug} className="px-4 py-3 text-sm text-zinc-200 font-mono">
                          ~{fmt(c.totalCabezas)}
                        </td>
                      ))}
                    </tr>

                    {/* Provincias */}
                    <tr className="border-b border-terminal-border">
                      <td className="px-panel py-3 text-sm text-zinc-400">
                        Provincias
                      </td>
                      {selectedConsignatarias.map(c => (
                        <td key={c.slug} className="px-4 py-3 text-sm text-zinc-200">
                          <div className="flex flex-wrap gap-1">
                            {c.provincias.map(p => (
                              <span key={p} className="text-xxs bg-zinc-800 px-1.5 py-0.5 rounded">
                                {p.slice(0, 3)}
                              </span>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Tipos */}
                    <tr className="border-b border-terminal-border">
                      <td className="px-panel py-3 text-sm text-zinc-400">
                        Tipos de remate
                      </td>
                      {selectedConsignatarias.map(c => (
                        <td key={c.slug} className="px-4 py-3 text-sm text-zinc-200">
                          <div className="flex flex-wrap gap-1">
                            {c.tipos.map(t => (
                              <span key={t} className="text-xxs bg-zinc-800 px-1.5 py-0.5 rounded">
                                {TYPE_LABELS[t] || t}
                              </span>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Medios de pago — PRO */}
                    <tr className="border-b border-terminal-border">
                      <td className="px-panel py-3 text-sm text-zinc-400">
                        <span className="inline-flex items-center gap-1.5">
                          Medios de pago
                          <span className="text-[10px] font-terminal font-bold tracking-wider border border-amber-500/50 bg-amber-500/10 text-amber-400 rounded-sm px-1 py-0.5">PRO</span>
                        </span>
                      </td>
                      {selectedConsignatarias.map(c => (
                        <td key={c.slug} className="px-4 py-3 text-sm text-zinc-200">
                          {session.tier === 'pro' ? (
                            medios[c.slug]?.metodos?.length ? (
                              <div className="flex flex-wrap gap-1">
                                {medios[c.slug].metodos.map(m => (
                                  <span key={m} className="text-xxs bg-zinc-800 px-1.5 py-0.5 rounded">{METODO_LABELS[m] || m}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-zinc-600 text-xxs">Sin publicar</span>
                            )
                          ) : (
                            <Link href="/planes?from=comparar-medios" className="text-amber-400/80 hover:text-amber-300 text-xs inline-flex items-center gap-1">🔒 PRO</Link>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Días de cobro — PRO */}
                    <tr className="border-b border-terminal-border">
                      <td className="px-panel py-3 text-sm text-zinc-400">
                        <span className="inline-flex items-center gap-1.5">
                          Días de cobro
                          <span className="text-[10px] font-terminal font-bold tracking-wider border border-amber-500/50 bg-amber-500/10 text-amber-400 rounded-sm px-1 py-0.5">PRO</span>
                        </span>
                      </td>
                      {selectedConsignatarias.map(c => (
                        <td key={c.slug} className="px-4 py-3 text-sm text-zinc-200 font-mono">
                          {session.tier === 'pro' ? (
                            <span>{fmtPlazo(medios[c.slug]?.plazoMin ?? null)}</span>
                          ) : (
                            <Link href="/planes?from=comparar-plazo" className="text-amber-400/80 hover:text-amber-300 text-xs inline-flex items-center gap-1">🔒 PRO</Link>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Status */}
                    <tr>
                      <td className="px-panel py-3 text-sm text-zinc-400">
                        Perfil verificado
                      </td>
                      {selectedConsignatarias.map(c => (
                        <td key={c.slug} className="px-4 py-3 text-sm">
                          {c.verified ? (
                            <span className="text-emerald-400">✓ Verificado</span>
                          ) : (
                            <span className="text-zinc-500">No verificado</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* PRO upsell — medios de pago + días de cobro */}
              {!session.loading && session.tier !== 'pro' && (
                <ProUpgradePrompt
                  benefit="Compará medios de pago y días de cobro de cada consignataria. PRO por ARS $7.900/mes."
                  context="comparar-medios"
                  variant="card"
                />
              )}

              {/* Actions */}
              <div className="terminal-panel">
                <div className="px-panel py-4 flex flex-wrap items-center gap-4">
                  <span className="text-sm text-zinc-400">Ver perfiles:</span>
                  {selectedConsignatarias.map(c => (
                    <Link
                      key={c.slug}
                      href={`/consignatarias/${c.slug}`}
                      className="text-sm text-accent hover:text-accent-bright transition-colors"
                    >
                      {c.name.slice(0, 15)}... →
                    </Link>
                  ))}
                </div>
              </div>

              {/* Email capture */}
              {!emailSaved && (
                <div className="terminal-panel">
                  <div className="terminal-panel-header">Guardar comparación</div>
                  <div className="px-panel py-4">
                    <p className="text-sm text-zinc-400 mb-3">
                      Recibí actualizaciones cuando estas consignatarias publiquen nuevos remates.
                    </p>
                    <div className="flex gap-3">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200"
                      />
                      <button
                        onClick={saveEmail}
                        className="px-6 py-2 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium rounded transition-colors"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {emailSaved && (
                <div className="terminal-panel">
                  <div className="px-panel py-4 text-center text-emerald-400 text-sm">
                    ✓ Te avisaremos cuando haya novedades
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
