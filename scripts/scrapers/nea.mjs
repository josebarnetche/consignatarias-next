#!/usr/bin/env node
/**
 * NEA auction sources — isolated module.
 *
 * Adds NEA-focused consignataria + portal sources to the daily scraper without
 * touching the monolith beyond a single import + a single call.
 *
 * Sources implemented (all confirmed live during recon, 2026-06-09):
 *   - Reggi & Cía S.R.L  (clicrural white-label home, server-rendered HTML)
 *   - Aguerre SRL        (WordPress / The Events Calendar Tribe REST JSON)
 *   - HRE                (almoby Django REST JSON — proximos + detail)
 *   - Rosgan / RosganNet (public JSON API behind app.rosgannet.com.ar)
 *   - ClicRural cartelera (national server-rendered aggregator, filtered to NEA)
 *
 * NOTE on Arzuaga (Wix, JS-rendered): NOT implemented here. It needs a headless
 * browser (Playwright/puppeteer) which is not available in the scraper runtime
 * (plain fetch only). Its single televised remate is also already surfaced by the
 * ClicRural cartelera when present, so we don't invent it. Left as a TODO.
 *
 * Each source has its own `try/catch` and returns `[]` on any error so a single
 * dead source can never break the pipeline. `scrapeNEA()` aggregates them.
 *
 * Output shape per auction === src/lib/data/remates.json item:
 *   { title, consignatariaName, consignatariaSlug, date:'YYYY-MM-DD',
 *     time:'HH:MM'|null, location:'Ciudad, Provincia', province:'CORRIENTES',
 *     type, mainCategory, estimatedHeads:number|null, description,
 *     youtubeUrl:string|null, catalogUrl:string|null,
 *     source:'web'|'social'|'tv'|'manual', sourceUrl,
 *     status:'scheduled'|'live'|'completed' }
 *
 * Run directly for a self-test (no file writes):
 *   node scripts/scrapers/nea.mjs
 */

// ---------------------------------------------------------------------------
// Minimal local helpers (replicated from scrape-auctions.mjs — those are not
// exported). Kept tiny and dependency-free.
// ---------------------------------------------------------------------------

const UA = "Mozilla/5.0 (compatible; ConsignatariasBot/1.0; +https://www.consignatarias.com.ar)";

async function fetchText(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJSON(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.\s]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function statusForDate(date) {
  const t = todayISO();
  if (date < t) return "completed";
  if (date === t) return "live";
  return "scheduled";
}

function stripTags(s) {
  return (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function unescapeHtml(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&nbsp;/g, " ");
}

// Type/category inference shared across sources.
function inferType(text) {
  const t = (text || "").toLowerCase();
  if (t.includes("invernada")) return "invernada";
  if (t.includes("cria") || t.includes("cría")) return "cria";
  if (
    t.includes("reproductor") ||
    t.includes("cabaña") ||
    t.includes("cabana") ||
    t.includes("genética") ||
    t.includes("genetica") ||
    t.includes("criollo") ||
    /\btoros?\b/.test(t)
  )
    return "reproductores";
  if (t.includes("especial") || t.includes("expo") || t.includes("fiesta") || t.includes("aniversario"))
    return "especial";
  return "general";
}

function inferMainCategory(text) {
  const t = (text || "").toLowerCase();
  if (t.includes("ternero")) return "terneros";
  if (t.includes("novill")) return "novillos";
  if (t.includes("vaca gorda") || t.includes("gordo") || t.includes("faena")) return "vaca_gorda";
  if (t.includes("vaquillona")) return "vaquillonas";
  if (/\btoros?\b/.test(t) || t.includes("reproductor")) return "toros";
  return "mixto";
}

// Province abbreviation map (Rosgan uses short province codes after the comma).
const PROV_ABBR = {
  CTS: "CORRIENTES",
  CORRIENTES: "CORRIENTES",
  SF: "SANTA FE",
  "STA FE": "SANTA FE",
  "SANTA FE": "SANTA FE",
  ER: "ENTRE RIOS",
  "E RIOS": "ENTRE RIOS",
  "ENTRE RIOS": "ENTRE RIOS",
  BA: "BUENOS AIRES",
  "BS AS": "BUENOS AIRES",
  "BUENOS AIRES": "BUENOS AIRES",
  CHACO: "CHACO",
  FORMOSA: "FORMOSA",
  MISIONES: "MISIONES",
  SALTA: "SALTA",
  CBA: "CORDOBA",
  CORDOBA: "CORDOBA",
};

// ClicRural numeric location id -> province (from the page's zona checkboxes).
const CLICRURAL_LOCATION = {
  "20": "BUENOS AIRES",
  "21": "CATAMARCA",
  "22": "CHACO",
  "24": "CORDOBA",
  "25": "CORRIENTES",
  "26": "ENTRE RIOS",
  "27": "FORMOSA",
  "28": "JUJUY",
  "32": "MISIONES",
  "39": "SANTA FE",
};

const NEA_PROVINCES = new Set(["CORRIENTES", "CHACO", "FORMOSA", "MISIONES", "ENTRE RIOS"]);

// Known recurring venue keywords -> province. Used as a last resort for Rosgan
// rows whose `ubicacion_remate` is a venue name (no comma-province) but that
// carry a real per-event YouTube live link we don't want to lose. Kept small
// and high-confidence; anything not here is skipped rather than guessed.
const VENUE_PROVINCE_KEYWORDS = [
  [/chajar[ií]/i, "ENTRE RIOS"],
  [/curuz[uú]\s*cuati[aá]/i, "CORRIENTES"],
  [/mercedes/i, "CORRIENTES"],
  [/\bgoya\b/i, "CORRIENTES"],
  [/bella\s*vista/i, "CORRIENTES"],
  [/\bcorrientes\b/i, "CORRIENTES"],
  [/villa\s*berthet/i, "CHACO"],
];

function provinceFromVenue(text) {
  for (const [re, prov] of VENUE_PROVINCE_KEYWORDS) if (re.test(text || "")) return prov;
  return null;
}

// Spanish month names -> number (for ClicRural "11 de Junio" parsing of time/day fallback).
const MONTHS_ES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

// ---------------------------------------------------------------------------
// Source: Reggi & Cía S.R.L  (clicrural.com.uy white-label home)
// All upcoming remates are server-rendered in the home calendar block.
// ---------------------------------------------------------------------------
async function scrapeReggi() {
  const SRC = "Reggi & Cía";
  try {
    const html = await fetchText("https://reggiycia.com/");
    const items = html.match(
      /<div class="home-remates-calendario-list-item [^"]*">[\s\S]*?<\/a>\s*<\/div>/g
    ) || html.match(/<div class="home-remates-calendario-list-item [^"]*">[\s\S]*?<\/a>/g) || [];

    const out = [];
    for (const item of items) {
      const href = (item.match(/href="(\/remate\/\d+)"/) || [])[1];
      if (!href) continue;

      // Date: "Jueves 11/6/26" inside the header <p>.
      const dm = item.match(/-header[^>]*>\s*<p>\s*[A-Za-zÁÉÍÓÚáéíóú]+\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (!dm) continue;
      const day = dm[1].padStart(2, "0");
      const month = dm[2].padStart(2, "0");
      const year = dm[3].length === 2 ? `20${dm[3]}` : dm[3];
      const date = `${year}-${month}-${day}`;
      if (!isValidDate(date)) continue;

      const modality = unescapeHtml(stripTags((item.match(/<small>([\s\S]*?)<\/small>/) || [])[1] || ""));
      const title = unescapeHtml(stripTags((item.match(/<b>([\s\S]*?)<\/b>/) || [])[1] || "")) || "Remate";
      const hm = item.match(/-body-hora[^>]*>\s*<span[^>]*>\s*(\d{1,2}):(\d{2})/);
      const time = hm ? `${hm[1].padStart(2, "0")}:${hm[2]}` : null;

      const locRaw = unescapeHtml(stripTags((item.match(/-footer[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/) || [])[1] || ""));
      const [city, provRaw] = locRaw.split(",").map((s) => s.trim());
      const province = normalizeProvince(provRaw || "CORRIENTES");
      const location = provRaw ? `${city}, ${province}` : city || "Corrientes";

      const isStream = /televis|streaming/i.test(modality);
      out.push({
        title,
        consignatariaName: "Reggi & Cía",
        consignatariaSlug: "reggi-y-cia",
        date,
        time,
        location,
        province,
        type: inferType(`${modality} ${title}`),
        mainCategory: inferMainCategory(title),
        estimatedHeads: null,
        description: [modality, title].filter(Boolean).join(" — "),
        youtubeUrl: null, // no per-event stream URL exposed in the listing
        catalogUrl: null,
        source: isStream ? "tv" : "web",
        sourceUrl: `https://reggiycia.com${href}`,
        status: statusForDate(date),
      });
    }
    console.log(`  [Reggi] ${out.length} remates`);
    return out;
  } catch (err) {
    console.warn(`  [WARN] ${SRC}: ${err.message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Source: Aguerre SRL  (WordPress + The Events Calendar Tribe REST)
// Public JSON, no auth. Filter out Maquinaria/Activos; keep hacienda.
// ---------------------------------------------------------------------------
async function scrapeAguerre() {
  const SRC = "Aguerre SRL";
  try {
    const today = todayISO();
    const url = `https://www.aguerresrl.com.ar/wp-json/tribe/events/v1/events?per_page=50&start_date=${today}`;
    const data = await fetchJSON(url);
    const events = data?.events || [];
    const out = [];
    for (const ev of events) {
      const cats = (ev.categories || []).map((c) => (c.name || "").toLowerCase());
      // Skip non-hacienda lots (machinery / assets).
      if (cats.some((c) => /maquinaria|activos|inmueble/.test(c))) continue;

      const start = ev.start_date || ""; // "YYYY-MM-DD HH:MM:SS"
      const date = start.slice(0, 10);
      if (!isValidDate(date)) continue;
      const time = /\d{2}:\d{2}/.test(start.slice(11, 16)) ? start.slice(11, 16) : null;

      const city = ev.venue?.city || "Mercedes";
      const province = normalizeProvince(ev.venue?.province || "Corrientes");
      const location = `${city}, ${province}`;
      const title = unescapeHtml(ev.title || "Remate");
      const descText = unescapeHtml(stripTags(ev.description || ""));
      const ytMatch = descText.match(/https?:\/\/(?:www\.)?youtu(?:be\.com|\.be)\/[^\s"'<)]+/);
      const isStream = /pantalla|televis|streaming|internet/i.test(`${title} ${descText}`);

      out.push({
        title,
        consignatariaName: "Aguerre SRL",
        consignatariaSlug: "aguerre-srl",
        date,
        time,
        location,
        province,
        type: inferType(`${title} ${cats.join(" ")}`),
        mainCategory: inferMainCategory(`${title} ${cats.join(" ")}`),
        estimatedHeads: null,
        description: descText.slice(0, 300) || title,
        youtubeUrl: ytMatch ? ytMatch[0] : null,
        catalogUrl: ev.image?.url || null,
        source: isStream ? "tv" : "web",
        sourceUrl: ev.url || "https://www.aguerresrl.com.ar",
        status: statusForDate(date),
      });
    }
    console.log(`  [Aguerre] ${out.length} remates`);
    return out;
  } catch (err) {
    console.warn(`  [WARN] ${SRC}: ${err.message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Source: HRE (almoby Django REST). Use /remates/home (proximos) for the list,
// resolve provincia/localidad via cached /provincias and lazy /localidades.
// ---------------------------------------------------------------------------
async function scrapeHRE() {
  const SRC = "HRE";
  const API = "https://d17k8qfctf6esa.cloudfront.net/api";
  try {
    // Pull full list (has provincia/localidad/cabezas/tipo_lotes) and the home
    // proximos (has url_streaming). Merge by id.
    const [home, list, provData] = await Promise.all([
      fetchJSON(`${API}/remates/home/`).catch(() => null),
      fetchJSON(`${API}/remates/?page_size=100`).catch(() => null),
      fetchJSON(`${API}/provincias/`).catch(() => null),
    ]);

    const provMap = {};
    for (const p of provData?.results || []) provMap[p.id] = normalizeProvince(p.nombre);

    const detailById = {};
    for (const r of list?.results || []) detailById[r.id] = r;

    // proximos drives the set of upcoming events.
    const proximos = home?.proximos || [];
    const localityCache = {};
    const out = [];

    for (const p of proximos) {
      const det = detailById[p.id] || {};
      const fechaIso = p.fecha || det.fecha; // ISO UTC, e.g. 2026-07-03T14:00:00Z
      if (!fechaIso) continue;
      const d = new Date(fechaIso);
      if (isNaN(d.getTime())) continue;
      // Convert UTC -> Argentina (UTC-3) for date+time.
      const ar = new Date(d.getTime() - 3 * 3600 * 1000);
      const date = ar.toISOString().slice(0, 10);
      if (!isValidDate(date)) continue;
      const hh = String(ar.getUTCHours()).padStart(2, "0");
      const mm = String(ar.getUTCMinutes()).padStart(2, "0");
      const time = `${hh}:${mm}`;

      let province = provMap[det.provincia] || null;
      let cityName = null;
      if (det.localidad) {
        if (localityCache[det.localidad] === undefined) {
          const loc = await fetchJSON(`${API}/localidades/${det.localidad}/`).catch(() => null);
          localityCache[det.localidad] = loc ? { nombre: loc.nombre, prov: loc.provincia } : null;
        }
        const loc = localityCache[det.localidad];
        if (loc) {
          cityName = loc.nombre;
          if (!province && loc.prov && provMap[loc.prov]) province = provMap[loc.prov];
        }
      }
      const venue = det.lugar || null; // e.g. "Sociedad Rural de Chajarí"
      const cityLabel = cityName || venue || "";
      province = province || "CORRIENTES";
      const location = cityLabel ? `${cityLabel}, ${province}` : province;

      const title = unescapeHtml(p.nombre || det.nombre || "Remate");
      const tipoLotes = (det.tipo_lotes || []).join(" ");
      const isStream = det.tv || det.streaming || /pantalla|internet|televis/i.test(title);

      out.push({
        title,
        consignatariaName: "HRE",
        consignatariaSlug: "hre",
        date,
        time,
        location,
        province,
        type: inferType(`${title} ${tipoLotes}`),
        mainCategory: inferMainCategory(`${title} ${tipoLotes}`),
        estimatedHeads: det.cabezas && det.cabezas > 0 ? det.cabezas : null,
        description: [venue, tipoLotes].filter(Boolean).join(" · ") || title,
        youtubeUrl: p.url_streaming || det.url_streaming || null,
        catalogUrl: det.catalogo_path || p.url_foto || null,
        source: isStream ? "tv" : "web",
        sourceUrl: "https://www.hre.com.ar",
        status: statusForDate(date),
      });
    }
    console.log(`  [HRE] ${out.length} remates`);
    return out;
  } catch (err) {
    console.warn(`  [WARN] ${SRC}: ${err.message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Source: Rosgan / RosganNet (public JSON API). Pull all, filter to future +
// provinces we can resolve from the location suffix. NEA-relevant rows kept.
// ---------------------------------------------------------------------------
export async function scrapeRosgan() {
  const SRC = "Rosgan";
  try {
    const data = await fetchJSON(
      "https://api.rosgannet.com.ar/api/db/rosgan/app/public/remates_api_qry.xml?_limit=5000"
    );
    const rows = data?.data || [];
    const today = todayISO();
    const out = [];

    for (const r of rows) {
      const date = r.fecha_remate;
      if (!isValidDate(date) || date < today) continue;

      const ubic = (r.ubicacion_remate || "").trim();
      // Province only reliable from the comma-suffix abbreviation.
      let province = null;
      let city = ubic;
      const commaIdx = ubic.lastIndexOf(",");
      if (commaIdx !== -1) {
        city = ubic.slice(0, commaIdx).trim();
        const abbr = normalizeProvince(ubic.slice(commaIdx + 1));
        province = PROV_ABBR[abbr] || null;
      }
      const title = unescapeHtml(r.web_nombre || r.nombre_remate || "Remate");
      const tipo = (r.nombre_tipo || "").toLowerCase();
      let stream = (r.url_streaming || "").trim();
      // Normalize youtube.com/live and /embed forms; drop non-youtube.
      let youtubeUrl = null;
      if (/youtu/i.test(stream)) {
        youtubeUrl = stream.replace(/[?&]feature=share$/, "");
      }

      // No comma-province: only rescue rows that carry a real per-event YouTube
      // live link AND whose venue keyword maps to a known province (don't guess).
      if (!province) {
        if (youtubeUrl) province = provinceFromVenue(ubic);
        if (!province) continue;
      }
      const isStream = !!youtubeUrl || /pantalla|streaming|televis|faena/i.test(`${title} ${tipo}`);
      const hora = (r.hora_remate || "").slice(0, 5);
      const time = hora && hora !== "00:00" ? hora : null;

      out.push({
        title,
        consignatariaName: r.nombre_cuenta || "Rosgan",
        consignatariaSlug: slugify(r.nombre_cuenta || "rosgan"),
        date,
        time,
        location: `${city}, ${province}`,
        province,
        type: inferType(`${title} ${tipo}`),
        mainCategory: inferMainCategory(`${title} ${tipo}`),
        estimatedHeads: r.web_cabezas && r.web_cabezas > 0 ? r.web_cabezas : null,
        description: [r.nombre_tipo, title].filter(Boolean).join(" — "),
        youtubeUrl,
        catalogUrl: null,
        source: isStream ? "tv" : "web",
        sourceUrl: "https://app.rosgannet.com.ar/results-remates",
        status: statusForDate(date),
      });
    }
    console.log(`  [Rosgan] ${out.length} remates (province-resolvable, future)`);
    return out;
  } catch (err) {
    console.warn(`  [WARN] ${SRC}: ${err.message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Source: Canal Rural / El Rural — agenda de remates televisados.
// URL: elrural.com/remates/ mudó (302) a remates.elrural.com/ (2026-07). Se apunta
// directo al subdominio nuevo. Sigue bloqueada para IPs de datacenter (403); se
// fetchea desde IP residencial AR vía scripts/local-nea-fetch.mjs. Lista
// server-rendered:
// cada ítem tiene h3.titulo + h4.casa + h4.fecha ("DD de Mes") + h4.hora + botón ver-remate.
// ---------------------------------------------------------------------------
const PROVINCE_NAMES = [
  [/c[oó]rdoba/i, "CORDOBA"], [/corrientes/i, "CORRIENTES"], [/santa\s*fe/i, "SANTA FE"],
  [/entre\s*r[ií]os/i, "ENTRE RIOS"], [/buenos\s*aires/i, "BUENOS AIRES"], [/la\s*pampa/i, "LA PAMPA"],
  [/chaco/i, "CHACO"], [/formosa/i, "FORMOSA"], [/misiones/i, "MISIONES"], [/salta/i, "SALTA"],
  [/santiago\s*del\s*estero/i, "SANTIAGO DEL ESTERO"], [/tucum[aá]n/i, "TUCUMAN"], [/jujuy/i, "JUJUY"],
  [/san\s*luis/i, "SAN LUIS"], [/la\s*rioja/i, "LA RIOJA"], [/catamarca/i, "CATAMARCA"],
  [/r[ií]o\s*negro/i, "RIO NEGRO"], [/neuqu[eé]n/i, "NEUQUEN"], [/mendoza/i, "MENDOZA"],
];
function provinceFromTitle(t) {
  for (const [re, p] of PROVINCE_NAMES) if (re.test(t || "")) return p;
  return null;
}

export async function scrapeCanalRural() {
  const SRC = "Canal Rural";
  try {
    const html = await fetchText("https://remates.elrural.com/", 25000);
    const today = todayISO();
    const year0 = Number(today.slice(0, 4));
    const out = [];
    // Anclar en cada botón ver-remate; el ítem es el texto entre el botón previo y este.
    const btns = [...html.matchAll(/<button[^>]*class="[^"]*ver-remate[^"]*"[^>]*href="([^"]*)"/g)];
    let prevEnd = 0;
    for (const b of btns) {
      const ctx = html.slice(prevEnd, b.index);
      prevEnd = b.index;
      let casa = unescapeHtml(stripTags((ctx.match(/<h4 class="casa[^"]*">([\s\S]*?)<\/h4>/) || [])[1] || "")).trim();
      const titulo = unescapeHtml(stripTags((ctx.match(/<h3 class="[^"]*titulo[^"]*">([\s\S]*?)<\/h3>/) || [])[1] || "")).trim();
      // A veces la "casa" viene basura (un dominio, ej. "elrural.com") → el nombre
      // real de la firma está en el título antes del "|" ("Campos Bajos SRL | Gordos…").
      if (/\.(com|ar|net|org)\b/i.test(casa) || !/[a-zA-Z]{3}/.test(casa)) casa = "";
      const name = casa || titulo.split("|")[0].trim();
      if (!name || /\.(com|ar|net|org)\b/i.test(name)) continue;

      const fm = ctx.match(/(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóú]+)/);
      if (!fm) continue;
      const day = parseInt(fm[1], 10);
      const mon = MONTHS_ES[fm[2].toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")];
      if (!mon) continue;
      let year = year0;
      const mk = (y) => `${y}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      let date = mk(year);
      if (date < today) date = mk(++year); // fecha pasada en este año → próxima
      if (!isValidDate(date)) continue;

      const hm = ctx.match(/(\d{1,2}):(\d{2})\s*hs/i);
      const time = hm ? `${hm[1].padStart(2, "0")}:${hm[2]}` : null;
      const province = provinceFromVenue(titulo) || provinceFromTitle(titulo);

      out.push({
        title: titulo || name,
        consignatariaName: name,
        consignatariaSlug: slugify(name),
        date,
        time,
        location: "",
        province: province ? normalizeProvince(province) : null,
        type: inferType(titulo),
        mainCategory: inferMainCategory(titulo),
        estimatedHeads: null,
        description: titulo,
        youtubeUrl: null,
        catalogUrl: b[1] || null,
        source: "tv", // Canal Rural = televisado
        sourceUrl: "https://remates.elrural.com/",
        status: statusForDate(date),
      });
    }
    console.log(`  [Canal Rural] ${out.length} remates`);
    return out;
  } catch (err) {
    console.warn(`  [WARN] ${SRC}: ${err.message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Source: ClicRural cartelera (national aggregator). Filter to NEA provinces.
// Server-rendered <li> cards with semantic data-* attributes.
// ---------------------------------------------------------------------------
async function scrapeClicRural() {
  const SRC = "ClicRural";
  try {
    const html = await fetchText("https://clicrural.com.ar/remates/cartelera", 30000);
    // Split per card on the opening <li ... data-search ...>; each chunk holds one card.
    const cards = html
      .split(/(?=<li\s+\n?\s*data-search)/)
      .filter((c) => c.includes("data-date-min"));

    const out = [];
    for (const card of cards) {
      const attrs = {};
      for (const m of card.matchAll(/data-([a-z-]+)="([^"]*)"/g)) attrs[m[1]] = m[2];

      const dateMin = attrs["date-min"]; // YYYY/MM/DD
      if (!dateMin) continue;
      const date = dateMin.replace(/\//g, "-");
      if (!isValidDate(date)) continue;

      const province = CLICRURAL_LOCATION[attrs["location"]] || null;
      if (!province || !NEA_PROVINCES.has(province)) continue; // NEA only

      const id = (card.match(/href="\/remate\/(\d+)"/) || [])[1];
      if (!id) continue;

      const titleRaw = unescapeHtml(
        ((card.match(/<h4>\s*<a[^>]*>([\s\S]*?)<\/a>/) || [])[1] || attrs["search"] || "").trim()
      );
      const title = titleRaw || "Remate";
      // Skip obvious test cards.
      if (/^prueba\b/i.test(title) || /^prueba\b/i.test(attrs["search"] || "")) continue;

      // Pull Fecha / Organiza / Lugar from the inner info list.
      const info = {};
      for (const m of card.matchAll(/<b>(Fecha|Organiza|Lugar)<\/b>\s*:?\s*([^<]+)/g)) {
        info[m[1]] = unescapeHtml(m[2].trim());
      }

      // Time from "11 de Junio, 14:30 hs."
      let time = null;
      const tm = (info.Fecha || "").match(/(\d{1,2}):(\d{2})\s*hs/i);
      if (tm) time = `${tm[1].padStart(2, "0")}:${tm[2]}`;

      const company = info.Organiza || (attrs["company"] || "").replace(/-/g, " ");
      const consignatariaName = company.replace(/\b\w/g, (c) => c.toUpperCase());

      // Lugar = "Ciudad - Provincia"
      let city = "";
      if (info.Lugar) city = info.Lugar.split(" - ")[0].trim();
      const location = city ? `${city}, ${province}` : province;

      const aType = attrs["auction-type"] || "";
      const isStream = attrs["stream"] === "1" || /pantalla|internet|televis/i.test(`${aType} ${title}`);
      const flyer = (card.match(/<img class="img-responsive"\s+src="([^"]+)"/) || [])[1] || null;

      out.push({
        title,
        consignatariaName,
        consignatariaSlug: slugify(company),
        date,
        time,
        location,
        province,
        type: inferType(`${aType} ${title}`),
        mainCategory: inferMainCategory(`${aType} ${title}`),
        estimatedHeads: null,
        description: [aType, title].filter(Boolean).join(" — "),
        youtubeUrl: null, // stream flag only; no public per-event URL
        catalogUrl: flyer,
        source: isStream ? "tv" : "web",
        sourceUrl: `https://clicrural.com.ar/remate/${id}`,
        status: statusForDate(date),
      });
    }
    console.log(`  [ClicRural] ${out.length} remates (NEA)`);
    return out;
  } catch (err) {
    console.warn(`  [WARN] ${SRC}: ${err.message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Aggregator
// ---------------------------------------------------------------------------
export async function scrapeNEA() {
  const sources = await Promise.all([
    scrapeReggi(),
    scrapeAguerre(),
    scrapeHRE(),
    scrapeRosgan(),
    scrapeClicRural(),
  ]);
  const all = sources.flat();
  // Final safety: only valid-dated rows.
  return all.filter((a) => a && isValidDate(a.date));
}

// ---------------------------------------------------------------------------
// Self-test (no file writes)
// ---------------------------------------------------------------------------
const isMain = process.argv[1] && process.argv[1].endsWith("nea.mjs");
if (isMain) {
  (async () => {
    console.log(`\n=== NEA scraper self-test — ${todayISO()} ===\n`);
    const named = [
      ["Reggi & Cía", scrapeReggi],
      ["Aguerre SRL", scrapeAguerre],
      ["HRE", scrapeHRE],
      ["Rosgan", scrapeRosgan],
      ["ClicRural", scrapeClicRural],
    ];
    const all = [];
    for (const [name, fn] of named) {
      const rows = await fn();
      console.log(`${name}: ${rows.length}`);
      all.push(...rows);
    }
    const valid = all.filter((a) => isValidDate(a.date));

    console.log(`\nTotal NEA remates: ${valid.length}`);

    const byProv = {};
    for (const a of valid) byProv[a.province] = (byProv[a.province] || 0) + 1;
    console.log("\nBy province:");
    for (const [p, n] of Object.entries(byProv).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${p}: ${n}`);
    }

    const withYt = valid.filter((a) => a.youtubeUrl).length;
    console.log(`\nWith youtubeUrl/stream: ${withYt}`);

    console.log("\nSample (up to 6):");
    for (const a of valid.slice(0, 6)) {
      console.log(
        `  ${a.date} ${a.time || "--:--"} | ${a.province} | ${a.consignatariaName} | ${a.title}` +
          `${a.youtubeUrl ? " | YT" : ""} [${a.source}/${a.status}]`
      );
    }
    console.log("");
  })().catch((err) => {
    console.error("Self-test failed:", err);
    process.exit(1);
  });
}
