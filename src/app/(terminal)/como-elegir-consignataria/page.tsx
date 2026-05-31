import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, HowToSchema, FAQPageSchema } from '@/components/seo/JsonLd'

const APP_URL = 'https://www.consignatarias.com.ar'

export const metadata: Metadata = {
  title: 'Cómo Elegir una Consignataria de Hacienda — Guía 2026',
  description:
    'Cómo elegir consignataria de hacienda en Argentina: matrícula y habilitación, plaza y zona, comisión y días de cobro, medios de pago, frecuencia de remates y reputación. Guía paso a paso con los 7 criterios que importan.',
  keywords: [
    'cómo elegir consignataria', 'elegir consignataria de hacienda', 'mejor consignataria',
    'comisión consignataria hacienda', 'consignataria de confianza', 'qué consignataria elegir',
  ],
  openGraph: {
    title: 'Cómo Elegir una Consignataria de Hacienda — Guía 2026',
    description: 'Los 7 criterios para elegir consignataria: matrícula, plaza, comisión, días de cobro, medios de pago, frecuencia y reputación.',
    url: `${APP_URL}/como-elegir-consignataria`,
    type: 'article',
  },
  alternates: { canonical: `${APP_URL}/como-elegir-consignataria` },
}

export const revalidate = false

const STEPS = [
  {
    name: 'Definí qué vas a vender y a qué objetivo',
    text: 'No es lo mismo vender invernada, gordo para faena, vientres o reproductores de cabaña. Elegí una consignataria con experiencia y compradores en tu categoría: la que llena un remate de invernada no es necesariamente la mejor para reproductores.',
  },
  {
    name: 'Verificá matrícula y habilitación',
    text: 'La consignataria debe estar matriculada y habilitada para operar hacienda (ALyC / registro correspondiente). Es la garantía de que la operación y la liquidación están respaldadas. Desconfiá de intermediarios sin matrícula.',
  },
  {
    name: 'Mirá la plaza y la zona donde opera',
    text: 'Una consignataria fuerte en tu provincia o región concentra a los compradores de esa plaza. Revisá en qué provincias y localidades remata y con qué frecuencia: más compradores activos en tu zona = mejor precio.',
  },
  {
    name: 'Compará la comisión y los días de cobro',
    text: 'La comisión típica ronda el 2–4% sobre la venta, pero lo que más impacta en tu bolsillo es CUÁNDO cobrás. Una comisión baja con cobro a 30 días puede rendir menos que una comisión normal con cobro a 72 horas. Pedí ambos números por escrito.',
  },
  {
    name: 'Revisá los medios de pago',
    text: 'Transferencia, cheque, efectivo, al rinde, al gancho, USD o permuta: cada consignataria ofrece distintas formas y plazos. Asegurate de que el medio y el plazo se ajusten a tu necesidad de caja.',
  },
  {
    name: 'Evaluá la frecuencia y el volumen de remates',
    text: 'Una consignataria que remata seguido y mueve volumen tiene una base de compradores más líquida. Mirá su calendario de remates y el volumen histórico antes de decidir.',
  },
  {
    name: 'Chequeá la reputación y la trazabilidad',
    text: 'Referencias de otros productores, antigüedad, perfil verificado y transparencia en la liquidación. Una consignataria seria te muestra cómo se formó el precio y te entrega la liquidación clara.',
  },
]

const FAQS = [
  {
    question: '¿Cuánto cobra de comisión una consignataria de hacienda?',
    answer: 'La comisión de venta ronda habitualmente el 2% al 4% sobre el monto de la operación, más gastos de comercialización. El número exacto varía por consignataria, categoría y plaza — pedilo por escrito junto con el plazo de cobro, porque cuándo cobrás impacta tanto como cuánto te cobran.',
  },
  {
    question: '¿Qué tengo que mirar antes de elegir una consignataria?',
    answer: 'Siete cosas: (1) que opere en tu categoría, (2) matrícula y habilitación vigente, (3) plaza/zona donde concentra compradores, (4) comisión, (5) días de cobro, (6) medios de pago, y (7) reputación y transparencia en la liquidación.',
  },
  {
    question: '¿Conviene la consignataria con la comisión más baja?',
    answer: 'No necesariamente. Una comisión baja con cobro a 30 días puede dejarte menos plata en mano que una comisión normal con cobro a 72 horas, sobre todo con inflación. Compará el neto en mano y el plazo, no solo el porcentaje.',
  },
  {
    question: '¿Cómo sé si una consignataria está habilitada?',
    answer: 'Debe estar matriculada y habilitada para operar hacienda. En el directorio marcamos los perfiles verificados; ante la duda, pedí la matrícula y verificá que la liquidación venga a nombre de la consignataria habilitada.',
  },
]

export default function ComoElegirConsignatariaPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="como-elegir-consignataria" sectionName="Cómo elegir consignataria" />
      <HowToSchema
        name="Cómo elegir una consignataria de hacienda"
        description="Guía paso a paso con los 7 criterios para elegir consignataria de hacienda en Argentina: categoría, matrícula, plaza, comisión, días de cobro, medios de pago y reputación."
        steps={STEPS.map((s) => ({ name: s.name, text: s.text }))}
      />
      <FAQPageSchema items={FAQS} />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        <nav className="text-xs text-zinc-500 mb-4 flex items-center gap-1">
          <Link href="/" className="hover:text-zinc-300">Inicio</Link>
          <span>/</span>
          <Link href="/consignatarias" className="hover:text-zinc-300">Consignatarias</Link>
          <span>/</span>
          <span className="text-zinc-300">Cómo elegir</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-4">
          Cómo elegir una consignataria de hacienda
        </h1>

        {/* Answer-first lede */}
        <p className="text-zinc-300 mb-4">
          Para elegir bien una consignataria de hacienda mirá <strong className="text-zinc-100">siete cosas</strong>:
          que opere en tu categoría, su matrícula y habilitación, la plaza donde concentra compradores, la
          comisión, los días de cobro, los medios de pago y su reputación. El error más común es mirar solo el
          porcentaje de comisión e ignorar <strong className="text-zinc-100">cuándo cobrás</strong> — que suele
          pesar más en el neto en mano.
        </p>

        <div className="space-y-6 mt-8">
          {STEPS.map((s, i) => (
            <div key={s.name} className="border-l-2 border-amber-500/40 pl-4">
              <h2 className="text-zinc-100 font-medium mb-1">
                {i + 1}. {s.name}
              </h2>
              <p className="text-zinc-400">{s.text}</p>
            </div>
          ))}
        </div>

        {/* CTA → directory + comparador PRO */}
        <div className="mt-10 border border-zinc-800 bg-zinc-900/40 rounded-lg p-5">
          <p className="text-zinc-200 mb-3">
            Compará consignatarias por plaza, frecuencia y tipo de remate en el directorio — y con PRO, también
            por <strong className="text-amber-400">medios de pago y días de cobro</strong>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/consignatarias" className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 border border-amber-800/50 rounded px-3 py-1.5">
              Ver directorio de consignatarias →
            </Link>
            <Link href="/comparar" className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 border border-amber-800/50 rounded px-3 py-1.5">
              Comparar consignatarias →
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="border-t border-zinc-800 pt-6 mt-10">
          <h2 className="text-zinc-300 font-medium mb-4">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {FAQS.map((f) => (
              <details key={f.question} className="group">
                <summary className="text-zinc-200 cursor-pointer hover:text-zinc-100">{f.question}</summary>
                <p className="text-zinc-400 mt-2 pl-4">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
