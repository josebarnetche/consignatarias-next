import { ImagenTema } from '@/components/ui/ImagenTema'
import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, FAQPageSchema, DatasetSchema, SpeakableSchema } from '@/components/seo/JsonLd'
import { DESCARGA_SERIE_INMAG, FUENTE_MAG } from '@/lib/seo/schemas'
import { fetchNovillitoUsdJoined, fetchInmagUsdJoined, aggregateMonthly } from '@/lib/charts/data'
import { PriceLineChart } from '@/components/charts/PriceLineChart'
import { SuscribirAlertaNovillo } from '@/components/alertas/SuscribirAlertaNovillo'

/**
 * EL novillo en dólares: una sola página para la pregunta.
 *
 * Hasta la v1.255.1 había tres que competían por la misma búsqueda, cada una con su
 * canonical: /el-novillo-en-dolares (la máquina scrollable de 2015→hoy), /mercado/inmag-dolares
 * (el INMAG ÷ blue con alertas) y ésta. Queda ésta porque es la que traía impresiones en
 * Search Console (W29-W43: 5 clics y 123 impresiones, contra 1/13 y 2/4). Las otras dos son
 * 301 hacia acá (vercel.json) y lo que tenían de propio vive en las secciones
 * `#inmag-dolares`, `#dias` y `#alerta`.
 */

export const revalidate = 86400 // diaria — la serie se actualiza con el cron nocturno

const PAGE_URL = 'https://www.consignatarias.com.ar/mercado/novillo-historico'
const DESDE = '2006-01-01'
/** El INMAG arranca en 2015; los días de la sección `#dias` empiezan en diciembre de ese año. */
const DESDE_INMAG = '2015-01-01'
/** Kilos de un novillo para pasar el precio por kilo a precio por cabeza. */
const KG_NOVILLO = 460

const fmt = (n: number, max = 2) => n.toLocaleString('es-AR', { maximumFractionDigits: max })
const fmtPct = (n: number | null) =>
  n === null ? '—' : `${n >= 0 ? '+' : ''}${n.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`
const chgClass = (n: number | null) =>
  n === null || n === 0 ? 'text-zinc-400' : n > 0 ? 'text-positive' : 'text-negative'
const fmtFecha = (iso: string) => {
  const [y, m, d] = iso.split('-')
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${parseInt(d, 10)} ${MES[parseInt(m, 10) - 1]} ${y}`
}

// Días que movieron la serie (2015→). Venían de /el-novillo-en-dolares; el valor de cada uno
// se calcula con el INMAG y el blue de ese día, no está escrito acá.
const DIAS: { date: string; label: string; ctx: string }[] = [
  {
    date: '2015-12-17',
    label: 'Macri libera el cepo',
    ctx: 'El primer sinceramiento cambiario. El dólar saltó de golpe y el novillo quedó valuado cerca de 800 dólares — el techo de la era que arrancaba.',
  },
  {
    date: '2018-08-30',
    label: 'La corrida de 2018',
    ctx: 'La corrida se comió al peso más rápido que a la hacienda. En dólares, el novillo se derrumbó casi 300 dólares respecto de 2015 — la misma vaca, la mitad de valor.',
  },
  {
    date: '2019-08-12',
    label: 'Lunes negro post-PASO',
    ctx: 'Las PASO devaluaron todo en un día. Pero el ganado, medido en dólares, casi no se movió: el peso es el que se derrite, no el animal.',
  },
  {
    date: '2020-03-20',
    label: 'Arranca la cuarentena',
    ctx: 'Pandemia, cepo reforzado y brecha que se abría. El novillo planchado en dólares — la hacienda como refugio mientras el peso se licuaba.',
  },
  {
    date: '2021-10-15',
    label: 'El novillo más barato en dólares',
    ctx: 'El piso de toda la serie. Con la brecha cambiaria en su peor momento, nunca un novillo argentino valió tan poco medido en dólares blue.',
  },
  {
    date: '2023-08-14',
    label: 'Milei gana la PASO',
    ctx: 'Otro piso. El mercado ya descontaba el salto que se venía: hacienda regalada en dólares a la espera de la corrección.',
  },
  {
    date: '2023-12-13',
    label: 'La devaluación de Milei',
    ctx: 'El oficial pasó de 350 a 800 pesos de un día para el otro. El novillo, en dólares, recuperó de golpe unos 250 dólares por cabeza.',
  },
  {
    date: '2024-12-10',
    label: 'Un año de Milei',
    ctx: 'Con la brecha cerrándose y la inflación cediendo, el ganado se revaluó fuerte en dólares. Casi 1.000 dólares la cabeza.',
  },
]

export async function generateMetadata(): Promise<Metadata> {
  const today = new Date().toISOString().slice(0, 10)
  const serie = await fetchNovillitoUsdJoined(DESDE, today)
  const last = serie[serie.length - 1]
  const title = last?.usd_oficial
    ? `Precio del Novillo en Dólares: 20 Años de Historia (USD ${fmt(last.usd_oficial)}/kg hoy)`
    : 'Precio del novillo en dólares — serie histórica desde 2006'
  const description = last
    ? `Serie diaria del Novillito 401/420 kg desde 2006 en USD oficial y blue: hoy USD ${fmt(last.usd_oficial ?? 0)}/kg (oficial). Más el INMAG en dólares blue de los últimos 12 meses y los días que movieron la serie, del cepo de 2015 a hoy.`
    : 'Serie diaria del Novillito 401/420 kg desde 2006, convertida a USD oficial y blue, y el INMAG en dólares blue.'
  return {
    title,
    description,
    keywords: [
      'precio novillo en dolares historico',
      'novillo en dolares',
      'INMAG en dolares',
      'precio kilo vivo en dolares',
      'cuanto vale el novillo en dolares',
      'novillito 401 420 historico',
      'precio hacienda dolares 20 años',
      'serie historica ganado argentina',
      'novillo dolar blue historico',
    ],
    openGraph: {
      images: [{ url: '/og-mercado.png', width: 1200, height: 630 }], title, description, url: PAGE_URL, type: 'website' },
    alternates: { canonical: PAGE_URL },
  }
}

/** Último valor en o antes de una fecha (la serie salta fines de semana y feriados). */
function valorEnOAntes(rows: { date: string; value: number }[], iso: string): number | null {
  let v: number | null = null
  for (const r of rows) {
    if (r.date <= iso) v = r.value
    else break
  }
  return v
}

export default async function NovilloHistoricoPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [serie, inmagSerie] = await Promise.all([
    fetchNovillitoUsdJoined(DESDE, today),
    fetchInmagUsdJoined(DESDE_INMAG, today),
  ])

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

  // ─── INMAG ÷ dólar blue (venía de /mercado/inmag-dolares) ───
  const isoDaysAgo = (n: number) => {
    const d = new Date(`${today}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - n)
    return d.toISOString().slice(0, 10)
  }
  const inmagUsdDaily = inmagSerie
    .filter((d) => d.inmag_usd !== null)
    .map((d) => ({ date: d.date, value: d.inmag_usd as number }))
  const date365 = isoDaysAgo(365)
  const inmagReciente = inmagUsdDaily.filter((d) => d.date >= date365)
  const inmagHoy = inmagUsdDaily.length ? inmagUsdDaily[inmagUsdDaily.length - 1].value : null
  const inmag30 = valorEnOAntes(inmagUsdDaily, isoDaysAgo(30))
  const inmag12m = valorEnOAntes(inmagUsdDaily, date365)
  const recVals = inmagReciente.map((d) => d.value)
  const inmagMin12 = recVals.length ? Math.min(...recVals) : null
  const inmagMax12 = recVals.length ? Math.max(...recVals) : null
  const chg30 = inmagHoy !== null && inmag30 ? ((inmagHoy - inmag30) / inmag30) * 100 : null
  const chg12 = inmagHoy !== null && inmag12m ? ((inmagHoy - inmag12m) / inmag12m) * 100 : null

  // ─── Los días que movieron la serie (venían de /el-novillo-en-dolares) ───
  // Un novillo de ~460 kg al INMAG ÷ blue de ese día: la misma cuenta que hacía la página vieja.
  const dias = DIAS.map((d) => {
    const usdKg = valorEnOAntes(inmagUsdDaily, d.date)
    return { ...d, porCabeza: usdKg !== null ? Math.round(usdKg * KG_NOVILLO) : null }
  }).filter((d) => d.porCabeza !== null)

  const faq = [
    {
      question: '¿Cuánto vale el novillo en dólares hoy?',
      answer: last?.usd_oficial
        ? `Hoy el Novillito 401/420 kg promedia USD ${fmt(last.usd_oficial)}/kg vivo al dólar oficial${last.usd_blue ? ` (USD ${fmt(last.usd_blue)} al blue)` : ''}. En pesos: $${fmt(last.ars, 0)}/kg.${inmagHoy ? ` El INMAG, el índice del novillo del Mercado Agroganadero, equivale a USD ${fmt(inmagHoy)}/kg vivo al dólar blue.` : ''}`
        : 'Estamos actualizando la serie. Volvé en unas horas.',
    },
    {
      question: '¿Cuánto valía el novillo en dólares hace 20 años?',
      answer: first?.usd_oficial
        ? `En enero de 2006 el Novillito 401/420 promediaba USD ${fmt(first.usd_oficial)}/kg vivo ($${fmt(first.ars)} de esa época). En 20 años la serie mensual en USD oficial se movió entre USD ${fmt(min ?? 0)} y USD ${fmt(max ?? 0)}/kg, con promedio USD ${fmt(avg ?? 0)}.`
        : 'Serie en carga.',
    },
    {
      question: '¿Por qué medir el novillo en dólares y no en pesos?',
      answer:
        'Porque el peso pierde valor con la inflación año a año, y un precio en pesos no se puede comparar entre 2015 y hoy sin ajustar. Medido en dólares el novillo se vuelve comparable en el tiempo: separa lo que sube por la moneda de lo que sube por el mercado ganadero. Es la lente para ver si la hacienda se revaluó o se abarató.',
    },
    {
      question: '¿Por qué difieren el precio al oficial y al blue?',
      answer:
        'Entre 2011 y 2015, y de nuevo entre 2019 y 2024, la brecha cambiaria hizo que el mismo novillo "valiera" mucho menos en dólares blue que al oficial (en octubre de 2023, USD 2,05 vs USD 0,93). Con la unificación cambiaria las dos series convergen. Antes de 2011 no había brecha: la serie blue arranca con el cepo.',
    },
    {
      question: '¿A qué dólar se convierte?',
      answer:
        'El Novillito se muestra a los dos: oficial (BCRA 2006-2010, ArgentinaDatos/dolarapi desde 2011) y blue (nuestra serie diaria desde 2011). El INMAG en dólares usa el blue venta del mismo día; si el blue no publica (feriado cambiario), se toma la última cotización válida. Es la misma regla que usan las alertas y el servidor MCP.',
    },
    {
      question: '¿De dónde sale esta serie?',
      answer:
        'Del Mercado Agroganadero (haciinfo000307), que publica el Novillito 401/420 kg desde el 9/12/2005 como continuidad de la antigua categoría Novillos 401/420 — la base histórica de contratos de arrendamiento. El INMAG diario sale del mismo mercado desde 2015.',
    },
    {
      question: '¿Esto sirve para fijar contratos?',
      answer:
        'Sirve como referencia macro y para ver percentiles históricos en contratos a plazo en dólares (alquiler de campo, acopio). Para una operación concreta se usa el precio en pesos del día de la operación.',
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SectionBreadcrumbSchema section="mercado/novillo-historico" sectionName="Novillo histórico en USD" />
      <FAQPageSchema items={faq} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="El novillo en dólares: 20 años de historia"
        cssSelectors={['h1', '.speakable-content']}
      />
      <DatasetSchema
        name="Novillo en dólares — Novillito 401/420 kg desde 2006 e INMAG desde 2015"
        description="Precio promedio diario del Novillito 401/420 kg (Mercado de Liniers → Mercado Agroganadero) desde 2006, con conversión a dólar oficial y blue, y el INMAG diario dividido por el dólar blue venta desde 2015."
        url={PAGE_URL}
        keywords={['novillito', 'precio novillo historico', 'novillo en dólares', 'INMAG en dólares', 'hacienda dolares', 'Liniers', 'Cañuelas']}
        license={null}
        fuente={FUENTE_MAG}
        distribution={[DESCARGA_SERIE_INMAG]}
      />

      {/* Hero — la luna sobre el campo (linocut), fondo sutil */}
      <div className="relative overflow-hidden rounded-xl mb-8">
        <ImagenTema
          src="/marca/ilus/ilu-c-luna.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/70 to-zinc-950" aria-hidden="true" />
        <div className="relative py-4">
          <p className="text-xxs font-terminal text-zinc-500 uppercase tracking-widest mb-2">
            <Link href="/mercado" className="text-accent hover:text-accent-bright">Mercado</Link> / Novillo en dólares
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-50 leading-tight mb-3">
            El novillo en dólares: 20 años de historia
          </h1>
          <p className="speakable-content text-zinc-400 leading-relaxed max-w-2xl">
            La serie diaria del <strong className="text-zinc-200">Novillito 401/420 kg</strong> desde enero de 2006 —
            de la era Liniers al MAG de Cañuelas — convertida a{' '}
            <strong className="text-zinc-200">dólar oficial y blue</strong>, y el INMAG en dólares blue de los
            últimos doce meses. En pesos nominales la serie es inflación; en dólares se ve el precio real de la
            hacienda a través de cuatro regímenes cambiarios.
          </p>
          <nav aria-label="Secciones" className="mt-4 flex flex-wrap gap-2 text-xxs">
            {[
              ['#inmag-dolares', 'INMAG en dólares'],
              ['#dias', 'Los días que movieron la serie'],
              ['#alerta', 'Alerta por mail'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-full border border-terminal-border bg-terminal-panel px-3 py-1 text-zinc-400 hover:border-accent hover:text-accent transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>
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

      {/* INMAG ÷ dólar blue — la serie de las alertas y del MCP */}
      {inmagHoy !== null && (
        <section id="inmag-dolares" className="mb-8 scroll-mt-24">
          <h2 className="text-zinc-100 text-lg font-medium mb-1">El INMAG en dólares blue</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-4 max-w-2xl">
            El INMAG —el índice del novillo del Mercado Agroganadero, ponderado por volumen— dividido por el dólar
            blue venta del mismo día. La pregunta que responde: <span className="text-zinc-200">¿subió el ganado o se devaluó el peso?</span>
          </p>
          <div className="terminal-panel mb-4">
            <div className="terminal-panel-header">Últimos 12 meses en USD/kg vivo</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-terminal-border">
              <div className="bg-terminal-panel px-4 py-4">
                <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Hoy</div>
                <div className="text-2xl font-terminal tabular-nums text-accent">USD {fmt(inmagHoy)}</div>
              </div>
              <div className="bg-terminal-panel px-4 py-4">
                <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">vs hace 30 días</div>
                <div className={`text-2xl font-terminal tabular-nums ${chgClass(chg30)}`}>{fmtPct(chg30)}</div>
              </div>
              <div className="bg-terminal-panel px-4 py-4">
                <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">vs hace 12 meses</div>
                <div className={`text-2xl font-terminal tabular-nums ${chgClass(chg12)}`}>{fmtPct(chg12)}</div>
              </div>
              <div className="bg-terminal-panel px-4 py-4">
                <div className="text-zinc-500 text-xxs font-terminal uppercase tracking-wider mb-1">Rango 12m</div>
                <div className="text-base font-terminal tabular-nums text-zinc-300 leading-tight pt-1.5">
                  USD {fmt(inmagMin12 ?? 0)} – {fmt(inmagMax12 ?? 0)}
                </div>
              </div>
            </div>
          </div>
          <div className="terminal-panel">
            <div className="terminal-panel-header">INMAG ÷ blue · últimos 12 meses, día por día</div>
            <div className="px-panel py-4">
              <PriceLineChart data={inmagReciente} height={240} accentColor="rgb(var(--accent))" decimals={2} prefix="US$ " />
            </div>
            <div className="px-panel pb-3 text-zinc-500 text-xxs">
              Cada punto es un día de operación. La escala sigue el rango reciente, no arranca en cero.
              Fuente: INMAG (MAG Cañuelas) ÷ dólar blue venta.
            </div>
          </div>
        </section>
      )}

      {/* Los días que movieron la serie */}
      {dias.length > 0 && (
        <section id="dias" className="mb-8 scroll-mt-24">
          <h2 className="text-zinc-100 text-lg font-medium mb-1">Los días que movieron la serie</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-4 max-w-2xl">
            Un novillo de ~{KG_NOVILLO} kg al INMAG de ese día, dividido por el dólar blue. La misma hacienda,
            y lo que valía en dólares según qué pasaba en la Argentina.
          </p>
          <ol className="space-y-3">
            {dias.map((d) => (
              <li key={d.date} className="terminal-panel px-panel py-4 border-l-2 border-l-accent/60">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <div className="text-xxs font-terminal uppercase tracking-widest text-zinc-500">{fmtFecha(d.date)}</div>
                    <h3 className="text-zinc-100 text-base font-medium">{d.label}</h3>
                  </div>
                  <div className="text-xl font-mono tabular-nums text-accent">
                    USD {Math.round(d.porCabeza as number).toLocaleString('es-AR')}
                    <span className="text-xxs text-zinc-500 font-terminal"> / novillo</span>
                  </div>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed mt-2">{d.ctx}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

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

      {/* La alerta va acá: quien mira la serie en dólares es quien quiere que le avisen cuando se mueva. */}
      <div id="alerta" className="max-w-2xl mx-auto mb-8 scroll-mt-24">
        <SuscribirAlertaNovillo source="novillo-historico" />
      </div>

      {/* CTA Enterprise — la serie completa por API */}
      <section className="rounded-xl border border-sky-500/30 bg-sky-500/[0.05] p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div>
          <h2 className="text-lg font-semibold text-ink">La serie completa, por API</h2>
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

      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <Link href="/mercado/novillos" className="text-accent hover:underline">Precio del novillo en pesos →</Link>
        <Link href="/mercado/inmag" className="text-accent hover:underline">El INMAG de hoy →</Link>
        <Link href="/mercado/arrendamiento" className="text-accent hover:underline">Novillo para arrendamiento →</Link>
        <Link href="/metodologia" className="text-accent hover:underline">Metodología →</Link>
      </div>

      <p className="text-xxs text-zinc-600 mt-6">
        Fuentes: Mercado Agroganadero (haciinfo000307 e INMAG diario) · BCRA estadisticascambiarias · ArgentinaDatos · dolarapi.
        Serie de referencia, no asesoramiento. Actualización diaria (días de rueda).
      </p>
    </div>
  )
}
