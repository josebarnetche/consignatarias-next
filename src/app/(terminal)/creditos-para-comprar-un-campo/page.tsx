import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, FAQPageSchema } from '@/components/seo/JsonLd'

export const revalidate = 86400

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/creditos-para-comprar-un-campo`

export const metadata: Metadata = {
  title: 'Créditos y financiación para comprar un campo',
  description:
    'Cómo se financia la compra de un campo en Argentina: créditos hipotecarios rurales, financiación del vendedor, saldo de precio en kilos de novillo o quintales, permuta y leasing. Qué se usa de verdad y qué exige cada camino.',
  keywords: [
    'creditos hipotecarios rurales',
    'campos financiados',
    'credito para comprar campo',
    'financiacion compra de campo',
    'hipoteca rural',
    'comprar campo en cuotas',
  ],
  openGraph: { title: 'Créditos y financiación para comprar un campo', url: PAGE_URL, type: 'article' },
  alternates: { canonical: PAGE_URL },
}

const FAQ = [
  {
    question: '¿Existen créditos hipotecarios para comprar un campo?',
    answer:
      'Existen, con garantía hipotecaria sobre el propio inmueble, pero son mucho menos habituales que en la compra de una vivienda. Los bancos suelen financiar una parte del valor —no la totalidad—, piden que el comprador demuestre ingresos de la actividad y exigen tasación propia. Las condiciones concretas cambian con la coyuntura, así que el número hay que pedirlo en el banco al momento de la operación.',
  },
  {
    question: '¿Qué significa que un campo se venda financiado?',
    answer:
      'Casi siempre significa que financia el vendedor, no un banco. Se entrega una parte al contado, se escritura, y el saldo queda documentado en cuotas con hipoteca en primer grado a favor del vendedor. Es la forma más común de comprar un campo en cuotas en Argentina.',
  },
  {
    question: '¿En qué moneda se pactan las cuotas?',
    answer:
      'En dólares, o en producto: tantos kilos de novillo o tantos quintales de soja por cuota, liquidados al precio del momento de pago. Pactar en producto tiene una ventaja para las dos partes: la cuota se mueve con lo que el campo genera, así que un año malo no rompe el esquema.',
  },
  {
    question: '¿Se puede pagar un campo con hacienda o con granos?',
    answer:
      'Sí, y es más habitual de lo que parece. Se llama permuta o dación en pago y funciona cuando el vendedor quiere quedarse en la actividad. Tiene tratamiento impositivo propio y hay que valuar lo que se entrega en el mismo acto, así que conviene armarlo con escribano y contador desde el principio.',
  },
]

export default function CreditosCampoPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="campos" sectionName="Campos" />
      <FAQPageSchema items={FAQ} />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <Link href="/campos" className="text-zinc-500 hover:text-accent text-xs">← Campos</Link>

        <h1 className="text-zinc-100 text-2xl font-medium mt-4 mb-3">
          Créditos y financiación para comprar un campo
        </h1>
        <p className="text-zinc-300 text-base mb-6">
          Conviene empezar por lo que nadie dice en los avisos: el mercado de campos argentino se mueve, en
          su enorme mayoría, <strong className="text-zinc-100">al contado y en dólares</strong>. El crédito
          hipotecario rural existe, pero no es la forma habitual de comprar. Cuando aparece la palabra
          &ldquo;financiado&rdquo;, en nueve de cada diez casos financia el vendedor.
        </p>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">El saldo de precio con hipoteca</h2>
          <p className="text-zinc-400 mb-3">
            Es el camino más transitado. El comprador entrega una parte al contado, se escritura la
            compraventa, y el saldo queda documentado en cuotas con una hipoteca en primer grado a favor del
            vendedor. El comprador es dueño desde el día uno y trabaja el campo; el vendedor tiene la
            garantía sobre el mismo inmueble si las cuotas no entran.
          </p>
          <p className="text-zinc-400">
            Lo que hay que dejar cerrado en el boleto: plazo, cantidad de cuotas, moneda, qué pasa si se
            atrasa una, y si el comprador puede cancelar anticipadamente y con qué quita.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">Cuotas en producto, no en pesos</h2>
          <p className="text-zinc-400 mb-3">
            Muchas operaciones se pactan en{' '}
            <strong className="text-zinc-100">kilos de novillo</strong> o en quintales de soja por cuota,
            liquidados al precio vigente el día de pago. Es la misma lógica con la que se pacta un
            arrendamiento, y por las mismas razones: la cuota se mueve con lo que el campo produce, así que
            no hay que adivinar la inflación ni el tipo de cambio de acá a cinco años.
          </p>
          <p className="text-zinc-400">
            Si vas a pactar en kilos, definí con qué índice se liquida y con qué período: no es lo mismo el
            precio del día que el promedio del mes anterior.{' '}
            <Link href="/mercado/arrendamiento" className="text-accent hover:underline">
              El índice de arrendamiento
            </Link>{' '}
            publica el valor que se usa como referencia en el mercado.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">El crédito bancario, cuando aparece</h2>
          <p className="text-zinc-400 mb-3">
            Un crédito con garantía hipotecaria sobre el campo suele financiar una parte del valor y no el
            total, con tasación hecha por el propio banco —que casi nunca coincide con el precio de la
            operación— y con exigencia de demostrar ingresos de la actividad. El campo queda hipotecado hasta
            la cancelación, lo que limita venderlo o volver a gravarlo mientras dure.
          </p>
          <p className="text-zinc-400">
            Las líneas y las tasas cambian con la coyuntura y con cada banco, así que cualquier número que
            aparezca escrito en una página pierde vigencia rápido. Lo que no cambia es lo que van a pedir:
            título perfecto, mensura, libre deuda y ordenada la situación fiscal del comprador.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">Otras formas que se usan</h2>
          <dl className="space-y-4">
            <div className="border-l-2 border-zinc-700 pl-4">
              <dt className="text-zinc-200 font-medium">Permuta</dt>
              <dd className="text-zinc-400 text-xs mt-1">
                Campo por hacienda, por granos, por otro campo o por departamentos. Funciona cuando el
                vendedor quiere seguir en la actividad y no quedarse con el dinero quieto. Hay que valuar lo
                que se entrega en el mismo acto y revisar el encuadre impositivo, que no es el de una venta
                común.
              </dd>
            </div>
            <div className="border-l-2 border-zinc-700 pl-4">
              <dt className="text-zinc-200 font-medium">Leasing</dt>
              <dd className="text-zinc-400 text-xs mt-1">
                Menos habitual en tierra que en maquinaria, pero existe: se usa el campo pagando un canon y
                queda una opción de compra al final. Tiene ventajas de deducción para quien tributa por la
                actividad.
              </dd>
            </div>
            <div className="border-l-2 border-zinc-700 pl-4">
              <dt className="text-zinc-200 font-medium">Compra entre varios</dt>
              <dd className="text-zinc-400 text-xs mt-1">
                Condominio o sociedad. Baja el ticket pero sube la letra chica: cómo se decide, cómo se
                reparte la renta, y sobre todo cómo sale el que se quiere ir. Ese último punto es el que
                rompe la mayoría de los condominios, y se resuelve escribiéndolo antes de comprar.
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
            Esta página explica cómo se estructuran las operaciones, no ofrece créditos ni asesoramiento
            financiero. Las condiciones de cada línea las fija cada banco y cambian seguido.
          </p>
        </div>

        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/como-comprar-un-campo" className="text-zinc-500 hover:text-accent">Cómo comprar un campo</Link>
          <Link href="/campos/valuar" className="text-zinc-500 hover:text-accent">Cuánto vale la hectárea</Link>
          <Link href="/impuestos-por-la-venta-de-un-campo" className="text-zinc-500 hover:text-accent">Impuestos de la operación</Link>
        </div>
      </div>
    </>
  )
}
