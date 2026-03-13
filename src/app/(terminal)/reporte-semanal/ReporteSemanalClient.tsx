'use client'

import { useState } from 'react'
import Link from 'next/link'
import { generateReportePDF } from '@/lib/pdf/generateReportePDF'

interface ReportData {
  fecha: string
  inmag: { current: number; prev: number; change: number }
  categories: Record<string, { current: number; prev: number; change: number }>
  usdBlue: { current: number; prev: number; change: number }
  corn: { current: number; prev: number; change: number }
  remates: {
    total: number
    cabezas: number
    provincias: number
    consignatarias: number
    top5: Array<{
      fecha: string
      consignataria: string
      ubicacion: string
      tipo: string
      cabezas: number | null
    }>
  }
}

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('es-AR', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  })
}

export default function ReporteSemanalClient({ data }: { data: ReportData }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!email.trim()) return
    
    setStatus('loading')
    
    // Save email
    try {
      await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'reporte-semanal' }),
      })
    } catch {
      // Continue
    }
    
    setStatus('ready')
  }

  function handleDownloadPDF() {
    const doc = generateReportePDF(data)
    const filename = `reporte-ganadero-${new Date().toISOString().slice(0, 10)}.pdf`
    doc.save(filename)
  }

  const categoryLabels: Record<string, string> = {
    novillos: 'Novillos',
    novillitos: 'Novillitos',
    vaquillonas: 'Vaquillonas',
    vacas: 'Vacas',
    toros: 'Toros',
    terneros: 'Terneros',
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 print:hidden">
        <Link href="/mercado" className="text-xxs font-terminal text-accent hover:text-accent-bright mb-4 inline-block">
          ← Ver mercado
        </Link>
        <h1 className="text-2xl font-terminal text-zinc-100 mb-3">
          Reporte Semanal del Mercado Ganadero
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Resumen semanal con precios INMAG, próximos remates y tendencias del mercado. 
          Descargalo en PDF o imprimilo directamente.
        </p>
      </div>

      {status !== 'ready' ? (
        <form onSubmit={handleSubmit} className="print:hidden">
          <div className="terminal-panel mb-6">
            <div className="terminal-panel-header">Recibí el reporte cada semana</div>
            <div className="px-panel py-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
              <p className="text-xxs text-zinc-500 mt-2">
                Te enviamos el reporte todos los lunes a las 8:00 AM.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-medium rounded transition-colors disabled:opacity-50"
          >
            {status === 'loading' ? 'Generando...' : 'Ver Reporte'}
          </button>
        </form>
      ) : (
        <>
          {/* Actions */}
          <div className="flex gap-3 mb-6 print:hidden">
            <button
              onClick={handleDownloadPDF}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Descargar PDF
            </button>
            <button
              onClick={() => setStatus('idle')}
              className="px-6 py-3 border border-zinc-700 text-zinc-300 text-sm rounded hover:bg-zinc-800 transition-colors"
            >
              Volver
            </button>
          </div>

          {/* Report Content */}
          <div ref={reportRef} className="space-y-6 print:space-y-4">
            {/* Report Header */}
            <div className="terminal-panel print:border-black">
              <div className="px-panel py-6 text-center print:py-4">
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2 print:text-black">
                  Consignatarias.com.ar
                </div>
                <h2 className="text-xl font-terminal text-zinc-100 mb-1 print:text-black">
                  Reporte Semanal del Mercado Ganadero
                </h2>
                <div className="text-sm text-zinc-400 print:text-gray-600">
                  {data.fecha}
                </div>
              </div>
            </div>

            {/* INMAG Section */}
            <div className="terminal-panel print:border-black">
              <div className="terminal-panel-header print:bg-gray-100 print:text-black">
                Índice INMAG
              </div>
              <div className="px-panel py-4">
                <div className="flex items-baseline gap-4 mb-4">
                  <div className="text-3xl font-mono text-zinc-100 print:text-black">
                    ${fmt(data.inmag.current)}
                  </div>
                  <div className={`text-sm font-mono ${data.inmag.change >= 0 ? 'text-emerald-400' : 'text-red-400'} print:text-black`}>
                    {data.inmag.change >= 0 ? '+' : ''}{fmt(data.inmag.change, 1)}% vs semana anterior
                  </div>
                </div>
                
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                  {Object.entries(data.categories).map(([key, val]) => (
                    <div key={key} className="text-center">
                      <div className="text-xxs text-zinc-500 uppercase print:text-gray-600">
                        {categoryLabels[key] || key}
                      </div>
                      <div className="text-sm text-zinc-200 font-mono print:text-black">
                        ${fmt(val.current)}
                      </div>
                      <div className={`text-xxs font-mono ${val.change >= 0 ? 'text-emerald-400' : 'text-red-400'} print:text-black`}>
                        {val.change >= 0 ? '+' : ''}{fmt(val.change, 1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Macro Section */}
            <div className="terminal-panel print:border-black">
              <div className="terminal-panel-header print:bg-gray-100 print:text-black">
                Contexto Macro
              </div>
              <div className="px-panel py-4 grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xxs text-zinc-500 uppercase print:text-gray-600">Dólar Blue</div>
                  <div className="text-xl font-mono text-zinc-100 print:text-black">
                    ${fmt(data.usdBlue.current)}
                  </div>
                  <div className={`text-xs font-mono ${data.usdBlue.change >= 0 ? 'text-emerald-400' : 'text-red-400'} print:text-black`}>
                    {data.usdBlue.change >= 0 ? '+' : ''}{fmt(data.usdBlue.change, 1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xxs text-zinc-500 uppercase print:text-gray-600">Maíz</div>
                  <div className="text-xl font-mono text-zinc-100 print:text-black">
                    USD {fmt(data.corn.current, 1)}/tn
                  </div>
                  <div className={`text-xs font-mono ${data.corn.change >= 0 ? 'text-emerald-400' : 'text-red-400'} print:text-black`}>
                    {data.corn.change >= 0 ? '+' : ''}{fmt(data.corn.change, 1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Remates */}
            <div className="terminal-panel print:border-black">
              <div className="terminal-panel-header print:bg-gray-100 print:text-black">
                Próximos 7 días
              </div>
              <div className="px-panel py-4">
                <div className="grid grid-cols-4 gap-4 mb-4 text-center">
                  <div>
                    <div className="text-2xl font-mono text-zinc-100 print:text-black">{data.remates.total}</div>
                    <div className="text-xxs text-zinc-500 print:text-gray-600">Remates</div>
                  </div>
                  <div>
                    <div className="text-2xl font-mono text-zinc-100 print:text-black">~{fmt(data.remates.cabezas)}</div>
                    <div className="text-xxs text-zinc-500 print:text-gray-600">Cabezas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-mono text-zinc-100 print:text-black">{data.remates.provincias}</div>
                    <div className="text-xxs text-zinc-500 print:text-gray-600">Provincias</div>
                  </div>
                  <div>
                    <div className="text-2xl font-mono text-zinc-100 print:text-black">{data.remates.consignatarias}</div>
                    <div className="text-xxs text-zinc-500 print:text-gray-600">Consignatarias</div>
                  </div>
                </div>

                {data.remates.top5.length > 0 && (
                  <div className="border-t border-terminal-border pt-4 print:border-gray-300">
                    <div className="text-xxs text-zinc-500 uppercase mb-3 print:text-gray-600">
                      Destacados
                    </div>
                    <div className="space-y-2">
                      {data.remates.top5.map((r, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <span className="text-zinc-500 font-mono print:text-gray-600">
                            {r.fecha.slice(5).replace('-', '/')}
                          </span>
                          <span className="text-zinc-200 flex-1 truncate print:text-black">
                            {r.consignataria}
                          </span>
                          <span className="text-zinc-500 text-xs print:text-gray-600">
                            {r.tipo}
                          </span>
                          {r.cabezas && (
                            <span className="text-zinc-400 font-mono print:text-black">
                              {fmt(r.cabezas)} cab
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xxs text-zinc-500 py-4 print:text-gray-600">
              <p>Generado por consignatarias.com.ar — El mercado ganadero en una sola pantalla</p>
              <p className="mt-1">Datos actualizados diariamente. Valores referenciales.</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
