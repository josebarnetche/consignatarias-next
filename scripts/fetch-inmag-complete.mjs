#!/usr/bin/env node
/**
 * Fetch complete INMAG historical data from Mercado Agroganadero
 * Uses haciinfo000013 endpoint (Índice Arrendamiento = INMAG oficial)
 * 
 * Usage: node scripts/fetch-inmag-complete.mjs [--days=365]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// MAG endpoint for INMAG (Índice Arrendamiento)
const INMAG_URL = 'https://www.mercadoagroganadero.com.ar/dll/hacienda2.dll/haciinfo000013';

// Parse command line args
const args = process.argv.slice(2);
const daysArg = args.find(a => a.startsWith('--days='));
const DAYS_TO_FETCH = daysArg ? parseInt(daysArg.split('=')[1]) : 365;

console.log('='.repeat(60));
console.log('INMAG Historical Data Fetcher (Índice Arrendamiento)');
console.log('='.repeat(60));
console.log(`Fetching last ${DAYS_TO_FETCH} days of data...`);
console.log('');

// Format date for MAG API (DD/MM/YYYY)
function formatDateForMag(date) {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

// Parse INMAG data from HTML response
function parseInmagFromHtml(html) {
  const results = [];
  
  // Find all table rows with data
  // Pattern: <TR VAlign="Middle"...><TD>Date</TD><TD>Cab</TD><TD>Importe</TD><TD>INMAG</TD>...
  const rowPattern = /<TR\s+VAlign="Middle"[^>]*>[\s\S]*?<\/TR>/gi;
  const rows = html.match(rowPattern) || [];
  
  for (const row of rows) {
    // Skip header row (has <TH>)
    if (row.includes('<TH')) continue;
    
    // Extract cells
    const cellPattern = /<TD[^>]*>([\s\S]*?)<\/TD>/gi;
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellPattern.exec(row)) !== null) {
      // Clean cell content
      const content = cellMatch[1]
        .replace(/<[^>]*>/g, '')  // Remove HTML tags
        .replace(/&nbsp;/g, ' ')   // Replace nbsp
        .trim();
      cells.push(content);
    }
    
    // Should have at least 4 cells: Date, Cab, Importe, INMAG
    if (cells.length < 4) continue;
    
    // Parse date (format: "Ma 07/04/2026" or "07/04/2026")
    const dateMatch = cells[0].match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!dateMatch) continue;
    
    const [_, day, month, year] = dateMatch;
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    // Parse INMAG value (4th column, format: "4.263,070" or "4263,07")
    const valueStr = cells[3].replace(/\./g, '').replace(',', '.');
    const value = parseFloat(valueStr);
    
    // Sanity check: INMAG should be between 1000 and 10000 $/kg
    if (isNaN(value) || value < 1000 || value > 10000) continue;
    
    // Parse volume (cabezas) - 2nd column
    const volumeStr = cells[1].replace(/\./g, '').replace(',', '.');
    const volume = parseInt(volumeStr) || undefined;
    
    results.push({
      date: isoDate,
      value: Math.round(value * 100) / 100,
      ...(volume && { volume })
    });
  }
  
  return results;
}

// Fetch INMAG data for a date range
async function fetchInmagRange(fromDate, toDate) {
  const fromStr = formatDateForMag(fromDate);
  const toStr = formatDateForMag(toDate);
  
  process.stdout.write(`  ${fromStr} → ${toStr}: `);
  
  try {
    const formData = new URLSearchParams({
      txtFechaDesde: fromStr,
      txtFechaHasta: toStr
    });
    
    const response = await fetch(INMAG_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      body: formData.toString()
    });
    
    if (!response.ok) {
      console.log(`HTTP ${response.status}`);
      return [];
    }
    
    const html = await response.text();
    const results = parseInmagFromHtml(html);
    
    console.log(`${results.length} días`);
    return results;
    
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return [];
  }
}

// Main function
async function main() {
  const allResults = [];
  const today = new Date();
  
  // Fetch in chunks of 60 days
  const chunkSize = 60;
  const chunks = Math.ceil(DAYS_TO_FETCH / chunkSize);
  
  console.log(`Fetching in ${chunks} chunks of ~${chunkSize} days...\n`);
  
  for (let i = 0; i < chunks; i++) {
    const toDate = new Date(today);
    toDate.setDate(toDate.getDate() - (i * chunkSize));
    
    const fromDate = new Date(toDate);
    fromDate.setDate(fromDate.getDate() - chunkSize + 1);
    
    // Don't go beyond requested days
    if (i === chunks - 1) {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - DAYS_TO_FETCH);
      if (fromDate < startDate) {
        fromDate.setTime(startDate.getTime());
      }
    }
    
    const results = await fetchInmagRange(fromDate, toDate);
    allResults.push(...results);
    
    // Rate limiting
    if (i < chunks - 1) {
      await new Promise(r => setTimeout(r, 800));
    }
  }
  
  // Deduplicate and sort
  const dataMap = new Map();
  for (const point of allResults) {
    dataMap.set(point.date, point);
  }
  
  const uniqueResults = Array.from(dataMap.values())
    .sort((a, b) => a.date.localeCompare(b.date));
  
  console.log('\n' + '='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));
  console.log(`Fetched: ${uniqueResults.length} trading days`);
  
  if (uniqueResults.length > 0) {
    console.log(`Range: ${uniqueResults[0].date} → ${uniqueResults[uniqueResults.length - 1].date}`);
    
    // Show sample of recent values
    console.log('\nRecent values:');
    uniqueResults.slice(-5).forEach(p => {
      console.log(`  ${p.date}: $${p.value.toLocaleString('es-AR')}${p.volume ? ` (${p.volume} cab)` : ''}`);
    });
    
    // Load and merge with existing market-prices.json
    const marketPricesPath = path.join(__dirname, '../src/lib/data/market-prices.json');
    const existingData = JSON.parse(fs.readFileSync(marketPricesPath, 'utf8'));
    
    // Merge series
    const existingMap = new Map();
    for (const point of existingData.inmag.series) {
      existingMap.set(point.date, point);
    }
    
    // Add new data (overwrite existing)
    let newCount = 0;
    for (const point of uniqueResults) {
      if (!existingMap.has(point.date)) newCount++;
      existingMap.set(point.date, point);
    }
    
    const mergedSeries = Array.from(existingMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Update current price
    const latest = mergedSeries[mergedSeries.length - 1];
    const prev = mergedSeries[mergedSeries.length - 2];
    
    if (latest && prev) {
      existingData.inmag.current = latest.value;
      existingData.inmag.prev = prev.value;
      existingData.inmag.change = Math.round(((latest.value - prev.value) / prev.value) * 1000) / 10;
    }
    
    existingData.inmag.series = mergedSeries;
    
    // Save
    fs.writeFileSync(marketPricesPath, JSON.stringify(existingData, null, 2));
    
    console.log(`\n✓ Added ${newCount} new data points`);
    console.log(`✓ Total series: ${mergedSeries.length} days`);
    console.log(`✓ Saved to: ${marketPricesPath}`);
  }
  
  console.log('='.repeat(60));
}

main().catch(console.error);
