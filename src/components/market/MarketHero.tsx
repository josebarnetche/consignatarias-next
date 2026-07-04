import type { ReactNode } from 'react'
import { AnimatedPrice } from '@/components/AnimatedPrice'
import { Stat, Delta, DeltaFlash } from '@/components/ui'
import { signedTone, type SemanticTone } from '@/lib/ui/tokens'

/* ================================================================== */
/*  MarketHero — el número-hero compartido por /mercado/inmag y        */
/*  /mercado/arrendamiento (DESIGN-SYSTEM.md §2.5 / §5).                */
/*                                                                      */
/*  Capta el patrón común: fondo con gradiente + breadcrumb/heading     */
/*  (children) + tarjeta de precio vivo (DeltaFlash + AnimatedPrice +   */
/*  Delta) + grilla de quick-stats con tono semántico. El cuerpo del    */
/*  heading lo aporta cada página (badge/título/lede distintos); el     */
/*  número vivo y los stats salen del mismo lenguaje en ambas.          */
/* ================================================================== */

export interface MarketHeroStat {
  label: string
  /** Valor PRE-FORMATTED (ej. "$4.284"). */
  value: ReactNode
  sub?: ReactNode
  /** Tono semántico del valor. Default `emphasis`. */
  tone?: SemanticTone
}

interface MarketHeroProps {
  /** Acento de la sección: tiñe el gradiente del fondo. */
  accent: 'emerald' | 'amber'
  /** Encabezado de la columna izquierda (breadcrumb + badge + h1 + lede). */
  children: ReactNode
  /** Label sobre el número-hero, ej. "Precio Actual" / "Índice Hoy". */
  priceLabel: string
  /** Valor vivo del índice (kg vivo). */
  priceValue: number
  /** Variación firmada vs. cierre anterior. */
  priceChange: number
  /** Valor del cierre anterior (PRE-FORMATTED sin "$"). */
  prevValue: string
  /** Quick-stats bajo la tarjeta (Mín/Máx/Prom/Var 30d). */
  stats: MarketHeroStat[]
}

const ACCENT_BG: Record<MarketHeroProps['accent'], string> = {
  emerald: 'from-sky-950/20 via-zinc-950 to-zinc-950',
  amber: 'from-sky-950/20 via-zinc-950 to-zinc-950',
}
const ACCENT_GLOW: Record<MarketHeroProps['accent'], string> = {
  emerald: 'bg-sky-500/5',
  amber: 'bg-sky-500/5',
}

export function MarketHero({
  accent,
  children,
  priceLabel,
  priceValue,
  priceChange,
  prevValue,
  stats,
}: MarketHeroProps) {
  const isUp = priceChange >= 0
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-b ${ACCENT_BG[accent]}`} />
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] ${ACCENT_GLOW[accent]} blur-[120px] rounded-full`}
      />

      <div className="relative max-w-6xl mx-auto px-4 pt-8 pb-12">
        {/* Heading area (breadcrumb + badge + h1 + lede) provista por la página */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
          {children}

          {/* Hero Price Card — el dato vivo. DeltaFlash da un wash sutil sobre el
              FONDO al cargar/cambiar el precio (DESIGN-SYSTEM §5); el número
              tabular-nums queda fijo, no salta el layout. */}
          <DeltaFlash value={priceValue} tone="live" className="w-full lg:w-auto block">
            <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 lg:p-8 w-full lg:w-auto lg:min-w-[400px]">
              <div className="text-sm text-zinc-500 mb-2 font-medium">{priceLabel}</div>
              <div className="flex items-baseline gap-2 sm:gap-3">
                <span className="text-4xl sm:text-5xl font-bold text-white font-terminal tracking-tight tabular-nums">
                  <AnimatedPrice value={priceValue} duration={2800} prefix="$" decimals={2} />
                </span>
                <span className="text-zinc-500 text-lg shrink-0">/kg</span>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800">
                <div
                  className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${
                    isUp ? 'bg-positive/10' : 'bg-negative/10'
                  }`}
                >
                  <Delta
                    change={priceChange}
                    format={(abs) =>
                      abs.toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    }
                  />
                </div>
                <div className="text-sm text-zinc-500">
                  vs. anterior: <span className="text-zinc-300">${prevValue}</span>
                </div>
              </div>
            </div>
          </DeltaFlash>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 motion-hover hover:border-zinc-700/50"
            >
              <Stat
                label={stat.label}
                value={stat.value}
                sub={stat.sub}
                tone={stat.tone ?? 'emphasis'}
                size="text-2xl font-bold"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
