import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentSession } from '@/lib/user-tier'
import { requireServiceClient } from '@/lib/supabase'
import { CancelButton } from './CancelButton'
import { SignOutButton } from './SignOutButton'
import { UpgradeConfirmTracker } from '@/components/UpgradeConfirmTracker'
import { UpgradeActivating } from '@/components/UpgradeActivating'
import KarmaBadge from '@/components/KarmaBadge'
import ArranqueChecklist from './ArranqueChecklist'

export const metadata: Metadata = {
  title: 'Tu cuenta',
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
    .select('tier, status, current_period_end, upgraded_at, rebill_subscription_id, api_tier')
    .eq('user_id', user.id)
    .maybeSingle()

  // Claimed consignataria. Entity-PRO lives in the `subscriptions` table — NOT a
  // `consignatarias.subscription_tier` column (that column does not exist; selecting
  // it errored and silently nulled the whole consignataria card).
  const { data: consig } = await service
    .from('consignatarias')
    .select('canonical_slug, display_name')
    .eq('claimed_by_email', user.email)
    .maybeSingle()
  const hasConsignataria = !!consig
  let isConsigPro = false
  if (consig) {
    const { data: entitySub } = await service
      .from('subscriptions')
      .select('status')
      .eq('entity_type', 'consignataria')
      .eq('entity_slug', consig.canonical_slug)
      .in('status', ['active', 'past_due'])
      .maybeSingle()
    isConsigPro = !!entitySub
  }

  const apiTier = (sub?.api_tier as string | undefined) ?? 'none'
  const hasEnterprise = apiTier !== 'none'
  const isProUser = tier === 'pro'

  // Estado real del checklist de arranque (una query liviana por señal).
  const [{ data: ganado }, { data: newsletterRow }, { count: marksCount }] = await Promise.all([
    service.from('user_ganado').select('items, alerts_opt_in').eq('user_id', user.id).maybeSingle(),
    service.from('newsletter_subscribers').select('id, status').eq('email', (user.email ?? '').toLowerCase()).maybeSingle(),
    service.from('remate_marks').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])
  const ganadoItems = Array.isArray(ganado?.items) ? (ganado!.items as unknown[]) : []
  const checkHacienda = ganadoItems.length > 0
  const checkAlerta = ganado?.alerts_opt_in === true
  const checkNewsletter = newsletterRow?.status === 'active'
  const checkMarcas = (marksCount ?? 0) > 0
  const doneCount = [checkHacienda, checkAlerta, checkNewsletter, checkMarcas].filter(Boolean).length
  const isNewUser = doneCount === 0

  const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null
  const periodEndStr = periodEnd
    ? periodEnd.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div className="max-w-xl mx-auto px-4 py-12 text-sm">
      {/* Fire the GA4 pro_upgrade conversion only when the DB confirms PRO (tier),
          never on the bare ?upgraded=true redirect param. */}
      <UpgradeConfirmTracker
        confirmed={tier === 'pro'}
        plan="PRO_USER"
        price={7900}
        dedupeId={sub?.rebill_subscription_id ?? null}
      />
      {/* Webhook may lag the redirect: show "activando" + poll until the DB confirms PRO,
          and only show the "Ya sos PRO / pago confirmado" banner once tier is really pro. */}
      {justUpgraded && !isProUser && <UpgradeActivating />}
      {justUpgraded && isProUser && (
        <div className="mb-8 relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-zinc-900/40 p-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-1">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/40 shrink-0">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <p className="text-emerald-400 font-mono font-bold text-lg leading-tight">¡Listo! Ya sos PRO.</p>
                <p className="text-zinc-400 font-mono text-xs mt-0.5">
                  Pago confirmado · acceso activo · comprobante enviado a {user.email}
                </p>
              </div>
            </div>

            <p className="text-zinc-300 font-mono text-sm mb-3 mt-5">Lo que acabás de desbloquear:</p>
            <div className="grid sm:grid-cols-2 gap-2 mb-5">
              {[
                { href: '/mercado/vender-ahora', label: 'Calculadora ¿Vendo ahora?', sub: 'valor por cabeza + percentil de mercado' },
                { href: '/mercado/inmag', label: 'Histórico INMAG + descargas', sub: 'serie completa desde 2015, export CSV' },
                { href: '/frigorificos', label: 'Verificación SENASA expandida', sub: 'detalle de habilitación Ciclo I/II/III' },
              ].map((f) => (
                <Link
                  key={f.href}
                  href={f.href}
                  className="block rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-emerald-500/40 hover:bg-emerald-500/5 px-3 py-2.5 transition-colors group"
                >
                  <div className="text-zinc-200 font-mono text-xs font-medium group-hover:text-emerald-400 transition-colors">{f.label} →</div>
                  <div className="text-zinc-500 font-mono text-xxs mt-0.5">{f.sub}</div>
                </Link>
              ))}
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 text-zinc-950 font-mono font-bold uppercase tracking-widest text-xs px-5 py-2.5 rounded transition-colors"
            >
              Ir a tu dashboard →
            </Link>
            <p className="text-zinc-600 font-mono text-xxs mt-3">
              Se renueva automáticamente cada mes · cancelás cuando quieras (abajo).
            </p>
          </div>
        </div>
      )}

      <h1 className="text-zinc-100 text-2xl font-medium mb-2">
        {isNewUser ? 'Bienvenido a consignatarias.com' : 'Tu cuenta'}
      </h1>
      <p className="text-zinc-500 text-xs font-mono mb-6">{user.email}</p>

      {isNewUser && (
        <p className="text-zinc-400 text-sm leading-relaxed mb-6">
          Esta es la terminal del mercado ganadero argentino: el INMAG y los precios por categoría
          actualizados cada día hábil, el calendario de remates de todo el país y el directorio de
          consignatarias y frigoríficos — gratis. Así le sacás el jugo:
        </p>
      )}

      {/* Checklist de arranque — estado real + celebración + karma en vivo */}
      <ArranqueChecklist
        email={user.email ?? ''}
        initial={{
          hacienda: checkHacienda,
          alerta: checkAlerta,
          newsletter: checkNewsletter,
          marcas: checkMarcas,
        }}
      />

      {!justUpgraded && (
        <Link
          href="/dashboard"
          className="block mb-8 border border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 rounded-lg p-4 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-accent font-mono text-sm font-medium">
                Ir al dashboard →
              </div>
              <div className="text-zinc-500 text-xs font-mono mt-0.5">
                Tu workspace de datos, reportes y precios
              </div>
            </div>
            <span className="text-accent/40 group-hover:text-accent text-xl font-mono transition-colors">
              ↗
            </span>
          </div>
        </Link>
      )}

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
          <p className="text-zinc-300 font-mono text-sm">
            Cuenta gratuita, con acceso completo a remates, consignatarias, precios y
            datos del mercado.
          </p>
        )}
      </div>

      {hasConsignataria && (
        <Link
          href={`/consignatarias/${consig!.canonical_slug}`}
          className="block border border-zinc-800 hover:border-amber-500/40 bg-zinc-900/40 hover:bg-amber-500/5 rounded-lg p-5 mb-4 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xxs font-mono uppercase tracking-widest text-zinc-500">
              Consignataria · {isConsigPro ? 'PRO' : 'FREE'}
            </span>
            <span className="text-zinc-500 text-xs font-mono">→</span>
          </div>
          <p className="text-zinc-200 font-mono text-sm mb-1">
            {(consig as { display_name?: string }).display_name ?? consig!.canonical_slug}
          </p>
          <p className="text-zinc-500 font-mono text-xs">
            {isConsigPro
              ? 'Suscripción activa. Gestioná tu perfil destacado, remates y badge PRO.'
              : 'Activá PRO Consignataria para promo por email a +500 productores, badge dorado y analytics.'}
          </p>
        </Link>
      )}

      {(isProUser || hasEnterprise) && (
        <Link
          href="/cuenta/reportes"
          className="block border border-zinc-800 hover:border-sky-500/40 bg-zinc-900/40 hover:bg-sky-500/5 rounded-lg p-5 mb-4 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xxs font-mono uppercase tracking-widest text-zinc-500">
              Reportes
            </span>
            <span className="text-zinc-500 text-xs font-mono">→</span>
          </div>
          <p className="text-zinc-200 font-mono text-sm mb-1">Mis reportes</p>
          <p className="text-zinc-500 font-mono text-xs">
            El Corredor mensual, snapshot del Oráculo, archivo histórico INMAG.
            Descargás cuantas veces necesites.
          </p>
        </Link>
      )}

      {hasEnterprise && (
        <Link
          href="/cuenta/api-keys"
          className="block border border-zinc-800 hover:border-sky-500/40 bg-zinc-900/40 hover:bg-sky-500/5 rounded-lg p-5 mb-4 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xxs font-mono uppercase tracking-widest text-zinc-500">
              API · Enterprise {apiTier}
            </span>
            <span className="text-zinc-500 text-xs font-mono">→</span>
          </div>
          <p className="text-zinc-200 font-mono text-sm mb-1">API keys</p>
          <p className="text-zinc-500 font-mono text-xs">
            Generá y administrá tus keys para autenticar integraciones. Ver uso
            mensual y rotar/revocar acceso.
          </p>
        </Link>
      )}

      {/* Karma — al final y explicado; para el usuario nuevo es contexto, no portada */}
      <div className="mt-8 mb-6">
        <KarmaBadge />
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
