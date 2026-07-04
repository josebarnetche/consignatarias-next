'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { HeroNumber, StatPill } from '@/components/pro'

const FREE_LIMIT = 3

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Parse the ISO date by hand — new Date('YYYY-MM-DD') is UTC-midnight and
// shifts a day in ART, and would also hydrate differently client-side.
function fmtFecha(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${parseInt(d, 10)} ${MESES[parseInt(m, 10) - 1]}`
}

interface ConsignatariaStats {
  slug: string
  name: string
  totalRemates: number
  upcomingRemates: number
  nextDate: string | null
  nextLocation: string | null
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

/**
 * "Mejor encaje" score — a decision aid built ONLY from real public signals
 * already present per consignataria (no invented data). It answers the
 * producer's real question: "¿a cuál de estas le mando mi hacienda?".
 *
 * Three real signals, normalized 0–100 *within the currently selected set*
 * (a relative comparison, not an absolute claim):
 *   - actividad próxima  (upcomingRemates) — quién está moviendo hacienda AHORA
 *   - volumen            (totalCabezas)    — escala de la plaza
 *   - trayectoria        (totalRemates)    — histórico de remates indexados
 * Verified profiles get a small, transparent confidence nudge.
 */
interface ScoredConsignataria extends ConsignatariaStats {
  actividadPct: number
  volumenPct: number
  trayectoriaPct: number
  score: number
}

function relPct(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.round((value / max) * 100)
}

function scoreSelection(list: ConsignatariaStats[]): ScoredConsignataria[] {
  const maxUpcoming = Math.max(1, ...list.map((c) => c.upcomingRemates))
  const maxCabezas = Math.max(1, ...list.map((c) => c.totalCabezas))
  const maxRemates = Math.max(1, ...list.map((c) => c.totalRemates))

  return list.map((c) => {
    const actividadPct = relPct(c.upcomingRemates, maxUpcoming)
    const volumenPct = relPct(c.totalCabezas, maxCabezas)
    const trayectoriaPct = relPct(c.totalRemates, maxRemates)
    // Decision weighting: lo que MUEVE hoy pesa más que el histórico.
    const base = actividadPct * 0.5 + volumenPct * 0.3 + trayectoriaPct * 0.2
    const score = Math.round(Math.min(100, base + (c.verified ? 4 : 0)))
    return { ...c, actividadPct, volumenPct, trayectoriaPct, score }
  })
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

  // Decision layer: score + rank the current selection on REAL public signals.
  const scored = useMemo(() => scoreSelection(selectedConsignatarias), [selectedConsignatarias])
  const ranked = useMemo(() => [...scored].sort((a, b) => b.score - a.score), [scored])
  const winner = ranked[0]
  const runnerUp = ranked[1]

  // Salida más rápida: quién tiene el próximo remate más cercano en fecha.
  // El plazo real que el productor controla no es el de cobro (dato que no
  // existe público) sino el de SALIDA — cuándo puede efectivamente vender.
  const fastestExit = useMemo(() => {
    const withNext = selectedConsignatarias.filter(
      (c): c is ConsignatariaStats & { nextDate: string } => c.nextDate !== null
    )
    if (withNext.length === 0) return null
    return withNext.reduce((best, c) => (c.nextDate < best.nextDate ? c : best))
  }, [selectedConsignatarias])

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
          Seleccioná hasta {FREE_LIMIT} consignatarias y decidí <span className="text-zinc-200">a cuál mandarle tu hacienda</span>.
          Ordenamos por encaje real — actividad, volumen y trayectoria — y te decimos quién te da salida antes.
        </p>
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
              {filtered.slice(0, 50).map(c => {
                const isSel = selected.includes(c.slug)
                const blocked = !isSel && atFreeLimit
                return (
                  <button
                    key={c.slug}
                    onClick={() => toggleSelect(c.slug)}
                    disabled={blocked}
                    aria-pressed={isSel}
                    className={`w-full px-panel py-3 text-left border-b border-terminal-border transition-colors min-h-[44px]
                      ${isSel
                        ? 'bg-accent/10 border-l-2 border-l-accent'
                        : 'hover:bg-zinc-800/50'}
                      ${blocked
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-200">{c.name}</span>
                      {c.verified && (
                        <span className="text-xxs text-emerald-400" title="Perfil verificado">✓</span>
                      )}
                    </div>
                    <div className="text-xxs text-zinc-500 mt-1">
                      {c.upcomingRemates > 0
                        ? <span className="text-emerald-400">{c.upcomingRemates} próximo{c.upcomingRemates === 1 ? '' : 's'}</span>
                        : <span>{c.totalRemates} remates</span>}
                      {' · '}
                      {c.provincias.slice(0, 2).join(', ')}
                      {c.provincias.length > 2 && ` +${c.provincias.length - 2}`}
                    </div>
                  </button>
                )
              })}
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
                    Seleccioná consignatarias del panel izquierdo para ver a cuál te conviene mandarle la hacienda
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
              {/* DECISION — best fit verdict (free hook, public data) */}
              {winner && (
                <div className="terminal-panel" style={{ borderColor: 'rgba(56,189,248,0.4)' }}>
                  <div className="terminal-panel-header" style={{ color: '#38bdf8' }}>
                    Mejor encaje
                  </div>
                  <div className="px-panel py-5">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                      <HeroNumber
                        label="Recomendada por actividad y volumen"
                        value={winner.name}
                        tone="accent"
                        size="text-xl"
                        sub={
                          selectedConsignatarias.length > 1 && runnerUp
                            ? <>encaje {winner.score} · supera a {runnerUp.name} ({runnerUp.score})</>
                            : <>encaje {winner.score} / 100</>
                        }
                      />
                      <Link
                        href={`/consignatarias/${winner.slug}`}
                        className="shrink-0 inline-flex items-center justify-center min-h-[44px] px-4 text-xxs font-terminal uppercase tracking-wider"
                        style={{ background: 'rgba(56,189,248,0.9)', color: '#000', borderRadius: '2px' }}
                      >
                        Ver perfil →
                      </Link>
                    </div>
                    {/* Per-consignataria score breakdown — relative bars (real signals) */}
                    <div className="mt-5 space-y-4">
                      {ranked.map((c) => (
                        <div key={c.slug} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-data text-zinc-200 font-terminal">{c.name}</span>
                            {c.verified && <span className="text-xxs text-emerald-400" title="Verificado">✓</span>}
                            {c === winner && (
                              <span className="text-[10px] font-terminal uppercase tracking-wider px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>
                                Top
                              </span>
                            )}
                            <span className="ml-auto text-zinc-500 text-xxs font-terminal tabular-nums">encaje {c.score}</span>
                          </div>
                          <StatPill label="Actividad (próximos remates)" value={c.actividadPct} />
                          <StatPill label="Volumen (cabezas)" value={c.volumenPct} />
                          <StatPill label="Trayectoria (remates)" value={c.trayectoriaPct} />
                        </div>
                      ))}
                    </div>
                    <p className="text-zinc-500 text-xxs mt-4 leading-relaxed">
                      Encaje relativo entre las seleccionadas, sobre datos públicos: próximos remates, cabezas estimadas y remates indexados. No es recomendación de inversión.
                    </p>
                  </div>
                </div>
              )}

              {/* Comparison Table — free, public data (the hook) */}
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
                    {/* Próximos remates — the decision-relevant number, shown first + hero color */}
                    <tr className="border-b border-terminal-border">
                      <td className="px-panel py-3 text-sm text-zinc-400">
                        Próximos remates
                      </td>
                      {selectedConsignatarias.map(c => (
                        <td key={c.slug} className="px-4 py-3 text-sm font-mono">
                          <span className={c.upcomingRemates > 0 ? 'text-emerald-400' : 'text-zinc-600'}>
                            {c.upcomingRemates}
                          </span>
                        </td>
                      ))}
                    </tr>

                    {/* Próximo remate — fecha y lugar concretos */}
                    <tr className="border-b border-terminal-border">
                      <td className="px-panel py-3 text-sm text-zinc-400">
                        Próximo remate
                      </td>
                      {selectedConsignatarias.map(c => (
                        <td key={c.slug} className="px-4 py-3 text-sm">
                          {c.nextDate ? (
                            <div>
                              <span className="font-mono text-zinc-200">{fmtFecha(c.nextDate)}</span>
                              {c.nextLocation && (
                                <div className="text-xxs text-zinc-500 mt-0.5">{c.nextLocation}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                      ))}
                    </tr>

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

                    {/* Cabezas */}
                    <tr className="border-b border-terminal-border">
                      <td className="px-panel py-3 text-sm text-zinc-400">
                        Cabezas (est.)
                      </td>
                      {selectedConsignatarias.map(c => (
                        <td key={c.slug} className="px-4 py-3 text-sm text-zinc-200 font-mono">
                          {c.totalCabezas > 0 ? `~${fmt(c.totalCabezas)}` : <span className="text-zinc-600">s/d</span>}
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

              {/* Salida — quién te da salida antes (dato real: calendario de remates) */}
              {fastestExit && selectedConsignatarias.length > 1 && (
                <div className="terminal-panel">
                  <div className="terminal-panel-header">Salida más rápida</div>
                  <div className="px-panel py-5">
                    <HeroNumber
                      label="Tu hacienda sale antes con"
                      value={fastestExit.name}
                      tone="positive"
                      size="text-lg"
                      sub={`remata el ${fmtFecha(fastestExit.nextDate)}${fastestExit.nextLocation ? ` · ${fastestExit.nextLocation}` : ''}`}
                    />
                    <p className="text-zinc-500 text-xxs mt-3 leading-relaxed">
                      Según el calendario de remates programados. Consultá el cierre de inscripción de hacienda con la consignataria.
                    </p>
                  </div>
                </div>
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
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200"
                      />
                      <button
                        onClick={saveEmail}
                        className="px-6 py-2 min-h-[44px] bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium rounded transition-colors"
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
