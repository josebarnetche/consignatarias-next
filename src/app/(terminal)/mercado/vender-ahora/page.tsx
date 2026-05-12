import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentSession } from '@/lib/user-tier'
import { SectionBreadcrumbSchema } from '@/components/seo/JsonLd'
import VenderAhoraClient from './VenderAhoraClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '¿Vendo ahora? — Calculadora PRO | Consignatarias.com.ar',
  description:
    'Ingresá tu categoría y peso vivo. Te decimos cuánto vale tu cabeza hoy en ARS + USD, percentil 30 y 365 días, y si estadísticamente es momento de vender o aguantar.',
  robots: { index: false, follow: false },
}

export default async function VenderAhoraPage() {
  const { user, tier } = await getCurrentSession()
  if (!user) {
    redirect('/login?next=/mercado/vender-ahora')
  }
  if (tier !== 'pro') {
    redirect('/upgrade?next=/mercado/vender-ahora')
  }

  return (
    <>
      <SectionBreadcrumbSchema
        section="mercado/vender-ahora"
        sectionName="¿Vendo ahora?"
      />
      <div className="px-4 py-6 max-w-4xl mx-auto">
        <div className="mb-2 text-xxs font-terminal uppercase tracking-wider text-zinc-500">
          <Link href="/mercado" className="hover:text-zinc-300">
            Mercado
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">¿Vendo ahora?</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-heading text-zinc-100 mb-1 leading-tight">
          ¿Vendo ahora?
        </h1>
        <p className="text-zinc-400 text-sm mb-6 max-w-2xl">
          Calculadora estadística sobre el INMAG histórico. Te decimos cuánto
          vale tu cabeza hoy, dónde está el precio en el rango del último mes y
          del último año, y la lectura del mercado.
        </p>

        <VenderAhoraClient />

        <p className="text-zinc-500 text-xxs text-center mt-8">
          <Link href="/mercado" className="hover:text-zinc-300 underline-offset-2 hover:underline">
            ← Volver a precios
          </Link>
          {' · '}
          <Link
            href="/mercado/inmag-dolares"
            className="hover:text-zinc-300 underline-offset-2 hover:underline"
          >
            Ver serie en dólares
          </Link>
        </p>
      </div>
    </>
  )
}
