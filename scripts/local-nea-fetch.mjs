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
import { writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { scrapeRosgan, scrapeCanalRural } from "./scrapers/nea.mjs";
import { scrapeEntreSurcos } from "./scrape-auctions.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const OUT = resolve(REPO, "src/lib/data/remates-local-nea.json");
const REL = "src/lib/data/remates-local-nea.json";
// Worktree auxiliar en main, reusado entre corridas: publica el dato aunque el
// checkout principal esté parado en una rama feature de otra sesión (no la toca).
const PUBLISH_WT = resolve(REPO, "..", "consignatarias-nea-publish-wt");
const noPush = process.argv.includes("--no-push");

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: REPO, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
}

function gitAt(cmd, cwd) {
  return execSync(`git ${cmd}`, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
}

// Commitea+pushea el archivo a origin/main desde un worktree separado, sin
// tocar el checkout principal (que puede estar en cualquier rama, con
// cambios propios sin commitear de otra sesión).
function publishViaWorktree(all) {
  if (!existsSync(PUBLISH_WT)) {
    console.log(`Creando worktree auxiliar en ${PUBLISH_WT} (rama main)...`);
    git(`worktree add "${PUBLISH_WT}" main`);
  }
  try { gitAt("checkout main", PUBLISH_WT); } catch (e) { console.error("worktree checkout main:", e.message); return; }
  try { gitAt("pull --ff-only origin main", PUBLISH_WT); } catch (e) { console.error("worktree pull:", e.message); }
  writeFileSync(resolve(PUBLISH_WT, REL), JSON.stringify(all, null, 2) + "\n");
  gitAt(`add ${REL}`, PUBLISH_WT);
  let staged = "";
  try { staged = gitAt(`diff --cached --name-only -- ${REL}`, PUBLISH_WT); } catch { /* */ }
  if (!staged) { console.log("Worktree auxiliar: sin cambios en el archivo — nada que commitear."); return; }
  const d = new Date().toISOString().slice(0, 10);
  gitAt(`commit -m "data: fetch local NEA (Entre Surcos/Rosgan) — ${d}" -- ${REL}`, PUBLISH_WT);
  try { gitAt("pull --rebase --autostash origin main", PUBLISH_WT); } catch (e) { console.error("worktree pull --rebase:", e.message); }
  gitAt("push origin main", PUBLISH_WT);
  console.log("Publicado via worktree auxiliar (checkout principal intacto).");
}

(async () => {
  console.log("=== local-nea-fetch (IP residencial AR) ===");
  // Entre Surcos (prioridad: transmite con stream) + Rosgan + Canal Rural (elrural.com).
  const [es, ros, cr] = await Promise.all([
    scrapeEntreSurcos().catch((e) => { console.error("Entre Surcos:", e.message); return []; }),
    scrapeRosgan().catch((e) => { console.error("Rosgan:", e.message); return []; }),
    scrapeCanalRural().catch((e) => { console.error("Canal Rural:", e.message); return []; }),
  ]);
  const all = [...es, ...ros, ...cr];
  console.log(`Entre Surcos: ${es.length} · Rosgan: ${ros.length} · Canal Rural: ${cr.length} · total: ${all.length}`);

  if (all.length === 0) {
    // No pisar el último archivo bueno con vacío (red caída / sitios abajo).
    console.log("0 remates — no sobreescribo el archivo. Salgo.");
    return;
  }

  writeFileSync(OUT, JSON.stringify(all, null, 2) + "\n");
  console.log(`Escrito ${REL} (${all.length} remates)`);

  if (noPush) { console.log("--no-push: listo (sin commit)."); return; }

  // Si el checkout no está en main (otra sesión dejó una rama feature activa),
  // commitear acá pegaría el dato en la rama equivocada y el push a origin main
  // quedaría rechazado (non-fast-forward) sin avisar por qué. El archivo ya
  // quedó escrito en disco arriba, así que no se pierde nada: se corta antes
  // de tocar git y se avisa fuerte.
  const branch = git("rev-parse --abbrev-ref HEAD");
  if (branch !== "main") {
    console.error(`Checkout principal en '${branch}', no en 'main' (otra sesión) — publico via worktree auxiliar sin tocarlo.`);
    publishViaWorktree(all);
    return;
  }

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
