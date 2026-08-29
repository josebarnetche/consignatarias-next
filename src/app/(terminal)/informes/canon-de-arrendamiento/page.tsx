import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getProducto } from '@/lib/productos-datos'
import { ComoSePaga } from '@/components/productos/ComoSePaga'
import { ComprarInforme } from '@/components/productos/ComprarInforme'
import tierra from '@/lib/data/tierra-por-kilo.json'

const APP_URL = 'https://www.consignatarias.com.ar'
const P = getProducto('informe-canon-arrendamiento')!

export const metadata: Metadata = {
  title: 'Informe de canon de arrendamiento por zona — cuántos kilos paga tu campo',
  description:
    'Cuántos kilos de novillo por hectárea y por mes se está pagando de arrendamiento en tu zona, con la muestra relevada, el valor de la hectárea y la serie de precios para pasarlo a pesos. Informe en PDF.',
  keywords: P.keywords,
  openGraph: {
    title: 'Informe de canon de arrendamiento por zona',
    description:
      'Cuántos kilos de novillo por hectárea paga tu zona, con muestra relevada y fuente declarada.',
    url: `${APP_URL}${P.landing}`,
    type: 'website',
  },
  alternates: { canonical: `${APP_URL}${P.landing}` },
}

export const revalidate = false

interface Zona {
  provincia: string
  zona: string | null
  n: number
  usd_ha: number
  kg_ha_mes_canon: number | null
  aptitud: string | null
}

const ZONAS = (tierra as Zona[]).filter((z) => z.kg_ha_mes_canon)
const MUESTRA = ZONAS.sort((a, b) => b.n - a.n).slice(0, 6)

const FAQ = [
  {
    q: '¿De dónde sale el número del canon?',
    a: 'De un relevamiento propio de avisos de arrendamiento y operaciones publicadas, zona por zona. Cada zona informa su cantidad de casos relevados (la "n"), así que se ve de entrada si el número descansa en 45 observaciones o en 3. Donde la muestra es chica, lo decimos en el informe en vez de disimularlo.',
  },
  {
    q: '¿Por qué el canon se mide en kilos de novillo y no en pesos?',
    a: 'Porque es como se pacta en el campo. El contrato fija una cantidad de kilos por hectárea y por mes, y el pago se liquida convirtiendo esos kilos al precio del novillo del momento. Así el canon acompaña la inflación sin renegociar el contrato. El informe trae la serie de precios para hacer esa conversión el día que liquidás.',
  },
  {
    q: '¿Sirve para un campo agrícola?',
    a: 'No. El canon ganadero se paga en kilos de novillo y el agrícola en quintales de soja: son dos mercados distintos y no se convierten uno en otro. El informe cubre campos con aptitud ganadera y mixta, y lo aclara en cada zona.',
  },
  {
    q: '¿Es una tasación?',
    a: 'No. Una tasación la firma un matriculado y mira tu campo. Esto es el contexto de mercado de tu zona: qué se está pagando alrededor, con qué dispersión y sobre cuántos casos. Sirve para sentarte a negociar sabiendo dónde estás parado, no para presentar ante un tercero.',
  },
  {
    q: '¿Cuánto tarda en llegar?',
    a: 'Se descarga apenas se acredita el pago, y además te llega por mail. Si el mail no aparece, entrás con el mismo correo con el que compraste y está en tu cuenta.',
  },
]

export default function Page() {
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
                  availability: 'https://schema.org/InStock',
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
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: 'Informes', item: `${APP_URL}/informes` },
                  { '@type': 'ListItem', position: 2, name: P.nombre, item: `${APP_URL}${P.landing}` },
                ],
              },
            ],
          }),
        }}
      />

      <nav className="mb-6 text-xs text-slate-500">
        <Link href="/informes" className="hover:text-sky-400">Informes</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-400">Canon de arrendamiento</span>
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
          ¿El canon que te proponen está bien?
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-300">
          El informe te dice cuántos kilos de novillo por hectárea y por mes se está pagando
          en tu zona, sobre cuántos casos relevados, y con qué dispersión entre el que menos
          paga y el que más.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-100">Lo que vas a ver, con datos reales</h2>
        <p className="mt-2 text-sm text-slate-400">
          Ésta es una parte del relevamiento, tal como está hoy. El informe trae tu zona en
          detalle y las limítrofes para comparar.
        </p>

        <div className="mt-5 overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Zona</th>
                <th className="px-4 py-3 font-medium">Canon</th>
                <th className="px-4 py-3 font-medium">Hectárea</th>
                <th className="px-4 py-3 font-medium">Casos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {MUESTRA.map((z) => (
                <tr key={`${z.provincia}-${z.zona ?? ''}`}>
                  <td className="px-4 py-3 text-slate-200">
                    {z.provincia}
                    {z.zona ? <span className="text-slate-500"> · {z.zona}</span> : null}
                  </td>
                  <td className="px-4 py-3 font-medium text-sky-300">{z.kg_ha_mes_canon} kg/ha/mes</td>
                  <td className="px-4 py-3 text-slate-400">USD {z.usd_ha.toLocaleString('es-AR')}</td>
                  <td className="px-4 py-3 text-slate-500">n={z.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Relevamiento propio, agosto de 2026. {ZONAS.length} zonas con canon relevado sobre{' '}
          {(tierra as Zona[]).length} zonas cubiertas.{' '}
          <Link href="/mercado/arrendamiento" className="text-sky-400 underline underline-offset-2">
            Ver la tabla completa, gratis
          </Link>
          .
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-100">Qué trae el informe</h2>
        <ol className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
          {[
            'El canon de tu zona en kilos por hectárea y por mes, con la muestra sobre la que se calculó.',
            'La dispersión: qué paga el cuartil de abajo y qué paga el de arriba, para saber si lo que te ofrecen está adentro o afuera de la banda.',
            'Las zonas limítrofes, para ver si conviene mirar más allá del alambrado.',
            'El valor de la hectárea de la zona en dólares, con su cuartil inferior y superior.',
            'Cuántos kilos por hectárea y por año produce la zona, que es contra lo que se mide si el canon es razonable.',
            'Los años de arrendamiento que hacen falta para recuperar el valor de la tierra.',
            'La serie del novillo para convertir los kilos a pesos el día que liquidás, con el número del mes en curso.',
          ].map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 shrink-0 font-mono text-xs text-slate-600">{String(i + 1).padStart(2, '0')}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 rounded-lg border border-amber-900/50 bg-amber-950/20 p-5">
        <h2 className="text-base font-semibold text-amber-200">Lo que el informe no es</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          No es una tasación ni un asesoramiento legal, y no reemplaza a un matriculado. Es
          el contexto de mercado de tu zona, con la fuente y la cantidad de casos a la
          vista, para que negocies sabiendo qué se está pagando alrededor. Donde la muestra
          es chica, el informe lo dice.
        </p>
      </section>

      <div className="mt-12">
        <ComprarInforme slug={P.slug} nombre={P.nombre} precio={P.precio} />
      </div>

      <ComoSePaga precio={`ARS ${P.precio.toLocaleString('es-AR')}`} modalidad={P.modalidad} />

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
        <h2 className="text-base font-semibold text-slate-200">Para entender el tema antes de comprar</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link href="/como-se-calcula-el-canon-de-arrendamiento" className="text-sky-400 underline underline-offset-2">
              Cómo se calcula el canon de arrendamiento
            </Link>
            <span className="text-slate-500"> — la cuenta, paso a paso y gratis</span>
          </li>
          <li>
            <Link href="/mercado/arrendamiento" className="text-sky-400 underline underline-offset-2">
              El canon por zona
            </Link>
            <span className="text-slate-500"> — la tabla abierta</span>
          </li>
          <li>
            <Link href="/impuesto-de-sellos-arrendamiento" className="text-sky-400 underline underline-offset-2">
              Impuesto de sellos en el contrato
            </Link>
            <span className="text-slate-500"> — lo que se paga además del canon</span>
          </li>
          <li>
            <Link href="/metodologia" className="text-sky-400 underline underline-offset-2">
              Cómo medimos
            </Link>
            <span className="text-slate-500"> — de dónde sale cada número</span>
          </li>
        </ul>
      </section>
    </div>
  )
}
