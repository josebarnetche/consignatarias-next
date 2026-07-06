'use client'

/**
 * Error boundary global con marca (patrón del 404): pictograma alerta en chip
 * hueso + retry. El detalle técnico va a consola, no al productor.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error(error)
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <span className="inline-flex w-16 h-16 rounded-lg bg-zinc-100 items-center justify-center select-none" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/iconos-color/alerta.png" alt="" className="w-10 h-10" />
      </span>
      <h1 className="text-zinc-100 text-xl font-terminal">Algo falló de este lado</h1>
      <p className="text-zinc-500 text-sm max-w-sm">
        No sos vos, es la terminal. Probá de nuevo — si persiste, escribinos a{' '}
        <a href="mailto:agro@memola.com.ar" className="text-accent hover:text-accent-bright">agro@memola.com.ar</a>.
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-sm bg-accent px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-sky-300 transition-colors"
      >
        Reintentar →
      </button>
    </div>
  )
}
