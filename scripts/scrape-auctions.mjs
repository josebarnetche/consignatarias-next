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
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../src/lib/data");
const REMATES_PATH = resolve(DATA_DIR, "remates.json");
const MARKET_PATH = resolve(DATA_DIR, "market-prices.json");

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
  console.log("[1/6] Scraping CACG API...");
  const data = await fetchJSON("https://cacg.org.ar/iapi/auctions");
  if (!data?.dataset?.rows) return [];

  return data.dataset.rows
    .filter((r) => r.auction_is_disabled !== "1")
    .map((r) => {
      const province =
        PROVINCE_MAP[r.state_id] ||
        (r.state_name || "").toUpperCase() ||
        "BUENOS AIRES";
      const city = r.city_name || r.building_name || "";
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
  console.log("[2/6] Scraping Colombo y Colombo...");
  const html = await fetchHTML("https://www.colomboycolombo.com.ar/remates");
  if (!html) return [];

  const auctions = [];
  const monthMap = {
    "01": "01", "02": "02", "03": "03", "04": "04",
    "05": "05", "06": "06", "07": "07", "08": "08",
    "09": "09", "10": "10", "11": "11", "12": "12",
  };

  // Extract dates from CSS classes: month_XX_ar, day, year
  const eventBlocks = html.match(/<div[^>]*class="[^"]*event[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi) || [];
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
  console.log("[3/6] Scraping O'Farrell...");
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
  console.log("[4/6] Scraping Cooperativa Lehmann...");
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
  console.log("[5/6] Scraping Madelan...");
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
// Source 6: Dollar rates
// ---------------------------------------------------------------------------

async function scrapeDollar() {
  console.log("[6/6] Fetching USD rates from dolarapi.com...");
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

function deduplicateAuctions(auctions) {
  const seen = new Map();

  for (const a of auctions) {
    // Key: date + consignataria slug + location (first word)
    const locKey = (a.location || "").split(",")[0].trim().toLowerCase();
    const key = `${a.date}|${a.consignatariaSlug}|${locKey}`;

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
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n=== Ganado Terminal Scraper — ${todayISO()} ===\n`);

  // Scrape all sources in parallel
  const [cacg, colombo, ofarrell, lehmann, madelan, dollar] = await Promise.all([
    scrapeCACG(),
    scrapeColombo(),
    scrapeOFarrell(),
    scrapeLehmann(),
    scrapeMadelan(),
    scrapeDollar(),
  ]);

  // Combine all scraped auctions
  const allScraped = [...cacg, ...colombo, ...ofarrell, ...lehmann, ...madelan];
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

  // Update dollar rates if available
  if (dollar) {
    const market = JSON.parse(readFileSync(MARKET_PATH, "utf-8"));
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
    market.lastUpdate = todayISO();
    writeFileSync(MARKET_PATH, JSON.stringify(market, null, 2) + "\n");
    console.log(
      `Updated USD: blue=$${dollar.blue?.venta || "?"}, oficial=$${dollar.oficial?.venta || "?"}`
    );
  }

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
