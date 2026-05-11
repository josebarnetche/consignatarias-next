import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentSession } from '@/lib/user-tier'
import { requireServiceClient } from '@/lib/supabase'
import { CancelButton } from './CancelButton'
import { SignOutButton } from './SignOutButton'

export const metadata: Metadata = {
  title: 'Tu cuenta — consignatarias.com.ar',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<{ upgraded?: string }>
}

export default async function CuentaPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const justUpgraded = sp.upgraded === 'true'

  const { user, tier } = await getCurrentSession()
  if (!user) {
    redirect('/login?next=/cuenta')
  }

  // Fetch full subscription record server-side via service client
  const service = requireServiceClient()
  const { data: sub } = await service
    .from('user_subscriptions')
    .select('tier, status, current_period_end, upgraded_at, rebill_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null
  const periodEndStr = periodEnd
    ? periodEnd.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div className="max-w-xl mx-auto px-4 py-12 text-sm">
      {justUpgraded && (
        <div className="mb-8 border border-emerald-500/30 bg-emerald-500/5 rounded p-4">
          <p className="text-emerald-400 font-mono font-medium text-sm mb-1">
            Listo. Sos PRO.
          </p>
          <p className="text-zinc-400 font-mono text-xs">
            La suscripción se renueva automáticamente cada mes. Podés cancelarla acá abajo
            cuando quieras.
          </p>
        </div>
      )}

      <h1 className="text-zinc-100 text-2xl font-medium mb-2">Tu cuenta</h1>
      <p className="text-zinc-500 text-xs font-mono mb-8">{user.email}</p>

      <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-5 mb-6">
        <div className="flex items-baseline justify-between mb-4">
          <span className="text-xxs font-mono uppercase tracking-widest text-zinc-500">
            Plan
          </span>
          {tier === 'pro' ? (
            <span className="text-xxs font-mono uppercase tracking-widest text-sky-400 border border-sky-500/30 bg-sky-500/5 rounded px-2 py-0.5">
              PRO
            </span>
          ) : (
            <span className="text-xxs font-mono uppercase tracking-widest text-zinc-500 border border-zinc-700 rounded px-2 py-0.5">
              FREE
            </span>
          )}
        </div>

        {tier === 'pro' ? (
          <>
            <p className="text-zinc-300 font-mono text-sm mb-1">
              Acceso ilimitado al observatorio del mercado bovino argentino.
            </p>
            <p className="text-zinc-500 font-mono text-xs mb-4">
              Próxima renovación: <strong className="text-zinc-300">{periodEndStr}</strong>{' '}
              · ARS $7.900/mes.
            </p>
            {sub?.rebill_subscription_id && sub.status === 'active' && (
              <CancelButton subscriptionId={sub.rebill_subscription_id} />
            )}
            {sub?.status === 'cancelled' && (
              <p className="text-zinc-500 font-mono text-xs italic">
                Suscripción cancelada. Acceso PRO hasta {periodEndStr}.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-zinc-300 font-mono text-sm mb-1">
              Cuenta gratuita, acceso al detalle completo de remates, consignatarias y
              datos del mercado.
            </p>
            <p className="text-zinc-500 font-mono text-xs mb-4">
              Sumate a PRO para medios de pago, filtros avanzados, descargas premium y
              archivo histórico.
            </p>
            <Link
              href="/upgrade"
              className="inline-flex items-center gap-2 bg-sky-400 hover:bg-sky-300 active:bg-sky-500 text-zinc-950 font-mono font-bold uppercase tracking-widest text-xs px-4 py-2 rounded transition-colors"
            >
              Activar PRO · ARS $7.900/mes →
            </Link>
          </>
        )}
      </div>

      <div className="border-t border-zinc-800 pt-6">
        <SignOutButton />
      </div>

      <p className="text-zinc-600 font-mono text-xxs text-center mt-8">
        ¿Necesitás ayuda? Escribinos a{' '}
        <a
          href="mailto:agro@memola.com.ar"
          className="text-zinc-500 hover:text-zinc-300 underline-offset-2 hover:underline"
        >
          agro@memola.com.ar
        </a>
        .
      </p>
    </div>
  )
}
