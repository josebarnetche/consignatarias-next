'use client'

import { useEffect } from 'react'

/**
 * Cuando alguien copia un fragmento del sitio, se le pega la cita abajo.
 *
 * POR QUÉ. Nuestros números circulan: se copian a un WhatsApp, a un informe, a un
 * grupo de productores — y llegan sin decir de dónde salieron. Eso es exactamente
 * lo que nos pasó con el INMAG, que los medios citan como "índice del Mercado
 * Agroganadero" sin pasar por acá. La atribución al copiar es la forma más barata
 * de que el dato viaje con su origen puesto.
 *
 * CÓMO, Y LO QUE NO SE HACE. Se usa el evento `copy` y se escribe en el
 * portapapeles el texto seleccionado MÁS la línea de cita. No se altera lo que el
 * usuario seleccionó, no se le agrega nada al medio y no se le mete ningún
 * parámetro de rastreo al enlace: sería invisible para él y aparecería después en
 * su documento.
 *
 * Reglas que lo hacen soportable en vez de molesto:
 *  - Selecciones cortas (menos de 40 caracteres) NO se tocan. El que copia un
 *    precio suelto, un CUIT o un teléfono para pegarlo en un formulario no quiere
 *    tres renglones de cita atrás. Es el caso más frecuente y romperlo sería
 *    hostil.
 *  - Si el usuario copia desde un campo de texto o algo editable, tampoco.
 *  - Si el navegador no soporta escribir el portapapeles, se deja pasar el copiado
 *    normal en vez de romperlo.
 */

/** Debajo de esto es un dato suelto que se está pegando en otro lado, no una cita. */
const MINIMO_CARACTERES = 40

export default function CitaAlCopiar() {
  useEffect(() => {
    function alCopiar(e: ClipboardEvent) {
      const sel = window.getSelection()
      const texto = sel?.toString() ?? ''
      if (texto.trim().length < MINIMO_CARACTERES) return

      // Copiar desde un input o un bloque editable es otra intención: no se toca.
      const destino = e.target as HTMLElement | null
      if (destino?.closest?.('input, textarea, [contenteditable="true"]')) return

      const url = `${window.location.origin}${window.location.pathname}`
      const cita = `\n\nFuente: Consignatarias.com.ar — ${document.title}\n${url}`

      try {
        e.clipboardData?.setData('text/plain', texto + cita)
        const html = `${texto.replace(/\n/g, '<br>')}<br><br>Fuente: <a href="${url}">Consignatarias.com.ar — ${document.title}</a>`
        e.clipboardData?.setData('text/html', html)
        e.preventDefault()
      } catch {
        // Si no se puede escribir el portapapeles, que copie normal.
      }
    }

    document.addEventListener('copy', alCopiar)
    return () => document.removeEventListener('copy', alCopiar)
  }, [])

  return null
}
