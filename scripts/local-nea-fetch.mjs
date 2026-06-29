#!/usr/bin/env node
/**
 * local-nea-fetch.mjs — corre EN TU MÁQUINA (Corrientes, IP residencial AR).
 *
 * Por qué existe:
 *   El runner de GitHub Actions (IP de datacenter) recibe 403/fetch-failed de
 *   Rosgan y Entre Surcos. Tu IP residencial argentina recibe 200. Así que estas
 *   2 fuentes se fetchean DESDE TU MÁQUINA y se escriben a remates-local-nea.json,
 *   que el scraper de la nube (scrape-auctions.mjs) lee y mergea. Cero proxy.
 *
 * Qué hace:
 *   1. Corre scrapeEntreSurcos() (prioridad — transmite remates con stream) y
 *      scrapeRosgan() reusando las funciones canónicas del repo.
 *   2. Escribe src/lib/data/remates-local-nea.json.
 *   3. Commitea + pushea SOLO ese archivo (rebase autostash, no toca el resto).
 *
 * Uso:
 *   node scripts/local-nea-fetch.mjs            # fetch + commit + push
 *   node scripts/local-nea-fetch.mjs --no-push  # solo fetch + escribe (test)
 *
 * Agendar con Task Scheduler (ver scripts/local-nea-fetch.bat).
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { scrapeRosgan } from "./scrapers/nea.mjs";
import { scrapeEntreSurcos } from "./scrape-auctions.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const OUT = resolve(REPO, "src/lib/data/remates-local-nea.json");
const REL = "src/lib/data/remates-local-nea.json";
const noPush = process.argv.includes("--no-push");

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: REPO, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
}

(async () => {
  console.log("=== local-nea-fetch (IP residencial AR) ===");
  // Entre Surcos primero (prioridad: transmite con stream); Rosgan de yapa.
  const [es, ros] = await Promise.all([
    scrapeEntreSurcos().catch((e) => { console.error("Entre Surcos:", e.message); return []; }),
    scrapeRosgan().catch((e) => { console.error("Rosgan:", e.message); return []; }),
  ]);
  const all = [...es, ...ros];
  console.log(`Entre Surcos: ${es.length} · Rosgan: ${ros.length} · total: ${all.length}`);

  if (all.length === 0) {
    // No pisar el último archivo bueno con vacío (red caída / sitios abajo).
    console.log("0 remates — no sobreescribo el archivo. Salgo.");
    return;
  }

  writeFileSync(OUT, JSON.stringify(all, null, 2) + "\n");
  console.log(`Escrito ${REL} (${all.length} remates)`);

  if (noPush) { console.log("--no-push: listo (sin commit)."); return; }

  // Commitear SOLO ese archivo (seguro aunque haya otros cambios sin commitear).
  git(`add ${REL}`);
  let staged = "";
  try { staged = git(`diff --cached --name-only -- ${REL}`); } catch { /* */ }
  if (!staged) { console.log("Sin cambios en el archivo — nada que commitear."); return; }
  const d = new Date().toISOString().slice(0, 10);
  git(`commit -m "data: fetch local NEA (Entre Surcos/Rosgan) — ${d}" -- ${REL}`);
  try { git("pull --rebase --autostash origin main"); } catch (e) { console.error("pull:", e.message); }
  git("push origin main");
  console.log("Commiteado + pusheado.");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
