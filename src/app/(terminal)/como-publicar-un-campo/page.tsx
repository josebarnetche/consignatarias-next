import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, FAQPageSchema } from '@/components/seo/JsonLd'
import { promedioMesAnterior } from '@/lib/valuacion-campos'

export const revalidate = 86400

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/como-publicar-un-campo`

export const metadata: Metadata = {
  title: 'Cómo publicar tu campo — guía para que el aviso funcione',
  description:
    'Guía para publicar un campo en venta o en arrendamiento: qué datos poner, cómo escribir la superficie y las mejoras, cómo expresar el canon en kilos de novillo, y los errores que hacen que un aviso no reciba consultas.',
  keywords: [
    'como publicar tu campo',
    'publicar campo',
    'publicar campo en venta',
    'publicar campo en arrendamiento',
    'aviso de campo',
  ],
  openGraph: { title: 'Cómo publicar tu campo', url: PAGE_URL, type: 'article' },
  alternates: { canonical: PAGE_URL },
}

const FAQ = [
  {
    question: '¿Cuánto cuesta publicar un campo?',
    answer:
      'En consignatarias.com.ar es gratis, y el contacto de quien publica no se muestra: las consultas entran por el sitio y las pasamos nosotros. Todo aviso pasa por revisión antes de salir.',
  },
  {
    question: '¿Cómo se pone el precio de un arrendamiento?',
    answer:
      'En kilos de novillo por hectárea, que es como se pacta de verdad. Los avisos del mercado suelen escribirlo por año —"60 kg de novillo por hectárea, por año"— aunque el pago sea mensual y se liquide con el promedio del mes anterior. El sitio lo convierte solo a pesos y a dólares, así que quien lo lee ve enseguida cuánto es en plata.',
  },
  {
    question: '¿Qué hace que un aviso reciba consultas?',
    answer:
      'La superficie real bien puesta, el precio dicho de frente y la ubicación clara. Un aviso sin precio recibe consultas de curiosos y no de compradores: el que va en serio necesita saber si está dentro de su presupuesto antes de invertir un viaje.',
  },
]

export default function ComoPublicarCampoPage() {
  const { etiqueta } = promedioMesAnterior()
  return (
    <>
      <SectionBreadcrumbSchema section="campos" sectionName="Campos" />
      <FAQPageSchema items={FAQ} />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <Link href="/campos" className="text-zinc-500 hover:text-accent text-xs">← Campos</Link>

        <h1 className="text-zinc-100 text-2xl font-medium mt-4 mb-3">Cómo publicar tu campo</h1>
        <p className="text-zinc-300 text-base mb-6">
          Un aviso de campo compite con otros que dicen casi lo mismo. Lo que lo separa no es el adjetivo
          —&ldquo;excelente campo&rdquo; no significa nada— sino los datos que el otro no puso.
        </p>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">Los datos que deciden</h2>
          <dl className="space-y-4">
            <div className="border-l-2 border-zinc-700 pl-4">
              <dt className="text-zinc-200 font-medium">Superficie total y superficie útil</dt>
              <dd className="text-zinc-400 text-xs mt-1">
                Si hay bajo, monte o médano, decilo vos. El comprador lo va a ver igual cuando visite, y
                enterarse ahí cuesta la operación entera. Declararlo de entrada filtra a quien no lo quiere y
                convence al que sí.
              </dd>
            </div>
            <div className="border-l-2 border-zinc-700 pl-4">
              <dt className="text-zinc-200 font-medium">Ubicación con referencia real</dt>
              <dd className="text-zinc-400 text-xs mt-1">
                Partido, distancia y estado del acceso: &ldquo;a 12 km de la ruta, 8 de tierra&rdquo; dice
                más que cualquier descripción.
              </dd>
            </div>
            <div className="border-l-2 border-zinc-700 pl-4">
              <dt className="text-zinc-200 font-medium">Agua</dt>
              <dd className="text-zinc-400 text-xs mt-1">
                Molinos, perforaciones con su profundidad y calidad, represas, tajamares, arroyo. En campo de
                cría es el dato que más define la carga posible.
              </dd>
            </div>
            <div className="border-l-2 border-zinc-700 pl-4">
              <dt className="text-zinc-200 font-medium">Mejoras, con estado</dt>
              <dd className="text-zinc-400 text-xs mt-1">
                Alambrados y en qué condición, corrales, manga, balanza, galpones, casa del puestero,
                electricidad. &ldquo;Alambrado perimetral nuevo&rdquo; vale más que &ldquo;buenas
                mejoras&rdquo;.
              </dd>
            </div>
            <div className="border-l-2 border-zinc-700 pl-4">
              <dt className="text-zinc-200 font-medium">Precio</dt>
              <dd className="text-zinc-400 text-xs mt-1">
                Para venta, en dólares por hectárea. Para arrendamiento, en kilos de novillo por hectárea. Un
                aviso sin precio recibe curiosos, no compradores.
              </dd>
            </div>
          </dl>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">El canon, en kilos</h2>
          <p className="text-zinc-400 mb-3">
            El arrendamiento se pacta en kilos de novillo por hectárea y se liquida con el{' '}
            {etiqueta} del índice. Es la moneda que no se devalúa dentro del negocio: el arrendador cobra
            siempre lo mismo en términos de hacienda, sin importar la inflación ni el tipo de cambio.
          </p>
          <p className="text-zinc-400">
            Cuando cargás los kilos en el formulario, el sitio te muestra en vivo cuánto es eso en pesos y en
            dólares, por mes y por año. Sirve para dos cosas: para confirmar que el número que pensaste tiene
            sentido, y para que quien lee el aviso no tenga que hacer la cuenta.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">Antes de publicar, poné el precio bien</h2>
          <p className="text-zinc-400">
            Un campo que sale caro y baja dos veces se vende por menos que uno que salió bien de entrada. El{' '}
            <Link href="/campos/valuar" className="text-accent hover:underline">
              tasador
            </Link>{' '}
            cruza lo que el campo renta con lo que se paga en la zona y muestra dónde cae dentro del rango
            real de la provincia.
          </p>
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

        <div className="border border-accent/40 rounded-lg bg-accent/[0.04] p-5 mb-8">
          <p className="text-zinc-200 font-medium mb-1">Publicar es gratis</p>
          <p className="text-zinc-400 mb-3">
            Tu contacto no se publica. Las consultas entran por el sitio y te las pasamos nosotros.
          </p>
          <Link
            href="/campos/publicar"
            className="inline-block px-4 py-2 text-xs bg-accent hover:bg-accent-bright text-zinc-950 font-medium rounded transition-colors"
          >
            Publicar mi campo
          </Link>
        </div>

        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/como-vender-un-campo" className="text-zinc-500 hover:text-accent">Cómo vender un campo</Link>
          <Link href="/inmobiliarias-rurales" className="text-zinc-500 hover:text-accent">Inmobiliarias rurales</Link>
          <Link href="/como-se-calcula-el-canon-de-arrendamiento" className="text-zinc-500 hover:text-accent">Cómo se calcula el canon</Link>
        </div>
      </div>
    </>
  )
}
