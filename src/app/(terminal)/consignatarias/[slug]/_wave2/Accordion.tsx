/**
 * Accordion — contenedor colapsable sobre <details>/<summary> nativo.
 *
 * Por qué nativo: accesible por teclado gratis, Y los children quedan en el DOM
 * aunque esté colapsado (el browser solo togglea display) → el contenido sigue
 * siendo crawleable, sin riesgo SEO de ocultar markup client-only. Estilado como
 * terminal-panel minimal: la jerarquía la da el espacio, no una caja con color.
 */
export function Accordion({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string
  badge?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <details open={defaultOpen} className="terminal-panel mt-px group">
      <summary className="terminal-panel-header flex items-center justify-between gap-2 cursor-pointer list-none select-none">
        <span className="flex items-center gap-2">
          <span className="text-zinc-600 transition-transform group-open:rotate-90">&#9656;</span>
          <span className="text-zinc-400 text-xxs tracking-widest uppercase">{title}</span>
        </span>
        {badge}
      </summary>
      {children}
    </details>
  )
}
