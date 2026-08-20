import Link from 'next/link'
import { getGuiaPremium, formatArs } from '@/lib/guias-premium'

/**
 * Banner promocional interno de la guía paga.
 *
 * Va en la landing y en los tres landers de más tráfico. Nace de un hallazgo de
 * la auditoría de tráfico de junio: las páginas que traen la gente —el índice,
 * el arrendamiento, frigoríficos— no tenían NINGÚN ask proporcional a la
 * intención. Este es el ask, y es honesto: una línea, sin modal, sin pop-up, sin
 * tapar el dato que la persona vino a buscar.
 *
 * Server component a propósito: los landers son SSG y un banner no justifica
 * mandarles JavaScript.
 *
 * El `ref` viaja en la URL para poder leer en GA4 desde qué página salió cada
 * clic — sin eso el banner no se puede evaluar y queda para siempre "porque sí".
 */
export function PromoGuiaBanner({
  origen,
  className = '',
}: {
  /**
   * De dónde sale el clic: 'home', 'inmag', 'arrendamiento', 'frigorificos', …
   * NO se llama `ref`: React la reserva y el render se cae con "Refs cannot be
   * used in Server Components".
   */
  origen: string
  className?: string
}) {
  const guia = getGuiaPremium('abrir-una-consignataria')
  if (!guia) return null

  return (
    <Link
      href={`${guia.landing}?ref=banner-${origen}`}
      className={`group flex flex-wrap items-center gap-x-3 gap-y-1.5 border border-accent/30 hover:border-accent bg-accent/5 rounded px-3.5 py-2.5 transition-colors ${className}`}
    >
      <span className="shrink-0 bg-accent text-zinc-950 text-xxs font-terminal font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
        Nuevo
      </span>
      <span className="text-sm text-zinc-200 group-hover:text-zinc-100">
        <strong className="font-semibold">Cómo abrir tu consignataria de hacienda</strong>
        {' — '}
        <span className="text-zinc-400">
          guía {guia.edicion} actualizada, {guia.pages} páginas. Matrícula, SIOCAL, SENASA,
          números y marketing.
        </span>
      </span>
      <span className="ml-auto shrink-0 text-xxs font-terminal uppercase tracking-wider text-accent">
        {formatArs(guia.priceArs)} →
      </span>
    </Link>
  )
}
