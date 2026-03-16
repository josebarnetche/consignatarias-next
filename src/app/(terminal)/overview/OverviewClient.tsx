import Link from "next/link";
import marketPrices from "@/lib/data/market-prices.json";
import rematesData from "@/lib/data/remates.json";
import consignatariasData from "@/lib/data/consignatarias.json";
import { normalizeUrl } from "@/lib/utils/url";

/* ================================================================== */
/*  HELPER: format number with locale                                  */
/* ================================================================== */
function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/* ================================================================== */
/*  HELPER: change arrow + class                                       */
/* ================================================================== */
function changeArrow(change: number): { arrow: string; cls: string } {
  if (change > 0) return { arrow: "\u25B2", cls: "val-positive glow-positive" };
  if (change < 0) return { arrow: "\u25BC", cls: "val-negative glow-negative" };
  return { arrow: "\u25CF", cls: "val-neutral" };
}

/* ================================================================== */
/*  DATA PREP                                                          */
/* ================================================================== */

const TODAY = new Date().toISOString().split("T")[0];

// Remates: today, upcoming (future, sorted by date), past
const rematesToday = rematesData.filter((r) => r.date === TODAY);
const rematesUpcoming = rematesData
  .filter((r) => r.date > TODAY && r.status === "scheduled")
  .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
const rematesPast = rematesData.filter((r) => r.date < TODAY);

// Next 5 auctions (today first, then future)
const nextAuctions = [...rematesToday, ...rematesUpcoming].slice(0, 5);

// Total heads upcoming (including today)
const totalHeadsUpcoming = [...rematesToday, ...rematesUpcoming].reduce(
  (s, r) => s + (r.estimatedHeads ?? 0),
  0
);

// Category labels
const categoryLabels: Record<string, string> = {
  novillos: "Novillos",
  novillitos: "Novillitos",
  vaquillonas: "Vaquillonas",
  vacas: "Vacas",
  toros: "Toros",
  terneros: "Terneros",
};

// INMAG sparkline data
const inmagSeries = marketPrices.inmag.series.map(
  (pt: { date: string; value: number }) => pt.value
);
const inmagSeriesMin = Math.min(...inmagSeries);
const inmagSeriesMax = Math.max(...inmagSeries);
const inmagSeriesRange = inmagSeriesMax - inmagSeriesMin || 1;

// Consignatarias summary
const consigByProvince = consignatariasData.reduce<Record<string, number>>(
  (acc, c) => {
    acc[c.province] = (acc[c.province] || 0) + 1;
    return acc;
  },
  {}
);
const consigProvinceCount = Object.keys(consigByProvince).length;

/* ================================================================== */
/*  PAGE COMPONENT                                                     */
/* ================================================================== */
export default function HomePage() {
  const inmag = marketPrices.inmag;
  const cats = marketPrices.categories;
  const corn = marketPrices.corn;
  const usd = marketPrices.usdBlue;

  return (
    <div className="flex flex-col min-h-0">
      {/* ============================================================ */}
      {/*  TICKER BAR (hidden on mobile -- too dense)                   */}
      {/* ============================================================ */}
      <div
        className="border-b border-terminal-border flex-shrink-0 hidden md:block"
        style={{
          background:
            "linear-gradient(90deg, #16161d 0%, #0a0a0f 50%, #16161d 100%)",
        }}
      >
        <div className="flex items-center gap-0 px-4 h-8 overflow-x-auto text-data font-terminal tabular-nums whitespace-nowrap">
          {/* INMAG */}
          <span className="text-zinc-500 text-xxs uppercase tracking-wider mr-1.5">
            INMAG
          </span>
          <span className="text-zinc-100 font-semibold mr-1">
            {fmt(inmag.current)}
          </span>
          <span className={changeArrow(inmag.change).cls + " text-xxs mr-3"}>
            {changeArrow(inmag.change).arrow}
            {fmt(inmag.change, 1)}%
          </span>

          <span className="text-terminal-border mx-1 select-none">|</span>

          {/* NOV */}
          <span className="text-zinc-500 text-xxs uppercase tracking-wider mr-1.5 ml-1">
            NOV
          </span>
          <span className="text-zinc-300 mr-1">{fmt(cats.novillos.current)}</span>
          <span
            className={changeArrow(cats.novillos.change).cls + " text-xxs mr-3"}
          >
            {changeArrow(cats.novillos.change).arrow}
            {fmt(cats.novillos.change, 1)}%
          </span>

          <span className="text-terminal-border mx-1 select-none">|</span>

          {/* TERN */}
          <span className="text-zinc-500 text-xxs uppercase tracking-wider mr-1.5 ml-1">
            TERN
          </span>
          <span className="text-zinc-300 mr-1">{fmt(cats.terneros.current)}</span>
          <span
            className={changeArrow(cats.terneros.change).cls + " text-xxs mr-3"}
          >
            {changeArrow(cats.terneros.change).arrow}
            {fmt(cats.terneros.change, 1)}%
          </span>

          <span className="text-terminal-border mx-1 select-none">|</span>

          {/* CORN */}
          <span className="text-zinc-500 text-xxs uppercase tracking-wider mr-1.5 ml-1">
            CORN
          </span>
          <span className="text-zinc-300 mr-1">
            {fmt(corn.current, 1)}
          </span>
          <span className="text-zinc-500 text-xxs mr-1">USD/tn</span>
          <span className={changeArrow(corn.change).cls + " text-xxs mr-3"}>
            {changeArrow(corn.change).arrow}
            {fmt(corn.change, 1)}%
          </span>

          <span className="text-terminal-border mx-1 select-none">|</span>

          {/* USD BLUE */}
          <span className="text-zinc-500 text-xxs uppercase tracking-wider mr-1.5 ml-1">
            USD/BLUE
          </span>
          <span className="text-zinc-300 mr-1">{fmt(usd.current)}</span>
          <span className={changeArrow(usd.change).cls + " text-xxs mr-3"}>
            {changeArrow(usd.change).arrow}
            {fmt(usd.change, 1)}%
          </span>

          <span className="text-terminal-border mx-1 select-none">|</span>

          {/* REMATES HOY */}
          <span className="text-zinc-500 text-xxs uppercase tracking-wider mr-1.5 ml-1">
            REMATES HOY
          </span>
          <span className="text-warning font-semibold">{rematesToday.length}</span>

        </div>
      </div>

      {/* ============================================================ */}
      {/*  MAIN 3-COLUMN GRID                                           */}
      {/* ============================================================ */}
      <div className="terminal-grid grid-cols-1 md:grid-cols-2 flex-1 min-h-0">
        {/* ----------------------------------------------------------
            COLUMN 1: MERCADO
        ---------------------------------------------------------- */}
        <div className="terminal-panel flex flex-col">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="font-heading section-heading flex items-center gap-2">
              Mercado
              {rematesToday.length > 0 && <span className="live-indicator" />}
            </span>
            {rematesToday.length > 0 ? (
              <span className="terminal-tag-live text-xxs">
                <span className="inline-block w-1 h-1 bg-live mr-1 animate-pulse-live" />
                LIVE
              </span>
            ) : (
              <span className="text-xxs text-zinc-500 tabular-nums">
                {marketPrices.lastUpdate}
              </span>
            )}
          </div>
          <div className="terminal-panel-body flex-1 flex flex-col gap-3">
            {/* INMAG hero stat */}
            <div className="flex items-baseline gap-3">
              <div className="terminal-stat">
                <span className="terminal-stat-label">INMAG $/kg vivo</span>
                <span className="terminal-stat-value text-3xl text-zinc-50 stat-countup">
                  {fmt(inmag.current)}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span
                  className={
                    changeArrow(inmag.change).cls +
                    " text-sm font-terminal tabular-nums font-semibold"
                  }
                >
                  {changeArrow(inmag.change).arrow} {fmt(inmag.change, 1)}%
                </span>
                <span className="text-xxs text-zinc-500 tabular-nums">
                  ant. {fmt(inmag.prev)}
                </span>
              </div>
            </div>

            <div className="terminal-divider" />

            {/* Categories table */}
            <table className="terminal-table">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th className="num">$/kg</th>
                  <th className="num">Ant.</th>
                  <th className="num">Var%</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(cats).map(([key, val]) => {
                  const c = val as { current: number; prev: number; change: number };
                  const { cls } = changeArrow(c.change);
                  const rowTint =
                    c.change > 0
                      ? "bg-positive/[0.03]"
                      : c.change < 0
                      ? "bg-negative/[0.03]"
                      : "";
                  return (
                    <tr key={key} className={rowTint}>
                      <td className="text-zinc-400 uppercase text-xxs tracking-wider">
                        {categoryLabels[key] || key}
                      </td>
                      <td className="num text-zinc-100 font-semibold">
                        {fmt(c.current)}
                      </td>
                      <td className="num text-zinc-500">{fmt(c.prev)}</td>
                      <td className="num relative">
                        <span
                          className="absolute inset-0 rounded-sm opacity-20"
                          style={{
                            background:
                              c.change > 0
                                ? "linear-gradient(90deg, transparent 0%, rgba(34,197,94,0.15) 100%)"
                                : c.change < 0
                                ? "linear-gradient(90deg, transparent 0%, rgba(239,68,68,0.15) 100%)"
                                : "none",
                          }}
                        />
                        <span className={cls + " relative z-10"}>
                          {fmt(Math.abs(c.change), 1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="terminal-divider-dashed" />

            {/* Corn + USD */}
            <div className="grid grid-cols-2 gap-3">
              <div className="terminal-stat">
                <span className="terminal-stat-label">Maiz USD/tn</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="terminal-stat-value text-base">
                    {fmt(corn.current, 1)}
                  </span>
                  <span
                    className={
                      changeArrow(corn.change).cls + " text-xxs tabular-nums"
                    }
                  >
                    {changeArrow(corn.change).arrow}
                    {fmt(corn.change, 1)}%
                  </span>
                </div>
              </div>
              <div className="terminal-stat">
                <span className="terminal-stat-label">USD Blue</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="terminal-stat-value text-base">
                    {fmt(usd.current)}
                  </span>
                  <span
                    className={
                      changeArrow(usd.change).cls + " text-xxs tabular-nums"
                    }
                  >
                    {changeArrow(usd.change).arrow}
                    {fmt(usd.change, 1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Consignatarias quick stat */}
            <div className="terminal-divider-dashed" />
            <div className="flex items-center justify-between text-xxs">
              <span className="text-zinc-500 uppercase tracking-wider">
                Consignatarias registradas
              </span>
              <span className="text-zinc-300 tabular-nums font-semibold">
                {consignatariasData.length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xxs">
              <span className="text-zinc-500 uppercase tracking-wider">
                Provincias c/ consignatarias
              </span>
              <span className="text-zinc-300 tabular-nums font-semibold">
                {consigProvinceCount}
              </span>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------
            COLUMN 2: REMATES PROXIMOS
        ---------------------------------------------------------- */}
        <div className="terminal-panel flex flex-col">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="font-heading section-heading">Remates Proximos</span>
            <div className="flex items-center gap-2">
              {rematesToday.length > 0 && (
                <span className="terminal-tag-live text-xxs">
                  <span className="inline-block w-1 h-1 bg-positive mr-1 animate-pulse-live" />
                  {rematesToday.length} HOY
                </span>
              )}
              <span className="text-xxs text-zinc-500 tabular-nums">
                {rematesUpcoming.length + rematesToday.length} prog.
              </span>
            </div>
          </div>
          <div className="terminal-panel-body flex-1 flex flex-col">
            {/* Summary strip */}
            <div className="flex items-center gap-4 mb-2">
              <div className="terminal-stat">
                <span className="terminal-stat-label">Cab. programadas</span>
                <span className="terminal-stat-value text-base text-warning tabular-nums">
                  {fmt(totalHeadsUpcoming)}
                </span>
              </div>
              <div className="terminal-stat">
                <span className="terminal-stat-label">Completados</span>
                <span className="terminal-stat-value text-base text-zinc-400 tabular-nums">
                  {rematesPast.length}
                </span>
              </div>
            </div>

            <div className="terminal-divider" />

            {/* Next 5 auctions -- compact list with row-enter animation */}
            <div className="space-y-0">
              {nextAuctions.map((r, idx) => {
                const isToday = r.date === TODAY;
                const dateDisplay = isToday
                  ? "HOY"
                  : (() => { const [,m,d] = r.date.split('-'); return `${d}/${m}`; })();
                const href = normalizeUrl(r.sourceUrl) || normalizeUrl(r.catalogUrl) || `/consignatarias/${r.consignatariaSlug || 'unknown'}`;
                const isExternal = href.startsWith('http');
                const Wrapper = isExternal ? 'a' : Link;
                const wrapperProps = isExternal
                  ? { href, target: "_blank" as const, rel: "noopener noreferrer" }
                  : { href };
                return (
                  <Wrapper
                    key={r.id}
                    {...wrapperProps}
                    className={
                      "row-enter flex items-center gap-2 px-cell py-px2 border-b border-terminal-border hover:bg-zinc-800/50 transition-colors cursor-pointer group" +
                      (isToday ? " border-l-2 border-l-amber-400" : "")
                    }
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <span className="w-[52px] flex-shrink-0 tabular-nums text-data font-terminal">
                      {isToday ? (
                        <span className="text-positive font-semibold">{dateDisplay}</span>
                      ) : (
                        <span className="text-zinc-400">{dateDisplay}</span>
                      )}
                    </span>
                    <span className="w-[38px] flex-shrink-0 text-data font-terminal text-zinc-500 tabular-nums">
                      {r.time ?? '\u2014'}
                    </span>
                    <span className="flex-1 min-w-0 text-data font-terminal text-zinc-200 truncate group-hover:text-accent transition-colors" title={r.consignatariaName}>
                      {r.consignatariaName}
                    </span>
                    <span className="hidden sm:inline text-xxs text-zinc-500 truncate max-w-[100px]">
                      {r.location.split(',')[0]}
                    </span>
                    <span className="text-data font-terminal tabular-nums text-zinc-400 flex-shrink-0">
                      {r.estimatedHeads != null ? `~${fmt(r.estimatedHeads)}` : ''}
                    </span>
                  </Wrapper>
                );
              })}
            </div>

            {/* Today's detail */}
            {rematesToday.length > 0 && (
              <>
                <div className="terminal-divider-dashed mt-2" />
                <div className="mt-2">
                  <span className="text-xxs text-zinc-500 uppercase tracking-wider">
                    Detalle remates hoy ({TODAY.split('-').reverse().join('/')})
                  </span>
                  {rematesToday.map((r) => (
                    <div
                      key={r.id}
                      className="mt-1.5 border-l-2 border-amber-400 pl-2"
                    >
                      <div className="text-data text-zinc-200 font-semibold">
                        {r.title}
                      </div>
                      <div className="text-xxs text-zinc-400">
                        {r.time ? `${r.time} \u2014 ` : ''}{r.location}
                        {r.estimatedHeads != null && (
                          <>
                            {' \u2014 '}
                            <span className="text-warning tabular-nums">
                              {fmt(r.estimatedHeads)} cab.
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Link to full list */}
            <div className="mt-auto pt-3">
              <Link
                href="/remates"
                className="text-xxs text-accent uppercase tracking-wider hover:text-accent-bright transition-colors"
              >
                VER TODOS LOS REMATES &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  BOTTOM: INMAG TENDENCIA -- CSS gradient bar chart             */}
      {/* ============================================================ */}
      <div className="terminal-panel border-t border-terminal-border">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="font-heading section-heading">INMAG Tendencia 8 Semanas</span>
          <span className="text-xxs text-zinc-500 tabular-nums">
            {marketPrices.inmag.series[0].date} &mdash;{" "}
            {
              marketPrices.inmag.series[marketPrices.inmag.series.length - 1]
                .date
            }
          </span>
        </div>
        <div className="terminal-panel-body">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            {/* CSS gradient bar sparkline */}
            <div className="flex-1 min-w-0 overflow-x-auto">
              <div className="flex items-end justify-between mb-1">
                <span className="text-xxs text-zinc-500 tabular-nums">
                  Min: {fmt(inmagSeriesMin)}
                </span>
                <span className="text-xxs text-zinc-500 tabular-nums">
                  Max: {fmt(inmagSeriesMax)}
                </span>
              </div>
              {/* Bar chart -- each data point is a div with proportional height */}
              <div className="flex items-end gap-1 h-16 md:h-20">
                {inmagSeries.map((val: number, idx: number) => {
                  const heightPct =
                    ((val - inmagSeriesMin) / inmagSeriesRange) * 80 + 20;
                  return (
                    <div
                      key={idx}
                      className="flex-1 rounded-t-sm gradient-bar-fill-positive transition-all duration-300"
                      style={{ height: `${heightPct}%` }}
                      title={`${marketPrices.inmag.series[idx].date}: ${fmt(val)}`}
                    />
                  );
                })}
              </div>
              {/* Date axis -- hidden on mobile to prevent overflow */}
              <div className="hidden md:flex justify-between mt-1">
                {marketPrices.inmag.series.map(
                  (pt: { date: string; value: number }) => (
                    <span
                      key={pt.date}
                      className="text-xxs text-zinc-500 tabular-nums"
                    >
                      {pt.date.slice(5)}
                    </span>
                  )
                )}
              </div>
              {/* Value axis -- hidden on mobile */}
              <div className="hidden md:flex justify-between mt-0.5">
                {marketPrices.inmag.series.map(
                  (pt: { date: string; value: number }) => (
                    <span
                      key={pt.date + "-val"}
                      className="text-xxs text-zinc-500 tabular-nums"
                    >
                      {fmt(pt.value)}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Summary column */}
            <div className="flex-shrink-0 flex md:flex-col items-center md:items-end gap-3 md:gap-1 md:pl-4 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-terminal-border">
              <div className="terminal-stat md:items-end">
                <span className="terminal-stat-label md:text-right">8W Change</span>
                <span className="terminal-stat-value text-sm md:text-lg text-positive glow-positive tabular-nums">
                  +
                  {fmt(
                    ((inmagSeries[inmagSeries.length - 1] - inmagSeries[0]) /
                      inmagSeries[0]) *
                      100,
                    1
                  )}
                  %
                </span>
              </div>
              <div className="terminal-stat md:items-end">
                <span className="terminal-stat-label md:text-right">8W Abs</span>
                <span className="text-data text-zinc-300 tabular-nums">
                  +{fmt(inmagSeries[inmagSeries.length - 1] - inmagSeries[0])} $/kg
                </span>
              </div>
              <div className="terminal-stat md:items-end">
                <span className="terminal-stat-label md:text-right">Media 8W</span>
                <span className="text-data text-zinc-300 tabular-nums">
                  {fmt(
                    inmagSeries.reduce((a: number, b: number) => a + b, 0) /
                      inmagSeries.length,
                    0
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
