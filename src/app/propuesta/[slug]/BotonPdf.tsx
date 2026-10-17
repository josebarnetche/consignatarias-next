/**
 * "Descargar PDF" = la presentación generada en el servidor (/api/propuesta/<firma>/pdf).
 * Antes abría el diálogo de impresión del navegador y el resultado dependía de cada
 * máquina (capturas cortadas, páginas a medias); ahora es el mismo archivo para todos.
 */
export default function BotonPdf({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="print:hidden inline-flex items-center gap-2 rounded-terminal bg-accent px-3 py-1.5 text-xs font-semibold text-white oscuro:text-zinc-950 hover:bg-accent-bright transition-colors"
    >
      Descargar PDF
    </a>
  )
}
