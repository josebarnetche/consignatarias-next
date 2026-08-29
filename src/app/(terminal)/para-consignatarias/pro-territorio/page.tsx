import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getProducto, rangoPrecio } from '@/lib/productos-datos'
import { ListaDeEspera } from '@/components/productos/ListaDeEspera'

const APP_URL = 'https://www.consignatarias.com.ar'
const P = getProducto('pro-territorio')!

export const metadata: Metadata = {
  title: 'PRO Territorio — dónde tu casa no tiene un solo remitente',
  description:
    'El mapa de los partidos donde tu consignataria no opera, sobre productores que ya demostraron que mandan hacienda al Mercado Agroganadero. Para saber a qué zona mandar al comercial.',
  keywords: P.keywords,
  openGraph: {
    title: 'PRO Territorio — el mapa de tu cartera por partido',
    description:
      'Dónde tenés remitentes, dónde no, y cuántos productores de ese partido ya operan en Cañuelas con otra firma.',
    url: `${APP_URL}${P.landing}`,
    type: 'website',
  },
  alternates: { canonical: `${APP_URL}${P.landing}` },
}

export const revalidate = false

/**
 * Números verificados por SQL el 29-ago-2026 sobre `mag_consignataria_sales_lots`,
 * ventana 19-may a 25-ago-2026 (99 días), provincia BUE. Se dejan como constantes con
 * su fecha en vez de calcularse en build: es una página de venta, no un tablero, y un
 * número que se mueve solo obliga a revisar el copy que lo rodea.
 */
const MEDIDO = {
  partidos: 117,
  remitentes: 2261,
  casas: 22,
  lotes: 11816,
  ventana: '19 de mayo al 25 de agosto de 2026',
}

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: P.nombre,
            description: P.tagline,
            url: `${APP_URL}${P.landing}`,
            brand: { '@type': 'Brand', name: 'Consignatarias.com.ar' },
            offers: {
              '@type': 'Offer',
              price: P.precio,
              priceCurrency: 'ARS',
              availability: P.publicado
                ? 'https://schema.org/InStock'
                : 'https://schema.org/PreOrder',
              url: `${APP_URL}${P.landing}`,
              seller: { '@type': 'Organization', name: 'Memola Medios S.A.S.' },
            },
          }),
        }}
      />

      <nav className="mb-6 text-xs text-slate-500">
        <Link href="/para-consignatarias" className="hover:text-sky-400">Para consignatarias</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-400">PRO Territorio</span>
      </nav>

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <Image
          src={P.ilustracion}
          alt={P.ilustracionAlt}
          width={1200}
          height={500}
          className="h-48 w-full object-cover sm:h-64"
          priority
        />
      </div>

      <header className="mt-8">
        <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">
          ¿A qué partido mandás al comercial el mes que viene?
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-300">
          Tu sistema tiene a los que ya son clientes: te dice dónde <em>estás</em>. Éste
          te dice dónde <strong className="text-slate-100">no estás</strong>, sobre
          productores que ya demostraron que mandan hacienda a Cañuelas.
        </p>
      </header>

      <section className="mt-10 rounded-lg border border-slate-800 bg-slate-950/60 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Por qué esto importa acá</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          El <strong className="text-slate-100">97,7 %</strong> de los remitentes opera
          con una sola casa. La cartera no se erosiona: se corta. Un productor que no es
          tuyo es de otro, entero — y al revés.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Un caso real de la base: una de las casas más grandes del mercado opera en 80
          partidos y tiene <strong className="text-slate-200">un solo remitente en
          Rauch, de los 63</strong> que mandan hacienda al MAG desde ahí. Es un partido
          de 1.685 establecimientos y 455.760 cabezas, con 12 casas operando.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-100">Qué vas a ver</h2>
        <ol className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
          {[
            'Los partidos donde tenés al menos un remitente, y cuántos.',
            'Los partidos donde no tenés ninguno y sí hay productores mandando al MAG con otras firmas.',
            'Cuánto rodeo hay en cada uno de esos partidos y de qué escala son los establecimientos, con el dato oficial de stock.',
            'Tu participación por partido: de los productores que van al mercado desde ahí, cuántos son tuyos.',
            'El movimiento: qué partidos ganaron y perdieron hacienda en los últimos años, para no prospectar sobre una zona que se está vaciando.',
          ].map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 shrink-0 font-mono text-xs text-slate-600">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-4">
        {[
          { n: MEDIDO.partidos.toString(), l: 'partidos con actividad' },
          { n: MEDIDO.remitentes.toLocaleString('es-AR'), l: 'remitentes distintos' },
          { n: MEDIDO.casas.toString(), l: 'casas medidas' },
          { n: MEDIDO.lotes.toLocaleString('es-AR'), l: 'lotes analizados' },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-center">
            <p className="text-xl font-semibold text-slate-100">{s.n}</p>
            <p className="mt-1 text-xs leading-snug text-slate-500">{s.l}</p>
          </div>
        ))}
      </section>
      <p className="mt-3 text-xs text-slate-500">
        Buenos Aires, {MEDIDO.ventana}. El cruce entre el origen declarado de cada lote y
        el padrón oficial de partidos resuelve el 99,99 % de los casos.
      </p>

      <section className="mt-10 rounded-lg border border-amber-900/50 bg-amber-950/20 p-5">
        <h2 className="text-base font-semibold text-amber-200">Lo que no vas a ver</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
          <li>
            · <strong className="text-slate-200">Nombres de productores de otras
            casas.</strong> Los conteos son agregados por partido. Quién le consigna a
            quién es información de ellos, no nuestra para vender.
          </li>
          <li>
            · <strong className="text-slate-200">Territorio fuera de Buenos
            Aires,</strong> por ahora. El origen de los lotes se resuelve a partido con
            precisión sólo en la provincia; en el resto la cobertura es despareja y
            preferimos decirlo.
          </li>
          <li>
            · <strong className="text-slate-200">Precio de ternero.</strong> El Mercado
            Agroganadero es mercado de gordo: no hay una sola línea de ternero en toda la
            base. Si tu negocio es cría, este producto no te habla del precio.
          </li>
        </ul>
      </section>

      <section className="mt-10 flex flex-wrap items-baseline justify-between gap-3 border-y border-slate-800 py-5">
        <div>
          <p className="text-sm text-slate-400">Suscripción mensual, sin contrato</p>
          <p className="text-xs text-slate-500">
            Se cancela cuando quieras, desde tu panel.
          </p>
        </div>
        <p className="text-lg font-semibold text-slate-100">
          {rangoPrecio(P)}{' '}
          <span className="text-sm font-normal text-slate-500">ARS por mes</span>
        </p>
      </section>

      <div className="mt-8">
        <ListaDeEspera slug={P.slug} nombre={P.nombre} />
      </div>

      <section className="mt-12 border-t border-slate-800 pt-6">
        <h2 className="text-base font-semibold text-slate-200">Mientras tanto</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link href="/para-consignatarias" className="text-sky-400 underline underline-offset-2">
              Qué hacemos por una consignataria
            </Link>
          </li>
          <li>
            <Link href="/mercado/pulso" className="text-sky-400 underline underline-offset-2">
              El pulso del mercado
            </Link>
            <span className="text-slate-500"> — Cañuelas por firma, gratis</span>
          </li>
          <li>
            <Link href="/planes" className="text-sky-400 underline underline-offset-2">
              Los planes
            </Link>
          </li>
        </ul>
      </section>
    </div>
  )
}
