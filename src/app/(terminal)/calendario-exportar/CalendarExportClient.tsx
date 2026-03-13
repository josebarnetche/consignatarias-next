'use client'

import { useState } from 'react'
import Link from 'next/link'

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

export default function CalendarExportClient() {
  const [email, setEmail] = useState('')
  const [provincia, setProvincia] = useState('')
  const [tipo, setTipo] = useState('')
  const [dias, setDias] = useState('30')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready'>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!email.trim()) return
    
    setStatus('loading')
    
    // Save email to newsletter
    try {
      await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'calendar-export' }),
      })
    } catch {
      // Continue anyway
    }

    // Build download URL
    const params = new URLSearchParams()
    if (provincia) params.set('provincia', provincia)
    if (tipo) params.set('tipo', tipo)
    params.set('dias', dias)
    
    const url = `/api/calendario/ical?${params.toString()}`
    setDownloadUrl(url)
    setStatus('ready')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/remates" className="text-xxs font-terminal text-accent hover:text-accent-bright mb-4 inline-block">
          ← Volver a remates
        </Link>
        <h1 className="text-2xl font-terminal text-zinc-100 mb-3">
          Exportar Calendario de Remates
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Descargá el calendario de remates en formato iCal y sincronizalo automáticamente 
          con Google Calendar, Apple Calendar, Outlook o cualquier app de calendario.
        </p>
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
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
              />
              <p className="text-xxs text-zinc-500 mt-2">
                Te avisamos cuando agreguemos nuevas funcionalidades al calendario.
              </p>
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
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
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
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
                >
                  <option value="">Todos los tipos</option>
                  {TIPOS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Días */}
              <div>
                <label className="block text-xxs text-zinc-500 uppercase tracking-wider mb-2">
                  Período
                </label>
                <select
                  value={dias}
                  onChange={(e) => setDias(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
                >
                  <option value="7">Próximos 7 días</option>
                  <option value="14">Próximos 14 días</option>
                  <option value="30">Próximos 30 días</option>
                  <option value="60">Próximos 60 días</option>
                  <option value="90">Próximos 90 días</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium rounded transition-colors disabled:opacity-50"
          >
            {status === 'loading' ? 'Generando...' : 'Generar Calendario'}
          </button>
        </form>
      ) : (
        <div className="terminal-panel">
          <div className="terminal-panel-header text-emerald-400">✓ Calendario listo</div>
          <div className="px-panel py-6 text-center space-y-4">
            <p className="text-zinc-300 text-sm">
              Tu calendario está listo para descargar.
            </p>
            
            <a
              href={downloadUrl}
              download="remates-ganaderos.ics"
              className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar .ics
            </a>

            <div className="pt-4 border-t border-zinc-800 mt-6">
              <p className="text-xxs text-zinc-500 mb-3">
                O suscribite directamente (se actualiza automáticamente):
              </p>
              <code className="block bg-zinc-900 border border-zinc-700 p-3 text-xs text-zinc-400 break-all rounded">
                https://www.consignatarias.com.ar{downloadUrl}
              </code>
            </div>

            <button
              onClick={() => setStatus('idle')}
              className="text-sm text-accent hover:text-accent-bright transition-colors mt-4"
            >
              ← Generar otro calendario
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="terminal-panel mt-6">
        <div className="terminal-panel-header">Cómo agregar a tu calendario</div>
        <div className="px-panel py-4 space-y-4 text-sm text-zinc-400">
          <div>
            <p className="text-zinc-200 font-medium mb-1">Google Calendar</p>
            <p>Configuración → Añadir calendario → Desde URL → Pegar el link de suscripción</p>
          </div>
          <div className="border-t border-zinc-800 pt-4">
            <p className="text-zinc-200 font-medium mb-1">Apple Calendar</p>
            <p>Archivo → Nueva suscripción de calendario → Pegar el link</p>
          </div>
          <div className="border-t border-zinc-800 pt-4">
            <p className="text-zinc-200 font-medium mb-1">Outlook</p>
            <p>Agregar calendario → Desde Internet → Pegar el link</p>
          </div>
        </div>
      </div>
    </div>
  )
}
