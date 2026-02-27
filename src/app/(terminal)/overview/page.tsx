import Link from "next/link";
import marketPrices from "@/lib/data/market-prices.json";
import frigorificosSummary from "@/lib/data/frigorificos-summary.json";
import rematesData from "@/lib/data/remates.json";
import consignatariasData from "@/lib/data/consignatarias.json";

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
/*  HELPER: ASCII sparkline from number array                          */
/* ================================================================== */
function sparkline(values: number[]): string {
  const blocks = "\u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588"; // ▁▂▃▄▅▆▇█
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((v) => {
      const idx = Math.round(((v - min) / range) * (blocks.length - 1));
      return blocks[idx];
    })
    .join("");
}

/* ================================================================== */
/*  HELPER: ASCII bar (filled + empty)                                 */
/* ================================================================== */
function asciiBar(pct: number, width = 12): string {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return "\u2588".repeat(filled) + "\u2591".repeat(empty);
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
const inmagSparkline = sparkline(inmagSeries);

// Frigorificos top 8 provinces
const topProvincesDisplay = frigorificosSummary.topProvinces.slice(0, 8);
const maxProvinceCount = topProvincesDisplay[0]?.count ?? 1;

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
      {/*  TICKER BAR                                                   */}
      {/* ============================================================ */}
      <div className="border-b border-terminal-border bg-terminal-panel flex-shrink-0">
        <div className="flex items-center gap-0 px-4 h-7 overflow-x-auto text-data font-terminal tabular-nums whitespace-nowrap">
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

          <span className="text-terminal-border mx-1 select-none">|</span>

          {/* FRIGORIFICOS */}
          <span className="text-zinc-500 text-xxs uppercase tracking-wider mr-1.5 ml-1">
            FRIGO
          </span>
          <span className="text-zinc-300">{frigorificosSummary.total}</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  MAIN 3-COLUMN GRID                                           */}
      {/* ============================================================ */}
      <div className="terminal-grid grid-cols-1 md:grid-cols-3 flex-1 min-h-0">
        {/* ----------------------------------------------------------
            COLUMN 1: MERCADO
        ---------------------------------------------------------- */}
        <div className="terminal-panel flex flex-col">
          <div className="terminal-panel-header flex items-center justify-between">
            <span>Mercado</span>
            <span className="terminal-tag-live text-xxs">
              <span className="inline-block w-1 h-1 bg-positive mr-1 animate-pulse-live" />
              LIVE
            </span>
          </div>
          <div className="terminal-panel-body flex-1 flex flex-col gap-3">
            {/* INMAG hero stat */}
            <div className="flex items-baseline gap-3">
              <div className="terminal-stat">
                <span className="terminal-stat-label">INMAG $/kg vivo</span>
                <span className="terminal-stat-value text-2xl text-zinc-50">
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
                  const { arrow, cls } = changeArrow(c.change);
                  return (
                    <tr key={key}>
                      <td className="text-zinc-400 uppercase text-xxs tracking-wider">
                        {categoryLabels[key] || key}
                      </td>
                      <td className="num text-zinc-100 font-semibold">
                        {fmt(c.current)}
                      </td>
                      <td className="num text-zinc-500">{fmt(c.prev)}</td>
                      <td className={"num " + cls}>
                        {arrow}
                        {fmt(Math.abs(c.change), 1)}%
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
            <span>Remates Proximos</span>
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

            {/* Next 5 auctions — compact list */}
            <div className="space-y-0">
              {nextAuctions.map((r) => {
                const isToday = r.date === TODAY;
                const dateDisplay = isToday
                  ? "HOY"
                  : r.date.slice(5).replace("-", "/");
                const href = r.sourceUrl || r.catalogUrl || `/consignatarias/${r.consignatariaSlug}`;
                const isExternal = href.startsWith('http');
                const Wrapper = isExternal ? 'a' : Link;
                const wrapperProps = isExternal
                  ? { href, target: "_blank" as const, rel: "noopener noreferrer" }
                  : { href };
                return (
                  <Wrapper
                    key={r.id}
                    {...wrapperProps}
                    className="flex items-center gap-2 px-cell py-px2 border-b border-terminal-border hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                  >
                    <span className="w-[52px] flex-shrink-0 tabular-nums text-data font-terminal">
                      {isToday ? (
                        <span className="text-positive font-semibold">{dateDisplay}</span>
                      ) : (
                        <span className="text-zinc-400">{dateDisplay}</span>
                      )}
                    </span>
                    <span className="w-[38px] flex-shrink-0 text-data font-terminal text-zinc-500 tabular-nums">
                      {r.time ?? '—'}
                    </span>
                    <span className="flex-1 min-w-0 text-data font-terminal text-zinc-200 truncate group-hover:text-accent transition-colors" title={r.consignatariaName}>
                      {r.consignatariaName}
                    </span>
                    <span className="hidden sm:inline text-xxs text-zinc-600 truncate max-w-[100px]">
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
                    Detalle remates hoy ({TODAY})
                  </span>
                  {rematesToday.map((r) => (
                    <div
                      key={r.id}
                      className="mt-1.5 border-l-2 border-positive pl-2"
                    >
                      <div className="text-data text-zinc-200 font-semibold">
                        {r.title}
                      </div>
                      <div className="text-xxs text-zinc-400">
                        {r.time ? `${r.time} — ` : ''}{r.location}
                        {r.estimatedHeads != null && (
                          <>
                            {' — '}
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

        {/* ----------------------------------------------------------
            COLUMN 3: FRIGORIFICOS
        ---------------------------------------------------------- */}
        <div className="terminal-panel flex flex-col">
          <div className="terminal-panel-header flex items-center justify-between">
            <span>Frigorificos</span>
            <span className="text-xxs text-zinc-400 tabular-nums">
              {frigorificosSummary.total} habilitados
            </span>
          </div>
          <div className="terminal-panel-body flex-1 flex flex-col gap-2">
            {/* Stages */}
            <div className="grid grid-cols-3 gap-2">
              <div className="terminal-stat">
                <span className="terminal-stat-label">Tránsito</span>
                <span className="terminal-stat-value text-base tabular-nums">
                  {frigorificosSummary.byStage["1"]}
                </span>
              </div>
              <div className="terminal-stat">
                <span className="terminal-stat-label">Ciclo II</span>
                <span className="terminal-stat-value text-base tabular-nums">
                  {frigorificosSummary.byStage["2"]}
                </span>
              </div>
              <div className="terminal-stat">
                <span className="terminal-stat-label">Ciclo III</span>
                <span className="terminal-stat-value text-base tabular-nums">
                  {frigorificosSummary.byStage["3"]}
                </span>
              </div>
            </div>

            <div className="terminal-divider" />

            {/* Province breakdown: top 8 with ASCII bars */}
            <div className="text-xxs text-zinc-500 uppercase tracking-wider mb-1">
              Distribucion por provincia (top 8)
            </div>
            <table className="terminal-table">
              <thead>
                <tr>
                  <th>Provincia</th>
                  <th className="num">N</th>
                  <th className="num">%</th>
                  <th style={{ width: "35%" }}></th>
                </tr>
              </thead>
              <tbody>
                {topProvincesDisplay.map((p) => (
                  <tr key={p.province}>
                    <td className="text-zinc-300 text-xxs uppercase tracking-wider">
                      {p.province.length > 14
                        ? p.province.slice(0, 12) + ".."
                        : p.province}
                    </td>
                    <td className="num text-zinc-100 font-semibold tabular-nums">
                      {p.count}
                    </td>
                    <td className="num text-zinc-500 tabular-nums">
                      {fmt(p.pct, 1)}
                    </td>
                    <td className="text-positive font-terminal text-xxs tracking-tighter">
                      {asciiBar(
                        (p.count / maxProvinceCount) * 100,
                        12
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="terminal-divider-dashed" />

            {/* Remaining count */}
            <div className="flex items-center justify-between text-xxs">
              <span className="text-zinc-500 uppercase tracking-wider">
                Otras 15 provincias
              </span>
              <span className="text-zinc-400 tabular-nums">
                {frigorificosSummary.total -
                  topProvincesDisplay.reduce(
                    (s: number, p: { count: number }) => s + p.count,
                    0
                  )}{" "}
                plantas
              </span>
            </div>

            {/* Link */}
            <div className="mt-auto pt-3">
              <Link
                href="/frigorificos"
                className="text-xxs text-accent uppercase tracking-wider hover:text-accent-bright transition-colors"
              >
                VER DIRECTORIO COMPLETO &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  BOTTOM: INMAG TENDENCIA — sparkline chart                    */}
      {/* ============================================================ */}
      <div className="terminal-panel border-t border-terminal-border">
        <div className="terminal-panel-header flex items-center justify-between">
          <span>INMAG Tendencia 8 Semanas</span>
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
            {/* Sparkline */}
            <div className="flex-1 min-w-0 overflow-x-auto">
              <div className="flex items-end justify-between mb-1">
                <span className="text-xxs text-zinc-500 tabular-nums">
                  Min: {fmt(Math.min(...inmagSeries))}
                </span>
                <span className="text-xxs text-zinc-500 tabular-nums">
                  Max: {fmt(Math.max(...inmagSeries))}
                </span>
              </div>
              {/* Large ASCII sparkline */}
              <div className="font-terminal text-2xl md:text-3xl text-positive tracking-[0.15em] md:tracking-[0.25em] leading-none glow-positive select-none whitespace-nowrap">
                {inmagSparkline}
              </div>
              {/* Date axis — hidden on mobile to prevent overflow */}
              <div className="hidden md:flex justify-between mt-1">
                {marketPrices.inmag.series.map(
                  (pt: { date: string; value: number }) => (
                    <span
                      key={pt.date}
                      className="text-xxs text-zinc-600 tabular-nums"
                    >
                      {pt.date.slice(5)}
                    </span>
                  )
                )}
              </div>
              {/* Value axis — hidden on mobile */}
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

      {/* ============================================================ */}
      {/*  FOOTER STATUS BAR                                            */}
      {/* ============================================================ */}
      <div className="border-t border-terminal-border bg-terminal-panel flex-shrink-0">
        <div className="flex items-center justify-between px-4 h-6 text-xxs font-terminal text-zinc-600">
          <div className="flex items-center gap-3">
            <span>
              ULT. ACT.:{" "}
              <span className="text-zinc-500 tabular-nums">
                {new Date(marketPrices.lastUpdate).toLocaleString("es-AR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </span>
            <span className="text-terminal-border">|</span>
            <span>
              FUENTES: MAG, MAGYP, dolarapi.com
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              CONSIG: {consignatariasData.length} &middot; FRIGO:{" "}
              {frigorificosSummary.total} &middot; REMATES:{" "}
              {rematesData.length}
            </span>
            <span className="text-terminal-border">|</span>
            <span className="text-zinc-500">consignatarias.com.ar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
