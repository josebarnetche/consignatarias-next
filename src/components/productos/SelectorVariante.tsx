'use client'

import { useMemo, useState } from 'react'
import { ComprarInforme } from './ComprarInforme'

export interface OpcionVariante {
  slug: string
  label: string
}

/**
 * El "poné tu zona" del producto.
 *
 * El informe tiene 455 variantes y el comprador tiene que elegir la suya ANTES de pagar:
 * la variante viaja al checkout y termina siendo la coordenada del entitlement. Elegir
 * después de cobrar obligaría a un paso extra justo cuando la persona ya pagó, que es el
 * peor momento para pedirle algo.
 *
 * Hay un "calculando" real y corto entre la selección y el formulario. No es teatro: da
 * el tiempo de lectura para que se vea que la zona quedó elegida, y separa visualmente
 * las dos decisiones (qué zona / pagar). Si el usuario cambia de zona, vuelve a correr.
 */
export function SelectorVariante({
  slug,
  nombre,
  precio,
  modalidad,
  opciones,
  etiqueta = 'Elegí tu departamento',
  placeholder = 'Mercedes, Curuzú Cuatiá, Ayacucho…',
  textoCalculando = 'Calculando productividad de',
  sinResultados = 'No encontramos esa zona. Puede que tenga menos de diez establecimientos, y en ese caso no la publicamos: con esa escala el dato dejaría de ser un agregado.',
  mostrarTodas = false,
}: {
  slug: string
  nombre: string
  precio: number
  modalidad?: 'compra-unica' | 'suscripcion'
  opciones: OpcionVariante[]
  etiqueta?: string
  placeholder?: string
  /** "Calculando X…" — lo que se le dice que está pasando mientras aparece el formulario. */
  textoCalculando?: string
  sinResultados?: string
  /**
   * Con pocas opciones (el canon tiene decenas de zonas, no 455 departamentos) se muestra
   * la lista entera sin obligar a adivinar cómo escribimos la zona. El buscador sigue
   * filtrando encima.
   */
  mostrarTodas?: boolean
}) {
  const [busqueda, setBusqueda] = useState('')
  const [elegida, setElegida] = useState<OpcionVariante | null>(null)
  const [calculando, setCalculando] = useState(false)

  const filtradas = useMemo(() => {
    const q = busqueda
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim()
    if (!q) return mostrarTodas ? opciones : []
    return opciones
      .filter((o) =>
        o.label
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .toLowerCase()
          .includes(q),
      )
      .slice(0, mostrarTodas ? opciones.length : 8)
  }, [busqueda, opciones, mostrarTodas])

  function elegir(o: OpcionVariante) {
    setElegida(o)
    setBusqueda(o.label)
    setCalculando(true)
    window.setTimeout(() => setCalculando(false), 700)
  }

  if (elegida && !calculando) {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setElegida(null)
            setBusqueda('')
          }}
          className="mb-3 text-xs text-slate-400 underline underline-offset-2 hover:text-sky-400"
        >
          ← Elegir otra zona
        </button>
        <ComprarInforme
          slug={slug}
          nombre={nombre}
          precio={precio}
          modalidad={modalidad}
          variante={elegida.slug}
          varianteLabel={elegida.label}
        />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-sky-900/60 bg-slate-950/80 p-6">
      <label htmlFor="variante" className="block text-sm font-medium text-slate-200">
        {etiqueta}
      </label>
      <p className="mt-1 text-xs text-slate-500">
        {opciones.length.toLocaleString('es-AR')} disponibles. Escribí el nombre y elegilo de
        la lista.
      </p>

      <input
        id="variante"
        type="text"
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value)
          setElegida(null)
        }}
        placeholder={placeholder}
        autoComplete="off"
        disabled={calculando}
        className="mt-3 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none disabled:opacity-60"
      />

      {calculando && (
        <p className="mt-4 flex items-center gap-2 text-sm text-sky-300">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-sky-700 border-t-sky-300" />
          {textoCalculando} {elegida?.label}…
        </p>
      )}

      {!calculando && filtradas.length > 0 && (
        <ul className="mt-2 max-h-72 divide-y divide-slate-800 overflow-y-auto rounded border border-slate-800">
          {filtradas.map((o) => (
            <li key={o.slug}>
              <button
                type="button"
                onClick={() => elegir(o)}
                className="w-full px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-900 hover:text-sky-300"
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!calculando && busqueda.trim().length > 1 && filtradas.length === 0 && (
        <p className="mt-3 text-sm text-slate-400">
          {sinResultados}
        </p>
      )}
    </div>
  )
}
