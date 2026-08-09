import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, FAQPageSchema } from '@/components/seo/JsonLd'

export const revalidate = 86400

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/inmobiliarias-rurales`

export const metadata: Metadata = {
  title: 'Inmobiliarias rurales — qué hacen, qué cobran y cómo elegir',
  description:
    'Cómo funciona la intermediación en la compra y venta de campos en Argentina: martillero y corredor matriculado, comisiones, exclusividad, y qué pedirle a quien va a vender tu campo.',
  keywords: [
    'inmobiliarias rurales',
    'inmobiliaria rural',
    'martillero rural',
    'corredor inmobiliario rural',
    'comision venta de campos',
    'compra y venta de campos',
  ],
  openGraph: { title: 'Inmobiliarias rurales', url: PAGE_URL, type: 'article' },
  alternates: { canonical: PAGE_URL },
}

const FAQ = [
  {
    question: '¿Qué comisión cobra una inmobiliaria rural?',
    answer:
      'Lo habitual está entre el 3% y el 5% del precio de la operación. En buena parte del país se cobra a las dos partes, comprador y vendedor, aunque es negociable y depende del tamaño de la operación. Lo importante es que quede por escrito antes de mostrar el campo: cuánto, quién paga, y en qué momento se devenga.',
  },
  {
    question: '¿Hace falta que sea martillero o corredor matriculado?',
    answer:
      'Para intermediar en una compraventa de inmuebles sí: la actividad de martillero y corredor público está regulada y requiere matrícula. Pedir el número de matrícula y el colegio en el que está inscripto es una verificación de treinta segundos que conviene hacer siempre.',
  },
  {
    question: '¿Conviene dar exclusividad?',
    answer:
      'Depende de qué se recibe a cambio. La exclusividad tiene sentido cuando el intermediario invierte de verdad —releva el campo, arma la carpeta, produce material, sale a buscar compradores— y se pacta por un plazo acotado con condiciones claras de renovación. Dar exclusividad indefinida sin contraprestación es la peor de las combinaciones: el campo queda inmovilizado y nadie se apura.',
  },
  {
    question: '¿Una consignataria de hacienda también vende campos?',
    answer:
      'Muchas sí. Las firmas consignatarias trabajan con los mismos productores de la zona, conocen los campos y muchas veces saben quién quiere vender antes de que salga publicado. Esa red es exactamente lo que un aviso no tiene, y es la razón por la que buena parte de las operaciones rurales se cierra sin haber estado nunca en un portal.',
  },
]

export default function InmobiliariasRuralesPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="campos" sectionName="Campos" />
      <FAQPageSchema items={FAQ} />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <Link href="/campos" className="text-zinc-500 hover:text-accent text-xs">← Campos</Link>

        <h1 className="text-zinc-100 text-2xl font-medium mt-4 mb-3">Inmobiliarias rurales</h1>
        <p className="text-zinc-300 text-base mb-6">
          El mercado de campos no funciona como el urbano. Buena parte de las operaciones se cierra sin haber
          estado nunca publicada, entre gente que ya se conocía. Por eso, más que un aviso, lo que se
          contrata cuando se elige un intermediario es{' '}
          <strong className="text-zinc-100">una red</strong>: a quién puede llamar, y quién le atiende.
        </p>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">Qué hace, en concreto</h2>
          <p className="text-zinc-400 mb-3">
            Releva el campo y lo mide contra otros de la zona. Arma la carpeta de papeles y detecta temprano
            lo que va a demorar la escritura —una mensura vieja, una sucesión sin terminar, un condominio con
            un hermano que no aparece—. Filtra curiosos, que en campos grandes son la mayoría de las
            consultas. Y acompaña la negociación hasta la escritura.
          </p>
          <p className="text-zinc-400">
            La parte de publicar es la más visible y la menos determinante. Un campo bien puesto en precio y
            con la carpeta lista se vende; uno mal puesto, no lo salva ningún portal.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">Qué pedirle antes de firmar</h2>
          <ul className="space-y-2 text-zinc-400 text-xs">
            <li className="border-l-2 border-zinc-700 pl-4">
              <strong className="text-zinc-200">Matrícula.</strong> Número y colegio. Se verifica en un
              minuto.
            </li>
            <li className="border-l-2 border-zinc-700 pl-4">
              <strong className="text-zinc-200">Operaciones en la zona.</strong> No cuántos avisos tiene:
              cuántas escrituras firmó cerca del campo, y en los últimos dos años.
            </li>
            <li className="border-l-2 border-zinc-700 pl-4">
              <strong className="text-zinc-200">Comisión por escrito.</strong> Cuánto, quién la paga, y
              cuándo se devenga: con el boleto o con la escritura.
            </li>
            <li className="border-l-2 border-zinc-700 pl-4">
              <strong className="text-zinc-200">Plazo de exclusividad,</strong> si la pide, y qué se
              compromete a hacer durante ese plazo.
            </li>
            <li className="border-l-2 border-zinc-700 pl-4">
              <strong className="text-zinc-200">Cómo va a fundamentar el precio.</strong> Si la respuesta es
              &ldquo;lo que se paga por acá&rdquo; sin un número atrás, falta la mitad del trabajo.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">Las firmas consignatarias</h2>
          <p className="text-zinc-400 mb-4">
            En el interior, la firma que remata la hacienda suele ser también la que sabe qué campo está por
            venderse. Trabajan con los mismos productores todo el año, conocen los establecimientos por
            dentro y tienen la relación armada de antes. Nuestro directorio lista las firmas activas del país
            con su zona de trabajo y sus remates.
          </p>
          <Link
            href="/consignatarias"
            className="inline-block px-4 py-2 text-xs border border-zinc-700 hover:border-accent text-zinc-300 hover:text-accent rounded transition-colors"
          >
            Ver el directorio de consignatarias
          </Link>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">Preguntas frecuentes</h2>
          <dl className="space-y-5">
            {FAQ.map((f) => (
              <div key={f.question} className="border-l-2 border-zinc-700 pl-4">
                <dt className="text-accent font-medium text-base mb-1">{f.question}</dt>
                <dd className="text-zinc-400">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/como-vender-un-campo" className="text-zinc-500 hover:text-accent">Cómo vender un campo</Link>
          <Link href="/como-elegir-consignataria" className="text-zinc-500 hover:text-accent">Cómo elegir una consignataria</Link>
          <Link href="/campos/valuar" className="text-zinc-500 hover:text-accent">Tasador de campos</Link>
        </div>
      </div>
    </>
  )
}
