import type { Metadata } from 'next'
import Link from 'next/link'
import { TIERRA } from '@/lib/valuacion-campos'
import { armarInformeValuacion } from '@/lib/informes/valuacion'

const APP_URL = 'https://www.consignatarias.com.ar'

export const metadata: Metadata = {
  title: 'Cómo se tasa un campo — las dos vías y por qué nunca dan igual',
  description:
    'Un campo se tasa por renta y por comparables. Qué mide cada vía, por qué se apartan entre sí y qué te está diciendo esa diferencia. Con números reales de zonas argentinas.',
  keywords: [
    'cómo se tasa un campo',
    'cuánto vale una hectárea',
    'tasación de campo argentina',
    'valor de la tierra por renta',
    'comparables de campos',
    'años de arrendamiento para pagar un campo',
  ],
  openGraph: {
    title: 'Cómo se tasa un campo — las dos vías y por qué nunca dan igual',
    description: 'Renta y comparables: qué mide cada una y qué significa que se aparten.',
    url: `${APP_URL}/como-se-tasa-un-campo`,
    type: 'article',
  },
  alternates: { canonical: `${APP_URL}/como-se-tasa-un-campo` },
}

export const revalidate = 3600

const FAQ = [
  {
    q: '¿Cuál de las dos vías es la correcta?',
    a: 'Ninguna sola. Por renta se mide qué produce el campo; por comparables, qué está pagando el mercado por uno parecido. Cuando las dos coinciden, el número es sólido. Cuando se apartan, la diferencia es el dato: dice que el campo está caro o barato para su zona, o que es mejor o peor que el promedio de ella.',
  },
  {
    q: '¿Cuántos años de arrendamiento vale un campo?',
    a: 'La regla de mostrador dice veinte, y en la pampa húmeda se acerca bastante. Pero no es un número fijo: depende de cuánto produce la zona. En zonas de cría del NEA el canon es bajo respecto del valor de la tierra y el repago se estira hasta casi veinte años; en zonas agrícolas se acorta. Lo que hay que mirar es el número de tu zona, no la regla.',
  },
  {
    q: '¿Por qué el valor está en dólares?',
    a: 'Porque así se opera la tierra en Argentina. El canon, en cambio, se pacta en kilos de novillo o en quintales de soja: son unidades que se ajustan solas. Para cruzar las dos vías hay que pasar todo a la misma moneda, y ahí el dólar es el denominador común.',
  },
]

export default function Page() {
  // Un caso real, calculado en build: explicar con números concretos dice más que
  // describir el método en abstracto.
  const caso = armarInformeValuacion('corrientes', 'ejemplo@consignatarias.com.ar')
  const zonasConCanon = TIERRA.filter((t) => t.usd_ha > 0 && t.kg_ha_mes_canon).length

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
                headline: 'Cómo se tasa un campo — las dos vías y por qué nunca dan igual',
                description:
                  'Renta y comparables: qué mide cada vía y qué significa que se aparten entre sí.',
                url: `${APP_URL}/como-se-tasa-un-campo`,
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
        <span className="text-slate-400">Cómo se tasa un campo</span>
      </nav>

      <header>
        <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">
          Cómo se tasa un campo
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-300">
          Hay dos caminos, y la gracia está en correr los dos. Cuando dan distinto —que es
          casi siempre— esa diferencia es la parte útil.
        </p>
      </header>

      <section className="mt-10 space-y-4 text-base leading-relaxed text-slate-300">
        <h2 className="text-xl font-semibold text-slate-100">La primera vía: por renta</h2>
        <p>
          Un campo vale, a grandes rasgos, los años de arrendamiento que tarda en pagarse.
          Suena simple y esconde algo importante: <strong className="text-slate-100">el
          canon ya viene ajustado por la calidad del campo</strong>. Nadie paga en Chubut lo
          que paga en Pergamino, y eso no hay que corregirlo aparte — está adentro del
          número.
        </p>
        <p>
          La cuenta es directa. El canon se pacta en kilos de novillo por hectárea y por
          mes: se anualiza, se pasa a dólares al precio del novillo, y se multiplica por los
          años de repago de la zona.
        </p>
        <p className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 font-mono text-sm text-slate-200">
          kilos por ha y por mes × 12 × precio del novillo en USD × años de repago
        </p>
        <p className="text-sm text-slate-400">
          En campo agrícola la mecánica es idéntica, pero la unidad cambia: el
          arrendamiento se pacta en quintales de soja por hectárea y por año. No es una
          preferencia, es cómo se firma cada contrato.
        </p>
      </section>

      <section className="mt-10 space-y-4 text-base leading-relaxed text-slate-300">
        <h2 className="text-xl font-semibold text-slate-100">La segunda: por comparables</h2>
        <p>
          Qué se está pagando por campos parecidos en la misma zona. Es lo que hace
          cualquiera antes de firmar, sólo que hecho con una muestra en vez de con tres
          casos que uno escuchó.
        </p>
        <p>
          Acá lo que importa no es la mediana sino{' '}
          <strong className="text-slate-100">la dispersión</strong>. Un valor solo no dice
          nada; la banda entre el cuartil de abajo y el de arriba es lo que hace negociable
          una cifra: si lo que te ofrecen cae adentro, estás en mercado. Si cae afuera, hay
          algo que explicar — para bien o para mal.
        </p>
      </section>

      {caso && caso.v.porRenta && caso.v.porComparables && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-100">Un caso real</h2>
          <p className="mt-2 text-sm text-slate-400">
            {caso.zonaNombre}, con el dato de hoy:
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-800">
                <tr>
                  <td className="px-4 py-3 text-slate-400">Por renta</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-100">
                    USD {Math.round(caso.v.porRenta.usdHa).toLocaleString('es-AR')}/ha
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-400">Por comparables</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-100">
                    USD {Math.round(caso.v.porComparables.usdHa).toLocaleString('es-AR')}/ha
                  </td>
                </tr>
                <tr className="bg-slate-900/40">
                  <td className="px-4 py-3 text-slate-300">Se apartan</td>
                  <td className="px-4 py-3 text-right font-medium text-sky-300">
                    {Math.abs(caso.v.brecha ?? 0).toLocaleString('es-AR', {
                      maximumFractionDigits: 0,
                    })}{' '}
                    %
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            Cinco por ciento es coincidencia, no discrepancia: las dos vías están diciendo
            lo mismo. Cuando la brecha se va arriba del veinte, ahí sí hay algo que mirar.
          </p>
        </section>
      )}

      <section className="mt-10 space-y-4 text-base leading-relaxed text-slate-300">
        <h2 className="text-xl font-semibold text-slate-100">
          El error más común: confundir los dos repagos
        </h2>
        <p>
          Se dice «este campo se paga en diez años» y casi nunca se aclara con qué. Son dos
          preguntas distintas y dan números que pueden diferir al doble:
        </p>
        <ul className="ml-1 space-y-3">
          <li>
            · <strong className="text-slate-100">Años de arrendamiento.</strong> Cuánto
            tarda en recuperarse la hectárea con lo que cobra quien la alquila. Es la
            pregunta del que arrienda.
          </li>
          <li>
            · <strong className="text-slate-100">Años de producción.</strong> Cuánto tarda
            con la producción bruta del campo entero. Es la pregunta del que lo trabaja.
          </li>
        </ul>
        {caso?.aniosPorCanon && caso?.aniosPorProduccion && (
          <p className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-4 text-sm leading-relaxed text-slate-200">
            En {caso.provincia} la misma hectárea da{' '}
            <strong className="text-amber-200">
              {caso.aniosPorCanon.toLocaleString('es-AR', { maximumFractionDigits: 1 })} años
            </strong>{' '}
            por arrendamiento y{' '}
            <strong className="text-amber-200">
              {caso.aniosPorProduccion.toLocaleString('es-AR', { maximumFractionDigits: 1 })} años
            </strong>{' '}
            por producción. Casi el doble. Si alguien te tira un número de repago, preguntá
            cuál de los dos es.
          </p>
        )}
      </section>

      <section className="mt-10 space-y-4 text-base leading-relaxed text-slate-300">
        <h2 className="text-xl font-semibold text-slate-100">Lo que ninguna de las dos vías ve</h2>
        <p>
          Las aguadas, los alambrados, el acceso, el estado del pastizal y si el campo tiene
          o no un problema de títulos. Una tasación de escritorio da la zona; el campo
          concreto puede valer bastante más o bastante menos que la mediana de su zona
          justamente por eso.
        </p>
        <p className="text-sm text-slate-400">
          Por eso esto no reemplaza a un matriculado. Sirve para llegar a la reunión
          sabiendo dónde estás parado, que es distinto de saber cuánto vale tu campo.
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
        <h2 className="text-base font-semibold text-slate-200">Hacé la cuenta con tu zona</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          La calculadora corre las dos vías gratis, con el canon y el valor relevados de{' '}
          {zonasConCanon} zonas. Si querés además la dispersión, los comparables de al lado
          y los dos repagos en un PDF, está el informe.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/campos/valuar"
            className="rounded bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500"
          >
            Calcular gratis
          </Link>
          <Link
            href="/informes/valuacion-de-campo"
            className="rounded border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:border-slate-500"
          >
            Ver el informe
          </Link>
        </div>
      </section>

      <section className="mt-8 border-t border-slate-800 pt-6">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <li>
            <Link href="/como-se-calcula-el-canon-de-arrendamiento" className="text-sky-400 underline underline-offset-2">
              Cómo se calcula el canon
            </Link>
          </li>
          <li>
            <Link href="/como-comprar-un-campo" className="text-sky-400 underline underline-offset-2">
              Cómo comprar un campo
            </Link>
          </li>
          <li>
            <Link href="/campos/valor-hectarea" className="text-sky-400 underline underline-offset-2">
              Valor de la hectárea por zona
            </Link>
          </li>
        </ul>
      </section>
    </article>
  )
}
