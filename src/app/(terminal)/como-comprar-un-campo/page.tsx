import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, FAQPageSchema } from '@/components/seo/JsonLd'
import { PROVINCIAS_CON_DATO } from '@/lib/campos-seo'
import CapturaCampoForm from '@/components/campos/CapturaCampoForm'

export const revalidate = 86400

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/como-comprar-un-campo`

export const metadata: Metadata = {
  title: 'Cómo comprar un campo — requisitos, papeles y qué mirar antes de señar',
  description:
    'Guía para comprar un campo en Argentina: qué papeles pedir antes de señar, informe de dominio, mensura, arrendamientos vigentes, límites a la titularidad extranjera, costos de la operación y cuánto vale la hectárea en cada provincia.',
  keywords: [
    'como comprar un campo',
    'requisitos para comprar un campo',
    'comprar campo',
    'que papeles pedir para comprar un campo',
    'comprar campo en argentina',
    'compra y venta de campos',
  ],
  openGraph: { title: 'Cómo comprar un campo', url: PAGE_URL, type: 'article' },
  alternates: { canonical: PAGE_URL },
}

const FAQ = [
  {
    question: '¿Qué requisitos hay para comprar un campo en Argentina?',
    answer:
      'Para un argentino o un residente, los mismos que para cualquier inmueble: CUIT o CUIL, capacidad para contratar y poder acreditar el origen de los fondos, porque el escribano actúa como sujeto obligado ante la unidad antilavado. Para extranjeros hay un requisito adicional: la ley de tierras rurales limita cuánta superficie rural puede quedar en manos extranjeras y exige un certificado de habilitación antes de escriturar.',
  },
  {
    question: '¿Qué papeles hay que pedir antes de señar?',
    answer:
      'Informe de dominio, para ver quién es el titular y si hay hipotecas o embargos. Informe de inhibiciones del vendedor. Certificado catastral y plano de mensura, para saber qué superficie es la real y no la que dice el aviso. Libre deuda del inmobiliario provincial. Y algo que se olvida seguido: si hay un contrato de arrendamiento vigente, porque el contrato sigue al campo y el comprador lo hereda.',
  },
  {
    question: '¿Cuánto cuesta la operación además del precio del campo?',
    answer:
      'Entre sellos provinciales, honorarios del escribano, certificados e informes, la comisión de quien intermedió y la mensura si hace falta, hay que contar un porcentaje sobre el precio que no es menor. Los sellos solos van del 1% al 3,6% según la provincia y suelen repartirse entre las partes.',
  },
  {
    question: '¿Se puede comprar un campo con crédito?',
    answer:
      'Se puede, pero en la práctica el mercado de campos argentino se mueve mayormente al contado. Cuando hay financiación, casi siempre es del propio vendedor: un saldo de precio garantizado con hipoteca, a plazos, y muchas veces indexado en kilos de novillo o en quintales de soja en lugar de en pesos.',
  },
]

const CHECKLIST = [
  {
    t: 'Informe de dominio',
    d: 'Quién figura como titular, y si sobre el campo pesan hipotecas, embargos o usufructos. Es el papel que evita la mayoría de los problemas.',
  },
  {
    t: 'Inhibiciones del vendedor',
    d: 'Una inhibición general de bienes impide vender, aunque el título esté impecable.',
  },
  {
    t: 'Certificado catastral y plano de mensura',
    d: 'La superficie real casi nunca es exactamente la del aviso. La mensura además define los límites, que es donde nacen los conflictos con linderos.',
  },
  {
    t: 'Libre deuda del inmobiliario',
    d: 'Sin esto no se escritura. Suele aparecer tarde y demorar operaciones ya cerradas.',
  },
  {
    t: 'Arrendamientos vigentes',
    d: 'El contrato sigue al campo. Comprar con un arrendamiento de tres años por delante es una decisión, no una sorpresa que se descubre después.',
  },
  {
    t: 'Agua y energía',
    d: 'Perforaciones, molinos, represas, tendido eléctrico. En zonas de cría el agua define la carga posible más que la superficie.',
  },
  {
    t: 'Superficie útil, no total',
    d: 'Bajos inundables, médanos, monte cerrado, caminos y calles internas. Un campo de mil hectáreas con trescientas de bajo no es un campo de mil hectáreas.',
  },
  {
    t: 'Accesos',
    d: 'Camino de tierra que se corta con lluvia, servidumbre de paso por campo ajeno, distancia al asfalto. Afecta el valor y la operación diaria.',
  },
  {
    t: 'RENSPA y situación sanitaria',
    d: 'Si el campo viene con actividad, conviene saber en qué estado está el establecimiento ante SENASA.',
  },
  {
    t: 'Zona de frontera',
    d: 'Los campos en zona de seguridad de frontera requieren conformidad previa. Es un trámite, pero hay que empezarlo temprano.',
  },
]

export default function ComoComprarCampoPage() {
  const baratas = [...PROVINCIAS_CON_DATO].sort((a, b) => a.usd_ha - b.usd_ha).slice(0, 6)
  return (
    <>
      <SectionBreadcrumbSchema section="campos" sectionName="Campos" />
      <FAQPageSchema items={FAQ} />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <Link href="/campos" className="text-zinc-500 hover:text-accent text-xs">← Campos</Link>

        <h1 className="text-zinc-100 text-2xl font-medium mt-4 mb-3">Cómo comprar un campo</h1>
        <p className="text-zinc-300 text-base mb-6">
          Comprar un campo se parece poco a comprar una casa. El precio por hectárea es apenas la puerta de
          entrada: lo que define si la operación fue buena son cosas que no están en el aviso —cuánta
          superficie es realmente aprovechable, si hay agua, cómo se entra cuando llueve, y qué dice el
          título. Esta guía ordena qué mirar y en qué momento.
        </p>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">1. Saber qué se está comprando</h2>
          <p className="text-zinc-400 mb-3">
            Antes que el precio, la aptitud. Un campo de cría, uno de invernada y uno agrícola se compran por
            razones distintas y se pagan con lógicas distintas: el agrícola se paga por lo que rinde en
            quintales, el ganadero por lo que puede criar. Mezclar las dos varas es el error más caro que se
            comete en este mercado — tasar un campo de la zona núcleo con kilos de hacienda da un número que
            no tiene nada que ver con lo que se paga.
          </p>
          <p className="text-zinc-400">
            La medida que ordena todo en un campo ganadero es la receptividad: cuántos animales sostiene por
            hectárea a lo largo del año, no en el mejor mes.{' '}
            <Link href="/que-es-el-equivalente-vaca" className="text-accent hover:underline">
              El equivalente vaca
            </Link>{' '}
            y{' '}
            <Link href="/como-se-calcula-la-carga-animal" className="text-accent hover:underline">
              la carga animal
            </Link>{' '}
            son el idioma para comparar dos campos que a simple vista parecen iguales.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">2. Qué pedir antes de poner un peso</h2>
          <p className="text-zinc-400 mb-4">
            Toda esta lista se pide <em>antes</em> de la seña, no después. Una seña entregada es plata en
            juego y cambia por completo la posición para negociar cualquier cosa que aparezca.
          </p>
          <dl className="space-y-3">
            {CHECKLIST.map((c) => (
              <div key={c.t} className="border-l-2 border-zinc-700 pl-4">
                <dt className="text-zinc-200 font-medium">{c.t}</dt>
                <dd className="text-zinc-400 text-xs mt-0.5">{c.d}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">3. Si el comprador es extranjero</h2>
          <p className="text-zinc-400">
            La ley de tierras rurales pone un techo a cuánta superficie rural puede estar en manos
            extranjeras, tanto a nivel país como por partido y por nacionalidad, y fija un máximo de
            hectáreas por titular referido a la zona núcleo. Antes de escriturar hay que tramitar el
            certificado de habilitación en el registro nacional correspondiente. No es un impedimento, pero
            es un plazo: conviene arrancarlo apenas hay acuerdo, no cuando la escritura ya está agendada.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">4. Boleto, seña y escritura</h2>
          <p className="text-zinc-400 mb-3">
            Lo habitual es una reserva, después un boleto de compraventa con una seña, y finalmente la
            escritura. En el boleto se define lo que después no se discute: quién paga los sellos, en qué
            plazo se entrega la posesión, qué pasa con los animales y las mejoras, qué se hace si aparece una
            deuda vieja, y en qué moneda y en qué lugar se paga.
          </p>
          <p className="text-zinc-400">
            La posesión merece un párrafo propio. En un campo puede entregarse antes o después de la
            escritura, y de eso dependen cosas concretas: quién cobra el arrendamiento del período, quién
            paga el inmobiliario, quién carga con la sequía o el granizo que caiga en el medio.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-zinc-200 text-lg font-medium mb-3">5. Cuánto vale la hectárea donde estás mirando</h2>
          <p className="text-zinc-400 mb-4">
            Nuestro relevamiento por provincia y por zona, con la fuente y la fecha de cada dato. Sirve para
            saber si el precio que te pasaron está dentro del mercado o afuera.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs mb-3">
            {PROVINCIAS_CON_DATO.map((p) => (
              <Link
                key={p.slug}
                href={`/campos/valor-hectarea/${p.slug}`}
                className="text-zinc-400 hover:text-accent transition-colors"
              >
                {p.provincia}{' '}
                <span className="font-mono tabular-nums text-zinc-600">
                  US${p.usd_ha.toLocaleString('es-AR')}
                </span>
              </Link>
            ))}
          </div>
          <p className="text-zinc-600 text-xxs">
            Las más accesibles hoy: {baratas.map((p) => p.provincia).join(', ')}.
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
          <p className="text-zinc-100 text-base font-medium mb-1">¿Estás buscando campo?</p>
          <p className="text-zinc-400 mb-4">
            Decinos zona, superficie y para qué lo querés, y te avisamos cuando aparezca algo que encaje.
            Te escribimos nosotros: tu contacto no circula.
          </p>
          <CapturaCampoForm tipo="busco" origen="guia-comprar" />
        </section>

        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/impuestos-por-la-venta-de-un-campo" className="text-zinc-500 hover:text-accent">Impuestos de la operación</Link>
          <Link href="/creditos-para-comprar-un-campo" className="text-zinc-500 hover:text-accent">Financiación y créditos</Link>
          <Link href="/como-vender-un-campo" className="text-zinc-500 hover:text-accent">Cómo vender un campo</Link>
          <Link href="/campos/valuar" className="text-zinc-500 hover:text-accent">Tasador de campos</Link>
        </div>
      </div>
    </>
  )
}
