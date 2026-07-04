import Link from 'next/link'
import marketData from '@/lib/data/market-prices.json'
import { signedTone } from '@/lib/ui/tokens'
import { Series, type PricePoint } from '@/components/ui/ChartCard'
import { Stat, Delta, DataTable, PriceCell, type DataColumn } from '@/components/ui'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface SeriesPoint {
  date: string
  value: number
}

interface CategoryData {
  current: number
  prev: number
  change: number
}

type CategoryRow = { name: string } & CategoryData

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Format a number with locale thousands separator: 2872 -> "2.872" */
function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Format the lastUpdate timestamp: "2026-02-26T14:00:00-03:00" -> "26 FEB 14h" */
function fmtUpdate(iso: string): string {
  const d = new Date(iso)
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
  const day = d.getDate().toString().padStart(2, '0')
  const month = months[d.getMonth()]
  const hour = d.getHours().toString().padStart(2, '0')
  return `${day} ${month} ${hour}h`
}

/* ------------------------------------------------------------------ */
/*  Data preparation                                                   */
/* ------------------------------------------------------------------ */

const inmag = marketData.inmag
const series: SeriesPoint[] = inmag.series
const categories = marketData.categories as Record<string, CategoryData>
const corn = marketData.corn
const usdBlue = marketData.usdBlue
const lastUpdate = marketData.lastUpdate

// INMAG / corn ratio (invernada/maiz relationship)
const ratio = inmag.current / corn.current

// Category table sorted by current price descending
const categoryRows: CategoryRow[] = Object.entries(categories)
  .map(([key, data]) => ({ name: key.toUpperCase(), ...data }))
  .sort((a, b) => b.current - a.current)

const maxCategoryPrice = Math.max(...categoryRows.map((c) => c.current))

// Datos para el gráfico de línea interactivo (precio + fecha en hover)
const inmagChartData: PricePoint[] = series.map((s) => ({ date: s.date, value: s.value }))

/* ------------------------------------------------------------------ */
/*  Category table columns (DataTable canónica)                        */
/* ------------------------------------------------------------------ */
const categoryColumns: DataColumn<CategoryRow>[] = [
  {
    key: 'name',
    header: 'CATEGORIA',
    width: 'w-[110px] sm:w-[160px]',
    cell: (cat) => (
      <Link href={`/mercado/${cat.name.toLowerCase()}`} className="inline-flex items-center gap-2 font-semibold text-zinc-200 motion-hover hover:text-accent">
        <span className="hidden sm:flex w-7 h-6 rounded-sm bg-zinc-100 items-center justify-center select-none" aria-hidden="true">
          <img
            src={`/marca/glifos-color/glifo-${cat.name.toLowerCase().replace(/s$/, '')}.png`}
            alt=""
            className="h-4 w-auto"
          />
        </span>
        {cat.name}
      </Link>
    ),
  },
  {
    key: 'current',
    header: 'ACTUAL',
    numeric: true,
    cell: (cat) => <PriceCell value={cat.current} />,
  },
  {
    key: 'prev',
    header: 'ANTERIOR',
    numeric: true,
    cell: (cat) => <PriceCell value={cat.prev} tone="neutral" />,
  },
  {
    key: 'change',
    header: 'VAR %',
    numeric: true,
    cell: (cat) => <Delta change={cat.change} />,
  },
  {
    key: 'bar',
    header: 'BARRA',
    hideBelowSm: true,
    width: 'w-[200px]',
    cell: (cat) => {
      const barPct = Math.round((cat.current / maxCategoryPrice) * 100)
      const isPositive = cat.change >= 0
      return (
        <div className="flex items-center gap-1">
          <div className="gradient-bar flex-1">
            <div
              className={`gradient-bar-fill${isPositive ? '-positive' : '-negative'}`}
              style={{ width: `${barPct}%` }}
            />
          </div>
          <span className="text-xxs text-zinc-500 tabular-nums w-[3ch] text-right">{barPct}</span>
        </div>
      )
    },
  },
]

/* ------------------------------------------------------------------ */
/*  Page component (Server Component)                                  */
/* ------------------------------------------------------------------ */
export default function MercadoPage() {
  return (
    <div className="px-4 py-4 max-w-6xl mx-auto space-y-px">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="terminal-panel">
        <div className="terminal-panel-header flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <h1 className="section-heading">
            MERCADO <span className="text-zinc-500 mx-1">&mdash;</span> INDICES Y PRECIOS DE REFERENCIA
          </h1>
          <span className="text-zinc-500 tabular-nums normal-case tracking-normal">
            Ult: {fmtUpdate(lastUpdate)}
          </span>
        </div>
      </div>

      {/* ── Top row: INMAG hero + Macro references ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px">

        {/* -- INMAG panel (2/3 width) -- */}
        <div className={`terminal-panel md:col-span-2${inmag.change >= 0 ? ' shadow-live-glow' : ''}`}>
          <div className="terminal-panel-header font-heading">
            INMAG <span className="text-zinc-500 mx-1">&mdash;</span> INDICE NOVILLO MAG
          </div>
          <div className="px-panel py-3">
            {/* Hero number (Stat canónico, tono positive + delta embebido) */}
            <Stat
              label={inmag.unit}
              value={fmt(inmag.current, 2)}
              delta={inmag.change}
              tone="positive"
              size="text-4xl font-semibold glow-positive stat-countup"
              className="mb-4"
            />

            {/* Gráfico de línea: escala completa + tooltip precio/fecha, color por token */}
            <Series data={inmagChartData} tone="positive" height={140} decimals={0} prefix="$" />

            {/* Link to detailed INMAG page */}
            <div className="mt-3 pt-3 border-t border-zinc-800">
              <Link href="/mercado/inmag" className="text-accent motion-hover hover:text-accent/80 text-sm flex items-center gap-1">
                Ver análisis detallado INMAG →
              </Link>
            </div>
          </div>
        </div>

        {/* -- Macro references (1/3 width) -- */}
        <div className="terminal-panel glass-panel">
          <div className="terminal-panel-header font-heading">REFERENCIAS MACRO</div>
          <div className="px-panel py-3 space-y-4">

            {/* Corn */}
            <Stat
              label="MAIZ"
              value={`${fmt(corn.current, 2)} ${corn.unit}`}
              delta={corn.change}
              size="text-lg"
            />

            {/* USD Blue */}
            <Stat
              label="USD BLUE"
              value={`${fmt(usdBlue.current)} ${usdBlue.unit}`}
              delta={usdBlue.change}
              size="text-lg"
            />

            <div className="terminal-divider" />

            {/* Invernada / Maiz ratio */}
            <Stat
              label="RELACION INVERNADA/MAIZ"
              value={`${fmt(ratio, 2)} kg/tn`}
              sub="(INMAG / MAIZ)"
              size="text-lg"
            />
            <Link href="/mercado/spread" className="text-accent motion-hover hover:text-accent/80 text-xxs block">
              Ver análisis spread →
            </Link>

          </div>
        </div>
      </div>

      {/* ── Categories table ────────────────────────────────────── */}
      <div className="terminal-panel">
        <div className="terminal-panel-header font-heading">PRECIOS POR CATEGORIA</div>
        <DataTable
          columns={categoryColumns}
          rows={categoryRows}
          rowKey={(c) => c.name}
          rowTone={(c) => signedTone(c.change)}
        />
      </div>

      {/* ── Calculator CTA ──────────────────────────────────────── */}
      <div className="terminal-panel bg-gradient-to-r from-sky-950/20 to-transparent border-sky-800/30">
        <div className="px-panel py-4 flex items-center justify-between gap-4">
          <div>
            <span className="text-zinc-200 font-medium">¿Cuánto vale tu tropa?</span>
            <p className="text-xxs text-zinc-500 mt-0.5">
              Calculá el valor estimado usando los precios INMAG actualizados
            </p>
          </div>
          <Link
            href="/calculadora"
            className="px-4 py-2 bg-accent hover:bg-sky-300 text-zinc-900 font-medium text-sm rounded transition-colors whitespace-nowrap"
          >
            Calcular valor →
          </Link>
        </div>
      </div>

      {/* ── Source attribution ─────────────────────────────────── */}
      <div className="terminal-panel">
        <div className="px-panel py-cell flex items-center justify-between">
          <span className="text-xxs text-zinc-500">
            FUENTES: Mercado Agroganadero (MAG), MAGYP, dolarapi.com
          </span>
          <span className="text-xxs text-zinc-500 tabular-nums">
            Ult. act.: {lastUpdate}
          </span>
        </div>
      </div>

    </div>
  )
}
