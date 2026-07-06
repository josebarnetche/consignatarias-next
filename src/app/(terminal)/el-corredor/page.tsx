import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import marketData from '@/lib/data/market-prices.json'
import corredorManifest from '../../../../public/el-corredor/manifest.json'
import { getCurrentSession } from '@/lib/user-tier'
import { createAdminClient } from '@/lib/supabase-server'
import { SubscribeForm } from './SubscribeForm'
import { SectionBreadcrumbSchema, TechArticleSchema } from '@/components/seo/JsonLd'

// El stat de cabezas por consignatario lee la DB en vivo; sin esto, el Data Cache
// de Next sirve el query de Supabase con lag (se veía 7.5k vs 35.6k reales).
export const dynamic = 'force-dynamic'

const APP_URL = 'https://www.consignatarias.com.ar'

// Edición vigente desde el manifest — la landing nunca vuelve a quedar vieja.
const ED = corredorManifest.current
const ED_LABEL = ED.edition_label.replace(' · ', ' ') // "Junio 2026"
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const _edM = Number(ED.ym.split('-')[1]) // 1-12
const NEXT_CIERRE = MESES[_edM % 12]              // mes que cubre la próxima edición
const NEXT_SALE = MESES[(_edM + 1) % 12]          // mes en que sale

export const metadata: Metadata = {
  title: 'El Corredor — cierre mensual del mercado bovino argentino',
  description:
    'Mesa de hacienda argentina · cierre mensual. INMAG en USD reales, comparable interanual, 18 categorías de hacienda del MAG, lectura del ciclo, tesis del mes próximo. PDF gratuito con email.',
  alternates: { canonical: `${APP_URL}/el-corredor` },
  openGraph: {
    title: 'El Corredor — cierre mensual del mercado bovino argentino',
    description:
      'Mesa de hacienda argentina · cierre mensual. PDF gratuito con email.',
    url: `${APP_URL}/el-corredor`,
    type: 'article',
    images: [
      {
        url: `${APP_URL}${ED.og_path}`,
        width: 1200,
        height: 630,
        alt: `El Corredor — ${ED_LABEL}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'El Corredor — cierre mensual del mercado bovino argentino',
    description: 'Mesa de hacienda argentina. PDF gratuito.',
    images: [`${APP_URL}${ED.og_path}`],
  },
}

const inmag = marketData.inmag
const closeFmt = `$${Math.round(inmag.current).toLocaleString('es-AR')}`

const INCLUYE = [
  { num: '01', title: 'Resumen ejecutivo', body: 'Lectura del editor con datos duros + disclosure FCV-UBA del 71% opaco' },
  { num: '02', title: 'INMAG diario', body: 'Chart del mes + tabla con cierre por jornada hábil + volumen' },
  { num: '03', title: 'INMAG en USD reales', body: 'Comparable interanual ARS vs. USD oficial vs. blue + chart trailing 12m' },
  { num: '04', title: 'Lo que el INMAG no ve', body: 'Composición real del mercado · 71% opaco · cita Iriarte/Diez' },
  { num: '05', title: '18 categorías reales del MAG', body: 'Mín / máx / promedio / mediana de cada categoría de hacienda, con marca de valores atípicos' },
  { num: '06', title: 'Macro + faena + margen invernada', body: 'USD oficial/blue, maíz FOB, faena nacional, ratio novillo/maíz' },
  { num: '07', title: 'Plaza & calendario', body: 'Distribución por provincia, top remates del mes, calendario del próximo' },
  { num: '08', title: 'Mini-explicador rotativo', body: '12 ediciones · Edición 1: Cómo se calcula el INMAG' },
  { num: '09', title: 'Net-back por canal', body: 'Caso ejemplo numérico: 50 novillos × 460kg × cierre del mes' },
  { num: '10', title: 'Tesis del mes próximo', body: 'Catalizadores + escenarios base/alza/baja + recomendaciones por perfil' },
  { num: '11', title: 'Glosario operativo', body: '6 términos del oficio que aparecen en el reporte' },
  { num: '12', title: 'Metodología abierta', body: 'Endpoints, fuentes y bibliografía citada — auditable' },
]

const FAQ = [
  {
    q: '¿Cuánto cuesta?',
    a: 'Es gratuito. Lo enviamos por email a quien lo pida. No hay tarjeta, no hay trial, no hay upsell sorpresa.',
  },
  {
    q: '¿Cuándo lo recibo?',
    a: 'En el momento. El PDF llega al email apenas te suscribís. Las próximas ediciones salen el primer día hábil de cada mes.',
  },
  {
    q: '¿Quién lo escribe?',
    a: 'La mesa de mercado de consignatarias.com — equipo de research detrás del observatorio del mercado bovino argentino. Las cifras son de fuentes oficiales (MAG, MAGYP, Sec. Agricultura) y la interpretación está respaldada por bibliografía citada (FCV-UBA 2018, Iriarte/CACG 2008, Diez/UNS 2020).',
  },
  {
    q: '¿Es un boletín o un reporte único?',
    a: 'Recurrente mensual. Cada edición trae el cierre del mes anterior + tesis del mes en curso + un mini-explicador rotativo. Si no lo querés más, te desuscribís en un click.',
  },
  {
    q: '¿Para quién es?',
    a: 'Productores ganaderos medianos-grandes, consignatarias, brokers, contadores agropecuarios, frigoríficos y consultores que necesitan inteligencia de mercado argentino sintetizada y citable.',
  },
  {
    q: '¿Por qué gratis?',
    a: 'Porque preferimos que circule. El observatorio se mantiene de los productos derivados (data API, listings premium, sponsorships). El reporte mensual es la puerta de entrada al archivo.',
  },
]

const MESES_C = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/**
 * Cabezas operadas por consignatario en el MAG de Cañuelas durante el último mes
 * calendario cerrado — dato transaccional propio (mag_consignataria_sales_lots),
 * agregado por firma. Devuelve null si todavía no hay datos del mes.
 */
async function getMonthlyConsignatarioStats() {
  try {
    const db = createAdminClient()
    const now = new Date()
    const lastPrev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 86400000)
    const y = lastPrev.getUTCFullYear()
    const m = lastPrev.getUTCMonth() + 1
    const mm = String(m).padStart(2, '0')
    const from = `${y}-${mm}-01`
    const to = `${y}-${mm}-${String(lastPrev.getUTCDate()).padStart(2, '0')}`

    const { data: lots } = await db
      .from('mag_consignataria_sales_lots')
      .select('mag_consignataria_id, head_count, date')
      .gte('date', from)
      .lte('date', to)
      .limit(100000)
    if (!lots || lots.length === 0) return null

    const { data: names } = await db.from('mag_consignatarias').select('mag_id, name')
    const nameById = new Map((names || []).map((n) => [n.mag_id, n.name]))

    const byFirm = new Map<number, number>()
    const days = new Set<string>()
    let total = 0
    for (const r of lots) {
      const c = r.head_count || 0
      total += c
      if (r.date) days.add(r.date)
      byFirm.set(r.mag_consignataria_id, (byFirm.get(r.mag_consignataria_id) || 0) + c)
    }
    const firms = [...byFirm.entries()]
      .map(([id, cabezas]) => ({ name: nameById.get(id) || `Firma #${id}`, cabezas }))
      .filter((f) => f.cabezas > 0)
      .sort((a, b) => b.cabezas - a.cabezas)
    if (firms.length === 0) return null

    return { label: `${MESES_C[m - 1]} ${y}`, total, firmsCount: firms.length, days: days.size, top: firms.slice(0, 15) }
  } catch {
    return null
  }
}

export default async function ElCorredorLanding() {
  const { user } = await getCurrentSession()
  const userEmail = user?.email ?? null
  const consigStats = await getMonthlyConsignatarioStats()
  return (
    <div className="min-h-screen bg-zinc-950">
      <SectionBreadcrumbSchema section="el-corredor" sectionName="El Corredor" />
      <TechArticleSchema
        name="El Corredor — cierre mensual del mercado bovino argentino"
        description="Reporte mensual del cierre del mercado de hacienda argentino: INMAG diario, INMAG en dólares, 18 subcategorías del MAG, faena, maíz/novillo, plaza y tesis del mes próximo. Metodología abierta y bibliografía citada."
        url={`${APP_URL}/el-corredor`}
        datePublished="2026-05-10"
        proficiencyLevel="Expert"
        authorName="Mesa de mercado — consignatarias.com.ar"
        citations={[
          { name: 'Mercado Agroganadero de Buenos Aires (INMAG)', url: 'https://www.mercadoagroganadero.com.ar' },
          { name: 'MAGYP — faena y existencias', url: 'https://www.magyp.gob.ar' },
          { name: 'INDEC — índices de precios', url: 'https://www.indec.gob.ar' },
          { name: 'BCRA / mercado paralelo — cotización del dólar' },
        ]}
      />
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-950/20 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-sky-500/5 blur-[120px] rounded-full" />

        <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-16 lg:pt-20 lg:pb-24">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-16 items-center">
            {/* LEFT: copy + form */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inset-0 rounded-full bg-sky-400/40 animate-ping" />
                  <span className="relative rounded-full h-2.5 w-2.5 bg-sky-400" />
                </span>
                <span className="text-xs font-mono uppercase tracking-[0.18em] text-zinc-500">
                  Mesa de hacienda argentina · cierre mensual
                </span>
              </div>

              <h1 className="font-mono font-bold uppercase tracking-tight text-white text-5xl lg:text-7xl leading-[0.95] mb-6">
                El Corredor
              </h1>

              <p className="text-lg lg:text-xl text-zinc-300 leading-relaxed mb-8 max-w-2xl font-mono">
                El cierre mensual del mercado bovino argentino. <span className="text-white">12 páginas</span> con
                INMAG en USD reales, comparable interanual, 18 categorías de hacienda del MAG, lectura del ciclo y tesis del
                mes próximo. <span className="text-sky-400">PDF gratuito con email.</span>
              </p>

              {/* Live KPI strip */}
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mb-10 pb-6 border-b border-zinc-800">
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Última edición ·</span>
                <span className="text-sm font-mono text-zinc-300">{ED_LABEL}</span>
                <span className="text-zinc-700">·</span>
                <span className="text-sm font-mono text-zinc-300">
                  INMAG cerró <span className="text-white font-semibold">{closeFmt}</span>
                </span>

              </div>

              <SubscribeForm source="hero" userEmail={userEmail} />

              <p className="text-xs font-mono text-zinc-600 mt-4">
                Sin tarjeta. Sin trial. Próxima edición en {NEXT_SALE}. Te podés desuscribir en cualquier momento.
              </p>
            </div>

            {/* RIGHT: cover preview */}
            <div className="relative lg:justify-self-end">
              <div className="absolute -inset-8 bg-sky-500/10 blur-3xl rounded-full" />
              <div className="relative">
                <Image
                  src={ED.cover_path}
                  alt={`El Corredor — ${ED_LABEL}`}
                  width={384}
                  height={512}
                  className="w-full max-w-[384px] h-auto rounded shadow-2xl shadow-black/50 border border-zinc-800"
                  priority
                />
                <div className="absolute -bottom-3 left-4 right-4 text-center">
                  <span className="inline-block bg-sky-400 text-zinc-950 text-xs font-mono uppercase tracking-widest px-3 py-1.5 font-bold">
                    Edición {ED.edition_short} · Disponible
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUE INCLUYE */}
      <section className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-16 lg:py-24">
          <div className="mb-12">
            <div className="text-xs font-mono uppercase tracking-[0.22em] text-sky-400 font-semibold mb-4">
              · 12 secciones por edición
            </div>
            <h2 className="text-3xl lg:text-4xl font-mono font-bold text-white tracking-tight max-w-3xl">
              Lo que vas a leer en cada cierre
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-800 border border-zinc-800 rounded">
            {INCLUYE.map((it) => (
              <div key={it.num} className="bg-zinc-950 p-6 hover:bg-zinc-900/50 transition-colors">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-sky-400 font-mono text-sm font-medium">{it.num}</span>
                  <h3 className="text-white font-mono font-semibold">{it.title}</h3>
                </div>
                <p className="text-zinc-400 text-sm font-mono leading-relaxed">{it.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CABEZAS POR CONSIGNATARIO — dato transaccional del MAG (mes cerrado) */}
      {consigStats && (
        <section className="border-b border-zinc-800">
          <div className="max-w-6xl mx-auto px-4 py-16 lg:py-24">
            <div className="mb-10">
              <div className="text-xs font-mono uppercase tracking-[0.22em] text-sky-400 font-semibold mb-4">
                · Dato transaccional del MAG · {consigStats.label}
              </div>
              <h2 className="text-3xl lg:text-4xl font-mono font-bold text-white tracking-tight max-w-3xl">
                Cabezas operadas por consignatario
              </h2>
              <p className="text-zinc-400 text-sm font-mono leading-relaxed mt-4 max-w-2xl">
                Operación por operación en el Mercado Agroganadero de Cañuelas.{' '}
                <span className="text-white font-semibold">{consigStats.firmsCount}</span> firmas ·{' '}
                <span className="text-white font-semibold">{consigStats.total.toLocaleString('es-AR')}</span> cabezas ·{' '}
                {consigStats.days} jornada{consigStats.days !== 1 ? 's' : ''}.
              </p>
            </div>

            <div className="border border-zinc-800 rounded overflow-hidden">
              {consigStats.top.map((f, i) => {
                const pct = Math.max(2, Math.round((f.cabezas / consigStats.top[0].cabezas) * 100))
                return (
                  <div key={f.name} className="relative flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 last:border-0 bg-zinc-950">
                    <div className="absolute inset-y-0 left-0 bg-sky-500/10" style={{ width: `${pct}%` }} aria-hidden />
                    <span className="relative flex items-baseline gap-3 min-w-0">
                      <span className="text-zinc-600 font-mono text-xs w-5 shrink-0 text-right">{i + 1}</span>
                      <span className="text-zinc-200 font-mono text-sm truncate">{f.name}</span>
                    </span>
                    <span className="relative text-white font-mono text-sm font-semibold tabular-nums shrink-0 ml-3">
                      {f.cabezas.toLocaleString('es-AR')}
                    </span>
                  </div>
                )
              })}
            </div>

            <p className="text-zinc-600 text-xs font-mono mt-3 max-w-2xl">
              Fuente: MAG Cañuelas (haciinfo000007), procesado por consignatarias<span className="text-sky-400">.</span>com. El
              ranking completo, por categoría y con serie mensual, en cada edición de El Corredor.
            </p>
          </div>
        </section>
      )}

      {/* AUTORIDAD / MARCO */}
      <section className="border-b border-zinc-800 bg-zinc-900/30">
        <div className="max-w-6xl mx-auto px-4 py-16 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-mono uppercase tracking-[0.22em] text-sky-400 font-semibold mb-4">
                · Marco institucional
              </div>
              <h2 className="text-2xl lg:text-3xl font-mono font-bold text-white tracking-tight mb-6">
                Datos oficiales. Bibliografía citada. Metodología abierta.
              </h2>
              <p className="text-zinc-300 font-mono leading-relaxed mb-4">
                El Corredor sintetiza las fuentes públicas del mercado bovino argentino — Mercado Agroganadero,
                MAGYP, Secretaría de Agricultura — y las pone en contexto con bibliografía académica. Cada cifra
                cita fuente y método.
              </p>
              <p className="text-zinc-400 font-mono text-sm leading-relaxed">
                Bibliografía base: FCV-UBA — Comercialización de Hacienda Vacuna (Gil/Fornieles/Demarco, 2018).
                CACG — Comercialización de Ganados y Carnes (Iriarte, 2008). UNS — Costos de transacción en la
                comercialización del SOB (Diez, 2020). Resoluciones MAGYP / RESOL-2018-32 / serie 40.3_VC_0_M_15.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-px bg-zinc-800 border border-zinc-800 rounded">
              <div className="bg-zinc-950 p-6">
                <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Cobertura</div>
                <div className="text-2xl font-mono font-bold text-white">14 provincias</div>
                <div className="text-xs font-mono text-zinc-500 mt-1">+84 consignatarias</div>
              </div>
              <div className="bg-zinc-950 p-6">
                <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Histórico</div>
                <div className="text-2xl font-mono font-bold text-white">337 días</div>
                <div className="text-xs font-mono text-zinc-500 mt-1">INMAG diario archivo</div>
              </div>
              <div className="bg-zinc-950 p-6">
                <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Cadencia</div>
                <div className="text-2xl font-mono font-bold text-white">Mensual</div>
                <div className="text-xs font-mono text-zinc-500 mt-1">primer hábil del mes</div>
              </div>
              <div className="bg-zinc-950 p-6">
                <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Formato</div>
                <div className="text-2xl font-mono font-bold text-white">PDF · 12 pp</div>
                <div className="text-xs font-mono text-zinc-500 mt-1">A4 · descargable</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 py-16 lg:py-24">
          <div className="text-xs font-mono uppercase tracking-[0.22em] text-sky-400 font-semibold mb-4 text-center">
            · Preguntas frecuentes
          </div>
          <h2 className="text-3xl lg:text-4xl font-mono font-bold text-white tracking-tight mb-12 text-center">
            Antes de suscribirte
          </h2>

          <div className="space-y-3">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="group bg-zinc-900/40 border border-zinc-800 rounded overflow-hidden hover:border-zinc-700 transition-colors"
              >
                <summary className="px-6 py-4 cursor-pointer list-none flex items-center justify-between text-white font-mono font-medium text-sm">
                  <span>{f.q}</span>
                  <svg
                    className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-5 text-sm font-mono text-zinc-400 leading-relaxed">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-20 lg:py-28 text-center">
          <h2 className="text-3xl lg:text-5xl font-mono font-bold text-white tracking-tight mb-6 leading-tight">
            Recibí <span className="text-sky-400">El Corredor</span><br />cada mes.
          </h2>
          <p className="text-zinc-400 font-mono mb-10 max-w-2xl mx-auto">
            12 páginas con la lectura del cierre del mercado bovino argentino. Mesa de research,
            datos oficiales, metodología abierta. Gratis, en tu inbox.
          </p>
          <div className="max-w-md mx-auto">
            <SubscribeForm source="footer-cta" userEmail={userEmail} />
          </div>
          <p className="text-xs font-mono text-zinc-600 mt-4">
            Próxima edición: cierre de {NEXT_CIERRE} · primer día hábil de {NEXT_SALE}
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-zinc-600 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400/60" />
              <span className="text-zinc-400">consignatarias.com</span>
              <span className="text-zinc-700 mx-1">·</span>
              <span>Mercado Decision Infrastructure</span>
            </div>
            <div className="flex gap-4">
              <Link href="/" className="hover:text-zinc-300 transition-colors">Sitio</Link>
              <Link href="/mercado/inmag" className="hover:text-zinc-300 transition-colors">INMAG en vivo</Link>
              <Link href="/quienes-somos" className="hover:text-zinc-300 transition-colors">Quiénes somos</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
