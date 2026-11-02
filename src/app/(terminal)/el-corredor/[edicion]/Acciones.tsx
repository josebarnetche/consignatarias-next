'use client'

import { useState } from 'react'
import { trackEvent } from '@/lib/analytics'

/**
 * Acciones de una edición de El Corredor que necesitan el navegador: abrir el PDF
 * (con evento de medición) y compartir una pieza. En el teléfono, la pieza se
 * comparte como IMAGEN por el menú del sistema (WhatsApp la recibe como foto, que
 * es como circula un dato en el campo); si el navegador no puede compartir
 * archivos, cae al enlace de WhatsApp con el texto y el link.
 */

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-terminal border px-3 py-2 text-xs font-terminal transition-colors'

export function BotonPdf({ href, ym, origen }: { href: string; ym: string; origen: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      onClick={() => trackEvent('el_corredor_pdf', { ym, origen })}
      className="inline-flex items-center justify-center gap-2 rounded-terminal bg-sky-400 px-5 py-3 text-sm font-mono font-bold uppercase tracking-widest text-zinc-950 transition-colors hover:bg-sky-300"
    >
      Abrir el PDF
    </a>
  )
}

export function AccionesPieza({
  ruta,
  url,
  nombreArchivo,
  mensaje,
  ym,
  tipo,
}: {
  /** Ruta del sitio de la imagen (para descargar en el mismo origen). */
  ruta: string
  /** URL absoluta de la imagen. */
  url: string
  nombreArchivo: string
  /** Texto que acompaña la pieza (lleva el link de la edición). */
  mensaje: string
  ym: string
  tipo: string
}) {
  const [aviso, setAviso] = useState<string | null>(null)
  const waHref = `https://wa.me/?text=${encodeURIComponent(`${mensaje}\n\n${url}`)}`

  async function compartirImagen() {
    trackEvent('el_corredor_pieza_compartir', { ym, tipo, via: 'sistema' })
    try {
      const res = await fetch(ruta)
      const blob = await res.blob()
      const file = new File([blob], nombreArchivo, { type: blob.type || 'image/png' })
      if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: mensaje })
        return
      }
    } catch {
      /* canceló o el navegador no comparte archivos: sigue al enlace */
    }
    setAviso('Este navegador no comparte imágenes: abrimos WhatsApp con el enlace.')
    window.open(waHref, '_blank', 'noopener')
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={compartirImagen}
        className={`${base} border-positive/40 text-positive hover:bg-positive/10`}
        aria-label="Compartir la imagen por WhatsApp"
      >
        WhatsApp
      </button>
      <a
        href={ruta}
        download={nombreArchivo}
        onClick={() => trackEvent('el_corredor_pieza_descarga', { ym, tipo })}
        className={`${base} border-terminal-border text-zinc-400 hover:border-accent/50 hover:text-accent`}
      >
        Descargar
      </a>
      {aviso && <p className="w-full text-xxs font-terminal text-zinc-500">{aviso}</p>}
    </div>
  )
}
