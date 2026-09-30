// Prueba offline: node scripts/ofarrell-parse.check.mjs <cartelera.html>
import { readFileSync } from "node:fs";
import { parseOFarrellHtml } from "./ofarrell-parse.mjs";
const r = parseOFarrellHtml(readFileSync(process.argv[2], "utf-8"));
for (const x of r) console.log(x.date, x.time, "|", x.title, "|", x.sede, "→", x.location ?? "SIN RESOLVER", "/", x.province ?? "-");
console.log("total", r.length);
