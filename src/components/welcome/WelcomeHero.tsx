'use client'

import { HeroNumber, StatPill } from '@/components/pro'
import { formatVigencia, resolveGreetingName, greetingByHour } from './welcome-utils'
import { EmptyState } from '@/components/ui'

type Tier = 'FREE' | 'PRO' | 'ENTERPRISE'

interface WelcomeHeroProps {
  /** Email real de la sesión (fallback del saludo). */
  email: string
  /** Nombre real de la consignataria/frigorífico, si existe. */
  displayName?: string | null
  tier: Tier
  /** Vencimiento de la suscripción (ISO) — solo si hay suscripción real. */
  periodEnd?: string | null
  /** Vistas de perfil reales (últimos 30 días). null = aún sin perfil verificado. */
  viewCount?: number | null
  /** Percentil real de vistas vs el país (0 = sin dato). */
  viewPercentile?: number
  /** Ranking provincial real. position 0 = sin dato. */
  provincialRank?: { position: number; total: number; province: string }
}

/**
 * Panel de bienvenida del dashboard. Lidera con UN dato real de valor
 * (vistas del perfil) + el percentil como StatPill. Marca el tier PRO con
 * accent (sky), reservando el amber para gamificación y badge dorado.
 *
 * No fabrica datos: si no hay vistas todavía, muestra un mensaje honesto.
 */
export default function WelcomeHero({
  email,
  displayName,
  tier,
  periodEnd,
  viewCount = null,
  viewPercentile = 0,
  provincialRank,
}: WelcomeHeroProps) {
  const name = resolveGreetingName(displayName, email)
  const isPro = tier === 'PRO' || tier === 'ENTERPRISE'
  const vigencia = formatVigencia(periodEnd)
  const hasViews = typeof viewCount === 'number' && viewCount > 0

  // El borde accent (sky) marca este panel como el hero/destacado de la vista.
  const panelStyle = isPro ? { borderColor: 'rgba(56, 189, 248, 0.4)' } : undefined

  return (
    <div className="terminal-panel" style={panelStyle}>
      <div className="terminal-panel-header flex items-center justify-between gap-2">
        <span
          className={`text-label tracking-widest ${isPro ? '' : 'text-zinc-200'}`}
          style={isPro ? { color: '#38bdf8' } : undefined}
        >
          BIENVENIDO
        </span>
        {isPro && (
          <span className="text-[9px] font-mono uppercase tracking-wider text-accent border border-accent/40 rounded px-1 py-0.5">
            {tier} · activo
          </span>
        )}
      </div>

      <div className="px-panel py-4 space-y-4">
        {/* Saludo personalizado — nombre/email reales */}
        <div className="space-y-1">
          <p className="text-data font-terminal text-zinc-200">
            {greetingByHour()}, <span className="text-zinc-100">{name}</span>.
          </p>
          {isPro ? (
            <p className="text-xxs font-terminal text-zinc-500">
              {vigencia
                ? <>Tu suscripción {tier} está activa hasta el <span className="text-zinc-300 tabular-nums">{vigencia}</span>.</>
                : <>Tu suscripción {tier} está activa.</>}
            </p>
          ) : (
            <p className="text-xxs font-terminal text-zinc-500">
              Tu cuenta está en plan gratuito.
            </p>
          )}
        </div>

        {/* Estado de cuenta — UN dato real de valor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-terminal-border">
          <div>
            {hasViews ? (
              <HeroNumber
                label="Vistas de perfil · últimos 30 días"
                value={viewCount!.toLocaleString('es-AR')}
                sub={
                  provincialRank && provincialRank.position > 0
                    ? `#${provincialRank.position} en ${provincialRank.province}`
                    : undefined
                }
                tone="accent"
              />
            ) : viewCount === null ? (
              <div>
                <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">
                  Vistas de perfil
                </div>
                <p className="text-zinc-500 text-data font-terminal">
                  Verificá tu perfil para empezar a medir vistas.
                </p>
              </div>
            ) : (
              <div>
                <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">
                  Vistas de perfil · últimos 30 días
                </div>
                <EmptyState icon="buscador-lupa" compact title="Tu perfil todavía no registró vistas." />
              </div>
            )}
          </div>

          {/* Percentil real como StatPill (solo si hay dato) */}
          <div className="flex items-center">
            {viewPercentile > 0 ? (
              <div className="w-full space-y-2">
                <StatPill label="vs el país" value={viewPercentile} />
                <p className="text-[10px] font-terminal text-zinc-600">
                  Estás por encima del {viewPercentile}% de las consignatarias más vistas.
                </p>
              </div>
            ) : (
              <p className="text-zinc-600 text-[10px] font-terminal">
                El ranking nacional aparece cuando tu perfil acumula vistas.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
