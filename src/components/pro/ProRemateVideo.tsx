'use client'

import { useRef, useState } from 'react'

/**
 * Reproductor del último remate para perfiles PRO. Autoplay en mute, SIN controles ni
 * íconos de YouTube (controls=0 + modestbranding + iframe con pointer-events-none),
 * pero PAUSABLE: un overlay transparente togglea play/pause vía la IFrame API
 * (postMessage), sin mostrar chrome de YouTube. Loop infinito.
 *
 * Cumple el spec del perfil PRO: "transmisión del último remate en autoplay, en
 * reproductor sin íconos (pero pausable), en mute".
 */
export default function ProRemateVideo({ videoId, title }: { videoId: string; title?: string }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [playing, setPlaying] = useState(true)

  const src =
    `https://www.youtube-nocookie.com/embed/${videoId}` +
    `?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}` +
    `&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1`

  const toggle = () => {
    const func = playing ? 'pauseVideo' : 'playVideo'
    ref.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      '*',
    )
    setPlaying(!playing)
  }

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-terminal border border-warning/30 bg-black">
      <iframe
        ref={ref}
        src={src}
        title={title || 'Transmisión del último remate'}
        allow="autoplay; encrypted-media"
        className="absolute inset-0 h-full w-full pointer-events-none"
        frameBorder={0}
      />
      {/* Overlay: captura el click para pausar/reanudar sin exponer los íconos de YT */}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pausar' : 'Reproducir'}
        className="absolute inset-0 h-full w-full cursor-pointer"
      >
        {!playing && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/35">
            <span className="ml-1 h-0 w-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-white/90" />
          </span>
        )}
      </button>
      {/* Etiqueta sutil, sin competir con el video */}
      <span className="pointer-events-none absolute bottom-2 left-2 rounded-[3px] bg-black/55 px-2 py-0.5 text-[10px] font-terminal uppercase tracking-wider text-warning/90">
        Último remate · en vivo diferido
      </span>
    </div>
  )
}
