import Link from "next/link";
import { Metadata } from "next";
import marketPrices from "@/lib/data/market-prices.json";
import frigorificosSummary from "@/lib/data/frigorificos-summary.json";
import rematesData from "@/lib/data/remates.json";
import { getAllProfiles } from "@/lib/data/consignataria-slugs";
import { FAQPageSchema } from "@/components/seo/JsonLd";

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
const TODAY = new Date().toISOString().slice(0, 10);

const rematesProximos = rematesData.filter(
  (r) => r.date >= TODAY && r.status === "scheduled"
);
const totalHeads = rematesProximos.reduce((s, r) => s + (r.estimatedHeads ?? 0), 0);
const provinciasConFrigo = Object.keys(frigorificosSummary.byProvince).length;
const topProvinces = frigorificosSummary.topProvinces.slice(0, 6);
const totalConsignatarias = getAllProfiles().length;

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

const FAQ_ITEMS = [
  {
    question: "¿Qué es una consignataria de hacienda?",
    answer: "Una consignataria de hacienda es una empresa intermediaria autorizada que organiza remates ganaderos, actuando como nexo entre compradores y vendedores de ganado. En Argentina están reguladas por la Cámara Argentina de Consignatarios de Ganado (CACG) y operan en ferias y remates presenciales o televisados.",
  },
  {
    question: "¿Cómo funciona consignatarias.com.ar?",
    answer: `Recopilamos datos de remates de ${totalConsignatarias}+ consignatarias desde múltiples fuentes (webs, APIs, redes sociales) y los unificamos en un calendario filtrable por provincia, tipo de remate y fecha. Todo se actualiza automáticamente cada día a las 14:00 hora argentina.`,
  },
  {
    question: "¿Cada cuánto se actualizan los datos?",
    answer: "Los datos de remates, precios INMAG, cotización del dólar y maíz se actualizan diariamente de forma automática a las 14:00 ART. Las fuentes incluyen la CACG, sitios de consignatarias individuales, el Mercado Agroganadero y dolarapi.com.",
  },
  {
    question: "¿Qué es el índice INMAG?",
    answer: `El INMAG (Índice Nacional del Mercado Agroganadero) es el indicador de referencia del precio del ganado vacuno en Argentina, expresado en $/kg vivo. Actualmente está en $${fmt(marketPrices.inmag.current)}/kg. En la plataforma mostramos su serie histórica semanal y los precios desglosados por categoría.`,
  },
  {
    question: "¿Cuántas consignatarias hay en Argentina?",
    answer: `Argentina tiene cientos de consignatarias de hacienda registradas. En nuestra plataforma cubrimos ${totalConsignatarias}+ con perfiles dedicados que incluyen calendario anual de remates, historial y datos de contacto. La cobertura abarca 10 provincias ganaderas.`,
  },
  {
    question: "¿Qué tipos de remates ganaderos existen?",
    answer: "Los principales tipos son: remates de invernada (animales para engorde), remates de cría (vientres, toros reproductores), remates generales (múltiples categorías) y remates especiales (exposiciones, cabañas). En la plataforma podés filtrar por cada tipo.",
  },
  {
    question: "¿Cómo verifico el perfil de mi consignataria?",
    answer: "Si sos representante de una consignataria, podés reclamar tu perfil desde la página de tu empresa haciendo clic en \"Reclamar perfil\". Verificamos tu identidad por email y, una vez aprobado, podés editar los datos de contacto, descripción y mantener tu información actualizada con un badge de verificado.",
  },
  {
    question: "¿Qué es un frigorífico?",
    answer: `Un frigorífico es una planta habilitada por SENASA y MAGYP para la faena y procesamiento de carne vacuna. En nuestra base de datos tenemos ${fmt(frigorificosSummary.total)} plantas habilitadas en ${provinciasConFrigo} provincias, con datos de CUIT, matrícula y clasificación por ciclo (Tránsito, Ciclo II, Ciclo III).`,
  },
  {
    question: "¿Consignatarias.com.ar es gratis?",
    answer: "Sí. El acceso al calendario de remates, directorio de consignatarias, base de frigoríficos y precios de mercado es completamente libre y sin registro. Ofrecemos planes PRO para consignatarias que quieran destacar sus remates y acceder a herramientas de gestión avanzadas.",
  },
  {
    question: "¿De dónde obtienen los datos de remates?",
    answer: "Combinamos datos de la API de la CACG (Cámara Argentina de Consignatarios de Ganado), scraping de sitios web de consignatarias individuales como Colombo y Colombo, O'Farrell, Cooperativa Lehmann y Madelan, más carga manual de fuentes no digitalizables. Todo se actualiza cada día.",
  },
];

/* ================================================================== */
/*  METADATA                                                           */
/* ================================================================== */
export const metadata: Metadata = {
  title: "Remates Ganaderos Argentina 2026 | Calendario de Remates | Consignatarias.com.ar",
  description: `Calendario de remates ganaderos de ${totalConsignatarias}+ consignatarias en 10 provincias. ${frigorificosSummary.total} frigoríficos habilitados, precios INMAG y dólar blue actualizados cada día. Acceso libre.`,
};

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
            <img src="/logo.png" alt="Consignatarias.com.ar" width={32} height={32} className="rounded" />
            <span className="text-sm font-medium text-zinc-100 tracking-tight">
              consignatarias.com.ar
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-normal text-zinc-400">
            <a href="#remates" className="hover:text-zinc-100 transition-colors">Remates</a>
            <a href="#frigorificos" className="hover:text-zinc-100 transition-colors">Frigoríficos</a>
            <a href="#mercado" className="hover:text-zinc-100 transition-colors">Mercado</a>
            <Link href="/planes" className="hover:text-zinc-100 transition-colors">Planes</Link>
          </div>

          <Link
            href="/overview"
            className="text-xs font-medium text-zinc-900 bg-zinc-100 hover:bg-white transition-colors rounded py-2 px-4"
          >
            Acceder al Terminal
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
                {rematesProximos.length} remates programados en 10 provincias
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal text-zinc-100 tracking-tight leading-[1.1] mb-6">
              Todos los remates ganaderos de Argentina{" "}
              <span className="text-zinc-500">en una sola pantalla</span>
            </h1>

            <p className="text-lg md:text-xl font-normal text-zinc-400 mb-10 max-w-2xl leading-relaxed">
              Calendario unificado de {totalConsignatarias}+ consignatarias con filtros por provincia, tipo de remate y fecha. Actualizado todos los días con datos de múltiples fuentes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link
                href="/remates"
                className="flex items-center justify-center gap-2 text-sm font-medium text-zinc-900 bg-zinc-100 hover:bg-white transition-all rounded py-3 px-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                Ver próximos remates
                <IconArrowRight />
              </Link>
              <a
                href="#como-funciona"
                className="flex items-center justify-center text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all rounded py-3 px-6"
              >
                Cómo funciona
              </a>
            </div>
          </div>

          {/* Live stats strip */}
          <div className="relative z-10 mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-5">
              <div className="text-[0.65rem] text-zinc-500 uppercase tracking-widest mb-2">INMAG $/kg vivo</div>
              <div className="text-2xl font-medium text-zinc-100 tracking-tight">${fmt(marketPrices.inmag.current)}</div>
              <div className="text-xs text-emerald-400 mt-1">+{fmt(marketPrices.inmag.change, 1)}% vs. semana anterior</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-5">
              <div className="text-[0.65rem] text-zinc-500 uppercase tracking-widest mb-2">Próximos remates</div>
              <div className="text-2xl font-medium text-zinc-100 tracking-tight">{rematesProximos.length}</div>
              <div className="text-xs text-zinc-500 mt-1">~{fmt(totalHeads)} cabezas</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-5">
              <div className="text-[0.65rem] text-zinc-500 uppercase tracking-widest mb-2">Plantas habilitadas</div>
              <div className="text-2xl font-medium text-zinc-100 tracking-tight">{fmt(frigorificosSummary.total)}</div>
              <div className="text-xs text-zinc-500 mt-1">{provinciasConFrigo} provincias</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-5">
              <div className="text-[0.65rem] text-zinc-500 uppercase tracking-widest mb-2">Dolar Blue</div>
              <div className="text-2xl font-medium text-zinc-100 tracking-tight">${fmt(marketPrices.usdBlue.current)}</div>
              <div className="text-xs text-zinc-500 mt-1">+{fmt(marketPrices.usdBlue.change, 1)}% vs. semana anterior</div>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

        {/* ============================================================ */}
        {/*  EL PROBLEMA                                                  */}
        {/* ============================================================ */}
        <section className="max-w-7xl mx-auto px-6 pt-32 pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-medium text-zinc-100 tracking-tight mb-10">
              La información ganadera está fragmentada
            </h2>
            <div className="space-y-6 text-base md:text-lg text-zinc-400 leading-relaxed">
              <p>
                Cada consignataria publica sus remates por separado. Algunas en su web. Otras en Facebook. Muchas sólo por WhatsApp.
              </p>
              <p>
                Para armar tu agenda de remates tenés que revisar decenas de fuentes distintas, y aún así te perdés oportunidades.
              </p>
              <p className="text-zinc-200 font-medium">
                El mercado no tiene un lugar central donde ver que pasa. Hasta ahora.
              </p>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

        {/* ============================================================ */}
        {/*  COMO FUNCIONA                                                */}
        {/* ============================================================ */}
        <section id="como-funciona" className="max-w-7xl mx-auto px-6 pt-32 pb-32">
          <h2 className="text-2xl md:text-3xl font-medium text-zinc-100 tracking-tight text-center mb-16">
            Cómo funciona
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-8 relative">
              <div className="text-5xl font-bold text-zinc-800 absolute top-4 right-6 select-none">1</div>
              <div className="relative z-10">
                <div className="text-xs font-medium text-emerald-400 uppercase tracking-widest mb-3">Recopilamos</div>
                <p className="text-sm md:text-base text-zinc-400 leading-relaxed">
                  Datos de {totalConsignatarias}+ consignatarias, cada día
                </p>
              </div>
            </div>
            {/* Step 2 */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-8 relative">
              <div className="text-5xl font-bold text-zinc-800 absolute top-4 right-6 select-none">2</div>
              <div className="relative z-10">
                <div className="text-xs font-medium text-emerald-400 uppercase tracking-widest mb-3">Estructuramos</div>
                <p className="text-sm md:text-base text-zinc-400 leading-relaxed">
                  Fecha, provincia, tipo, cabezas, links
                </p>
              </div>
            </div>
            {/* Step 3 */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-8 relative">
              <div className="text-5xl font-bold text-zinc-800 absolute top-4 right-6 select-none">3</div>
              <div className="relative z-10">
                <div className="text-xs font-medium text-emerald-400 uppercase tracking-widest mb-3">Vos filtrás</div>
                <p className="text-sm md:text-base text-zinc-400 leading-relaxed">
                  Y tenés todo el mercado en una pantalla
                </p>
              </div>
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
                Un solo calendario. Todas las consignatarias.
              </h2>
              <p className="text-sm md:text-base text-zinc-400 leading-relaxed mb-6">
                No necesitás recorrer 20 sitios web para saber qué remates hay esta semana. Acá están todos: filtrá por provincia, tipo de remate, categoría de hacienda o fecha. Cada remate incluye consignataria, ubicación, cabezas estimadas y links directos a catálogos y transmisiones.
              </p>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Filtros por provincia, tipo y categoría
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Vista por período: hoy, próximos 7 días, pasados
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Links a catálogos y transmisiones en vivo
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Datos de {totalConsignatarias}+ consignatarias de 10 provincias
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/remates" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all rounded py-2.5 px-5">
                  Ver próximos remates <IconArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Preview snippet */}
            <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3 mb-4">
                <span className="text-xs font-medium text-zinc-300 uppercase tracking-widest">Próximos Remates</span>
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
                {fmt(frigorificosSummary.total)} frigoríficos habilitados. Una sola base de datos.
              </h2>
              <p className="text-sm md:text-base text-zinc-400 leading-relaxed mb-6">
                La base completa de plantas frigoríficas habilitadas por MAGYP. Buscá por nombre, filtrá por provincia o etapa habilitada. Con datos oficiales: CUIT, matrícula, razón social y clasificación por ciclo.
              </p>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Datos oficiales MAGYP: CUIT, matrícula, razón social
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Clasificación por etapa: Tránsito ({frigorificosSummary.byStage["1"]}), Ciclo II ({frigorificosSummary.byStage["2"]}), Ciclo III ({frigorificosSummary.byStage["3"]})
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Búsqueda instantánea y ordenamiento por columna
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Distribución por provincia con barras visuales
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/frigorificos" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all rounded py-2.5 px-5">
                  Buscar frigoríficos <IconArrowRight className="w-4 h-4" />
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
                Precios de hacienda y contexto macro. Actualizados.
              </h2>
              <p className="text-sm md:text-base text-zinc-400 leading-relaxed mb-6">
                INMAG promedio, precios por categoría (novillos, terneros, vaquillonas, vacas, toros), maíz en dólares y cotización del dólar blue. Todo con variación semanal para que veas la tendencia, no sólo el número.
              </p>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  INMAG con serie histórica de 8 semanas y variación porcentual
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  6 categorías de hacienda con precio actual, anterior y cambio
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Maíz (USD/tn) y dólar blue como contexto macro
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-zinc-500 mt-2 shrink-0" />
                  Ticker bar en el dashboard con todas las referencias
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/mercado" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all rounded py-2.5 px-5">
                  Ver precios actuales <IconArrowRight className="w-4 h-4" />
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
                  <div className="text-[0.65rem] text-zinc-500 uppercase tracking-widest mb-1">Maíz</div>
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

        <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

        {/* ============================================================ */}
        {/*  COMPARACION                                                  */}
        {/* ============================================================ */}
        <section className="max-w-7xl mx-auto px-6 pt-32 pb-32">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-medium text-zinc-100 tracking-tight text-center mb-16">
              WhatsApp, Facebook y el boca a boca?{" "}
              <span className="text-zinc-500">Hay una forma mejor.</span>
            </h2>

            <div className="bg-[#09090b] border border-zinc-800 rounded-lg overflow-hidden shadow-2xl">
              {/* Table header */}
              <div className="grid grid-cols-2 border-b border-zinc-800">
                <div className="px-6 py-4 text-xs font-medium text-red-400/80 uppercase tracking-widest">
                  Antes
                </div>
                <div className="px-6 py-4 text-xs font-medium text-emerald-400/80 uppercase tracking-widest border-l border-zinc-800">
                  Con Consignatarias.com.ar
                </div>
              </div>

              {/* Table rows */}
              {[
                ["Flyers sueltos en WhatsApp", "Calendario unificado y filtrable"],
                ["Revisar 20 sitios web", "Una sola pantalla"],
                ["Información incompleta o desactualizada", "Datos actualizados automáticamente cada día"],
                [`No sabés qué te perdiste`, `Cobertura de 10 provincias, ${totalConsignatarias}+ consignatarias`],
                ["Sin historial ni búsqueda", "Base de datos buscable y estructurada"],
                ["Precios dispersos en distintas fuentes", "INMAG, categorías y macro en un solo panel"],
              ].map(([antes, despues], i, arr) => (
                <div
                  key={i}
                  className={`grid grid-cols-2 ${
                    i < arr.length - 1 ? "border-b border-zinc-800/50" : ""
                  }`}
                >
                  <div className="px-6 py-4 text-sm text-zinc-500">
                    {antes}
                  </div>
                  <div className="px-6 py-4 text-sm text-zinc-300 border-l border-zinc-800">
                    {despues}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

        {/* ============================================================ */}
        {/*  FAQ                                                          */}
        {/* ============================================================ */}
        <section id="faq" className="max-w-4xl mx-auto px-6 pt-32 pb-32">
          <h2 className="text-2xl md:text-3xl font-medium text-zinc-100 tracking-tight text-center mb-16">
            Preguntas frecuentes
          </h2>
          <FAQPageSchema items={FAQ_ITEMS} />
          <div className="space-y-0">
            {FAQ_ITEMS.map((item, i) => (
              <details
                key={i}
                className={`group bg-zinc-900/40 border border-zinc-800 ${i === 0 ? 'rounded-t-lg' : ''} ${i === FAQ_ITEMS.length - 1 ? 'rounded-b-lg' : ''} ${i > 0 ? '-mt-px' : ''}`}
              >
                <summary className="flex items-center justify-between cursor-pointer px-6 py-4 text-sm text-zinc-200 hover:text-zinc-100 transition-colors list-none [&::-webkit-details-marker]:hidden">
                  <span className="pr-4">{item.question}</span>
                  <span className="text-zinc-600 group-open:rotate-45 transition-transform text-lg shrink-0">+</span>
                </summary>
                <div className="px-6 pb-4 text-xs text-zinc-400 leading-relaxed font-mono">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/*  CTA FINAL                                                   */}
        {/* ============================================================ */}
        <section className="max-w-3xl mx-auto px-6 pb-32">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-8 md:p-12 relative overflow-hidden text-center">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-400 to-transparent opacity-20" />

            <h2 className="text-2xl font-medium text-zinc-100 tracking-tight mb-3">
              El mercado ganadero, en una sola pantalla
            </h2>
            <p className="text-sm text-zinc-400 mb-8 max-w-lg mx-auto">
              {rematesProximos.length} remates de {totalConsignatarias}+ consignatarias. {fmt(frigorificosSummary.total)} frigoríficos habilitados. Precios de 6 categorías y referencias macro. Acceso libre. Sin registro. Actualizado todos los días.
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
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Consignatarias.com.ar" width={24} height={24} className="rounded opacity-60" />
                <span className="text-xs font-medium text-zinc-500 tracking-tight">
                  consignatarias.com.ar &copy; 2026
                </span>
              </div>

              <div className="flex items-center gap-6 text-xs text-zinc-600">
                <Link href="/overview" className="hover:text-zinc-300 transition-colors">Terminal</Link>
                <Link href="/remates" className="hover:text-zinc-300 transition-colors">Remates</Link>
                <Link href="/consignatarias" className="hover:text-zinc-300 transition-colors">Directorio</Link>
                <Link href="/frigorificos" className="hover:text-zinc-300 transition-colors">Frigoríficos</Link>
                <Link href="/mercado" className="hover:text-zinc-300 transition-colors">Mercado</Link>
              </div>

              <div className="text-[0.65rem] text-zinc-600 uppercase tracking-widest">
                Datos actualizados diariamente
              </div>
            </div>

            <div className="border-t border-zinc-800/50 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-6 text-xs text-zinc-600">
                <Link href="/planes" className="hover:text-zinc-300 transition-colors">Planes</Link>
                <Link href="/glosario" className="hover:text-zinc-300 transition-colors">Glosario</Link>
                <Link href="/calidad" className="hover:text-zinc-300 transition-colors">Calidad de datos</Link>
                <Link href="/quienes-somos" className="hover:text-zinc-300 transition-colors">Quiénes somos</Link>
              </div>
              <span className="text-xs text-zinc-700">agro@memola.com.ar</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
