import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase-server'
import { getMonthlyUsage, getUserCurrentPeriodUsage, getUserPlan, hasApiAccess, PLAN_LIMITS } from '@/lib/api-keys'
import ApiKeysClient from './ApiKeysClient'
import { UpgradeNudge } from './UpgradeNudge'

export const metadata: Metadata = {
  title: 'API keys',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function ApiKeysPage({
  searchParams,
}: {
  searchParams: Promise<{ enterprise_activated?: string }>
}) {
  const justActivated = (await searchParams).enterprise_activated
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) {
    redirect('/login?next=/cuenta/api-keys')
  }

  // Gate: only Enterprise users can manage API keys
  const hasAccess = await hasApiAccess(user.id)
  if (!hasAccess) {
    return (
      <div className="px-4 py-12 max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            <Link href="/cuenta" className="hover:text-zinc-300">
              Tu cuenta
            </Link>
            <span>/</span>
            <span className="text-zinc-300">API keys</span>
          </div>
          <h1 className="text-xl font-heading text-zinc-100 mb-2">API keys</h1>
        </div>
        <div className="terminal-panel">
          <div
            className="terminal-panel-header"
            style={{ color: '#38bdf8', borderBottomColor: 'rgba(56, 189, 248, 0.3)' }}
          >
            Plan Enterprise requerido
          </div>
          <div className="px-panel py-6">
            <p className="text-zinc-300 text-data mb-3">
              Las API keys son parte de un plan Enterprise.
            </p>
            <p className="text-zinc-500 text-data mb-5">
              Si sos PRO Usuario, tenés acceso de lectura premium (reportes,
              filtros, archivo) pero no acceso a la API. El acceso programático
              es un producto separado pensado para apps, frigoríficos, bancos
              y traders.
            </p>
            <Link
              href="/enterprise"
              className="terminal-btn"
              style={{ borderColor: 'rgba(56, 189, 248, 0.6)', color: '#38bdf8' }}
            >
              Ver planes Enterprise →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const admin = createAdminClient()
  const { data: rawKeys } = await admin
    .from('api_keys')
    .select('id, name, prefix, environment, created_at, last_used_at')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  const keys = rawKeys ?? []

  // Per-key calendar-month count for the per-row display (informational)
  const usage = await Promise.all(
    keys.map(async (k) => ({ id: k.id, used: await getMonthlyUsage(k.id) })),
  )
  const usageById = Object.fromEntries(usage.map((u) => [u.id, u.used]))

  // User-level 28-day billing period (the one the plan actually enforces)
  const plan = (await getUserPlan(user.id))!
  const limits = PLAN_LIMITS[plan]
  const { used: totalUsed, period } = await getUserCurrentPeriodUsage(user.id)
  const usagePct = Math.min(100, Math.round((totalUsed / limits.monthlyQuota) * 100))

  const initialKeys = keys.map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    environment: k.environment as 'live' | 'test',
    created_at: k.created_at,
    last_used_at: k.last_used_at,
    usedThisMonth: usageById[k.id] ?? 0,
  }))

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 text-xxs font-terminal uppercase tracking-wider text-zinc-500">
          <Link href="/cuenta" className="hover:text-zinc-300">
            Tu cuenta
          </Link>
          <span>/</span>
          <span className="text-zinc-300">API keys</span>
        </div>
        <h1 className="text-xl font-heading text-zinc-100 mb-2">API keys</h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          Generá keys para autenticar tus integraciones con la API de
          consignatarias.com.ar. El secreto se muestra una sola vez al crearlo —
          guardalo en tu .env y no lo compartas por chat ni email.
        </p>
      </div>

      {/* Welcome post-pago (cae acá tras un pago aprobado, ?enterprise_activated=<tier>) */}
      {justActivated && (
        <div className="terminal-panel mb-6" style={{ borderColor: 'rgba(16,185,129,0.4)' }}>
          <div className="terminal-panel-header" style={{ color: '#10b981' }}>
            ✓ Tu plan {justActivated.charAt(0).toUpperCase() + justActivated.slice(1)} está activo
          </div>
          <div className="px-panel py-4">
            <p className="text-zinc-200 text-data mb-1">
              Bienvenido — ya tenés acceso a la API + el MCP del mercado ganadero argentino.
            </p>
            <p className="text-zinc-500 text-xxs">
              Empezá acá: <span className="text-zinc-300">1)</span> generá tu primera key abajo ·{' '}
              <span className="text-zinc-300">2)</span> copiá el connector MCP (viene con tu key) ·{' '}
              <span className="text-zinc-300">3)</span> pegalo en Claude/Cursor o usá la API. Dudas: agro@memola.com.ar
            </p>
          </div>
        </div>
      )}

      {/* Plan + usage */}
      <div className="terminal-panel mb-6">
        <div className="terminal-panel-header flex items-center justify-between">
          <span>Plan + uso</span>
          <span className="text-zinc-500 text-xxs font-terminal normal-case tracking-normal">
            Período {period.start} → {period.end} · {period.daysRemaining}d restantes
          </span>
        </div>
        <div className="px-panel py-5">
          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-baseline gap-3">
              <span className="text-xxs font-terminal uppercase tracking-widest text-zinc-500">
                Plan
              </span>
              <span
                className="px-2 py-0.5 text-xxs font-terminal uppercase tracking-widest"
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  color: '#38bdf8',
                  borderRadius: '2px',
                }}
              >
                {plan}
              </span>
            </div>
            <div className="text-zinc-300 font-terminal tabular-nums text-data">
              {totalUsed.toLocaleString('en-US')}{' '}
              <span className="text-zinc-600">/</span>{' '}
              {limits.monthlyQuota.toLocaleString('en-US')} req
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-zinc-900 border border-terminal-border overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${usagePct}%`,
                background:
                  usagePct >= 90 ? '#f87171' : usagePct >= 70 ? '#fbbf24' : '#38bdf8',
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xxs font-terminal text-zinc-500">
            <span>{usagePct}% consumido</span>
            <span>Rate limit: {limits.rateLimitPerMin}/min</span>
          </div>
        </div>
      </div>

      {/* Upgrade nudge when usage > 80% */}
      {usagePct >= 80 && plan !== 'scale' && (
        <UpgradeNudge plan={plan} usagePct={usagePct} daysLeft={period.daysRemaining} />
      )}

      {/* Keys list + create */}
      <ApiKeysClient initialKeys={initialKeys} />

      {/* Help */}
      <div className="terminal-panel mt-6">
        <div className="terminal-panel-header">Cómo usar tu key</div>
        <div className="px-panel py-5 space-y-4 text-data">
          <div>
            <p className="text-zinc-300 mb-1">Header HTTP</p>
            <pre className="bg-zinc-950 border border-terminal-border px-3 py-2 text-zinc-300 text-xxs font-terminal overflow-x-auto">
              {`Authorization: Bearer cnsg_live_xxxxxxxxxxxxxxxx`}
            </pre>
          </div>
          <div>
            <p className="text-zinc-300 mb-1">Ejemplo (curl)</p>
            <pre className="bg-zinc-950 border border-terminal-border px-3 py-2 text-zinc-300 text-xxs font-terminal overflow-x-auto">
              {`curl https://www.consignatarias.com.ar/api/precios \\
  -H "Authorization: Bearer $CONSIGNATARIAS_API_KEY"`}
            </pre>
          </div>
          <div>
            <p className="text-zinc-300 mb-1">Ejemplo (Node.js)</p>
            <pre className="bg-zinc-950 border border-terminal-border px-3 py-2 text-zinc-300 text-xxs font-terminal overflow-x-auto">
              {`const res = await fetch('https://www.consignatarias.com.ar/api/precios', {
  headers: { Authorization: \`Bearer \${process.env.CONSIGNATARIAS_API_KEY}\` }
})
const { data } = await res.json()`}
            </pre>
          </div>
          <p className="text-zinc-500 text-xxs">
            Documentación completa en{' '}
            <Link href="/api-docs" className="text-zinc-300 underline-offset-2 hover:underline">
              /api-docs
            </Link>
            . Si superás el cupo mensual te avisamos por email al 80% — no
            cortamos el servicio sin aviso.
          </p>
        </div>
      </div>
    </div>
  )
}
