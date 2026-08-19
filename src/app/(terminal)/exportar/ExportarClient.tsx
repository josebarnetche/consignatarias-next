'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSessionTier } from '@/lib/use-session-tier'
import ProUpgradePrompt from '@/components/ProUpgradePrompt'

const PROVINCIAS = [
  'BUENOS AIRES', 'SANTA FE', 'CORDOBA', 'CHACO', 'SAN LUIS',
  'ENTRE RIOS', 'CORRIENTES', 'LA PAMPA', 'MISIONES', 'FORMOSA'
]

const TIPOS = [
  { value: 'general', label: 'General' },
  { value: 'invernada', label: 'Invernada' },
  { value: 'cria', label: 'Cría' },
  { value: 'especial', label: 'Especial' },
  { value: 'reproductores', label: 'Reproductores' },
]

export default function ExportarClient() {
  const [email, setEmail] = useState('')
  const [provincia, setProvincia] = useState('')
  const [tipo, setTipo] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready'>('idle')
  // Descargar el dataset es acción de usuario con cuenta: sin sesión no se exporta.
  const { loggedIn, loading: sessionLoading } = useSessionTier()

  const today = new Date().toISOString().slice(0, 10)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!email.trim()) return
    
    setStatus('loading')
    
    // Save email
    try {
      await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'exportar-datos' }),
      })
    } catch {
      // Continue
    }
    
    setStatus('ready')
  }

  function buildDownloadUrl(): string {
    const params = new URLSearchParams()
    if (provincia) params.set('provincia', provincia)
    if (tipo) params.set('tipo', tipo)
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', hasta)
    params.set('format', format)
    
    return `/api/remates/export?${params.toString()}`
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header — fondo sutil: el archivo histórico (universo de marca) */}
      <div className="relative overflow-hidden rounded-xl mb-8">
        <img
          src="/marca/features/feat-archivo-historico.jpg"
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#09090b]/40 via-[#09090b]/70 to-[#09090b]" aria-hidden="true" />
        <div className="relative py-3">
        <Link href="/remates" className="text-xxs font-terminal text-accent hover:text-accent-bright mb-4 inline-block">
          ← Volver a remates
        </Link>
        <h1 className="text-2xl font-terminal text-zinc-100 mb-3">
          <span className="inline-flex w-9 h-9 rounded bg-zinc-100 items-center justify-center align-middle mr-2" aria-hidden="true">
            <img src="/marca/iconos-color/indice.png" alt="" className="w-6 h-6" />
          </span>
          Exportar Datos de Remates
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Descargá los datos de remates ganaderos en formato CSV o JSON.
          Ideal para análisis, reportes o integración con otros sistemas.
        </p>
        </div>
      </div>

      {status !== 'ready' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email capture */}
          <div className="terminal-panel">
            <div className="terminal-panel-header">Tu email</div>
            <div className="px-panel py-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200 placeholder-zinc-500"
              />
              <p className="text-xxs text-zinc-500 mt-2">
                Te avisamos cuando agreguemos nuevos campos o mejoras al export.
              </p>
            </div>
          </div>

          {/* Format */}
          <div className="terminal-panel">
            <div className="terminal-panel-header">Formato</div>
            <div className="px-panel py-4">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    checked={format === 'csv'}
                    onChange={() => setFormat('csv')}
                    className="text-accent"
                  />
                  <span className="text-sm text-zinc-200">CSV</span>
                  <span className="text-xxs text-zinc-500">(Excel, Google Sheets)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    checked={format === 'json'}
                    onChange={() => setFormat('json')}
                    className="text-accent"
                  />
                  <span className="text-sm text-zinc-200">JSON</span>
                  <span className="text-xxs text-zinc-500">(APIs, desarrollo)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="terminal-panel">
            <div className="terminal-panel-header">Filtros (opcional)</div>
            <div className="px-panel py-4 space-y-4">
              {/* Provincia */}
              <div>
                <label className="block text-xxs text-zinc-500 uppercase tracking-wider mb-2">
                  Provincia
                </label>
                <select
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200"
                >
                  <option value="">Todas las provincias</option>
                  {PROVINCIAS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-xxs text-zinc-500 uppercase tracking-wider mb-2">
                  Tipo de remate
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200"
                >
                  <option value="">Todos los tipos</option>
                  {TIPOS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs text-zinc-500 uppercase tracking-wider mb-2">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                    min={today}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-xxs text-zinc-500 uppercase tracking-wider mb-2">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                    min={desde || today}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          {loggedIn ? (
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium rounded transition-colors disabled:opacity-50"
            >
              {status === 'loading' ? 'Preparando...' : 'Generar Descarga'}
            </button>
          ) : (
            <Link
              href="/login?next=/exportar"
              aria-disabled={sessionLoading}
              className="block w-full py-3 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium rounded transition-colors text-center"
            >
              Ingresá para exportar
            </Link>
          )}
        </form>
      ) : (
        <div className="terminal-panel">
          <div className="terminal-panel-header text-emerald-400">✓ Listo para descargar</div>
          <div className="px-panel py-6 text-center space-y-4">
            <p className="text-zinc-300 text-sm">
              Tu archivo está listo. Hacé click para descargar.
            </p>
            
            <a
              href={loggedIn ? buildDownloadUrl() : '/login?next=/exportar'}
              download={loggedIn}
              className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar {format.toUpperCase()}
            </a>

            <button
              onClick={() => setStatus('idle')}
              className="text-sm text-accent hover:text-accent-bright transition-colors mt-4 block mx-auto"
            >
              ← Generar otra descarga
            </button>
          </div>
        </div>
      )}

      {/* Fields info */}
      <div className="terminal-panel mt-6">
        <div className="terminal-panel-header">Campos incluidos</div>
        <div className="px-panel py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            {[
              'Fecha', 'Hora', 'Consignataria', 'Ubicación', 'Provincia',
              'Tipo', 'Categoría', 'Cabezas Est.', 'Catálogo', 'Transmisión'
            ].map(field => (
              <div key={field} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full" />
                <span className="text-zinc-400">{field}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* PRO Upgrade Prompt */}
        <ProUpgradePrompt
          benefit="Datos completos para decidir mejor. Sin límites de exportación."
          context="exportar"
          variant="card"
        />
      </div>
    </div>
  )
}
