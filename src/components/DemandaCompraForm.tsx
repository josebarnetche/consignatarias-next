'use client'

import { useState } from 'react'
import { trackValueEvent } from '@/lib/analytics'

interface Match {
  id: number
  fecha: string
  hora: string | null
  consignataria: string
  lugar: string
  cabezas_estimadas: number | null
  url: string
}

const CATEGORIAS = [
  { value: 'terneros', label: 'Terneros (invernada)' },
  { value: 'novillos', label: 'Novillos' },
  { value: 'vaquillonas', label: 'Vaquillonas' },
  { value: 'vaca_gorda', label: 'Vacas' },
  { value: 'toros', label: 'Toros / reproductores' },
  { value: 'mixto', label: 'Mixto / lo que aparezca' },
]

/**
 * Form del growth engine: publica una demanda de compra → matching inmediato
 * con remates programados + alerta viva por email para los que vengan.
 */
export default function DemandaCompraForm() {
  const [categoria, setCategoria] = useState('terneros')
  const [cabezas, setCabezas] = useState('')
  const [provincia, setProvincia] = useState('')
  const [email, setEmail] = useState('')
  const [notas, setNotas] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [matches, setMatches] = useState<Match[]>([])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/demanda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria, cabezas: cabezas || undefined, provincia: provincia || undefined, email, notas: notas || undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setMatches(data.matches ?? [])
        trackValueEvent('lead_form', { meta: { kind: 'demanda_compra', categoria, provincia: provincia || null } })
      } else {
        setStatus('error')
        setMessage(data.error || 'No se pudo registrar la búsqueda.')
      }
    } catch {
      setStatus('error')
      setMessage('Error de conexión.')
    }
  }

  if (status === 'success') {
    return (
      <div className="border border-zinc-800 rounded-lg bg-zinc-900/50 p-5">
        <p className="text-emerald-400 text-sm font-medium mb-2">✓ Búsqueda activa</p>
        <p className="text-zinc-400 text-xs leading-relaxed mb-4">
          Te avisamos por email de cada remate nuevo que matchee con lo que buscás.
        </p>
        {matches.length > 0 ? (
          <>
            <p className="text-zinc-200 text-sm font-medium mb-3">Remates programados que ya matchean:</p>
            <ul className="space-y-3">
              {matches.map((m) => (
                <li key={m.id} className="border border-zinc-800 rounded p-3 bg-zinc-950">
                  <a href={m.url} className="text-accent hover:text-accent-bright text-sm font-medium">
                    {m.fecha}
                    {m.hora ? ` ${m.hora}` : ''} — {m.consignataria}
                  </a>
                  <p className="text-zinc-500 text-xs mt-1">
                    {m.lugar}
                    {m.cabezas_estimadas ? ` · ~${m.cabezas_estimadas.toLocaleString('es-AR')} cab` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-zinc-500 text-xs">
            Hoy no hay remates programados que matcheen — apenas entre uno al calendario, te llega el aviso.
          </p>
        )}
      </div>
    )
  }

  const inputCls =
    'w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors'

  return (
    <form onSubmit={handleSubmit} className="border border-zinc-800 rounded-lg bg-zinc-900/50 p-5 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-zinc-400 text-xs block mb-1">Qué buscás</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputCls}>
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-zinc-400 text-xs block mb-1">Cabezas (opcional)</span>
          <input type="number" min={1} max={100000} value={cabezas} onChange={(e) => setCabezas(e.target.value)} placeholder="300" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-zinc-400 text-xs block mb-1">Provincia (opcional)</span>
          <input type="text" value={provincia} onChange={(e) => setProvincia(e.target.value)} placeholder="Corrientes" className={inputCls} />
        </label>
      </div>
      <label className="block">
        <span className="text-zinc-400 text-xs block mb-1">Tu email — te avisamos de cada remate que matchee</span>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className={inputCls} />
      </label>
      <label className="block">
        <span className="text-zinc-400 text-xs block mb-1">Detalle (opcional: raza, peso, plazo…)</span>
        <input type="text" maxLength={500} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Braford, 180-200 kg, para marzo" className={inputCls} />
      </label>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-5 py-2.5 text-sm bg-accent hover:bg-accent-bright text-zinc-950 font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Buscando…' : 'Buscar remates y activar aviso'}
      </button>
      {status === 'error' && message && <p className="text-red-400 text-xs">{message}</p>}
    </form>
  )
}
