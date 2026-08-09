'use client'

import { useState } from 'react'
import { trackValueEvent } from '@/lib/analytics'

/**
 * Captación propia del embudo de campos. Los dos lados entran a NUESTRA base:
 * la demanda que todavía no tiene qué mirar, y el dueño que acaba de tasar.
 *
 * Vale incluso con la sección vacía —de hecho sobre todo ahí—: una lista de
 * espera de demanda real es lo que después consigue la oferta.
 */
export default function CapturaCampoForm({
  tipo,
  provinciaInicial = '',
  zonaInicial = '',
  hectareasInicial = '',
  origen,
  compacto = false,
}: {
  tipo: 'busco' | 'tengo'
  provinciaInicial?: string
  zonaInicial?: string
  hectareasInicial?: string
  /** De qué página vino, para saber después qué superficie capta de verdad. */
  origen?: string
  compacto?: boolean
}) {
  const [operacion, setOperacion] = useState<'arrendar' | 'comprar'>('arrendar')
  const [provincia, setProvincia] = useState(provinciaInicial)
  const [zona, setZona] = useState(zonaInicial)
  const [hectareas, setHectareas] = useState(hectareasInicial)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'error'>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEstado('enviando')
    setError('')
    try {
      const res = await fetch('/api/campos/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          operacion: tipo === 'busco' ? operacion : null,
          provincia,
          zona: zona || null,
          hectareas: hectareas || null,
          nombre,
          telefono,
          email: email || null,
          mensaje: mensaje || null,
          origen: origen || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setEstado('ok')
        trackValueEvent('lead_form', { meta: { kind: `campos_${tipo}`, origen: origen ?? null } })
      } else {
        setEstado('error')
        setError(data.error || 'No se pudo registrar.')
      }
    } catch {
      setEstado('error')
      setError('Error de conexión.')
    }
  }

  if (estado === 'ok') {
    return (
      <div className="border border-emerald-500/30 rounded-lg bg-emerald-500/[0.04] p-5">
        <p className="text-emerald-400 font-medium mb-1">✓ Anotado</p>
        <p className="text-zinc-400 text-xs leading-relaxed">
          {tipo === 'busco'
            ? 'Te escribimos cuando aparezca algo que encaje con lo que buscás. No le pasamos tu contacto a nadie.'
            : 'Te contactamos con la valuación y con lo que estamos viendo en tu zona. No publicamos tus datos.'}
        </p>
      </div>
    )
  }

  const input =
    'w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors'
  const label = 'text-zinc-400 text-xs block mb-1'

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {tipo === 'busco' && (
        <div className="flex gap-2">
          {(
            [
              ['arrendar', 'Para arrendar'],
              ['comprar', 'Para comprar'],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setOperacion(v)}
              className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                operacion === v
                  ? 'border-accent text-accent bg-accent/[0.06]'
                  : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className={label}>Provincia</span>
          <input
            required
            value={provincia}
            onChange={(e) => setProvincia(e.target.value)}
            className={input}
            placeholder="Corrientes"
          />
        </label>
        <label className="block">
          <span className={label}>Zona o partido</span>
          <input
            value={zona}
            onChange={(e) => setZona(e.target.value)}
            className={input}
            placeholder="Mercedes"
          />
        </label>
        <label className="block">
          <span className={label}>Hectáreas</span>
          <input
            type="number"
            min={1}
            value={hectareas}
            onChange={(e) => setHectareas(e.target.value)}
            className={input}
            placeholder="500"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className={label}>Nombre</span>
          <input required value={nombre} onChange={(e) => setNombre(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className={label}>Teléfono</span>
          <input
            required
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className={input}
            placeholder="379 4xx xxxx"
          />
        </label>
        <label className="block">
          <span className={label}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
        </label>
      </div>

      {!compacto && (
        <label className="block">
          <span className={label}>
            {tipo === 'busco' ? 'Qué estás buscando' : 'Algo que sume del campo'}
          </span>
          <textarea
            rows={2}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            className={input}
            placeholder={
              tipo === 'busco'
                ? 'Campo de cría, con agua, entrada de asfalto…'
                : 'Aguadas, alambrados, casco, superficie de bajo…'
            }
          />
        </label>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="submit"
          disabled={estado === 'enviando'}
          className="px-4 py-2 text-xs bg-accent hover:bg-accent-bright text-zinc-950 font-medium rounded transition-colors disabled:opacity-50"
        >
          {estado === 'enviando'
            ? 'Enviando…'
            : tipo === 'busco'
              ? 'Avisame cuando aparezca'
              : 'Quiero saber cuánto vale'}
        </button>
        <span className="text-zinc-600 text-xxs">
          No compartimos tus datos con nadie.
        </span>
      </div>
    </form>
  )
}
