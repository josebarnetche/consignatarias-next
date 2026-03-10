#!/usr/bin/env node
/**
 * enrich-frigorificos.mjs
 *
 * Merges frigorificos.json (364 SENASA entries) with frigorificos_target.csv (40 researched entries)
 * and outputs frigorificos-enriched.json with expanded schema.
 *
 * Usage: node scripts/enrich-frigorificos.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// --- Paths ---
const FRIGO_JSON = join(ROOT, 'src/lib/data/frigorificos.json');
const CSV_TARGET = join(ROOT, 'pitch-consignatarias/frigorificos_target.csv');
const OUTPUT = join(ROOT, 'src/lib/data/frigorificos-enriched.json');

// --- Helpers ---

/** Normalize name for fuzzy matching: uppercase, strip legal suffixes, trim */
const LEGAL_SUFFIX_RE = /\s*(S\.?A\.?S\.?|S\.?R\.?L\.?|S\.?A\.?I\.?C\.?I\.?F\.?|S\.?A\.?I\.?C\.?|S\.?A\.?|S\.?C\.?A\.?|S\.?A\.?U\.?|S\.?E\.?|C\.?E\.?I\.?|S ?A ?P ?E ?M)\s*$/i;
function normalizeName(name) {
  return name
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(LEGAL_SUFFIX_RE, '')
    .replace(/\s*(SOCIEDAD ANONIMA|SOCIEDAD DE RESPONSABILIDAD LIMITADA)\s*$/i, '')
    .replace(/\(EX[^)]*\)/g, '') // strip "(ex-Xxx)" parentheticals
    .replace(/\bPLANTAS?\b/g, '') // "Plantas Mattievich" → "Mattievich"
    .replace(/[.,\-()]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b(\w) (?=\w\b)/g, '$1') // collapse spaced-out letters: "F R I A R" → "FRIAR"
    .replace(LEGAL_SUFFIX_RE, '') // re-strip after collapsing ("S A" → "SA" → stripped)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse CSV line handling quoted fields */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/** Map CSV tipo to schema tipo */
function mapTipo(csvTipo) {
  if (!csvTipo) return null;
  const t = csvTipo.toLowerCase().trim();
  if (t === 'exportador') return 'exportador';
  if (t === 'consumo interno' || t === 'consumo_interno') return 'consumo_interno';
  if (t === 'ambos') return 'ambos';
  return null;
}

// --- Main ---

// 1. Load base frigorificos
const frigorificos = JSON.parse(readFileSync(FRIGO_JSON, 'utf-8'));
console.log(`Loaded ${frigorificos.length} frigoríficos from JSON`);

// 2. Parse CSV target
const csvRaw = readFileSync(CSV_TARGET, 'utf-8');
const csvLines = csvRaw.split('\n').filter(l => l.trim());
const csvHeader = csvLines[0];
const csvData = csvLines.slice(1).map(line => {
  const fields = parseCSVLine(line);
  // empresa,grupo_empresario,tipo,provincia,localidad,direccion,telefono,email,web,volumen_faena_cabezas,notas
  return {
    empresa: fields[0] || '',
    grupoEmpresario: fields[1] || null,
    tipo: mapTipo(fields[2]),
    provincia: fields[3] || null,
    localidad: fields[4] || null,
    direccion: fields[5] || null,
    telefono: fields[6] || null,
    email: fields[7] || null,
    web: fields[8] || null,
    volumenFaena: fields[9] ? parseInt(fields[9], 10) || null : null,
    notas: fields[10] && fields[10] !== 'Sin datos de contacto disponibles' ? fields[10] : null,
  };
});
console.log(`Loaded ${csvData.length} entries from CSV target`);

// 3. Build normalized CSV lookup
const csvLookup = new Map();
for (const entry of csvData) {
  const key = normalizeName(entry.empresa);
  csvLookup.set(key, entry);
}

// 4. Merge: for each frigorífico, try to find CSV match
let matchCount = 0;
const enriched = frigorificos.map(frigo => {
  const base = {
    // Original fields
    cuit: frigo.cuit,
    name: frigo.name,
    matricula: frigo.matricula,
    province: frigo.province,
    stage: frigo.stage,
    // New fields (defaults)
    grupoEmpresario: null,
    tipo: null,
    localidad: null,
    direccion: null,
    telefono: null,
    email: null,
    web: null,
    volumenFaena: null,
    notas: null,
    enrichedAt: null,
    enrichmentSource: null,
  };

  // Try fuzzy match against CSV
  const normalizedName = normalizeName(frigo.name);

  // Try exact normalized match first
  let csvMatch = csvLookup.get(normalizedName);

  // Try substring matching if exact fails — but require high specificity
  if (!csvMatch) {
    // Common generic words to ignore for matching
    const genericWords = new Set(['FRIGORIFICO', 'MATADERO', 'CARNES', 'INDUSTRIAS', 'FRIGORIFICAS', 'REGIONAL', 'MUNICIPAL', 'COMPANIA', 'SOCIEDAD']);

    for (const [csvKey, csvEntry] of csvLookup.entries()) {
      // Check if one fully contains the other (must be a substantial match)
      if (normalizedName === csvKey) {
        csvMatch = csvEntry;
        break;
      }

      // Get significant (non-generic) words
      const frigoWords = normalizedName.split(' ').filter(w => w.length > 2 && !genericWords.has(w));
      const csvWords = csvKey.split(' ').filter(w => w.length > 2 && !genericWords.has(w));

      if (frigoWords.length === 0 || csvWords.length === 0) continue;

      // Require ALL significant words from CSV to appear in frigo name, or vice versa
      const csvInFrigo = csvWords.every(w => frigoWords.includes(w));
      const frigoInCsv = frigoWords.every(w => csvWords.includes(w));

      if ((csvInFrigo || frigoInCsv) && Math.min(frigoWords.length, csvWords.length) >= 1) {
        // Extra check: the matching significant words must cover at least 50% of both sides
        const commonWords = frigoWords.filter(w => csvWords.includes(w));
        const coverage = Math.min(commonWords.length / frigoWords.length, commonWords.length / csvWords.length);
        if (coverage >= 0.5 && commonWords.length >= 1) {
          csvMatch = csvEntry;
          break;
        }
      }
    }
  }

  if (csvMatch) {
    matchCount++;
    const hasData = csvMatch.telefono || csvMatch.email || csvMatch.web || csvMatch.direccion;
    base.grupoEmpresario = csvMatch.grupoEmpresario || null;
    base.tipo = csvMatch.tipo;
    base.localidad = csvMatch.localidad || null;
    base.direccion = csvMatch.direccion || null;
    base.telefono = csvMatch.telefono || null;
    base.email = csvMatch.email || null;
    base.web = csvMatch.web || null;
    base.volumenFaena = csvMatch.volumenFaena || null;
    base.notas = csvMatch.notas || null;
    base.enrichedAt = new Date().toISOString().split('T')[0];
    base.enrichmentSource = 'csv';

    if (hasData) {
      console.log(`  ✓ Match: "${frigo.name}" ← CSV "${csvMatch.empresa}" (with contact data)`);
    } else {
      console.log(`  ~ Match: "${frigo.name}" ← CSV "${csvMatch.empresa}" (no contact data)`);
    }
  }

  return base;
});

// 5. Write enriched output
writeFileSync(OUTPUT, JSON.stringify(enriched, null, 2), 'utf-8');
console.log(`\n--- Summary ---`);
console.log(`Total frigoríficos: ${enriched.length}`);
console.log(`CSV matches: ${matchCount}`);
console.log(`With contact data: ${enriched.filter(e => e.telefono || e.email || e.web).length}`);
console.log(`Pending enrichment: ${enriched.filter(e => !e.enrichmentSource).length}`);
console.log(`\nOutput: ${OUTPUT}`);

// 6. Generate pending list by stage priority
const pending = enriched
  .filter(e => !e.enrichmentSource || (!e.telefono && !e.email && !e.web))
  .sort((a, b) => a.stage - b.stage);

const pendingByStage = {
  1: pending.filter(e => e.stage === 1),
  2: pending.filter(e => e.stage === 2),
  3: pending.filter(e => e.stage === 3),
};

console.log(`\nPending by stage:`);
console.log(`  Stage 1 (faena+desposte): ${pendingByStage[1].length}`);
console.log(`  Stage 2 (desposte):       ${pendingByStage[2].length}`);
console.log(`  Stage 3 (depósito):       ${pendingByStage[3].length}`);

// Write pending list for agents
const pendingFile = join(ROOT, 'scripts/frigorificos-pending.json');
writeFileSync(pendingFile, JSON.stringify({
  generated: new Date().toISOString(),
  totalPending: pending.length,
  byStage: {
    stage1: pendingByStage[1].map(e => ({ cuit: e.cuit, name: e.name, province: e.province, stage: e.stage })),
    stage2: pendingByStage[2].map(e => ({ cuit: e.cuit, name: e.name, province: e.province, stage: e.stage })),
    stage3: pendingByStage[3].map(e => ({ cuit: e.cuit, name: e.name, province: e.province, stage: e.stage })),
  }
}, null, 2), 'utf-8');
console.log(`\nPending list: ${pendingFile}`);
