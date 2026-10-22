import Link from 'next/link'
import { ImagenTema } from '@/components/ui/ImagenTema'

/**
 * Puente de las páginas de PRECIO (las que más tráfico orgánico traen) a las tres que
 * convierten: el formulario de venta ("Buscame comprador", que alimenta al agente de
 * operaciones), el de compra (`/quiero-comprar`, demanda de compra) y la vidriera de lotes.
 *
 * GSC 19-09 → 16-10-2026: `/precios/*` 14.861 impresiones y `/mercado/arrendamiento`
 * 44.506, con CERO enlaces a esos formularios (los tenían sólo `/mercado/[categoria]`,
 * `/mercado/inmag` y `/mercado/spread`). Quien busca "precio ternero 180 kg hoy" está por
 * vender o comprar terneros, y la página le daba el número y lo dejaba ir.
 *
 * Server component, sin JS. Los anchors son exactos ("Vender terneros", "Comprar
 * hacienda") a propósito: también son enlazado interno hacia `/quiero-comprar` y `/lotes`.
 * No enlaza a `/mercado/[categoria]` aunque tenga el mismo formulario: esa URL compite con
 * `/precios/[categoria]` por "precio del X hoy" y no hay que darle más señal.
 */
export default function PuenteHacienda({
  plural,
  titulo,
  className = '',
}: {
  /** "terneros", "vacas"… Sin categoría, dice "hacienda". */
  plural?: string
  titulo?: string
  className?: string
}) {
  const que = plural ?? 'hacienda'
  const items = [
    {
      href: '/mercado/vender-ahora',
      title: `Vender ${que}`,
      hint: 'Decinos cuántas cabezas y a cuánto: te buscamos el comprador.',
      icon: '/marca/iconos-color/martillo.png',
    },
    {
      href: '/quiero-comprar',
      title: `Comprar ${que}`,
      hint: 'Te avisamos de cada remate que encaje con lo que buscás.',
      icon: '/marca/iconos-color/buscador-lupa.png',
    },
    {
      href: '/lotes',
      title: 'Lotes de hacienda en venta',
      hint: 'Categoría, kilos y referencia de precio de cada lote.',
      icon: '/marca/iconos-color/casa-remates.png',
    },
  ]
  return (
    <nav aria-label="Vender o comprar hacienda" className={`my-6 ${className}`}>
      <div className="text-xs uppercase tracking-widest text-zinc-500 mb-3">
        {titulo ?? `¿Vendés o comprás ${que}?`}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="flex items-start gap-2.5 rounded-terminal border border-terminal-border bg-terminal-panel p-3 hover:border-accent transition-colors"
          >
            <span className="inline-flex w-8 h-8 rounded bg-zinc-100 items-center justify-center select-none shrink-0" aria-hidden="true">
              <ImagenTema src={t.icon} alt="" className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zinc-100">{t.title}</div>
              <div className="text-xs text-zinc-500 mt-0.5 leading-snug">{t.hint}</div>
            </div>
          </Link>
        ))}
      </div>
    </nav>
  )
}
