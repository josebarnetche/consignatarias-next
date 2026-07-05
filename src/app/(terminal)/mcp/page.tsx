import { Metadata } from 'next'
import Link from 'next/link'
import marketPrices from '@/lib/data/market-prices.json'
import rematesData from '@/lib/data/remates.json'
import McpShowcase, { type ShowcaseData } from './McpShowcase'

export const metadata: Metadata = {
  title: 'MCP — Consignatarias para agentes IA | consignatarias.com.ar',
  description:
    'Servidor MCP oficial (Model Context Protocol): el mercado ganadero argentino como tools para agentes IA. Precios INMAG, remates, consignatarias, arrendamiento y alertas — conectás Claude, Cursor o cualquier agente y consultás en tiempo real.',
  alternates: { canonical: 'https://www.consignatarias.com.ar/mcp' },
}

export const revalidate = 3600

const ENDPOINT = 'https://www.consignatarias.com.ar/api/mcp'

const TOOL_ICONS: Record<string, string> = {
  get_indice_novillo: 'indice', get_inmag_historico: 'indice', get_precios_hacienda: 'bascula',
  get_precios_detallados: 'bascula', get_contexto_macro: 'dolar-billete', list_remates: 'calendario',
  buscar_consignataria: 'casa-remates', buscar_frigorifico: 'frigorifico',
  calcular_arrendamiento: 'arrendamiento', crear_alerta_precio: 'alerta',
}

const TOOLS = [
  { name: 'get_indice_novillo', desc: 'INMAG (índice novillo) hoy: precio de referencia + variación', auth: false },
  { name: 'get_inmag_historico', desc: 'Evolución del INMAG: tendencia, mín/máx y variación del período', auth: false },
  { name: 'get_precios_hacienda', desc: 'Precios por categoría (novillo, novillito, vaquillona, vaca, toro, ternero)', auth: false },
  { name: 'get_precios_detallados', desc: 'Precios por subcategoría con mínimo/promedio/máximo + cabezas', auth: false },
  { name: 'get_contexto_macro', desc: 'Dólar blue/oficial, maíz FOB y spread novillo/maíz', auth: false },
  { name: 'list_remates', desc: 'Calendario de remates (filtro por provincia)', auth: false },
  { name: 'buscar_consignataria', desc: 'Directorio de consignatarias/casas de remate por nombre o zona', auth: false },
  { name: 'buscar_frigorifico', desc: 'Frigoríficos habilitados MAGYP/SENASA (1.100+ plantas)', auth: false },
  { name: 'calcular_arrendamiento', desc: 'Canon de arrendamiento rural indexado al novillo', auth: false },
  { name: 'crear_alerta_precio', desc: 'Alerta cuando un precio cruza un umbral → notifica por webhook', auth: true },
]

const fmt = (n: number) => Math.round(n).toLocaleString('es-AR')

/* ── Datos REALES del día para el showcase (nunca inventados) ── */
function buildShowcase(): ShowcaseData {
  const TODAY = new Date().toISOString().slice(0, 10)
  const inmag = marketPrices.inmag
  const catLabels: Record<string, string> = {
    novillos: 'Novillo', novillitos: 'Novillito', vaquillonas: 'Vaquillona',
    vacas: 'Vaca', toros: 'Toro', terneros: 'Ternero',
  }
  const cats = Object.entries(marketPrices.categories).map(([k, v]) => {
    const c = v as { current: number; change: number }
    return { name: catLabels[k] ?? k, price: fmt(c.current), change: `${c.change >= 0 ? '+' : ''}${c.change}%` }
  })

  // Sparkline: lo que va del año (la pregunta es "este año") → polyline 300×70
  const anio = TODAY.slice(0, 4)
  const serieFull = marketPrices.inmag.series as { date: string; value: number }[]
  const serie = serieFull.filter((p) => p.date >= `${anio}-01-01`)
  const vals = serie.map((p) => p.value)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const pts = serie
    .map((p, i) => {
      const x = (i / Math.max(1, serie.length - 1)) * 300
      const y = 66 - ((p.value - min) / Math.max(1, max - min)) * 62
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const first = vals[0]
  const last = vals[vals.length - 1]
  const periodPct = first > 0 ? ((last - first) / first) * 100 : 0

  const upcoming = rematesData
    .filter((r) => r.date >= TODAY && r.status === 'scheduled')
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
  const remates = upcoming.slice(0, 4).map((r) => {
    const [, m, d] = r.date.split('-')
    return {
      fecha: r.date === TODAY ? 'HOY' : `${d}/${m}`,
      hora: r.time ?? '—',
      nombre: r.consignatariaName,
      lugar: r.location.split(',')[0],
    }
  })

  // Consignatarias reales que operan en Entre Ríos (del índice de remates)
  const erNames = new Map<string, string>()
  for (const r of rematesData) {
    if (r.province === 'ENTRE RIOS' && !erNames.has(r.consignatariaName)) {
      erNames.set(r.consignatariaName, r.location.split(',')[0])
    }
    if (erNames.size >= 3) break
  }
  const consignatarias = [...erNames.entries()].map(([nombre, zona]) => ({ nombre, zona }))

  const kgHa = 100
  return {
    fecha: marketPrices.lastUpdate,
    inmag: {
      current: fmt(inmag.current),
      changePct: `${Math.abs(inmag.change)}%`,
      up: inmag.change >= 0,
    },
    cats,
    spark: {
      points: pts,
      fromDate: serie[0]?.date ?? '',
      toDate: serie[serie.length - 1]?.date ?? '',
      periodPct: `${periodPct >= 0 ? '+' : ''}${periodPct.toFixed(1)}%`,
    },
    macro: {
      blue: fmt(marketPrices.usdBlue.current),
      maiz: marketPrices.corn.current.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      spread: (inmag.current / (marketPrices.corn.current * (marketPrices.usdBlue.current / 1000))).toFixed(1),
    },
    remates,
    consignatarias,
    arriendo: {
      kgHa: String(kgHa),
      precio: fmt(inmag.current),
      porHaAnio: fmt(kgHa * inmag.current),
    },
  }
}

export default function McpPage() {
  const showcase = buildShowcase()
  return (
    <div className="min-h-screen">
      {/* Hero + CTA arriba (patrón blueprint: la licencia primero, el descubrimiento abajo) */}
      <section className="max-w-4xl mx-auto px-4 pt-14 pb-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/[0.07] px-3 py-1 text-xxs font-terminal uppercase tracking-widest text-sky-300">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Servidor MCP oficial
        </span>
        <h1 className="mt-5 text-3xl sm:text-4xl font-bold text-white leading-tight">
          Tu IA responde con el mercado ganadero real
        </h1>
        <p className="mt-4 text-zinc-400 leading-relaxed max-w-2xl">
          Conectás Claude, ChatGPT o Cursor una vez, y tu asistente consulta precios, remates y
          directorio con nuestra data del día — la misma referencia que la IA ya cita.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#conectar" className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-sky-300 transition-colors">
            Conectar mi IA →
          </a>
          <Link href="/planes" className="rounded-lg border border-terminal-border px-5 py-2.5 text-sm text-zinc-200 hover:border-zinc-500 transition-colors">
            Planes · desde ARS 74.000/mes
          </Link>
        </div>
        <p className="mt-10 text-xxs font-terminal uppercase tracking-widest text-zinc-500 flex items-center gap-2">
          Scrolleá para descubrir lo que tu asistente puede hacer
          <span aria-hidden="true" className="text-sky-400">↓</span>
        </p>
      </section>

      {/* Showcase animado — 8 tools, datos del día */}
      <section className="max-w-2xl mx-auto px-4 pb-16">
        <McpShowcase {...showcase} />
      </section>

      {/* Connect */}
      <section id="conectar" className="max-w-4xl mx-auto px-4 pb-8 scroll-mt-16">
        <div className="terminal-panel rounded-xl p-5 sm:p-6">
          <p className="text-label tracking-widest text-zinc-400 mb-3">CONECTAR</p>
          <p className="text-sm text-zinc-400 mb-2">Endpoint (Streamable HTTP, JSON-RPC 2.0):</p>
          <code className="block bg-black/40 border border-terminal-border rounded-lg px-4 py-3 text-sky-300 font-mono text-sm break-all">
            {ENDPOINT}
          </code>
          <p className="text-sm text-zinc-400 mt-4 mb-2">Config del cliente (Claude Desktop, Cursor, Windsurf…):</p>
          <pre className="bg-black/40 border border-terminal-border rounded-lg px-4 py-3 text-zinc-300 font-mono text-xs overflow-x-auto">{`{
  "consignatarias": {
    "url": "${ENDPOINT}"
  }
}`}</pre>
          <p className="text-xs text-zinc-600 mt-3">
            Listado en el registry oficial de MCP como <code className="text-zinc-400">ar.com.consignatarias/cattle-market</code>.
          </p>
        </div>
      </section>

      {/* Tools */}
      <section className="max-w-4xl mx-auto px-4 pb-10">
        <p className="text-label tracking-widest text-zinc-400 mb-4">TOOLS DISPONIBLES ({TOOLS.length})</p>
        <div className="grid gap-px bg-terminal-border rounded-xl overflow-hidden border border-terminal-border">
          {TOOLS.map((t) => (
            <div key={t.name} className="bg-terminal-panel p-4 flex items-start justify-between gap-4">
              <span className="w-10 h-10 shrink-0 rounded bg-zinc-100 flex items-center justify-center select-none" aria-hidden="true">
                <img src={`/marca/iconos-color/${TOOL_ICONS[t.name] ?? 'onda'}.png`} alt="" className="w-7 h-7" />
              </span>
              <div className="min-w-0 flex-1">
                <code className="text-sky-300 font-mono text-sm">{t.name}</code>
                <p className="text-zinc-400 text-sm mt-0.5">{t.desc}</p>
              </div>
              <span
                className={`shrink-0 rounded border px-2 py-0.5 text-xxs font-terminal uppercase tracking-wider ${
                  t.auth ? 'border-amber-400/60 text-amber-300' : 'border-zinc-700 text-zinc-500'
                }`}
              >
                {t.auth ? 'API key' : 'Libre'}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-500 mt-3">
          Los tools de lectura son públicos. <code className="text-zinc-400">crear_alerta_precio</code> requiere una API
          key de un plan (<code className="text-zinc-400">Authorization: Bearer cnsg_live_…</code>).
        </p>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.05] p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <h2 className="text-lg font-semibold text-white">¿Construís sobre datos ganaderos?</h2>
            <p className="text-sm text-zinc-400 mt-1">
              La lectura es libre. Para alertas por webhook y volumen, una API key de un plan.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3 shrink-0">
            <Link href="/api-docs" className="rounded-lg border border-terminal-border px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500">
              Ver la API
            </Link>
            <Link href="/planes" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-sky-300">
              Ver planes
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
