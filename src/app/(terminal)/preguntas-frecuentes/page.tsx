import { Metadata } from 'next'
import Link from 'next/link'
import { FAQPageSchema, SectionBreadcrumbSchema } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Preguntas Frecuentes — Remates Ganaderos',
  description: 'Respuestas a las preguntas más frecuentes sobre remates de ganado en Argentina: cómo participar, qué es una consignataria, dónde ver remates en vivo, y más.',
  openGraph: {
    title: 'Preguntas Frecuentes — Remates Ganaderos',
    description: 'Todo lo que necesitás saber sobre remates de ganado en Argentina: cómo comprar, vender, y participar en subastas ganaderas.',
    url: 'https://www.consignatarias.com.ar/preguntas-frecuentes',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/preguntas-frecuentes',
  },
}

interface FAQ {
  question: string
  answer: string
  links?: { href: string; text: string }[]
}

const FAQS: FAQ[] = [
  {
    question: '¿Qué es una consignataria de hacienda?',
    answer: 'Una consignataria de hacienda es una empresa intermediaria habilitada por matrícula que organiza remates de ganado. Actúa entre productores (vendedores) y compradores, garantizando la operación y cobrando una comisión sobre la venta. Las consignatarias se encargan de la logística, documentación y cobro de las operaciones.',
    links: [{ href: '/consignatarias', text: 'Ver directorio de consignatarias' }],
  },
  {
    question: '¿Cómo participar en un remate de ganado?',
    answer: 'Para participar en un remate de ganado, primero debés registrarte con la consignataria organizadora. Generalmente necesitás CUIT, documentación fiscal al día y referencias comerciales. Podés participar presencialmente en el lugar del remate o, en muchos casos, de forma online a través de plataformas de streaming. Antes del remate, es recomendable revisar el catálogo y las condiciones de venta.',
    links: [{ href: '/remates', text: 'Ver próximos remates' }],
  },
  {
    question: '¿Dónde puedo ver remates de ganado en vivo?',
    answer: 'Muchas consignatarias transmiten sus remates en vivo por YouTube, Facebook o plataformas propias. En nuestra web podés encontrar los links de transmisión de cada remate cuando están disponibles. Además, algunas consignatarias permiten ofertar online durante la transmisión.',
    links: [{ href: '/remates?tipo=tv', text: 'Ver remates con transmisión TV' }],
  },
  {
    question: '¿Qué tipos de remates ganaderos existen?',
    answer: 'Existen varios tipos de remates según el ganado comercializado: Invernada (terneros y novillitos para engorde), Cría (vientres y reproductores), General (mezcla de categorías), Especial (genética premium, pedigree) y Reproductores (toros de cabaña). Cada tipo tiene su dinámica de precios y compradores típicos.',
    links: [
      { href: '/remates?tipo=invernada', text: 'Remates de invernada' },
      { href: '/remates?tipo=cria', text: 'Remates de cría' },
    ],
  },
  {
    question: '¿Qué es el INMAG y para qué sirve?',
    answer: 'El INMAG (Índice Novillo Mercado Agroganadero) es el precio de referencia del kilogramo vivo de novillo en Argentina. Lo publica diariamente el Mercado Agroganadero de Liniers y es el principal indicador de precios de la hacienda vacuna. Sirve para comparar ofertas y evaluar la evolución del mercado.',
    links: [{ href: '/mercado/inmag', text: 'Ver precio INMAG actual' }],
  },
  {
    question: '¿Cómo se determina el precio en un remate?',
    answer: 'El precio se determina por subasta: el martillero inicia con un precio base y los compradores van ofertando hasta que nadie supere la última oferta. El precio final puede expresarse por cabeza o por kilogramo vivo. En remates "a la balanza", los animales se pesan y el precio total se calcula multiplicando kilos por $/kg ofertado.',
  },
  {
    question: '¿Qué comisión cobran las consignatarias?',
    answer: 'La comisión típica de las consignatarias oscila entre el 2% y el 5% sobre el valor de la venta, dependiendo del volumen y tipo de operación. Algunas cobran comisión tanto al comprador como al vendedor. Además pueden existir gastos adicionales por documentación, transporte o estadía del ganado.',
  },
  {
    question: '¿Qué documentación necesito para vender ganado en remate?',
    answer: 'Para vender ganado necesitás: DTE (Documento de Tránsito Electrónico) emitido por SENASA, certificado de vacunación aftosa vigente, marca o señal registrada, y documentación fiscal (CUIT, inscripción en Renspa). La consignataria te guiará en el proceso documental.',
  },
  {
    question: '¿Qué es un remate feria vs remate televisado?',
    answer: 'Un remate feria es presencial, en instalaciones de la consignataria o un predio ganadero, donde compradores y vendedores asisten físicamente. Un remate televisado se transmite en vivo (YouTube, TV, plataformas web) permitiendo participación remota. Muchos remates combinan ambas modalidades.',
  },
  {
    question: '¿Cómo crear alertas de remates de ganado?',
    answer: 'En Consignatarias.com.ar podés configurar alertas para recibir notificaciones cuando se publiquen remates que cumplan tus criterios: provincia, tipo de ganado, consignataria específica, etc. Los usuarios PRO tienen acceso a alertas avanzadas con mayor frecuencia y filtros adicionales.',
    links: [{ href: '/alertas', text: 'Configurar alertas' }],
  },
  {
    question: '¿Qué significa "hacienda en pie"?',
    answer: 'Hacienda en pie es el término que refiere al ganado bovino vivo, en contraposición a la carne ya faenada. En los remates se comercializa "hacienda en pie" que luego puede destinarse a invernada (engorde) o faena (frigoríficos).',
  },
  {
    question: '¿Qué es la invernada?',
    answer: 'La invernada es la etapa de engorde del ganado bovino, desde el destete hasta alcanzar el peso de faena. Los remates de invernada comercializan terneros y novillitos que los compradores llevan a sus campos para engordar. Es la categoría más voluminosa del mercado.',
    links: [{ href: '/remates?tipo=invernada', text: 'Ver remates de invernada' }],
  },
  {
    question: '¿Qué diferencia hay entre novillo y vaquillona?',
    answer: 'El novillo es el macho bovino castrado destinado a engorde para faena. La vaquillona es la hembra joven que aún no ha tenido cría; puede destinarse a faena o a reproducción. Ambas categorías se comercializan en remates de invernada, generalmente con precios diferenciados.',
  },
  {
    question: '¿Qué es un frigorífico habilitado?',
    answer: 'Un frigorífico habilitado es una planta de faena y procesamiento de carne que cuenta con autorización de SENASA para operar. Cada frigorífico tiene un número de establecimiento oficial y está sujeto a inspecciones sanitarias. Solo pueden faenar ganado con documentación en regla.',
    links: [{ href: '/frigorificos', text: 'Ver directorio de frigoríficos' }],
  },
  {
    question: '¿Cómo funciona el pago en un remate?',
    answer: 'Las condiciones de pago varían según la consignataria y el remate. Lo más común es pago contado (hasta 72 horas post-remate) con descuento, o pago diferido a 30-60 días con documentación (cheque, pagaré). La consignataria actúa como garante de la operación.',
  },
  {
    question: '¿Puedo comprar ganado sin ser productor?',
    answer: 'Sí, cualquier persona física o jurídica puede participar en remates ganaderos cumpliendo los requisitos de la consignataria (registro previo, documentación). Sin embargo, para retirar el ganado necesitás un establecimiento con Renspa habilitado o coordinar el destino con un frigorífico o campo autorizado.',
  },
]

export default function FAQPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="preguntas-frecuentes" sectionName="Preguntas Frecuentes" />
      <FAQPageSchema items={FAQS.map(f => ({ question: f.question, answer: f.answer }))} />
      
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black">
        {/* Header */}
        <section className="relative py-16 border-b border-gray-800">
          <div className="container mx-auto px-4">
            {/* Breadcrumb */}
            <nav className="mb-6" aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-sm text-gray-400">
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    Inicio
                  </Link>
                </li>
                <li className="text-gray-600">/</li>
                <li className="text-white">Preguntas Frecuentes</li>
              </ol>
            </nav>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Preguntas Frecuentes
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl">
              Todo lo que necesitás saber sobre remates de ganado, consignatarias y el mercado ganadero argentino.
            </p>
          </div>
        </section>

        {/* FAQ List */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="space-y-6">
              {FAQS.map((faq, index) => (
                <article
                  key={index}
                  className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors"
                >
                  <h2 className="text-xl font-semibold text-white mb-3">
                    {faq.question}
                  </h2>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    {faq.answer}
                  </p>
                  {faq.links && faq.links.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {faq.links.map((link, linkIndex) => (
                        <Link
                          key={linkIndex}
                          href={link.href}
                          className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          {link.text}
                          <span>→</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 border-t border-gray-800">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              ¿Tenés más preguntas?
            </h2>
            <p className="text-gray-400 mb-6 max-w-xl mx-auto">
              Explorá nuestro glosario ganadero con más de 38 términos técnicos, o contactanos directamente.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/glosario"
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Ver Glosario
              </Link>
              <Link
                href="/remates"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
              >
                Ver Próximos Remates
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
