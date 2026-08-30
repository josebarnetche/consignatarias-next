import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getProducto } from '@/lib/productos-datos'
import { ComoSePaga } from '@/components/productos/ComoSePaga'
import { SelectorVariante } from '@/components/productos/SelectorVariante'
import { ListaDeEspera } from '@/components/productos/ListaDeEspera'
import { zonasValuables, armarInformeValuacion } from '@/lib/informes/valuacion'
import { MuestraGratis } from '@/components/productos/MuestraGratis'

const APP_URL = 'https://www.consignatarias.com.ar'
const P = getProducto('informe-valuacion-campo')!

export const metadata: Metadata = {
  title: 'Informe de valuación de campo — cuánto vale la hectárea en tu zona',
  description:
    'Cuánto se está pagando la hectárea donde está tu campo, por las dos vías que usa una tasación seria: renta y comparables. Con la banda real de operaciones y sobre cuántos casos se calculó.',
  keywords: P.keywords,
  openGraph: {
    title: 'Informe de valuación de campo',
    description:
      'El valor de la hectárea de tu zona, con la banda en la que se opera y su respaldo.',
    url: `${APP_URL}${P.landing}`,
    type: 'website',
  },
  alternates: { canonical: `${APP_URL}${P.landing}` },
}

export const revalidate = 3600

const FAQ = [
  {
    q: '¿Es una tasación?',
    a: 'No, y no reemplaza a un matriculado: nadie fue a ver tu campo. Es el contexto de mercado de tu zona — qué se paga alrededor, con qué dispersión y sobre cuántos casos. Sirve para sentarte a negociar sabiendo dónde estás parado. Un campo concreto puede valer bastante más o menos que la mediana de su zona según aguadas, alambrados, acceso y estado del pastizal.',
  },
  {
    q: '¿Por qué dos vías y no una?',
    a: 'Porque es como se tasa en serio. Por renta: un campo vale, a grandes rasgos, los años de arrendamiento que tarda en pagarse, y el canon ya viene ajustado por la calidad del campo — nadie paga en Chubut lo que paga en Pergamino. Por comparables: la mediana de operaciones y avisos relevados en la zona. Cuando las dos coinciden, el número es sólido; cuando se apartan, eso también es información y el informe lo explica.',
  },
  {
    q: '¿Qué es la banda p25-p75?',
    a: 'De cada cuatro operaciones relevadas, una se cerró por debajo del primer número y otra por encima del segundo. Es lo que hace negociable una cifra: si te ofrecen algo dentro de la banda, estás en mercado; si está afuera, hay algo que explicar — para bien o para mal.',
  },
  {
    q: 'Mi campo es agrícola. ¿Sirve?',
    a: 'Sí. En zona agrícola el arrendamiento no se pacta en kilos de novillo sino en quintales de soja por hectárea y por año, y el informe usa esa unidad. La mecánica es la misma; lo que cambia es con qué se paga la tierra.',
  },
  {
    q: '¿En qué se diferencia de la calculadora gratuita?',
    a: 'La calculadora te da el número. El informe agrega lo que la pantalla no puede: la dispersión de la zona con su muestra, las zonas comparables de al lado, los dos plazos de repago —por arrendamiento y por producción, que son preguntas distintas— y de dónde sale cada cifra. En PDF, para imprimir y llevar a la reunión.',
  },
]

export default function Page() {
  const zonas = zonasValuables()
  // Una zona real de muestra, calculada en build: mostrar el formato con datos verdaderos
  // dice más que describirlo.
  const muestra = armarInformeValuacion('corrientes', 'vista-previa@consignatarias.com.ar')

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
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
              },
              {
                '@type': 'FAQPage',
                mainEntity: FAQ.map((f) => ({
                  '@type': 'Question',
                  name: f.q,
                  acceptedAnswer: { '@type': 'Answer', text: f.a },
                })),
              },
            ],
          }),
        }}
      />

      <nav className="mb-6 text-xs text-slate-500">
        <Link href="/informes" className="hover:text-sky-400">Informes</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-400">Valuación de campo</span>
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
          ¿Lo que te ofrecen está dentro de lo que se paga?
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-300">
          Cuánto vale la hectárea en tu zona, calculado por las dos vías que usa una
          tasación seria, con la banda real en la que se opera y sobre cuántos casos.
        </p>
      </header>

      {muestra && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-100">Así se lee</h2>
          <p className="mt-2 text-sm text-slate-400">
            {muestra.zonaNombre}, con el dato de hoy:
          </p>

          <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/60 p-6">
            <p className="text-3xl font-semibold text-sky-300">
              USD {Math.round(muestra.v.usdHa).toLocaleString('es-AR')}
              <span className="ml-2 text-base font-normal text-slate-500">por hectárea</span>
            </p>

            {muestra.t.p25 && muestra.t.p75 && (
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                De cada cuatro operaciones relevadas, una se cerró por debajo de{' '}
                <strong className="text-slate-100">
                  USD {muestra.t.p25.toLocaleString('es-AR')}
                </strong>{' '}
                y otra por encima de{' '}
                <strong className="text-slate-100">
                  USD {muestra.t.p75.toLocaleString('es-AR')}
                </strong>
                , sobre {muestra.t.n} casos.
              </p>
            )}

            <div className="mt-5 grid gap-4 border-t border-slate-800 pt-5 sm:grid-cols-2">
              {muestra.v.porRenta && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Por renta</p>
                  <p className="mt-1 text-lg font-medium text-slate-100">
                    USD {Math.round(muestra.v.porRenta.usdHa).toLocaleString('es-AR')}
                  </p>
                </div>
              )}
              {muestra.v.porComparables && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Por comparables</p>
                  <p className="mt-1 text-lg font-medium text-slate-100">
                    USD {Math.round(muestra.v.porComparables.usdHa).toLocaleString('es-AR')}
                  </p>
                </div>
              )}
            </div>

            {muestra.aniosPorCanon && muestra.aniosPorProduccion && (
              <p className="mt-5 border-t border-slate-800 pt-4 text-sm leading-relaxed text-slate-400">
                Se paga sola en{' '}
                <strong className="text-slate-200">
                  {muestra.aniosPorCanon.toLocaleString('es-AR', { maximumFractionDigits: 1 })} años
                </strong>{' '}
                de arrendamiento, o{' '}
                <strong className="text-slate-200">
                  {muestra.aniosPorProduccion.toLocaleString('es-AR', { maximumFractionDigits: 1 })} años
                </strong>{' '}
                de producción del campo. Son dos preguntas distintas y se confunden seguido.
              </p>
            )}
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-100">Qué trae</h2>
        <ol className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
          {[
            'El valor de la hectárea de tu zona y la confianza que tiene ese número.',
            'La banda p25-p75: entre qué valores se está cerrando de verdad, y sobre cuántos casos.',
            'Las dos vías por separado —renta y comparables— y qué significa que se aparten.',
            'Los dos plazos de repago: años de arrendamiento y años de producción del campo.',
            'Las zonas comparables de al lado, para ver si conviene mirar más allá del alambrado.',
            'De dónde sale cada número, con la fuente y la muestra a la vista.',
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

      <section className="mt-10 rounded-lg border border-amber-900/50 bg-amber-950/20 p-5">
        <h2 className="text-base font-semibold text-amber-200">Lo que no es</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          No es una tasación y no reemplaza a un matriculado: nadie fue a ver tu campo. Es
          el contexto de mercado de tu zona. Un campo concreto puede valer bastante más o
          menos que la mediana según aguadas, alambrados, acceso y estado del pastizal.
        </p>
      </section>

      <div className="mt-12">
        <MuestraGratis />
      </div>

      <div className="mt-6">
        {P.publicado ? (
          <SelectorVariante
            slug={P.slug}
            nombre={P.nombre}
            precio={P.precio}
            modalidad={P.modalidad}
            opciones={zonas}
            etiqueta="Elegí tu zona"
          />
        ) : (
          <ListaDeEspera slug={P.slug} nombre={P.nombre} />
        )}
      </div>

      {P.publicado && (
        <ComoSePaga precio={`ARS ${P.precio.toLocaleString('es-AR')}`} modalidad={P.modalidad} />
      )}

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-100">Preguntas</h2>
        <dl className="mt-5 space-y-6">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="font-medium text-slate-200">{f.q}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12 border-t border-slate-800 pt-6">
        <h2 className="text-base font-semibold text-slate-200">Antes de comprar</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link href="/campos/valuar" className="text-sky-400 underline underline-offset-2">
              Probá la calculadora, gratis
            </Link>
            <span className="text-slate-500"> — el número, sin el contexto</span>
          </li>
          <li>
            <Link href="/campos/valor-hectarea" className="text-sky-400 underline underline-offset-2">
              El valor por zona
            </Link>
            <span className="text-slate-500"> — {zonas.length} zonas relevadas</span>
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
