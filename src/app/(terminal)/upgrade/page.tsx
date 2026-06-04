import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentSession } from '@/lib/user-tier'
import { UpgradeButton } from './UpgradeButton'

export const metadata: Metadata = {
  title: 'PRO',
  robots: { index: false, follow: false },
}

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-sm">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-sky-400/40 animate-ping" />
            <span className="relative rounded-full h-2 w-2 bg-sky-400" />
          </span>
          <span className="text-xs font-mono uppercase tracking-[0.22em] text-sky-400 font-semibold">
            PRO · acceso ilimitado
          </span>
        </div>
        <h1 className="text-zinc-100 text-3xl font-medium mb-3">
          ARS $7.900 / mes
        </h1>
        <p className="text-zinc-400 font-mono text-sm leading-relaxed max-w-xl mx-auto">
          Acceso ilimitado al observatorio del mercado bovino argentino. Cancelás cuando
          quieras, sin pre-aviso.
        </p>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-6 mb-8">
        <h2 className="text-zinc-200 text-sm font-medium mb-4 uppercase tracking-widest">
          Qué incluye
        </h2>
        <ul className="space-y-3 font-mono">
          <li className="flex items-start gap-3 text-zinc-300 text-sm leading-relaxed">
            <span className="text-sky-400 mt-0.5">→</span>
            <div>
              <strong className="text-zinc-100">Medios de pago de cada consignataria.</strong>{' '}
              Métodos aceptados, plazos típicos de cobro, observaciones.
            </div>
          </li>
          <li className="flex items-start gap-3 text-zinc-300 text-sm leading-relaxed">
            <span className="text-sky-400 mt-0.5">→</span>
            <div>
              <strong className="text-zinc-100">Filtros avanzados.</strong> Cruzar provincia,
              categoría, tipo, rango de fechas, en todas las listas.
            </div>
          </li>
          <li className="flex items-start gap-3 text-zinc-300 text-sm leading-relaxed">
            <span className="text-sky-400 mt-0.5">→</span>
            <div>
              <strong className="text-zinc-100">Detalle completo</strong> en perfiles de
              consignatarias, frigoríficos y remates. Datos de contacto, histórico operativo,
              eventos.
            </div>
          </li>
          <li className="flex items-start gap-3 text-zinc-300 text-sm leading-relaxed">
            <span className="text-sky-400 mt-0.5">→</span>
            <div>
              <strong className="text-zinc-100">Descargas premium.</strong> El Corredor mensual,
              snapshot del Oráculo, próximos productos de la mesa.
            </div>
          </li>
          <li className="flex items-start gap-3 text-zinc-300 text-sm leading-relaxed">
            <span className="text-sky-400 mt-0.5">→</span>
            <div>
              <strong className="text-zinc-100">Archivo histórico</strong> del INMAG diario,
              comparable interanual y series derivadas.
            </div>
          </li>
        </ul>
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
