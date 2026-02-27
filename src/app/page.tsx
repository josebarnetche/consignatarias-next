import Link from "next/link";
import marketPrices from "@/lib/data/market-prices.json";
import frigorificosSummary from "@/lib/data/frigorificos-summary.json";
import rematesData from "@/lib/data/remates.json";

/* ================================================================== */
/*  SVG ICONS                                                          */
/* ================================================================== */
function IconLayers({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function IconArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function IconCalendar({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconBuilding({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <line x1="8" y1="6" x2="8" y2="6.01" />
      <line x1="12" y1="6" x2="12" y2="6.01" />
      <line x1="16" y1="6" x2="16" y2="6.01" />
      <line x1="8" y1="10" x2="8" y2="10.01" />
      <line x1="12" y1="10" x2="12" y2="10.01" />
      <line x1="16" y1="10" x2="16" y2="10.01" />
      <line x1="8" y1="14" x2="8" y2="14.01" />
      <line x1="12" y1="14" x2="12" y2="14.01" />
      <line x1="16" y1="14" x2="16" y2="14.01" />
    </svg>
  );
}

function IconTrending({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

/* ================================================================== */
/*  DATA                                                               */
/* ================================================================== */
const TODAY = "2026-02-26";

const rematesProximos = rematesData.filter(
  (r) => r.date >= TODAY && r.status === "scheduled"
);
const totalHeads = rematesProximos.reduce((s, r) => s + (r.estimatedHeads ?? 0), 0);
const provinciasConFrigo = Object.keys(frigorificosSummary.byProvince).length;
const topProvinces = frigorificosSummary.topProvinces.slice(0, 6);

const cats = marketPrices.categories;
const catEntries = Object.entries(cats) as [
  string,
  { current: number; prev: number; change: number }
][];

const categoryLabels: Record<string, string> = {
  novillos: "Novillos",
  novillitos: "Novillitos",
  vaquillonas: "Vaquillonas",
  vacas: "Vacas",
  toros: "Toros",
  terneros: "Terneros",
};

function fmt(n: number, d = 0) {
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */
export default function LandingPage() {
  return (
    <div className="font-sans text-zinc-300 selection:bg-zinc-800 selection:text-zinc-100">
      {/* ============================================================ */}
      {/*  NAVBAR                                                       */}
      {/* ============================================================ */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
              <IconLayers />
            </div>
            <span className="text-sm font-medium text-zinc-100 tracking-tight">
              consignatarias.com.ar
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-normal text-zinc-400">
            <a href="#remates" className="hover:text-zinc-100 transition-colors">Remates</a>
            <a href="#frigorificos" className="hover:text-zinc-100 transition-colors">Frigorificos</a>
            <a href="#mercado" className="hover:text-zinc-100 transition-colors">Mercado</a>
          </div>

          <Link
            href="/overview"
            className="text-xs font-medium text-zinc-900 bg-zinc-100 hover:bg-white transition-colors rounded py-2 px-4"
          >
            Ingresar
          </Link>
        </div>
      </nav>

      <main className="pt-24 pb-24 overflow-hidden">
        {/* ============================================================ */}
        {/*  HERO                                                        */}
        {/* ============================================================ */}
        <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-32">
          {/* Background Grid */}
          <div
            className="absolute inset-0 z-0 pointer-events-none opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/80 to-[#09090b]" />
          </div>

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/50 py-1 px-3 mb-8 shadow-sm backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
              <span className="text-xs font-medium text-zinc-300 uppercase tracking-widest">
                {rematesProximos.length} remates programados
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal text-zinc-100 tracking-tight leading-[1.1] mb-6">
              Remates, frigorificos y precios del{" "}
              <span className="text-zinc-500">mercado ganadero argentino</span>{" "}
              en un solo lugar
            </h1>

            <p className="text-lg md:text-xl font-normal text-zinc-400 mb-10 max-w-2xl leading-relaxed">
              Calendario unificado de remates de multiples consignatarias, directorio de {fmt(frigorificosSummary.total)} plantas frigorificas habilitadas por MAGYP, y seguimiento de precios INMAG, categorias y macro.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link
                href="/overview"
                className="flex items-center justify-center gap-2 text-sm font-medium text-zinc-900 bg-zinc-100 hover:bg-white transition-all rounded py-3 px-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                Acceder al Terminal
                <IconArrowRight />
              </Link>
              <a
                href="#remates"
                className="flex items-center justify-center text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all rounded py-3 px-6"
              >
                Ver que incluye
              </a>
            </div>
          </div>

          {/* Live stats strip */}
          <div className="relative z-10 mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-5">
              <div className="text-[0.65rem] text-zinc-500 uppercase tracking-widest mb-2">INMAG Actual</div>
              <div className="text-2xl font-medium text-zinc-100 tracking-tight">${fmt(marketPrices.inmag.current)}</div>
              <div className="text-xs text-emerald-400 mt-1">+{fmt(marketPrices.inmag.change, 1)}% semanal</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-5">
              <div className="text-[0.65rem] text-zinc-500 uppercase tracking-widest mb-2">Remates Proximos</div>
              <div className="text-2xl font-medium text-zinc-100 tracking-tight">{rematesProximos.length}</div>
              <div className="text-xs text-zinc-500 mt-1">~{fmt(totalHeads)} cabezas</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-5">
              <div className="text-[0.65rem] text-zinc-500 uppercase tracking-widest mb-2">Frigorificos</div>
              <div className="text-2xl font-medium text-zinc-100 tracking-tight">{fmt(frigorificosSummary.total)}</div>
              <div className="text-xs text-zinc-500 mt-1">{provinciasConFrigo} provincias</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-5">
              <div className="text-[0.65rem] text-zinc-500 uppercase tracking-widest mb-2">USD Blue</div>
              <div className="text-2xl font-medium text-zinc-100 tracking-tight">${fmt(marketPrices.usdBlue.current)}</div>
              <div className="text-xs text-zinc-500 mt-1">+{fmt(marketPrices.usdBlue.change, 1)}%</div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

        {/* ============================================================ */}
        {/*  FEATURE 1: REMATES                                          */}
        {/* ============================================================ */}
        <section id="remates" className="max-w-7xl mx-auto px-6 pt-32 pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <div className="w-10 h-10 rounded border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-300 mb-6">
                <IconCalendar />
              </div>
              <h2 className="text-2xl md:text-3xl font-medium text-zinc-100 tracking-tight mb-4">
                Calendario de remates unificado
              </h2>
              <p className="text-sm md:text-base text-zinc-400 leading-relaxed mb-6">
                Todos los remates de multiples consignatarias en un solo feed cronologico. Filtra por provincia, tipo de remate, categoria de hacienda y fecha. Deja de recorrer 20 sitios web distintos para armar tu agenda.
              </p>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Filtros por provincia, tipo (invernada, cria, general) y categoria
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Vista por periodo: hoy, proximos 7 dias, pasados
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Links directos a catalogos y transmisiones en vivo
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Cabezas estimadas, consignataria y ubicacion por remate
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/remates" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all rounded py-2.5 px-5">
                  Ver remates <IconArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Preview snippet */}
            <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3 mb-4">
                <span className="text-xs font-medium text-zinc-300 uppercase tracking-widest">Proximos Remates</span>
                <span className="text-[0.65rem] text-zinc-500">{rematesProximos.length} programados</span>
              </div>
              <div className="space-y-0">
                {rematesProximos.slice(0, 5).map((r, i) => (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between py-3 ${
                      i < 4 ? "border-b border-zinc-800/50" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-zinc-200 truncate">{r.consignatariaName}</div>
                      <div className="text-[0.65rem] text-zinc-500">
                        {r.date.slice(5).replace("-", "/")}{r.time ? ` · ${r.time}` : ''} &middot; {r.location}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-[0.65rem] text-zinc-400 font-mono bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 uppercase">
                        {r.type}
                      </span>
                      {r.estimatedHeads != null && (
                        <span className="text-xs text-zinc-300 font-mono">{r.estimatedHeads} cab</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

        {/* ============================================================ */}
        {/*  FEATURE 2: FRIGORIFICOS                                     */}
        {/* ============================================================ */}
        <section id="frigorificos" className="max-w-7xl mx-auto px-6 pt-32 pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Preview snippet (left this time) */}
            <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-5 shadow-2xl order-2 lg:order-1">
              <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3 mb-4">
                <span className="text-xs font-medium text-zinc-300 uppercase tracking-widest">Plantas por Provincia</span>
                <span className="text-[0.65rem] text-zinc-500">{fmt(frigorificosSummary.total)} total</span>
              </div>
              <div className="space-y-3">
                {topProvinces.map((p) => (
                  <div key={p.province}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-zinc-400">{p.province}</span>
                      <span className="text-zinc-300 font-mono">{p.count} plantas</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-300 rounded-full"
                        style={{ width: `${(p.count / topProvinces[0].count) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-800/50 flex justify-between text-[0.65rem] text-zinc-500">
                <span>Fuente: MAGYP</span>
                <span>{provinciasConFrigo} provincias registradas</span>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="w-10 h-10 rounded border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-300 mb-6">
                <IconBuilding />
              </div>
              <h2 className="text-2xl md:text-3xl font-medium text-zinc-100 tracking-tight mb-4">
                Directorio de {fmt(frigorificosSummary.total)} plantas frigorificas
              </h2>
              <p className="text-sm md:text-base text-zinc-400 leading-relaxed mb-6">
                Base de datos completa de plantas habilitadas por MAGYP. Busca por nombre, filtra por provincia o etapa habilitada. Visualiza la distribucion geografica de la capacidad instalada de faena del pais.
              </p>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Datos oficiales MAGYP: CUIT, matricula, razon social
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Clasificacion por etapa: Transito ({frigorificosSummary.byStage["1"]}), Ciclo II ({frigorificosSummary.byStage["2"]}), Ciclo III ({frigorificosSummary.byStage["3"]})
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Busqueda instantanea y ordenamiento por columna
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Desglose grafico por provincia con barras ASCII
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/frigorificos" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all rounded py-2.5 px-5">
                  Ver directorio <IconArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

        {/* ============================================================ */}
        {/*  FEATURE 3: MERCADO                                          */}
        {/* ============================================================ */}
        <section id="mercado" className="max-w-7xl mx-auto px-6 pt-32 pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <div className="w-10 h-10 rounded border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-300 mb-6">
                <IconTrending />
              </div>
              <h2 className="text-2xl md:text-3xl font-medium text-zinc-100 tracking-tight mb-4">
                Precios de mercado y referencias macro
              </h2>
              <p className="text-sm md:text-base text-zinc-400 leading-relaxed mb-6">
                INMAG promedio, precios por categoria de hacienda (novillos, terneros, vaquillonas, vacas, toros), referencia de maiz en dolares y cotizacion del dolar blue. Todo actualizado y con tendencia semanal.
              </p>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  INMAG con serie historica de 8 semanas y variacion porcentual
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  6 categorias de hacienda con precio actual, anterior y cambio
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Maiz (USD/tn) y dolar blue como contexto macro
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Ticker bar en el dashboard con todas las referencias
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/mercado" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all rounded py-2.5 px-5">
                  Ver mercado <IconArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Preview: prices table */}
            <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3 mb-4">
                <span className="text-xs font-medium text-zinc-300 uppercase tracking-widest">Precios $/kg vivo</span>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
                  <span className="text-[0.65rem] text-zinc-500">Actualizado</span>
                </div>
              </div>

              {/* INMAG hero */}
              <div className="flex items-baseline gap-3 mb-5">
                <div>
                  <div className="text-[0.65rem] text-zinc-500 uppercase tracking-widest mb-1">INMAG Promedio</div>
                  <div className="text-3xl font-medium text-zinc-100 tracking-tight leading-none">
                    ${fmt(marketPrices.inmag.current)}
                  </div>
                </div>
                <div className="text-sm text-emerald-400 font-mono">
                  +{fmt(marketPrices.inmag.change, 1)}%
                </div>
              </div>

              {/* Category table */}
              <div className="space-y-0">
                {catEntries.map(([key, val], i) => (
                  <div
                    key={key}
                    className={`flex items-center justify-between py-2.5 ${
                      i < catEntries.length - 1 ? "border-b border-zinc-800/50" : ""
                    }`}
                  >
                    <span className="text-xs text-zinc-400">{categoryLabels[key] || key}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-zinc-200 font-mono">${fmt(val.current)}</span>
                      <span className={`text-xs font-mono ${val.change > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {val.change > 0 ? "+" : ""}{fmt(val.change, 1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/50 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[0.65rem] text-zinc-500 uppercase tracking-widest mb-1">Maiz</div>
                  <div className="text-sm text-zinc-200 font-mono">{fmt(marketPrices.corn.current, 1)} USD/tn</div>
                </div>
                <div>
                  <div className="text-[0.65rem] text-zinc-500 uppercase tracking-widest mb-1">USD Blue</div>
                  <div className="text-sm text-zinc-200 font-mono">${fmt(marketPrices.usdBlue.current)}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  CTA FINAL                                                   */}
        {/* ============================================================ */}
        <section className="max-w-3xl mx-auto px-6 pb-32">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-8 md:p-12 relative overflow-hidden text-center">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-400 to-transparent opacity-20" />

            <h2 className="text-2xl font-medium text-zinc-100 tracking-tight mb-3">
              Toda la informacion, una sola interfaz
            </h2>
            <p className="text-sm text-zinc-400 mb-8 max-w-lg mx-auto">
              Remates de {rematesData.length} fuentes, {fmt(frigorificosSummary.total)} frigorificos, precios de 6 categorias, y referencias macro. Acceso libre, sin registro.
            </p>
            <Link
              href="/overview"
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-zinc-900 bg-zinc-100 hover:bg-white transition-all rounded py-3.5 px-8 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              Acceder al Terminal
              <IconArrowRight />
            </Link>
          </div>
        </section>
      </main>

      {/* ============================================================ */}
      {/*  FOOTER                                                       */}
      {/* ============================================================ */}
      <footer className="border-t border-zinc-800 bg-[#09090b]">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                <IconLayers className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium text-zinc-500 tracking-tight">
                consignatarias.com.ar &copy; 2026
              </span>
            </div>

            <div className="flex items-center gap-6 text-xs text-zinc-600">
              <Link href="/overview" className="hover:text-zinc-300 transition-colors">Terminal</Link>
              <Link href="/remates" className="hover:text-zinc-300 transition-colors">Remates</Link>
              <Link href="/frigorificos" className="hover:text-zinc-300 transition-colors">Frigorificos</Link>
              <Link href="/mercado" className="hover:text-zinc-300 transition-colors">Mercado</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
