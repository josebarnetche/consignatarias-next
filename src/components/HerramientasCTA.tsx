import Link from 'next/link'

/**
 * Tira de "cosas para hacer" — surfacea las herramientas pegajosas
 * (calculadora, mi-ganado, ¿vendo ahora?, alerta) que tienen 90%+ de engagement
 * pero casi nada de tráfico. Se dropea al pie de las páginas de mercado de alto
 * volumen y alto bounce (precios, arrendamiento) para convertir una lectura en
 * una acción. Server component (sin JS).
 */
const TOOLS: Array<{ href: string; title: string; hint: string }> = [
  { href: '/calculadora', title: 'Calculá tu tropa', hint: 'Cuánto te queda neto hoy' },
  { href: '/mi-ganado', title: 'Seguí tu ganado', hint: 'Valor de tu rodeo, día a día' },
  { href: '/mercado/vender-ahora', title: '¿Vendo ahora?', hint: 'Si tu categoría está en zona de venta' },
  { href: '/precios', title: 'Precios de hoy', hint: 'Hacienda en pie por categoría' },
]

export default function HerramientasCTA({
  title = 'Cosas para hacer con estos datos',
  exclude,
}: {
  title?: string
  /** Ruta a ocultar (para no linkear a la página en la que ya estás). */
  exclude?: string
}) {
  const tools = TOOLS.filter((t) => t.href !== exclude)
  return (
    <section className="my-8">
      <div className="text-xs uppercase tracking-widest text-zinc-500 mb-3">{title}</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tools.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-terminal border border-terminal-border bg-terminal-panel p-3 hover:border-accent transition-colors"
          >
            <div className="text-sm font-semibold text-zinc-100">{t.title}</div>
            <div className="text-xs text-zinc-500 mt-0.5 leading-snug">{t.hint}</div>
          </Link>
        ))}
      </div>
    </section>
  )
}
