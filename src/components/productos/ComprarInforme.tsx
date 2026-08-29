'use client'

import { useEffect, useState } from 'react'
import { trackInformeCheckoutStart, trackInformeView } from '@/lib/analytics'

interface Props {
  slug: string
  nombre: string
  precio: number
  /**
   * 'compra-unica' cobra una vez; 'suscripcion' da de alta un débito mensual. Cambia el
   * endpoint, el texto del botón y lo que se le promete al comprador — mezclarlos es
   * prometer "pago único" sobre algo que se renueva.
   */
  modalidad?: 'compra-unica' | 'suscripcion'
  /**
   * Variante del producto, cuando el mismo informe tiene muchas (un departamento, una
   * provincia). Viaja al checkout y termina siendo la coordenada del entitlement.
   */
  variante?: string
  varianteLabel?: string
}

/**
 * Compra email-first, igual que la guía premium: el mail es la llave del entitlement, así
 * que se pide acá y no después de pagar. Si ese mail ya compró esta variante, la API
 * responde `alreadyOwned` y en vez de cobrar de nuevo lo mandamos a descargarla.
 *
 * Los datos de factura A van plegados: el que compra a título personal no los ve, y el que
 * necesita computar el gasto los carga en el mismo paso en vez de escribir después
 * pidiéndola.
 */
export function ComprarInforme({ slug, nombre, precio, modalidad = 'compra-unica', variante, varianteLabel }: Props) {
  const esSub = modalidad === 'suscripcion'
  const [email, setEmail] = useState('')
  const [quiereFactura, setQuiereFactura] = useState(false)
  const [razonSocial, setRazonSocial] = useState('')
  const [cuit, setCuit] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // El sales page visto es el escalón anterior del embudo. Una sola vez por montaje.
  useEffect(() => {
    trackInformeView(slug, precio)
  }, [slug, precio])

  async function comprar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(esSub ? '/api/informes/suscribir' : '/api/informes/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          variante,
          email: email.trim(),
          ...(quiereFactura ? { razonSocial: razonSocial.trim(), cuit: cuit.trim() } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'No pudimos abrir el checkout. Probá de nuevo en un minuto.')
        setLoading(false)
        return
      }
      if (json.alreadyOwned) {
        window.location.href = '/cuenta/informes'
        return
      }
      // Con el link ya creado: cuenta intenciones que llegaron a Rebill, no errores nuestros.
      let source: string | null = null
      try {
        source = sessionStorage.getItem(`informe_source:${slug}`)
      } catch {
        /* sin sessionStorage no pasa nada: el evento va como 'direct' */
      }
      trackInformeCheckoutStart(slug, precio, {
        variante,
        source: source || 'direct',
        conFactura: quiereFactura,
      })
      window.location.href = json.checkoutUrl
    } catch {
      setError('No pudimos abrir el checkout. Probá de nuevo en un minuto.')
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={comprar}
      id="comprar"
      className="rounded-lg border border-sky-900/60 bg-slate-950/80 p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-100">
          {varianteLabel ? `${nombre} — ${varianteLabel}` : nombre}
        </h2>
        <p className="text-2xl font-semibold text-sky-300">
          ARS {precio.toLocaleString('es-AR')}
          {esSub && <span className="text-base font-normal text-slate-500">/mes</span>}
        </p>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {esSub
          ? 'Por mes. Se renueva solo y lo cancelás cuando quieras desde tu cuenta.'
          : 'Pago único. No es suscripción: no se renueva ni se cancela.'}
      </p>

      <div className="mt-6">
        <label htmlFor="email-informe" className="block text-sm font-medium text-slate-300">
          Tu email
        </label>
        <input
          id="email-informe"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@campo.com.ar"
          className="mt-1.5 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          {esSub
            ? 'Con este mail entrás a bajar cada edición. Revisalo antes de seguir.'
            : 'Con este mail vas a poder bajar el informe siempre que quieras. Revisalo antes de seguir.'}
        </p>
      </div>

      <div className="mt-4">
        <label className="flex items-center gap-2 text-sm text-slate-400">
          <input
            type="checkbox"
            checked={quiereFactura}
            onChange={(e) => setQuiereFactura(e.target.checked)}
            className="h-4 w-4 rounded border-slate-700 bg-slate-900"
          />
          Necesito factura A
        </label>

        {quiereFactura && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              required
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              placeholder="Razón social"
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none"
            />
            <input
              type="text"
              required
              inputMode="numeric"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              placeholder="CUIT (sin guiones)"
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none"
            />
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !email.trim()}
        className="mt-6 w-full rounded bg-sky-600 px-4 py-3 font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Abriendo el pago…' : esSub ? 'Suscribirme con tarjeta' : 'Comprar con tarjeta'}
      </button>

      <p className="mt-3 text-center text-xs text-slate-500">
        Te lleva a Rebill para pagar. Los datos de tu tarjeta no pasan por nuestro sitio.{' '}
        <a href="#como-se-paga" className="text-sky-400 underline underline-offset-2">
          Cómo funciona el pago
        </a>
      </p>
    </form>
  )
}
