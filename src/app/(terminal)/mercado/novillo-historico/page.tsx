import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, FAQPageSchema, DatasetSchema } from '@/components/seo/JsonLd'
import { fetchNovillitoUsdJoined, aggregateMonthly } from '@/lib/charts/data'
import { PriceLineChart } from '@/components/charts/PriceLineChart'

export const revalidate = 86400 // diaria — la serie se actualiza con el cron nocturno

const DESDE = '2006-01-01'
const fmt = (n: number, max = 2) => n.toLocaleString('es-AR', { maximumFractionDigits: max })

export async function generateMetadata(): Promise<Metadata> {
  const today = new Date().toISOString().slice(0, 10)
  const serie = await fetchNovillitoUsdJoined(DESDE, today)
  const last = serie[serie.length - 1]
  const title = last?.usd_oficial
    ? `Precio del Novillo en Dólares: 20 Años de Historia (USD ${fmt(last.usd_oficial)}/kg hoy)`
    : 'Precio del novillo en dólares — serie histórica desde 2006'
  const description = last
    ? `Serie diaria del Novillito 401/420 kg desde 2006 en USD oficial y blue: hoy USD ${fmt(last.usd_oficial ?? 0)}/kg (oficial). 20 años de precio de la hacienda argentina a través de cuatro regímenes cambiarios, del Mercado de Liniers al MAG de Cañuelas.`
    : 'Serie diaria del Novillito 401/420 kg desde 2006, convertida a USD oficial y blue.'
  return {
    title,
    description,
    keywords: [
      'precio novillo en dolares historico',
      'novillito 401 420 historico',
      'precio hacienda dolares 20 años',
      'serie historica ganado argentina',
      'precio novillo 2006',
      'novillo dolar blue historico',
    ],
    openGraph: { title, description, url: 'https://www.consignatarias.com.ar/mercado/novillo-historico', type: 'website' },
    alternates: { canonical: 'https://www.consignatarias.com.ar/mercado/novillo-historico' },
  }
}

export default async function NovilloHistoricoPage() {
  const today = new Date().toISOString().slice(0, 10)
  const serie = await fetchNovillitoUsdJoined(DESDE, today)

  const oficialDaily = serie
    .filter((d) => d.usd_oficial !== null)
    .map((d) => ({ date: d.date, value: d.usd_oficial as number }))
  const blueDaily = serie
    .filter((d) => d.usd_blue !== null)
    .map((d) => ({ date: d.date, value: d.usd_blue as number }))

  const toPoint = (m: { year: number; month: number; value: number }) => ({
    date: `${m.year}-${String(m.month).padStart(2, '0')}-15`,
    value: m.value,
  })
  const mensualOficial = aggregateMonthly(oficialDaily, (d) => d.value).map(toPoint)
  const mensualBlue = aggregateMonthly(blueDaily, (d) => d.value).map(toPoint)
  const ultimo12m = oficialDaily.filter((d) => d.date >= new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10))

  const last = serie[serie.length - 1]
  const vals = mensualOficial.map((m) => m.value)
  const min = vals.length ? Math.min(...vals) : null
  const max = vals.length ? Math.max(...vals) : null
  const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
  const first = serie[0]

  const faq = [
    {
      question: '¿Cuánto vale el novillo en dólares hoy?',
      answer: last?.usd_oficial
        ? `Hoy el Novillito 401/420 kg promedia USD ${fmt(last.usd_oficial)}/kg vivo al dólar oficial${last.usd_blue ? ` (USD ${fmt(last.usd_blue)} al blue)` : ''}. En pesos: $${fmt(last.ars, 0)}/kg.`
        : 'Estamos actualizando la serie. Volvé en unas horas.',
    },
    {
      question: '¿Cuánto valía el novillo en dólares hace 20 años?',
      answer: first?.usd_oficial
        ? `En enero de 2006 el Novillito 401/420 promediaba USD ${fmt(first.usd_oficial)}/kg vivo ($${fmt(first.ars)} de esa época). En 20 años la serie mensual en USD oficial se movió entre USD ${fmt(min ?? 0)} y USD ${fmt(max ?? 0)}/kg, con promedio USD ${fmt(avg ?? 0)}.`
        : 'Serie en carga.',
    },
    {
      question: '¿Por qué difieren el precio al oficial y al blue?',
      answer:
        'Entre 2011 y 2015, y de nuevo entre 2019 y 2024, la brecha cambiaria hizo que el mismo novillo "valiera" mucho menos en dólares blue que al oficial (en octubre de 2023, USD 2,05 vs USD 0,93). Con la unificación cambiaria las dos series convergen. Antes de 2011 no había brecha: la serie blue arranca con el cepo.',
    },
    {
      question: '¿De dónde sale esta serie?',
      answer:
        'Del Mercado Agroganadero (haciinfo000307), que publica el Novillito 401/420 kg desde el 9/12/2005 como continuidad de la antigua categoría Novillos 401/420 — la base histórica de contratos de arrendamiento. El tipo de cambio oficial viene del BCRA (2006-2010) y ArgentinaDatos/dolarapi (2011→hoy); el blue, de nuestra serie diaria desde 2011.',
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SectionBreadcrumbSchema section="mercado/novillo-historico" sectionName="Novillo histórico en USD" />
      <FAQPageSchema items={faq} />
      <DatasetSchema
        name="Novillito 401/420 kg — serie diaria 2006→hoy en ARS y USD"
        description="Precio promedio diario del Novillito 401/420 kg (Mercado de Liniers → Mercado Agroganadero) desde 2006, con conversión a dólar oficial y blue."
        url="https://www.consignatarias.com.ar/mercado/novillo-historico"
        keywords={['novillito', 'precio novillo historico', 'hacienda dolares', 'INMAG', 'Liniers', 'Cañuelas']}
      />

      {/* Hero — la luna sobre el campo (linocut), fondo sutil */}
      <div className="relative overflow-hidden rounded-xl mb-8">
        <img
          src="/marca/ilus/ilu-c-luna.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#09090b]/40 via-[#09090b]/70 to-[#09090b]" aria-hidden="true" />
        <div className="relative py-4">
          <p className="text-xxs font-terminal text-zinc-500 uppercase tracking-widest mb-2">
            <Link href="/mercado" className="text-accent hover:text-accent-bright">Mercado</Link> / Novillo histórico
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-50 leading-tight mb-3">
            El novillo en dólares: 20 años de historia
          </h1>
          <p className="text-zinc-400 leading-relaxed max-w-2xl">
            La serie diaria del <strong className="text-zinc-200">Novillito 401/420 kg</strong> desde enero de 2006 —
            de la era Liniers al MAG de Cañuelas — convertida a{' '}
            <strong className="text-zinc-200">dólar oficial y blue</strong>. En pesos nominales la serie es inflación;
            en dólares se ve el precio real de la hacienda a través de cuatro regímenes cambiarios.
          </p>
        </div>
      </div>

      {/* Stats hoy */}
      {last && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="terminal-panel px-4 py-3">
            <div className="text-xxs text-zinc-500 uppercase tracking-wider mb-1">Hoy · USD oficial</div>
            <div className="text-2xl font-mono tabular-nums text-positive">{last.usd_oficial ? `${fmt(last.usd_oficial)}` : '—'}</div>
          </div>
          <div className="terminal-panel px-4 py-3">
            <div className="text-xxs text-zinc-500 uppercase tracking-wider mb-1">Hoy · USD blue</div>
            <div className="text-2xl font-mono tabular-nums text-zinc-100">{last.usd_blue ? `${fmt(last.usd_blue)}` : '—'}</div>
          </div>
          <div className="terminal-panel px-4 py-3">
            <div className="text-xxs text-zinc-500 uppercase tracking-wider mb-1">Mín 20 años</div>
            <div className="text-2xl font-mono tabular-nums text-zinc-100">{min ? fmt(min) : '—'}</div>
          </div>
          <div className="terminal-panel px-4 py-3">
            <div className="text-xxs text-zinc-500 uppercase tracking-wider mb-1">Máx 20 años</div>
            <div className="text-2xl font-mono tabular-nums text-zinc-100">{max ? fmt(max) : '—'}</div>
          </div>
        </div>
      )}

      {/* Hero: 20 años en USD oficial (mensual) */}
      <section className="terminal-panel mb-6">
        <div className="terminal-panel-header flex items-center justify-between">
          <span>USD oficial · promedio mensual · 2006 → hoy</span>
          <span className="text-xxs text-zinc-500 tabular-nums">{mensualOficial.length} meses</span>
        </div>
        <div className="px-panel py-4">
          <PriceLineChart data={mensualOficial} height={260} accentColor="#34d399" decimals={2} prefix="USD " />
        </div>
      </section>

      {/* Blue (la brecha) */}
      <section className="terminal-panel mb-6">
        <div className="terminal-panel-header flex items-center justify-between">
          <span>USD blue · promedio mensual · 2011 → hoy</span>
          <span className="text-xxs text-zinc-500">antes de 2011 no había brecha</span>
        </div>
        <div className="px-panel py-4">
          <PriceLineChart data={mensualBlue} height={200} accentColor="#38bdf8" decimals={2} prefix="USD " />
        </div>
      </section>

      {/* Último año, diario */}
      <section className="terminal-panel mb-8">
        <div className="terminal-panel-header">Últimos 12 meses · diario · USD oficial</div>
        <div className="px-panel py-4">
          <PriceLineChart data={ultimo12m} height={180} accentColor="#34d399" decimals={2} prefix="USD " />
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-8">
        <h2 className="text-zinc-100 text-lg font-medium mb-4">Preguntas frecuentes</h2>
        <div className="space-y-4">
          {faq.map((f) => (
            <div key={f.question} className="terminal-panel px-panel py-4">
              <h3 className="text-zinc-200 text-sm font-medium mb-1.5">{f.question}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Enterprise — la serie completa por API */}
      <section className="rounded-xl border border-sky-500/30 bg-sky-500/[0.05] p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div>
          <h2 className="text-lg font-semibold text-white">La serie completa, por API</h2>
          <p className="text-sm text-zinc-400 mt-1">
            {serie.length.toLocaleString('es-AR')} días (2006→hoy) en ARS, USD oficial y USD blue:{' '}
            <code className="text-sky-300 text-xs">GET /api/precios?historico=7700&serie=novillitos</code>.
            Nadie más sirve esta serie.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3 shrink-0">
          <Link href="/enterprise" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-sky-300">
            Planes API →
          </Link>
        </div>
      </section>

      <p className="text-xxs text-zinc-600 mt-6">
        Fuentes: Mercado Agroganadero (haciinfo000307) · BCRA estadisticascambiarias · ArgentinaDatos · dolarapi.
        Serie de referencia, no asesoramiento. Actualización diaria (días de rueda).
      </p>
    </div>
  )
}
