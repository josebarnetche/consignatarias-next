import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import marketPrices from "@/lib/data/market-prices.json";
import frigorificosSummary from "@/lib/data/frigorificos-summary.json";
import rematesData from "@/lib/data/remates.json";
import { getAllProfiles } from "@/lib/data/consignataria-slugs";
import { resolveYoutubeUrl } from "@/lib/youtube-live";
import { getLogoUrl, getBrandColor, getBrandKeepColor } from "@/lib/data/logo-map";
import ConsignatariasShowcase from "@/components/landing/ConsignatariasShowcase";
import { FAQPageSchema, OrganizationSchema, WebSiteSchema } from "@/components/seo/JsonLd";
import NewsletterSignup from "@/components/NewsletterSignup";
import ValuationWidget from "@/components/landing/ValuationWidget";
import MarketTape, { type TapeItem } from "@/components/landing/MarketTape";
import { fetchUsdBlue } from "@/lib/markets/usd";
import LiveHero from "@/components/landing/LiveHero";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { CoverageMap } from "@/components/landing/CoverageMap";

/* ================================================================== */
/*  SVG ICONS                                                          */
/* ================================================================== */
function IconArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
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
const totalConsignatarias = getAllProfiles().length;

/* --- Regional grid: top consignatarios by upcoming-remate count, bucketed by region.
   Region is inferred from the most-frequent province for that consignataria's
   upcoming remates. Provinces map to broad regions per the cattle-industry
   convention (NEA, NOA, Pampa Húmeda, Mesopotamia, Patagonia, Cuyo, Centro). */
const PROVINCE_TO_REGION: Record<string, string> = {
  'CHACO': 'NEA', 'FORMOSA': 'NEA', 'MISIONES': 'NEA', 'CORRIENTES': 'NEA',
  'JUJUY': 'NOA', 'SALTA': 'NOA', 'TUCUMAN': 'NOA', 'CATAMARCA': 'NOA',
  'SANTIAGO DEL ESTERO': 'NOA', 'LA RIOJA': 'NOA',
  'BUENOS AIRES': 'Pampa Húmeda', 'LA PAMPA': 'Pampa Húmeda',
  'ENTRE RIOS': 'Mesopotamia',
  'CORDOBA': 'Centro', 'SANTA FE': 'Centro',
  'SAN LUIS': 'Cuyo', 'MENDOZA': 'Cuyo', 'SAN JUAN': 'Cuyo',
  'NEUQUEN': 'Patagonia', 'RIO NEGRO': 'Patagonia', 'CHUBUT': 'Patagonia',
  'SANTA CRUZ': 'Patagonia', 'TIERRA DEL FUEGO': 'Patagonia',
}
type ConsigCard = { slug: string; name: string; province: string; region: string; upcoming: number; total: number }
const consigsByCanonical = new Map<string, { name: string; upcoming: number; total: number; provinceCounts: Record<string, number> }>()
for (const p of getAllProfiles()) {
  consigsByCanonical.set(p.canonicalSlug, { name: p.displayName, upcoming: 0, total: 0, provinceCounts: {} })
}
for (const r of rematesData) {
  // We need to resolve to canonical, but getAllProfiles + the existing canonical map cover that.
  // The remate's consignatariaSlug may be a variant — resolve via PROFILES.allSlugs.
  for (const p of getAllProfiles()) {
    if (p.allSlugs.includes(r.consignatariaSlug)) {
      const c = consigsByCanonical.get(p.canonicalSlug)
      if (c) {
        c.total++
        if (r.date >= TODAY) c.upcoming++
        const prov = r.province || ''
        if (prov) c.provinceCounts[prov] = (c.provinceCounts[prov] || 0) + 1
      }
      break
    }
  }
}
const consigCards: ConsigCard[] = []
for (const [slug, c] of consigsByCanonical) {
  if (c.total === 0) continue
  const topProvince = Object.entries(c.provinceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
  const region = PROVINCE_TO_REGION[topProvince] ?? 'Otra'
  consigCards.push({ slug, name: c.name, province: topProvince, region, upcoming: c.upcoming, total: c.total })
}

// Per-province remate counts for the coverage map — only provinces with a /remates/[slug] page.
const COVERAGE_PROVINCE_SLUGS: Record<string, string> = {
  'BUENOS AIRES': 'buenos-aires', 'ENTRE RIOS': 'entre-rios', 'SANTA FE': 'santa-fe',
  'CORDOBA': 'cordoba', 'CORRIENTES': 'corrientes', 'SAN LUIS': 'san-luis',
  'LA PAMPA': 'la-pampa', 'CHACO': 'chaco', 'MISIONES': 'misiones',
  'FORMOSA': 'formosa', 'SANTIAGO DEL ESTERO': 'santiago-del-estero',
}
const provinceRemateCounts: Record<string, number> = {}
for (const r of rematesData) {
  const slug = COVERAGE_PROVINCE_SLUGS[r.province || '']
  if (slug) provinceRemateCounts[slug] = (provinceRemateCounts[slug] || 0) + 1
}

// Active consignatarias for the landing showcase grid: those with a remate in
// the last 60 days (past or upcoming), sorted by activity. Excludes zombies.
const CUTOFF_60D = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10)
const activeConsignatarias = consigCards
  .map(c => {
    const slugs = new Set(getAllProfiles().find(p => p.canonicalSlug === c.slug)?.allSlugs ?? [])
    const count = rematesData.filter(r => r.date >= CUTOFF_60D && slugs.has(r.consignatariaSlug)).length
    return { slug: c.slug, name: c.name, count }
  })
  .filter(c => c.count > 0)
  .sort((a, b) => b.count - a.count)

// En Vivo: remates con transmisión resolvible — video directo (confirmada) o
// canal habitual de la consignataria (estimada). Mismo criterio que /remates/en-vivo,
// donde antes la home solo contaba youtubeUrl directo y daba casi siempre 0.
const rematesEnVivo = rematesProximos
  .map((r) => {
    const resolved = resolveYoutubeUrl(r);
    return resolved ? { remate: r, confidence: resolved.confidence } : null;
  })
  .filter((x): x is { remate: (typeof rematesProximos)[number]; confidence: "confirmed" | "probable" } => x !== null);
const enVivoCount = rematesEnVivo.length;
const enVivoConfirmed = rematesEnVivo.filter((x) => x.confidence === "confirmed").length;

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
// Regenerate every hour so TODAY stays fresh
export const revalidate = 900 // ISR 15 min — la cinta (USD blue en vivo) se refresca entre rebuilds

export const metadata: Metadata = {
  // Lead with the site's strongest branded query "consignatarias" (12-17% CTR at pos 3.3,
  // previously buried as the domain at the title's end), then remates + precios. Description
  // injects the live INMAG price as a freshness hook. v1.40 CTR pass.
  title: "Consignatarias de Hacienda Argentina | Remates y Precios",
  description: `Directorio de ${totalConsignatarias}+ consignatarias de hacienda y calendario de ${rematesProximos.length} remates ganaderos. Precios INMAG ($${fmt(marketPrices.inmag.current)}/kg) actualizados hoy. Acceso libre.`,
  alternates: {
    canonical: 'https://www.consignatarias.com.ar',
  },
};

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */
export default async function LandingPage() {
  // USD blue en vivo — descongela la cinta y activa el DeltaFlash real. Falla
  // suave: si el fetch devuelve null, usamos el cierre del build (soft-fail).
  const usd = await fetchUsdBlue(marketPrices.usdBlue.current);
  // Hybrid logo/name tiles. Logos come from the local LOGO_MAP (favicons of the
  // most active firms — not clients). Tiles with a logo are sorted first so the
  // grid leads with recognizable brand marks.
  // Brand wall = firms active in the last 60 days + a few featured ones, all
  // with a real logo. WALL_FEATURED forces a consignataria onto the wall even
  // if it has no recent remates (e.g. just added, awaiting its next auction).
  const WALL_FEATURED = ['hk-agro']
  const activeSlugs = new Set(activeConsignatarias.map(c => c.slug))
  const featured = WALL_FEATURED
    .filter(s => !activeSlugs.has(s))
    .map(s => ({ slug: s, name: getAllProfiles().find(p => p.canonicalSlug === s)?.displayName ?? s }))
  const showcaseItems = [...activeConsignatarias, ...featured]
    .map(c => ({ slug: c.slug, name: c.name, logoUrl: getLogoUrl(c.slug), brandColor: getBrandColor(c.slug), keepColor: getBrandKeepColor(c.slug) }))
    .filter(c => c.logoUrl && c.brandColor)

  // Cinta de mercado en vivo (data real). Categorías + INMAG + USD + actividad.
  const catLabel: Record<string, string> = { novillos: 'Novillo', novillitos: 'Novillito', vaquillonas: 'Vaquillona', vacas: 'Vaca', terneros: 'Ternero', toros: 'Toro' }
  const catMap = marketPrices.categories as Record<string, { current: number; change: number }>
  const catItems: TapeItem[] = (['novillos', 'vacas', 'vaquillonas', 'terneros'] as const)
    .filter((k) => catMap[k])
    .map((k) => ({ label: catLabel[k], value: `$${fmt(catMap[k].current)}`, change: catMap[k].change, href: '/precios' }))
  const tapeItems: TapeItem[] = [
    { label: 'INMAG', value: `$${fmt(marketPrices.inmag.current)}/kg`, change: marketPrices.inmag.change, href: '/mercado/inmag' },
    ...catItems,
    usd
      ? { label: 'USD blue', value: `$${fmt(usd.venta)}`, change: usd.change, href: '/mercado' }
      : { label: 'USD blue', value: `$${fmt(marketPrices.usdBlue.current)}`, change: marketPrices.usdBlue.change, href: '/mercado' },
    { label: 'Remates', value: `${rematesProximos.length}`, change: null, href: '/remates' },
    ...(enVivoCount > 0 ? [{ label: 'En vivo', value: `${enVivoCount}`, change: null, live: true, href: '/remates/en-vivo' } as TapeItem] : []),
    { label: 'Plantas SENASA', value: `${fmt(frigorificosSummary.total)}`, change: null, href: '/frigorificos' },
  ]
  const dateLabel = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })

  return (
    <div className="font-sans text-zinc-300 selection:bg-zinc-800 selection:text-zinc-100">
      {/* SEO Structured Data */}
      <OrganizationSchema />
      <WebSiteSchema />
      {/* ============================================================ */}
      {/*  NAVBAR                                                       */}
      {/* ============================================================ */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/icon-32.png" alt="Consignatarias.com.ar" width={32} height={32} className="rounded" />
            <span className="text-sm font-medium text-zinc-100 tracking-tight">
              consignatarias.com.ar
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-normal text-zinc-400">
            <a href="#remates" className="hover:text-zinc-100 transition-colors">Remates</a>
            <Link href="/remates/en-vivo" className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              En Vivo
              {enVivoCount > 0 && <span className="text-xs text-red-500">({enVivoCount})</span>}
            </Link>
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

      <main className="pt-16 pb-24 overflow-hidden">
        {/* Cinta de mercado en vivo — latido de la página */}
        <MarketTape items={tapeItems} />
        {/* Reveal-on-scroll a todas las secciones (sin tocar su markup) */}
        <ScrollReveal />

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

          <LiveHero
            consignatarias={totalConsignatarias}
            remates={rematesProximos.length}
            enVivo={enVivoCount}
            enVivoConfirmed={enVivoConfirmed}
            heads={totalHeads}
            inmag={marketPrices.inmag.current}
            inmagChange={marketPrices.inmag.change}
            usdBlue={marketPrices.usdBlue.current}
            frigorificos={frigorificosSummary.total}
            provincias={13}
            dateLabel={dateLabel}
          />

          {/* Cobertura — mapa estilizado por provincia (reemplaza la grilla de texto). */}
          <div className="relative z-10 mt-20">
            <div className="mb-6">
              <div className="text-[0.65rem] text-zinc-500 uppercase tracking-widest mb-1">
                Dónde cubrimos
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-normal text-zinc-100 tracking-tight leading-tight">
                Remates en <span className="text-amber-400">cada provincia</span>.
              </h2>
            </div>
            <CoverageMap counts={provinceRemateCounts} />
          </div>

          {/* Conversion block — shown after value proofs */}
          <div className="relative z-10 mt-20 rounded-lg border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-zinc-900/60 to-zinc-900/60 p-8 md:p-10 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 text-[0.65rem] text-amber-400/80 uppercase tracking-widest mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Para consignatarias y martilleros
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-normal text-zinc-100 tracking-tight leading-tight mb-3">
                  ¿Querés estar acá?
                </h2>
                <p className="text-base md:text-lg text-zinc-400 leading-relaxed">
                  Sumá tu consignataria al directorio más visitado del mercado ganadero argentino. Reservá una reunión y te mostramos cómo.
                </p>
              </div>
              <a
                href="https://calendar.app.google/gr2BXY1ooDMki8TK7"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center justify-center gap-3 text-base md:text-lg font-medium text-black bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:via-amber-300 hover:to-amber-400 transition-all rounded-md py-5 px-10 shadow-[0_0_40px_rgba(251,191,36,0.35)] hover:shadow-[0_0_60px_rgba(251,191,36,0.55)] whitespace-nowrap shrink-0"
              >
                <span className="w-2 h-2 rounded-full bg-black/70 animate-pulse" />
                Reservar reunión
                <IconArrowRight />
              </a>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  VALUATION WIDGET — Aha Moment                                */}
        {/* ============================================================ */}
        <section className="max-w-4xl mx-auto px-6 py-12">
          <ValuationWidget />
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
        {/*  CONSIGNATARIAS SHOWCASE — wall of active consignatarias      */}
        {/* ============================================================ */}
        <ConsignatariasShowcase items={showcaseItems} />

        {/* ============================================================ */}
        {/*  EL CORREDOR — LEAD MAGNET                                    */}
        {/* ============================================================ */}
        <section id="el-corredor" className="max-w-7xl mx-auto px-6 pt-24 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-sky-400/40 animate-ping" />
                  <span className="relative rounded-full h-2 w-2 bg-sky-400" />
                </span>
                <span className="text-xs font-mono uppercase tracking-[0.18em] text-sky-400 font-semibold">
                  Mesa de hacienda · cierre mensual
                </span>
              </div>

              <h2 className="font-mono font-bold uppercase tracking-tight text-white text-4xl md:text-5xl leading-[0.95] mb-5">
                El Corredor
              </h2>

              <p className="text-base md:text-lg text-zinc-300 leading-relaxed mb-6 font-mono max-w-2xl">
                El cierre mensual del mercado bovino argentino. <span className="text-white">12 páginas</span> con
                INMAG en USD reales, comparable interanual, 18 categorías de hacienda del MAG, lectura del ciclo y tesis del
                mes próximo. <span className="text-sky-400">PDF gratuito con email.</span>
              </p>

              <ul className="space-y-2.5 text-sm font-mono text-zinc-400 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-sky-400 font-mono">→</span>
                  INMAG diario + comparable interanual real en USD oficial y blue
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-sky-400 font-mono">→</span>
                  Las 18 subcategorías del MAG con min / máx / promedio / mediana
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-sky-400 font-mono">→</span>
                  Tesis del mes próximo con escenarios y reglas operativas por perfil
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-sky-400 font-mono">→</span>
                  Bibliografía citada (FAUBA, CACG, UNS) y metodología abierta
                </li>
              </ul>

              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="/el-corredor?ref=homepage"
                  className="inline-flex items-center gap-2 bg-sky-400 hover:bg-sky-300 active:bg-sky-500 text-zinc-950 font-mono font-bold uppercase tracking-widest text-sm px-6 py-3 rounded transition-colors"
                >
                  Recibir Edición 05/26 →
                </a>
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                  Sin tarjeta · próxima edición en julio
                </span>
              </div>
            </div>

            <div className="relative justify-self-center lg:justify-self-end">
              <div className="absolute -inset-8 bg-sky-500/10 blur-3xl rounded-full pointer-events-none" />
              <a href="/el-corredor?ref=homepage" className="relative block">
                <Image
                  src="/el-corredor/cover-mayo-2026.png"
                  alt="El Corredor — Mayo 2026"
                  width={320}
                  height={427}
                  className="w-full max-w-[320px] h-auto rounded shadow-2xl shadow-black/50 border border-zinc-800 hover:border-sky-500/40 transition-colors"
                />
                <div className="absolute -bottom-3 left-4 right-4 text-center pointer-events-none">
                  <span className="inline-block bg-sky-400 text-zinc-950 text-xs font-mono uppercase tracking-widest px-3 py-1.5 font-bold rounded">
                    Edición 05/26 · Disponible
                  </span>
                </div>
              </a>
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
                  <span className="text-zinc-500 group-open:rotate-45 transition-transform text-lg shrink-0">+</span>
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

        {/* ============================================================ */}
        {/*  NEWSLETTER                                                  */}
        {/* ============================================================ */}
        <section className="max-w-3xl mx-auto px-6 pb-16">
          <div className="border-t border-zinc-800 pt-12 text-center">
            <h3 className="text-lg font-medium text-zinc-200 mb-2">
              Recibí las novedades del mercado ganadero
            </h3>
            <p className="text-sm text-zinc-500 mb-6">
              Resumen semanal de remates, precios y tendencias. Sin spam.
            </p>
            <div className="flex justify-center relative">
              <NewsletterSignup />
            </div>
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
                <Image src="/icon-32.png" alt="Consignatarias.com.ar" width={24} height={24} className="rounded opacity-60" />
                <span className="text-xs font-medium text-zinc-500 tracking-tight">
                  consignatarias.com.ar &copy; 2026
                </span>
              </div>

              <div className="flex items-center gap-6 text-xs text-zinc-500">
                <Link href="/overview" className="hover:text-zinc-300 transition-colors">Terminal</Link>
                <Link href="/remates" className="hover:text-zinc-300 transition-colors">Remates</Link>
                <Link href="/consignatarias" className="hover:text-zinc-300 transition-colors">Directorio</Link>
                <Link href="/frigorificos" className="hover:text-zinc-300 transition-colors">Frigoríficos</Link>
                <Link href="/mercado" className="hover:text-zinc-300 transition-colors">Mercado</Link>
              </div>

              <div className="text-[0.65rem] text-zinc-500 uppercase tracking-widest">
                Datos actualizados diariamente
              </div>
            </div>

            <div className="border-t border-zinc-800/50 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-500">
                <Link href="/planes" className="hover:text-zinc-300 transition-colors">Planes</Link>
                <Link href="/glosario" className="hover:text-zinc-300 transition-colors">Glosario</Link>
                <Link href="/calidad" className="hover:text-zinc-300 transition-colors">Calidad de datos</Link>
                <Link href="/quienes-somos" className="hover:text-zinc-300 transition-colors">Quiénes somos</Link>
                <Link href="/terminos" className="hover:text-zinc-300 transition-colors">Términos</Link>
                <Link href="/privacidad" className="hover:text-zinc-300 transition-colors">Privacidad</Link>
                <Link href="/aviso-legal" className="hover:text-zinc-300 transition-colors">Aviso legal</Link>
                <Link href="/arrepentimiento" className="text-amber-500/90 hover:text-amber-400 transition-colors">Botón de Arrepentimiento</Link>
              </div>
              <span className="text-xs text-zinc-700">
                © {new Date().getFullYear()} Memola Medios S.A.S. · agro@memola.com.ar
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
