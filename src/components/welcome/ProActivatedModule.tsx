'use client'

import Link from 'next/link'
import { formatVigencia } from './welcome-utils'
import { CheckCircle2, Circle } from 'lucide-react'

type Tier = 'PRO' | 'ENTERPRISE'

export interface NextStep {
  label: string
  done: boolean
  /** Acción primaria del paso: navega o ejecuta un callback (tab del dashboard). */
  onClick?: () => void
  href?: string
}

interface ProActivatedModuleProps {
  tier: Tier
  /** Vencimiento real de la suscripción (ISO). */
  periodEnd?: string | null
  /** true mientras Rebill confirma; muestra el spinner verde-en-camino. */
  confirming: boolean
  steps: NextStep[]
  onClose: () => void
}

/**
 * Módulo "Ya sos PRO — esto desbloqueaste" que se muestra tras /upgrade.
 *
 * - Mantiene el micro-momento: "Pago recibido — activando…" (spinner) →
 *   "PRO activado" (verde positive) al confirmar.
 * - Lista lo desbloqueado (capacidades reales del producto, sin números).
 * - Próximos pasos accionables, cada uno con destino real.
 * - Tono sobrio, "vos" rioplatense, sin euforia genérica.
 */
export default function ProActivatedModule({
  tier,
  periodEnd,
  confirming,
  steps,
  onClose,
}: ProActivatedModuleProps) {
  const vigencia = formatVigencia(periodEnd)
  const doneCount = steps.filter(s => s.done).length
  const total = steps.length

  // Capacidades reales que desbloquea PRO Consignataria.
  const unlocked = [
    'Tus remates llegan por email a toda nuestra base de productores',
    'Perfil destacado con badge dorado en el directorio',
    'Analytics: vistas, ranking provincial, reporte PDF',
    'Landing con QR y widget embebible para tu web',
  ]

  return (
    <div
      className="terminal-panel"
      style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}
    >
      <div className="terminal-panel-header flex items-center justify-between gap-2">
        <span className="text-label tracking-widest" style={{ color: '#38bdf8' }}>
          {confirming ? 'ACTIVANDO PRO' : `${tier} ACTIVADO`}
        </span>
        <button
          onClick={onClose}
          className="text-zinc-500 text-xxs font-terminal hover:text-zinc-300 px-2 py-1 -mr-1"
        >
          Cerrar
        </button>
      </div>

      <div className="px-panel py-4 space-y-4">
        {confirming ? (
          /* Micro-momento: pago recibido, activando */
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-data font-terminal text-zinc-300">
              Pago recibido — activando tu suscripción {tier}.
            </span>
          </div>
        ) : (
          <>
            {/* Confirmación verde (logrado) */}
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-positive flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-data font-terminal text-positive">
                  Bienvenido a {tier}.
                </p>
                <p className="text-xxs font-terminal text-zinc-400">
                  {vigencia
                    ? <>Tu suscripción está activa hasta el <span className="text-zinc-300 tabular-nums">{vigencia}</span>.</>
                    : 'Tu suscripción está activa.'}
                </p>
              </div>
            </div>

            {/* Lo que desbloqueaste */}
            <div className="space-y-1.5 pt-1">
              <p className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">
                Esto desbloqueaste
              </p>
              <ul className="space-y-1">
                {unlocked.map((u, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-accent text-data font-terminal leading-tight mt-px">→</span>
                    <span className="text-xxs font-terminal text-zinc-300 leading-snug">{u}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Próximos pasos — accionables, destinos reales */}
        {!confirming && steps.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-terminal-border">
            <div className="flex items-center justify-between">
              <p className="text-xxs font-terminal text-zinc-500 uppercase tracking-wider">
                Empecemos por esto
              </p>
              <span className="text-xxs font-terminal tabular-nums text-zinc-500">
                {doneCount}/{total}
              </span>
            </div>
            <div className="space-y-1.5">
              {steps.map((step, i) => {
                const isPrimary = !step.done && i === steps.findIndex(s => !s.done)
                const inner = (
                  <span className="flex items-center gap-2 w-full">
                    {step.done
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-positive flex-shrink-0" />
                      : <Circle className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />}
                    <span
                      className={`text-xxs font-terminal ${
                        step.done
                          ? 'text-zinc-500 line-through'
                          : isPrimary
                            ? 'text-accent'
                            : 'text-zinc-300'
                      }`}
                    >
                      {step.label}
                    </span>
                  </span>
                )
                const cls = `flex items-center w-full text-left px-2 py-2 rounded-terminal border transition-colors ${
                  isPrimary
                    ? 'border-accent/40 bg-accent/5 hover:bg-accent/10'
                    : 'border-transparent hover:bg-zinc-800/40'
                }`
                if (step.done) {
                  return <div key={i} className="flex items-center w-full px-2 py-2">{inner}</div>
                }
                return step.href ? (
                  <Link key={i} href={step.href} className={cls}>{inner}</Link>
                ) : (
                  <button key={i} onClick={step.onClick} className={cls}>{inner}</button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
