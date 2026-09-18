import { Metadata } from 'next'
import Link from 'next/link'
import type { SupabaseClient } from '@supabase/supabase-js'
import marketData from '@/lib/data/market-prices.json'
import { adminClientOpcional } from '@/lib/supabase-server'
import { SectionBreadcrumbSchema, DatasetSchema, FAQPageSchema, SpeakableSchema } from '@/components/seo/JsonLd'
import { Delta, DataTable, PriceCell, type DataColumn } from '@/components/ui'
import { signedTone } from '@/lib/ui/tokens'

// SSG con rebuild diario: el scraper reescribe market-prices.json (14:00 ART → commit →
// Vercel), y la rueda anterior sale de mag_prices_detailed (cron 15:30 ART, mar/mié/vie).
export const revalidate = 86400

/**
 * /mercado/canuelas — la página de PRECIOS del Mercado de Cañuelas.
 *
 * Por qué se rehízo (GSC, 28 días al 13-09-2026): "mercado de cañuelas precios (hoy)",
 * "precio hacienda cañuelas", "precio mercado de cañuelas", "mercado de hacienda de
 * cañuelas precios hoy" suman ~2.000 impresiones/mes en posición 9-10 con 25 clics. La
 * página existía pero era la explicación de qué es Cañuelas con un solo número (el INMAG):
 * quien busca "precios" quiere el tablero de la rueda —mínimo, máximo y promedio por
 * categoría, cabezas, procedencia—, que es lo que publican el propio MAG y los sitios que
 * ganan esa búsqueda. Los datos ya estaban en el repo (detailedCategories del scraper y
 * mag_prices_detailed en Supabase); sólo faltaba mostrarlos acá.
 */

const URL = 'https://www.consignatarias.com.ar/mercado/canuelas'
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const inmag = marketData.inmag as { current: number; prev: number; change: number; unit: string }
const categorias = marketData.categories as Record<string, { current: number; change: number; source?: string; latestVolume?: number }>
const detallado = marketData.detailedCategories as {
  date: string
  categories: { category: string; minPrice: number; maxPrice: number; avgPrice: number; cabezas: number }[]
}
const entradas = marketData.provinceEntry as {
  date: string
  totalCabezas: number
  provinces: { province: string; enPie: number; total: number; percentage: number }[]
}
const lastUpdate = marketData.lastUpdate as string

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
const fmtFecha = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} de ${MESES[m - 1]} de ${y}`
}
const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toUpperCase()

// Las 6 categorías con página propia en /precios/[categoria]. El ternero es referencia
// derivada (no se opera en el MAG), por eso no entra en el tablero de la rueda.
const RESUMEN: { slug: string; label: string; singular: string }[] = [
  { slug: 'novillos', label: 'Novillos', singular: 'el novillo' },
  { slug: 'novillitos', label: 'Novillitos', singular: 'el novillito' },
  { slug: 'vaquillonas', label: 'Vaquillonas', singular: 'la vaquillona' },
  { slug: 'vacas', label: 'Vacas', singular: 'la vaca' },
  { slug: 'toros', label: 'Toros', singular: 'el toro' },
  { slug: 'terneros', label: 'Terneros', singular: 'el ternero' },
]

const PROVINCIA_LABEL: Record<string, string> = {
  'BUENOS AIRES': 'Buenos Aires',
  'LA PAMPA': 'La Pampa',
  CORDOBA: 'Córdoba',
  'SANTA FE': 'Santa Fe',
  'ENTRE RIOS': 'Entre Ríos',
  'SAN LUIS': 'San Luis',
  CORRIENTES: 'Corrientes',
  'RIO NEGRO': 'Río Negro',
  MENDOZA: 'Mendoza',
  CHACO: 'Chaco',
  'SGO. DEL ESTERO': 'Santiago del Estero',
  'SANTIAGO DEL ESTERO': 'Santiago del Estero',
  FORMOSA: 'Formosa',
  MISIONES: 'Misiones',
  SALTA: 'Salta',
  TUCUMAN: 'Tucumán',
  NEUQUEN: 'Neuquén',
}
const provLabel = (p: string) => PROVINCIA_LABEL[norm(p)] ?? p

interface FilaRueda {
  categoria: string
  min: number
  max: number
  promedio: number
  cabezas: number
  /** Variación del promedio contra la rueda anterior (mag_prices_detailed), null si no hay dato. */
  cambio: number | null
}

/**
 * Rueda anterior, desde mag_prices_detailed (tabla que alimenta /api/precios?detallado).
 * Se pide una ventana corta y se toma la última fecha ANTERIOR a la rueda que muestra el
 * JSON. Si la base no está (preview), la tabla sale sin la columna de variación: nunca
 * se inventa una rueda.
 */
async function getRuedaAnterior(fechaActual: string): Promise<{ date: string; promedio: Map<string, number> } | null> {
  const db = adminClientOpcional() as unknown as SupabaseClient | null
  if (!db) return null
  const { data } = await db
    .from('mag_prices_detailed')
    .select('date, subcategory, price_avg')
    .lt('date', fechaActual)
    .order('date', { ascending: false })
    .limit(60)
  if (!data || data.length === 0) return null
  const date = data[0].date as string
  const promedio = new Map<string, number>()
  for (const r of data) {
    if (r.date !== date || r.price_avg == null) continue
    promedio.set(norm(r.subcategory as string), Number(r.price_avg))
  }
  return promedio.size ? { date, promedio } : null
}

function filasRueda(prev: Map<string, number> | null): FilaRueda[] {
  return detallado.categories
    .filter((c) => c.category && norm(c.category) !== 'TOTALES' && c.avgPrice > 0)
    .map((c) => {
      const p = prev?.get(norm(c.category))
      return {
        categoria: c.category.replace(/\s+/g, ' ').trim(),
        min: c.minPrice,
        max: c.maxPrice,
        promedio: c.avgPrice,
        cabezas: c.cabezas,
        cambio: p ? ((c.avgPrice - p) / p) * 100 : null,
      }
    })
}

const totales = detallado.categories.find((c) => norm(c.category) === 'TOTALES') ?? null

const vaca = categorias.vacas?.current ?? null
const novillito = categorias.novillitos?.current ?? null
const vaquillona = categorias.vaquillonas?.current ?? null
const toro = categorias.toros?.current ?? null

export const metadata: Metadata = {
  title: `Precios Mercado de Cañuelas Hoy: novillo $${fmt(inmag.current)}/kg${vaca ? ` · vaca $${fmt(vaca)}/kg` : ''}`,
  description: `Precios del Mercado de Cañuelas (Mercado Agroganadero, ex Liniers) de la rueda del ${fmtFecha(detallado.date)}: novillo $${fmt(inmag.current)}/kg vivo (INMAG)${vaca ? `, vaca $${fmt(vaca)}/kg` : ''}${novillito ? `, novillito $${fmt(novillito)}/kg` : ''}. Tabla con mínimo, máximo, promedio y cabezas de cada categoría${totales ? ` sobre ${fmt(totales.cabezas)} cabezas` : ''}, y de dónde vino la hacienda.`,
  keywords: [
    'mercado de cañuelas precios',
    'mercado de cañuelas precios hoy',
    'precio mercado de cañuelas',
    'precio hacienda cañuelas',
    'mercado de hacienda de cañuelas precios hoy',
    'precio de la hacienda en cañuelas',
    'precio novillo cañuelas',
    'mercado agroganadero precios',
    'cotización cañuelas',
    'MAG cañuelas precios hoy',
  ],
  openGraph: {
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
    title: `Precios Mercado de Cañuelas Hoy: novillo $${fmt(inmag.current)}/kg vivo`,
    description: `Tablero de la rueda del ${fmtFecha(detallado.date)} del Mercado Agroganadero: mínimo, máximo y promedio por categoría, cabezas y procedencia.`,
    url: URL,
    type: 'website',
  },
  alternates: { canonical: URL },
}

export default async function MercadoCanuelasPage() {
  const anterior = await getRuedaAnterior(detallado.date)
  const filas = filasRueda(anterior?.promedio ?? null)
  const hayVariacion = filas.some((f) => f.cambio != null)
  const isPositive = inmag.change >= 0

  const faq = [
    {
      question: '¿Cuáles son los precios del Mercado de Cañuelas hoy?',
      answer: `En la rueda del ${fmtFecha(detallado.date)} del Mercado Agroganadero de Cañuelas el novillo promedió $${fmt(inmag.current)} por kilo vivo (índice INMAG, ${isPositive ? '+' : ''}${inmag.change.toFixed(1)}% contra la rueda anterior)${vaca ? `, la vaca $${fmt(vaca)}/kg` : ''}${novillito ? `, el novillito $${fmt(novillito)}/kg` : ''}${vaquillona ? `, la vaquillona $${fmt(vaquillona)}/kg` : ''}${toro ? ` y el toro $${fmt(toro)}/kg` : ''}.${totales ? ` Se vendieron ${fmt(totales.cabezas)} cabezas con un promedio general de $${fmt(totales.avgPrice)}/kg.` : ''} La tabla de esta página tiene el mínimo, el máximo y el promedio de cada una de las ${filas.length} categorías que publica el mercado.`,
    },
    {
      question: '¿Qué días hay precios nuevos en Cañuelas?',
      answer: 'El Mercado Agroganadero opera los martes, miércoles y viernes. Los precios de esta página corresponden a la última rueda con operaciones; un jueves o un lunes se ve la rueda anterior, no un valor nuevo. El tablero se actualiza el mismo día de la rueda, después del cierre.',
    },
    {
      question: '¿Qué es el Mercado de Cañuelas?',
      answer: 'El Mercado de Cañuelas es el Mercado Agroganadero (MAG), el principal mercado concentrador de hacienda de Argentina. Opera en Cañuelas, provincia de Buenos Aires, desde 2018, cuando reemplazó al histórico Mercado de Liniers que funcionó en CABA hasta ese año.',
    },
    {
      question: '¿Es lo mismo el Mercado de Cañuelas que el de Liniers?',
      answer: 'Es su continuación. El Mercado de Liniers cerró en 2018 tras más de un siglo en el barrio de Mataderos (CABA) y su operatoria se mudó a Cañuelas como Mercado Agroganadero. Cuando en el campo se dice "precio Liniers" hoy se refiere, en la práctica, al precio del Mercado de Cañuelas.',
    },
    {
      question: '¿Qué es el índice INMAG?',
      answer: `El INMAG (Índice Novillo Mercado Agroganadero) es el precio promedio ponderado por kilos del novillo operado en el Mercado de Cañuelas, publicado al cierre de cada rueda. Hoy es $${fmt(inmag.current)}/kg vivo. Es la referencia de precio más usada del mercado ganadero argentino y la base del índice de arrendamiento rural.`,
    },
    {
      question: '¿De dónde viene la hacienda que se vende en Cañuelas?',
      answer: entradas.provinces.length
        ? `En la entrada del ${fmtFecha(entradas.date)} ingresaron ${fmt(entradas.totalCabezas)} cabezas. ${entradas.provinces
            .slice(0, 3)
            .map((p) => `${provLabel(p.province)} aportó el ${p.percentage.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`)
            .join(', ')}. El resto se reparte entre las demás provincias ganaderas.`
        : 'La mayor parte de la hacienda que se vende en Cañuelas viene de la provincia de Buenos Aires, seguida por La Pampa, Córdoba, Santa Fe y Entre Ríos.',
    },
  ]

  const columns: DataColumn<FilaRueda>[] = [
    {
      key: 'categoria',
      header: 'Categoría',
      cell: (r) => <span className="text-zinc-300">{r.categoria}</span>,
    },
    {
      key: 'min',
      header: 'Mínimo',
      numeric: true,
      hideBelowSm: true,
      cell: (r) => <PriceCell value={r.min} prefix="$" tone="neutral" />,
    },
    {
      key: 'max',
      header: 'Máximo',
      numeric: true,
      hideBelowSm: true,
      cell: (r) => <PriceCell value={r.max} prefix="$" tone="neutral" />,
    },
    {
      key: 'promedio',
      header: 'Promedio',
      numeric: true,
      cell: (r) => <PriceCell value={r.promedio} prefix="$" suffix="/kg" />,
    },
    ...(hayVariacion
      ? [
          {
            key: 'cambio',
            header: 'vs. rueda anterior',
            numeric: true,
            cell: (r: FilaRueda) => <Delta change={r.cambio} format={(abs) => abs.toFixed(1)} />,
          } as DataColumn<FilaRueda>,
        ]
      : []),
    {
      key: 'cabezas',
      header: 'Cabezas',
      numeric: true,
      cell: (r) => <span className="text-zinc-500 tabular-nums">{fmt(r.cabezas)}</span>,
    },
  ]

  return (
    <>
      <SectionBreadcrumbSchema section="mercado/canuelas" sectionName="Mercado de Cañuelas" />
      <DatasetSchema
        name="Precios del Mercado de Cañuelas (Mercado Agroganadero) por categoría"
        description={`Precios de la rueda del ${fmtFecha(detallado.date)} del Mercado Agroganadero de Cañuelas: mínimo, máximo, promedio y cabezas de cada categoría de hacienda en pie, más el índice INMAG del novillo ($${fmt(inmag.current)}/kg vivo) y la procedencia por provincia.`}
        url={URL}
        keywords={['mercado de cañuelas precios', 'precio hacienda cañuelas', 'mercado agroganadero', 'INMAG', 'precio novillo', 'hacienda en pie']}
        dateModified={lastUpdate}
        temporalCoverage={detallado.date}
        updateFrequency="daily"
        variableMeasured={{
          name: 'INMAG — precio promedio ponderado del novillo en el Mercado Agroganadero',
          value: inmag.current,
          unitText: 'ARS/kg vivo',
          observationDate: detallado.date,
        }}
      />
      <FAQPageSchema items={faq} />
      <SpeakableSchema url={URL} headline={`Precios del Mercado de Cañuelas hoy: novillo $${fmt(inmag.current)}/kg`} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <nav className="text-xs text-zinc-500 mb-3 flex items-center gap-1" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-zinc-300">Inicio</Link>
            <span>/</span>
            <Link href="/mercado" className="hover:text-zinc-300">Mercado</Link>
            <span>/</span>
            <span className="text-zinc-300">Cañuelas</span>
          </nav>

          <div className="flex items-center gap-3 mb-3">
            <span className="px-2.5 py-1 bg-sky-500/10 text-accent text-xs font-medium rounded-full border border-sky-500/20">
              RUEDA DEL {detallado.date}
            </span>
            <span className="text-sm text-zinc-500">Mercado Agroganadero (ex Liniers)</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-3">
            Precios del Mercado de Cañuelas hoy
          </h1>
          {/* Respuesta primero: los números de la rueda, con fecha. Es lo que cita un buscador con IA. */}
          <p className="speakable-content text-zinc-300 text-base leading-relaxed max-w-2xl">
            En la rueda del <strong className="text-zinc-100">{fmtFecha(detallado.date)}</strong> del Mercado
            Agroganadero de Cañuelas el novillo promedió{' '}
            <strong className="text-accent">${fmt(inmag.current)}/kg vivo</strong> (INMAG)
            {vaca ? <>, la vaca <strong className="text-zinc-100">${fmt(vaca)}/kg</strong></> : null}
            {novillito ? <>, el novillito <strong className="text-zinc-100">${fmt(novillito)}/kg</strong></> : null}
            {vaquillona ? <> y la vaquillona <strong className="text-zinc-100">${fmt(vaquillona)}/kg</strong></> : null}
            {totales ? <>, sobre {fmt(totales.cabezas)} cabezas vendidas</> : null}. Abajo, el mínimo, el máximo y el
            promedio de cada categoría, y de qué provincia vino la hacienda.
          </p>
        </div>

        {/* Números de cabecera */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-sky-500/10 to-transparent border border-sky-500/20 rounded-2xl p-6">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Novillo (INMAG)</div>
            <div className="text-3xl font-bold text-white tabular-nums">
              ${fmt(inmag.current)}<span className="text-lg text-zinc-500">/kg</span>
            </div>
            <div className={`text-xs mt-1 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{inmag.change.toFixed(1)}% vs. rueda anterior
            </div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Promedio general de la rueda</div>
            <div className="text-3xl font-bold text-white tabular-nums">
              {totales ? <>${fmt(totales.avgPrice)}<span className="text-lg text-zinc-500">/kg</span></> : '—'}
            </div>
            <div className="text-xs text-zinc-500 mt-1">todas las categorías, ponderado por kilos</div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Cabezas vendidas</div>
            <div className="text-3xl font-bold text-white tabular-nums">{totales ? fmt(totales.cabezas) : '—'}</div>
            <div className="text-xs text-zinc-500 mt-1">rueda del {detallado.date}</div>
          </div>
        </div>

        {/* Resumen por categoría con página propia */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
          {RESUMEN.map((c) => {
            const d = categorias[c.slug]
            if (!d) return null
            const pos = d.change >= 0
            return (
              <Link
                key={c.slug}
                href={`/precios/${c.slug}`}
                className="bg-zinc-900/30 border border-zinc-800 rounded p-3 hover:border-sky-500/30 transition-colors group"
              >
                <p className="text-zinc-400 text-xs mb-1 group-hover:text-accent transition-colors">{c.label}</p>
                <p className="text-zinc-100 text-lg font-semibold tabular-nums">${fmt(d.current)}<span className="text-xs text-zinc-500">/kg</span></p>
                <p className={`text-xs ${pos ? 'text-emerald-500' : 'text-red-500'}`}>
                  {pos ? '+' : ''}{d.change.toFixed(1)}%
                </p>
              </Link>
            )
          })}
        </div>

        {/* El tablero de la rueda */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-2">
            Precios por categoría — rueda del {fmtFecha(detallado.date)}
          </h2>
          <p className="text-zinc-500 text-sm mb-4">
            Las categorías tal como las publica el Mercado Agroganadero (Resolución MPyT), en pesos por kilo vivo.
            {hayVariacion && anterior
              ? ` La variación compara el promedio contra la rueda anterior (${fmtFecha(anterior.date)}).`
              : ''}
          </p>
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl overflow-hidden">
            <DataTable
              columns={columns}
              rows={filas}
              rowKey={(r) => r.categoria}
              rowTone={(r) => (r.cambio == null ? null : signedTone(r.cambio))}
              empty={<span className="text-zinc-500 text-sm">Sin rueda cargada todavía.</span>}
            />
            <div className="px-6 py-4 border-t border-zinc-800/50 bg-zinc-900/50 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-zinc-600">
                {filas.length} categorías · fuente: MAG, haciinfo000502 · actualizado {lastUpdate}
              </span>
              <Link href="/mercado/inmag" className="text-xs text-accent hover:text-accent-bright transition-colors">
                Serie histórica del INMAG
              </Link>
            </div>
          </div>
        </section>

        {/* Procedencia */}
        {entradas.provinces.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-white mb-2">De dónde vino la hacienda</h2>
            <p className="text-zinc-500 text-sm mb-4">
              Entrada del {fmtFecha(entradas.date)}: {fmt(entradas.totalCabezas)} cabezas, por provincia de origen.
            </p>
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800/50">
                    <th className="text-left font-normal px-6 py-3">Provincia</th>
                    <th className="text-right font-normal px-6 py-3">Cabezas</th>
                    <th className="text-right font-normal px-6 py-3">Participación</th>
                  </tr>
                </thead>
                <tbody>
                  {entradas.provinces.map((p) => (
                    <tr key={p.province} className="border-b border-zinc-900/60">
                      <td className="px-6 py-2.5 text-zinc-300">{provLabel(p.province)}</td>
                      <td className="px-6 py-2.5 text-right text-zinc-200 tabular-nums">{fmt(p.total)}</td>
                      <td className="px-6 py-2.5 text-right text-zinc-500 tabular-nums">
                        {p.percentage.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Qué es Cañuelas */}
        <section className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6 mb-10">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Cañuelas, el Mercado Agroganadero (ex Liniers)</h2>
          <div className="text-zinc-400 text-sm space-y-4">
            <p>
              El <strong className="text-zinc-200">Mercado Agroganadero (MAG)</strong> opera en Cañuelas, provincia
              de Buenos Aires, desde 2018. Reemplazó al histórico <strong className="text-zinc-200">Mercado de
              Liniers</strong>, que funcionó más de un siglo en el barrio porteño de Mataderos.
            </p>
            <p>
              Es el principal mercado concentrador de hacienda del país y la referencia de formación de precios. Su
              índice, el <Link href="/mercado/inmag" className="text-accent hover:text-accent-bright">INMAG</Link>,
              es el promedio ponderado por kilos del novillo operado en cada rueda, y es la base del{' '}
              <Link href="/mercado/arrendamiento/canuelas" className="text-accent hover:text-accent-bright">índice de
              arrendamiento</Link> con el que se liquidan los contratos rurales. Cuando en el campo se habla de
              &ldquo;precio Liniers&rdquo;, hoy se refiere en la práctica al precio de Cañuelas.
            </p>
            <p>
              Para el precio de cada categoría con su histórico, el detalle por peso y la comparación entre
              categorías, ver{' '}
              <Link href="/precios/hacienda-en-pie" className="text-accent hover:text-accent-bright">precios de la
              hacienda en pie</Link>.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-6">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {faq.map((f, i) => (
              <details key={i} className="group bg-zinc-900/30 border border-zinc-800/50 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-zinc-800/20 transition-colors">
                  <h3 className="text-white font-medium pr-4">{f.question}</h3>
                  <svg className="w-5 h-5 text-zinc-500 flex-shrink-0 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-zinc-400 text-sm leading-relaxed border-t border-zinc-800/30 pt-4">
                  {f.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Relacionados */}
        <section className="grid sm:grid-cols-3 gap-4 mb-10">
          <Link href="/mercado/arrendamiento/canuelas" className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-sky-500/30 transition-all group">
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-accent-bright transition-colors">Arrendamiento en Cañuelas</h3>
            <p className="text-sm text-zinc-500">Cómo se forma el índice novillo arrendamiento con el INMAG.</p>
          </Link>
          <Link href="/mercado/inmag" className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-sky-500/30 transition-all group">
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-accent-bright transition-colors">INMAG en vivo</h3>
            <p className="text-sm text-zinc-500">La serie del novillo desde 2015, en pesos y en dólares.</p>
          </Link>
          <Link href="/mercado/liniers" className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-sky-500/30 transition-all group">
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-accent-bright transition-colors">Mercado de Liniers</h3>
            <p className="text-sm text-zinc-500">Qué pasó con Liniers y con qué se reemplazó su precio.</p>
          </Link>
        </section>

        <p className="text-xs text-zinc-600 text-center">
          Fuente: Mercado Agroganadero de Cañuelas, precios por categoría (haciinfo000502) e ingreso por provincia.
          Actualizado el {lastUpdate}.
        </p>
      </div>
    </>
  )
}
