'use client'

import { useState } from 'react'
import { trackValueEvent } from '@/lib/analytics'

/**
 * Alta de un campo. El canon se pide en KG DE NOVILLO por ha por MES —como se
 * pacta y se liquida— y se muestra al instante cuánto es en pesos, para que el
 * oferente vea que el número que puso significa algo real.
 */
export default function PublicarCampoForm({
  indice,
  firma,
  inicial,
}: {
  indice: number
  /**
   * Cuando publica una firma, el aviso lleva su nombre y linkea a su perfil.
   * Es una diferencia de fondo, no cosmética: al dueño de un campo le sirve que
   * no se publique su contacto; a una consignataria eso la borra del negocio.
   * Publicando como firma, el campo la muestra a ella.
   */
  firma?: { slug: string; nombre: string } | null
  /** Precarga desde el tasador: quien acaba de valuar su campo no debería
   *  volver a escribir la provincia y la superficie. */
  inicial?: { provincia?: string; hectareas?: string; partido?: string; kgHaMes?: string }
}) {
  const [operacion, setOperacion] = useState<'arrendamiento' | 'venta' | 'ambos'>('arrendamiento')
  const [hectareas, setHectareas] = useState(inicial?.hectareas ?? '')
  const [provincia, setProvincia] = useState(inicial?.provincia ?? '')
  const [partido, setPartido] = useState(inicial?.partido ?? '')
  const [aptitud, setAptitud] = useState('ganadera')
  const [kgHaMes, setKgHaMes] = useState(inicial?.kgHaMes ?? '')
  const [usdHa, setUsdHa] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [mejoras, setMejoras] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [error, setError] = useState('')

  const ha = Number(hectareas) || 0
  const kg = Number(kgHaMes) || 0
  const previewMensual = ha > 0 && kg > 0 ? kg * indice * ha : 0

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/campos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operacion,
          hectareas,
          provincia,
          partido: partido || null,
          aptitud,
          precio_kg_ha_mes: operacion !== 'venta' ? kgHaMes || null : null,
          precio_usd_ha: operacion !== 'arrendamiento' ? usdHa || null : null,
          descripcion: descripcion || null,
          mejoras: mejoras || null,
          contacto_nombre: nombre || null,
          contacto_telefono: telefono || null,
          contacto_email: email || null,
          consignataria_slug: firma?.slug ?? null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('ok')
        trackValueEvent('lead_form', {
        meta: { kind: 'publicar_campo', operacion, firma: firma?.slug ?? null },
      })
      } else {
        setStatus('error')
        setError(data.error || 'No se pudo publicar.')
      }
    } catch {
      setStatus('error')
      setError('Error de conexión.')
    }
  }

  if (status === 'ok') {
    return (
      <div className="border border-zinc-800 rounded-lg bg-zinc-900/40 p-6">
        <p className="text-emerald-400 font-medium mb-2">✓ Recibimos tu campo</p>
        <p className="text-zinc-400 text-sm">
          {firma
            ? `Lo revisamos y lo publicamos en el día, a nombre de ${firma.nombre} y con link a tu perfil. Las consultas te las derivamos a vos.`
            : 'Lo revisamos y lo publicamos en el día. Si falta algún dato te escribimos. Cuando alguien consulte, te avisamos nosotros — tu contacto no se publica.'}
        </p>
      </div>
    )
  }

  const input =
    'w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors'
  const label = 'text-zinc-400 text-xs block mb-1'

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {firma && (
        <div className="border border-accent/40 rounded-lg bg-accent/[0.04] px-4 py-3">
          <p className="text-zinc-200 text-sm">
            Publicando como <strong>{firma.nombre}</strong>
          </p>
          <p className="text-zinc-400 text-xs mt-1">
            El aviso va a llevar el nombre de la firma y a linkear a tu perfil. Las consultas se te
            derivan a vos: el campo es tuyo y el cliente también.
          </p>
        </div>
      )}

      <fieldset className="border border-zinc-800 rounded-lg bg-zinc-900/40 p-5 space-y-3">
        <legend className="text-zinc-300 text-xs px-2">Qué ofrecés</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['arrendamiento', 'Arrendamiento'],
              ['venta', 'Venta'],
              ['ambos', 'Las dos'],
            ] as const
          ).map(([v, l]) => (
            <button
              type="button"
              key={v}
              onClick={() => setOperacion(v)}
              className={`px-4 py-2 text-xs rounded border transition-colors ${
                operacion === v
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label>
            <span className={label}>Hectáreas</span>
            <input required type="number" min={1} value={hectareas} onChange={(e) => setHectareas(e.target.value)} placeholder="300" className={input} />
          </label>
          <label>
            <span className={label}>Provincia</span>
            <input required value={provincia} onChange={(e) => setProvincia(e.target.value)} placeholder="Corrientes" className={input} />
          </label>
          <label>
            <span className={label}>Partido o localidad</span>
            <input value={partido} onChange={(e) => setPartido(e.target.value)} placeholder="Mercedes" className={input} />
          </label>
        </div>

        <label className="block">
          <span className={label}>Aptitud</span>
          <select value={aptitud} onChange={(e) => setAptitud(e.target.value)} className={input}>
            <option value="ganadera">Ganadera</option>
            <option value="agricola">Agrícola</option>
            <option value="mixta">Mixta</option>
            <option value="forestal">Forestal</option>
          </select>
        </label>
      </fieldset>

      <fieldset className="border border-zinc-800 rounded-lg bg-zinc-900/40 p-5 space-y-3">
        <legend className="text-zinc-300 text-xs px-2">Precio</legend>

        {operacion !== 'venta' && (
          <label className="block">
            <span className={label}>Kilos de novillo por hectárea por mes</span>
            <input
              type="number"
              min={0.1}
              max={100}
              step={0.1}
              value={kgHaMes}
              onChange={(e) => setKgHaMes(e.target.value)}
              placeholder="5"
              className={input}
            />
            <span className="text-zinc-500 text-xs block mt-1">
              Así se pacta y se liquida, con el promedio del mes anterior. Si no lo tenés definido, poné el
              del año pasado y lo ajustamos.
            </span>
            {previewMensual > 0 && (
              <div className="mt-2 border border-accent/40 bg-accent/[0.05] rounded px-3 py-2">
                <p className="text-accent text-sm font-mono">
                  ≈ ${Math.round(previewMensual).toLocaleString('es-AR')} por mes
                </p>
                <p className="text-zinc-500 text-xs">
                  ${Math.round(previewMensual * 12).toLocaleString('es-AR')} al año
                </p>
              </div>
            )}
          </label>
        )}

        {operacion !== 'arrendamiento' && (
          <label className="block">
            <span className={label}>Dólares por hectárea</span>
            <input type="number" min={1} value={usdHa} onChange={(e) => setUsdHa(e.target.value)} placeholder="2500" className={input} />
          </label>
        )}
      </fieldset>

      <fieldset className="border border-zinc-800 rounded-lg bg-zinc-900/40 p-5 space-y-3">
        <legend className="text-zinc-300 text-xs px-2">El campo</legend>
        <label className="block">
          <span className={label}>Descripción</span>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} maxLength={2000} placeholder="Campo de cría sobre ruta, 70% pastura implantada, el resto campo natural…" className={input} />
        </label>
        <label className="block">
          <span className={label}>Mejoras</span>
          <textarea value={mejoras} onChange={(e) => setMejoras(e.target.value)} rows={2} maxLength={1000} placeholder="Casco, manga con cepo, 6 potreros, 4 aguadas, alambrado perimetral nuevo…" className={input} />
        </label>
      </fieldset>

      <fieldset className="border border-zinc-800 rounded-lg bg-zinc-900/40 p-5 space-y-3">
        <legend className="text-zinc-300 text-xs px-2">Cómo te contactamos</legend>
        <p className="text-zinc-500 text-xs">Tu contacto no se publica. Cuando alguien consulte, te avisamos nosotros.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" className={input} />
          <input required value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono" className={input} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (opcional)" className={input} />
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-6 py-3 text-sm bg-accent hover:bg-accent-bright text-zinc-950 font-medium rounded transition-colors disabled:opacity-50"
      >
        {status === 'loading' ? 'Enviando…' : 'Publicar mi campo'}
      </button>
      {status === 'error' && error && <p className="text-red-400 text-xs">{error}</p>}
    </form>
  )
}
