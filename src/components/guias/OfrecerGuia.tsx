import Link from 'next/link'
import { getGuiaPremium, formatArs } from '@/lib/guias-premium'

/**
 * El puente entre una página de tema y la guía paga que vende ese tema.
 *
 * POR QUÉ EXISTE
 * Search Console, 28 días al 16-sep-2026: "consignatario de hacienda" tuvo 216
 * impresiones en posición 2,4; "consignataria de hacienda" 123 en 2,5; "qué es una
 * consignataria" y sus variantes otras ~60. Esa demanda cae en
 * `/que-es-una-consignataria` (883 impresiones), `/consignatarias` (544),
 * `/como-funciona-un-remate-ganadero` (1.151) y `/como-vender-hacienda`. De esas
 * páginas, sólo el directorio ofrecía la guía —y como banner de una línea, ANTES
 * del contenido—. `guia_purchases` = 0 en toda la historia con 34 `guia_view` en
 * 18 días: el producto existe, el circuito de pago existe, y la gente que busca
 * exactamente el tema no se entera.
 *
 * CÓMO SE COMPORTA (misma regla que `OfrecerInforme`)
 * La página entrega su valor completo y gratis; esto va DESPUÉS, nunca antes. La
 * guía se presenta como lo que la pantalla no puede dar —el trámite pantalla por
 * pantalla, los costos con fecha, los defaults con nombre— y cierra diciendo qué
 * sigue siendo gratis acá, para que el bloque no se lea como "ahora esto se paga".
 *
 * Server component: los landers son SSG y una oferta no justifica JavaScript. La
 * atribución viaja en `?ref=oferta-<desde>`; `GuiaViewTracker` la lee en el sales
 * page y la deja en sessionStorage para que la compra, del otro lado de Rebill,
 * pueda decir qué página la trajo.
 */

interface Props {
  /** De dónde sale el clic — la métrica que dice qué página trabaja para la guía. */
  desde: string
  /** El titular, en la voz de la página. */
  titulo: string
  /** Qué da la guía que esta pantalla no puede dar. Tres o cuatro, no más. */
  loQueAgrega: string[]
  /** Qué sigue siendo gratis acá. Sin esto el bloque se lee como un cierre. */
  gratisAca: string
  className?: string
}

export function OfrecerGuia({ desde, titulo, loQueAgrega, gratisAca, className = '' }: Props) {
  const guia = getGuiaPremium('abrir-una-consignataria')
  if (!guia) return null

  return (
    <section
      className={`my-8 rounded-lg border border-accent/40 bg-accent/5 p-6 ${className}`}
      data-oferta-guia={guia.slug}
    >
      <p className="text-xxs font-terminal uppercase tracking-wider text-accent">
        Guía paga · edición {guia.edicion} · PDF {guia.pages} pág.
      </p>
      <h2 className="mt-2 text-xl font-semibold text-zinc-50 sm:text-2xl">{titulo}</h2>

      <ul className="mt-4 space-y-2 text-sm leading-relaxed text-zinc-300">
        {loQueAgrega.map((t) => (
          <li key={t} className="flex gap-2.5">
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
            <span>{t}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Link
          href={`${guia.landing}?ref=oferta-${desde}`}
          className="inline-flex items-center gap-2 rounded bg-accent px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-accent-bright"
        >
          {guia.title}
          <span aria-hidden>→</span>
        </Link>
        <span className="text-sm text-zinc-400">
          {formatArs(guia.priceArs)} · compra única · factura A a pedido
        </span>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-zinc-500">{gratisAca}</p>
    </section>
  )
}
