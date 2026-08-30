import type { Metadata } from 'next'
import Link from 'next/link'
import { FUNCIONES_PREMIUM, PRO_ABIERTO } from '@/lib/plan-pro'
import { SuscribirPro } from './SuscribirPro'

const APP_URL = 'https://www.consignatarias.com.ar'

export const metadata: Metadata = {
  title: 'PRO — las series completas, exportar y todas las alertas',
  description:
    'Once años de INMAG y de la relación maíz/novillo, exportación en CSV y alertas sin límite. El precio del día, los remates y las guías siguen siendo gratis para todos.',
  keywords: [
    'serie histórica precio del novillo',
    'exportar precios ganaderos csv',
    'alertas de precio hacienda',
    'datos históricos mercado ganadero argentina',
  ],
  openGraph: {
    title: 'PRO — las series completas, exportar y todas las alertas',
    description: 'Para cualquiera: productor, contador, corredor o frigorífico.',
    url: `${APP_URL}/pro`,
    type: 'website',
  },
  alternates: { canonical: `${APP_URL}/pro` },
}

export const revalidate = false

/**
 * La página de PRO abierto.
 *
 * Antes esta ruta redirigía a `/planes` porque PRO Usuario se había retirado. Vuelve como
 * plan que **cualquiera** puede contratar —productor, contador, corredor, veterinario,
 * frigorífico— sobre tres funciones puntuales.
 *
 * El copy dice tan fuerte lo que sigue gratis como lo que se cobra. Es deliberado: quien
 * llega acá desde un muro necesita saber que no le cerraron el sitio, o se va.
 */
export default function ProPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'PRO — Consignatarias.com.ar',
            description: PRO_ABIERTO.tagline,
            url: `${APP_URL}/pro`,
            brand: { '@type': 'Brand', name: 'Consignatarias.com.ar' },
            offers: {
              '@type': 'Offer',
              price: PRO_ABIERTO.precio,
              priceCurrency: 'ARS',
              availability: 'https://schema.org/InStock',
              url: `${APP_URL}/pro`,
              seller: { '@type': 'Organization', name: 'Memola Medios S.A.S.' },
            },
          }),
        }}
      />

      <header>
        <p className="text-xs uppercase tracking-widest text-sky-500">PRO</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-100 sm:text-4xl">
          {PRO_ABIERTO.tagline}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-400">
          No hace falta ser consignataria. Lo puede contratar cualquiera: un productor, un
          contador, un corredor, un veterinario de zona o un frigorífico.
        </p>
      </header>

      <section className="mt-10 space-y-4">
        {FUNCIONES_PREMIUM.map((f) => (
          <div key={f.clave} className="rounded-lg border border-slate-800 bg-slate-950/60 p-5">
            <h2 className="font-semibold text-slate-100">{f.nombre}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{f.beneficio}</p>
            <p className="mt-3 border-l-2 border-slate-800 pl-3 text-xs leading-relaxed text-slate-500">
              Sin PRO: {f.gratis}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-10 rounded-lg border border-emerald-900/50 bg-emerald-950/15 p-6">
        <h2 className="text-lg font-semibold text-emerald-200">Lo que sigue siendo gratis</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Y va a seguir siéndolo: <strong className="text-slate-100">el precio del día</strong>,
          los precios de cada firma, el calendario de remates y su suscripción, las 52
          guías, el comparador, la calculadora de arrendamiento, la valuación de campo y
          las 455 fichas de productividad por partido.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Ese dato es público y citable a propósito: es la razón por la que los asistentes
          nos citan y por la que la gente llega. PRO no lo cierra — agrega la profundidad
          arriba.
        </p>
      </section>

      <div className="mt-10">
        <SuscribirPro />
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-100">Preguntas</h2>
        <dl className="mt-5 space-y-6">
          {[
            {
              q: '¿Esto no era gratis?',
              a: 'Y lo sigue siendo casi todo. Lo que pasa a PRO son tres cosas: las series completas más allá de los últimos doce meses, poder bajarlas en CSV, y tener más de una alerta. El número del día, los remates, las guías y las calculadoras no se tocan.',
            },
            {
              q: '¿Es lo mismo que PRO Consignataria?',
              a: 'No. Aquél cuesta ARS 45.000 por mes, va sobre una firma con perfil reclamado y da leads, listado destacado y alcance por email. Éste es personal, va sobre tu cuenta y es para los datos. Se pueden tener los dos o ninguno.',
            },
            {
              q: '¿Se cancela fácil?',
              a: 'Desde tu cuenta, sin llamar a nadie. Y si cancelás, lo seguís teniendo hasta que termine el mes que ya pagaste.',
            },
            {
              q: '¿Hay factura?',
              a: 'Sí, factura A a nombre de tu empresa si cargás razón social y CUIT en la compra. La emite Memola Medios S.A.S., que opera el sitio.',
            },
          ].map((f) => (
            <div key={f.q}>
              <dt className="font-medium text-slate-200">{f.q}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12 border-t border-slate-800 pt-6">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <li>
            <Link href="/planes" className="text-sky-400 underline underline-offset-2">
              Los planes para empresas
            </Link>
          </li>
          <li>
            <Link href="/informes" className="text-sky-400 underline underline-offset-2">
              Informes de compra única
            </Link>
          </li>
          <li>
            <Link href="/metodologia" className="text-sky-400 underline underline-offset-2">
              Cómo medimos
            </Link>
          </li>
        </ul>
      </section>
    </div>
  )
}
