#!/usr/bin/env node
/**
 * Fetch INMAG historical data day by day from Mercado Agroganadero
 * 
 * Usage: node scripts/fetch-inmag-daily.mjs [--days=90]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INMAG_URL = 'https://www.mercadoagroganadero.com.ar/dll/hacienda2.dll/haciinfo000013';

const args = process.argv.slice(2);
const daysArg = args.find(a => a.startsWith('--days='));
const DAYS_TO_FETCH = daysArg ? parseInt(daysArg.split('=')[1]) : 90;

console.log('='.repeat(60));
console.log('INMAG Daily Fetcher');
console.log('='.repeat(60));
console.log(`Fetching last ${DAYS_TO_FETCH} trading days...`);
console.log('');

function formatDate(date) {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function parseInmag(html) {
  // Find INMAG value in table - pattern: <TD Align="Center">4.263,070</TD>
  // The Totals row has the INMAG value
  const match = html.match(/<TD\s+Align="Center"><B>(\d{1,2}\.?\d{3},\d{2,3})<\/B><\/TD>/i);
  if (match) {
    const value = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
    if (value > 1000 && value < 10000) {
      return Math.round(value * 100) / 100;
    }
  }
  
  // Also try non-bold version
  const match2 = html.match(/<TD\s+Align="Center">(\d{1,2}\.?\d{3},\d{2,3})<\/TD>[\s\S]*?<TD\s+Align="Left">/i);
  if (match2) {
    const value = parseFloat(match2[1].replace(/\./g, '').replace(',', '.'));
    if (value > 1000 && value < 10000) {
      return Math.round(value * 100) / 100;
    }
  }
  
  return null;
}

function parseVolume(html) {
  const match = html.match(/<TD\s+Align="Right"><B>(\d{1,3}(?:\.\d{3})*)<\/B><\/TD>/i);
  if (match) {
    return parseInt(match[1].replace(/\./g, ''));
  }
  return null;
}

async function fetchDay(date) {
  const dateStr = formatDate(date);
  const isoDate = date.toISOString().slice(0, 10);
  
  try {
    const formData = new URLSearchParams({
      txtFechaDesde: dateStr,
      txtFechaHasta: dateStr
    });
    
    const response = await fetch(INMAG_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
      },
      body: formData.toString()
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const value = parseInmag(html);
    const volume = parseVolume(html);
    
    if (value) {
      return { date: isoDate, value, ...(volume && { volume }) };
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  const results = [];
  const today = new Date();
  let tradingDays = 0;
  let skipped = 0;
  let consecutiveSkips = 0;
  
  console.log('Fetching...\n');
  
  for (let i = 0; tradingDays < DAYS_TO_FETCH && i < DAYS_TO_FETCH * 2; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Skip weekends
    const dow = date.getDay();
    if (dow === 0 || dow === 6) {
      skipped++;
      continue;
    }
    
    const isoDate = date.toISOString().slice(0, 10);
    process.stdout.write(`\r  ${isoDate}...`);
    
    const result = await fetchDay(date);
    
    if (result) {
      results.push(result);
      tradingDays++;
      consecutiveSkips = 0;
      process.stdout.write(`\r  ${isoDate}: $${result.value.toLocaleString('es-AR')}${result.volume ? ` (${result.volume})` : ''}    \n`);
    } else {
      // Holiday or no data - still count as checked
      skipped++;
      consecutiveSkips++;
      process.stdout.write(`\r  ${isoDate}: no data (holiday?)    \n`);
      
      // Stop if too many consecutive misses (probably went too far back)
      if (consecutiveSkips > 10) {
        console.log('\n⚠️  Too many consecutive misses, stopping...');
        break;
      }
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));
  console.log(`Trading days fetched: ${results.length}`);
  console.log(`Days skipped: ${skipped}`);
  
  if (results.length > 0) {
    results.sort((a, b) => a.date.localeCompare(b.date));
    console.log(`Range: ${results[0].date} → ${results[results.length - 1].date}`);
    
    // Merge with existing
    const marketPricesPath = path.join(__dirname, '../src/lib/data/market-prices.json');
    const data = JSON.parse(fs.readFileSync(marketPricesPath, 'utf8'));
    
    const seriesMap = new Map();
    for (const p of data.inmag.series) seriesMap.set(p.date, p);
    
    let newCount = 0;
    for (const p of results) {
      if (!seriesMap.has(p.date)) newCount++;
      seriesMap.set(p.date, p);
    }
    
    data.inmag.series = Array.from(seriesMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    
    // Update current
    const latest = data.inmag.series[data.inmag.series.length - 1];
    const prev = data.inmag.series[data.inmag.series.length - 2];
    if (latest && prev) {
      data.inmag.current = latest.value;
      data.inmag.prev = prev.value;
      data.inmag.change = Math.round(((latest.value - prev.value) / prev.value) * 1000) / 10;
    }
    
    fs.writeFileSync(marketPricesPath, JSON.stringify(data, null, 2));
    
    console.log(`\n✓ Added ${newCount} new data points`);
    console.log(`✓ Total series: ${data.inmag.series.length} days`);
    console.log(`✓ Saved: ${marketPricesPath}`);
  }
}

main().catch(console.error);
