import Link from 'next/link'

/**
 * Tira de "cosas para hacer" — surfacea las herramientas pegajosas
 * (calculadora, mi-ganado, ¿vendo ahora?, alerta) que tienen 90%+ de engagement
 * pero casi nada de tráfico. Se dropea al pie de las páginas de mercado de alto
 * volumen y alto bounce (precios, arrendamiento) para convertir una lectura en
 * una acción. Server component (sin JS).
 */
const TOOLS: Array<{ href: string; title: string; hint: string; icon: string }> = [
  { href: '/calculadora', title: 'Calculá tu tropa', hint: 'Cuánto te queda neto hoy', icon: '/marca/iconos-color/bascula.png' },
  { href: '/mi-ganado', title: 'Seguí tu ganado', hint: 'Valor de tu rodeo, día a día', icon: '/marca/glifos-color/glifo-novillo.png' },
  { href: '/mercado/vender-ahora', title: '¿Vendo ahora?', hint: 'Si tu categoría está en zona de venta', icon: '/marca/iconos-color/alerta.png' },
  { href: '/precios', title: 'Precios de hoy', hint: 'Hacienda en pie por categoría', icon: '/marca/iconos-color/dolar-billete.png' },
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
            className="flex items-start gap-2.5 rounded-terminal border border-terminal-border bg-terminal-panel p-3 hover:border-accent transition-colors"
          >
            <span className="inline-flex w-8 h-8 rounded bg-zinc-100 items-center justify-center select-none shrink-0" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.icon} alt="" className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zinc-100">{t.title}</div>
              <div className="text-xs text-zinc-500 mt-0.5 leading-snug">{t.hint}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
