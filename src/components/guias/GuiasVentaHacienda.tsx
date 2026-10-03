import Link from 'next/link'

/**
 * Las tres guías de venta de hacienda, cada una con su pregunta. Antes tenían
 * titles casi iguales y se pisaban en Google; ahora cada una responde una cosa
 * distinta y se enlazan entre sí diciendo cuál es cuál.
 */
const GUIAS = [
  {
    href: '/vender-hacienda-guia',
    titulo: 'Cómo vender hacienda paso a paso',
    para: 'Si ya decidiste vender: papeles, desbaste, gastos y cuánto te queda en la mano.',
  },
  {
    href: '/como-vender-hacienda',
    titulo: 'Cómo elegir por dónde vender',
    para: 'Si no sabés si te conviene la consignación, el remate o la venta directa.',
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
