'use client'

import { useState } from 'react'

/**
 * Compartir la página. WhatsApp primero, porque así circula el dato en el campo.
 *
 * El orden no es decorativo: en el mercado ganadero argentino un precio viaja por
 * WhatsApp, no por X ni por LinkedIn. Poner WhatsApp primero y grande es leer a
 * quién le estamos hablando.
 *
 * El texto que se comparte lleva la cita adentro, igual que el copiado: si alguien
 * reenvía el mensaje, el origen va pegado al dato.
 */

interface Props {
  /** Qué se está compartiendo, para el texto del mensaje. */
  titulo: string
  /** Ruta absoluta del sitio, sin dominio. Si falta, se toma la del navegador. */
  path?: string
  /** Una línea con el dato, para que el mensaje diga algo y no solo un link. */
  resumen?: string
  className?: string
}

export default function Compartir({ titulo, path, resumen, className = '' }: Props) {
  const [copiado, setCopiado] = useState(false)

  const url = () =>
    `https://www.consignatarias.com.ar${path ?? (typeof window !== 'undefined' ? window.location.pathname : '')}`

  const mensaje = () => {
    const u = url()
    return resumen ? `${titulo}\n${resumen}\n\n${u}` : `${titulo}\n\n${u}`
  }

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(mensaje())
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Sin permiso de portapapeles no se hace nada: el resto de los botones sirve.
    }
  }

  async function compartirNativo() {
    // En el teléfono, el menú del sistema es mejor que cualquier botón nuestro:
    // ofrece los contactos reales del usuario. Si no existe, se cae a copiar.
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: titulo, text: resumen ?? titulo, url: url() })
        return
      } catch {
        /* el usuario canceló: no es un error */
      }
    }
    void copiarEnlace()
  }

  const base =
    'inline-flex items-center gap-1.5 rounded-terminal border px-2.5 py-1.5 text-xxs font-terminal transition-colors'

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xxs font-terminal uppercase tracking-widest text-zinc-500">Compartir</span>

      <a
        href={`https://wa.me/?text=${encodeURIComponent(mensaje())}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} border-positive/40 text-positive hover:bg-positive/10`}
        aria-label={`Compartir ${titulo} por WhatsApp`}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
          <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.2-.7.2-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.6-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5 0-.2 0-.4 0-.5 0-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2" />
        </svg>
        WhatsApp
      </a>

      <button
        type="button"
        onClick={compartirNativo}
        className={`${base} border-terminal-border text-zinc-400 hover:border-accent/50 hover:text-accent`}
        aria-label={`Compartir ${titulo}`}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        Compartir
      </button>

      <button
        type="button"
        onClick={copiarEnlace}
        className={`${base} border-terminal-border text-zinc-400 hover:border-accent/50 hover:text-accent`}
        aria-label={`Copiar el enlace de ${titulo}`}
      >
        {copiado ? (
          <>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Copiado
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
            Copiar
          </>
        )}
      </button>

      <a
        href={`mailto:?subject=${encodeURIComponent(titulo)}&body=${encodeURIComponent(mensaje())}`}
        className={`${base} border-terminal-border text-zinc-400 hover:border-accent/50 hover:text-accent`}
        aria-label={`Compartir ${titulo} por correo`}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" />
        </svg>
        Correo
      </a>
    </div>
  )
}
