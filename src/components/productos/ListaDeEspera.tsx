'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/analytics'

/**
 * Lo que se muestra en el sales page de un producto que todavía no se puede entregar.
 *
 * POR QUÉ NO ES SIMPLEMENTE UN CARTEL
 * Un producto sin generador de PDF no tiene checkout (el catálogo lo marca
 * `publicado: false` y la API responde 404), así que la alternativa era dejar la
 * página con un botón que falla o esconderla. Las dos desperdician una visita.
 *
 * Acá esa visita se convierte en la audiencia del producto: quien deja el mail es
 * exactamente la persona a la que hay que avisarle el día que salga, y mientras tanto
 * entra al newsletter, que es el canal más barato que tenemos. Se suscribe con un
 * `source` propio para poder medir después cuántos de esos compraron de verdad.
 */
export function ListaDeEspera({ slug, nombre }: { slug: string; nombre: string }) {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'listo' | 'error'>('idle')

  async function anotar(e: React.FormEvent) {
    e.preventDefault()
    setEstado('enviando')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: `espera:${slug}` }),
      })
      if (!res.ok) {
        setEstado('error')
        return
      }
      trackEvent('informe_waitlist', { informe_slug: slug })
      setEstado('listo')
    } catch {
      setEstado('error')
    }
  }

  if (estado === 'listo') {
    return (
      <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-6">
        <h2 className="font-semibold text-emerald-200">Anotado</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Te avisamos a <strong className="text-slate-100">{email}</strong> el día que
          esté listo. Mientras tanto vas a recibir el resumen del mercado: el precio de
          la semana y lo que se movió.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={anotar} id="comprar" className="rounded-lg border border-slate-800 bg-slate-950/80 p-6">
      <p className="text-xs uppercase tracking-widest text-amber-500">En preparación</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-100">{nombre}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Todavía no lo estamos vendiendo: preferimos no cobrarlo hasta poder entregarlo
        bien. Dejanos tu mail y sos el primero en enterarte.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@campo.com.ar"
          className="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={estado === 'enviando' || !email.trim()}
          className="rounded bg-sky-600 px-5 py-2.5 font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {estado === 'enviando' ? 'Anotando…' : 'Avisame'}
        </button>
      </div>

      {estado === 'error' && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          No pudimos anotarte. Probá de nuevo en un minuto.
        </p>
      )}

      <p className="mt-3 text-xs text-slate-500">
        Es el mismo mail del resumen semanal del mercado. Te podés dar de baja cuando
        quieras.
      </p>
    </form>
  )
}
