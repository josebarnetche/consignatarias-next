import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  FAQPageSchema,
  SpeakableSchema,
  DatasetSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'
import maizNovilloHist from '@/lib/data/maiz-novillo-historico.json'
import SpreadClient from './SpreadClient'
import CompraLeadCapture from '@/components/leads/CompraLeadCapture'

export const revalidate = 86400

type PuntoRatio = { mes: string; ratio: number }

// ── Chart SVG del histórico de la relación maíz/novillo (2015→), server-rendered.
//    Línea de umbral 12:1 punteada. Eje X por fecha real. ──────────────────────
function RatioHistoricoChart({ serie, umbral }: { serie: PuntoRatio[]; umbral: number }) {
  const W = 720, H = 240, padX = 8, padY = 16
  const vals = serie.map((p) => p.ratio)
  const min = Math.max(0, Math.floor(Math.min(...vals) - 1))
  const max = Math.ceil(Math.max(...vals) + 1)
  const toT = (mes: string) => { const [y, m] = mes.split('-').map(Number); return y + (m - 1) / 12 }
  const ts = serie.map((p) => toT(p.mes))
  const tMin = ts[0], tMax = ts[ts.length - 1]
  const x = (i: number) => padX + ((ts[i] - tMin) / (tMax - tMin)) * (W - 2 * padX)
  const y = (v: number) => padY + (1 - (v - min) / (max - min)) * (H - 2 * padY)
  const path = serie.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.ratio).toFixed(1)}`).join(' ')
  const area = `${path} L${x(serie.length - 1).toFixed(1)},${H - padY} L${x(0).toFixed(1)},${H - padY} Z`
  const yearTicks = serie
    .map((p, i) => ({ year: p.mes.slice(0, 4), i }))
    .filter((t, idx, arr) => t.year !== arr[idx - 1]?.year && Number(t.year) % 2 === 0)
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" role="img" aria-label="Serie histórica de la relación maíz/novillo, 2015 a hoy">
        <defs>
          <linearGradient id="spreadfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[min, Math.round((min + max) / 2), max].map((v) => (
          <g key={v}>
            <line x1={padX} x2={W - padX} y1={y(v)} y2={y(v)} stroke="#27272a" strokeWidth="1" />
            <text x={padX} y={y(v) - 3} fill="#52525b" fontSize="10" fontFamily="monospace">{v}:1</text>
          </g>
        ))}
        {/* umbral de referencia */}
        {umbral >= min && umbral <= max && (
          <g>
            <line x1={padX} x2={W - padX} y1={y(umbral)} y2={y(umbral)} stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
            <text x={W - padX} y={y(umbral) - 3} fill="#fbbf24" fontSize="10" fontFamily="monospace" textAnchor="end" opacity="0.9">umbral {umbral}:1</text>
          </g>
        )}
        {yearTicks.map((t) => (
          <text key={t.year} x={x(t.i)} y={H - 3} fill="#52525b" fontSize="9" fontFamily="monospace" textAnchor="middle">{t.year}</text>
        ))}
        <path d={area} fill="url(#spreadfill)" />
        <path d={path} fill="none" stroke="#38bdf8" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

const PAGE_URL = 'https://www.consignatarias.com.ar/mercado/spread'

// ── Número vivo (se interpola en build; la página revalida a diario) ──────────
// Respetamos el MISMO cálculo del tool cliente (SpreadClient / /api/market/spread):
// spread = novillo en USD/kg ÷ maíz en USD/kg = kg de maíz que se compran con 1 kg
// de novillo vivo. A mayor valor, más margen para el engorde a corral.
const novillo = Math.round(marketPrices.categories.novillos.current) // ARS/kg vivo (INMAG)
const corn = marketPrices.corn.current // USD/tonelada (MAGyP FOB)
const usd = marketPrices.usdBlue.current // ARS/USD (referencia)
const lastUpdate = marketPrices.lastUpdate

const fmt = (n: number) => n.toLocaleString('es-AR')

const novilloUsd = novillo / usd // USD/kg vivo
const cornUsdKg = corn / 1000 // USD/kg de maíz
const ratio = novilloUsd / cornUsdKg // kg de maíz por kg de novillo
const ratioStr = ratio.toFixed(1)
const UMBRAL = 12 // umbral de referencia de rentabilidad del feedlot (12:1)

// FAQ reutilizado en el FAQPageSchema y en el <dl> visible (answer-first).
const FAQ = [
  {
    question: '¿Qué es la relación maíz/novillo?',
    answer:
      `La relación maíz/novillo mide cuántos kilos de maíz se compran con un kilo de novillo vivo: hoy (${lastUpdate}) es de ${ratioStr}:1, con el novillo a $${fmt(novillo)}/kg (INMAG) y el maíz a US$${corn}/tn (MAGyP FOB). Es el termómetro de rentabilidad del engorde a corral — a mayor valor, más margen para el feedlot. Es una referencia de mercado, no un precio fijado por esta página.`,
  },
  {
    question: '¿Cuándo conviene el feedlot?',
    answer:
      `El engorde a corral tiende a ser rentable cuando la relación supera el umbral de referencia de ${UMBRAL}:1; por debajo, el margen se comprime porque el maíz pesa cerca del 73% del costo directo. Hoy (${lastUpdate}) la relación es de ${ratioStr}:1, ${ratio >= UMBRAL ? `por encima del umbral ${UMBRAL}:1` : `por debajo del umbral ${UMBRAL}:1`}.`,
  },
  {
    question: '¿Cómo se calcula?',
    answer:
      `Se divide el precio del novillo en USD/kg por el precio del maíz en USD/kg. Tomamos el novillo INMAG ($${fmt(novillo)}/kg, convertido a USD con un dólar de referencia de $${fmt(usd)}) y el maíz FOB MAGyP (US$${corn}/tn = US$${cornUsdKg.toFixed(3)}/kg), lo que da ${ratioStr}:1 al ${lastUpdate}.`,
  },
]

export const metadata: Metadata = {
  title: `Relación Maíz/Novillo Argentina 2026: ${ratioStr}:1 | Rentabilidad Feedlot`,
  description: `La relación maíz/novillo mide la rentabilidad del feedlot: hoy (${lastUpdate}) es de ${ratioStr}:1 con el novillo a $${fmt(novillo)}/kg (INMAG) y el maíz a US$${corn}/tn (MAGyP FOB). Umbral de referencia 12:1, actualizado a diario.`,
  keywords: [
    'relacion maiz novillo rentabilidad feedlot',
    'relacion maiz novillo',
    'rentabilidad feedlot argentina',
    'costo engorde ganado',
    'precio maiz ganaderia',
    'spread ganadero',
    'indicador feedlot',
    'conversion maiz carne',
    'cuando conviene el feedlot',
  ],
  openGraph: {
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
    title: `Relación Maíz/Novillo — ${ratioStr}:1 · Rentabilidad Feedlot`,
    description: `Indicador clave para feedlots: cuántos kilos de maíz se compran con un kilo de novillo. Hoy ${ratioStr}:1 (${lastUpdate}). Actualizado a diario.`,
    url: PAGE_URL,
    type: 'article',
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function SpreadPage() {
  return (
    <>
      {/* ── Capa AEO (server-rendered, número vivo interpolado en build) ──── */}
      <SectionBreadcrumbSchema section="mercado" sectionName="Mercado" />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Relación Maíz/Novillo: rentabilidad del feedlot"
        cssSelectors={['h1', '.speakable-content']}
      />
      <DatasetSchema
        name="Relación Maíz/Novillo Argentina"
        description="Indicador de rentabilidad feedlot: ratio entre precio de novillo INMAG (ARS/kg vivo) y maíz FOB MAGyP (USD/tn), convertido a USD/kg. Actualizado a diario."
        url={PAGE_URL}
        keywords={[
          'relación maíz novillo',
          'rentabilidad feedlot',
          'spread ganadero',
          'costo engorde',
          'engorde a corral',
        ]}
        dateModified={lastUpdate}
      />

      {/* ── Bloque answer-first (respuesta citable a la head-query) ───────── */}
      <section className="max-w-4xl mx-auto px-4 pt-8">
        <nav className="text-xs text-zinc-500 mb-4 flex items-center gap-1">
          <Link href="/" className="hover:text-zinc-300">Inicio</Link>
          <span>/</span>
          <Link href="/mercado" className="hover:text-zinc-300">Mercado</Link>
          <span>/</span>
          <span className="text-zinc-300">Relación Maíz/Novillo</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-3">
          Relación Maíz/Novillo: rentabilidad del feedlot
        </h1>

        <p className="speakable-content text-zinc-300 leading-relaxed">
          La relación maíz/novillo mide cuántos kilos de maíz se compran con un kilo de
          novillo e indica la rentabilidad del feedlot: hoy ({lastUpdate}) el novillo cotiza{' '}
          <strong>${fmt(novillo)}/kg</strong> y el maíz <strong>US${corn}/tn</strong>, lo que da
          una relación de <strong>{ratioStr}:1</strong> (a mayor valor, más margen para el
          engorde a corral).
        </p>

        <p className="text-zinc-400 text-sm leading-relaxed mt-3">
          El umbral de referencia del mercado es de <strong>{UMBRAL}:1</strong>: por encima, el
          corral trabaja con aire sobre el punto de equilibrio; por debajo, el margen se comprime
          porque el maíz pesa cerca del 73% del costo directo del engorde. Con la relación actual
          de {ratioStr}:1, el indicador está{' '}
          {ratio >= UMBRAL ? 'por encima' : 'por debajo'} de ese umbral. Es una referencia de
          mercado calculada con datos públicos (INMAG y maíz FOB MAGyP); no es un precio fijado por
          esta página, y cada operación se resuelve con el costo de compra y el grano asegurado.
        </p>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link href="/que-es-un-feedlot" className="text-accent hover:underline">
            ¿Qué es un feedlot? →
          </Link>
          <Link href="/mercado/novillos" className="text-accent hover:underline">
            Precio del novillo →
          </Link>
        </div>
      </section>

      {/* ── Serie histórica (2015→): el contexto de largo plazo ──────────────── */}
      {(() => {
        const serie = (maizNovilloHist.serie as PuntoRatio[])
        const umbral = maizNovilloHist.umbral_referencia as number
        const hmin = serie.reduce((a, b) => (b.ratio < a.ratio ? b : a))
        const hmax = serie.reduce((a, b) => (b.ratio > a.ratio ? b : a))
        const fmtMes = (mes: string) => {
          const M = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
          const [y, m] = mes.split('-'); return `${M[Number(m) - 1]}-${y}`
        }
        return (
          <section className="max-w-4xl mx-auto px-4 pt-8">
            <div className="rounded-xl border border-terminal-border bg-black/20 p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
                <h2 className="text-lg font-medium text-zinc-100">Histórico de la relación · desde 2015</h2>
                <span className="text-xs text-zinc-500">mensual · promedio ponderado</span>
              </div>
              <RatioHistoricoChart serie={serie} umbral={umbral} />
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-zinc-400">
                <span>Mínimo: <span className="text-negative font-mono">{hmin.ratio}:1</span> ({fmtMes(hmin.mes)}) — margen ahogado</span>
                <span>Máximo: <span className="text-positive font-mono">{hmax.ratio}:1</span> ({fmtMes(hmax.mes)}) — corral holgado</span>
                <span>Último: <span className="text-zinc-200 font-mono">{serie[serie.length - 1].ratio}:1</span> ({fmtMes(serie[serie.length - 1].mes)})</span>
              </div>
              <p className="text-xxs text-zinc-600 mt-2.5 leading-snug">
                Novillo INMAG en USD (dólar blue) ÷ maíz FOB MAGyP en USD. Serie mensual reconstruida con datos públicos (INMAG desde 2015, maíz FOB por posición HS 1005). La lectura del día, abajo, usa el valor spot.
              </p>
            </div>
          </section>
        )
      })()}

      {/* Herramienta interactiva: la relación en vivo + decisión operativa */}
      <SpreadClient />

      {/* Captura del lado COMPRADOR — la página del spread es territorio de feedlots
          (compran invernada para engordar). Alimenta la otra punta del matching. */}
      <section className="max-w-3xl mx-auto px-4 pb-8">
        <CompraLeadCapture
          source="spread"
          title="¿Comprás para engordar? Te conseguimos la invernada"
          subtitle="Decinos qué categoría buscás, cuántas cabezas y hasta cuánto pagás. Te conseguimos la hacienda que entre en tu número de reposición."
        />
      </section>

      {/* ── FAQ visible (mismo array que el FAQPageSchema) ────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pb-8">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-medium text-zinc-200 mb-4">
            Relación maíz/novillo: preguntas frecuentes
          </h2>
          <dl className="space-y-4">
            {FAQ.map((faq) => (
              <div key={faq.question}>
                <dt className="text-zinc-200 font-medium mb-1">{faq.question}</dt>
                <dd className="text-zinc-400 text-sm leading-relaxed">{faq.answer}</dd>
              </div>
            ))}
          </dl>
          <div className="text-zinc-600 text-xs mt-6">
            Fuentes: INMAG (Mercado Agroganadero) y maíz FOB MAGyP. Dato de referencia del mercado,
            no fijado por esta página. Actualizado: {lastUpdate} · Memola Medios S.A.S.
          </div>
        </div>
      </section>
    </>
  )
}
