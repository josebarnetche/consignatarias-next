#!/usr/bin/env node
/**
 * merge-enrichment.mjs
 *
 * Merges agent research results (results-1..4.json) into frigorificos-enriched.json
 * Matches by CUIT to avoid fuzzy name issues.
 *
 * Usage: node scripts/merge-enrichment.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const ENRICHED = join(ROOT, 'src/lib/data/frigorificos-enriched.json');

// Load current enriched data
const enriched = JSON.parse(readFileSync(ENRICHED, 'utf-8'));
console.log(`Loaded ${enriched.length} entries from frigorificos-enriched.json`);

// Load all result files
const results = [];
for (let i = 1; i <= 4; i++) {
  const file = join(__dirname, `results-${i}.json`);
  const data = JSON.parse(readFileSync(file, 'utf-8'));
  results.push(...data);
  console.log(`Loaded ${data.length} entries from results-${i}.json`);
}
console.log(`Total research results: ${results.length}`);

// Build lookup by CUIT
const resultsByCuit = new Map();
for (const r of results) {
  if (r.cuit) {
    resultsByCuit.set(r.cuit, r);
  }
}

// Also build by normalized name for fallback
function normName(n) {
  return n.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.,\-()]/g, ' ').replace(/\s+/g, ' ').trim();
}
const resultsByName = new Map();
for (const r of results) {
  resultsByName.set(normName(r.name), r);
}

// Merge results into enriched data
let mergedCount = 0;
let skippedCsv = 0;
let notFound = 0;

const today = new Date().toISOString().split('T')[0];

for (const entry of enriched) {
  // Skip entries already enriched from CSV with actual contact data
  if (entry.enrichmentSource === 'csv' && (entry.telefono || entry.email || entry.web)) {
    skippedCsv++;
    continue;
  }

  // Find matching research result
  let result = resultsByCuit.get(entry.cuit);
  if (!result) {
    result = resultsByName.get(normName(entry.name));
  }

  if (!result) {
    notFound++;
    continue;
  }

  // Merge: research data fills in gaps, doesn't overwrite CSV data
  const hasNewData = result.telefono || result.email || result.web || result.localidad || result.direccion;
  if (!hasNewData) {
    continue;
  }

  entry.telefono = entry.telefono || result.telefono || null;
  entry.email = entry.email || result.email || null;
  entry.web = entry.web || result.web || null;
  entry.localidad = entry.localidad || result.localidad || null;
  entry.direccion = entry.direccion || result.direccion || null;
  entry.grupoEmpresario = entry.grupoEmpresario || result.grupoEmpresario || null;
  entry.tipo = entry.tipo || result.tipo || null;
  entry.volumenFaena = entry.volumenFaena || result.volumenFaena || null;
  entry.notas = entry.notas || result.notas || null;
  entry.enrichedAt = today;
  entry.enrichmentSource = entry.enrichmentSource === 'csv' ? 'csv' : 'web';
  mergedCount++;
}

// Write final result
writeFileSync(ENRICHED, JSON.stringify(enriched, null, 2), 'utf-8');

// Stats
const withPhone = enriched.filter(e => e.telefono).length;
const withEmail = enriched.filter(e => e.email).length;
const withWeb = enriched.filter(e => e.web).length;
const withLocalidad = enriched.filter(e => e.localidad).length;
const withDireccion = enriched.filter(e => e.direccion).length;
const withTipo = enriched.filter(e => e.tipo).length;
const anyEnriched = enriched.filter(e => e.enrichmentSource).length;

console.log(`\n--- Merge Summary ---`);
console.log(`Merged from web research: ${mergedCount}`);
console.log(`Preserved from CSV:       ${skippedCsv}`);
console.log(`Not found in results:     ${notFound}`);
console.log(`\n--- Final Coverage ---`);
console.log(`Total entries:     ${enriched.length}`);
console.log(`With phone:        ${withPhone} (${(withPhone/enriched.length*100).toFixed(1)}%)`);
console.log(`With email:        ${withEmail} (${(withEmail/enriched.length*100).toFixed(1)}%)`);
console.log(`With website:      ${withWeb} (${(withWeb/enriched.length*100).toFixed(1)}%)`);
console.log(`With localidad:    ${withLocalidad} (${(withLocalidad/enriched.length*100).toFixed(1)}%)`);
console.log(`With dirección:    ${withDireccion} (${(withDireccion/enriched.length*100).toFixed(1)}%)`);
console.log(`With tipo:         ${withTipo} (${(withTipo/enriched.length*100).toFixed(1)}%)`);
console.log(`Any enrichment:    ${anyEnriched} (${(anyEnriched/enriched.length*100).toFixed(1)}%)`);
console.log(`\nOutput: ${ENRICHED}`);
