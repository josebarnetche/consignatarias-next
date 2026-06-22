import Link from "next/link";
import marketPrices from "@/lib/data/market-prices.json";
import rematesData from "@/lib/data/remates.json";
import { normalizeUrl } from "@/lib/utils/url";
import { PriceLineChart, type PricePoint } from "@/components/charts/PriceLineChart";
import { Delta } from "@/components/ui";

/* ---------- helpers ---------- */
function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function changeArrow(change: number): { arrow: string; cls: string } {
  if (change > 0) return { arrow: "▲", cls: "val-positive" };
  if (change < 0) return { arrow: "▼", cls: "val-negative" };
  return { arrow: "●", cls: "val-neutral" };
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
const inmagTrendUp = inmagTrendChangePct >= 0;
const inmagFromDate = inmagRawSeries[0]?.date ?? "";
const inmagToDate = inmagRawSeries[inmagRawSeries.length - 1]?.date ?? "";

/* ---------- compact stat (market strip) ---------- */
// Validación Fase 0: la variación usa la primitiva <Delta> (token semántico +
// tabular-nums + glyph por signo), reemplazando el changeArrow ASCII local.
function Stat({ label, value, change }: { label: string; value: string; change?: number }) {
  return (
    <div>
      <div className="text-xxs text-zinc-500 uppercase tracking-wider whitespace-nowrap">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-terminal tabular-nums text-zinc-200">{value}</span>
        {change != null && <Delta change={change} className="text-xxs" />}
      </div>
    </div>
  );
}

/* ================================================================== */
export default function OverviewClient() {
  const inmag = marketPrices.inmag;
  const cats = marketPrices.categories;
  const corn = marketPrices.corn;
  const usd = marketPrices.usdBlue;
  const ia = changeArrow(inmag.change);

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-3 space-y-px">

      {/* MERCADO HOY — una sola fila, fuente única (sin ticker duplicado) */}
      <section className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="font-heading section-heading">Mercado hoy</span>
          <span className="text-xxs text-zinc-500 tabular-nums">{marketPrices.lastUpdate}</span>
        </div>
        <div className="px-panel py-3 flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <div className="text-xxs text-zinc-500 uppercase tracking-wider">INMAG $/kg vivo</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-light text-zinc-50 tabular-nums">{fmt(inmag.current)}</span>
              <span className={ia.cls + " text-sm font-terminal tabular-nums font-semibold"}>{ia.arrow} {fmt(inmag.change, 1)}%</span>
            </div>
          </div>
          {/* Solo macro acá (INMAG/maíz/USD). Las categorías viven UNA sola vez, en su tabla. */}
          <Stat label="Maíz USD/tn" value={fmt(corn.current, 1)} change={corn.change} />
          <Stat label="USD blue" value={fmt(usd.current)} change={usd.change} />
          <div>
            <div className="text-xxs text-zinc-500 uppercase tracking-wider">Remates hoy</div>
            <span className={"text-lg font-terminal tabular-nums " + (rematesToday.length ? "text-positive" : "text-zinc-500")}>{rematesToday.length}</span>
          </div>
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
                <span className="terminal-tag-live text-xxs">
                  <span className="inline-block w-1 h-1 bg-positive mr-1 animate-pulse-live" />{rematesToday.length} HOY
                </span>
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
                  className={"flex items-center gap-2 px-cell py-px2 border-b border-terminal-border hover:bg-zinc-800/50 transition-colors group" + (isToday ? " border-l-2 border-l-amber-400" : "")}
                >
                  <span className="w-[46px] flex-shrink-0 tabular-nums text-data font-terminal">
                    {isToday ? <span className="text-positive font-semibold">HOY</span> : <span className="text-zinc-400">{dateDisplay}</span>}
                  </span>
                  <span className="w-[36px] flex-shrink-0 text-data font-terminal text-zinc-500 tabular-nums">{r.time ?? "—"}</span>
                  <span className="flex-1 min-w-0 text-data font-terminal text-zinc-200 truncate group-hover:text-accent transition-colors">{r.consignatariaName}</span>
                  <span className="hidden sm:inline text-xxs text-zinc-500 truncate max-w-[110px]">{r.location.split(",")[0]}</span>
                  <span className="text-data font-terminal tabular-nums text-zinc-400 flex-shrink-0">{r.estimatedHeads != null ? `~${fmt(r.estimatedHeads)}` : ""}</span>
                </Wrapper>
              );
            })}
            {nextAuctions.length === 0 && <p className="py-4 text-center text-data text-zinc-500 font-terminal">Sin remates próximos.</p>}
            <div className="flex items-center justify-between mt-2 pt-1">
              <span className="text-xxs text-zinc-500">{fmt(totalHeadsUpcoming)} cab. · {rematesPast.length} completados</span>
              <Link href="/remates" className="text-xxs text-accent uppercase tracking-wider hover:text-accent-bright transition-colors">Ver todos →</Link>
            </div>
          </div>
        </section>

        {/* DERECHA: tendencia INMAG + categorías */}
        <div className="flex flex-col gap-px">
          <section className="terminal-panel">
            <div className="terminal-panel-header flex items-center justify-between">
              <span className="font-heading section-heading">Tendencia INMAG</span>
              <span className={(inmagTrendUp ? "val-positive" : "val-negative") + " text-xxs font-terminal tabular-nums"}>{inmagTrendUp ? "+" : ""}{fmt(inmagTrendChangePct, 1)}%</span>
            </div>
            <div className="px-panel py-3">
              <PriceLineChart data={inmagChartData} height={150} accentColor="#34d399" decimals={0} prefix="$" />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-terminal-border text-xxs text-zinc-500">
                <span className="tabular-nums">{inmagFromDate} — {inmagToDate}</span>
                <Link href="/mercado/inmag" className="text-accent uppercase tracking-wider hover:text-accent-bright transition-colors">Análisis →</Link>
              </div>
            </div>
          </section>

          <section className="terminal-panel">
            <div className="terminal-panel-header">
              <span className="font-heading section-heading">Categorías $/kg vivo</span>
            </div>
            <table className="terminal-table">
              <thead>
                <tr><th>Categoría</th><th className="num">$/kg</th><th className="num">Ant.</th><th className="num">Var%</th></tr>
              </thead>
              <tbody>
                {Object.entries(cats).map(([key, val]) => {
                  const c = val as { current: number; prev: number; change: number };
                  return (
                    <tr key={key}>
                      <td className="text-zinc-400 uppercase text-xxs tracking-wider">{categoryLabels[key] || key}</td>
                      <td className="num text-zinc-100 font-semibold">{fmt(c.current)}</td>
                      <td className="num text-zinc-500">{fmt(c.prev)}</td>
                      <td className="num"><Delta change={c.change} className="justify-end" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}
