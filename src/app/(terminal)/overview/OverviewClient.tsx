import Link from "next/link";
import marketPrices from "@/lib/data/market-prices.json";
import rematesData from "@/lib/data/remates.json";
import { normalizeUrl } from "@/lib/utils/url";
import MiGanadoWidget from "./MiGanadoWidget";
import {
  Stat,
  Delta,
  Badge,
  ChartCard,
  type PricePoint,
} from "@/components/ui";

/* ---------- helpers ---------- */
function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/* ---------- data prep ---------- */
const TODAY = new Date().toISOString().split("T")[0];
const WEEK_END = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

type Remate = (typeof rematesData)[number];

const rematesToday = rematesData
  .filter((r) => r.date === TODAY)
  .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
const rematesWeek = rematesData
  .filter((r) => r.date > TODAY && r.date <= WEEK_END && r.status === "scheduled")
  .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
const rematesUpcomingAll = rematesData.filter((r) => r.date >= TODAY && r.status === "scheduled");
const totalHeadsWeek = [...rematesToday, ...rematesWeek].reduce((s, r) => s + (r.estimatedHeads ?? 0), 0);

function IconChip({ icon, size = "w-5 h-5", img = "w-3.5 h-3.5" }: { icon: string; size?: string; img?: string }) {
  return (
    <span className={`${size} rounded-sm bg-zinc-100 inline-flex items-center justify-center select-none`} aria-hidden="true">
      <img src={`/marca/iconos-color/${icon}.png`} alt="" className={img} />
    </span>
  );
}

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

type CatRow = { key: string; name: string; current: number; change: number };
const catRows: CatRow[] = Object.entries(marketPrices.categories).map(([key, val]) => {
  const c = val as { current: number; prev: number; change: number };
  return { key, name: categoryLabels[key] || key, current: c.current, change: c.change };
});

/* ---------- remate row (compartida entre HOY y ESTA SEMANA) ---------- */
function RemateRow({ r, isToday }: { r: Remate; isToday: boolean }) {
  const dateDisplay = isToday ? "HOY" : (() => { const [, m, d] = r.date.split("-"); return `${d}/${m}`; })();
  const href = normalizeUrl(r.sourceUrl) || normalizeUrl(r.catalogUrl) || `/consignatarias/${r.consignatariaSlug || "unknown"}`;
  const isExternal = href.startsWith("http");
  const Wrapper = isExternal ? "a" : Link;
  const wrapperProps = isExternal ? { href, target: "_blank" as const, rel: "noopener noreferrer" } : { href };
  return (
    <Wrapper
      {...wrapperProps}
      className={"flex items-center gap-2.5 sm:gap-2 px-cell min-h-[44px] sm:min-h-0 py-2.5 sm:py-px2 border-b border-terminal-border motion-hover hover:bg-accent/[0.03] active:bg-accent/[0.06] group" + (isToday ? " border-l-2 border-l-warning" : "")}
    >
      <span className="w-[44px] flex-shrink-0 tabular-nums text-data font-terminal">
        {isToday ? <span className="text-positive font-semibold">HOY</span> : <span className="text-zinc-400">{dateDisplay}</span>}
      </span>
      <span className="w-[36px] flex-shrink-0 text-data font-terminal text-zinc-500 tabular-nums">{r.time ?? "—"}</span>
      <span className="flex-1 min-w-0 text-data font-terminal text-zinc-200 truncate group-hover:text-accent motion-hover">{r.consignatariaName}</span>
      <span className="hidden sm:inline text-xxs text-zinc-500 truncate max-w-[110px]">{r.location.split(",")[0]}</span>
      <span className="text-data font-terminal tabular-nums text-zinc-400 flex-shrink-0">{r.estimatedHeads != null ? `~${fmt(r.estimatedHeads)}` : ""}</span>
    </Wrapper>
  );
}

/* ================================================================== */
export default function OverviewClient() {
  const inmag = marketPrices.inmag;
  const corn = marketPrices.corn;
  const usd = marketPrices.usdBlue;
  const weekShown = rematesWeek.slice(0, 9);
  const weekRest = rematesWeek.length - weekShown.length;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 space-y-2 sm:space-y-px">

      {/* 1 · MERCADO HOY — cinta de estado, fuente única */}
      <section className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="font-heading section-heading flex items-center gap-2"><IconChip icon="indice" />Mercado hoy</span>
          <span className="text-xxs text-zinc-500 tabular-nums">{marketPrices.lastUpdate}</span>
        </div>
        <div className="terminal-panel-body grid grid-cols-2 gap-x-4 gap-y-5 sm:flex sm:flex-wrap sm:items-end sm:gap-x-6 sm:gap-y-3">
          <Stat
            label="INMAG $/kg vivo"
            value={fmt(inmag.current)}
            delta={inmag.change}
            size="text-4xl sm:text-3xl"
            className="col-span-2"
          />
          <Stat label="Maíz USD/tn" value={fmt(corn.current, 1)} delta={corn.change} size="text-xl sm:text-lg" />
          <Stat label="USD blue" value={fmt(usd.current)} delta={usd.change} size="text-xl sm:text-lg" />
          <Stat
            label="Remates hoy"
            value={rematesToday.length}
            tone={rematesToday.length ? "positive" : "neutral"}
            size="text-xl sm:text-lg"
          />
        </div>
      </section>

      {/* 2 · TU POSICIÓN — mi ganado (cartera) + el índice al lado, como un broker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-px items-stretch">
        <section className="terminal-panel flex flex-col">
          <div className="terminal-panel-header flex items-center justify-between">
            <span className="font-heading section-heading flex items-center gap-2"><IconChip icon="guia-dte" />Mi ganado</span>
            <Link href="/mi-ganado" className="text-xxs text-accent uppercase tracking-wider hover:text-accent-bright motion-hover -my-2 py-2 pl-3">Administrar →</Link>
          </div>
          <MiGanadoWidget
            inmagSeries={inmagRawSeries.slice(-8)}
            inmagCurrent={inmag.current}
            categories={marketPrices.categories}
            usdBlue={usd.current}
          />
        </section>

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
              <Link href="/mercado/inmag" className="text-accent uppercase tracking-wider hover:text-accent-bright motion-hover -my-2 py-2 pl-3">Análisis →</Link>
            </div>
          }
        />
      </div>

      {/* 3 · REMATES — hoy y esta semana (la agenda operable) */}
      <section className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="font-heading section-heading flex items-center gap-2">
            <IconChip icon="martillo" />
            Remates
            {rematesToday.length > 0 && (
              <Badge tone="live" dot>{rematesToday.length} HOY</Badge>
            )}
          </span>
          <span className="text-xxs text-zinc-500 tabular-nums">{rematesUpcomingAll.length} prog.</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x divide-terminal-border">
          <div className="px-panel py-2">
            <div className="text-xxs text-zinc-500 uppercase tracking-wider px-cell pt-1 pb-2">Hoy</div>
            {rematesToday.map((r) => <RemateRow key={r.id} r={r} isToday />)}
            {rematesToday.length === 0 && (
              <p className="px-cell py-3 text-data text-zinc-500 font-terminal">Sin remates hoy.</p>
            )}
          </div>
          <div className="px-panel py-2 border-t border-terminal-border lg:border-t-0">
            <div className="text-xxs text-zinc-500 uppercase tracking-wider px-cell pt-1 pb-2">Esta semana</div>
            {weekShown.map((r) => <RemateRow key={r.id} r={r} isToday={false} />)}
            {weekShown.length === 0 && (
              <p className="px-cell py-3 text-data text-zinc-500 font-terminal">Sin remates programados esta semana.</p>
            )}
            {weekRest > 0 && (
              <p className="px-cell pt-2 text-xxs text-zinc-500">+{weekRest} más esta semana</p>
            )}
          </div>
        </div>
        <div className="px-panel pb-2">
          <div className="flex items-center justify-between pt-2 border-t border-terminal-border">
            <span className="text-xxs text-zinc-500">{fmt(totalHeadsWeek)} cab. esta semana</span>
            <Link href="/remates" className="text-xxs text-accent uppercase tracking-wider hover:text-accent-bright motion-hover -my-2 py-2 pl-3">Ver todos →</Link>
          </div>
        </div>
      </section>

      {/* 4 · PRECIOS — panel de instrumentos por categoría, glifo grande */}
      <section className="terminal-panel">
        <div className="terminal-panel-header flex items-center justify-between">
          <span className="font-heading section-heading flex items-center gap-2"><IconChip icon="bascula" />Precios $/kg vivo</span>
          <Link href="/mercado" className="text-xxs text-accent uppercase tracking-wider hover:text-accent-bright motion-hover -my-2 py-2 pl-3">Mercado →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y lg:divide-y-0 divide-terminal-border">
          {catRows.map((r) => (
            <Link
              key={r.key}
              href={`/precios/${r.key}`}
              className="group flex flex-col items-center text-center gap-2 px-3 py-4 motion-hover hover:bg-accent/[0.04] active:bg-accent/[0.07]"
            >
              <span className="w-14 h-12 rounded bg-zinc-100 flex items-center justify-center select-none" aria-hidden="true">
                <img src={`/marca/glifos-color/glifo-${r.key.replace(/s$/, "")}.png`} alt="" className="h-9 w-auto" />
              </span>
              <span className="text-xxs text-zinc-400 uppercase tracking-wider group-hover:text-accent motion-hover">{r.name}</span>
              <span className="text-lg text-zinc-100 font-mono tabular-nums leading-none">${fmt(r.current)}</span>
              <Delta change={r.change} className="text-xxs justify-center" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
