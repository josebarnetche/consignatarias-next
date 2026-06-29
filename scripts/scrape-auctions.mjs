#!/usr/bin/env node
/**
 * Daily auction scraper for Ganado Terminal
 * Runs via GitHub Actions at 14:00 ART (17:00 UTC)
 *
 * Sources:
 *   1. CACG API (cacg.org.ar/iapi/auctions) — ~128 auctions, national coverage
 *   2. Colombo y Colombo calendar (colomboycolombo.com.ar/remates)
 *   3. O'Farrell calendar (ivanofarrell.com.ar/remates)
 *   4. Cooperativa Lehmann (cooperativalehmann.coop/hacienda/remates)
 *   5. Madelan (madelan.com.ar/proximos)
 *   6. dolarapi.com — USD blue/oficial exchange rates
 *   7. ganaderiaynegocios.com — MAG cattle prices ($/kg vivo)
 *   8. magyp.gob.ar — Corn FOB prices (USD/tn)
 *   9. UMC Haciendas Villaguay (umchv.ar/auctions/get-list) — Entre Rios, Corrientes, Buenos Aires
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { scrapeNEA } from "./scrapers/nea.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../src/lib/data");
const REMATES_PATH = resolve(DATA_DIR, "remates.json");
// Fuentes bloqueadas-en-la-nube (Rosgan, Entre Surcos) fetcheadas localmente desde
// una IP residencial AR (scripts/local-nea-fetch.mjs). Opcional; se mergea si existe.
const LOCAL_NEA_PATH = resolve(DATA_DIR, "remates-local-nea.json");
const MARKET_PATH = resolve(DATA_DIR, "market-prices.json");
const YOUTUBE_PATH = resolve(DATA_DIR, "youtube-channels.json");
const MAG_CONSIG_PATH = resolve(DATA_DIR, "mag-consignatarios.json");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJSON(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`  [WARN] ${url}: ${err.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHTML(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    console.warn(`  [WARN] ${url}: ${err.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Colapsa \r\n crudos y espacios m\u00faltiples en t\u00edtulos de remate (ej. CACG manda
// "EXPOAGRO\r\nRemate de Mercado Rosgan"). Mantiene un solo espacio.
function cleanTitle(str) {
  return (str || "").replace(/\s+/g, " ").trim();
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (y < 2024 || y > 2030) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  return true;
}

function normalizeProvince(name) {
  return (name || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\s]+$/, "")   // strip trailing dots/space (e.g. "BUENOS AIRES.")
    .replace(/\s+/g, " ")     // collapse internal whitespace
    .trim();
}

// Map CACG province IDs to our province names
const PROVINCE_MAP = {
  "1": "BUENOS AIRES",
  "2": "CATAMARCA",
  "3": "CHACO",
  "4": "CHUBUT",
  "5": "CORDOBA",
  "6": "CORRIENTES",
  "7": "ENTRE RIOS",
  "8": "FORMOSA",
  "9": "JUJUY",
  "10": "LA PAMPA",
  "11": "LA RIOJA",
  "12": "MENDOZA",
  "13": "MISIONES",
  "14": "NEUQUEN",
  "15": "RIO NEGRO",
  "16": "SALTA",
  "17": "SAN JUAN",
  "18": "SAN LUIS",
  "19": "SANTA CRUZ",
  "20": "SANTA FE",
  "21": "SANTIAGO DEL ESTERO",
  "22": "TUCUMAN",
  "23": "TIERRA DEL FUEGO",
  "24": "CAPITAL FEDERAL",
};

// City-to-province correction map — overrides bad API/curated province data
const CITY_PROVINCE_MAP = {
  // Province names used as a "city" (ambiguous in georef — e.g. "Buenos Aires"
  // resolves to "Buenos Aires Chico" in Chubut). Pin them to the obvious province.
  "BUENOS AIRES": "BUENOS AIRES",
  "CAPITAL FEDERAL": "CAPITAL FEDERAL",
  "CABA": "CAPITAL FEDERAL",
  // BUENOS AIRES
  "AYACUCHO": "BUENOS AIRES",
  "AZUL": "BUENOS AIRES",
  "BAHIA BLANCA": "BUENOS AIRES",
  "BAHÍA BLANCA": "BUENOS AIRES",
  "CARHUE": "BUENOS AIRES",
  "CASTELLI": "BUENOS AIRES",
  "CHIVILCOY": "BUENOS AIRES",
  "CORONEL BRANDSEN": "BUENOS AIRES",
  "CORONEL SUAREZ": "BUENOS AIRES",
  "DAIREAUX": "BUENOS AIRES",
  "GENERAL ALVEAR": "BUENOS AIRES",
  "GENERAL BELGRANO": "BUENOS AIRES",
  "GENERAL JUAN MADARIAGA": "BUENOS AIRES",
  "GENERAL VILLEGAS": "BUENOS AIRES",
  "LA PLATA": "BUENOS AIRES",
  "LAPRIDA": "BUENOS AIRES",
  "LAS FLORES": "BUENOS AIRES",
  "NECOCHEA": "BUENOS AIRES",
  "OLAVARRIA": "BUENOS AIRES",
  "RAUCH": "BUENOS AIRES",
  "SALADILLO": "BUENOS AIRES",
  "SALLIQUELO": "BUENOS AIRES",
  "SAN MIGUEL DEL MONTE": "BUENOS AIRES",
  "SAN NICOLAS DE LOS ARROYOS": "BUENOS AIRES",
  "SAN NICOLAS": "BUENOS AIRES",
  "SUIPACHA": "BUENOS AIRES",
  "TANDIL": "BUENOS AIRES",
  "TAPALQUE": "BUENOS AIRES",
  "VEDIA": "BUENOS AIRES",
  "VIEYTES": "BUENOS AIRES",
  "25 DE MAYO": "BUENOS AIRES",
  "WASHINGTON": "BUENOS AIRES",
  "CANUELAS": "BUENOS AIRES",
  // CORDOBA
  "RIO CUARTO": "CORDOBA",
  "SAMPACHO": "CORDOBA",
  "SAN BASILIO": "CORDOBA",
  "MARCOS JUAREZ": "CORDOBA",
  "HUINCA RENANCO": "CORDOBA",
  // CORRIENTES
  "MERCEDES": "CORRIENTES",
  "GOYA": "CORRIENTES",
  "BELLA VISTA": "CORRIENTES",
  "SAUCE": "CORRIENTES",
  "RIACHUELO": "CORRIENTES",
  "CAA CATA": "CORRIENTES",
  "CHAVARRIA": "CORRIENTES",
  // SANTA FE
  "ROSARIO": "SANTA FE",
  "LEHMANN": "SANTA FE",
  "RAFAELA": "SANTA FE",
  // ENTRE RIOS
  "VILLAGUAY": "ENTRE RIOS",
  "GUALEGUAYCHU": "ENTRE RIOS",
  "LA PAZ": "ENTRE RIOS",
  // CHACO
  "MACHAGAI": "CHACO",
  "RESISTENCIA": "CHACO",
  "PRESIDENCIA ROQUE SAENZ PENA": "CHACO",
  "MARGARITA BELEN": "CHACO",
  // SANTIAGO DEL ESTERO
  "CAMPO GALLO": "SANTIAGO DEL ESTERO",
  // LA PAMPA
  "SANTA ROSA": "LA PAMPA",
  "GENERAL PICO": "LA PAMPA",
  // SAN LUIS
  "VILLA MERCEDES": "SAN LUIS",
  // FORMOSA
  "FORMOSA": "FORMOSA",
};

// Venues whose scraped "city" is actually a fairgrounds/venue, not a locality.
// CACG manda building_name "PALERMO" (La Rural, Predio Ferial de Palermo, CABA)
// con un state_id equivocado (2 = Catamarca) → quedaba "PALERMO, CATAMARCA".
const VENUE_FIX = {
  "PALERMO": { location: "La Rural, Palermo", province: "CAPITAL FEDERAL" },
  "LA RURAL": { location: "La Rural, Palermo", province: "CAPITAL FEDERAL" },
};

/**
 * Correct province based on city name.
 * Overrides bad API or curated province assignments.
 */
function correctProvince(auction) {
  const rawCity = (auction.location || "").split(",")[0].trim();
  const city = rawCity.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Venue override (La Rural / Palermo): el nombre es una sede, no una localidad.
  const venue = VENUE_FIX[city];
  if (venue) {
    if (auction.province !== venue.province || auction.location !== venue.location) {
      console.log(`  [VENUE] ${rawCity}: ${auction.province} → ${venue.location} (${venue.province})`);
      auction.province = venue.province;
      auction.location = venue.location;
    }
    return;
  }

  const correctProv = CITY_PROVINCE_MAP[city];
  if (correctProv && correctProv !== auction.province) {
    console.log(`  [FIX] ${rawCity}: ${auction.province} → ${correctProv}`);
    auction.province = correctProv;
    auction.location = `${rawCity}, ${correctProv}`;
  }
}

// ---------------------------------------------------------------------------
// Province resolver — provincia por LOCALIDAD del evento (no por la consignataria).
// Orden: VENUE_FIX → CITY_PROVINCE_MAP (curado, maneja ambiguos: Mercedes→Corrientes)
//        → cache local (georef) → georef live → fallback provincia del feed.
// Corrige el geo-leak: ferias en pueblos no mapeados caían a la provincia del feed.
// ---------------------------------------------------------------------------
const LOCALITY_CACHE_PATH = resolve(__dirname, "data", "locality-province.json");
let LOCALITY_CACHE = {};
try { LOCALITY_CACHE = JSON.parse(readFileSync(LOCALITY_CACHE_PATH, "utf-8")); } catch { LOCALITY_CACHE = {}; }

function normCity(location) {
  return (location || "").split(",")[0].trim().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\.$/, "").trim();
}

async function georefProvince(city) {
  try {
    const url = `https://apis.datos.gob.ar/georef/api/localidades?nombre=${encodeURIComponent(city)}&campos=provincia&max=1`;
    const r = await fetch(url);
    const d = await r.json();
    const prov = d?.localidades?.[0]?.provincia?.nombre;
    return prov ? normalizeProvince(prov) : null;
  } catch { return null; }
}

/**
 * Resuelve la provincia de cada subasta por la localidad del evento.
 * Pre-resuelve las localidades nuevas con georef (cachea), después aplica sync.
 */
async function enrichProvinces(auctions) {
  const unique = [...new Set(auctions.map((a) => normCity(a.location)).filter(Boolean))];
  let resolved = 0;
  for (const city of unique) {
    if (VENUE_FIX[city] || CITY_PROVINCE_MAP[city] || LOCALITY_CACHE[city]) continue;
    const prov = await georefProvince(city);
    if (prov) { LOCALITY_CACHE[city] = prov; resolved++; }
    await new Promise((z) => setTimeout(z, 60));
  }
  if (resolved > 0) {
    try { writeFileSync(LOCALITY_CACHE_PATH, JSON.stringify(LOCALITY_CACHE, null, 2) + "\n"); } catch {}
  }
  for (const a of auctions) {
    const city = normCity(a.location);
    if (!city) continue;
    const venue = VENUE_FIX[city];
    if (venue) {
      if (a.province !== venue.province) a.province = venue.province;
      a.location = venue.location;
      continue;
    }
    const prov = CITY_PROVINCE_MAP[city] || LOCALITY_CACHE[city];
    if (prov && prov !== a.province) {
      console.log(`  [GEO] ${a.location}: ${a.province} → ${prov}`);
      a.province = prov;
    }
  }
  console.log(`  Georef: ${resolved} localidades nuevas resueltas (cache: ${Object.keys(LOCALITY_CACHE).length})`);
}

// ---------------------------------------------------------------------------
// Source 9: Entre Surcos y Corrales (cartelera HTML estática)
// Trae provincia/localidad/cabezas/hora/logo por evento. La consignataria viene
// solo como logo → se resuelve por filename a nombre canónico.
// ---------------------------------------------------------------------------
const ENTRESURCOS_LOGO = {
  // filename del logo → nombre canónico de consignataria (para que dedupee con CACG)
  "22_colombo_y_maliagno": "Colombo y Magliano S.A.",
  "47_vitori": "Consignataria Vittori",
  "550_gananor": "Gananor Pujol",
  "20_irey": "Pedro Noel Irey S.R.L.",
  "333_martin-g-lalor": "Martín G. Lalor",
  "90_hourcade": "Hourcade Albelo y Cía.",
  "94_sivero": "Sivero y Cía. S.A.",
  "37_campos-y-ganados": "Campos y Ganados",
  "110_casalago": "Casalago",
  "logo_belisario_castillo": "Belisario Castillo",
  "lartirigoyen": "Lartirigoyen",
  "15_madelan": "Madelán y Cía.",
  "93_sucesores-de-brivio": "Sucesores de Brivio",
  "353_orella": "Orella",
  "108_arribere": "Arribere",
  "293_oregui": "Oregui",
  "518_brivio_y_arzoz": "Brivio y Arzoz",
  "81_a-mendizabal": "A. Mendizábal",
  "gregorio_aberasturi_srl": "Gregorio Aberasturi S.R.L.",
};
// logos sin nombre usable → se omite la pieza (no inventamos consignataria)
const ENTRESURCOS_SKIP = ["585_lote-21", "42_44", "118_sin-titulo-1", "mag"];

function entresurcosName(logo) {
  if (!logo) return null;
  const base = logo.replace(/\.[a-z]+$/i, "").toLowerCase();
  if (ENTRESURCOS_SKIP.some((s) => base.startsWith(s) || base === s)) return null;
  // match por prefijo conocido
  for (const [k, v] of Object.entries(ENTRESURCOS_LOGO)) {
    if (base.startsWith(k) || base === k) return v;
  }
  // heurística: limpiar id_ y sufijos
  const n = base.replace(/^logo[_-]?/, "").replace(/^\d+[_-]/, "")
    .replace(/[_-]?(copia|sin[- ]?fondo|ok+|final|nuevo|20\d\d)\b.*$/g, "")
    .replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!n || n.length < 4 || /^\d+$/.test(n)) return null;
  return n.replace(/\b\w/g, (c) => c.toUpperCase());
}

const ENTRESURCOS_TYPE = {
  invernada: "invernada", cria: "cria", "cría": "cria",
  reproductores: "reproductores", general: "general",
  televisado: "general", internet: "general", virtual: "general", faena: "general",
};

export async function scrapeEntreSurcos() {
  console.log("[9/9] Scraping Entre Surcos y Corrales...");
  const html = await fetchHTML("https://www.entresurcosycorrales.com/iframe_cartelera.php");
  if (!html) return [];
  const lis = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => m[1]);
  const out = [];
  for (const li of lis) {
    const dm = li.match(/class="fecha">\s*(\d{2})\/(\d{2})\/(\d{4})/);
    if (!dm) continue;
    const date = `${dm[3]}-${dm[2]}-${dm[1]}`;
    const logo = (li.match(/consignatarios\/([^"]+)/) || [])[1] || null;
    const name = entresurcosName(logo);
    if (!name) continue; // sin consignataria identificable → no la inventamos
    const lugarRaw = (li.match(/class="lugar">([\s\S]*?)<\/p>/) || [])[1] || "";
    const localidad = ((lugarRaw.match(/<strong>([\s\S]*?)<\/strong>/) || [])[1] || "").replace(/<[^>]+>/g, "").replace(/\.$/, "").trim();
    if (!localidad) continue;
    const lugarText = lugarRaw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const hm = lugarText.match(/(\d{1,2})[.:](\d{2})\s*h/i);
    const time = hm ? `${hm[1].padStart(2, "0")}:${hm[2]}` : null;
    const iconTitle = ((li.match(/title=([A-Za-zÁÉÍÓÚáéíóú]+)/) || [])[1] || "").toLowerCase();
    const cabezasRaw = ((li.match(/class="cabezas">([\s\S]*?)<\/p>/) || [])[1] || "").replace(/<[^>]+>/g, "").trim();
    const estimatedHeads = /^[\d.]+$/.test(cabezasRaw) ? parseInt(cabezasRaw.replace(/\./g, ""), 10) || null : null;
    out.push({
      title: lugarText.replace(localidad, "").trim() || "Remate",
      consignatariaName: name,
      consignatariaSlug: slugify(name),
      date,
      time,
      location: `${localidad}, ${(li.match(/class="provincia">([\s\S]*?)<\/p>/) || [])[1]?.replace(/<[^>]+>/g, "").replace(/\.$/, "").trim() || ""}`.replace(/, $/, ""),
      province: normalizeProvince((li.match(/class="provincia">([\s\S]*?)<\/p>/) || [])[1]?.replace(/<[^>]+>/g, "") || ""),
      type: ENTRESURCOS_TYPE[iconTitle] || mapAuctionType(iconTitle, lugarText),
      mainCategory: mapMainCategory(lugarText),
      estimatedHeads,
      description: lugarText,
      youtubeUrl: null,
      catalogUrl: null,
      source: "web",
      sourceUrl: "https://www.entresurcosycorrales.com",
      liveLink: null,
    });
  }
  console.log(`  Entre Surcos: ${out.length} remates`);
  return out;
}

// Map auction_mode to our type
function mapAuctionType(mode, title) {
  const lower = (title || "").toLowerCase();
  if (lower.includes("invernada")) return "invernada";
  if (lower.includes("cria") || lower.includes("cría")) return "cria";
  if (
    lower.includes("reproductor") ||
    lower.includes("toro") ||
    lower.includes("cabaña") ||
    lower.includes("genética")
  )
    return "reproductores";
  if (
    lower.includes("especial") ||
    lower.includes("expo") ||
    lower.includes("fiesta")
  )
    return "especial";
  return "general";
}

function mapMainCategory(title) {
  const lower = (title || "").toLowerCase();
  if (lower.includes("ternero")) return "terneros";
  if (lower.includes("novill")) return "novillos";
  if (lower.includes("vaca gorda") || lower.includes("gordo")) return "vaca_gorda";
  if (lower.includes("vaquillona")) return "vaquillonas";
  if (lower.includes("toro") || lower.includes("reproductor")) return "toros";
  return "mixto";
}

// ---------------------------------------------------------------------------
// Source 1: CACG API
// ---------------------------------------------------------------------------

async function scrapeCACG() {
  console.log("[1/8] Scraping CACG API...");
  const data = await fetchJSON("https://cacg.org.ar/iapi/auctions");
  if (!data?.dataset?.rows) return [];

  return data.dataset.rows
    .filter((r) => r.auction_is_disabled !== "1")
    .map((r) => {
      const rawProvince =
        PROVINCE_MAP[r.state_id] ||
        (r.state_name || "").toUpperCase() ||
        "BUENOS AIRES";
      const city = r.city_name || r.building_name || "";
      const cityNorm = city.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const province = CITY_PROVINCE_MAP[cityNorm] || rawProvince;
      const location = city ? `${city}, ${province}` : province;

      return {
        title: cleanTitle(r.auction_title) || "Remate",
        consignatariaName: r.company_name || "Sin consignataria",
        consignatariaSlug: slugify(r.company_name || "sin-consignataria"),
        date: r.auction_date,
        time: r.auction_time && r.auction_time !== "00:00" ? r.auction_time.slice(0, 5) : null,
        location,
        province,
        type: mapAuctionType(r.auction_mode, r.auction_title),
        mainCategory: mapMainCategory(r.auction_title),
        estimatedHeads: r.auction_heads ? parseInt(r.auction_heads, 10) || null : null,
        description: [r.auction_notes, r.auction_breed, r.auction_destination]
          .filter(Boolean)
          .join(". ") || r.auction_title,
        youtubeUrl: null,
        catalogUrl: null,
        source: "web",
        sourceUrl: r.www || "https://cacg.org.ar/remates",
        liveLink: r.live_link || null,
      };
    });
}

// ---------------------------------------------------------------------------
// Source 2: Colombo y Colombo (HTML scrape)
// ---------------------------------------------------------------------------

async function scrapeColombo() {
  console.log("[2/8] Scraping Colombo y Colombo...");
  const html = await fetchHTML("https://www.colomboycolombo.com.ar/remates");
  if (!html) return [];

  const auctions = [];
  // Extract dates from CSS classes: month_XX_ar, day, year
  const dayMatches = [...html.matchAll(/class="day">(\d+)/g)];
  const monthMatches = [...html.matchAll(/month_(\d{2})_ar/g)];
  const yearMatches = [...html.matchAll(/class="year">(\d{4})/g)];
  const titleMatches = [...html.matchAll(/class="event-title[^"]*"[^>]*>([^<]+)/gi)];
  const locationMatches = [...html.matchAll(/class="event-location[^"]*"[^>]*>([^<]+)/gi)];

  const count = Math.min(dayMatches.length, monthMatches.length, yearMatches.length);

  for (let i = 0; i < count; i++) {
    const day = dayMatches[i][1].padStart(2, "0");
    const month = monthMatches[i][1];
    const year = yearMatches[i][1];
    const date = `${year}-${month}-${day}`;
    const title = titleMatches[i]?.[1]?.trim() || "Remate CyC";
    const location = locationMatches[i]?.[1]?.trim() || "Buenos Aires";

    const province = location.toLowerCase().includes("santa fe")
      ? "SANTA FE"
      : location.toLowerCase().includes("corrientes")
      ? "CORRIENTES"
      : location.toLowerCase().includes("rosario")
      ? "SANTA FE"
      : "BUENOS AIRES";

    auctions.push({
      title,
      consignatariaName: "Colombo y Colombo SA",
      consignatariaSlug: "colombo-y-colombo",
      date,
      time: null,
      location,
      province,
      type: title.toLowerCase().includes("rosgan") ? "general" : "especial",
      mainCategory: "mixto",
      estimatedHeads: null,
      description: title,
      youtubeUrl: null,
      catalogUrl: null,
      source: "web",
      sourceUrl: "https://www.colomboycolombo.com.ar/remates",
    });
  }

  console.log(`  Found ${auctions.length} CyC auctions`);
  return auctions;
}

// ---------------------------------------------------------------------------
// Source 3: O'Farrell (HTML scrape)
// ---------------------------------------------------------------------------

async function scrapeOFarrell() {
  console.log("[3/8] Scraping O'Farrell...");
  const html = await fetchHTML("https://www.ivanofarrell.com.ar/remates");
  if (!html) return [];

  const auctions = [];
  // Look for date patterns like DD/MM/YYYY or YYYY-MM-DD
  const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g;
  let match;
  const seen = new Set();

  while ((match = datePattern.exec(html)) !== null) {
    const [, d, m, y] = match;
    const date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    if (seen.has(date) || date < todayISO()) continue;
    seen.add(date);

    // Try to extract context around the match
    const start = Math.max(0, match.index - 200);
    const end = Math.min(html.length, match.index + 200);
    const context = html.slice(start, end).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    const isTv = context.toLowerCase().includes("televisado");
    const location = context.toLowerCase().includes("machagai")
      ? "Machagai, Chaco"
      : context.toLowerCase().includes("san martin") || context.toLowerCase().includes("zapallar")
      ? "Gral. San Martín, Chaco"
      : context.toLowerCase().includes("santa sylvina")
      ? "Santa Sylvina, Chaco"
      : context.toLowerCase().includes("campo gallo")
      ? "Campo Gallo, Santiago del Estero"
      : "Chaco";

    auctions.push({
      title: isTv ? "Remate Televisado O'Farrell" : "Remate General O'Farrell",
      consignatariaName: "Ivan L. O'Farrell Consignataria",
      consignatariaSlug: "ofarrell",
      date,
      time: "14:00",
      location,
      province: location.includes("Santiago") ? "SANTIAGO DEL ESTERO" : "CHACO",
      type: "general",
      mainCategory: "mixto",
      estimatedHeads: isTv ? 5500 : null,
      description: isTv
        ? "Remate Televisado por Canal Rural"
        : "Remate general presencial y streaming",
      youtubeUrl: null,
      catalogUrl: null,
      source: "web",
      sourceUrl: "https://www.ivanofarrell.com.ar/remates",
    });
  }

  console.log(`  Found ${auctions.length} O'Farrell auctions`);
  return auctions;
}

// ---------------------------------------------------------------------------
// Source 4: Cooperativa Lehmann (HTML scrape)
// ---------------------------------------------------------------------------

async function scrapeLehmann() {
  console.log("[4/8] Scraping Cooperativa Lehmann...");
  const html = await fetchHTML(
    "https://www.cooperativalehmann.coop/hacienda/remates"
  );
  if (!html) return [];

  const auctions = [];
  const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g;
  let match;
  const seen = new Set();

  while ((match = datePattern.exec(html)) !== null) {
    const [, d, m, y] = match;
    const date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    if (seen.has(date) || date < todayISO()) continue;
    seen.add(date);

    const start = Math.max(0, match.index - 300);
    const end = Math.min(html.length, match.index + 300);
    const context = html.slice(start, end).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    // Try to extract location from context
    const cities = [
      "Rafaela", "Esperanza", "Emilia", "Felicia", "Helvecia",
      "Progreso", "Pilar", "Suardi", "Romang", "San Agustin",
      "Sarmiento", "Centeno", "Santo Domingo",
    ];
    const city = cities.find((c) => context.includes(c)) || "Santa Fe";

    auctions.push({
      title: "Remate Feria Lehmann",
      consignatariaName: "Cooperativa Guillermo Lehmann",
      consignatariaSlug: "coop-lehmann",
      date,
      time: null,
      location: `${city}, Santa Fe`,
      province: "SANTA FE",
      type: "general",
      mainCategory: "mixto",
      estimatedHeads: null,
      description: "Remate feria de abasto e invernada",
      youtubeUrl: null,
      catalogUrl: null,
      source: "web",
      sourceUrl: "https://www.cooperativalehmann.coop/hacienda/remates",
    });
  }

  console.log(`  Found ${auctions.length} Lehmann auctions`);
  return auctions;
}

// ---------------------------------------------------------------------------
// Source 5: Madelan (HTML scrape)
// ---------------------------------------------------------------------------

async function scrapeMadelan() {
  console.log("[5/8] Scraping Madelan...");
  const html = await fetchHTML("https://www.madelan.com.ar/proximos");
  if (!html) return [];

  const auctions = [];
  const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g;
  let match;
  const seen = new Set();

  while ((match = datePattern.exec(html)) !== null) {
    const [, d, m, y] = match;
    const date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    if (seen.has(date) || date < todayISO()) continue;
    seen.add(date);

    const start = Math.max(0, match.index - 300);
    const end = Math.min(html.length, match.index + 300);
    const context = html.slice(start, end).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    const headsMatch = context.match(/(\d[\d.]+)\s*(?:cab|cabezas)/i);
    const heads = headsMatch ? parseInt(headsMatch[1].replace(/\./g, ""), 10) : null;

    auctions.push({
      title: "Remate Madelan",
      consignatariaName: "Madelan SA",
      consignatariaSlug: "madelan",
      date,
      time: null,
      location: "NEA",
      province: "CHACO",
      type: "general",
      mainCategory: "mixto",
      estimatedHeads: heads,
      description: "Remate por internet y streaming",
      youtubeUrl: null,
      catalogUrl: null,
      source: "web",
      sourceUrl: "https://www.madelan.com.ar/proximos",
    });
  }

  console.log(`  Found ${auctions.length} Madelan auctions`);
  return auctions;
}

// ---------------------------------------------------------------------------
// Source: HK Agro SRL (hkagrosrl.com.ar) — Curuzú Cuatiá, Corrientes (NEA).
// Remate dates show on the homepage slider as Spanish "Mmm DD, YYYY" text.
// ---------------------------------------------------------------------------
async function scrapeHKAgro() {
  console.log("[+] Scraping HK Agro...");
  const html = await fetchHTML("https://hkagrosrl.com.ar/");
  if (!html) return [];

  const MONTHS = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12 };
  const re = /\b(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s+(\d{1,2}),?\s+(\d{4})/gi;
  const auctions = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    const mo = MONTHS[m[1].toLowerCase()];
    if (!mo) continue;
    const date = `${m[3]}-${String(mo).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
    if (seen.has(date) || date < todayISO()) continue;
    seen.add(date);
    auctions.push({
      title: "Remate HK Agro",
      consignatariaName: "HK Agro SRL",
      consignatariaSlug: "hk-agro",
      date,
      time: null,
      location: "Corrientes",
      province: "CORRIENTES",
      type: "general",
      mainCategory: "mixto",
      estimatedHeads: null,
      description: "Remate por pantalla e internet",
      youtubeUrl: null,
      catalogUrl: null,
      source: "web",
      sourceUrl: "https://hkagrosrl.com.ar/",
    });
  }

  console.log(`  Found ${auctions.length} HK Agro auctions`);
  return auctions;
}

// ---------------------------------------------------------------------------
// Source 9: UMC Haciendas Villaguay (umchv.ar)
// ---------------------------------------------------------------------------

async function scrapeUMCHV() {
  console.log("[9/9] Scraping UMC Haciendas Villaguay...");
  const year = new Date().getFullYear();
  const html = await fetchHTML(`https://umchv.ar/auctions/get-list?year=${year}`);
  if (!html) return [];

  const auctions = [];

  // Month abbreviations used by the site: "En." "Feb." "Mar." etc.
  const monthAbbr = {
    "en": "01", "feb": "02", "mar": "03", "abr": "04",
    "may": "05", "jun": "06", "jul": "07", "ago": "08",
    "sep": "09", "oct": "10", "nov": "11", "dic": "12",
  };

  // Extract auction blocks: each has <h5><a href="...">Title</a></h5> followed by <h6> tags
  const blocks = html.split(/<h5>/gi).slice(1); // split on <h5>, skip preamble

  for (const block of blocks) {
    // Title
    const titleMatch = block.match(/<a[^>]*>([^<]+)<\/a>/i);
    const title = titleMatch ? titleMatch[1].trim() : "Remate UMC";

    // URL
    const urlMatch = block.match(/href="(\/auctions\/view\/[^"]+)"/i);
    const auctionUrl = urlMatch ? `https://umchv.ar${urlMatch[1]}` : "https://umchv.ar/auctions";

    // Date + time from <h6>: pattern like "Vie 09 En. 26 14:00hs"
    const dateMatch = block.match(/(\d{1,2})\s+([\wáéíóú]+)\.?\s+(\d{2})\s+(\d{1,2}:\d{2})/i);
    if (!dateMatch) continue;

    const [, day, monthStr, yr, time] = dateMatch;
    const monthKey = monthStr.toLowerCase().replace(".", "").slice(0, 3);
    const month = monthAbbr[monthKey];
    if (!month) continue;

    const fullYear = parseInt(yr, 10) < 50 ? `20${yr}` : `19${yr}`;
    const date = `${fullYear}-${month}-${day.padStart(2, "0")}`;
    if (!isValidDate(date)) continue;

    // Location: look for "Soc Rural de X" or city names in the block text
    const cleanText = block.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    let location = "Villaguay, Entre Rios";
    let province = "ENTRE RIOS";

    if (/mercedes/i.test(cleanText)) {
      location = "Mercedes, Corrientes";
      province = "CORRIENTES";
    } else if (/goya/i.test(cleanText)) {
      location = "Goya, Corrientes";
      province = "CORRIENTES";
    } else if (/corrientes/i.test(cleanText) && !/villaguay/i.test(cleanText)) {
      location = "Corrientes, Corrientes";
      province = "CORRIENTES";
    } else if (/san\s*nicol[áa]s/i.test(cleanText)) {
      location = "San Nicolas, Buenos Aires";
      province = "BUENOS AIRES";
    } else if (/rosario\s*del\s*tala/i.test(cleanText)) {
      location = "Rosario del Tala, Entre Rios";
    } else if (/villaguay/i.test(cleanText)) {
      location = "Villaguay, Entre Rios";
    }

    const isTv = /\btv\b/i.test(title);

    auctions.push({
      title: `UMC HV — ${title}`,
      consignatariaName: "UMC SA - Haciendas Villaguay SRL",
      consignatariaSlug: "umc-haciendas-villaguay",
      date,
      time: time || null,
      location,
      province,
      type: isTv ? "especial" : "general",
      mainCategory: "mixto",
      estimatedHeads: null,
      description: isTv
        ? "Remate televisado UMC Haciendas Villaguay"
        : "Remate feria UMC Haciendas Villaguay",
      youtubeUrl: null,
      catalogUrl: null,
      source: "web",
      sourceUrl: auctionUrl,
    });
  }

  console.log(`  Found ${auctions.length} UMC HV auctions`);
  return auctions;
}

// ---------------------------------------------------------------------------
// Source 7: Cattle prices from MAG (ganaderiaynegocios.com)
// ---------------------------------------------------------------------------

async function scrapeCattlePrices() {
  console.log("[7/8] Scraping INMAG from mercadoagroganadero.com.ar...");

  // Same source as cattle-tracker: the official MAG hacienda report
  // Requires date range parameters to get historical data
  const now = new Date();
  const endDate = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;
  // Start 60 days back to get enough data for the series
  const startD = new Date(now);
  startD.setDate(startD.getDate() - 60);
  const startDate = `${startD.getDate().toString().padStart(2, "0")}/${(startD.getMonth() + 1).toString().padStart(2, "0")}/${startD.getFullYear()}`;

  const MAG_URL = `https://www.mercadoagroganadero.com.ar/dll/hacienda2.dll/haciinfo000011?txtFECHAINI=${startDate}&txtFECHAFIN=${endDate}&CP=&LISTADO=SI`;
  const html = await fetchHTML(MAG_URL);
  if (!html) return null;

  // Parse table rows: columns are Fecha | Cabezas | Importe | INMAG
  const records = [];
  const tableRows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  for (const row of tableRows) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()
    );

    if (cells.length >= 4) {
      const fechaStr = cells[0];
      // Parse Argentine number format: dots are thousands, commas are decimals
      const parseNum = (s) => {
        const cleaned = s.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
        return parseFloat(cleaned) || 0;
      };

      const cabezas = parseNum(cells[1]);
      const inmag = parseNum(cells[3]);

      // Validate: must have a date pattern, reasonable INMAG (100-50000), cabezas > 0
      // Skip rows with "Falta Cerrar", "- *", "TOTAL", "totales"
      const dateMatch = fechaStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      const inmagStr = cells[3];
      if (dateMatch && inmag > 100 && inmag < 50000 && cabezas > 0 &&
          !fechaStr.includes("TOTAL") && !fechaStr.toLowerCase().includes("totales") &&
          !inmagStr.includes("Falta") && !inmagStr.includes("- *")) {
        const [, day, month, year] = dateMatch;
        const fecha = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        records.push({ fecha, cabezas, inmag });
      }
    }
  }

  if (records.length === 0) {
    console.warn("  [WARN] No INMAG records found from MAG site");
    return null;
  }

  // Sort by date descending, take the latest entry as current INMAG
  records.sort((a, b) => b.fecha.localeCompare(a.fecha));
  const latest = records[0];

  console.log(`  Found ${records.length} MAG records, latest: ${latest.fecha} INMAG=${latest.inmag.toFixed(2)}`);

  // Return the INMAG value and full records for historical series
  return {
    inmag: Math.round(latest.inmag * 100) / 100,
    date: latest.fecha,
    records, // all records for series building
  };
}

// ---------------------------------------------------------------------------
// Source 8: Corn FOB price from MAGYP
// ---------------------------------------------------------------------------

async function scrapeCornPrice() {
  console.log("[8/8] Fetching corn FOB price from MAGYP...");

  // Try today, then yesterday (API may not have today's data yet)
  for (let daysBack = 0; daysBack <= 1; daysBack++) {
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    const dateStr = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    const url = `https://www.magyp.gob.ar/sitio/areas/ss_mercados_agropecuarios/ws/ssma/precios_fob.php?Fecha=${dateStr}`;

    const data = await fetchJSON(url);
    if (!data?.posts || data.posts.length === 0) continue;

    // Filter for maíz positions (HS 1005 = maize)
    const cornPrices = data.posts
      .filter((p) => p.posicion && p.posicion.startsWith("1005"))
      .map((p) => parseFloat(p.precio))
      .filter((p) => p > 0);

    if (cornPrices.length === 0) continue;

    const avg = Math.round(
      (cornPrices.reduce((a, b) => a + b, 0) / cornPrices.length) * 100
    ) / 100;

    console.log(
      `  Corn FOB (${dateStr}): ${cornPrices.length} positions, avg $${avg} USD/tn`
    );
    return avg;
  }

  console.warn("  [WARN] Could not fetch corn prices");
  return null;
}

// ---------------------------------------------------------------------------
// Source 9: Per-category prices from MAG (Insight #87)
// Real observed prices instead of synthetic INMAG ratios
// ---------------------------------------------------------------------------

async function scrapeCategoryPrices() {
  console.log("[9/9] Scraping category prices from mercadoagroganadero.com.ar...");

  // Fetch yesterday's data (today might not be available yet if market hasn't closed)
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const dateStr = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
  
  const url = `https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000002?txtFECHAINI=${dateStr}&txtFECHAFIN=${dateStr}&CP=&LISTADO=SI`;
  const html = await fetchHTML(url);
  if (!html) return null;

  // Parse HTML table to extract category subtotals
  // Categories we care about: NOVILLOS, NOVILLITOS, VAQUILLONAS, VACAS, TOROS
  // Each has subcategories, we want the subtotal row (weighted average)
  const categories = {};
  
  // Extract table rows
  const tableMatch = html.match(/<Table[^>]*class="table[^"]*"[^>]*>([\s\S]*?)<\/Table>/i);
  if (!tableMatch) {
    console.warn("  [WARN] No category price table found");
    return null;
  }

  const rows = tableMatch[0].match(/<TR[^>]*>([\s\S]*?)<\/TR>/gi) || [];
  
  // Track current main category to associate subtotals
  let currentMainCategory = null;
  const mainCategories = ['NOVILLOS', 'NOVILLITOS', 'VAQUILLONAS', 'VACAS', 'TOROS'];
  
  for (const row of rows) {
    const cells = [...row.matchAll(/<T[DH][^>]*>([\s\S]*?)<\/T[DH]>/gi)].map((m) =>
      m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()
    );
    
    if (cells.length < 4) continue;
    
    const firstCell = cells[0].toUpperCase();
    
    // Check if this is a main category header row
    for (const cat of mainCategories) {
      if (firstCell.includes(cat) && !firstCell.includes('-------')) {
        currentMainCategory = cat;
        break;
      }
    }
    
    // Subtotal rows have empty first cell and the average price in position 3
    // They appear right after the dashed separator
    if (cells[0] === '' && cells[2] === '' && cells[3] && cells[3].match(/^\d/)) {
      // This is a subtotal row
      const avgPrice = parseFloat(cells[3].replace(/\./g, '').replace(',', '.')) || 0;
      const cabezas = parseInt(cells[5]?.replace(/\./g, '').replace(/[^\d]/g, '') || '0', 10);
      
      if (currentMainCategory && avgPrice > 100 && avgPrice < 20000) {
        // Map to our category keys
        const keyMap = {
          'NOVILLOS': 'novillos',
          'NOVILLITOS': 'novillitos',
          'VAQUILLONAS': 'vaquillonas',
          'VACAS': 'vacas',
          'TOROS': 'toros',
        };
        const key = keyMap[currentMainCategory];
        if (key) {
          categories[key] = {
            current: Math.round(avgPrice * 100) / 100,
            cabezas: cabezas,
          };
          console.log(`  ${currentMainCategory}: $${avgPrice.toFixed(2)}/kg (${cabezas} cabezas)`);
        }
        // Reset to avoid double-counting
        currentMainCategory = null;
      }
    }
  }

  const found = Object.keys(categories).length;
  if (found === 0) {
    console.warn("  [WARN] No category subtotals parsed");
    return null;
  }

  console.log(`  Found ${found} category prices from MAG`);
  return { categories, date: dateStr };
}

// ---------------------------------------------------------------------------
// Source 10: Province Entry from MAG (haciinfo000003)
// Shows daily cattle entry by province for market share analysis
// ---------------------------------------------------------------------------

async function scrapeProvinceEntry() {
  console.log("[10/12] Scraping province entry from MAG (haciinfo000003)...");

  const url = "https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000003";
  const html = await fetchHTML(url);
  if (!html) return null;

  const tableMatch = html.match(/<Table[^>]*class="table[^"]*"[^>]*>([\s\S]*?)<\/Table>/i);
  if (!tableMatch) {
    console.warn("  [WARN] No province entry table found");
    return null;
  }

  const rows = tableMatch[0].match(/<TR[^>]*>([\s\S]*?)<\/TR>/gi) || [];
  const provinces = [];
  let totalCabezas = 0;

  for (const row of rows) {
    const cells = [...row.matchAll(/<T[DH][^>]*>([\s\S]*?)<\/T[DH]>/gi)].map((m) =>
      m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()
    );

    if (cells.length < 5) continue;
    
    // Skip header row
    if (cells[0].toLowerCase() === "provincia") continue;
    // Skip totals row
    if (cells[0].toLowerCase() === "totales") {
      totalCabezas = parseInt(cells[4]?.replace(/\./g, "").replace(/[^\d]/g, "") || "0", 10);
      continue;
    }

    const enPie = parseInt(cells[1]?.replace(/\./g, "").replace(/[^\d]/g, "") || "0", 10);
    const total = parseInt(cells[4]?.replace(/\./g, "").replace(/[^\d]/g, "") || "0", 10);
    const percentage = parseFloat(cells[5]?.replace(",", ".").replace("%", "") || "0");

    if (total > 0) {
      provinces.push({
        province: cells[0].trim(),
        enPie,
        total,
        percentage,
      });
    }
  }

  if (provinces.length === 0) {
    console.warn("  [WARN] No province data parsed");
    return null;
  }

  // Sort by percentage (market share)
  provinces.sort((a, b) => b.percentage - a.percentage);

  console.log(`  Found ${provinces.length} provinces, total: ${totalCabezas} cabezas`);
  provinces.slice(0, 5).forEach((p) => {
    console.log(`    ${p.province}: ${p.total} cabezas (${p.percentage}%)`);
  });

  return { provinces, totalCabezas, date: todayISO() };
}

// ---------------------------------------------------------------------------
// Source 11: Consignatario Entry from MAG (haciinfo000006)
// Shows daily cattle entry by consignatario - useful when they have auctions
// ---------------------------------------------------------------------------

async function scrapeConsignatarioEntry() {
  console.log("[11/12] Scraping consignatario entry from MAG (haciinfo000006)...");

  // Fetch today's data
  const d = new Date();
  const dateStr = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
  
  const url = `https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000006?txtFECHAINI=${dateStr}&txtFECHAFIN=${dateStr}&CP=&LISTADO=SI`;
  const html = await fetchHTML(url);
  if (!html) return null;

  const tableMatch = html.match(/<Table[^>]*class="table[^"]*"[^>]*>([\s\S]*?)<\/Table>/i);
  if (!tableMatch) {
    console.warn("  [WARN] No consignatario entry table found");
    return null;
  }

  const rows = tableMatch[0].match(/<TR[^>]*>([\s\S]*?)<\/TR>/gi) || [];
  const entries = [];

  for (const row of rows) {
    const cells = [...row.matchAll(/<T[DH][^>]*>([\s\S]*?)<\/T[DH]>/gi)].map((m) =>
      m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()
    );

    if (cells.length < 7) continue;
    
    // Skip header row
    if (cells[0].toLowerCase() === "remitente") continue;
    // Skip totals row
    if (cells[0].toLowerCase() === "totales") continue;

    const total = parseInt(cells[6]?.replace(/\./g, "").replace(/[^\d]/g, "") || "0", 10);

    if (total > 0 && cells[0]) {
      entries.push({
        remitente: cells[0].trim(),
        localidad: cells[1]?.trim() || "",
        provincia: cells[2]?.trim() || "",
        enPie: parseInt(cells[3]?.replace(/\./g, "").replace(/[^\d]/g, "") || "0", 10),
        muertos: parseInt(cells[4]?.replace(/\./g, "").replace(/[^\d]/g, "") || "0", 10),
        caidos: parseInt(cells[5]?.replace(/\./g, "").replace(/[^\d]/g, "") || "0", 10),
        total,
      });
    }
  }

  if (entries.length === 0) {
    console.log("  No consignatario entry data for today (market may be closed)");
    return null;
  }

  // Sort by total cabezas
  entries.sort((a, b) => b.total - a.total);

  console.log(`  Found ${entries.length} consignatario entries`);
  entries.slice(0, 5).forEach((e) => {
    console.log(`    ${e.remitente} (${e.provincia}): ${e.total} cabezas`);
  });

  return { entries, date: dateStr };
}

// ---------------------------------------------------------------------------
// Source 12: Detailed Category Prices from MAG (haciinfo000502)
// More granular than haciinfo000002 - includes subcategories (Esp.Joven, Regular, etc.)
// ---------------------------------------------------------------------------

async function scrapeDetailedCategoryPrices() {
  console.log("[12/12] Scraping detailed category prices from MAG (haciinfo000502)...");

  const url = "https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000502";
  const html = await fetchHTML(url);
  if (!html) return null;

  const tableMatch = html.match(/<Table[^>]*class="table[^"]*"[^>]*>([\s\S]*?)<\/Table>/i);
  if (!tableMatch) {
    console.warn("  [WARN] No detailed category table found");
    return null;
  }

  const rows = tableMatch[0].match(/<TR[^>]*>([\s\S]*?)<\/TR>/gi) || [];
  const categories = [];

  for (const row of rows) {
    const cells = [...row.matchAll(/<T[DH][^>]*>([\s\S]*?)<\/T[DH]>/gi)].map((m) =>
      m[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&iacute;/g, "í")
        .replace(/&aacute;/g, "á")
        .trim()
    );

    if (cells.length < 8) continue;
    
    // Skip header and separator rows
    const catName = cells[0];
    if (!catName || catName === "Categoría" || catName.includes("---")) continue;
    
    // Parse prices
    const minPrice = parseFloat(cells[1]?.replace(/\./g, "").replace(",", ".") || "0");
    const maxPrice = parseFloat(cells[2]?.replace(/\./g, "").replace(",", ".") || "0");
    const avgPrice = parseFloat(cells[3]?.replace(/\./g, "").replace(",", ".") || "0");
    const cabezas = parseInt(cells[5]?.replace(/\./g, "").replace(/[^\d]/g, "") || "0", 10);

    // Only include rows with valid data
    if (avgPrice > 100 && avgPrice < 20000 && cabezas > 0) {
      categories.push({
        category: catName,
        minPrice: Math.round(minPrice * 100) / 100,
        maxPrice: Math.round(maxPrice * 100) / 100,
        avgPrice: Math.round(avgPrice * 100) / 100,
        cabezas,
      });
    }
  }

  if (categories.length === 0) {
    console.warn("  [WARN] No detailed category data parsed");
    return null;
  }

  console.log(`  Found ${categories.length} detailed categories`);
  categories.slice(0, 5).forEach((c) => {
    console.log(`    ${c.category}: $${c.avgPrice}/kg (${c.cabezas} cab)`);
  });

  return { categories, date: todayISO() };
}

// ---------------------------------------------------------------------------
// Source 13: MAG Entry for Consignatarias with Auctions Today
// Queries haciinfo000006 for each consignataria that has an auction today
// ---------------------------------------------------------------------------

async function scrapeAuctionDayEntries(auctions) {
  console.log("[13/13] Querying MAG entry for consignatarias with auctions today...");

  // Load MAG consignatario mapping
  let magMapping;
  try {
    magMapping = JSON.parse(readFileSync(MAG_CONSIG_PATH, "utf-8"));
  } catch {
    console.warn("  [WARN] Could not load mag-consignatarios.json");
    return null;
  }

  // Create slug → magId lookup
  const slugToMagId = new Map();
  for (const entry of magMapping.mapping) {
    if (entry.slug) {
      slugToMagId.set(entry.slug, entry.magId);
    }
  }

  // Find consignatarias with auctions today
  const today = todayISO();
  const todayAuctions = auctions.filter((a) => a.date === today);
  const uniqueSlugs = [...new Set(todayAuctions.map((a) => a.consignatariaSlug))];

  // Filter to only those with MAG IDs
  const slugsWithMagId = uniqueSlugs.filter((slug) => slugToMagId.has(slug));

  if (slugsWithMagId.length === 0) {
    console.log("  No consignatarias with MAG IDs have auctions today");
    return null;
  }

  console.log(`  ${slugsWithMagId.length} consignatarias with MAG IDs have auctions today`);

  // Date range: last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const formatDate = (d) =>
    `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;

  const results = {};

  // Query each consignataria
  for (const slug of slugsWithMagId) {
    const magId = slugToMagId.get(slug);
    const url = `https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000006?txtFECHAINI=${formatDate(startDate)}&txtFECHAFIN=${formatDate(endDate)}&LisConsignatario=${magId}&CP=&LISTADO=SI`;

    const html = await fetchHTML(url);
    if (!html) continue;

    const tableMatch = html.match(/<Table[^>]*class="table[^"]*"[^>]*>([\s\S]*?)<\/Table>/i);
    if (!tableMatch) continue;

    const rows = tableMatch[0].match(/<TR[^>]*>([\s\S]*?)<\/TR>/gi) || [];
    const entries = [];
    let totalCabezas = 0;

    for (const row of rows) {
      const cells = [...row.matchAll(/<T[DH][^>]*>([\s\S]*?)<\/T[DH]>/gi)].map((m) =>
        m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()
      );

      if (cells.length < 7) continue;
      if (cells[0].toLowerCase() === "remitente") continue;

      // Totals row
      if (cells[0].toLowerCase().includes("totales")) {
        totalCabezas = parseInt(cells[6]?.replace(/\./g, "").replace(/[^\d]/g, "") || "0", 10);
        continue;
      }

      const total = parseInt(cells[6]?.replace(/\./g, "").replace(/[^\d]/g, "") || "0", 10);
      if (total > 0 && cells[0]) {
        entries.push({
          remitente: cells[0].trim(),
          localidad: cells[1]?.trim() || "",
          provincia: cells[2]?.trim() || "",
          cabezas: total,
        });
      }
    }

    if (totalCabezas > 0 || entries.length > 0) {
      results[slug] = {
        magId,
        totalCabezas,
        entries,
        period: `${formatDate(startDate)} - ${formatDate(endDate)}`,
      };
      console.log(`    ${slug}: ${totalCabezas} cabezas from ${entries.length} remitentes`);
    }
  }

  if (Object.keys(results).length === 0) {
    console.log("  No entry data found for today's auction consignatarias");
    return null;
  }

  return { date: today, consignatarias: results };
}

// ---------------------------------------------------------------------------
// Source 6: Dollar rates
// ---------------------------------------------------------------------------

async function scrapeDollar() {
  console.log("[6/8] Fetching USD rates from dolarapi.com...");
  const [blue, oficial] = await Promise.all([
    fetchJSON("https://dolarapi.com/v1/dolares/blue"),
    fetchJSON("https://dolarapi.com/v1/dolares/oficial"),
  ]);

  if (!blue && !oficial) return null;

  return { blue, oficial };
}

// ---------------------------------------------------------------------------
// Merge logic
// ---------------------------------------------------------------------------

// Slug aliases for dedup — maps variant slugs to a canonical form
// so curated and CACG entries for the same consignataria merge correctly.
const SLUG_DEDUP_MAP = {
  'travaglia': 'eduardo-a-travaglia-y-cia',
  'eduardo-a-travaglia-y-cia-s-a': 'eduardo-a-travaglia-y-cia',
  'eduardo-a-travaglia-y-cia-sa': 'eduardo-a-travaglia-y-cia',
  'bressan': 'bressan-y-cia',
  'bressan-y-cia-s-r-l': 'bressan-y-cia',
  'bressan-y-cia-srl': 'bressan-y-cia',
  // O'Farrell: scraper sees both "ofarrell" (curated) and "ivan-l-ofarrell-srl"
  // (from CACG). Without these aliases, the same auction shows up twice on the
  // site as two different remates (caught by audit-data-integrity.mjs).
  'ofarrell': 'ofarrell',
  'ivan-l-ofarrell-srl': 'ofarrell',
  'ivan-l-o-farrell-s-r-l': 'ofarrell',
  // Other variant pairs that the existing strip-suffix logic doesn't collapse
  'nestor-hugo-fuentes-s-a': 'nestor-fuentes',
  'nestor-hugo-fuentes-sa': 'nestor-fuentes',
  'horacio-rodriguez-egana-consignaciones-s-r-l': 'rodriguez-egana',
  'tradicion-ganadera-sa-porro-srl': 'tradicion-ganadera',
  'aguerre-s-r-l': 'aguerre',
  'aguerre-srl': 'aguerre',
  // Canal Rural (elrural.com) slugifica algunos nombres distinto al canónico
  // (apóstrofo, abreviaturas) → sin estos alias, la firma aparece 2 veces.
  'o-farrell': 'ofarrell',
  'alfredo-s-mondino': 'alfredo-sebastian-mondino',
};

export function deduplicateAuctions(auctions) {
  // normSlug: alias map, luego strip de sufijos societarios
  const normSlugOf = (a) => SLUG_DEDUP_MAP[a.consignatariaSlug] ||
    (a.consignatariaSlug || "")
      .replace(/-s-a$/, "").replace(/-sa$/, "").replace(/-s-r-l$/, "").replace(/-srl$/, "");
  const firmDateOf = (a) => `${a.date}|${normSlugOf(a)}`;
  const locKeyOf = (a) => (a.location || "").split(",")[0].trim().toLowerCase();
  const mergeInto = (existing, a) => {
    // Prefiere la entrada con más datos: solo completa lo que falta.
    if (a.estimatedHeads && !existing.estimatedHeads) existing.estimatedHeads = a.estimatedHeads;
    if (a.time && !existing.time) existing.time = a.time;
    if (a.catalogUrl && !existing.catalogUrl) existing.catalogUrl = a.catalogUrl;
    if (a.youtubeUrl && !existing.youtubeUrl) existing.youtubeUrl = a.youtubeUrl;
    if (a.liveLink && !existing.liveLink) existing.liveLink = a.liveLink;
  };

  // Pass 1: ancla "con location" por firma+fecha. Permite colapsar las entradas
  // sin location (ej. Canal Rural, que no la trae) sin importar el orden de llegada.
  const located = new Map();
  for (const a of auctions) {
    const fd = firmDateOf(a);
    if (locKeyOf(a) && !located.has(fd)) located.set(fd, a);
  }

  // Pass 2: dedup por date|slug|location; las sin-location se mergean en su ancla.
  const seen = new Map();
  for (const a of auctions) {
    const fd = firmDateOf(a);
    const locKey = locKeyOf(a);
    if (!locKey && located.has(fd)) {
      mergeInto(located.get(fd), a);
      continue;
    }
    const key = `${fd}|${locKey}`;
    if (seen.has(key)) {
      mergeInto(seen.get(key), a);
      continue;
    }
    seen.set(key, a);
  }

  return [...seen.values()];
}

// ---------------------------------------------------------------------------
// Supabase market price write
// ---------------------------------------------------------------------------

async function writeMarketToSupabase(market) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("  [SKIP] No SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY — skipping DB write");
    return;
  }

  const row = {
    date: market.lastUpdate,
    inmag_value: market.inmag.current,
    inmag_prev: market.inmag.prev,
    inmag_change_pct: market.inmag.change,
    corn_usd_tn: market.corn.current,
    corn_prev: market.corn.prev,
    corn_change_pct: market.corn.change,
    usd_blue: market.usdBlue.current,
    usd_blue_prev: market.usdBlue.prev,
    usd_oficial: market.usdOficial.current,
    usd_oficial_prev: market.usdOficial.prev,
    raw_data: market,
  };

  try {
    const res = await fetch(`${url}/rest/v1/market_price_snapshots`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(row),
    });

    if (res.ok) {
      console.log(`  [DB] Market snapshot written to Supabase (${market.lastUpdate})`);
    } else {
      const text = await res.text();
      console.warn(`  [WARN] Supabase write failed: ${res.status} ${text}`);
    }
  } catch (err) {
    console.warn(`  [WARN] Supabase write error: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// YouTube: fetch latest video via RSS (no API key needed)
// ---------------------------------------------------------------------------

async function scrapeYouTubeLatest() {
  console.log("\n[YT] Updating YouTube channel latest videos via RSS...");

  let channels;
  try {
    channels = JSON.parse(readFileSync(YOUTUBE_PATH, "utf-8"));
  } catch {
    console.log("  [SKIP] youtube-channels.json not found or empty");
    return;
  }

  const channelIds = Object.entries(channels);
  if (channelIds.length === 0) {
    console.log("  [SKIP] No YouTube channels configured");
    return;
  }

  let updated = 0;
  for (const [slug, channel] of channelIds) {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`;
    const xml = await fetchHTML(rssUrl);
    if (!xml) {
      console.log(`  [WARN] RSS failed for ${slug} (${channel.channelId})`);
      continue;
    }

    // Parse first <entry> from RSS feed
    const entryMatch = xml.match(/<entry>[\s\S]*?<\/entry>/);
    if (!entryMatch) {
      console.log(`  [INFO] No videos found for ${slug}`);
      channel.lastChecked = todayISO();
      continue;
    }

    const entry = entryMatch[0];
    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);

    if (videoIdMatch) {
      const videoId = videoIdMatch[1];
      channel.latestVideo = {
        videoId,
        title: titleMatch ? titleMatch[1] : "Video",
        publishedAt: publishedMatch ? publishedMatch[1] : todayISO(),
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      };
      updated++;
      console.log(`  [OK] ${slug}: "${channel.latestVideo.title}" (${videoId})`);
    }

    channel.lastChecked = todayISO();

    // Small delay between requests
    await new Promise((r) => setTimeout(r, 100));
  }

  writeFileSync(YOUTUBE_PATH, JSON.stringify(channels, null, 2) + "\n");
  console.log(`[YT] Updated ${updated}/${channelIds.length} channels`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n=== Ganado Terminal Scraper — ${todayISO()} ===\n`);

  // Scrape all sources in parallel
  const [cacg, colombo, ofarrell, lehmann, madelan, umchv, hkagro, entresurcos, nea, dollar, cattlePrices, cornPrice, categoryPrices, provinceEntry, consignatarioEntry, detailedCategories] = await Promise.all([
    scrapeCACG(),
    scrapeColombo(),
    scrapeOFarrell(),
    scrapeLehmann(),
    scrapeMadelan(),
    scrapeUMCHV(),
    scrapeHKAgro(),
    scrapeEntreSurcos(),
    scrapeNEA(), // NEA module: Reggi, Aguerre, HRE, Rosgan, ClicRural (isolated)
    scrapeDollar(),
    scrapeCattlePrices(),
    scrapeCornPrice(),
    scrapeCategoryPrices(), // Insight #87: real per-category prices
    scrapeProvinceEntry(), // haciinfo000003: cattle entry by province
    scrapeConsignatarioEntry(), // haciinfo000006: cattle entry by consignatario
    scrapeDetailedCategoryPrices(), // haciinfo000502: detailed subcategory prices
  ]);

  // Combine all scraped auctions
  const allScraped = [...cacg, ...colombo, ...ofarrell, ...lehmann, ...madelan, ...umchv, ...hkagro, ...entresurcos, ...nea];
  console.log(`\nTotal scraped: ${allScraped.length} auctions`);

  // Load existing data
  const existing = JSON.parse(readFileSync(REMATES_PATH, "utf-8"));
  console.log(`Existing: ${existing.length} auctions`);

  // Separate manual/curated entries (IderCor, Expo events, etc.) from scrapable ones
  const scrapableSlugs = new Set([
    ...cacg.map((a) => a.consignatariaSlug),
    "colombo-y-colombo",
    "ofarrell",
    "coop-lehmann",
    "madelan",
    "umc-haciendas-villaguay",
    "hk-agro",
    // NEA module single-firm sources (now fully scraped → drop stale curated copies)
    "reggi-y-cia",
    "aguerre-srl",
    "hre",
  ]);

  // Keep curated entries that aren't from scrapable sources
  const curated = existing.filter(
    (a) => !scrapableSlugs.has(a.consignatariaSlug)
  );
  console.log(`Curated (kept as-is): ${curated.length}`);

  // Filter out invalid dates and normalize provinces
  const validScraped = allScraped.filter((a) => isValidDate(a.date));
  const validCurated = curated.filter((a) => isValidDate(a.date));
  console.log(`Valid scraped: ${validScraped.length} (filtered ${allScraped.length - validScraped.length} invalid)`);

  // Fuentes bloqueadas para la IP del runner (Rosgan/Entre Surcos), fetcheadas localmente
  // desde una IP residencial AR y commiteadas a remates-local-nea.json. Opcional.
  let localNEA = [];
  try {
    localNEA = JSON.parse(readFileSync(LOCAL_NEA_PATH, "utf-8")).filter((a) => isValidDate(a.date));
    if (localNEA.length) console.log(`Local NEA (Rosgan/Entre Surcos): ${localNEA.length}`);
  } catch { /* archivo opcional, no siempre presente */ }

  // Normalize province names (remove accents)
  for (const a of [...validCurated, ...validScraped, ...localNEA]) {
    a.province = normalizeProvince(a.province);
  }

  // Provincia por LOCALIDAD del evento (georef + cache + mapa curado + venues).
  // Reemplaza el correctProvince por-ciudad: corrige el geo-leak donde ferias en
  // pueblos no mapeados caían a la provincia de la consignataria (feed).
  await enrichProvinces([...validCurated, ...validScraped, ...localNEA]);

  // Merge curated + freshly scraped
  const merged = deduplicateAuctions([...validCurated, ...validScraped, ...localNEA]);

  // Sort by date, then time
  merged.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.time || "").localeCompare(b.time || "")
  );

  // Corrección de aliases de consignataria mal scrapeados → canónico, para que
  // mergeen con la firma real (ej. "Colombo Y Maliagno2" es Colombo y Magliano SA).
  const CONSIG_SLUG_FIX = {
    "colombo-y-maliagno2": { slug: "colombo-y-magliano", name: "Colombo y Magliano SA" },
    // Typo del feed: "Alopnso" → "Alonso".
    "pedro-y-raul-alopnso": { slug: "pedro-y-raul-alonso", name: "Pedro y Raul Alonso" },
  };
  for (const a of merged) {
    const fix = CONSIG_SLUG_FIX[a.consignatariaSlug];
    if (fix) {
      a.consignatariaSlug = fix.slug;
      a.consignatariaName = fix.name;
    }
  }

  // Assign sequential IDs
  merged.forEach((a, i) => {
    a.id = i + 1;
    // Remove internal-only fields
    delete a.liveLink;
  });

  // Set status based on date
  const today = todayISO();
  for (const a of merged) {
    if (a.date < today) a.status = "completed";
    else if (a.date === today) a.status = "live";
    else a.status = "scheduled";
  }

  // Write auctions
  writeFileSync(REMATES_PATH, JSON.stringify(merged, null, 2) + "\n");
  console.log(`\nWritten: ${merged.length} auctions to remates.json`);

  // Query MAG entry data for consignatarias with auctions today
  const auctionDayEntries = await scrapeAuctionDayEntries(merged);

  // Update market-prices.json with all available data
  const market = JSON.parse(readFileSync(MARKET_PATH, "utf-8"));

  // Update INMAG from official MAG data (cattle-tracker approach)
  if (cattlePrices) {
    const inmagValue = cattlePrices.inmag;
    // Use second-to-last scraped record as prev (more accurate than stale stored prev)
    const sortedRecs = [...cattlePrices.records].sort((a, b) => b.fecha.localeCompare(a.fecha));
    const inmagPrev = sortedRecs.length >= 2
      ? Math.round(sortedRecs[1].inmag * 100) / 100
      : market.inmag.current;
    // GUARD: never overwrite the live INMAG with a missing/zero/garbage value — a bad
    // scrape would otherwise commit $0 and every price surface would render "$0 hoy".
    // Keep the last good value and log loudly so the run is visible.
    if (Number.isFinite(inmagValue) && inmagValue > 0) {
      market.inmag.prev = inmagPrev;
      market.inmag.current = inmagValue;
      market.inmag.change = inmagPrev
        ? parseFloat((((inmagValue - inmagPrev) / inmagPrev) * 100).toFixed(1))
        : 0;
      market.inmag.source = "mercadoagroganadero.com.ar";
    } else {
      console.error(`  ✗ INMAG scrape invalid (${inmagValue}) — keeping last good value $${market.inmag.current}. Not overwriting.`);
    }

    // Update INMAG historical series from scraped records (including volume for VWAP)
    if (!market.inmag.series) market.inmag.series = [];
    const existingDates = new Set(market.inmag.series.map((pt) => pt.date));
    for (const rec of cattlePrices.records) {
      if (!existingDates.has(rec.fecha)) {
        market.inmag.series.push({
          date: rec.fecha,
          value: Math.round(rec.inmag * 100) / 100,
          volume: rec.cabezas || null, // Insight #86: store cabezas for VWAP
        });
      }
    }
    
    // Backfill volume into existing entries if missing
    const volumeMap = new Map(cattlePrices.records.map(r => [r.fecha, r.cabezas]));
    for (const pt of market.inmag.series) {
      if (!pt.volume && volumeMap.has(pt.date)) {
        pt.volume = volumeMap.get(pt.date);
      }
    }
    // Sort by date and keep last 365 entries (1 year of daily data — Insight #88)
    // Extended from 56 to enable trend analysis and financial products
    market.inmag.series.sort((a, b) => a.date.localeCompare(b.date));
    if (market.inmag.series.length > 365) {
      market.inmag.series = market.inmag.series.slice(-365);
    }

    // Update category prices — prefer REAL observed data (Insight #87) over synthetic ratios
    // Fallback ratios only used when real data unavailable:
    // novillos: 1.0x, novillitos: 0.95x, vaquillonas: 0.90x,
    // vacas: 0.72x, toros: 0.65x, terneros: 1.10x
    const fallbackRatios = {
      novillos: 1.0,
      novillitos: 0.95,
      vaquillonas: 0.90,
      vacas: 0.72,
      toros: 0.65,
      terneros: 1.10,
    };
    
    // Use real category prices when available (Insight #87)
    const realCategories = categoryPrices?.categories || {};
    const useReal = Object.keys(realCategories).length >= 3; // At least 3 categories to trust
    
    if (useReal) {
      console.log("  Using REAL category prices from MAG (Insight #87)");
    } else {
      console.log("  Using synthetic ratios (real category data unavailable)");
    }
    
    for (const [key, fallbackRatio] of Object.entries(fallbackRatios)) {
      let newVal, source;
      
      if (useReal && realCategories[key]) {
        // Use real observed price
        newVal = realCategories[key].current;
        source = "mercadoagroganadero.com.ar (observed)";
        
        // Store volume if available
        if (realCategories[key].cabezas) {
          market.categories[key].latestVolume = realCategories[key].cabezas;
        }
      } else {
        // Fallback to synthetic ratio
        newVal = Math.round(inmagValue * fallbackRatio);
        source = "MAG (derived from INMAG)";
      }
      
      const prevVal = market.categories[key].current || Math.round(inmagPrev * fallbackRatio);
      market.categories[key].prev = prevVal;
      market.categories[key].current = newVal;
      market.categories[key].change = prevVal
        ? parseFloat((((newVal - prevVal) / prevVal) * 100).toFixed(1))
        : 0;
      market.categories[key].source = source;
    }

    // Calculate total volume traded in the period
    const totalVolume = cattlePrices.records.reduce((sum, r) => sum + (r.cabezas || 0), 0);
    market.inmag.latestVolume = sortedRecs[0]?.cabezas || null; // Volume on latest day
    market.inmag.periodVolume = totalVolume; // Total volume in scrape period
    
    console.log(`Updated INMAG=${inmagValue} (${cattlePrices.date}), ${cattlePrices.records.length} series points, latest volume=${sortedRecs[0]?.cabezas || 0} cabezas`);
  }

  // Update corn price if available
  if (cornPrice != null) {
    const prev = market.corn.current;
    market.corn.prev = prev;
    market.corn.current = cornPrice;
    market.corn.change = prev
      ? parseFloat((((cornPrice - prev) / prev) * 100).toFixed(1))
      : 0;
    market.corn.source = "MAGYP FOB API";
    console.log(`Updated corn: $${cornPrice} USD/tn`);
  }

  // Update dollar rates if available
  if (dollar) {
    if (dollar.blue) {
      const prev = market.usdBlue.current;
      market.usdBlue.prev = prev;
      market.usdBlue.current = dollar.blue.venta;
      market.usdBlue.change = prev
        ? parseFloat((((dollar.blue.venta - prev) / prev) * 100).toFixed(1))
        : 0;
      market.usdBlue.source = "dolarapi.com/v1/dolares/blue";
    }
    if (dollar.oficial) {
      const prev = market.usdOficial.current;
      market.usdOficial.prev = prev;
      market.usdOficial.current = dollar.oficial.venta;
      market.usdOficial.change = prev
        ? parseFloat((((dollar.oficial.venta - prev) / prev) * 100).toFixed(1))
        : 0;
      market.usdOficial.source = "dolarapi.com/v1/dolares/oficial";
    }
    console.log(
      `Updated USD: blue=$${dollar.blue?.venta || "?"}, oficial=$${dollar.oficial?.venta || "?"}`
    );
  }

  // Update province market share data (haciinfo000003)
  if (provinceEntry) {
    market.provinceEntry = {
      date: provinceEntry.date,
      totalCabezas: provinceEntry.totalCabezas,
      provinces: provinceEntry.provinces,
    };
    console.log(`Updated province entry: ${provinceEntry.totalCabezas} cabezas across ${provinceEntry.provinces.length} provinces`);
  }

  // Update consignatario entry data (haciinfo000006)
  if (consignatarioEntry) {
    market.consignatarioEntry = {
      date: consignatarioEntry.date,
      entries: consignatarioEntry.entries,
    };
    console.log(`Updated consignatario entry: ${consignatarioEntry.entries.length} entries`);
  }

  // Update detailed subcategory prices (haciinfo000502)
  if (detailedCategories) {
    market.detailedCategories = {
      date: detailedCategories.date,
      categories: detailedCategories.categories,
    };
    console.log(`Updated detailed categories: ${detailedCategories.categories.length} subcategories`);
  }

  // Update auction day entry data (MAG entry for consignatarias with auctions today)
  if (auctionDayEntries) {
    market.auctionDayEntries = auctionDayEntries;
    const count = Object.keys(auctionDayEntries.consignatarias).length;
    console.log(`Updated auction day entries: ${count} consignatarias with MAG data`);
  }

  market.lastUpdate = todayISO();
  writeFileSync(MARKET_PATH, JSON.stringify(market, null, 2) + "\n");
  console.log(`Market prices written to market-prices.json`);

  // Write market snapshot to Supabase (if env vars available)
  await writeMarketToSupabase(market);

  // Update YouTube channel latest videos
  await scrapeYouTubeLatest();

  // Summary
  const provinces = [...new Set(merged.map((a) => a.province))];
  const consignatarias = [...new Set(merged.map((a) => a.consignatariaName))];
  console.log(`\n--- Summary ---`);
  console.log(`Auctions: ${merged.length}`);
  console.log(`Provinces: ${provinces.length} (${provinces.sort().join(", ")})`);
  console.log(`Consignatarias: ${consignatarias.length}`);
  console.log(`Date range: ${merged[0]?.date} — ${merged[merged.length - 1]?.date}`);
  console.log(`Done.\n`);
}

// Correr el scraper solo si este archivo es el entry-point. Así scripts/local-nea-fetch.mjs
// puede importar scrapeEntreSurcos sin disparar todo el scraper.
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((err) => {
    console.error("Scraper failed:", err);
    process.exit(1);
  });
}
