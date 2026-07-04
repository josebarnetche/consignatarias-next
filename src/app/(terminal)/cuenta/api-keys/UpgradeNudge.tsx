'use client'

import { useState } from 'react'

interface Props {
  plan: 'starter' | 'growth' | 'scale'
  usagePct: number
  daysLeft: number
}

const NEXT_TIER: Record<'starter' | 'growth', { name: string; price: string; quota: string }> = {
  starter: { name: 'Growth', price: 'ARS 451.000/mes', quota: '100.000 req/mes + dashboards + reportes' },
  growth: { name: 'Scale', price: 'a medida', quota: '100K–5M req/mes + white-label + CSM' },
}

export function UpgradeNudge({ plan, usagePct, daysLeft }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (plan === 'scale') return null

  const next = NEXT_TIER[plan]
  const isStarter = plan === 'starter'

  async function startUpgrade() {
    if (!isStarter) {
      // Growth → Scale = navigate to enterprise page with anchor + context.
      // /enterprise renders the Scale tier card with shimmer + the volume
      // slider where they can pick their req/mes and see the price.
      window.location.href = '/enterprise?upgrade=scale&from=growth#calculadora'
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/enterprise/upgrade?target=growth', { method: 'POST' })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.checkoutUrl) {
        setError(json?.message ?? `HTTP ${res.status}`)
        setLoading(false)
        return
      }
      window.location.href = json.checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
      setLoading(false)
    }
  }

  const accent = isStarter ? '#38bdf8' : '#a78bfa'
  const urgency = usagePct >= 95 ? 'crítico' : usagePct >= 90 ? 'alto' : 'medio'

  return (
    <div
      className="terminal-panel mb-6 relative overflow-hidden"
      style={{
        borderColor: `${accent}80`,
        background: `linear-gradient(135deg, ${accent}10, transparent)`,
        boxShadow: `0 0 24px ${accent}33`,
      }}
    >
      <div className="terminal-panel-header" style={{ color: accent, borderBottomColor: `${accent}40` }}>
        <span>✨ Upgrade disponible — Estás al {usagePct}%</span>
      </div>
      <div className="px-panel py-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <p className="text-zinc-200 text-data mb-1">
            Llevás <strong style={{ color: accent }}>{usagePct}% del cupo</strong> y te
            quedan <strong>{daysLeft} días</strong> de período. Si seguís a este ritmo,
            podés agotarlo antes del reset.
          </p>
          <p className="text-zinc-500 text-xxs mb-1">
            <strong className="text-zinc-300">{next.name}</strong> — {next.price} —{' '}
            {next.quota}
          </p>
          <p className="text-zinc-600 text-xxs">
            Urgencia: <span style={{ color: urgency === 'crítico' ? '#f87171' : urgency === 'alto' ? '#fbbf24' : '#a3a3a3' }}>{urgency}</span>
            {' · '}Cancelás cuando quieras
          </p>
        </div>
        <button
          type="button"
          onClick={startUpgrade}
          disabled={loading}
          className="enterprise-upgrade-cta whitespace-nowrap px-5 py-3 text-xxs font-terminal uppercase tracking-widest disabled:opacity-50"
          style={{
            background: `linear-gradient(110deg, ${accent}, ${accent}cc 50%, ${accent})`,
            backgroundSize: '200% 100%',
            border: `1.5px solid ${accent}`,
            color: '#000',
            borderRadius: '2px',
            fontWeight: 700,
            boxShadow: `0 0 28px ${accent}66, 0 4px 12px ${accent}33`,
            animation: 'shimmer 3s ease-in-out infinite',
          }}
        >
          {loading
            ? 'Redirigiendo…'
            : isStarter
              ? `Upgrade a Growth →`
              : `Hablar de Scale →`}
        </button>
      </div>
      {error && (
        <p className="px-panel pb-3 text-xxs text-red-400">{error}</p>
      )}
    </div>
  )
}
