import type { Metadata } from 'next'
import Link from 'next/link'
import {
  getDepartamento,
  getDepartamentosPublicables,
  indiceTernerosVaca,
  hayCompraDeTerneros,
  ultimoAnio,
  META,
  TECHO_BIOLOGICO_INDICE,
  PROPORCION_VIENTRES_NEA,
} from '@/lib/productividad/panel'

const APP_URL = 'https://www.consignatarias.com.ar'

export const metadata: Metadata = {
  title: 'Terneros por vaca: cómo leer el número de tu zona',
  description:
    'El indicador más directo de eficiencia de un rodeo, calculado por departamento con datos oficiales. Qué mide, en qué se diferencia del destete, y cuándo el número no significa lo que parece.',
  keywords: [
    'terneros por vaca',
    'índice de destete por zona',
    'eficiencia reproductiva rodeo',
    'porcentaje de destete argentina',
    'cuántos terneros por vaca',
  ],
  openGraph: {
    title: 'Terneros por vaca: cómo leer el número de tu zona',
    description: 'Qué mide, en qué se diferencia del destete y cuándo no significa lo que parece.',
    url: `${APP_URL}/terneros-por-vaca-de-tu-zona`,
    type: 'article',
  },
  alternates: { canonical: `${APP_URL}/terneros-por-vaca-de-tu-zona` },
}

export const revalidate = false

const FAQ = [
  {
    q: '¿Es lo mismo que el porcentaje de destete?',
    a: 'No, y se confunden todo el tiempo. El destete son terneros sobre VIENTRES — las vacas que efectivamente entraron en servicio. El registro oficial no separa vacas de cría de vacas de invernada, así que lo que se puede medir directo es terneros sobre TODAS las vacas. Para pasar de uno al otro hay que asumir qué proporción entró en servicio, y eso es un supuesto, no una medición.',
  },
  {
    q: '¿Por qué mi departamento da más de 100 %?',
    a: 'Porque compra terneros. Una vaca pare uno por año: si hay más terneros que vacas, el exceso entró de afuera. Esa zona es de invernada, no de cría, y ahí el cociente deja de medir eficiencia reproductiva — mide engorde. Por eso en esos departamentos no publicamos destete ni los comparamos con los de cría.',
  },
  {
    q: '¿De dónde salen los datos?',
    a: 'De la serie oficial de stock bovino por departamento que publica la Secretaría de Agricultura sobre los registros de SENASA. Es dato censal, no una muestra: cubre los establecimientos declarados de cada partido, año por año desde 2012. Se actualiza una vez al año, en abril.',
  },
]

export default function Page() {
  const anio = ultimoAnio()
  const publicables = getDepartamentosPublicables().filter((d) => d.serie[anio])
  const conCompra = publicables.filter((d) => hayCompraDeTerneros(d.serie[anio])).length

  const ejemplos = ['curuzu-cuatia', 'mercedes', 'general-paz']
    .map((slug) => getDepartamento('corrientes', slug))
    .filter((d): d is NonNullable<typeof d> => !!d)
    .map((d) => ({ nombre: d.nombre, i: indiceTernerosVaca(d.serie[anio]) }))

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
                headline: 'Terneros por vaca: cómo leer el número de tu zona',
                description:
                  'Qué mide el índice de terneros por vaca, en qué se diferencia del destete y cuándo no es interpretable.',
                url: `${APP_URL}/terneros-por-vaca-de-tu-zona`,
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
        <span className="text-slate-400">Terneros por vaca</span>
      </nav>

      <header>
        <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">
          Terneros por vaca: cómo leer el número de tu zona
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-300">
          Es el indicador de eficiencia más directo que se puede armar con datos oficiales.
          También es el que más se malinterpreta.
        </p>
      </header>

      <section className="mt-10 space-y-4 text-base leading-relaxed text-slate-300">
        <h2 className="text-xl font-semibold text-slate-100">Qué mide, exactamente</h2>
        <p>
          Los terneros y terneras registrados al 31 de diciembre, sobre las vacas del mismo
          stock. Nada más que eso. Es un cociente de dos números que están publicados, sin
          supuestos en el medio.
        </p>
        <p>
          Y no está publicado como serie en ninguna parte. Aparece calculado suelto dentro
          de informes, siempre a nivel nacional o provincial, nunca desagregado por
          departamento y con historia. Se puede construir —{publicables.length} partidos,
          desde 2012— pero hay que construirlo.
        </p>
      </section>

      <section className="mt-10 space-y-4 text-base leading-relaxed text-slate-300">
        <h2 className="text-xl font-semibold text-slate-100">
          Por qué no es el porcentaje de destete
        </h2>
        <p>
          El destete se calcula sobre <strong className="text-slate-100">vientres</strong>:
          las vacas que efectivamente entraron en servicio. El registro oficial no distingue
          vacas de cría de vacas de invernada, así que ese denominador no está.
        </p>
        <p>
          Para pasar de un número al otro hay que asumir qué proporción de las vacas entró
          en servicio. INTA usa{' '}
          <strong className="text-slate-100">{Math.round(PROPORCION_VIENTRES_NEA * 100)} %</strong>{' '}
          para el NEA — el resto se considera invernada. Con ese supuesto, un índice de 57 %
          se traduce a un destete estimado de 69 %.
        </p>
        <p className="text-sm text-slate-400">
          Es un supuesto razonable y publicado, pero es un supuesto. Por eso el índice medido
          va siempre, y el destete sólo donde el supuesto aplica, dicho como estimación.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-100">
          Lo que se ve cuando se mira por departamento
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Tres partidos de Corrientes, mismo año, misma fuente:
        </p>
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-800">
              {ejemplos.map((e) => (
                <tr key={e.nombre}>
                  <td className="px-4 py-3 text-slate-200">{e.nombre}</td>
                  <td className="px-4 py-3 text-right font-medium text-sky-300">
                    {e.i != null
                      ? `${(e.i * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })} %`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-base leading-relaxed text-slate-300">
          Casi el doble entre el primero y el último, dentro de la misma provincia. Ese
          gradiente coincide con lo que INTA midió en el animal: en el sur de Corrientes la
          recría gana 157 kg por año y en el norte no llega a 100. El dato de stock y la
          bibliografía dicen lo mismo por caminos distintos.
        </p>
      </section>

      <section className="mt-10 space-y-4 text-base leading-relaxed text-slate-300">
        <h2 className="text-xl font-semibold text-slate-100">
          Cuándo el número no significa lo que parece
        </h2>
        <p>
          Una vaca pare un ternero por año. Si un departamento muestra más terneros que
          vacas, el exceso <strong className="text-slate-100">entró de afuera</strong>: esa
          zona compra para engordar.
        </p>
        <p>
          Pasa más de lo que uno esperaría. De los {publicables.length} partidos publicables,{' '}
          <strong className="text-slate-100">{conCompra} superan el techo biológico</strong>{' '}
          de {TECHO_BIOLOGICO_INDICE.toLocaleString('es-AR')} terneros por vaca. Hay casos de
          más de cuatro.
        </p>
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-4 text-sm leading-relaxed text-slate-200">
          En esos partidos el cociente mide engorde, no eficiencia reproductiva. Compararlos
          con una zona de cría es comparar dos negocios distintos — y rankearlos juntos hace
          que una zona de invernada aparezca «primera» en un indicador que no le
          corresponde.
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
        <h2 className="text-base font-semibold text-slate-200">Mirá el de tu partido</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Está publicado y es gratis para los {publicables.length} partidos con dato
          suficiente, con su serie desde 2012 y el puesto que ocupa en su provincia.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/productividad"
            className="rounded bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500"
          >
            Ver mi zona, gratis
          </Link>
          <Link
            href="/informes/productivo-departamental"
            className="rounded border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:border-slate-500"
          >
            El informe completo
          </Link>
        </div>
      </section>

      <section className="mt-8 border-t border-slate-800 pt-6">
        <p className="text-xs leading-relaxed text-slate-500">
          Fuente: {META.organismo}. Datos agregados por departamento, sin identificación de
          personas ni de establecimientos.
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <li>
            <Link href="/que-es-el-destete" className="text-sky-400 underline underline-offset-2">
              Qué es el destete
            </Link>
          </li>
          <li>
            <Link href="/que-es-la-cria-y-recria" className="text-sky-400 underline underline-offset-2">
              Cría, recría e invernada
            </Link>
          </li>
          <li>
            <Link href="/buenas-practicas" className="text-sky-400 underline underline-offset-2">
              Buenas Prácticas Ganaderas
            </Link>
          </li>
        </ul>
      </section>
    </article>
  )
}
