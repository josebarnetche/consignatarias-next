import Link from "next/link";
import marketPrices from "@/lib/data/market-prices.json";
import rematesData from "@/lib/data/remates.json";
import { normalizeUrl } from "@/lib/utils/url";
import {
  Stat,
  Delta,
  Badge,
  DataTable,
  PriceCell,
  ChartCard,
  type DataColumn,
  type PricePoint,
} from "@/components/ui";

/* ---------- helpers ---------- */
function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/* ---------- data prep ---------- */
const TODAY = new Date().toISOString().split("T")[0];
const rematesToday = rematesData.filter((r) => r.date === TODAY);
const rematesUpcoming = rematesData
  .filter((r) => r.date > TODAY && r.status === "scheduled")
  .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
const rematesPast = rematesData.filter((r) => r.date < TODAY);
const nextAuctions = [...rematesToday, ...rematesUpcoming].slice(0, 8);
const totalHeadsUpcoming = [...rematesToday, ...rematesUpcoming].reduce((s, r) => s + (r.estimatedHeads ?? 0), 0);

const categoryLabels: Record<string, string> = {
  novillos: "Novillos", novillitos: "Novillitos", vaquillonas: "Vaquillonas",
  vacas: "Vacas", toros: "Toros", terneros: "Terneros",
};

const inmagRawSeries = marketPrices.inmag.series as { date: string; value: number }[];
const inmagChartData: PricePoint[] = inmagRawSeries.map((pt) => ({ date: pt.date, value: pt.value }));
const inmagValues = inmagRawSeries.map((pt) => pt.value);
const inmagFirstVal = inmagValues[0];
const inmagLastVal = inmagValues[inmagValues.length - 1];
const inmagTrendChangePct = inmagFirstVal > 0 ? ((inmagLastVal - inmagFirstVal) / inmagFirstVal) * 100 : 0;
const inmagFromDate = inmagRawSeries[0]?.date ?? "";
const inmagToDate = inmagRawSeries[inmagRawSeries.length - 1]?.date ?? "";

/* ---------- category rows (DataTable) ---------- */
type CatRow = { key: string; name: string; current: number; prev: number; change: number };

const catRows: CatRow[] = Object.entries(marketPrices.categories).map(([key, val]) => {
  const c = val as { current: number; prev: number; change: number };
  return { key, name: categoryLabels[key] || key, current: c.current, prev: c.prev, change: c.change };
});

const catColumns: DataColumn<CatRow>[] = [
  {
    key: "cat",
    header: "Categoría",
    cell: (r) => <span className="text-zinc-400 uppercase text-xxs tracking-wider">{r.name}</span>,
  },
  {
    key: "current",
    header: "$/kg",
    numeric: true,
    cell: (r) => <PriceCell value={r.current} />,
  },
  {
    key: "prev",
    header: "Ant.",
    numeric: true,
    cell: (r) => <PriceCell value={r.prev} tone="neutral" />,
  },
  {
    key: "var",
    header: "Var%",
    numeric: true,
    cell: (r) => <Delta change={r.change} className="justify-end" />,
  },
];

/* ================================================================== */
export default function OverviewClient() {
  const inmag = marketPrices.inmag;
  const corn = marketPrices.corn;
  const usd = marketPrices.usdBlue;

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-3 space-y-px">

      {/* MERCADO HOY — una sola fila, fuente única (sin ticker duplicado) */}
      <section className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="font-heading section-heading">Mercado hoy</span>
          <span className="text-xxs text-zinc-500 tabular-nums">{marketPrices.lastUpdate}</span>
        </div>
        <div className="terminal-panel-body flex flex-wrap items-end gap-x-6 gap-y-3">
          {/* INMAG es el dato ancla: número-hero (rampa num-) con su Delta. */}
          <Stat
            label="INMAG $/kg vivo"
            value={fmt(inmag.current)}
            delta={inmag.change}
            size="text-3xl"
          />
          {/* Solo macro acá (INMAG/maíz/USD). Las categorías viven UNA sola vez, en su tabla. */}
          <Stat label="Maíz USD/tn" value={fmt(corn.current, 1)} delta={corn.change} size="text-lg" />
          <Stat label="USD blue" value={fmt(usd.current)} delta={usd.change} size="text-lg" />
          <Stat
            label="Remates hoy"
            value={rematesToday.length}
            tone={rematesToday.length ? "positive" : "neutral"}
            size="text-lg"
          />
        </div>
      </section>

      {/* 2 columnas en desktop: remates (lo accionable, izquierda) · tendencia + categorías */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px items-start">

        {/* REMATES PRÓXIMOS */}
        <section className="terminal-panel">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="font-heading section-heading flex items-center gap-2">
              Remates próximos
              {rematesToday.length > 0 && (
                <Badge tone="live" dot>{rematesToday.length} HOY</Badge>
              )}
            </span>
            <span className="text-xxs text-zinc-500 tabular-nums">{rematesUpcoming.length + rematesToday.length} prog.</span>
          </div>
          <div className="px-panel py-2">
            {nextAuctions.map((r) => {
              const isToday = r.date === TODAY;
              const dateDisplay = isToday ? "HOY" : (() => { const [, m, d] = r.date.split("-"); return `${d}/${m}`; })();
              const href = normalizeUrl(r.sourceUrl) || normalizeUrl(r.catalogUrl) || `/consignatarias/${r.consignatariaSlug || "unknown"}`;
              const isExternal = href.startsWith("http");
              const Wrapper = isExternal ? "a" : Link;
              const wrapperProps = isExternal ? { href, target: "_blank" as const, rel: "noopener noreferrer" } : { href };
              return (
                <Wrapper
                  key={r.id}
                  {...wrapperProps}
                  className={"flex items-center gap-2 px-cell py-px2 border-b border-terminal-border motion-hover hover:bg-accent/[0.03] group" + (isToday ? " border-l-2 border-l-warning" : "")}
                >
                  <span className="w-[46px] flex-shrink-0 tabular-nums text-data font-terminal">
                    {isToday ? <span className="text-positive font-semibold">HOY</span> : <span className="text-zinc-400">{dateDisplay}</span>}
                  </span>
                  <span className="w-[36px] flex-shrink-0 text-data font-terminal text-zinc-500 tabular-nums">{r.time ?? "—"}</span>
                  <span className="flex-1 min-w-0 text-data font-terminal text-zinc-200 truncate group-hover:text-accent motion-hover">{r.consignatariaName}</span>
                  <span className="hidden sm:inline text-xxs text-zinc-500 truncate max-w-[110px]">{r.location.split(",")[0]}</span>
                  <span className="text-data font-terminal tabular-nums text-zinc-400 flex-shrink-0">{r.estimatedHeads != null ? `~${fmt(r.estimatedHeads)}` : ""}</span>
                </Wrapper>
              );
            })}
            {nextAuctions.length === 0 && <p className="py-4 text-center text-data text-zinc-500 font-terminal">Sin remates próximos.</p>}
            <div className="flex items-center justify-between mt-2 pt-1">
              <span className="text-xxs text-zinc-500">{fmt(totalHeadsUpcoming)} cab. · {rematesPast.length} completados</span>
              <Link href="/remates" className="text-xxs text-accent uppercase tracking-wider hover:text-accent-bright motion-hover">Ver todos →</Link>
            </div>
          </div>
        </section>

        {/* DERECHA: tendencia INMAG + categorías */}
        <div className="flex flex-col gap-px">
          <ChartCard
            title={<span className="font-heading section-heading">Tendencia INMAG</span>}
            actions={<Delta change={inmagTrendChangePct} className="text-xxs" />}
            data={inmagChartData}
            tone="positive"
            height={150}
            decimals={0}
            prefix="$"
            footer={
              <div className="flex items-center justify-between pt-2 border-t border-terminal-border text-xxs text-zinc-500">
                <span className="tabular-nums">{inmagFromDate} — {inmagToDate}</span>
                <Link href="/mercado/inmag" className="text-accent uppercase tracking-wider hover:text-accent-bright motion-hover">Análisis →</Link>
              </div>
            }
          />

          <section className="terminal-panel">
            <div className="terminal-panel-header">
              <span className="font-heading section-heading">Categorías $/kg vivo</span>
            </div>
            <DataTable
              columns={catColumns}
              rows={catRows}
              rowKey={(r) => r.key}
              empty="Sin categorías disponibles."
            />
          </section>
        </div>
      </div>
    </div>
  );
}
