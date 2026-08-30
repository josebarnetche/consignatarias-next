import type { Metadata } from 'next'
import Link from 'next/link'
import { armarParteSemanal } from '@/lib/informes/semanal'
import maizNovillo from '@/lib/data/maiz-novillo-historico.json'

const APP_URL = 'https://www.consignatarias.com.ar'

const MN = maizNovillo as {
  serie: { mes: string; ratio: number }[]
  umbral_referencia: number
  fuentes: string
  metrica: string
}

export const metadata: Metadata = {
  title: 'Relación maíz / novillo: qué es y cómo se lee',
  description:
    'Cuántos kilos de maíz compra un kilo de novillo. El número que decide si conviene engordar o vender, con once años de serie para saber si el de hoy es alto o bajo.',
  keywords: [
    'relación maíz novillo',
    'relación de canje ganadera',
    'conviene engordar o vender',
    'kilos de maíz por kilo de novillo',
    'margen del feedlot',
  ],
  openGraph: {
    title: 'Relación maíz / novillo: qué es y cómo se lee',
    description: 'El número que decide si conviene engordar, con once años de contexto.',
    url: `${APP_URL}/relacion-maiz-novillo`,
    type: 'article',
  },
  alternates: { canonical: `${APP_URL}/relacion-maiz-novillo` },
}

export const revalidate = 3600

const FAQ = [
  {
    q: '¿Para qué sirve la relación de canje?',
    a: 'Para saber si el grano está barato o caro medido en hacienda, que es la cuenta que hace todo el que engorda. Si un kilo de novillo compra muchos kilos de maíz, el engorde tiene margen; si compra pocos, el maíz se está comiendo la ganancia y suele convenir vender antes.',
  },
  {
    q: '¿Un número alto es bueno o malo?',
    a: 'Depende de qué lado del negocio estés. Alto favorece a quien engorda: su producto compra más de su insumo. Al que vende maíz le pasa lo contrario. Y al criador no le dice mucho directamente, aunque un engorde con margen suele traccionar la demanda de terneros.',
  },
  {
    q: '¿Por qué se mide en dólares?',
    a: 'Porque el maíz cotiza en dólares y el novillo se opera en pesos. Para dividir uno por otro hay que llevarlos a la misma moneda, si no la relación mide la inflación en vez de medir el mercado.',
  },
]

export default function Page() {
  const parte = armarParteSemanal('ejemplo@consignatarias.com.ar')
  const serie = MN.serie
  const ratios = serie.map((p) => p.ratio)
  const min = Math.min(...ratios)
  const max = Math.max(...ratios)
  const mesMin = serie.find((p) => p.ratio === min)
  const mesMax = serie.find((p) => p.ratio === max)

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Article',
                headline: 'Relación maíz / novillo: qué es y cómo se lee',
                description: MN.metrica,
                url: `${APP_URL}/relacion-maiz-novillo`,
                author: { '@type': 'Organization', name: 'Consignatarias.com.ar' },
                publisher: { '@type': 'Organization', name: 'Memola Medios S.A.S.' },
                inLanguage: 'es-AR',
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
        <Link href="/guias" className="hover:text-sky-400">Guías</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-400">Relación maíz / novillo</span>
      </nav>

      <header>
        <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">
          Relación maíz / novillo
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-300">
          Cuántos kilos de maíz compra un kilo de novillo. Es la cuenta que decide si
          conviene poner el grano en el animal o vender.
        </p>
      </header>

      <section className="mt-10 space-y-4 text-base leading-relaxed text-slate-300">
        <h2 className="text-xl font-semibold text-slate-100">La cuenta</h2>
        <p>
          Se toma el novillo en pie, se lo pasa a dólares, y se lo divide por el precio del
          maíz también en dólares. El resultado son kilos de maíz por kilo de novillo.
        </p>
        <p className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 font-mono text-sm text-slate-200">
          novillo USD/kg ÷ maíz USD/kg = kilos de maíz por kilo de novillo
        </p>
        <p>
          Los dos en dólares no es un capricho: el maíz cotiza en dólares y el novillo se
          opera en pesos. Si no se llevan a la misma moneda, la relación termina midiendo la
          inflación en vez del mercado.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-100">Hoy, y contra once años</h2>
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-5">
          <p className="text-2xl font-semibold text-sky-300">{parte.maizNovillo.valor}</p>
          <p className="mt-2 text-base font-medium text-slate-200">{parte.maizNovillo.titular}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {parte.maizNovillo.contexto}
          </p>
        </div>
        <p className="mt-4 text-base leading-relaxed text-slate-300">
          Un número solo no dice nada: lo que importa es dónde cae dentro de su propia
          historia. En {serie.length} meses de serie, la relación fue de{' '}
          <strong className="text-slate-100">
            {min.toLocaleString('es-AR', { maximumFractionDigits: 1 })}
          </strong>{' '}
          en {mesMin?.mes} a{' '}
          <strong className="text-slate-100">
            {max.toLocaleString('es-AR', { maximumFractionDigits: 1 })}
          </strong>{' '}
          en {mesMax?.mes}. Casi cuatro veces entre un extremo y el otro.
        </p>
      </section>

      <section className="mt-10 space-y-4 text-base leading-relaxed text-slate-300">
        <h2 className="text-xl font-semibold text-slate-100">Cómo se lee</h2>
        <ul className="ml-1 space-y-3">
          <li>
            · <strong className="text-slate-100">Relación alta.</strong> El novillo compra
            mucho maíz: el grano está barato medido en hacienda y el engorde tiene aire. Es
            el momento en que conviene poner kilos.
          </li>
          <li>
            · <strong className="text-slate-100">Relación baja.</strong> El maíz se come el
            margen. Suele convenir salir antes, con menos kilos encima.
          </li>
        </ul>
        <p className="text-sm text-slate-400">
          El umbral de referencia que se usa habitualmente ronda los{' '}
          {MN.umbral_referencia} kilos, pero sirve más como orientación que como regla: lo
          que decide es el costo real de cada corral, y eso no lo sabe nadie desde afuera.
        </p>
      </section>

      <section className="mt-10 space-y-4 text-base leading-relaxed text-slate-300">
        <h2 className="text-xl font-semibold text-slate-100">Lo que la relación no dice</h2>
        <p>
          No incluye la sanidad, el flete, la mano de obra ni el costo del dinero, que en un
          engorde pesan. Tampoco dice cuánto va a durar: es una foto, y las relaciones de
          canje se dan vuelta.
        </p>
        <p>
          Y hay un detalle de fuente que conviene tener presente: el precio del maíz que se
          usa acá es el FOB oficial. El que compra en el mercado interno paga otra cosa, así
          que la relación sirve para comparar contra su propia historia más que para poner
          en una planilla de costos.
        </p>
      </section>

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

      <section className="mt-12 rounded-lg border border-slate-800 bg-slate-950/60 p-6">
        <h2 className="text-base font-semibold text-slate-200">La serie completa, gratis</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {serie.length} meses desde {serie[0].mes}, con el gráfico y el valor de cada mes.
          Y si querés el número de la semana con su lectura, va en el parte semanal.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/mercado/spread"
            className="rounded bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500"
          >
            Ver la serie
          </Link>
          <Link
            href="/informes/parte-semanal"
            className="rounded border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:border-slate-500"
          >
            El parte semanal
          </Link>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">{MN.fuentes}</p>
      </section>

      <section className="mt-8 border-t border-slate-800 pt-6">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <li>
            <Link href="/que-es-un-feedlot" className="text-sky-400 underline underline-offset-2">
              Qué es un feedlot
            </Link>
          </li>
          <li>
            <Link href="/feedlot-vs-pastoril" className="text-sky-400 underline underline-offset-2">
              Feedlot vs pastoril
            </Link>
          </li>
          <li>
            <Link href="/que-es-la-invernada" className="text-sky-400 underline underline-offset-2">
              Qué es la invernada
            </Link>
          </li>
        </ul>
      </section>
    </article>
  )
}
