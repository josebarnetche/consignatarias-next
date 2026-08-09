import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, FAQPageSchema } from '@/components/seo/JsonLd'
import CapturaCampoForm from '@/components/campos/CapturaCampoForm'

export const revalidate = 86400

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/como-vender-un-campo`

export const metadata: Metadata = {
  title: 'Cómo vender un campo — precio, papeles y tiempos reales',
  description:
    'Guía para vender un campo en Argentina: cómo poner el precio, qué carpeta armar antes de publicar, cuánto tarda de verdad una operación rural, qué comisión se paga y qué impuestos deja la venta.',
  keywords: [
    'como vender un campo',
    'vender campo',
    'vender un campo en argentina',
    'compra y venta de campos',
    'cuanto tarda vender un campo',
    'comision por vender un campo',
  ],
  openGraph: { title: 'Cómo vender un campo', url: PAGE_URL, type: 'article' },
  alternates: { canonical: PAGE_URL },
}

const FAQ = [
  {
    question: '¿Cómo sé a cuánto poner mi campo?',
    answer:
      'Hay dos maneras de llegar al número y conviene mirar las dos. Una es por lo que renta: un campo vale, a grandes rasgos, unos veinte años de su arrendamiento, y como el canon se pacta en kilos de novillo ya viene ajustado por la calidad del campo. La otra es por comparables: qué se está pagando por campos parecidos en la misma zona. Cuando los dos números dan parecido, el precio es firme. Cuando se separan mucho, hay algo para mirar antes de publicar.',
  },
  {
    question: '¿Cuánto tarda vender un campo?',
    answer:
      'Mucho más que un inmueble urbano. Entre que se publica y se escritura suelen pasar varios meses, y no es raro que pase más de un año en campos grandes o en zonas de poca rotación. La parte lenta no es conseguir interesados: es la carpeta de papeles, la mensura si hace falta y los tiempos del comprador para juntar el dinero, porque casi siempre se paga al contado.',
  },
  {
    question: '¿Qué comisión se paga por vender un campo?',
    answer:
      'Lo habitual está entre el 3% y el 5% del precio, y en muchas zonas se cobra a las dos partes. Se pacta antes y por escrito, junto con si hay exclusividad y por cuánto tiempo. Un martillero o corredor público matriculado es quien está habilitado para intermediar.',
  },
  {
    question: '¿Conviene vender con el campo arrendado o libre?',
    answer:
      'Depende del comprador que se busque. Un inversor suele preferirlo arrendado, porque compra una renta en marcha. Un productor que va a trabajarlo lo quiere libre, y un contrato largo por delante le baja el precio o directamente lo saca de la operación. Hay además una consecuencia impositiva: el tratamiento de la venta no es el mismo si el campo estaba arrendado que si lo explotaba su dueño.',
  },
]

export default function ComoVenderCampoPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="campos" sectionName="Campos" />
      <FAQPageSchema items={FAQ} />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <Link href="/campos" className="text-zinc-500 hover:text-accent text-xs">← Campos</Link>

        <h1 className="text-zinc-100 text-2xl font-medium mt-4 mb-3">Cómo vender un campo</h1>
        <p className="text-zinc-300 text-base mb-6">
          En el campo la venta se prepara antes de publicar. Un aviso que sale con la superficie mal, sin
          plano y con el inmobiliario atrasado se quema solo: cuando el interesado serio pide papeles y no
          están, se va. Esta guía va en el orden en que conviene hacerlo.
        </p>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">1. Poner el precio antes de contarlo</h2>
          <p className="text-zinc-400 mb-3">
            Un campo que sale caro y baja dos veces termina vendiéndose por menos que uno que salió bien
            desde el principio, porque el mercado rural es chico y tiene memoria: los mismos compradores y
            los mismos intermediarios lo ven pasar todas las veces.
          </p>
          <p className="text-zinc-400">
            El{' '}
            <Link href="/campos/valuar" className="text-accent hover:underline">
              tasador
            </Link>{' '}
            cruza las dos vías —lo que el campo renta y lo que se paga en la zona— y muestra dónde cae dentro
            del rango real de la provincia. No reemplaza una tasación profesional, pero evita salir con un
            número que está afuera del mercado sin saberlo.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">2. Armar la carpeta</h2>
          <p className="text-zinc-400 mb-4">
            Esto es lo que va a pedir cualquier comprador que hable en serio, y tenerlo listo acorta la
            operación más que cualquier otra cosa.
          </p>
          <ul className="space-y-2 text-zinc-400 text-xs">
            <li className="border-l-2 border-zinc-700 pl-4">
              <strong className="text-zinc-200">Título de propiedad</strong> y antecedentes de dominio.
            </li>
            <li className="border-l-2 border-zinc-700 pl-4">
              <strong className="text-zinc-200">Plano de mensura</strong> y certificado catastral. Si el
              campo nunca se mensuró o se subdividió sin registrar, empezá por acá: es lo que más demora.
            </li>
            <li className="border-l-2 border-zinc-700 pl-4">
              <strong className="text-zinc-200">Libre deuda del inmobiliario</strong> provincial.
            </li>
            <li className="border-l-2 border-zinc-700 pl-4">
              <strong className="text-zinc-200">Contratos vigentes</strong> de arrendamiento, pastaje o
              capitalización, con sus plazos.
            </li>
            <li className="border-l-2 border-zinc-700 pl-4">
              <strong className="text-zinc-200">Detalle de mejoras</strong>: casco, galpones, alambrados,
              aguadas, molinos, perforaciones, corrales, balanza.
            </li>
            <li className="border-l-2 border-zinc-700 pl-4">
              <strong className="text-zinc-200">Superficie útil</strong>, separada de la total. Decirlo de
              entrada da confianza; que lo descubra el comprador, la saca.
            </li>
            <li className="border-l-2 border-zinc-700 pl-4">
              <strong className="text-zinc-200">Fotos y ubicación</strong>. Una imagen satelital con el
              perímetro marcado vale más que diez fotos del casco.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">3. Decidir cómo se vende</h2>
          <p className="text-zinc-400 mb-3">
            Se puede vender por cuenta propia, con un martillero o corredor matriculado, o por remate. Cada
            camino tiene su lógica: la intermediación acerca compradores que uno no tiene y filtra curiosos,
            el remate fija una fecha y obliga a decidir, y la venta directa ahorra comisión pero deja todo el
            trabajo —y toda la exposición— del lado del dueño.
          </p>
          <p className="text-zinc-400">
            Si hay intermediario, lo que se firma antes es tan importante como el precio: comisión, quién la
            paga, si hay exclusividad, por cuánto tiempo, y qué pasa si el comprador aparece por otro lado.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">4. Lo que deja la venta</h2>
          <p className="text-zinc-400">
            El resultado neto depende de dos datos que conviene revisar antes de firmar, no después: cuándo
            se adquirió el campo y si estaba arrendado o explotado por su dueño. Esa segunda respuesta puede
            mover la operación entre no pagar nada y dejar más de un tercio de la ganancia.{' '}
            <Link href="/impuestos-por-la-venta-de-un-campo" className="text-accent hover:underline">
              Cómo funciona el tema impositivo
            </Link>
            .
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

        <section className="border border-accent/40 rounded-lg bg-accent/[0.04] p-5 mb-8">
          <p className="text-zinc-100 text-base font-medium mb-1">Empecemos por cuánto vale</p>
          <p className="text-zinc-400 mb-4">
            Dejanos los datos del campo y te pasamos una valuación con el detalle de tu zona y lo que
            estamos viendo de precios. Sin costo. Tus datos no se publican ni se los damos a nadie.
          </p>
          <CapturaCampoForm tipo="tengo" origen="guia-vender" />
          <p className="text-zinc-600 text-xs mt-4 pt-3 border-t border-accent/20">
            ¿Ya lo querés ofrecer?{' '}
            <Link href="/campos/publicar" className="text-accent hover:underline">
              Publicalo gratis
            </Link>{' '}
            — el canon en kilos de novillo, convertido a pesos con el índice del día.
          </p>
        </section>

        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/campos/valuar" className="text-zinc-500 hover:text-accent">¿Cuánto vale mi campo?</Link>
          <Link href="/impuestos-por-la-venta-de-un-campo" className="text-zinc-500 hover:text-accent">Impuestos de la venta</Link>
          <Link href="/como-comprar-un-campo" className="text-zinc-500 hover:text-accent">Cómo comprar un campo</Link>
          <Link href="/inmobiliarias-rurales" className="text-zinc-500 hover:text-accent">Inmobiliarias rurales</Link>
        </div>
      </div>
    </>
  )
}
