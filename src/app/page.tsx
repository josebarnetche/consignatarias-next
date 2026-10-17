import { PromoGuiaBanner } from '@/components/PromoGuiaBanner'
import ThemeToggle from "@/components/ThemeToggle";
import NavDropdown from "@/components/nav/NavDropdown";
import MobileMenu from "@/components/nav/MobileMenu";
import { buildNavGroups } from "@/lib/nav";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import marketPrices from "@/lib/data/market-prices.json";
import frigorificosData from "@/lib/data/frigorificos.json";
import rematesData from "@/lib/data/remates.json";
import { getAllProfiles } from "@/lib/data/consignataria-slugs";
import { resolveYoutubeUrl } from "@/lib/youtube-live";
import { getLogoUrl, getBrandColor, getBrandKeepColor, getBrandSolidLogo } from "@/lib/data/logo-map";
import { getFeaturedSlugs } from "@/lib/featured";
import ConsignatariasShowcase from "@/components/landing/ConsignatariasShowcase";
import CalendarioSanitario from "@/components/landing/CalendarioSanitario";
import ConsignatariaSearch from "@/components/landing/ConsignatariaSearch";
import { FAQPageSchema } from "@/components/seo/JsonLd";
import NewsletterSignup from "@/components/NewsletterSignup";
import ValuationWidget from "@/components/landing/ValuationWidget";
import MarketTape, { type TapeItem } from "@/components/landing/MarketTape";
import { fetchUsdBlue } from "@/lib/markets/usd";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { CoverageMap } from "@/components/landing/CoverageMap";
import SellZoneBadge from "@/components/SellZoneBadge";
import { getBandasPublicas, getSlugsConBanda, vrCobertura, VR_VENTANA_DIAS } from "@/lib/vr";
import { getEffectiveStatus } from "@/lib/ui/tokens";
import { rematesDesdeHoy } from "@/lib/remates-conteo";
import HeroPro from "@/components/landing/lienzo/HeroPro";
import AlcanceGoogle from "@/components/landing/lienzo/AlcanceGoogle";
import BeneficiosPro from "@/components/landing/lienzo/BeneficiosPro";
import MapaDelSitio, { type GrupoMapa } from "@/components/landing/lienzo/MapaDelSitio";
import { adminClientOpcional } from "@/lib/supabase-server";
import { getAiCitationStats } from "@/lib/ai-citations";
import { TOTAL_GUIAS } from "@/lib/data/guias";
import tierraData from "@/lib/data/tierra-por-kilo.json";

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

// El criterio vive en `lib/remates-conteo` para que haya uno solo, con test: la home
// filtraba sólo `scheduled` y se comía los remates de HOY, que el scraper marca `live`.
const rematesProximos = rematesDesdeHoy(rematesData, TODAY);
// `frigorificos-summary.json` quedó congelado en 364 desde febrero mientras el
// directorio indexaba 1.115: la home subdeclaraba la cobertura en dos tercios. Se
// cuenta de la misma fuente que lee /frigorificos, y se dice HABILITADAS, que es el
// número honesto (el total indexado incluye históricos sin verificación vigente).
const frigorificosHabilitados = (frigorificosData as { senasaActive?: boolean }[]).filter(
  (f) => f.senasaActive === true,
).length;
const provinciasConFrigo = new Set(
  (frigorificosData as { province?: string | null }[]).map((f) => f.province).filter(Boolean),
).size;
const totalConsignatarias = getAllProfiles().length;
const NAV_GROUPS = buildNavGroups({ plantas: frigorificosHabilitados, firmas: totalConsignatarias });

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
// SÓLO las de HOY: contar todo lo transmisible de acá a fin de año daba 116 bajo un
// punto rojo que decía "en vivo", y el clic caía en "Nadie está transmitiendo ahora".
// Mismo criterio que el muro de /remates/en-vivo, que trabaja sobre el día.
const rematesEnVivo = rematesProximos
  .filter((r) => r.date === TODAY)
  .filter((r) => getEffectiveStatus(r.date, r.time, TODAY) !== "completed")
  .map((r) => {
    const resolved = resolveYoutubeUrl(r);
    return resolved ? { remate: r, confidence: resolved.confidence } : null;
  })
  .filter((x): x is { remate: (typeof rematesProximos)[number]; confidence: "confirmed" | "probable" } => x !== null);
const enVivoCount = rematesEnVivo.length;

function fmt(n: number, d = 0) {
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}


// Bandas del Valor de Referencia (lib/vr): el número que la home pone arriba de todo.
const SLUGS_VR = new Set(getSlugsConBanda());
const BANDAS_HOME = getBandasPublicas()
  .map((b) => ({ ...b, slug: b.codigo.toLowerCase() }))
  .filter((b) => SLUGS_VR.has(b.slug));
const VR_COBERTURA = vrCobertura();

const FAQ_ITEMS = [
  {
    question: "¿Qué gana mi consignataria con PRO?",
    answer: `Tu firma sale primero: perfil verificado con el sello PRO, arriba en el directorio, en el muro de la portada y en el calendario de remates. Tus remates llegan por email a la base de productores (newsletter, alertas de remate y envío directo), con registro de a cuántos les llegó. Sumás pre-oferta de lotes con video y captura de interesados, analytics de tu perfil y una página propia con QR. Cuesta ARS 45.000 por mes, sin permanencia. El sitio tuvo más de un millón de impresiones en Google entre marzo y octubre de 2026.`,
  },
  {
    question: "¿Qué es el Valor de Referencia?",
    answer: `Es el rango de precio al que realmente se vendió cada categoría de hacienda en el Mercado Agroganadero en los últimos ${VR_VENTANA_DIAS} días: el precio del 10 % más barato de los lotes, la mediana y el del 10 % más caro, con la cantidad de lotes que lo sostienen (${fmt(VR_COBERTURA.lotes)} en la ventana vigente). Se calcula también por rango de peso, porque el peso mueve el precio por kilo. No es una tasación ni una cotización en firme: es lo que se pagó, publicado con su metodología.`,
  },
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
    answer: `Un frigorífico es una planta habilitada por SENASA y MAGYP para la faena y procesamiento de carne vacuna. En nuestra base de datos tenemos ${fmt(frigorificosHabilitados)} plantas habilitadas en ${provinciasConFrigo} provincias, con datos de CUIT, matrícula y clasificación por ciclo (Ciclo I matadero, Ciclo II elaborador, Ciclo III dador de frío).`,
  },
  {
    question: "¿Consignatarias.com.ar es gratis?",
    answer: "Para el productor, sí: el Valor de Referencia, Mi Ganado (con tu cuenta), el calendario de remates, el directorio y los precios son gratis. Pagan las empresas que usan el dato en sus sistemas —bancos, aseguradoras, agtech, frigoríficos y agentes de IA— por el acceso por API y la serie histórica, y las consignatarias que quieren destacar su firma (PRO Consignataria).",
  },
  {
    question: "¿De dónde obtienen los datos de remates?",
    answer: "Combinamos datos de la API de la CACG (Cámara Argentina de Consignatarios de Ganado), scraping de sitios web de consignatarias individuales como Colombo y Colombo, O'Farrell, Cooperativa Lehmann y Madelan, más carga manual de fuentes no digitalizables. Todo se actualiza cada día.",
  },
];

/* Todo el sitio en el lienzo (MapaDelSitio): cada frame es una sección real con su
   dato del día. Las rutas están verificadas contra src/app; si se agrega una sección
   importante, va acá. */
const VR_NOVILLO = BANDAS_HOME.find((b) => b.slug === 'novillo') ?? BANDAS_HOME[0];
const PROVINCIAS_TIERRA = new Set((tierraData as { provincia: string }[]).map((t) => t.provincia)).size;
const GRUPOS_MAPA: GrupoMapa[] = [
  {
    id: 'productor',
    nombre: 'Valuar y vender',
    bajada: 'Para decidir cuándo vender, a cuánto y con quién.',
    items: [
      { nombre: 'Valor de Referencia', href: '/vr', dato: VR_NOVILLO ? `$${fmt(VR_NOVILLO.mediana)}/kg` : undefined, detalle: `Lo que se pagó por cada categoría y peso. ${fmt(VR_COBERTURA.lotes)} lotes en ${VR_VENTANA_DIAS} días.` },
      { nombre: 'Mi Ganado', href: '/mi-ganado', detalle: 'Tu rodeo valuado todos los días contra lo que se vendió. Gratis con tu cuenta.' },
      { nombre: '¿Vendo ahora?', href: '/mercado/vender-ahora', detalle: 'Tu lote contra los últimos 365 días: si el precio está alto o bajo para su época.' },
      { nombre: 'Calculadora de neto', href: '/calculadora', detalle: 'Lo que te queda en mano después de comisión, flete e impuestos.' },
      { nombre: 'Flete de hacienda', href: '/cuanto-cuesta-el-flete-de-hacienda', detalle: 'Cuánto cuesta mover la hacienda, por distancia y por jaula.' },
      { nombre: 'Lotes a la venta', href: '/lotes', detalle: 'Lotes publicados con la referencia de precio de su categoría al lado.' },
    ],
  },
  {
    id: 'mercado',
    nombre: 'Mercado',
    bajada: 'El índice del día, la serie larga y la lectura del ciclo.',
    items: [
      { nombre: 'INMAG', href: '/mercado/inmag', dato: `$${fmt(marketPrices.inmag.current)}/kg`, detalle: 'El índice del Mercado Agroganadero, diario, con su serie desde 2015.' },
      { nombre: 'El novillo en dólares', href: '/mercado/inmag-dolares', detalle: 'El precio del novillo en dólares reales: dónde está contra su historia.' },
      { nombre: 'Índice de liquidación', href: '/mercado/liquidacion', detalle: 'Cuántas hembras se faenan: si el rodeo se retiene o se liquida.' },
      { nombre: 'Cañuelas', href: '/mercado/canuelas', detalle: 'La rueda del Mercado Agroganadero, categoría por categoría.' },
      { nombre: 'Precios de hacienda', href: '/precios', detalle: 'Precio por categoría: novillo, vaca, vaquillona, ternero y más.' },
      { nombre: 'El Corredor', href: '/el-corredor', detalle: 'El cierre mensual del mercado bovino: 12 páginas, gratis por email.' },
    ],
  },
  {
    id: 'remates',
    nombre: 'Remates y firmas',
    bajada: 'Quién remata, cuándo y dónde, y con quién conviene operar.',
    items: [
      { nombre: 'Calendario de remates', href: '/remates', dato: fmt(rematesProximos.length), detalle: 'Remates próximos de todo el país, filtrables por provincia y tipo.' },
      { nombre: 'En vivo', href: '/remates/en-vivo', dato: enVivoCount > 0 ? `${enVivoCount} hoy` : undefined, detalle: 'Los remates que se transmiten hoy, en un solo muro.' },
      { nombre: 'Consignatarias', href: '/consignatarias', dato: fmt(totalConsignatarias), detalle: 'El directorio: calendario, historial y contacto de cada firma.' },
      { nombre: 'Frigoríficos', href: '/frigorificos', dato: fmt(frigorificosHabilitados), detalle: `Plantas habilitadas por SENASA en ${provinciasConFrigo} provincias, con CUIT y matrícula.` },
      { nombre: 'Comparar firmas', href: '/comparar', detalle: 'Dos o más consignatarias lado a lado: remates, zonas y precios.' },
      { nombre: 'Pre-ofertas', href: '/preofertas', detalle: 'Lotes con video ofertados antes del remate.' },
    ],
  },
  {
    id: 'campos',
    nombre: 'Campos',
    bajada: 'Cuánto vale la hectárea y qué se paga de arrendamiento.',
    items: [
      { nombre: '¿Cuánto vale mi campo?', href: '/campos/valuar', dato: `${PROVINCIAS_TIERRA} provincias`, detalle: `Valor de la hectárea en ${(tierraData as unknown[]).length} zonas ganaderas, con su fuente fechada.` },
      { nombre: 'Índice de arrendamiento', href: '/mercado/arrendamiento', detalle: 'El canon en kilos de novillo y su valor en pesos, actualizado.' },
      { nombre: 'Campos ofrecidos', href: '/campos', detalle: 'Campos a la venta y en alquiler.' },
      { nombre: 'Inmobiliarias rurales', href: '/inmobiliarias-rurales', detalle: 'Las firmas que venden y arriendan campos, por zona.' },
    ],
  },
  {
    id: 'sanidad',
    nombre: 'Sanidad y guías',
    bajada: 'Lo que pide SENASA y lo que conviene saber antes de firmar.',
    items: [
      { nombre: 'Sanidad SENASA', href: '/sanidad', dato: 'Res. 201/2026', detalle: 'Calendario de aftosa, el vacunador que elegís desde 2027 y lo que pide mover hacienda.' },
      { nombre: 'DT-e y RENSPA', href: '/dte', detalle: 'Qué es el DT-e, cómo se emite y cómo validar un RENSPA.' },
      { nombre: 'Buenas prácticas', href: '/buenas-practicas', detalle: 'Las 14 prácticas ganaderas de la guía de la Red BPA.' },
      { nombre: 'Guías', href: '/guias', dato: fmt(TOTAL_GUIAS), detalle: 'Cómo vender hacienda, leer una liquidación, tasar un campo y más.' },
      { nombre: 'Glosario', href: '/glosario', detalle: 'Cada término del mercado ganadero, explicado corto.' },
    ],
  },
  {
    id: 'empresas',
    nombre: 'Empresas e IA',
    bajada: 'El dato del mercado dentro de tu sistema, por API y por MCP.',
    items: [
      { nombre: 'Servidor MCP', href: '/mcp', dato: 'Gratis', detalle: 'Conectá cualquier agente de IA al dato del mercado ganadero.' },
      { nombre: 'API Enterprise', href: '/enterprise', detalle: 'Precios, lotes y series para bancos, aseguradoras, agtech y frigoríficos.' },
      { nombre: 'Índices', href: '/indices', detalle: 'Los índices propios del sitio, con su metodología.' },
      { nombre: 'Documentación', href: '/api-docs', detalle: 'Endpoints, autenticación y ejemplos.' },
    ],
  },
];

/* ================================================================== */
/*  METADATA                                                           */
/* ================================================================== */
// Regenerate every hour so TODAY stays fresh
export const revalidate = 900 // ISR 15 min — la cinta (USD blue en vivo) se refresca entre rebuilds

export const metadata: Metadata = {
  // La promesa va en el title (v1.221): antes decía "Consignatarias de Hacienda
  // Argentina | Remates y Precios" y competía con /consignatarias por la misma
  // búsqueda. La marca queda al final para la búsqueda de marca. `absolute` para
  // no sumar el sufijo de la plantilla y pasarse de largo.
  title: { absolute: 'Precio de la hacienda hoy, medido en lo que se vendió | Consignatarias' },
  description: `Cuánto vale tu hacienda hoy, por categoría y por peso, medido en ${fmt(VR_COBERTURA.lotes)} lotes vendidos en el Mercado Agroganadero. Más ${rematesProximos.length} remates próximos y ${totalConsignatarias} consignatarias. Gratis.`,
  alternates: {
    canonical: 'https://www.consignatarias.com.ar',
  },
  // El layout raíz ya no trae og:url ni og:title (los heredaban todas las páginas):
  // la portada declara el suyo completo.
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: 'https://www.consignatarias.com.ar',
    siteName: 'Consignatarias.com.ar',
    title: 'Consignatarias de Hacienda Argentina | Remates y Precios',
    description: `Cuánto vale tu hacienda hoy, medido en lo que realmente se vendió. ${totalConsignatarias} consignatarias y ${rematesProximos.length} remates próximos.`,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Consignatarias.com.ar - Inteligencia del Mercado Ganadero' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@consignatarias',
    creator: '@memola_onbase',
    title: 'Consignatarias de Hacienda Argentina | Remates y Precios',
    description: `Cuánto vale tu hacienda hoy, medido en lo que realmente se vendió. ${totalConsignatarias} consignatarias y ${rematesProximos.length} remates próximos.`,
    images: ['/og-image.png'],
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
  // Brand wall = firms active in the last 60 days + the PRO firms (the unified
  // source of truth: featured=true OR active subscription). PRO firms are forced
  // onto the wall even with no recent remates, shown with a PRO badge, and sorted
  // first so a paying firm always appears with priority where producers look.
  const proSlugs = await getFeaturedSlugs()
  // Firmas que las IAs nombraron el último mes (ai_referrals). Opcional: un build sin
  // service-role sigue sin la marquesina en vez de voltear el render.
  const SIN_CITAS = { aiRefsMes: 0, firmsCitadas: 0, citadas: [] as { nombre: string }[] }
  const ai = adminClientOpcional() ? await getAiCitationStats().catch(() => SIN_CITAS) : SIN_CITAS
  const citadas = ai.citadas.map((c) => c.nombre).slice(0, 14)
  const activeSlugs = new Set(activeConsignatarias.map(c => c.slug))
  const featured = [...proSlugs]
    .filter(s => !activeSlugs.has(s))
    .map(s => ({ slug: s, name: getAllProfiles().find(p => p.canonicalSlug === s)?.displayName ?? s }))
  const showcaseItems = [...activeConsignatarias, ...featured]
    .map(c => ({ slug: c.slug, name: c.name, logoUrl: getLogoUrl(c.slug), brandColor: getBrandColor(c.slug), keepColor: getBrandKeepColor(c.slug), solidLogo: getBrandSolidLogo(c.slug), isPro: proSlugs.has(c.slug) }))
    // Sin logo curado, una firma común no entra al muro (el muro es de marcas).
    // 17-10-2026: una PRO entra igual — la promesa es "en el muro de la home" — y
    // ConsignatariasShowcase la dibuja como baldosa de nombre con su sello.
    .filter(c => c.isPro || (c.logoUrl && c.brandColor))
    // PRO firms first — paying firms appear with priority on the wall.
    .sort((a, b) => Number(b.isPro) - Number(a.isPro))

  // Cinta de mercado. Las categorías salen del Valor de Referencia (mediana observada de
  // los lotes del MAG), NO de `market-prices.json → categories`: ese campo alterna entre
  // el precio observado y un ratio fijo sobre el INMAG según el día, y el del ternero es
  // siempre un ratio (el MAG no opera terneros). Sin variación diaria: la banda es de una
  // ventana de 30 días y un "▲ 0,0 %" no le dice nada a nadie.
  const catItems: TapeItem[] = BANDAS_HOME.slice(0, 4).map((b) => ({
    label: `${b.categoria} · VR`,
    value: `$${fmt(b.mediana)}`,
    change: null,
    href: `/vr/${b.slug}`,
  }))
  const tapeItems: TapeItem[] = [
    { label: 'INMAG', value: `$${fmt(marketPrices.inmag.current)}/kg`, change: marketPrices.inmag.change, href: '/mercado/inmag' },
    ...catItems,
    usd
      ? { label: 'USD blue', value: `$${fmt(usd.venta)}`, change: usd.change, href: '/mercado' }
      : { label: 'USD blue', value: `$${fmt(marketPrices.usdBlue.current)}`, change: marketPrices.usdBlue.change, href: '/mercado' },
    { label: 'Remates', value: `${rematesProximos.length}`, change: null, href: '/remates' },
    ...(enVivoCount > 0 ? [{ label: 'En vivo', value: `${enVivoCount}`, change: null, live: true, href: '/remates/en-vivo' } as TapeItem] : []),
    { label: 'Plantas SENASA', value: `${fmt(frigorificosHabilitados)}`, change: null, href: '/frigorificos' },
  ]

  return (
    <div className="font-sans text-zinc-300 selection:bg-zinc-800 selection:text-zinc-100">
      {/* Organization + WebSite ya vienen del root layout (no duplicar acá). */}
      {/* ============================================================ */}
      {/*  NAVBAR                                                       */}
      {/* ============================================================ */}
      <nav className="fixed top-0 w-full z-50 border-b border-ink/5 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* El isotipo es blanco sobre transparente: sobre el nav claro desaparecía.
                Va sobre un chip negro fijo (bg-black no invierte) en los dos temas. */}
            <Image src="/icon-32.png" alt="Consignatarias.com.ar" width={32} height={32} className="rounded bg-black" />
            <span className="hidden min-[430px]:inline text-sm font-medium text-zinc-100 tracking-tight">
              consignatarias.com.ar
            </span>
          </div>

          {/* El mismo menú que el resto del sitio (lib/nav): seis grupos. */}
          <div className="hidden lg:flex items-center gap-0.5">
            {NAV_GROUPS.map((g) => (
              <NavDropdown key={g.label} group={g} active={false} />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <MobileMenu groups={NAV_GROUPS} />
            </div>
            <ThemeToggle />
            <Link
              href="#pro"
              className="text-xs font-medium text-zinc-950 bg-accent hover:bg-sky-300 claro:text-white claro:hover:bg-accent-bright transition-colors rounded py-2 px-4"
            >
              <span className="sm:hidden">PRO</span>
              <span className="hidden sm:inline lg:hidden xl:inline">PRO para consignatarias</span>
              <span className="hidden lg:inline xl:hidden">PRO</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-16 pb-24 overflow-hidden">
        {/* Cinta de mercado en vivo — latido de la página */}
        <MarketTape items={tapeItems} />
        {/* Reveal-on-scroll a todas las secciones (sin tocar su markup) */}
        <ScrollReveal />

        {/* ============================================================ */}
        {/*  HERO — PRO Consignataria, el producto principal (v1.226.0)  */}
        {/* ============================================================ */}
        <HeroPro
          rematesProximos={rematesProximos.length}
          consignatarias={totalConsignatarias}
          citadaReal={citadas[0]}
        />

        {/*  ALCANCE — el millón de impresiones, mes a mes (Search Console) */}
        <AlcanceGoogle aiRefsMes={ai.aiRefsMes} />

        {/*  BENEFICIOS PRO — ocho frames, uno por beneficio              */}
        <BeneficiosPro citadas={citadas} />

        {/*  EL MURO — las firmas activas, PRO primero                    */}
        <ConsignatariasShowcase items={showcaseItems} />

        {/*  TODO EL SITIO — el mapa del sitio como lienzo de Figma       */}
        <MapaDelSitio grupos={GRUPOS_MAPA} />

        {/*  VALUAR — el productor prueba el Valor de Referencia acá      */}
        <section id="valuar" className="max-w-4xl mx-auto px-6 pt-24 pb-12 scroll-mt-20">
          <div className="mb-8">
            <p className="text-xxs font-medium text-accent">Para el productor, gratis</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-ink text-balance">
              Probalo acá: cuánto vale tu hacienda hoy.
            </h2>
            <p className="mt-3 text-zinc-400">
              Medido en {fmt(VR_COBERTURA.lotes)} lotes vendidos en el Mercado Agroganadero en los últimos {VR_VENTANA_DIAS} días.
            </p>
          </div>
          <ValuationWidget />

          {/* Par productor: ya sabe cuánto vale su hacienda (widget) → ahora, ¿conviene
              venderla hoy? El semáforo gratis + el camino a la decisión completa. Primera
              vez que el valor PRO Usuario aparece en la puerta de entrada. */}
          <div className="mt-6 rounded-lg border border-sky-500/20 bg-sky-950/10 claro:border-zinc-800 claro:bg-terminal-panel claro:shadow-panel p-5 space-y-4">
            <SellZoneBadge categoriaLabel="novillo" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <p className="flex-1 min-w-0 text-sm text-zinc-300 leading-relaxed">
                Sabés cuánto vale — <span className="text-zinc-100 font-medium">¿conviene venderla hoy?</span>{" "}
                Compará tu lote contra los últimos 365 días.
              </p>
              <Link
                href="/mercado/vender-ahora"
                className="shrink-0 inline-flex items-center justify-center gap-2 text-sm font-medium text-zinc-100 border border-sky-500/40 hover:border-sky-400 claro:border-accent/40 claro:text-accent claro:hover:border-accent hover:text-ink transition-colors rounded py-2.5 px-5 whitespace-nowrap"
              >
                ¿Vendo ahora?
                <IconArrowRight />
              </Link>
            </div>
          </div>
        </section>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

        {/*  ¿DÓNDE LA VENDO? — buscador + mapa de cobertura               */}
        <section id="donde-vender" className="max-w-7xl mx-auto px-6 pt-24">
          <div className="max-w-2xl">
            <div className="text-[0.65rem] text-zinc-500 uppercase tracking-widest mb-2">Cuando decidas vender</div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-normal text-zinc-100 tracking-tight leading-tight">
              ¿Y dónde la vendo? <span className="text-accent">{totalConsignatarias} consignatarias</span> y {fmt(rematesData.length)} remates, por provincia.
            </h2>
          </div>
          {/* Buscador por nombre — el usuario de IA suele llegar sabiendo el
              nombre de una firma y no tenía dónde tipearlo. */}
          <ConsignatariaSearch
            items={getAllProfiles().map((p) => ({ slug: p.canonicalSlug, name: p.displayName }))}
          />

          {/* Cobertura — mapa estilizado por provincia (reemplaza la grilla de texto). */}
          <div className="relative z-10 mt-10">
            <CoverageMap counts={provinceRemateCounts} />
          </div>
        </section>

        {/*  PROMO — la guía paga                                          */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-6">
          <PromoGuiaBanner origen="home" />
        </div>

        {/*  CALENDARIO SANITARIO — SENASA, con la Res. 201/2026           */}
        <CalendarioSanitario />

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
        {/*  CTA FINAL — PRO                                              */}
        {/* ============================================================ */}
        <section className="max-w-5xl mx-auto px-6 pb-32">
          <div className="frame relative overflow-hidden rounded-2xl border border-accent/40 bg-terminal-panel p-8 md:p-14">
            <span className="frame-nombre" aria-hidden="true"># Tu firma, PRO</span>
            <div className="lienzo-puntos absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-ink text-balance">
                  Más de un millón de búsquedas ya pasaron por acá. Que la próxima te encuentre.
                </h2>
                <p className="mt-4 text-zinc-400">
                  {totalConsignatarias} firmas en el directorio y {rematesProximos.length} remates próximos. Las PRO salen primero.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  href="/planes#consignataria"
                  className="rounded-lg bg-accent px-6 py-4 text-center text-base font-semibold text-white oscuro:text-zinc-950 hover:bg-accent-bright transition-colors"
                >
                  Activar PRO · ARS 45.000/mes
                </Link>
                <Link
                  href="/para-consignatarias"
                  className="rounded-lg border border-zinc-700 px-6 py-4 text-center text-sm text-zinc-200 hover:border-accent hover:text-accent transition-colors"
                >
                  Cómo te ven las IAs →
                </Link>
              </div>
            </div>
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
      <footer className="border-t border-zinc-800 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2.5">
                <svg width="18" height="18" viewBox="0 0 512 512" aria-hidden="true" className="opacity-80">
                  <path d="M 413.61 379.14 A 200 200 0 1 1 367.83 90.17 L 321.98 158.17 A 118 118 0 1 0 348.99 328.66 Z" fill="#fafafa" />
                  <rect x="379.7" y="168.1" width="118" height="118" fill="#38bdf8" />
                </svg>
                <span className="text-xs font-medium text-zinc-400 tracking-tight lowercase">
                  consignatarias<span className="text-sky-400">.</span>com<span className="text-sky-400">.</span>ar
                  <span className="text-zinc-500"> &copy; {new Date().getFullYear()}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-400">
                <Link href="/vr" className="hover:text-zinc-300 transition-colors">Precio por categoría y peso</Link>
                <Link href="/valuar-hacienda" className="hover:text-zinc-300 transition-colors">Cuánto vale mi hacienda</Link>
                <Link href="/overview" className="hover:text-zinc-300 transition-colors">Panel</Link>
                <Link href="/remates" className="hover:text-zinc-300 transition-colors">Remates</Link>
                <Link href="/consignatarias" className="hover:text-zinc-300 transition-colors">Directorio</Link>
                <Link href="/frigorificos" className="hover:text-zinc-300 transition-colors">Frigoríficos</Link>
                <Link href="/mercado" className="hover:text-zinc-300 transition-colors">Mercado</Link>
              </div>

              <div className="text-[0.65rem] text-zinc-400 uppercase tracking-widest">
                Datos actualizados diariamente
              </div>
            </div>

            <div className="border-t border-zinc-800/50 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-400">
                <Link href="/planes" className="hover:text-zinc-300 transition-colors">Planes</Link>
                <Link href="/glosario" className="hover:text-zinc-300 transition-colors">Glosario</Link>
                <Link href="/calidad" className="hover:text-zinc-300 transition-colors">Calidad de datos</Link>
                <Link href="/quienes-somos" className="hover:text-zinc-300 transition-colors">Quiénes somos</Link>
                <Link href="/terminos" className="hover:text-zinc-300 transition-colors">Términos</Link>
                <Link href="/privacidad" className="hover:text-zinc-300 transition-colors">Privacidad</Link>
                <Link href="/aviso-legal" className="hover:text-zinc-300 transition-colors">Aviso legal</Link>
                <Link href="/arrepentimiento" className="text-accent/90 hover:text-accent transition-colors">Botón de Arrepentimiento</Link>
              </div>
              <span className="text-xs text-zinc-500">
                © {new Date().getFullYear()} Memola Medios S.A.S. · agro@memola.com.ar
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
