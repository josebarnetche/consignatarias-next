'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Radio, X, Phone, MessageCircle, Maximize2, ExternalLink } from 'lucide-react'
import { trackValueEvent } from '@/lib/analytics'

/**
 * Pared de transmisiones: mirar uno o varios remates SIN salir del sitio.
 *
 * Hasta ahora "Ver ahora" era un link a YouTube — o sea, perder al usuario justo
 * cuando iba a mirar un remate que le mostramos nosotros. Acá el stream se abre
 * adentro, se pueden abrir varios a la vez (es lo que hace un comprador que
 * sigue dos ferias el mismo día), y cada uno lleva el teléfono de SU firma a un
 * click: si algo le interesa, llama sin buscar el número en otra pestaña.
 *
 * Los players arrancan en mute porque el navegador bloquea el autoplay con
 * sonido. Con varios abiertos eso además es lo correcto: el usuario le sube el
 * volumen al que está siguiendo.
 */
export interface StreamItem {
  id: string
  titulo: string
  firma: string
  slug: string
  perfilHref: string
  embedUrl: string
  watchUrl: string
  confianza: 'confirmed' | 'probable'
  /** Si NO está al aire, abrir el player muestra un cuadro negro: el embed de
   *  canal solo reproduce lo que se está transmitiendo en ese momento. */
  enVivoAhora: boolean
  hora?: string | null
  lugar?: string | null
  tel?: string | null
  wa?: string | null
  telVisible?: string | null
}

export default function StreamWall({
  streams,
  titulo = 'Transmisiones de hoy',
}: {
  streams: StreamItem[]
  titulo?: string
}) {
  // Solo se abre solo lo que está AL AIRE. Abrir un remate que empieza a las
  // 13:30 a las 3 de la mañana daba un cuadro negro, que es peor que no mostrar
  // nada: parece que el sitio está roto.
  const [abiertos, setAbiertos] = useState<string[]>(() =>
    streams.filter((s) => s.enVivoAhora).slice(0, 1).map((s) => s.id),
  )

  // Las tarjetas de abajo linkean a #stream-<id>. Al entrar por ahí, el player
  // se abre solo: si el usuario hizo un click que dice "ver", tiene que ver.
  useEffect(() => {
    const id = window.location.hash.replace('#stream-', '')
    if (!id || !streams.some((s) => s.id === id)) return
    setAbiertos((prev) => (prev.includes(id) ? prev : [...prev, id]))
    requestAnimationFrame(() => {
      document.getElementById(`stream-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [streams])

  if (streams.length === 0) return null

  const abrir = (s: StreamItem) => {
    setAbiertos((prev) => (prev.includes(s.id) ? prev : [...prev, s.id]))
    // Reusa el evento del catálogo: abrir el stream ES abrir la transmisión,
    // solo que ahora ocurre adentro del sitio en vez de irse a YouTube.
    trackValueEvent('live_click', { meta: { slug: s.slug, confianza: s.confianza, modo: 'embed' } })
    // Si el usuario abre desde la lista de abajo, que el player entre en cuadro.
    requestAnimationFrame(() => {
      document.getElementById(`stream-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }
  const cerrar = (id: string) => setAbiertos((prev) => prev.filter((x) => x !== id))

  const hayEnVivo = streams.some((s) => s.enVivoAhora)
  const proxima = streams.find((s) => !s.enVivoAhora) ?? null

  const enPantalla = abiertos
    .map((id) => streams.find((s) => s.id === id))
    .filter((s): s is StreamItem => !!s)

  // Con uno solo, que ocupe todo. Con varios, grilla de dos.
  const cols = enPantalla.length <= 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'

  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-zinc-100 text-lg font-medium flex items-center gap-2">
          <Radio className="w-4 h-4 text-red-500" />
          {titulo}
        </h2>
        <p className="text-zinc-500 text-xs">
          {enPantalla.length > 0
            ? `${enPantalla.length} en pantalla · podés abrir varios a la vez`
            : hayEnVivo
              ? 'Elegí una transmisión para verla acá'
              : proxima
                ? `Ninguna está al aire todavía. La primera arranca ${proxima.hora ? `a las ${proxima.hora}` : 'más tarde'}.`
                : 'Ninguna está al aire en este momento.'}
        </p>
      </div>

      {enPantalla.length > 0 && (
        <div className={`grid ${cols} gap-4 mb-4`}>
          {enPantalla.map((s) => (
            <article
              key={s.id}
              id={`stream-${s.id}`}
              className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/40"
            >
              <div className="flex items-start justify-between gap-2 px-3 py-2 border-b border-zinc-800">
                <div className="min-w-0">
                  <p className="text-zinc-100 text-sm font-medium truncate">{s.firma}</p>
                  <p className="text-zinc-500 text-xxs truncate">
                    {s.titulo}
                    {s.hora ? ` · ${s.hora} hs` : ''}
                    {s.lugar ? ` · ${s.lugar}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => cerrar(s.id)}
                  aria-label={`Cerrar la transmisión de ${s.firma}`}
                  className="shrink-0 text-zinc-500 hover:text-zinc-200 transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!s.enVivoAhora && (
                <p className="px-3 py-2 text-xxs text-amber-300/90 bg-amber-500/[0.06] border-b border-amber-500/20">
                  Todavía no arrancó{s.hora ? ` — está anunciada para las ${s.hora}` : ''}. Si la firma no
                  está transmitiendo en este momento, el reproductor va a verse vacío.
                </p>
              )}
              <div className="relative w-full aspect-video bg-black">
                <iframe
                  src={s.embedUrl}
                  title={`Transmisión de ${s.firma}`}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                  frameBorder={0}
                />
              </div>

              {/* La acción que importa: si algo le interesa, que llame ya. */}
              <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-zinc-800">
                {s.tel ? (
                  <a
                    href={s.tel}
                    onClick={() => trackValueEvent('contact_phone', { meta: { slug: s.slug, desde: 'stream' } })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent hover:bg-accent-bright text-zinc-950 rounded transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Llamar {s.telVisible ? <span className="font-mono">{s.telVisible}</span> : 'a la firma'}
                  </a>
                ) : (
                  <Link
                    href={s.perfilHref}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent hover:bg-accent-bright text-zinc-950 rounded transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Contacto de la firma
                  </Link>
                )}
                {s.wa && (
                  <a
                    href={s.wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackValueEvent('contact_whatsapp', { meta: { slug: s.slug, desde: 'stream' } })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-zinc-700 text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/40 rounded transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>
                )}
                <Link
                  href={s.perfilHref}
                  className="text-xs text-zinc-500 hover:text-accent transition-colors"
                >
                  Ver perfil
                </Link>
                <a
                  href={s.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-xxs text-zinc-600 hover:text-zinc-400 transition-colors"
                  title="Abrir en YouTube"
                >
                  <ExternalLink className="w-3 h-3" />
                  YouTube
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Las que se pueden sumar. Se mantiene visible aunque haya players abiertos:
          es lo que permite seguir dos ferias a la vez sin ir y volver. */}
      {streams.some((s) => !abiertos.includes(s.id)) && (
        <div className="border border-zinc-800 rounded-lg bg-zinc-900/30 p-3">
          <p className="text-zinc-500 text-xs mb-2">
            {enPantalla.length > 0 ? 'Sumar otra transmisión:' : 'Transmisiones disponibles:'}
          </p>
          <div className="flex flex-wrap gap-2">
            {streams
              .filter((s) => !abiertos.includes(s.id))
              .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => abrir(s)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-zinc-700 text-zinc-300 hover:text-accent hover:border-accent rounded transition-colors"
                >
                  <Maximize2 className="w-3 h-3" />
                  {s.firma}
                  {s.hora ? <span className="text-zinc-600 font-mono">{s.hora}</span> : null}
                  {s.enVivoAhora ? (
                    <span className="text-red-400 text-xxs">● al aire</span>
                  ) : (
                    <span className="text-zinc-600 text-xxs">no empezó</span>
                  )}
                </button>
              ))}
          </div>
        </div>
      )}
    </section>
  )
}
