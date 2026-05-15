#!/usr/bin/env node
/**
 * Fetch INMAG historical data from MAG using the LISTADO=SI endpoint
 * 
 * Usage: node scripts/fetch-inmag-history.mjs [--from=01/01/2024]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const fromArg = args.find(a => a.startsWith('--from='));
const FROM_DATE = fromArg ? fromArg.split('=')[1] : '01/01/2024';

const today = new Date();
const TO_DATE = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

const URL = `https://www.mercadoagroganadero.com.ar/dll/hacienda2.dll/haciinfo000011?txtFECHAINI=${FROM_DATE}&txtFECHAFIN=${TO_DATE}&CP=&LISTADO=SI`;

console.log('='.repeat(60));
console.log('INMAG Historical Data Fetcher');
console.log('='.repeat(60));
console.log(`Period: ${FROM_DATE} → ${TO_DATE}`);
console.log('');

async function fetchData() {
  console.log('Fetching from MAG...');
  
  const response = await fetch(URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html',
    }
  });
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function parseData(html) {
  const results = [];
  
  // Parse HTML table rows
  // Format: <TR VAlign="Middle"...><TD>Date</TD><TD>Cab</TD><TD>Importe</TD><TD>INMAG</TD>...
  const rowPattern = /<TR\s+VAlign="Middle"[^>]*>([\s\S]*?)<\/TR>/gi;
  let match;
  
  while ((match = rowPattern.exec(html)) !== null) {
    const rowHtml = match[1];
    
    // Skip header rows
    if (rowHtml.includes('<TH')) continue;
    
    // Extract cells
    const cellPattern = /<TD[^>]*>([\s\S]*?)<\/TD>/gi;
    const cells = [];
    let cellMatch;
    
    while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
      // Clean cell: remove tags, &nbsp;, trim
      const clean = cellMatch[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      cells.push(clean);
    }
    
    // Need at least 4 cells: Date, Cab, Importe, INMAG
    if (cells.length < 4) continue;
    
    // Parse date (format: "Vi 03/01/2025")
    const dateMatch = cells[0].match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!dateMatch) continue;
    
    const [_, day, month, year] = dateMatch;
    const isoDate = `${year}-${month}-${day}`;
    
    // Parse INMAG (4th cell, format: "2.252,500" or "- *")
    const inmagStr = cells[3];
    if (inmagStr.includes('*') || inmagStr === '-') continue;
    
    const value = parseFloat(inmagStr.replace(/\./g, '').replace(',', '.'));
    if (isNaN(value) || value < 1000 || value > 10000) continue;
    
    // Parse cabezas
    const volume = parseInt(cells[1].replace(/\./g, '')) || undefined;
    
    results.push({
      date: isoDate,
      value: Math.round(value * 100) / 100,
      ...(volume && { volume })
    });
  }
  
  // Sort and dedupe by date
  const map = new Map();
  for (const r of results) map.set(r.date, r);
  
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

async function main() {
  const html = await fetchData();
  console.log(`Received ${(html.length / 1024).toFixed(1)} KB\n`);
  
  const data = parseData(html);
  
  console.log('='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));
  console.log(`Parsed: ${data.length} trading days with valid INMAG`);
  
  if (data.length === 0) {
    console.log('\n❌ No data parsed. Saving HTML for debug...');
    fs.writeFileSync('mag-debug.html', html);
    return;
  }
  
  console.log(`Range: ${data[0].date} → ${data[data.length - 1].date}`);
  
  // Recent values
  console.log('\nRecent values:');
  data.slice(-8).forEach(p => {
    console.log(`  ${p.date}: $${p.value.toLocaleString('es-AR')}${p.volume ? ` (${p.volume.toLocaleString()} cab)` : ''}`);
  });
  
  // Stats
  const values = data.map(d => d.value);
  console.log('\nStats:');
  console.log(`  Min: $${Math.min(...values).toLocaleString('es-AR')}`);
  console.log(`  Max: $${Math.max(...values).toLocaleString('es-AR')}`);
  console.log(`  Avg: $${(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)}`);
  
  // Load and update market-prices.json
  const marketPricesPath = path.join(__dirname, '../src/lib/data/market-prices.json');
  const existing = JSON.parse(fs.readFileSync(marketPricesPath, 'utf8'));
  
  const oldCount = existing.inmag.series.length;
  existing.inmag.series = data;
  
  // Update current/prev
  const latest = data[data.length - 1];
  const prev = data[data.length - 2];
  if (latest && prev) {
    existing.inmag.current = latest.value;
    existing.inmag.prev = prev.value;
    existing.inmag.change = Math.round(((latest.value - prev.value) / prev.value) * 1000) / 10;
  }
  
  fs.writeFileSync(marketPricesPath, JSON.stringify(existing, null, 2));
  
  console.log(`\n✓ Updated: ${oldCount} → ${data.length} data points`);
  console.log(`✓ Saved: ${marketPricesPath}`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
