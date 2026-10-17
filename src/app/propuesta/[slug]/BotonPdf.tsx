'use client'

/**
 * "Descargar PDF" = el diálogo de impresión del navegador ("Guardar como PDF").
 * No generamos el PDF en el servidor: la hoja de estilos de impresión de la
 * propuesta ya lo deja como documento formal, y así el PDF siempre sale con los
 * datos del momento en que se abre el link.
 */
export default function BotonPdf() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-2 rounded-terminal border border-terminal-border bg-terminal-panel px-3 py-1.5 text-xs font-medium text-ink hover:border-accent hover:text-accent transition-colors"
    >
      Descargar PDF
    </button>
  )
}
