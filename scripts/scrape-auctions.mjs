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
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../src/lib/data");
const REMATES_PATH = resolve(DATA_DIR, "remates.json");
const MARKET_PATH = resolve(DATA_DIR, "market-prices.json");
const YOUTUBE_PATH = resolve(DATA_DIR, "youtube-channels.json");

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
    .replace(/[\u0300-\u036f]/g, "");
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
  // BUENOS AIRES
  "AYACUCHO": "BUENOS AIRES",
  "AZUL": "BUENOS AIRES",
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

/**
 * Correct province based on city name.
 * Overrides bad API or curated province assignments.
 */
function correctProvince(auction) {
  const rawCity = (auction.location || "").split(",")[0].trim();
  const city = rawCity.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const correctProv = CITY_PROVINCE_MAP[city];
  if (correctProv && correctProv !== auction.province) {
    console.log(`  [FIX] ${rawCity}: ${auction.province} → ${correctProv}`);
    auction.province = correctProv;
    auction.location = `${rawCity}, ${correctProv}`;
  }
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
        title: r.auction_title || "Remate",
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
};

function deduplicateAuctions(auctions) {
  const seen = new Map();

  for (const a of auctions) {
    // Normalize slug for dedup: check alias map, then strip legal suffixes
    let normSlug = SLUG_DEDUP_MAP[a.consignatariaSlug] ||
      (a.consignatariaSlug || "")
        .replace(/-s-a$/, "")
        .replace(/-sa$/, "")
        .replace(/-s-r-l$/, "")
        .replace(/-srl$/, "");
    // Key: date + normalized slug + location (first word)
    const locKey = (a.location || "").split(",")[0].trim().toLowerCase();
    const key = `${a.date}|${normSlug}|${locKey}`;

    if (!seen.has(key)) {
      seen.set(key, a);
    } else {
      // Merge: prefer the one with more data
      const existing = seen.get(key);
      if (a.estimatedHeads && !existing.estimatedHeads)
        existing.estimatedHeads = a.estimatedHeads;
      if (a.time && !existing.time) existing.time = a.time;
      if (a.catalogUrl && !existing.catalogUrl)
        existing.catalogUrl = a.catalogUrl;
      if (a.youtubeUrl && !existing.youtubeUrl)
        existing.youtubeUrl = a.youtubeUrl;
      if (a.liveLink && !existing.liveLink) existing.liveLink = a.liveLink;
    }
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
  const [cacg, colombo, ofarrell, lehmann, madelan, umchv, dollar, cattlePrices, cornPrice] = await Promise.all([
    scrapeCACG(),
    scrapeColombo(),
    scrapeOFarrell(),
    scrapeLehmann(),
    scrapeMadelan(),
    scrapeUMCHV(),
    scrapeDollar(),
    scrapeCattlePrices(),
    scrapeCornPrice(),
  ]);

  // Combine all scraped auctions
  const allScraped = [...cacg, ...colombo, ...ofarrell, ...lehmann, ...madelan, ...umchv];
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

  // Normalize province names (remove accents)
  for (const a of [...validCurated, ...validScraped]) {
    a.province = normalizeProvince(a.province);
  }

  // Correct province based on city name (overrides bad API/curated data)
  for (const a of [...validCurated, ...validScraped]) {
    correctProvince(a);
  }

  // Merge curated + freshly scraped
  const merged = deduplicateAuctions([...validCurated, ...validScraped]);

  // Sort by date, then time
  merged.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.time || "").localeCompare(b.time || "")
  );

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
    market.inmag.prev = inmagPrev;
    market.inmag.current = inmagValue;
    market.inmag.change = inmagPrev
      ? parseFloat((((inmagValue - inmagPrev) / inmagPrev) * 100).toFixed(1))
      : 0;
    market.inmag.source = "mercadoagroganadero.com.ar";

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

    // Update category prices proportionally from INMAG
    // INMAG is the composite novillo price — derive categories as ratios of INMAG
    // Typical market ratios (relative to novillos/INMAG):
    // novillos: 1.0x, novillitos: 0.95x, vaquillonas: 0.90x,
    // vacas: 0.72x, toros: 0.65x, terneros: 1.10x
    const ratios = {
      novillos: 1.0,
      novillitos: 0.95,
      vaquillonas: 0.90,
      vacas: 0.72,
      toros: 0.65,
      terneros: 1.10,
    };
    for (const [key, ratio] of Object.entries(ratios)) {
      const newVal = Math.round(inmagValue * ratio);
      const prevVal = Math.round(inmagPrev * ratio);
      market.categories[key].prev = prevVal;
      market.categories[key].current = newVal;
      market.categories[key].change = prevVal
        ? parseFloat((((newVal - prevVal) / prevVal) * 100).toFixed(1))
        : 0;
      market.categories[key].source = "MAG (derived from INMAG)";
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

main().catch((err) => {
  console.error("Scraper failed:", err);
  process.exit(1);
});
