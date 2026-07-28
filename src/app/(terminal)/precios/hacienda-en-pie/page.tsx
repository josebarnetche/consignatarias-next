import { Metadata } from 'next'
import Link from 'next/link'
import marketPrices from '@/lib/data/market-prices.json'
import { INMAG_DATE } from '@/lib/inmag'
import {
  SectionBreadcrumbSchema,
  FAQPageSchema,
} from '@/components/seo/JsonLd'

const fmt = (n: number) => n.toLocaleString('es-AR')

const CATS = [
  { slug: 'novillos', label: 'Novillo', promedioKg: 430 },
  { slug: 'novillitos', label: 'Novillito', promedioKg: 280 },
  { slug: 'vaquillonas', label: 'Vaquillona', promedioKg: 320 },
  { slug: 'vacas', label: 'Vaca', promedioKg: 380 },
  { slug: 'toros', label: 'Toro', promedioKg: 600 },
  { slug: 'terneros', label: 'Ternero', promedioKg: 180 },
] as const

const rows = CATS.map((c) => {
  const d = (marketPrices.categories as Record<
    string,
    { current: number; prev: number; change: number }
  >)[c.slug]
  return {
    ...c,
    price: Math.round(d.current),
    prev: Math.round(d.prev),
    change: d.change,
  }
})

const novillo = rows.find((r) => r.slug === 'novillos')!
const ternero = rows.find((r) => r.slug === 'terneros')!
const inmag = Math.round(marketPrices.inmag.current)
const inmagChange = marketPrices.inmag.change
const inmagChangeStr = `${inmagChange >= 0 ? '+' : ''}${inmagChange}%`
const lastUpdate = marketPrices.lastUpdate

const FAQ = [
  {
    question: '¿Cuánto está el kilo vivo de novillo hoy?',
    answer: `Hoy el kilo vivo de novillo está a $${fmt(novillo.price)} (INMAG ${inmagChangeStr} semanal). Actualizado ${lastUpdate} desde Mercado Agroganadero.`,
  },
  {
    question: '¿Cuánto está el kilo de novillo en pie?',
    answer: `El kilo de novillo en pie (peso vivo) cotiza a $${fmt(novillo.price)} hoy (INMAG, ${INMAG_DATE}; ${inmagChangeStr} semanal). "En pie" significa el animal vivo, antes de la faena; es la referencia del Mercado Agroganadero de Buenos Aires.`,
  },
  {
    question: '¿Cuál es el precio de la hacienda en pie hoy?',
    answer: `Precios hacienda en pie ${lastUpdate}: novillo $${fmt(novillo.price)}/kg, vaquillona $${fmt(rows.find((r) => r.slug === 'vaquillonas')!.price)}/kg, vaca $${fmt(rows.find((r) => r.slug === 'vacas')!.price)}/kg, ternero $${fmt(ternero.price)}/kg, novillito $${fmt(rows.find((r) => r.slug === 'novillitos')!.price)}/kg, toro $${fmt(rows.find((r) => r.slug === 'toros')!.price)}/kg.`,
  },
  {
    question: '¿Cuánto sale un ternero vivo en Argentina 2026?',
    answer: `Un ternero de invernada (180 kg promedio) sale aproximadamente $${fmt(ternero.price * 180)} a precio de mercado ($${fmt(ternero.price)}/kg vivo). El precio varía según peso, terminación y plaza.`,
  },
  {
    question: '¿Qué es la hacienda en pie?',
    answer: 'La hacienda en pie es el ganado bovino vivo cotizado por kilo de peso, antes de la faena. Los precios se publican diariamente por el Mercado Agroganadero (INMAG) y son la referencia de toda la cadena productiva argentina.',
  },
  {
    question: '¿Cómo se calcula el precio de un kilo vivo?',
    answer: 'El precio del kilo vivo surge de las operaciones diarias en el Mercado Agroganadero de Buenos Aires y se publica como índice INMAG por categoría. La negociación es a peso vivo en remates físicos, ferias regionales y operaciones directas.',
  },
]

export const metadata: Metadata = {
  title: `Precio Hacienda en Pie Hoy — Novillo $${fmt(novillo.price)}/kg | Argentina ${lastUpdate}`,
  description: `Precios hacienda en pie en Argentina: novillo $${fmt(novillo.price)}, ternero $${fmt(ternero.price)}, vaquillona $${fmt(rows.find((r) => r.slug === 'vaquillonas')!.price)}, vaca $${fmt(rows.find((r) => r.slug === 'vacas')!.price)} ($/kg vivo). INMAG ${inmagChangeStr}. Actualizado ${lastUpdate}.`,
  keywords: [
    'hacienda en pie',
    'precio hacienda en pie',
    'kilo de novillo',
    'kg novillo',
    'precio kilo vivo novillo',
    'cuanto esta el kilo vivo de novillo',
    'precio del kilo vivo de novillo',
    'precio ganado argentina',
    'INMAG hoy',
    'mercado agroganadero',
  ],
  openGraph: {
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
    title: `Hacienda en Pie Hoy — INMAG $${fmt(inmag)} (${inmagChangeStr})`,
    description: `Precios kilo vivo por categoría · Novillo $${fmt(novillo.price)} · Ternero $${fmt(ternero.price)} · Actualizado ${lastUpdate}.`,
    url: 'https://www.consignatarias.com.ar/precios/hacienda-en-pie',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/precios/hacienda-en-pie',
  },
}

export default function HaciendaEnPiePage() {
  return (
    <>
      <SectionBreadcrumbSchema
        section="precios/hacienda-en-pie"
        sectionName="Hacienda en pie"
      />
      <FAQPageSchema items={FAQ} />

      <div className="px-4 py-6 max-w-4xl mx-auto">
        <div className="mb-2 text-xxs font-terminal uppercase tracking-wider text-zinc-500">
          <Link href="/mercado" className="hover:text-zinc-300">
            Mercado
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">Hacienda en pie</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-heading text-zinc-100 mb-1 leading-tight">
          Precio hacienda en pie hoy
        </h1>
        <p className="text-zinc-400 text-sm mb-6">
          INMAG $<span className="font-terminal tabular-nums">{fmt(inmag)}</span>/kg vivo (
          {inmagChangeStr} semanal) · Actualizado {lastUpdate}
        </p>

        {/* Big table */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">Cotizaciones por categoría</div>
          <div className="divide-y divide-terminal-border">
            {rows.map((r) => {
              const changeStr = `${r.change >= 0 ? '+' : ''}${r.change}%`
              const color = r.change >= 0 ? '#34d399' : '#f87171'
              return (
                <Link
                  key={r.slug}
                  href={`/precios/${r.slug}`}
                  className="px-panel py-3 flex items-center justify-between hover:bg-zinc-900/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-zinc-200 font-medium text-data">
                      {r.label}
                    </div>
                    <div className="text-zinc-600 text-xxs">
                      Promedio {r.promedioKg}kg · ${fmt(r.price * r.promedioKg)} por cabeza
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-zinc-100 font-terminal tabular-nums">
                      ${fmt(r.price)} <span className="text-zinc-600 text-xxs">/kg</span>
                    </div>
                    <div className="text-xxs font-terminal tabular-nums" style={{ color }}>
                      {changeStr}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* FAQ */}
        <div className="terminal-panel mb-6">
          <div className="terminal-panel-header">Preguntas frecuentes</div>
          <div className="px-panel py-4 space-y-4 text-data">
            {FAQ.map((f, i) => (
              <div
                key={f.question}
                className={i === 0 ? '' : 'border-t border-terminal-border pt-4'}
              >
                <p className="text-zinc-300 mb-1">{f.question}</p>
                <p className="text-zinc-500 leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-zinc-600 text-xxs text-center">
          Fuente: INMAG (Mercado Agroganadero de Buenos Aires) ·{' '}
          <Link href="/mercado" className="text-zinc-500 hover:text-zinc-300 underline-offset-2 hover:underline">
            Ver gráfico histórico
          </Link>
        </p>
      </div>
    </>
  )
}
