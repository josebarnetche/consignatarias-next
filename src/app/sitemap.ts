import { MetadataRoute } from 'next'
import { PROVINCIAS_CON_DATO, ZONAS_CON_DATO, zonaIndexable } from '@/lib/campos-seo'
import { getAllCanonicalSlugs, getAuctionsForProfile } from '@/lib/data/consignataria-slugs'
import { getProfileSEO } from '@/lib/data/profile-seo'
import type { Auction } from '@/lib/db/schema'
import rematesData from '@/lib/data/remates.json'
import frigorificosData from '@/lib/data/frigorificos.json'
import marketPrices from '@/lib/data/market-prices.json'
import { getQualitySegments, CABEZAS_INDEX_THRESHOLD } from '@/lib/data/quality-segments'
import { BPG_TEMAS } from '@/lib/data/bpg-ganaderas'
import { getActivePreofertas } from '@/lib/data/preofertas'
import { PRODUCTOS_DATOS } from '@/lib/productos-datos'
import { getProveedoresPublicados } from '@/lib/proveedores'
import { getDepartamentosPublicables, ultimoAnio, fichaIndexable, META as PRODUCTIVIDAD_META } from '@/lib/productividad/panel'
import { getSlugsConBanda, vrCobertura } from '@/lib/vr'
import { remateSlug } from '@/lib/remate-slug'
import { getOrigenSlugs } from '@/lib/mercado-origen'
import { CATEGORIAS_GEO_SLUGS, PROVINCIAS_GEO_SLUGS } from '@/lib/precios-geo'
import {
  MESES,
  aniosInmag,
  calendarioIndexable,
  ciudadEnSitemap,
  mesIndexable,
  slugsDeCiudades,
} from '@/lib/seo/indexacion'

/** Los departamentos con ficha propia. La fuente se refresca una vez al año, en abril. */
const fichasProductividad = getDepartamentosPublicables().filter((d) => d.serie[ultimoAnio()])

/* ------------------------------------------------------------------ */
/*  PROVINCE SLUG MAP (must match [provincia]/page.tsx)                 */
/* ------------------------------------------------------------------ */

const PROVINCE_SLUGS: Record<string, string> = {
  'BUENOS AIRES': 'buenos-aires',
  'CHACO': 'chaco',
  'CORDOBA': 'cordoba',
  'CORRIENTES': 'corrientes',
  'ENTRE RIOS': 'entre-rios',
  'FORMOSA': 'formosa',
  'LA PAMPA': 'la-pampa',
  'MISIONES': 'misiones',
  'NEUQUEN': 'neuquen',
  'SAN LUIS': 'san-luis',
  'SANTA FE': 'santa-fe',
  'SANTIAGO DEL ESTERO': 'santiago-del-estero',
  'TUCUMAN': 'tucuman',
}

/* ------------------------------------------------------------------ */
/*  TYPE SLUGS (must match tipo/[tipo]/page.tsx)                        */
/* ------------------------------------------------------------------ */

const TYPE_SLUGS = ['invernada', 'cria', 'general', 'especial', 'reproductores']

/* ------------------------------------------------------------------ */
/*  MARKET CATEGORY SLUGS (/mercado/[categoria])                       */
/* ------------------------------------------------------------------ */

const MARKET_CATEGORY_SLUGS = ['terneros', 'novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros']

/* ------------------------------------------------------------------ */
/*  LAST_EDIT — fecha de la última edición de las páginas evergreen     */
/* ------------------------------------------------------------------ */

/**
 * Para las páginas cuyo contenido no depende del dato del día (guías, definiciones,
 * legales, landings de producto) el lastmod es la fecha de su última edición, no la del
 * build. Sale del último commit que tocó su page.tsx (`%cs`). El clon con el que se armó
 * (oct-2026) arranca el 25-sep-2026, así que EDICION_BASE es una cota: esas páginas no
 * se tocaron después. Al editar una de ellas, actualizá su fecha acá.
 */
const EDICION_BASE = '2026-09-25'
const LAST_EDIT: Record<string, string> = {
  '/informes': '2026-10-03',
  '/informes/canon-de-arrendamiento': '2026-10-03',
  '/informes/productivo-departamental': '2026-10-03',
  '/informes/parte-semanal': '2026-10-03',
  '/informes/valuacion-de-campo': '2026-10-03',
  '/para-consignatarias': '2026-10-03',
  '/para-consignatarias/pro-territorio': '2026-10-03',
  '/para-consignatarias/informe-provincial': '2026-10-03',
  '/proveedores': '2026-10-03',
  '/como-se-tasa-un-campo': '2026-10-03',
  '/senal-o-ruido-precio-hacienda': '2026-10-03',
  '/terneros-por-vaca-de-tu-zona': '2026-10-03',
  '/relacion-maiz-novillo': '2026-10-03',
  '/consignatarias': '2026-10-03',
  '/quienes-somos': '2026-10-03',
  '/enterprise': '2026-10-03',
  '/preguntas-frecuentes': '2026-10-02',
  '/el-oraculo': '2026-10-03',
  '/el-corredor': '2026-10-02',
  '/dte': '2026-10-03',
  '/pro': '2026-10-03',
  '/api-docs': '2026-10-03',
  '/mcp': '2026-10-03',
  '/sanidad': '2026-10-03',
  '/renspa': '2026-10-03',
  '/buenas-practicas': '2026-10-03',
  '/buenas-practicas/[slug]': '2026-10-03',
}
const editado = (ruta: string) => new Date(LAST_EDIT[ruta] ?? EDICION_BASE)

/** "2026-08" / "2024" (fecha de un relevamiento) → Date del primer día del período. */
const fechaDato = (fecha: string | null | undefined) => {
  const f = fecha ?? EDICION_BASE
  return new Date(f.length === 4 ? `${f}-01-01` : f.length === 7 ? `${f}-01` : f)
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.consignatarias.com.ar'

  /* ----------------------------------------------------------------
     Honest <lastmod>: per-URL-family data dates, not a blanket
     "changed today" (which told crawlers EVERY url updates daily — a
     freshness lie that wastes crawl budget). Sources:
       - priceDate      → páginas con el número del día en el contenido
       - latestRemateDate → remate listing/hub pages (freshest auction in the set)
       - vrDate / frigorificosDate / productividadDate → la fecha de SU dato
       - editado(ruta)  → evergreen: la última edición de la página (LAST_EDIT)
     Per-remate detail pages and closed INMAG year pages get their own true date.
     Ya no hay ninguna URL con la fecha del build.
     ---------------------------------------------------------------- */
  /**
   * `lastModified` tiene que ser la fecha en que cambió EL CONTENIDO, no la del build.
   *
   * Al 17-sep-2026, 1.856 de las 3.326 URLs del sitemap declaraban el mismo timestamp —el
   * del build— y se renovaba todos los días porque los commits de datos disparan deploy.
   * Una ficha de productividad con serie anual anunciando "modificada hoy" cada día, y
   * encima con changefreq 'yearly', le enseña al buscador a ignorar el campo entero.
   *
   * Cada grupo usa ahora la fecha de SU dato: las fichas de productividad, la del panel
   * oficial (`META.generado`); cada frigorífico, la última vez que se lo vio en el padrón
   * de SENASA. Y las evergreen, la de su última edición (LAST_EDIT, arriba).
   */
  const productividadDate = new Date(PRODUCTIVIDAD_META.generado)
  const priceDate = new Date(marketPrices.lastUpdate)
  // <lastmod> must never be in the future (Google ignores future lastmod). Remate
  // listing/detail pages can reference scheduled auctions months ahead, so clamp any
  // data-derived date to today — these pages are rebuilt daily anyway.
  const todayStr = new Date().toISOString().slice(0, 10)
  /** Corte de la ventana móvil de remates en el sitemap (ver el filtro más abajo). */
  const hace90Dias = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)
  const clampToday = (d: string) => new Date(d > todayStr ? todayStr : d)
  const maxRemate = (rematesData as { date: string }[]).reduce((max, r) => (r.date > max ? r.date : max), '0000-00-00')
  const latestRemateDate = clampToday(maxRemate)
  const vrDate = clampToday(vrCobertura().hasta)
  const maxSenasa = (frigorificosData as { senasaLastSeen?: string | null }[]).reduce(
    (max, f) => (f.senasaLastSeen && f.senasaLastSeen > max ? f.senasaLastSeen : max),
    '',
  )
  const frigorificosDate = maxSenasa ? clampToday(maxSenasa.slice(0, 10)) : editado('/frigorificos')
  /** /preofertas solo se ofrece mientras haya alguna abierta (si no, la página es un aviso vacío y va noindex). */
  const preofertasAbiertas = getActivePreofertas(Date.now()).length > 0
  const currentYear = priceDate.getFullYear()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: latestRemateDate,
      changeFrequency: 'daily',
      priority: 1,
    },
    // Answer-pages + landings creadas por los swarm GEO (2026-07-10).
    { url: `${baseUrl}/que-es-una-consignataria`, lastModified: editado('/que-es-una-consignataria'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/cuanto-vale-una-vaca`, lastModified: priceDate, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/precio-de-la-vaca-en-pie`, lastModified: priceDate, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/cuanto-vale-un-toro`, lastModified: priceDate, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/mercado/arrendamiento/liniers`, lastModified: priceDate, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/mercado/arrendamiento/canuelas`, lastModified: priceDate, changeFrequency: 'daily', priority: 0.8 },
    // Índice MENSUAL (cierres oficiales mes a mes) — la intención "mensual" tenía 4.000 impr/mes sin página propia (GSC 09-2026).
    { url: `${baseUrl}/mercado/arrendamiento/mensual`, lastModified: priceDate, changeFrequency: 'weekly', priority: 0.85 },
    // Tanda 2 — answer-pages informacionales de alto volumen.
    { url: `${baseUrl}/categorias-de-hacienda`, lastModified: editado('/categorias-de-hacienda'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/razas-bovinas-argentina`, lastModified: editado('/razas-bovinas-argentina'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/precio-de-la-carne-hoy`, lastModified: priceDate, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/novillo-vs-vaquillona`, lastModified: priceDate, changeFrequency: 'daily', priority: 0.75 },
    { url: `${baseUrl}/cuanto-pesa-un-novillo`, lastModified: editado('/cuanto-pesa-un-novillo'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/precio-del-novillo-en-pie`, lastModified: priceDate, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/cuanto-pesa-una-media-res`, lastModified: editado('/cuanto-pesa-una-media-res'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/rendimiento-al-gancho`, lastModified: editado('/rendimiento-al-gancho'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/como-vender-hacienda`, lastModified: editado('/como-vender-hacienda'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/quiero-comprar`, lastModified: editado('/quiero-comprar'), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/licencia-datos`, lastModified: editado('/licencia-datos'), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/campos`, lastModified: editado('/campos'), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/campos/publicar`, lastModified: editado('/campos/publicar'), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/campos/valuar`, lastModified: editado('/campos/valuar'), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/guias`, lastModified: editado('/guias'), changeFrequency: 'weekly', priority: 0.75 },
    // Informes de datos — el hub y cada sales page. Prioridad alta: son las páginas
    // que cobran, y su descubrimiento por búsqueda es el canal de A5 y A7 del plan
    // de monetización. Sólo lo que el catálogo marca como `publicado`.
    { url: `${baseUrl}/informes`, lastModified: editado('/informes'), changeFrequency: 'weekly', priority: 0.85 },
    // Guía de proveedores: el hub y una ficha por empresa. Captura búsquedas de rubro
    // ("etiquetas para frigoríficos") que hoy no tienen ninguna página nuestra.
    { url: `${baseUrl}/proveedores`, lastModified: editado('/proveedores'), changeFrequency: 'weekly', priority: 0.7 },
    // Productividad por departamento: el hub, 23 provinciales y 455 fichas. Es el activo
    // de búsqueda del proyecto — cada ficha publica un indicador (terneros/vaca por
    // partido) que no está en ninguna otra fuente, y deriva al informe pago.
    // Artículos que explican los productos: contenido gratis que captura búsqueda
    // conceptual ("cómo se tasa un campo", "relación maíz novillo") y deriva a la
    // herramienta o al informe correspondiente.
    ...['/como-se-tasa-un-campo', '/senal-o-ruido-precio-hacienda', '/terneros-por-vaca-de-tu-zona', '/relacion-maiz-novillo'].map(
      (ruta) => ({
        url: `${baseUrl}${ruta}`,
        lastModified: editado(ruta),
        changeFrequency: 'monthly' as const,
        priority: 0.75,
      }),
    ),
    { url: `${baseUrl}/productividad`, lastModified: productividadDate, changeFrequency: 'monthly', priority: 0.8 },
    ...[...new Set(fichasProductividad.map((d) => d.slugProvincia))].map((slug) => ({
      url: `${baseUrl}/productividad/${slug}`,
      lastModified: productividadDate,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    // Solo las fichas sobre el umbral de contenido (ver fichaIndexable): las demás
    // siguen vivas pero van noindex.
    ...fichasProductividad.filter((d) => fichaIndexable(d)).map((d) => ({
      url: `${baseUrl}/productividad/${d.slugProvincia}/${d.slugDepartamento}`,
      lastModified: productividadDate,
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
    ...getProveedoresPublicados().map((p) => ({
      url: `${baseUrl}/proveedores/${p.slug}`,
      lastModified: editado('/proveedores'),
      changeFrequency: 'monthly' as const,
      priority: 0.65,
    })),
    // Las publicadas van con prioridad alta; las que todavía no se venden entran
    // igual, más abajo: su sales page captura la lista de espera y es la audiencia
    // del producto el día que salga.
    ...PRODUCTOS_DATOS.map((p) => ({
      url: `${baseUrl}${p.landing}`,
      lastModified: editado(p.landing),
      changeFrequency: 'monthly' as const,
      priority: p.publicado ? 0.8 : 0.6,
    })),
    { url: `${baseUrl}/como-comprar-un-campo`, lastModified: editado('/como-comprar-un-campo'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/como-vender-un-campo`, lastModified: editado('/como-vender-un-campo'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/como-publicar-un-campo`, lastModified: editado('/como-publicar-un-campo'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/impuestos-por-la-venta-de-un-campo`, lastModified: editado('/impuestos-por-la-venta-de-un-campo'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/creditos-para-comprar-un-campo`, lastModified: editado('/creditos-para-comprar-un-campo'), changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/inmobiliarias-rurales`, lastModified: editado('/inmobiliarias-rurales'), changeFrequency: 'monthly', priority: 0.75 },
    // Una página por provincia con dato propio: "cuánto vale la hectárea en X".
    ...PROVINCIAS_CON_DATO.map((p) => ({
      url: `${baseUrl}/campos/valor-hectarea/${p.slug}`,
      lastModified: fechaDato(p.fecha),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    // Y una por zona: es como se busca de verdad ("cuánto vale la hectárea en
    // Marcos Juárez"), no por promedio provincial.
    // Sin las zonas de una sola observación anterior a 2025 (noindex, ver zonaIndexable).
    ...ZONAS_CON_DATO.filter((z) => zonaIndexable(z)).map((z) => ({
      url: `${baseUrl}/campos/valor-hectarea/${z.provinciaSlug}/${z.zonaSlug}`,
      lastModified: fechaDato(z.fecha),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${baseUrl}/como-se-calcula-el-canon-de-arrendamiento`, lastModified: editado('/como-se-calcula-el-canon-de-arrendamiento'), changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/impuesto-de-sellos-arrendamiento`, lastModified: editado('/impuesto-de-sellos-arrendamiento'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/que-es-la-aparceria`, lastModified: editado('/que-es-la-aparceria'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/que-es-la-invernada`, lastModified: editado('/que-es-la-invernada'), changeFrequency: 'monthly', priority: 0.65 },
    { url: `${baseUrl}/que-es-la-cria-y-recria`, lastModified: editado('/que-es-la-cria-y-recria'), changeFrequency: 'monthly', priority: 0.65 },
    { url: `${baseUrl}/que-es-un-feedlot`, lastModified: editado('/que-es-un-feedlot'), changeFrequency: 'monthly', priority: 0.65 },
    { url: `${baseUrl}/que-es-el-renspa`, lastModified: editado('/que-es-el-renspa'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/que-es-el-mag`, lastModified: priceDate, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/precio-del-ternero-en-pie`, lastModified: priceDate, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/que-es-el-dte`, lastModified: editado('/que-es-el-dte'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/que-es-senasa`, lastModified: editado('/que-es-senasa'), changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/calendario-sanitario-bovino`, lastModified: editado('/calendario-sanitario-bovino'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/que-es-el-rosgan`, lastModified: editado('/que-es-el-rosgan'), changeFrequency: 'monthly', priority: 0.75 },
    // 3 rutas que el race de edits paralelos dejó sin registrar (agregadas a mano).
    { url: `${baseUrl}/como-funciona-un-remate-ganadero`, lastModified: editado('/como-funciona-un-remate-ganadero'), changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/que-es-el-destete`, lastModified: editado('/que-es-el-destete'), changeFrequency: 'monthly', priority: 0.65 },
    { url: `${baseUrl}/que-es-la-capitalizacion-de-hacienda`, lastModified: editado('/que-es-la-capitalizacion-de-hacienda'), changeFrequency: 'monthly', priority: 0.65 },
    // Tanda 4 — tier-3 práctico/comparativo + pilar de venta.
    { url: `${baseUrl}/vender-hacienda-guia`, lastModified: editado('/vender-hacienda-guia'), changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/precio-de-tranquera`, lastModified: priceDate, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/como-leer-una-liquidacion-de-hacienda`, lastModified: editado('/como-leer-una-liquidacion-de-hacienda'), changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/cuanto-cobra-de-comision-una-consignataria`, lastModified: editado('/cuanto-cobra-de-comision-una-consignataria'), changeFrequency: 'monthly', priority: 0.78 },
    { url: `${baseUrl}/cuanto-cuesta-el-flete-de-hacienda`, lastModified: editado('/cuanto-cuesta-el-flete-de-hacienda'), changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/desbaste-de-la-hacienda`, lastModified: editado('/desbaste-de-la-hacienda'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/conviene-vender-la-hacienda-ahora-o-esperar`, lastModified: priceDate, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/como-sacar-el-boleto-de-marca`, lastModified: editado('/como-sacar-el-boleto-de-marca'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/que-es-la-guia-de-hacienda`, lastModified: editado('/que-es-la-guia-de-hacienda'), changeFrequency: 'monthly', priority: 0.68 },
    { url: `${baseUrl}/que-es-una-tropa-de-hacienda`, lastModified: editado('/que-es-una-tropa-de-hacienda'), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/como-se-calcula-la-carga-animal`, lastModified: editado('/como-se-calcula-la-carga-animal'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/que-es-el-equivalente-vaca`, lastModified: editado('/que-es-el-equivalente-vaca'), changeFrequency: 'monthly', priority: 0.65 },
    { url: `${baseUrl}/feedlot-vs-pastoril`, lastModified: editado('/feedlot-vs-pastoril'), changeFrequency: 'monthly', priority: 0.68 },
    { url: `${baseUrl}/vender-en-remate-vs-venta-directa-vs-consignacion`, lastModified: editado('/vender-en-remate-vs-venta-directa-vs-consignacion'), changeFrequency: 'monthly', priority: 0.72 },
    {
      url: `${baseUrl}/overview`,
      lastModified: priceDate,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/remates`,
      lastModified: latestRemateDate,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/remates/hoy`,
      lastModified: latestRemateDate,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/remates/manana`,
      lastModified: latestRemateDate,
      changeFrequency: 'hourly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/remates/semana`,
      lastModified: latestRemateDate,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/remates/fin-de-semana`,
      lastModified: latestRemateDate,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      // La rueda de la Expo de Mercedes: la mayor concentración de firmas del interior.
      url: `${baseUrl}/remates/expo-rural-mercedes`,
      lastModified: latestRemateDate,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/remates/anteriores`,
      lastModified: latestRemateDate,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/remates/en-vivo`,
      lastModified: latestRemateDate,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    // NOTE: /mercado/vender-ahora intentionally excluded — it is noindex
    // (PRO-only calculator behind paywall).
    {
      url: `${baseUrl}/frigorificos`,
      lastModified: frigorificosDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/mercado`,
      lastModified: priceDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/mercado/inmag`,
      lastModified: priceDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/mercado/spread`,
      lastModified: priceDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/mercado/liniers`,
      lastModified: priceDate,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/mercado/canuelas`,
      lastModified: priceDate,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/indices`,
      lastModified: priceDate,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/consignatarias`,
      lastModified: editado('/consignatarias'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/como-elegir-consignataria`,
      lastModified: editado('/como-elegir-consignataria'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/como-abrir-una-consignataria`,
      lastModified: editado('/como-abrir-una-consignataria'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/quienes-somos`,
      lastModified: editado('/quienes-somos'),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/planes`,
      lastModified: editado('/planes'),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/enterprise`,
      lastModified: editado('/enterprise'),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/calidad`,
      lastModified: editado('/calidad'),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/metodologia`,
      lastModified: editado('/metodologia'),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      // Metodología del VR: la página que decide si un motor de IA nos trata
      // como fuente primaria de la banda de precio. Cambia con cada recálculo.
      url: `${baseUrl}/metodologia/vr`,
      lastModified: vrDate,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      // El hub del producto: todas las bandas + Mi Ganado + metodología.
      url: `${baseUrl}/vr`,
      lastModified: vrDate,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    // Una URL citable por categoría (/vr/vaca, /vr/novillo…). Solo las que
    // tienen banda publicable — getSlugsConBanda() aplica la regla de
    // degradación, así que el sitemap nunca emite una página sin dato.
    ...getSlugsConBanda().map((slug) => ({
      url: `${baseUrl}/vr/${slug}`,
      lastModified: vrDate,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    {
      url: `${baseUrl}/glosario`,
      lastModified: editado('/glosario'),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/preguntas-frecuentes`,
      lastModified: editado('/preguntas-frecuentes'),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/el-corredor`,
      lastModified: editado('/el-corredor'),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/el-oraculo`,
      lastModified: editado('/el-oraculo'),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/mercado/inmag-dolares`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.95,
    },
    {
      url: `${baseUrl}/mercado/novillo-historico`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/mercado/internacional`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
    {
      // Muestra el índice del día en el title y en el cuerpo.
      url: `${baseUrl}/mercado/arrendamiento`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terminos`,
      lastModified: editado('/terminos'),
      changeFrequency: 'yearly' as const,
      priority: 0.2,
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: editado('/privacidad'),
      changeFrequency: 'yearly' as const,
      priority: 0.2,
    },
    {
      url: `${baseUrl}/aviso-legal`,
      lastModified: editado('/aviso-legal'),
      changeFrequency: 'yearly' as const,
      priority: 0.2,
    },
    {
      url: `${baseUrl}/arrepentimiento`,
      lastModified: editado('/arrepentimiento'),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/dte`,
      lastModified: editado('/dte'),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/comparar`,
      lastModified: editado('/comparar'),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/pro`,
      lastModified: editado('/pro'),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/api-docs`,
      lastModified: editado('/api-docs'),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      // Showcase del MCP / compatibilidad con IAs — pieza central de la tesis de
      // "fuente citable por motores de IA". Estaba FUERA del sitemap y se indexó
      // tarde, sólo por enlaces internos (home/nav/api-keys). Se agrega para
      // discovery robusto y prioridad de rastreo.
      url: `${baseUrl}/mcp`,
      lastModified: editado('/mcp'),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/precios`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/precios/hacienda-en-pie`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.95,
    },
    ...(['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'terneros'].map(
      (c) => ({
        url: `${baseUrl}/precios/${c}`,
        lastModified: priceDate,
        changeFrequency: 'daily' as const,
        priority: 0.9,
      }),
    )),
    // /precios.json y /valor-tierra.json no van: no son páginas (se declaran en llms.txt
    // y en <link rel="alternate">).
    {
      url: `${baseUrl}/calculadora`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sanidad`,
      lastModified: editado('/sanidad'),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/renspa`,
      lastModified: editado('/renspa'),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/buenas-practicas`,
      lastModified: editado('/buenas-practicas'),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    ...BPG_TEMAS.map((t) => ({
      url: `${baseUrl}/buenas-practicas/${t.slug}`,
      lastModified: editado('/buenas-practicas/[slug]'),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
    {
      url: `${baseUrl}/para-consignatarias`,
      lastModified: editado('/para-consignatarias'),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/el-novillo-en-dolares`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/mercado/pulso`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/mercado/liquidacion`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/calendario-exportar`,
      lastModified: editado('/calendario-exportar'),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/reporte-semanal`,
      lastModified: priceDate,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    ...(preofertasAbiertas
      ? [{ url: `${baseUrl}/preofertas`, lastModified: latestRemateDate, changeFrequency: 'daily' as const, priority: 0.6 }]
      : []),
    {
      url: `${baseUrl}/exportar`,
      lastModified: editado('/exportar'),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
  ]

  // Province landing pages — only for provinces with auctions
  const provincesWithAuctions = new Set(
    (rematesData as { province: string }[]).map(a => a.province)
  )
  const provincePages: MetadataRoute.Sitemap = Object.entries(PROVINCE_SLUGS)
    .filter(([name]) => provincesWithAuctions.has(name))
    .map(([, slug]) => ({
      url: `${baseUrl}/remates/${slug}`,
      lastModified: latestRemateDate,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

  // Consignatarias by province landing pages
  const consignatariasByProvincePages: MetadataRoute.Sitemap = Object.entries(PROVINCE_SLUGS)
    .filter(([name]) => provincesWithAuctions.has(name))
    .map(([, slug]) => ({
      url: `${baseUrl}/consignatarias/${slug}`,
      lastModified: latestRemateDate,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

  // Type landing pages (/remates/tipo/invernada, etc.)
  const typePages: MetadataRoute.Sitemap = TYPE_SLUGS.map((slug) => ({
    url: `${baseUrl}/remates/tipo/${slug}`,
    lastModified: latestRemateDate,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Province + Type combo pages (/remates/cordoba/invernada, etc.)
  // Only include combinations that have auctions
  const remates = rematesData as { province: string; type?: string }[]
  const provinceTypePages: MetadataRoute.Sitemap = []
  for (const [provinceName, provinceSlug] of Object.entries(PROVINCE_SLUGS)) {
    for (const typeSlug of TYPE_SLUGS) {
      const hasAuctions = remates.some(
        (r) => r.province === provinceName && r.type?.toLowerCase() === typeSlug
      )
      if (hasAuctions) {
        provinceTypePages.push({
          url: `${baseUrl}/remates/${provinceSlug}/${typeSlug}`,
          lastModified: latestRemateDate,
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })
      }
    }
  }

  // Consignataria profile pages — SOLO las indexables. Los perfiles "thin"
  // (<2 remates y sin SEO custom) se sirven noindex; incluirlos en el sitemap
  // sería una señal contradictoria hacia Google. Mismo criterio que el `thin`
  // de generateMetadata en consignatarias/[slug]/page.tsx.
  const auctionsForSitemap = rematesData as unknown as Auction[]
  // lastmod = el remate más reciente de la firma (hasta hoy): es lo que cambia la ficha.
  const ultimoRemateDe = (slug: string) => {
    const max = getAuctionsForProfile(auctionsForSitemap, slug).reduce((m, a) => (a.date > m ? a.date : m), '')
    return max ? clampToday(max) : latestRemateDate
  }
  const consignatariaPages: MetadataRoute.Sitemap = getAllCanonicalSlugs()
    .filter((slug) => getAuctionsForProfile(auctionsForSitemap, slug).length >= 2 || getProfileSEO(slug))
    .map((slug) => ({
      url: `${baseUrl}/consignatarias/${slug}`,
      lastModified: ultimoRemateDe(slug),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

  // Calendario por consignataria (/calendario/<slug>) — las 52 páginas que ya rankean
  // SIN estar en el sitemap. Medido al 17-sep-2026: 649 impresiones y 28 clics en 28 días,
  // el doble de tráfico que las 479 fichas de /productividad. Son `webcal://`+ICS: el que
  // busca "calendario de remates de <firma>" llega y se suscribe. Se aplica el MISMO filtro
  // de thin que los perfiles: si la firma no tiene al menos 2 remates ni SEO propio, su
  // calendario tampoco tiene con qué sostener una página.
  // Y además, el mismo criterio de la página: fuera si la firma no tiene remates próximos
  // ni en los últimos 90 días (esa página va noindex).
  const calendarioPages: MetadataRoute.Sitemap = getAllCanonicalSlugs()
    .filter((slug) => getAuctionsForProfile(auctionsForSitemap, slug).length >= 2 || getProfileSEO(slug))
    .filter((slug) => calendarioIndexable(auctionsForSitemap, slug))
    .map((slug) => ({
      url: `${baseUrl}/calendario/${slug}`,
      lastModified: ultimoRemateDe(slug),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

  // Frigorificos by province landing pages
  const FRIGORIFICO_PROVINCE_SLUGS: Record<string, string> = {
    'BUENOS AIRES': 'buenos-aires',
    'SANTA FE': 'santa-fe',
    'CORDOBA': 'cordoba',
    'ENTRE RIOS': 'entre-rios',
    'LA PAMPA': 'la-pampa',
    'CHACO': 'chaco',
    'CORRIENTES': 'corrientes',
    'SANTIAGO DEL ESTERO': 'santiago-del-estero',
    'FORMOSA': 'formosa',
    'MISIONES': 'misiones',
    'TUCUMAN': 'tucuman',
    'SALTA': 'salta',
    'JUJUY': 'jujuy',
    'CATAMARCA': 'catamarca',
    'MENDOZA': 'mendoza',
    'SAN JUAN': 'san-juan',
    'SAN LUIS': 'san-luis',
    'NEUQUEN': 'neuquen',
    'RIO NEGRO': 'rio-negro',
    'CHUBUT': 'chubut',
    'SANTA CRUZ': 'santa-cruz',
    'TIERRA DEL FUEGO': 'tierra-del-fuego',
    'CIUDAD AUTONOMA DE BUENOS AIRES': 'ciudad-autonoma-de-buenos-aires',
    'LA RIOJA': 'la-rioja',
  }

  const provincesWithFrigorificos = new Set(
    (frigorificosData as { province: string }[]).map(f => f.province)
  )
  const frigorificosByProvincePages: MetadataRoute.Sitemap = Object.entries(FRIGORIFICO_PROVINCE_SLUGS)
    .filter(([name]) => provincesWithFrigorificos.has(name))
    .map(([, slug]) => ({
      url: `${baseUrl}/frigorificos/${slug}`,
      lastModified: frigorificosDate,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

  // Frigorifico detail pages
  const frigorificoPages: MetadataRoute.Sitemap = (
    frigorificosData as { cuit: string; senasaLastSeen?: string | null }[]
  ).map((f) => ({
    url: `${baseUrl}/frigorificos/${f.cuit}`,
    lastModified: f.senasaLastSeen ? new Date(f.senasaLastSeen) : frigorificosDate,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  // Individual remate detail pages (scheduled/completed only)
  // Slug format: {consignatariaSlug}-{type}-{province}-{date}
  const remateDetailPages: MetadataRoute.Sitemap = (rematesData as {
    consignatariaSlug: string
    type: string
    province: string
    date: string
    status: string
  }[])
    // 'live' es el estado del dia del remate; sin el, la ficha del dia quedaba fuera del
    // sitemap ademas de dar 404 (ver el comentario en remates/[slug]/page.tsx).
    .filter((r) => r.status === 'scheduled' || r.status === 'completed' || r.status === 'live')
    // Ventana móvil: un remate de hace más de 90 días no lo busca nadie y no puede
    // convertir, pero seguía en el sitemap para siempre —no había ningún corte temporal—.
    // Al 17-sep-2026 eran 566 fichas pasadas mudas: el 17% del sitemap gastando
    // presupuesto de rastreo que necesitan las secciones que sí aparecen. La página no se
    // borra ni se redirige: sigue viva para quien llegue por un enlace; sólo sale del
    // sitemap.
    .filter((r) => r.date >= hace90Dias)
    .map((r) => {
      const slug = remateSlug(r)
      // Un remate que todavía no ocurrió es el que contesta "¿a qué remate voy?" y es el
      // único con valor comercial. Iban todos con priority 0.5 fija, el de la semana que
      // viene igual que uno de marzo: 148 de los 213 remates futuros (69% de la agenda)
      // no tenían una sola impresión en 28 días.
      const futuro = r.date >= todayStr
      return {
        url: `${baseUrl}/remates/${slug}`,
        lastModified: clampToday(r.date),
        changeFrequency: futuro ? ('daily' as const) : ('monthly' as const),
        priority: futuro ? 0.9 : 0.3,
      }
    })

  // NOTE: /verificar pages intentionally excluded — thin form pages
  // that dilute crawl budget. They have robots noindex set.

  // Market category price pages (/mercado/terneros, etc.)
  const marketCategoryPages: MetadataRoute.Sitemap = MARKET_CATEGORY_SLUGS.map((slug) => ({
    url: `${baseUrl}/mercado/${slug}`,
    lastModified: priceDate,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  // Geo × category price pages (/precios/[categoria]/[provincia]) — long-tail. Todas:
  // en GSC rinden mejor que la página nacional (ver src/lib/precios-geo.ts).
  const preciosGeoPages: MetadataRoute.Sitemap = CATEGORIAS_GEO_SLUGS.flatMap((cat) =>
    PROVINCIAS_GEO_SLUGS.map((provSlug) => ({
      url: `${baseUrl}/precios/${cat}/${provSlug}`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  )

  // Pairwise category comparison pages (/precios/comparar/[a]-vs-[b]) — 15 canonical
  // pairs. COMPARE_ORDER must match the route's order + the middleware 308 target.
  const COMPARE_ORDER = ['novillos', 'novillitos', 'vaquillonas', 'vacas', 'toros', 'terneros']
  const preciosComparePages: MetadataRoute.Sitemap = []
  for (let i = 0; i < COMPARE_ORDER.length; i++) {
    for (let j = i + 1; j < COMPARE_ORDER.length; j++) {
      preciosComparePages.push({
        url: `${baseUrl}/precios/comparar/${COMPARE_ORDER[i]}-vs-${COMPARE_ORDER[j]}`,
        lastModified: priceDate,
        changeFrequency: 'daily' as const,
        priority: 0.6,
      })
    }
  }

  // Quality-segment pages (/precios/[categoria]/calidad/[segmento]) — only the
  // substantive (non-thin) ones; thin segments are noindex and stay out of the sitemap.
  const qualitySegmentPages: MetadataRoute.Sitemap = getQualitySegments()
    .filter((s) => s.cabezas >= CABEZAS_INDEX_THRESHOLD)
    .map((s) => ({
      url: `${baseUrl}/precios/${s.categoria}/calidad/${s.segmento}`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.5,
    }))

  // INMAG historical year pages (/mercado/inmag/[anio]) — compounding long-tail.
  // Closed years carry their true upper bound (Dec 31); the current year tracks priceDate.
  const inmagYearPages: MetadataRoute.Sitemap = aniosInmag().map((y) => ({
    url: `${baseUrl}/mercado/inmag/${y}`,
    lastModified: y < currentYear ? new Date(`${y}-12-31`) : priceDate,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // City landing pages (/remates/ciudad/[ciudad]) — solo las indexables y sin alias, con
  // la misma función que decide el robots de la página.
  const cityPages: MetadataRoute.Sitemap = slugsDeCiudades(auctionsForSitemap)
    .filter((slug) => ciudadEnSitemap(auctionsForSitemap, slug))
    .map((slug) => ({
    url: `${baseUrl}/remates/ciudad/${slug}`,
    lastModified: latestRemateDate,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // Monthly landing pages (/remates/mes/[mes]) — solo los meses sobre el umbral de la
  // página (MES_MIN_REMATES_INDEX); el resto va noindex.
  const monthPages: MetadataRoute.Sitemap = Object.keys(MESES)
    .filter((slug) => mesIndexable(auctionsForSitemap, slug))
    .map((slug) => ({
    url: `${baseUrl}/remates/mes/${slug}`,
    lastModified: latestRemateDate,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Origin (procedencia) pages (/mercado/origen/[provincia]) — exactamente los slugs que
  // genera la página (antes el sitemap emitía santiago-del-estero, que daba 404).
  const origenPages: MetadataRoute.Sitemap = getOrigenSlugs().map((slug) => ({
      url: `${baseUrl}/mercado/origen/${slug}`,
      lastModified: priceDate,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    }))

  const all = [
    ...staticPages,
    ...provincePages,
    ...consignatariasByProvincePages,
    ...typePages,
    ...provinceTypePages,
    ...consignatariaPages,
    ...calendarioPages,
    ...frigorificosByProvincePages,
    ...frigorificoPages,
    ...remateDetailPages,
    ...marketCategoryPages,
    ...preciosGeoPages,
    ...preciosComparePages,
    ...qualitySegmentPages,
    ...inmagYearPages,
    ...cityPages,
    ...monthPages,
    ...origenPages,
  ]
  // Dedupe por URL — nunca emitir un <loc> repetido (p.ej. dos remates que
  // colapsan al mismo slug). Se conserva la primera aparición.
  return Array.from(new Map(all.map((e) => [e.url, e])).values())
}
