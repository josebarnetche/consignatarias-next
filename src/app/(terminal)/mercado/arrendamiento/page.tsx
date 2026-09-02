import { PromoGuiaBanner } from '@/components/PromoGuiaBanner'
import { Metadata } from 'next'
import { PROVINCIAS_CON_DATO } from '@/lib/campos-seo'
import Link from 'next/link'
import { Suspense } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import marketData from '@/lib/data/market-prices.json'
import { createAdminClient } from '@/lib/supabase-server'
import ArrendamientoCalculator from './ArrendamientoCalculator'
import LeadCapture from '@/components/leads/LeadCapture'
import { SectionBreadcrumbSchema, SpeakableSchema, QAPageSchema } from '@/components/seo/JsonLd'
import { InteractivePriceChart } from '@/components/charts/InteractivePriceChart'
import ArrendamientoLiquidacionSignup from '@/components/ArrendamientoLiquidacionSignup'
import HerramientasCTA from '@/components/HerramientasCTA'
import ProUpgradePrompt from '@/components/ProUpgradePrompt'
import SinceLastVisit from '@/components/landing/SinceLastVisit'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { Delta, DataTable, PriceCell, type DataColumn } from '@/components/ui'
import { signedTone, SEMANTIC_HEX } from '@/lib/ui/tokens'
import { MarketHero, type MarketHeroStat } from '@/components/market'
import rematesData from '@/lib/data/remates.json'
import { OfrecerInforme } from '@/components/productos/OfrecerInforme'

const inmag = marketData.inmag
const series = inmag.series as Array<{ date: string; value: number; volume?: number }>

// Índice OFICIAL de arrendamiento del MAG (haciinfo000013, "índice sugerido para
// arrendamientos rurales"). Es la cifra correcta para arrendamiento — más precisa que usar
// el INMAG diario como proxy. `index` = valor del día; `periodIndex` = promedio del período
// vigente (lo que se liquida). El INMAG diario queda como referencia secundaria.
const arr = marketData.arrendamientoOficial as {
  date: string
  index: number
  periodStart: string
  periodEnd: string
  periodIndex: number
  source: string
}

// Snapshot server para "Desde tu última visita" (mismo patrón que /overview).
const TODAY = new Date().toISOString().slice(0, 10)
const inmagSnapshotDate = series[series.length - 1]?.date ?? marketData.lastUpdate
const rematesUpcomingSnapshot = rematesData
  .filter((r) => r.date >= TODAY && r.status === 'scheduled')
  .map((r) => ({ date: r.date }))

// Calculate monthly averages
function getMonthlyAverages(data: typeof series) {
  const monthlyData: Record<string, { sum: number; count: number; values: number[] }> = {}
  
  data.forEach(point => {
    const date = new Date(point.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { sum: 0, count: 0, values: [] }
    }
    monthlyData[monthKey].sum += point.value
    monthlyData[monthKey].count++
    monthlyData[monthKey].values.push(point.value)
  })
  
  return Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      avg: data.sum / data.count,
      min: Math.min(...data.values),
      max: Math.max(...data.values),
      count: data.count
    }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12) // Last 12 months
}

const monthlyAverages = getMonthlyAverages(series)

export const dynamic = 'force-dynamic'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/**
 * Cierres mensuales OFICIALES del MAG (tabla inmag_monthly_close) — el promedio
 * ponderado del mes que se usa para liquidar arrendamientos. Coincide EXACTO con
 * el MAG (ej. junio 2026 = 4.164,558), a diferencia del promedio simple de la serie.
 */
async function getMonthlyCloses() {
  const db = createAdminClient() as unknown as SupabaseClient
  const { data } = await db
    .from('inmag_monthly_close')
    .select('year, month, inmag, cabezas')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(13)
  return (data || []).map((r) => ({
    year: r.year as number,
    month: r.month as number,
    label: `${MESES[(r.month as number) - 1]} ${r.year}`,
    inmag: Number(r.inmag),
    cabezas: r.cabezas as number | null,
  }))
}

export const metadata: Metadata = {
  // Live price baked into the title — self-answering pattern. GSC (jul-2026): además de
  // "precio novillo arrendamiento hoy" (la que convierte), hay ~8.500 imp/28d en
  // "indice novillo arrendamiento*" a CTR 0,5-1,1% porque el <title> no contenía la
  // palabra "índice" (sí estaba en OG/keywords/H1, pero Google pesa el <title>). Se agrega
  // "e Índice" sin perder precio/hoy/$número. ~52 chars, no trunca. v1.40 + jul-2026 CTR pass.
  title: `Precio e Índice Novillo Arrendamiento Hoy: $${arr.index.toLocaleString('es-AR', { maximumFractionDigits: 0 })}/kg`,
  description: `Precio del novillo para arrendamiento hoy: $${arr.index.toLocaleString('es-AR', { maximumFractionDigits: 0 })}/kg — índice oficial sugerido para arrendamientos rurales del Mercado Agroganadero (período ${fmtFecha(arr.periodStart)}–${fmtFecha(arr.periodEnd)}, act. ${fmtFecha(arr.date)}). INMAG novillo diario: $${inmag.current.toLocaleString('es-AR', { maximumFractionDigits: 0 })}/kg (${inmag.change >= 0 ? '+' : ''}${inmag.change.toFixed(1)}%). Calculá el canon de tu campo en kg/ha.`,
  keywords: [
    'índice novillo arrendamiento',
    'indice novillo arrendamiento hoy',
    'indice novillo arrendamiento cañuelas',
    'indice novillo arrendamiento mensual liniers',
    'novillo indice arrendamiento',
    'arrendamiento rural argentina',
    'precio novillo arrendamiento',
    'contrato arrendamiento rural',
    'INMAG arrendamiento',
  ],
  openGraph: {
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
    title: `Índice Novillo Arrendamiento Hoy: $${arr.index.toLocaleString('es-AR', { maximumFractionDigits: 0 })}/kg | Consignatarias`,
    description: `Índice oficial del novillo para arrendamiento: $${arr.index.toLocaleString('es-AR', { maximumFractionDigits: 0 })}/kg (act. ${fmtFecha(arr.date)}). Referencia para contratos de arrendamiento rural en Argentina.`,
    url: 'https://www.consignatarias.com.ar/mercado/arrendamiento',
    type: 'website',
  },
  alternates: { canonical: 'https://www.consignatarias.com.ar/mercado/arrendamiento' },
}

// FAQPage Schema
function FAQSchema() {
  const hoyStr = inmag.current.toLocaleString('es-AR', { maximumFractionDigits: 0 })
  const chgStr = `${inmag.change >= 0 ? '+' : ''}${inmag.change.toFixed(1)}%`
  const faqs = [
    {
      // La query #1 del sitio en Search Console es "precio novillo (para) arrendamiento
      // hoy". Esta FAQ la responde con el NÚMERO VIVO → es lo que una IA cita cuando
      // le preguntan el precio de hoy (antes ninguna FAQ tenía el valor actual).
      question: '¿Cuál es el precio del novillo para arrendamiento hoy?',
      answer: `El precio del novillo para arrendamiento hoy es $${fmt(arr.index)} por kilo vivo, según el índice oficial sugerido para arrendamientos rurales del Mercado Agroganadero (haciinfo000013), correspondiente al período ${fmtFecha(arr.periodStart)}–${fmtFecha(arr.periodEnd)} y actualizado el ${fmtFecha(arr.date)}; el promedio del período es $${fmt(arr.periodIndex)}/kg. Como referencia, el INMAG del novillo diario cotiza a $${hoyStr}/kg (${chgStr} respecto de la jornada previa). Para calcular el canon de un arrendamiento se multiplica: canon mensual = kilos de novillo pactados por hectárea × precio del índice × cantidad de hectáreas. Para liquidar contratos suele usarse el promedio mensual del índice, no el valor de un día.`,
    },
    {
      question: '¿Qué es el índice novillo arrendamiento?',
      answer: 'El índice novillo arrendamiento es el valor de referencia utilizado para calcular el canon de los contratos de arrendamiento rural en Argentina. Se basa en el precio del novillo en el Mercado Agroganadero de Buenos Aires (INMAG) y permite ajustar el valor del alquiler de campos de manera objetiva y transparente según las condiciones del mercado ganadero.'
    },
    {
      question: '¿Cuál es el índice novillo arrendamiento mensual?',
      answer: `Para los contratos de arrendamiento se usa el índice novillo arrendamiento mensual —el promedio del período, no el valor de un solo día— para evitar la volatilidad diaria. El promedio mensual vigente del índice oficial (haciinfo000013) es $${fmt(arr.periodIndex)} por kilo vivo, correspondiente al período ${fmtFecha(arr.periodStart)}–${fmtFecha(arr.periodEnd)}. El canon mensual se calcula como kilos de novillo por hectárea × ese promedio mensual × cantidad de hectáreas; el canon anual es ese valor multiplicado por 12.`
    },
    {
      question: '¿Cómo se calcula el arrendamiento con el índice novillo?',
      answer: 'El cálculo típico es: Canon mensual = Kilos de novillo pactados × Precio índice novillo × Hectáreas. Por ejemplo, si el contrato establece 4 kg de novillo por hectárea, y el campo tiene 500 ha, con un índice de $4.329/kg, el canon mensual sería aproximadamente $8.658.000. Los contratos suelen estipular un promedio mensual del índice.'
    },
    {
      question: '¿Por qué se usa el índice novillo para arrendamientos?',
      answer: 'El índice novillo es la referencia más utilizada porque: 1) Es un valor objetivo publicado diariamente por el Mercado Agroganadero, 2) Refleja las condiciones reales del mercado ganadero, 3) Protege tanto al propietario como al arrendatario de la inflación, 4) Es ampliamente aceptado y tiene transparencia en su cálculo.'
    },
    {
      question: '¿Cuál es la diferencia entre el índice Liniers y Cañuelas?',
      answer: 'Ambos mercados operan bajo el Mercado Agroganadero de Buenos Aires y contribuyen al cálculo del INMAG. Liniers históricamente fue el mercado más importante, mientras que Cañuelas tomó protagonismo en los últimos años. El índice novillo arrendamiento que publicamos es el INMAG oficial que integra ambos mercados.'
    },
    {
      question: '¿Cada cuánto se actualiza el índice novillo arrendamiento?',
      answer: 'El índice se actualiza cada día hábil con operaciones en el Mercado Agroganadero. Para contratos de arrendamiento, generalmente se utiliza el promedio mensual del índice para evitar la volatilidad diaria y simplificar las liquidaciones.'
    },
    {
      question: '¿Cómo se pacta el valor del arrendamiento en kilos de novillo?',
      answer: 'El valor en kilos de novillo por hectárea depende de la calidad del campo, ubicación, mejoras, y aptitud productiva. Campos agrícolas de primera en zona núcleo pueden pactarse entre 8-12 kg/ha/mes, mientras que campos ganaderos en zonas marginales pueden estar entre 3-6 kg/ha/mes. Es fundamental evaluar cada caso particular.'
    }
  ]
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }
  
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

// Dataset Schema
function ArrendamientoSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Índice Novillo Arrendamiento - Mercado Agroganadero',
    description: 'Índice oficial sugerido para arrendamientos rurales del Mercado Agroganadero (haciinfo000013), usado como referencia para el canon de contratos de arrendamiento rural en Argentina. Incluye el INMAG del novillo diario como referencia secundaria.',
    url: 'https://www.consignatarias.com.ar/mercado/arrendamiento',
    keywords: ['índice novillo', 'arrendamiento rural', 'índice arrendamiento', 'INMAG', 'precio ganado', 'mercado ganadero'],
    // C11: entidad única MAG Cañuelas (coherente con /mercado/inmag y mercado/canuelas).
    creator: { '@type': 'Organization', name: 'Mercado Agroganadero de Cañuelas', sameAs: 'https://www.mercadoagroganadero.com.ar' },
    temporalCoverage: `${series[0]?.date}/${series[series.length - 1]?.date}`,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    spatialCoverage: { '@type': 'Place', name: 'Argentina' },
    // Los valores VIGENTES dentro del Dataset → una IA que lee el structured data tiene el
    // número del día sin scrapear la página, y el feed machine-readable para verificarlo.
    // Primario: índice OFICIAL de arrendamiento; secundario: INMAG novillo diario.
    variableMeasured: [
      {
        '@type': 'PropertyValue',
        name: 'Índice Novillo Arrendamiento (oficial MAG)',
        alternateName: 'Índice sugerido para arrendamientos rurales',
        value: arr.index,
        unitText: 'ARS/kg vivo',
        measurementTechnique: 'Índice oficial sugerido para arrendamientos rurales del Mercado Agroganadero (haciinfo000013)',
      },
      {
        '@type': 'PropertyValue',
        name: 'Índice de arrendamiento del período',
        value: arr.periodIndex,
        unitText: 'ARS/kg vivo',
        measurementTechnique: `Promedio del período ${arr.periodStart}/${arr.periodEnd} — el valor que se usa para liquidar`,
      },
      {
        '@type': 'PropertyValue',
        name: 'INMAG Novillo (referencia diaria)',
        value: inmag.current,
        unitText: 'ARS/kg vivo',
        measurementTechnique: 'Promedio ponderado por volumen del novillo en el Mercado Agroganadero de Cañuelas',
      },
    ],
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: 'https://www.consignatarias.com.ar/precios.json',
    },
    dateModified: arr.date,
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

// DefinedTerm — define la ENTIDAD "índice novillo arrendamiento" (paridad con el
// InmagDefinedTermSchema de /mercado/inmag). Alimenta el featured snippet de la query
// head "indice novillo arrendamiento" aunque el orgánico esté en pos ~6-7.
function ArrendamientoDefinedTermSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    '@id': 'https://www.consignatarias.com.ar/glosario#indice-novillo-arrendamiento',
    name: 'Índice Novillo Arrendamiento',
    alternateName: 'Precio novillo para arrendamiento',
    description: `El índice novillo arrendamiento es el precio del novillo (en pesos por kilo vivo) usado como referencia para calcular y ajustar el canon de los contratos de arrendamiento rural en Argentina. Hoy el índice oficial sugerido para arrendamientos rurales del Mercado Agroganadero es $${fmt(arr.index)}/kg (act. ${fmtFecha(arr.date)}). El canon se pacta en kilos de novillo por hectárea y se liquida al promedio mensual del índice.`,
    inDefinedTermSet: 'https://www.consignatarias.com.ar/glosario#set',
    url: 'https://www.consignatarias.com.ar/mercado/arrendamiento',
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

// QAPage — refuerza el snippet de la query head "precio novillo para arrendamiento hoy"
// (además del FAQPage). El QAPage tiene una única Question con su acceptedAnswer dateada,
// señal directa de que la página responde ESA pregunta con el número y su fecha.
function ArrendamientoQAPageSchema() {
  const answer = `El precio del novillo para arrendamiento hoy es $${fmt(arr.index)} por kilo vivo, según el índice oficial sugerido para arrendamientos rurales del Mercado Agroganadero (período ${fmtFecha(arr.periodStart)}–${fmtFecha(arr.periodEnd)}, actualizado el ${fmtFecha(arr.date)}). El promedio del período —el valor que se usa para liquidar— es $${fmt(arr.periodIndex)}/kg. El canon se calcula como kilos de novillo pactados por hectárea × precio del índice × cantidad de hectáreas.`
  return (
    <QAPageSchema
      question="¿Cuál es el precio del novillo para arrendamiento hoy?"
      questionText="¿Cuál es el precio del novillo para arrendamiento hoy y cómo se calcula el canon?"
      answer={answer}
      url="https://www.consignatarias.com.ar/mercado/arrendamiento"
      id="https://www.consignatarias.com.ar/mercado/arrendamiento#qapage"
    />
  )
}

function fmt(n: number): string {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

// ISO (YYYY-MM-DD) → "8 julio 2026" sin desfase de timezone (parseo manual, no new Date()).
function fmtFecha(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MESES[m - 1]} ${y}`
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

export default async function ArrendamientoPage() {
  const closes = await getMonthlyCloses()
  const cierre = closes[0] // el mes cerrado más reciente — el número para facturar
  const cierrePrev = closes[1]
  const cierreChange = cierre && cierrePrev ? ((cierre.inmag - cierrePrev.inmag) / cierrePrev.inmag) * 100 : null

  const recentSeries = series.slice(-90) // 90 days for better trend visibility
  const last30 = series.slice(-30)
  const minVal = Math.min(...last30.map(s => s.value))
  const maxVal = Math.max(...last30.map(s => s.value))
  const avgVal = last30.reduce((a, b) => a + b.value, 0) / last30.length
  
  // Calculate 30d change
  const change30d = ((last30[last30.length - 1]?.value - last30[0]?.value) / last30[0]?.value * 100)

  // Example calculation for 500ha @ 4kg/ha
  const exampleHectareas = 500
  const exampleKgPerHa = 4
  const exampleCanon = exampleHectareas * exampleKgPerHa * inmag.current

  // Quick-stats del hero compartido (mismo lenguaje que /mercado/inmag).
  const heroStats: MarketHeroStat[] = [
    { label: 'Mínimo 30d', value: `$${fmt(minVal)}`, sub: 'Por kg vivo' },
    { label: 'Máximo 30d', value: `$${fmt(maxVal)}`, sub: 'Por kg vivo' },
    { label: 'Promedio 30d', value: `$${fmt(avgVal)}`, sub: 'Por kg vivo' },
    {
      label: 'Variación 30d',
      value: `${change30d >= 0 ? '+' : ''}${change30d.toFixed(1)}%`,
      sub: 'vs. hace 30 días',
      tone: signedTone(change30d),
    },
  ]

  // Cierres mensuales OFICIALES del MAG (el número para liquidar), variación mes a mes.
  const monthlyRows = closes.map((m, i) => {
    const prev = closes[i + 1]
    return {
      label: m.label,
      inmag: m.inmag,
      cabezas: m.cabezas,
      change: prev ? ((m.inmag - prev.inmag) / prev.inmag) * 100 : null,
    }
  })

  const monthlyColumns: DataColumn<(typeof monthlyRows)[number]>[] = [
    {
      key: 'label',
      header: 'Mes',
      cell: (r) => <span className="text-zinc-300 capitalize">{r.label}</span>,
    },
    {
      key: 'inmag',
      header: 'Cierre INMAG',
      numeric: true,
      cell: (r) => (
        <span className="inline-flex items-baseline gap-2">
          <PriceCell value={r.inmag} prefix="$" suffix="/kg" />
          <Delta change={r.change} format={(abs) => abs.toFixed(1)} className="text-xxs" />
        </span>
      ),
    },
    {
      key: 'cabezas',
      header: 'Cabezas',
      numeric: true,
      hideBelowSm: true,
      cell: (r) => <span className="text-zinc-500 tabular-nums">{r.cabezas?.toLocaleString('es-AR') ?? '—'}</span>,
    },
  ]

  return (
    <>
      <SectionBreadcrumbSchema section="mercado" sectionName="Mercado" />
      <ArrendamientoSchema />
      <ArrendamientoDefinedTermSchema />
      <FAQSchema />
      <ArrendamientoQAPageSchema />
      <SpeakableSchema
        url="https://www.consignatarias.com.ar/mercado/arrendamiento"
        headline={`Precio novillo arrendamiento hoy: $${fmt(arr.index)}/kg`}
      />

      <SinceLastVisit
        snapshot={{
          inmagDate: inmagSnapshotDate,
          inmagValue: inmag.current,
          inmagChange: inmag.change,
          rematesUpcoming: rematesUpcomingSnapshot,
          lastUpdate: marketData.lastUpdate,
        }}
      />

      <div className="min-h-screen">
        {/* Hero Section — número-hero compartido con /mercado/inmag (MarketHero),
            envuelto con el render de marca del arrendamiento (universo v2.0) */}
        <section className="relative overflow-hidden">
          <img
            src="/marca/features/feat-arrendamiento.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-[#09090b]/25" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#09090b]" aria-hidden="true" />
          <div className="relative">
        <MarketHero
          accent="amber"
          priceLabel="Índice Hoy"
          priceValue={inmag.current}
          priceChange={inmag.change}
          prevValue={fmt(inmag.prev)}
          stats={heroStats}
        >
          <div>
            <Breadcrumb
              className="mb-8"
              items={[
                { name: 'Mercado', href: '/mercado' },
                { name: 'Arrendamiento' },
              ]}
            />
            <div className="flex items-center gap-3 mb-3">
              <span className="px-2.5 py-1 bg-sky-500/10 text-accent text-xs font-medium rounded-full border border-sky-500/20">
                ACTUALIZADO HOY
              </span>
              <span className="text-sm text-zinc-500">Mercado Agroganadero</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight mb-3">
              Índice Novillo
              <span className="block text-accent">Arrendamiento</span>
            </h1>
            <p className="text-zinc-400 max-w-xl text-lg">
              Precio de referencia para contratos de arrendamiento rural en Argentina.
              Basado en el <Link href="/mercado/inmag" className="text-accent hover:underline">INMAG</Link> del Mercado Agroganadero.
            </p>

            {/* AnswerBlock — respuesta answer-first a la query head, con fecha explícita.
                Señal de frescura para saltar a top-3 en "precio novillo para arrendamiento hoy".
                Número oficial de arrendamiento + período vigente + fecha de actualización. */}
            <div className="mt-6 max-w-xl rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-4">
              <p className="text-zinc-200 text-base leading-relaxed">
                <strong className="text-white">Precio novillo para arrendamiento hoy: ${fmt(arr.index)}/kg.</strong>{' '}
                Índice oficial sugerido para arrendamientos rurales del Mercado Agroganadero.
                Período {fmtFecha(arr.periodStart)}–{fmtFecha(arr.periodEnd)} (promedio ${fmt(arr.periodIndex)}/kg,
                el valor que se liquida). Actualizado {fmtFecha(arr.date)}.
              </p>
            </div>
          </div>
        </MarketHero>
          </div>
        </section>

        {/* Promo interna de la guía paga: debajo del número-hero, nunca encima.
            La persona vino por el dato — primero se lo damos. */}
        <div className="px-4 pt-4">
          <PromoGuiaBanner origen="arrendamiento" />
        </div>


        {/* Captura ÚNICA, en el slot de alta intención (apenas debajo del número-hero).
            El visitante —mayormente desde IA/Google— acaba de ver el número del
            arrendamiento; acá mismo carga su contrato (kg/ha + ha, pre-cargado) y recibe
            SU canon liquidado a cada cierre de mes. Unificación (2026-07): antes esta
            oferta profunda vivía debajo del calculador y convertía 0 por estar bajo el
            fold, mientras la alerta genérica ocupaba este slot y convertía por posición,
            no por valor. Un solo embudo, en la posición ganadora, capturando el dato de
            contrato que después segmenta/monetiza. */}
        <section className="max-w-3xl mx-auto px-4 pt-6">
          <ArrendamientoLiquidacionSignup priceToday={inmag.current} page="/mercado/arrendamiento" />
        </section>

        {/* El informe de canon, inmediatamente después de la captura: es el paso pago del
            mismo embudo —dato → tu canon por email → el informe de tu zona— y comparte su
            audiencia.

            VIVÍA ABAJO Y NO SE VEÍA. Estuvo antes del FAQ, a 4.732 px del inicio: **7,4
            pantallas de scroll**, con 71 segundos de lectura promedio en la página. Es
            exactamente el error que el comentario de acá arriba ya advertía sobre la
            oferta profunda —"convertía 0 por estar bajo el fold"—, y volvió a pasar. La
            posición manda más que el copy. */}
        <section className="max-w-3xl mx-auto px-4">
          <OfrecerInforme
            producto="informe-canon-arrendamiento"
            desde="/mercado/arrendamiento"
            titulo="¿Lo que te ofrecen está dentro de lo que se paga en tu zona?"
            loQueAgrega={[
              'La dispersión de tu zona: qué paga el cuartil de abajo y qué el de arriba, y sobre cuántos casos se calculó.',
              'Las zonas limítrofes, para ver si conviene mirar más allá del alambrado.',
              'Cuántos kilos por hectárea produce la zona — que es contra lo que se mide si el canon es razonable.',
              'Los años de arrendamiento que hacen falta para recuperar el valor de la tierra.',
            ]}
            gratisAca="El índice, la serie y el histórico de esta página son gratis y van a seguir siéndolo."
          />
        </section>

        {/* What is the Index */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="bg-gradient-to-br from-sky-500/5 to-transparent border border-sky-500/10 rounded-2xl p-6 lg:p-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              ¿Qué es el Índice Novillo Arrendamiento?
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4 text-zinc-400">
                <p>
                  El <strong className="text-white">índice novillo arrendamiento</strong> es el valor de referencia 
                  más utilizado en Argentina para calcular el canon de los contratos de arrendamiento rural.
                </p>
                <p>
                  Se basa en el precio del novillo publicado por el <Link href="/mercado/inmag" className="text-accent hover:underline">Mercado Agroganadero de Buenos Aires (INMAG)</Link>, 
                  que integra las operaciones de Liniers y Cañuelas.
                </p>
                <p>
                  Utilizar el índice novillo permite que tanto propietarios como arrendatarios tengan una 
                  referencia objetiva, transparente y actualizada para calcular el valor del alquiler de campos.
                </p>
              </div>
              <ArrendamientoCalculator priceToday={inmag.current} />
            </div>
          </div>
        </section>

        {/* Servicio comisionista — sección dedicada y prominente. El productor pide
            que le consigamos el campo (o el arrendatario); la data va a producer_leads
            y nos avisa a nosotros. Captura hectáreas + canon deseado (el spread). */}
        <section className="max-w-3xl mx-auto px-4 py-6">
          <LeadCapture
            source="arrendamiento"
            variant="section"
            emoji="🌾"
            defaultIntent="arrendar_ofrezco"
            intents={[
              { value: 'arrendar_ofrezco', label: 'Tengo campo para arrendar' },
              { value: 'arrendar_busco', label: 'Busco campo para arrendar' },
            ]}
            quantityField="hectareas"
            quantityLabel="Hectáreas"
            askPrice
            priceLabel="Canon que buscás ($/ha/mes)"
            pricePlaceholder="Ej: 25000"
            badge="Poné tu canon"
            title="Arrendá tu campo, o conseguí uno"
            subtitle="Decinos la zona, las hectáreas y el canon que buscás. Te conseguimos la punta que falta — el arrendatario o el campo."
            submitLabel="Conseguímelo →"
          />
        </section>

        {/* Chart Section */}
        <section className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Evolución del Índice (90 días)</h2>
            <Link 
              href="/api-docs" 
              className="text-sm text-zinc-500 hover:text-accent-bright transition-colors flex items-center gap-1"
            >
              <span>API</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
          
          <Suspense fallback={<div className="h-[380px] bg-zinc-900/30 rounded-2xl animate-pulse" />}>
            <InteractivePriceChart 
              data={recentSeries} 
              height={380}
              accentColor={SEMANTIC_HEX.accent}
              showVolume={true}
            />
          </Suspense>
        </section>

        {/* La captura de liquidación se movió arriba (slot de alta intención). Acá
            queda el próximo-paso para la entrada #1 (57% bounce). */}
        <section className="max-w-6xl mx-auto px-4 pt-4 pb-8">
          <HerramientasCTA />
        </section>

        {/* Cierre mensual oficial (el número para facturar) + tabla */}
        <section className="max-w-6xl mx-auto px-4 pb-12">
          {cierre && (
            <div className="terminal-panel mb-6" style={{ borderColor: 'rgba(56,189,248,0.4)' }}>
              <div
                className="terminal-panel-header flex items-center justify-between"
                style={{ color: '#38bdf8', borderBottomColor: 'rgba(56,189,248,0.25)' }}
              >
                <span>Cierre del mes · el número para tu factura</span>
                <span className="text-zinc-500 text-xxs font-terminal normal-case tracking-normal">
                  fuente: MAG — INMAG oficial
                </span>
              </div>
              <div className="px-panel py-5">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl font-terminal tabular-nums text-sky-300">
                    ${cierre.inmag.toLocaleString('es-AR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                  </span>
                  <span className="text-zinc-500 text-data">
                    /kg · cierre de <span className="capitalize text-zinc-300">{cierre.label}</span>
                  </span>
                  {cierreChange != null && (
                    <span className={`text-data ${cierreChange >= 0 ? 'text-positive' : 'text-negative'}`}>
                      {cierreChange >= 0 ? '+' : ''}
                      {cierreChange.toFixed(1)}% vs. mes anterior
                    </span>
                  )}
                </div>
                <p className="text-zinc-600 text-xxs mt-2">
                  Promedio ponderado del mes cerrado — el valor que se usa para liquidar el arrendamiento. Coincide
                  exacto con el Mercado Agroganadero.
                </p>
              </div>
            </div>
          )}

          <h2 className="text-xl font-semibold text-white mb-2">Cierre mensual del INMAG</h2>
          <p className="text-zinc-500 text-sm mb-4">
            Los contratos de arrendamiento se liquidan con el cierre mensual del índice. Estos son los promedios
            oficiales del MAG, mes a mes.
          </p>

          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl overflow-hidden">
            <DataTable
              columns={monthlyColumns}
              rows={monthlyRows}
              rowKey={(r) => r.label}
              rowTone={(r) => (r.change == null ? null : signedTone(r.change))}
            />

            <div className="px-6 py-4 border-t border-zinc-800/50 bg-zinc-900/50 flex items-center justify-between">
              <span className="text-xs text-zinc-600">Últimos 12 meses</span>
              <Link 
                href="/api/market/history?days=365&format=csv"
                className="text-xs text-accent hover:text-accent-bright transition-colors flex items-center gap-1"
              >
                Descargar histórico completo
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-semibold text-white mb-6">Preguntas Frecuentes</h2>
          
          <div className="space-y-4">
            {[
              {
                q: '¿Qué es el índice novillo arrendamiento?',
                a: 'El índice novillo arrendamiento es el valor de referencia utilizado para calcular el canon de los contratos de arrendamiento rural en Argentina. Se basa en el precio del novillo en el Mercado Agroganadero de Buenos Aires (INMAG) y permite ajustar el valor del alquiler de campos de manera objetiva y transparente según las condiciones del mercado ganadero.'
              },
              {
                q: '¿Cuál es el índice novillo arrendamiento mensual?',
                a: `Para los contratos de arrendamiento se usa el índice novillo arrendamiento mensual —el promedio del período, no el valor de un solo día— para evitar la volatilidad diaria. El promedio mensual vigente del índice oficial es $${fmt(arr.periodIndex)} por kilo vivo. El canon mensual se calcula como kilos de novillo por hectárea × ese promedio mensual × cantidad de hectáreas; el canon anual es ese valor multiplicado por 12.`
              },
              {
                q: '¿Cómo se calcula el arrendamiento con el índice novillo?',
                a: `El cálculo típico es: Canon mensual = Kilos de novillo pactados × Precio índice novillo × Hectáreas. Por ejemplo, si el contrato establece 4 kg de novillo por hectárea, y el campo tiene 500 ha, con el índice actual de $${fmt(inmag.current)}/kg, el canon mensual sería de $${fmt(exampleCanon)}.`
              },
              {
                q: '¿Por qué se usa el índice novillo para arrendamientos?',
                a: 'El índice novillo es la referencia más utilizada porque: 1) Es un valor objetivo publicado diariamente por el Mercado Agroganadero, 2) Refleja las condiciones reales del mercado ganadero, 3) Protege tanto al propietario como al arrendatario de la inflación, 4) Es ampliamente aceptado y tiene transparencia en su cálculo.'
              },
              {
                q: '¿Cuál es la diferencia entre el índice Liniers y Cañuelas?',
                a: 'Ambos mercados operan bajo el Mercado Agroganadero de Buenos Aires y contribuyen al cálculo del INMAG. Liniers históricamente fue el mercado más importante, mientras que Cañuelas tomó protagonismo en los últimos años. El índice novillo arrendamiento que publicamos es el INMAG oficial que integra ambos mercados.'
              },
              {
                q: '¿Cada cuánto se actualiza el índice novillo arrendamiento?',
                a: 'El índice se actualiza cada día hábil con operaciones en el Mercado Agroganadero. Para contratos de arrendamiento, generalmente se utiliza el promedio mensual del índice para evitar la volatilidad diaria y simplificar las liquidaciones.'
              },
              {
                q: '¿Cómo se pacta el valor del arrendamiento en kilos de novillo?',
                a: 'El valor en kilos de novillo por hectárea depende de la calidad del campo, ubicación, mejoras, y aptitud productiva. Campos agrícolas de primera en zona núcleo pueden pactarse entre 8-12 kg/ha/mes, mientras que campos ganaderos en zonas marginales pueden estar entre 3-6 kg/ha/mes.'
              }
            ].map((faq, i) => (
              <details 
                key={i} 
                className="group bg-zinc-900/30 border border-zinc-800/50 rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-zinc-800/20 transition-colors">
                  <h3 className="text-white font-medium pr-4">{faq.q}</h3>
                  <svg 
                    className="w-5 h-5 text-zinc-500 flex-shrink-0 transition-transform group-open:rotate-180" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-zinc-400 text-sm leading-relaxed border-t border-zinc-800/30 pt-4">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Índice de arrendamiento por fuente — captura los modificadores de fuente
            ("índice novillo arrendamiento Liniers/Cañuelas") sin canibalizar la página
            madre. Landings dedicadas por mercado de origen. */}
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <h2 className="text-lg font-semibold text-white mb-2">Índice de arrendamiento por fuente</h2>
          <p className="text-zinc-500 text-sm mb-6">
            El índice de arrendamiento integra las operaciones del Mercado Agroganadero. Consultá el detalle
            por mercado de origen.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/mercado/arrendamiento/liniers"
              className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-sky-500/30 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-accent-bright transition-colors">
                    Índice arrendamiento Liniers
                  </h3>
                  <p className="text-sm text-zinc-500">
                    El índice novillo para arrendamiento con referencia al Mercado de Liniers.
                  </p>
                </div>
                <svg className="w-5 h-5 text-zinc-600 group-hover:text-accent-bright transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </Link>

            <Link
              href="/mercado/arrendamiento/canuelas"
              className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-sky-500/30 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-accent-bright transition-colors">
                    Índice arrendamiento Cañuelas
                  </h3>
                  <p className="text-sm text-zinc-500">
                    El índice novillo para arrendamiento con referencia al Mercado Agroganadero de Cañuelas.
                  </p>
                </div>
                <svg className="w-5 h-5 text-zinc-600 group-hover:text-accent-bright transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </Link>
          </div>
        </section>

        {/* Related Links */}
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <h2 className="text-lg font-semibold text-white mb-6">Información Relacionada</h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            <Link 
              href="/mercado/inmag"
              className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-sky-500/30 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-accent-bright transition-colors">
                    INMAG - Índice Oficial
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Cotización diaria del Mercado Agroganadero de Buenos Aires.
                  </p>
                </div>
                <svg className="w-5 h-5 text-zinc-600 group-hover:text-accent-bright transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </Link>

            <Link 
              href="/mercado/liniers"
              className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-sky-500/30 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-accent-bright transition-colors">
                    Mercado de Liniers
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Precios por categoría y remates del día en Liniers.
                  </p>
                </div>
                <svg className="w-5 h-5 text-zinc-600 group-hover:text-accent-bright transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </Link>

            <Link 
              href="/mercado"
              className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-6 hover:bg-sky-500/15 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-accent mb-2">
                    Todos los Precios
                  </h3>
                  <p className="text-sm text-accent/70">
                    Categorías, maíz, dólar y más indicadores del mercado.
                  </p>
                </div>
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </Link>
          </div>

          {/* Source attribution */}
          <p className="text-xs text-zinc-600 mt-8 text-center">
            Fuente: Mercado Agroganadero de Buenos Aires (mercadoagroganadero.com.ar).
            Datos actualizados automáticamente cada día hábil.
          </p>
        </section>

        {/* Mi Ganado — surface the retention feature to the arrendamiento audience (P3) */}
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <Link
            href="/mi-ganado"
            className="block bg-gradient-to-r from-sky-500/10 to-zinc-900/30 border border-sky-500/20 rounded-2xl p-6 hover:border-sky-500/40 transition-all group"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-accent uppercase tracking-wider mb-1">Tu hacienda al INMAG</div>
                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-accent-bright transition-colors">¿Cuánto vale tu rodeo hoy?</h3>
                <p className="text-sm text-zinc-400 max-w-xl">
                  Cargá tu hacienda una vez en <strong className="text-zinc-200">Mi Ganado</strong> y mirá su
                  valor actualizado al INMAG cada día hábil — en pesos y en dólares. Gratis con tu cuenta.
                </p>
              </div>
              <svg className="w-5 h-5 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </Link>
        </section>

        {/* Embed + citación — activo de backlinks: el índice en vivo para pegar en
            cualquier web (consignatarias, contadores, blogs rurales). Cada embed es
            un backlink temático; el dato siempre fresco = incentivo a dejarlo puesto. */}
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <div className="border border-terminal-border bg-terminal-panel/40 rounded-2xl p-6">
            <div className="text-xs text-accent uppercase tracking-wider mb-1">Insertá este índice en tu web</div>
            <h3 className="text-lg font-semibold text-white mb-2">Índice del novillo para arrendamiento, siempre actualizado</h3>
            <p className="text-sm text-zinc-400 max-w-2xl mb-4">
              Pegá este código en tu sitio y mostrá el valor del día — se actualiza solo cada día hábil.
              Uso libre con atribución. Ideal para consignatarias, estudios contables y medios del agro.
            </p>
            <pre className="text-xs text-zinc-300 bg-black/40 border border-terminal-border rounded-lg p-3 overflow-x-auto font-mono">
{`<iframe src="https://www.consignatarias.com.ar/api/widget/indice"
        width="340" height="180" style="border:0"
        title="Índice novillo arrendamiento"></iframe>`}
            </pre>
            <p className="text-xs text-zinc-500 mt-3">
              Versión compacta: agregá <code className="text-zinc-300">?compact=1</code> ·
              claro: <code className="text-zinc-300">?theme=light</code> ·{' '}
              <a href="/api/widget/indice" target="_blank" rel="noopener" className="text-accent hover:text-accent-bright transition-colors">
                ver el widget →
              </a>
            </p>
            <p className="text-xs text-zinc-500 mt-4 pt-3 border-t border-terminal-border">
              <span className="text-zinc-400 font-medium">Cómo citar:</span> Consignatarias.com.ar —
              Índice del novillo para arrendamiento (Mercado Agroganadero, haciinfo000013).
              Recuperado de https://www.consignatarias.com.ar/mercado/arrendamiento
            </p>
          </div>
        </section>

        {/* La página con más búsquedas del sitio no linkeaba a la sección de
            campos. Quien llega acá está mirando el valor del campo: es el mismo
            visitante, una pantalla antes. */}
        <section className="max-w-6xl mx-auto px-4 pb-10">
          <div className="border border-zinc-800 rounded-lg bg-zinc-900/40 p-6">
            <h2 className="text-zinc-100 text-lg font-medium mb-1">
              ¿Y cuánto vale el campo, no el arrendamiento?
            </h2>
            <p className="text-zinc-400 text-sm mb-4 max-w-2xl">
              Relevamos el valor de la hectárea en 15 provincias y 52 zonas, con la fuente y la fecha de
              cada dato. El tasador cruza lo que el campo renta con lo que se paga en su zona.
            </p>
            <div className="flex flex-wrap gap-3 mb-5">
              <Link
                href="/campos/valuar"
                className="px-4 py-2 text-xs bg-accent hover:bg-accent-bright text-zinc-950 font-medium rounded transition-colors"
              >
                ¿Cuánto vale mi campo?
              </Link>
              <Link
                href="/campos"
                className="px-4 py-2 text-xs border border-zinc-700 text-zinc-300 hover:text-accent hover:border-accent rounded transition-colors"
              >
                Campos ofrecidos
              </Link>
            </div>
            <div className="border-t border-zinc-800 pt-4">
              <p className="text-zinc-500 text-xs mb-2">Cuánto vale la hectárea, por provincia:</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs">
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
            </div>
            <div className="border-t border-zinc-800 mt-4 pt-4 flex flex-wrap gap-4 text-xs">
              <Link href="/como-comprar-un-campo" className="text-zinc-500 hover:text-accent">Cómo comprar un campo</Link>
              <Link href="/como-vender-un-campo" className="text-zinc-500 hover:text-accent">Cómo vender un campo</Link>
              <Link href="/impuestos-por-la-venta-de-un-campo" className="text-zinc-500 hover:text-accent">Impuestos de la venta</Link>
              <Link href="/creditos-para-comprar-un-campo" className="text-zinc-500 hover:text-accent">Financiación</Link>
              <Link href="/inmobiliarias-rurales" className="text-zinc-500 hover:text-accent">Inmobiliarias rurales</Link>
            </div>
          </div>
        </section>

        {/* PRO CTA — conversion surface on the #2 traffic page (P1) */}
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <ProUpgradePrompt
            benefit="Histórico completo del índice + descarga de la serie para tus contratos."
            context="arrendamiento"
            variant="card"
          />
        </section>
      </div>
    </>
  )
}
