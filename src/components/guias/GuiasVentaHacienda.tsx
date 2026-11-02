import Link from 'next/link'

/**
 * Las guías de venta de hacienda, cada una con su pregunta. Eran tres con titles casi
 * iguales que se pisaban en Google; desde la v1.255.1 el paso a paso
 * (/vender-hacienda-guia) vive en /como-vender-hacienda y queda aparte solo la
 * comparativa lado a lado, que responde otra pregunta.
 */
const GUIAS = [
  {
    href: '/como-vender-hacienda',
    titulo: 'Cómo vender hacienda',
    para: 'Por dónde vender, qué papeles hacen falta, qué te descuentan y cuánto te queda en la mano.',
  },
  {
    href: '/vender-en-remate-vs-venta-directa-vs-consignacion',
    titulo: 'Remate, venta directa o consignación: la comparativa',
    para: 'Si querés ver los tres canales lado a lado: comisión, precio y cuándo cobrás.',
  },
]

export function GuiasVentaHacienda({ actual }: { actual: string }) {
  return (
    <nav aria-label="Guías para vender hacienda" className="mb-6 border border-terminal-border bg-terminal-panel/40 px-panel py-3">
      <h2 className="text-zinc-100 text-base font-medium mb-2">Las otras guías para vender hacienda</h2>
      <ul className="space-y-2">
        {GUIAS.filter((g) => g.href !== actual).map((g) => (
          <li key={g.href}>
            <Link href={g.href} className="text-accent hover:text-accent-bright">
              {g.titulo} →
            </Link>
            <span className="block text-zinc-400">{g.para}</span>
          </li>
        ))}
      </ul>
    </nav>
  )
}
