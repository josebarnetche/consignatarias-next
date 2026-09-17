import { Metadata } from 'next'
import Link from 'next/link'
import type { SupabaseClient } from '@supabase/supabase-js'
import marketPrices from '@/lib/data/market-prices.json'
import { createAdminClient } from '@/lib/supabase-server'
import { SectionBreadcrumbSchema, DatasetSchema, FAQPageSchema, SpeakableSchema } from '@/components/seo/JsonLd'
import { Delta, DataTable, PriceCell, type DataColumn } from '@/components/ui'
import { signedTone } from '@/lib/ui/tokens'

// SSG con rebuild diario: los cierres mensuales cambian una vez por mes (cron monthly-close),
// el período vigente lo actualiza el scraper 14:00 ART → git commit → Vercel.
export const revalidate = 86400

/**
 * /mercado/arrendamiento/mensual — la página del ÍNDICE MENSUAL.
 *
 * Por qué existe (GSC, 28 días al 13-09-2026): "indice novillo arrendamiento mensual" (2.126
 * impresiones, pos 7,8) y "precio novillo arrendamiento mensual" (1.903, pos 5,8) caían en
 * /mercado/arrendamiento, que es la página del valor DIARIO. Los sitios que ganan esas
 * búsquedas (elrural, informeganadero, indicenovilloarrendamiento.com) tienen una página
 * dedicada al histórico mes a mes. Esta es la nuestra: cada cierre oficial del MAG, con su
 * variación mensual e interanual, y el número que se liquida hoy.
 */

const URL = 'https://www.consignatarias.com.ar/mercado/arrendamiento/mensual'
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const arr = marketPrices.arrendamientoOficial
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 })
const fmt3 = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
const fmtFecha = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} de ${MESES[m - 1]} de ${y}`
}

interface MonthClose {
  year: number
  month: number
  key: string
  label: string
  inmag: number
  cabezas: number | null
  changeMoM: number | null
  changeYoY: number | null
}

/**
 * Cierres mensuales OFICIALES del MAG (tabla inmag_monthly_close): promedio ponderado del mes
 * = importe total / kilos totales (fila "Totales" de haciinfo000011). Coincide exacto con el
 * MAG; es el número con el que se liquidan los arrendamientos. Serie completa, más nueva arriba.
 */
async function getMonthlyCloses(): Promise<MonthClose[]> {
  const db = createAdminClient() as unknown as SupabaseClient
  const { data } = await db
    .from('inmag_monthly_close')
    .select('year, month, inmag, cabezas')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(72)
  const rows = (data || []).map((r) => ({
    year: r.year as number,
    month: r.month as number,
    inmag: Number(r.inmag),
    cabezas: (r.cabezas as number | null) ?? null,
  }))
  const byKey = new Map(rows.map((r) => [`${r.year}-${r.month}`, r.inmag]))
  return rows.map((r, i) => {
    const prev = rows[i + 1]
    const yoy = byKey.get(`${r.year - 1}-${r.month}`)
    return {
      ...r,
      key: `${r.year}-${String(r.month).padStart(2, '0')}`,
      label: `${MESES[r.month - 1]} ${r.year}`,
      changeMoM: prev ? ((r.inmag - prev.inmag) / prev.inmag) * 100 : null,
      changeYoY: yoy ? ((r.inmag - yoy) / yoy) * 100 : null,
    }
  })
}

export async function generateMetadata(): Promise<Metadata> {
  const closes = await getMonthlyCloses()
  const last = closes[0]
  const cierreStr = last ? `$${fmt(last.inmag)}/kg (${last.label})` : `$${fmt(arr.periodIndex)}/kg`
  const title = `Índice Novillo Arrendamiento Mensual: ${cierreStr} — histórico mes a mes`
  const description = last
    ? `Índice novillo arrendamiento mensual: el cierre oficial de ${last.label} fue $${fmt(last.inmag)}/kg (promedio ponderado del Mercado Agroganadero, el valor que se liquida). Período vigente: $${fmt(arr.periodIndex)}/kg. Tabla histórica mes a mes con variación mensual e interanual.`
    : `Índice novillo arrendamiento mensual: promedio del período vigente $${fmt(arr.periodIndex)}/kg. Tabla histórica mes a mes con variación mensual e interanual, del Mercado Agroganadero.`
  return {
    title,
    description,
    keywords: [
      'indice novillo arrendamiento mensual',
      'precio novillo arrendamiento mensual',
      'índice novillo arrendamiento mensual',
      'novillo arrendamiento promedio mensual',
      'indice novillo arrendamiento historico',
      'cierre mensual inmag',
      'promedio mensual novillo arrendamiento',
      'índice novillo arrendamiento por mes',
    ],
    openGraph: {
      images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
      title: `Índice Novillo Arrendamiento Mensual: ${cierreStr}`,
      description,
      url: URL,
      type: 'website',
    },
    alternates: { canonical: URL },
  }
}

export default async function ArrendamientoMensualPage() {
  const closes = await getMonthlyCloses()
  const last = closes[0]
  const first = closes[closes.length - 1]
  const doce = closes.slice(0, 12)
  const promedio12 = doce.length ? doce.reduce((s, r) => s + r.inmag, 0) / doce.length : null
  const max12 = doce.length ? doce.reduce((a, b) => (b.inmag > a.inmag ? b : a)) : null
  const min12 = doce.length ? doce.reduce((a, b) => (b.inmag < a.inmag ? b : a)) : null

  const faq = [
    {
      question: '¿Cuál es el índice novillo arrendamiento mensual hoy?',
      answer: last
        ? `El último cierre mensual oficial es el de ${last.label}: $${fmt3(last.inmag)} por kilo vivo, promedio ponderado del Mercado Agroganadero (importe total del mes dividido los kilos vendidos). Es el número con el que se liquida el canon de ese mes. El período vigente del índice sugerido para arrendamientos rurales promedia $${fmt(arr.periodIndex)}/kg (${fmtFecha(arr.periodStart)} al ${fmtFecha(arr.periodEnd)}).`
        : `El período vigente del índice sugerido para arrendamientos rurales promedia $${fmt(arr.periodIndex)}/kg (${fmtFecha(arr.periodStart)} al ${fmtFecha(arr.periodEnd)}).`,
    },
    {
      question: '¿Por qué el canon se liquida con el promedio mensual y no con el valor del día?',
      answer:
        'Porque el precio del novillo cambia todos los días hábiles y un contrato de arrendamiento no puede depender de la rueda en que se emitió la factura. El promedio ponderado del mes (importe total / kilos totales) toma todas las operaciones del Mercado Agroganadero y le da a las dos partes un número único, verificable y publicado por el mercado.',
    },
    {
      question: '¿Cómo se calcula el canon mensual con el índice?',
      answer: last
        ? `Canon mensual = kilos de novillo pactados por hectárea × cierre mensual del índice × hectáreas. Con el cierre de ${last.label} ($${fmt(last.inmag)}/kg), un contrato de 4 kg/ha sobre 500 hectáreas liquida $${fmt(4 * last.inmag * 500)} por mes.`
        : 'Canon mensual = kilos de novillo pactados por hectárea × cierre mensual del índice × hectáreas.',
    },
    {
      question: '¿Cuándo se publica el cierre del mes?',
      answer:
        'El Mercado Agroganadero cierra el mes con la última rueda y publica el promedio ponderado en los primeros días hábiles del mes siguiente. Esta tabla se actualiza automáticamente cuando el MAG publica el cierre; hasta entonces el mes en curso se sigue con el índice sugerido del período vigente.',
    },
    {
      question: '¿Es el mismo índice que el de Liniers?',
      answer:
        'Es su sucesor operativo. Tras el cierre del Mercado de Liniers, la referencia para los contratos que citan "índice Liniers" pasó al Mercado Agroganadero de Cañuelas. Los cierres mensuales de esta tabla son los del MAG.',
    },
  ]

  const columns: DataColumn<MonthClose>[] = [
    {
      key: 'label',
      header: 'Mes',
      cell: (r) => (
        <span id={r.key} className="text-zinc-300 capitalize">
          {r.label}
        </span>
      ),
    },
    {
      key: 'inmag',
      header: 'Cierre mensual',
      numeric: true,
      cell: (r) => <PriceCell value={r.inmag} prefix="$" suffix="/kg" />,
    },
    {
      key: 'changeMoM',
      header: 'vs. mes anterior',
      numeric: true,
      cell: (r) => <Delta change={r.changeMoM} format={(abs) => abs.toFixed(1)} />,
    },
    {
      key: 'changeYoY',
      header: 'Interanual',
      numeric: true,
      cell: (r) => <Delta change={r.changeYoY} format={(abs) => abs.toFixed(1)} />,
    },
    {
      key: 'cabezas',
      header: 'Cabezas',
      numeric: true,
      cell: (r) => <span className="text-zinc-500 tabular-nums">{r.cabezas ? fmt(r.cabezas) : '—'}</span>,
    },
  ]

  return (
    <>
      <SectionBreadcrumbSchema section="mercado" sectionName="Mercado" />
      <DatasetSchema
        name="Índice Novillo Arrendamiento Mensual — cierres oficiales del Mercado Agroganadero"
        description={`Serie mensual del índice novillo para arrendamiento: promedio ponderado de cada mes publicado por el Mercado Agroganadero de Cañuelas, el valor con el que se liquidan los contratos de arrendamiento rural en Argentina.${last ? ` Último cierre: ${last.label}, $${fmt(last.inmag)}/kg.` : ''}`}
        url={URL}
        keywords={['índice novillo arrendamiento mensual', 'cierre mensual INMAG', 'arrendamiento rural', 'canon en kg de novillo', 'mercado agroganadero', 'serie histórica']}
        dateModified={lastUpdate}
        temporalCoverage={first && last ? `${first.key}/${last.key}` : undefined}
        updateFrequency="monthly"
        variableMeasured={{
          name: 'Cierre mensual del índice novillo (promedio ponderado)',
          value: last?.inmag ?? arr.periodIndex,
          unitText: 'ARS/kg vivo',
          observationDate: last ? `${last.key}-01` : undefined,
        }}
      />
      <FAQPageSchema items={faq} />
      <SpeakableSchema
        url={URL}
        headline={last ? `Índice novillo arrendamiento mensual: ${last.label} cerró a $${fmt(last.inmag)}/kg` : 'Índice novillo arrendamiento mensual'}
      />

      <div className="min-h-screen max-w-4xl mx-auto px-4 py-10">
        <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-8" aria-label="Breadcrumb">
          <Link href="/mercado" className="hover:text-accent transition-colors">Mercado</Link>
          <span>/</span>
          <Link href="/mercado/arrendamiento" className="hover:text-accent transition-colors">Arrendamiento</Link>
          <span>/</span>
          <span className="text-zinc-300">Índice mensual</span>
        </nav>

        <div className="flex items-center gap-3 mb-4">
          <span className="px-2.5 py-1 bg-sky-500/10 text-accent text-xs font-medium rounded-full border border-sky-500/20">
            ACTUALIZADO {lastUpdate}
          </span>
          <span className="text-sm text-zinc-500">Cierres oficiales del Mercado Agroganadero</span>
        </div>

        <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-6">
          Índice Novillo Arrendamiento Mensual
        </h1>

        <p className="speakable-content text-lg text-zinc-300 leading-relaxed mb-6">
          {last ? (
            <>
              El cierre mensual oficial de <strong className="text-white capitalize">{last.label}</strong> fue{' '}
              <strong className="text-accent">${fmt3(last.inmag)}/kg</strong>
              {last.changeMoM != null && (
                <>
                  {' '}({last.changeMoM >= 0 ? '+' : ''}{last.changeMoM.toFixed(1)}% contra el mes anterior)
                </>
              )}
              . Es el promedio ponderado del mes en el Mercado Agroganadero —importe total dividido kilos
              vendidos— y es <strong className="text-white">el número con el que se liquida el canon</strong> de
              un arrendamiento pactado en kilos de novillo.
            </>
          ) : (
            <>
              El índice novillo arrendamiento mensual es el promedio ponderado de cada mes en el Mercado
              Agroganadero, el número con el que se liquida el canon de un arrendamiento pactado en kilos de novillo.
            </>
          )}
        </p>

        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-gradient-to-br from-sky-500/10 to-transparent border border-sky-500/20 rounded-2xl p-6">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Último cierre mensual</div>
            <div className="text-3xl font-bold text-white tabular-nums">
              ${last ? fmt(last.inmag) : '—'}<span className="text-lg text-zinc-500">/kg</span>
            </div>
            <div className="text-xs text-zinc-500 mt-1 capitalize">{last?.label ?? 'sin dato'}</div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Período vigente (sugerido)</div>
            <div className="text-3xl font-bold text-white tabular-nums">
              ${fmt(arr.periodIndex)}<span className="text-lg text-zinc-500">/kg</span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">{arr.periodStart} al {arr.periodEnd}</div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Promedio últimos 12 meses</div>
            <div className="text-3xl font-bold text-white tabular-nums">
              ${promedio12 ? fmt(promedio12) : '—'}<span className="text-lg text-zinc-500">/kg</span>
            </div>
            {max12 && min12 && (
              <div className="text-xs text-zinc-500 mt-1">
                máx. <span className="capitalize">{max12.label}</span> · mín. <span className="capitalize">{min12.label}</span>
              </div>
            )}
          </div>
        </div>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-2">Histórico mes a mes</h2>
          <p className="text-zinc-500 text-sm mb-4">
            Cada fila es el cierre oficial publicado por el Mercado Agroganadero. La variación interanual compara
            contra el mismo mes del año anterior.
          </p>
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl overflow-hidden">
            <DataTable
              columns={columns}
              rows={closes}
              rowKey={(r) => r.key}
              rowTone={(r) => (r.changeMoM == null ? null : signedTone(r.changeMoM))}
            />
            <div className="px-6 py-4 border-t border-zinc-800/50 bg-zinc-900/50 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-zinc-600">
                {closes.length} meses · fuente: MAG, promedio ponderado (haciinfo000011)
              </span>
              <Link
                href="/api/market/history?days=365&format=csv"
                className="text-xs text-accent hover:text-accent-bright transition-colors"
              >
                Descargar la serie diaria (CSV)
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-10 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Cómo se liquida el canon con el cierre mensual</h2>
          <p className="text-zinc-200 font-medium mb-3">
            Canon mensual = kg de novillo por hectárea × cierre mensual del índice × hectáreas
          </p>
          <p className="text-zinc-400 leading-relaxed mb-3">
            {last
              ? `Con el cierre de ${last.label} ($${fmt(last.inmag)}/kg), un contrato de 4 kg/ha sobre 500 hectáreas liquida $${fmt(4 * last.inmag * 500)} por mes. `
              : ''}
            El valor del día sirve para seguir la tendencia; el que va en la factura es el del mes cerrado. Para
            calcular tu canon con tus kilos y tu superficie usá la{' '}
            <Link href="/mercado/arrendamiento#calculadora" className="text-accent hover:underline">calculadora de
            arrendamiento</Link>.
          </p>
          <p className="text-zinc-500 text-sm">
            El impuesto de sellos y el IVA del canon se explican en{' '}
            <Link href="/impuesto-de-sellos-arrendamiento" className="text-accent hover:underline">impuesto de sellos
            en arrendamientos</Link> y{' '}
            <Link href="/como-se-calcula-el-canon-de-arrendamiento" className="text-accent hover:underline">cómo se
            calcula el canon</Link>.
          </p>
        </section>

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

        <section className="grid sm:grid-cols-3 gap-4 mb-10">
          <Link href="/mercado/arrendamiento" className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-sky-500/30 transition-all group">
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-accent-bright transition-colors">Índice del día</h3>
            <p className="text-sm text-zinc-500">El valor diario, la serie y la calculadora de canon.</p>
          </Link>
          <Link href="/mercado/arrendamiento/canuelas" className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-sky-500/30 transition-all group">
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-accent-bright transition-colors">Cañuelas</h3>
            <p className="text-sm text-zinc-500">Cómo se forma el índice en el Mercado Agroganadero.</p>
          </Link>
          <Link href="/mercado/arrendamiento/liniers" className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-sky-500/30 transition-all group">
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-accent-bright transition-colors">Referencia Liniers</h3>
            <p className="text-sm text-zinc-500">Qué pasó con el índice de Liniers y con qué se liquida hoy.</p>
          </Link>
        </section>

        <p className="text-xs text-zinc-600 text-center">
          Fuente: Mercado Agroganadero de Cañuelas, promedio ponderado mensual. Período vigente: {arr.source}.
          Actualizado el {lastUpdate}.
        </p>
      </div>
    </>
  )
}
