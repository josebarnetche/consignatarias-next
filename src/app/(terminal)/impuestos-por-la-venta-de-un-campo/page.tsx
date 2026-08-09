import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, FAQPageSchema } from '@/components/seo/JsonLd'

export const revalidate = 86400

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/impuestos-por-la-venta-de-un-campo`

export const metadata: Metadata = {
  title: 'Impuestos por la venta de un campo — qué se paga y qué no',
  description:
    'Qué impuestos afectan la venta de un inmueble rural en Argentina: el ITI derogado, el impuesto cedular del 15%, la exención vigente desde 2026, sellos, Bienes Personales y la diferencia entre un campo arrendado y uno explotado.',
  keywords: [
    'impuestos venta de campo',
    'impuestos que afectan la venta de inmuebles rurales',
    'impuesto a la transferencia de inmuebles rurales',
    'impuesto cedular venta inmuebles',
    'vender un campo impuestos',
    'ITI campo',
    'ganancias venta de campo',
  ],
  openGraph: { title: 'Impuestos por la venta de un campo', url: PAGE_URL, type: 'article' },
  alternates: { canonical: PAGE_URL },
}

const FAQ = [
  {
    question: '¿Se sigue pagando el ITI cuando se vende un campo?',
    answer:
      'No. El Impuesto a la Transferencia de Inmuebles, aquel 1,5% que se retenía en la escritura, está derogado. Quien vendió antes de su derogación lo pagó; hoy la operación no lo tributa. Lo que ocupó su lugar es el impuesto cedular sobre la ganancia, que funciona distinto: no grava el precio sino la diferencia entre lo que se pagó y lo que se cobra.',
  },
  {
    question: '¿Cuánto se paga de impuesto a las ganancias por vender un campo?',
    answer:
      'Depende de dos cosas: cuándo se adquirió y qué se hacía con el campo. Si se compró antes de 2018, queda fuera del impuesto cedular y, sin ITI, la venta no tributa. Si se compró desde 2018 en adelante, entra en el cedular del 15% sobre la ganancia — salvo que aplique la exención vigente para operaciones desde 2026. Y si el campo estaba afectado a una explotación propia, el tratamiento es otro: va por tercera categoría, con alícuotas que llegan al 35%.',
  },
  {
    question: '¿Es lo mismo vender un campo arrendado que uno que trabajo yo?',
    answer:
      'No, y es la diferencia más cara de todo el tema. Un campo dado en arrendamiento genera una renta pasiva y la venta se trata como la de cualquier inmueble. Un campo explotado directamente por su dueño está afectado a una actividad, y el resultado de venderlo puede caer en tercera categoría. Entre un tratamiento y el otro hay una distancia que va del cero por ciento a más de un tercio de la ganancia.',
  },
  {
    question: '¿Qué otros impuestos aparecen en la operación?',
    answer:
      'El impuesto de sellos provincial sobre la escritura, que ronda entre el 1% y el 3,6% según la provincia y suele repartirse entre las partes. El inmobiliario rural al día, porque sin libre deuda no se escritura. Y del lado del vendedor, el campo deja de computar en Bienes Personales pero entra el dinero de la venta, que sí computa.',
  },
]

export default function ImpuestosVentaCampoPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="campos" sectionName="Campos" />
      <FAQPageSchema items={FAQ} />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <Link href="/campos" className="text-zinc-500 hover:text-accent text-xs">
          ← Campos
        </Link>

        <h1 className="text-zinc-100 text-2xl font-medium mt-4 mb-3">
          Impuestos por la venta de un campo
        </h1>
        <p className="text-zinc-300 text-base mb-6">
          Vender un campo no tributa siempre lo mismo, y la diferencia no depende del precio sino de dos
          datos que muchas veces nadie mira hasta que la escritura está armada:{' '}
          <strong className="text-zinc-100">cuándo se compró</strong> y{' '}
          <strong className="text-zinc-100">qué se hacía con él</strong>. Según cómo caigan esas dos
          respuestas, la misma operación puede no pagar nada o dejar más de un tercio de la ganancia en el
          camino.
        </p>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">El ITI ya no existe</h2>
          <p className="text-zinc-400 mb-3">
            Durante décadas la referencia fue el Impuesto a la Transferencia de Inmuebles: un 1,5% sobre el
            precio, retenido por el escribano en el mismo acto. Era simple y era ciego — se pagaba igual
            hubiera ganancia o pérdida.
          </p>
          <p className="text-zinc-400">
            Está derogado. Quien busque hoy cuánto es el ITI de un campo va a encontrar páginas viejas que
            todavía lo explican como vigente. Lo que quedó en su lugar grava otra cosa: no el precio, sino
            la diferencia entre lo que se pagó y lo que se cobra.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">La fecha de compra parte las aguas</h2>
          <p className="text-zinc-400 mb-3">
            El impuesto cedular alcanza a los inmuebles adquiridos{' '}
            <strong className="text-zinc-100">desde el 1 de enero de 2018</strong>. Es del 15% sobre la
            ganancia: precio de venta menos costo de adquisición actualizado, menos los gastos de la
            operación.
          </p>
          <p className="text-zinc-400 mb-3">
            Los inmuebles comprados <strong className="text-zinc-100">antes de 2018</strong> quedan afuera
            del cedular. Y como el ITI ya no existe, esa venta no tributa impuesto nacional sobre la
            ganancia. Es una situación llamativa pero es la que hay: buena parte de los campos que se venden
            hoy vienen de compras o sucesiones anteriores a esa fecha.
          </p>
          <div className="border border-zinc-800 rounded px-4 py-3 bg-zinc-900/50">
            <p className="text-zinc-300 text-xs">
              En un campo heredado, la fecha que cuenta no es la de la declaratoria sino la de adquisición
              del causante. Un campo que el padre compró en los años noventa sigue siendo, a estos efectos,
              una adquisición anterior a 2018.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">La exención vigente desde 2026</h2>
          <p className="text-zinc-400 mb-3">
            Para operaciones perfeccionadas{' '}
            <strong className="text-zinc-100">a partir del 1 de enero de 2026</strong> rige una exención
            sobre el resultado de la enajenación de inmuebles alcanzados por el impuesto cedular, para
            personas humanas y sucesiones indivisas, residentes o no. La norma que la creó llegó dentro de
            la reforma laboral de 2026 y quedó reglamentada por el{' '}
            <strong className="text-zinc-100">Decreto 406/2026</strong>, publicado el 1 de junio de 2026.
          </p>
          <p className="text-zinc-400 mb-3">
            El punto que interesa acá: <strong className="text-zinc-100">no distingue entre vivienda y
            campo</strong>. Un inmueble rural entra. La operación se considera configurada con la escritura
            o con la posesión, lo que ocurra primero, y alcanza también la cesión de boletos.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">
            Arrendado o explotado: la frontera que más plata mueve
          </h2>
          <p className="text-zinc-400 mb-3">
            El impuesto cedular alcanza inmuebles{' '}
            <strong className="text-zinc-100">no afectados a explotaciones de tercera categoría</strong>. Un
            campo dado en arrendamiento genera renta pasiva y la venta se trata como la de cualquier
            inmueble. Un campo trabajado por su propio dueño —cría, invernada, agricultura— está afectado a
            una actividad, y ahí el resultado de la venta puede quedar en tercera categoría, con alícuotas
            que llegan al 35%.
          </p>
          <div className="border border-amber-500/30 rounded px-4 py-3 bg-amber-500/[0.04] mb-3">
            <p className="text-amber-200/90 text-xs leading-relaxed">
              Conviene saber que esa exclusión no está escrita con todas las letras en el decreto: surge de
              cómo opera el artículo del cedular. Es una frontera de interpretación que mueve la operación
              entre el 0% y el 35%, así que es exactamente el punto que hay que hacerse confirmar por
              escrito antes de firmar, y no después.
            </p>
          </div>
          <p className="text-zinc-400">
            En la práctica esto premia la previsión. Un campo que viene arrendado desde hace años llega a la
            venta con una posición mucho más clara que uno que se explotó hasta el mes anterior a la
            escritura.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">Lo que aparece igual, siempre</h2>
          <dl className="space-y-4">
            <div className="border-l-2 border-zinc-700 pl-4">
              <dt className="text-zinc-200 font-medium">Impuesto de sellos</dt>
              <dd className="text-zinc-400 text-xs mt-1">
                Provincial, sobre la escritura. Entre el 1% y el 3,6% según la jurisdicción, calculado sobre
                el precio o la valuación fiscal, la mayor. Se suele repartir mitad y mitad, pero es
                negociable y conviene dejarlo escrito en el boleto. Cada provincia cambia su código fiscal
                todos los años: el número exacto se verifica en la agencia de recaudación.
              </dd>
            </div>
            <div className="border-l-2 border-zinc-700 pl-4">
              <dt className="text-zinc-200 font-medium">Inmobiliario rural al día</dt>
              <dd className="text-zinc-400 text-xs mt-1">
                Sin libre deuda no se escritura. Es de las cosas que más demoran una operación armada,
                porque la deuda aparece cuando el escribano pide el certificado y no antes.
              </dd>
            </div>
            <div className="border-l-2 border-zinc-700 pl-4">
              <dt className="text-zinc-200 font-medium">Bienes Personales</dt>
              <dd className="text-zinc-400 text-xs mt-1">
                El campo sale del patrimonio, pero entra el dinero. Según en qué quede ese dinero al 31 de
                diciembre, el impuesto del año de la venta puede ser mayor que el de los años en que el campo
                figuraba a valuación fiscal.
              </dd>
            </div>
            <div className="border-l-2 border-zinc-700 pl-4">
              <dt className="text-zinc-200 font-medium">Honorarios y gastos</dt>
              <dd className="text-zinc-400 text-xs mt-1">
                Escribano, certificado catastral, informes de dominio e inhibiciones, y la comisión de quien
                intermedió. En una operación rural la mensura, cuando hace falta, se lleva más tiempo que
                plata.
              </dd>
            </div>
          </dl>
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

        <div className="border border-zinc-800 rounded px-4 py-3 bg-zinc-900/50 mb-8">
          <p className="text-zinc-500 text-xs leading-relaxed">
            Esto es una explicación general de cómo está armado el tema, no asesoramiento tributario. Las
            normas citadas son las vigentes al momento de escribir esta página y el encuadre de cada
            operación depende de datos concretos —fecha de adquisición, destino del campo, residencia del
            vendedor— que hay que revisar caso por caso con un profesional.
          </p>
        </div>

        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/como-vender-un-campo" className="text-zinc-500 hover:text-accent">Cómo vender un campo</Link>
          <Link href="/como-comprar-un-campo" className="text-zinc-500 hover:text-accent">Cómo comprar un campo</Link>
          <Link href="/campos/valuar" className="text-zinc-500 hover:text-accent">¿Cuánto vale mi campo?</Link>
          <Link href="/impuesto-de-sellos-arrendamiento" className="text-zinc-500 hover:text-accent">Sellos en el arrendamiento</Link>
        </div>
      </div>
    </>
  )
}
