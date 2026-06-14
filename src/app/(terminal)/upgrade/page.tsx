import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentSession } from '@/lib/user-tier'
import marketPrices from '@/lib/data/market-prices.json'
import { PRO_TOOLS } from '@/components/showcase/proTools'
import { UpgradeButton } from './UpgradeButton'

export const metadata: Metadata = {
  title: 'PRO',
  robots: { index: false, follow: false },
}

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })

interface PageProps {
  searchParams: Promise<{ next?: string }>
}

export default async function UpgradePage({ searchParams }: PageProps) {
  const sp = await searchParams
  const next = sp.next || '/cuenta'

  const { user, tier } = await getCurrentSession()

  // Si ya es PRO, redirigir a destino o /cuenta
  if (tier === 'pro') {
    redirect(next)
  }

  // NO login wall: anónimos ven la página y pagan email-first (la cuenta se crea
  // server-side). El muro de login acá era el cuello de conversión confirmado ($0 histórico).
  const loggedIn = !!user

  // Ancla de ROI en vivo (regla #1: precio real, no hardcodeado). Un camión jaula
  // típico = 30 novillos × 430 kg al precio INMAG novillo de hoy.
  const cats = marketPrices.categories as Record<string, { current: number }>
  const novilloKg = cats.novillos?.current ?? marketPrices.inmag.current
  const valorCabeza = novilloKg * 430
  const valorCamion = valorCabeza * 30
  const proPctDeUnaCabeza = (7900 / valorCabeza) * 100

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-sky-400/40 animate-ping" />
            <span className="relative rounded-full h-2 w-2 bg-sky-400" />
          </span>
          <span className="text-xs font-mono uppercase tracking-[0.22em] text-sky-400 font-semibold">
            PRO Usuario
          </span>
        </div>
        <h1 className="text-zinc-100 text-3xl md:text-4xl font-medium mb-3 leading-tight">
          Sabé cuánto vale tu camión y a quién mandárselo — antes de cargar.
        </h1>
        <p className="text-zinc-400 font-mono text-sm leading-relaxed max-w-xl mx-auto">
          El observatorio que convierte el INMAG en una decisión de venta: si conviene vender o
          aguantar, cuánto te queda neto y a quién le conviene venderle.
        </p>
      </div>

      {/* Ancla de ROI — la plata real vs el costo de PRO (números en vivo). */}
      <div className="bg-sky-500/[0.04] border border-sky-500/30 rounded-lg p-5 mb-8 text-center">
        <p className="text-zinc-300 font-mono text-sm leading-relaxed">
          Un camión de novillos hoy mueve <strong className="text-zinc-100">≈ ${fmt(valorCamion)}</strong>.
        </p>
        <p className="text-zinc-300 font-mono text-sm leading-relaxed mt-1">
          PRO cuesta <strong className="text-sky-400">$7.900/mes</strong> ={' '}
          <strong className="text-zinc-100">{proPctDeUnaCabeza.toFixed(1)}% de UNA cabeza</strong>.
        </p>
        <p className="text-zinc-500 font-mono text-xxs mt-2">
          Mejorás tu venta un 0,01% y ya se pagó. Menos que el flete de un animal.
        </p>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-6 mb-6">
        <h2 className="text-zinc-200 text-sm font-medium mb-4 uppercase tracking-widest">
          Cinco decisiones, no cinco planillas
        </h2>
        <ul className="space-y-3 font-mono">
          {PRO_TOOLS.map((t) => (
            <li key={t.id} className="flex items-start gap-3 text-zinc-300 text-sm leading-relaxed">
              <span className="text-sky-400 mt-0.5">→</span>
              <div>
                <strong className="text-zinc-100">{t.title}.</strong> {t.hook}
              </div>
            </li>
          ))}
        </ul>
        <p className="text-zinc-600 font-mono text-xxs mt-4 pt-4 border-t border-zinc-800">
          Cada herramienta te da el dato gratis; PRO te da la lectura. Más filtros avanzados,
          detalle completo de perfiles y descargas El Corredor + El Oráculo.
        </p>
      </div>

      {/* Gancho de probada — dejá que pruebe el valor antes del muro. */}
      <Link
        href="/mercado/vender-ahora"
        className="block bg-emerald-500/[0.05] border border-emerald-500/30 rounded-lg p-4 mb-8 text-center hover:bg-emerald-500/[0.08] transition-colors"
      >
        <span className="text-emerald-400 font-mono text-sm font-medium">
          🎁 Probá un veredicto completo gratis esta semana →
        </span>
        <span className="block text-zinc-500 font-mono text-xxs mt-1">
          Una categoría, sin tarjeta. Sentí lo que hace PRO antes de pagar.
        </span>
      </Link>

      <div className="text-center mb-6">
        <span className="text-zinc-100 text-2xl font-medium">ARS $7.900</span>
        <span className="text-zinc-500 font-mono text-sm"> / mes</span>
      </div>

      <UpgradeButton loggedIn={loggedIn} />

      <p className="text-zinc-600 font-mono text-xxs text-center mt-6 leading-relaxed">
        Pago procesado por Rebill (Visa, Mastercard, débito). Cancelación inmediata desde
        tu cuenta. Sin permanencia, sin letra chica.
      </p>

      <p className="text-zinc-600 font-mono text-xxs text-center mt-3">
        ¿Algo no anda?{' '}
        <Link href="/cuenta" className="text-zinc-500 hover:text-zinc-300 underline-offset-2 hover:underline">
          Ir a tu cuenta
        </Link>{' '}
        o escribinos a{' '}
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
