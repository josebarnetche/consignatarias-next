'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Radio, Phone, MessageCircle, Volume2, VolumeX, Maximize2, Minimize2,
  ExternalLink, RefreshCw,
} from 'lucide-react'
import { trackValueEvent } from '@/lib/analytics'
import type { StreamItem } from '@/components/remates/StreamWall'

/**
 * El muro: varias ferias al mismo tiempo, y el teléfono de cada una a un toque.
 *
 * QUÉ PROBLEMA RESUELVE. La versión anterior pintaba el estado del momento en que
 * entrabas y no se movía más: abrías a las 13:40, los remates arrancaban a las
 * 14:00 y la pantalla seguía diciendo que no había nada. Encima abría un solo
 * player, cuando lo que hace un comprador es seguir dos o tres ferias a la vez y
 * llamar a la que le interesó. Acá los remates aparecen solos cuando salen al
 * aire, todos los que están transmitiendo se ven juntos, y cada recuadro lleva
 * el teléfono de SU firma.
 *
 * DOS RELOJES, A PROPÓSITO:
 *  - uno local, cada 10 s, que mueve las cuentas regresivas sin pedirle nada al
 *    servidor (el navegador ya sabe qué hora es);
 *  - uno de red, cada 30 s, que es el único que puede enterarse de que YouTube
 *    empezó a transmitir. Se adelanta cuando volvés a la pestaña: alguien que
 *    estuvo en otra ventana media hora no tiene por qué esperar medio minuto más.
 *
 * EL SONIDO ES DE A UNO. Con cuatro players abiertos, cuatro audios encimados no
 * son una función, son un accidente. Todos arrancan mudos —el navegador además
 * bloquea el autoplay con sonido— y el usuario elige cuál escucha.
 */

const REFRESCO_MS = 30_000
const TIC_RELOJ_MS = 10_000

interface Props {
  inicial: StreamItem[]
  /** Remates de hoy que todavía no salieron al aire, para la cuenta regresiva. */
  porVenir: Array<{ id: string; firma: string; hora: string | null; perfilHref: string }>
}

/** Minutos desde medianoche en Argentina, según el reloj del visitante. */
function minutosArgentina(): number {
  const art = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  return art.getHours() * 60 + art.getMinutes()
}

function minutosDeHora(t: string | null | undefined): number | null {
  if (!t || t === '00:00') return null
  const m = /^(\d{2}):(\d{2})/.exec(t)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** "en 12 min" · "en 1 h 05" · null si ya pasó o no sabemos la hora. */
function faltan(hora: string | null | undefined, ahora: number): string | null {
  const inicio = minutosDeHora(hora)
  if (inicio === null) return null
  const d = inicio - ahora
  if (d <= 0) return null
  if (d < 60) return `en ${d} min`
  return `en ${Math.floor(d / 60)} h ${String(d % 60).padStart(2, '0')}`
}

function conSonido(embedUrl: string, sonando: boolean): string {
  return sonando ? embedUrl.replace('mute=1', 'mute=0') : embedUrl
}

export default function MuroEnVivo({ inicial, porVenir }: Props) {
  const [streams, setStreams] = useState<StreamItem[]>(inicial)
  const [ahora, setAhora] = useState<number>(() => minutosArgentina())
  const [sonando, setSonando] = useState<string | null>(null)
  const [foco, setFoco] = useState<string | null>(null)
  const [ultimo, setUltimo] = useState<number>(() => Date.now())
  const [refrescando, setRefrescando] = useState(false)
  const enVuelo = useRef(false)

  const refrescar = useCallback(async () => {
    if (enVuelo.current || typeof document === 'undefined' || document.hidden) return
    enVuelo.current = true
    setRefrescando(true)
    try {
      const r = await fetch('/api/remates/en-vivo/estado', { cache: 'no-store' })
      if (r.ok) {
        const data = (await r.json()) as { streams?: StreamItem[] }
        // Si el endpoint falla o vuelve vacío por un error de red, NO se borra lo
        // que el usuario está mirando: se conserva la pared anterior.
        if (Array.isArray(data.streams)) setStreams(data.streams)
        setUltimo(Date.now())
      }
    } catch {
      /* se reintenta en el próximo ciclo; la pared actual sigue en pantalla */
    } finally {
      enVuelo.current = false
      setRefrescando(false)
    }
  }, [])

  useEffect(() => {
    const reloj = setInterval(() => setAhora(minutosArgentina()), TIC_RELOJ_MS)
    const red = setInterval(refrescar, REFRESCO_MS)
    const alVolver = () => {
      if (!document.hidden) refrescar()
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      clearInterval(reloj)
      clearInterval(red)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [refrescar])

  const alAire = useMemo(() => streams.filter((s) => s.enVivoAhora), [streams])

  // La lista de "más tarde" se calcula una vez en el servidor, pero el muro se
  // refresca: sin esto, un remate que sale al aire quedaría a la vez en un
  // recuadro y en la fila de los que faltan, contradiciéndose en la misma
  // pantalla. Se descarta acá, contra lo que está sonando ahora.
  const enPantalla = useMemo(() => new Set(streams.map((s) => s.id)), [streams])
  const faltantes = useMemo(
    () => porVenir.filter((p) => !enPantalla.has(p.id)),
    [porVenir, enPantalla],
  )
  const enfocado = foco ? alAire.find((s) => s.id === foco) ?? null : null
  const resto = enfocado ? alAire.filter((s) => s.id !== enfocado.id) : alAire

  // Con uno, que ocupe todo. Con dos, de a dos. De tres para arriba, tres en
  // pantallas grandes: más chico que eso ya no se distingue un animal.
  const columnas =
    resto.length <= 1 ? 'grid-cols-1'
      : resto.length === 2 ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'

  const proxima = faltantes.find((p) => faltan(p.hora, ahora) !== null) ?? faltantes[0] ?? null
  const segundosDesde = Math.max(0, Math.round((Date.now() - ultimo) / 1000))

  return (
    <section className="mb-10">
      {/* Barra de estado: cuántas al aire y hace cuánto lo sabemos. */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-zinc-100 text-lg font-medium flex items-center gap-2">
          <Radio className={`w-4 h-4 ${alAire.length > 0 ? 'text-red-500' : 'text-zinc-600'}`} />
          {alAire.length > 0 ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-600 rounded text-sm font-bold text-white">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                {alAire.length}
              </span>
              {alAire.length === 1 ? 'remate al aire ahora' : 'remates al aire ahora'}
            </>
          ) : (
            'Transmisiones de hoy'
          )}
        </h2>
        <button
          type="button"
          onClick={refrescar}
          className="flex items-center gap-1.5 text-xxs text-zinc-600 hover:text-zinc-300 transition-colors"
          title="Buscar transmisiones nuevas ahora"
        >
          <RefreshCw className={`w-3 h-3 ${refrescando ? 'animate-spin' : ''}`} />
          {refrescando ? 'buscando…' : `actualizado hace ${segundosDesde < 60 ? `${segundosDesde} s` : `${Math.floor(segundosDesde / 60)} min`}`}
        </button>
      </div>

      {alAire.length === 0 ? (
        <div className="border border-zinc-800 rounded-lg bg-zinc-900/30 px-4 py-8 text-center">
          <Radio className="w-6 h-6 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-300 text-sm">
            {proxima
              ? <>Ninguna transmisión al aire todavía. {proxima.firma}{proxima.hora ? ` arranca a las ${proxima.hora}` : ''}{faltan(proxima.hora, ahora) ? `, ${faltan(proxima.hora, ahora)}` : ''}.</>
              : 'Ninguna transmisión al aire en este momento.'}
          </p>
          <p className="text-zinc-600 text-xxs mt-2">
            Esta pantalla se actualiza sola. Dejala abierta y los remates van a aparecer acá cuando salgan al aire.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {enfocado && (
            <Recuadro
              s={enfocado}
              grande
              sonando={sonando === enfocado.id}
              onSonido={() => setSonando(sonando === enfocado.id ? null : enfocado.id)}
              enfocado
              onFoco={() => setFoco(null)}
            />
          )}
          {resto.length > 0 && (
            <div className={`grid ${columnas} gap-4`}>
              {resto.map((s) => (
                <Recuadro
                  key={s.id}
                  s={s}
                  sonando={sonando === s.id}
                  onSonido={() => setSonando(sonando === s.id ? null : s.id)}
                  enfocado={false}
                  onFoco={() => setFoco(s.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Las que faltan, con su cuenta regresiva. Se mantiene visible mientras
          hay players abiertos: es lo que deja seguir la tarde entera sin salir. */}
      {faltantes.length > 0 && (
        <div className="mt-4 border border-zinc-800 rounded-lg bg-zinc-900/30 p-3">
          <p className="text-zinc-500 text-xs mb-2">Más tarde, hoy:</p>
          <div className="flex flex-wrap gap-2">
            {faltantes.map((p, i) => {
              const cuanto = faltan(p.hora, ahora)
              return (
                <Link
                  key={p.id}
                  href={p.perfilHref}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-zinc-800 text-zinc-400 hover:text-accent hover:border-accent rounded transition-colors"
                >
                  {p.firma}
                  {p.hora && <span className="text-zinc-600 font-mono">{p.hora}</span>}
                  {cuanto && <span className="text-accent text-xxs">{cuanto}</span>}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

function Recuadro({
  s, grande = false, sonando, onSonido, enfocado, onFoco,
}: {
  s: StreamItem
  grande?: boolean
  sonando: boolean
  onSonido: () => void
  enfocado: boolean
  onFoco: () => void
}) {
  return (
    <article
      id={`stream-${s.id}`}
      className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/40 flex flex-col"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-800">
        <div className="min-w-0">
          <p className={`text-zinc-100 font-medium truncate ${grande ? 'text-base' : 'text-sm'}`}>
            {s.firma}
          </p>
          <p className="text-zinc-500 text-xxs truncate">
            {s.titulo}
            {s.hora ? ` · ${s.hora} hs` : ''}
            {s.lugar ? ` · ${s.lugar}` : ''}
          </p>
        </div>
        <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-red-600 rounded-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-white text-xxs font-bold">EN VIVO</span>
        </span>
      </div>

      <div className="relative w-full aspect-video bg-black">
        <iframe
          // La key cambia con el sonido para que el player se vuelva a montar:
          // YouTube no deja pasar de mudo a con sonido cambiando el src a secas.
          key={`${s.id}-${sonando ? 'audio' : 'mudo'}`}
          src={conSonido(s.embedUrl, sonando)}
          title={`Transmisión de ${s.firma}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
          frameBorder={0}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-zinc-800 mt-auto">
        {/* La acción que importa: si algo le interesó, que llame ya. */}
        {s.tel ? (
          <a
            href={s.tel}
            onClick={() => trackValueEvent('contact_phone', { meta: { slug: s.slug, desde: 'muro' } })}
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
            onClick={() => trackValueEvent('contact_whatsapp', { meta: { slug: s.slug, desde: 'muro' } })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-zinc-700 text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/40 rounded transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </a>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onSonido}
            aria-label={sonando ? `Silenciar a ${s.firma}` : `Escuchar a ${s.firma}`}
            title={sonando ? 'Silenciar' : 'Escuchar este remate'}
            className={`p-1.5 rounded transition-colors ${
              sonando ? 'text-accent bg-accent/10' : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            {sonando ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onFoco}
            aria-label={enfocado ? 'Achicar' : `Agrandar la transmisión de ${s.firma}`}
            title={enfocado ? 'Volver a la grilla' : 'Agrandar'}
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            {enfocado ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <a
            href={s.watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir en YouTube"
            className="p-1.5 rounded text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </article>
  )
}
