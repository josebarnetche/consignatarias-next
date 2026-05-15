#!/usr/bin/env node
/**
 * Fetch daily MAG remitente entries for mapped consignatarias
 * Runs daily via cron, accumulates data over time
 * 
 * Usage: node scripts/fetch-mag-daily.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAG_URL = 'https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000006';

// Load mappings
const magDataPath = path.join(__dirname, '../src/lib/data/mag-consignatarios.json');
const historyPath = path.join(__dirname, '../src/lib/data/mag-remitentes-history.json');

const magData = JSON.parse(fs.readFileSync(magDataPath, 'utf8'));
const mapped = magData.mapping.filter(m => m.slug);

// Load or initialize history
let history = { lastUpdated: null, consignatarias: {} };
if (fs.existsSync(historyPath)) {
  history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
}

// Get today's date in DD/MM/YYYY format for MAG
const today = new Date();
const dateStr = today.toLocaleDateString('es-AR', { 
  day: '2-digit', 
  month: '2-digit', 
  year: 'numeric' 
}).replace(/\//g, '/');
const isoDate = today.toISOString().slice(0, 10);

console.log('='.repeat(60));
console.log('MAG Daily Remitente Fetcher');
console.log('='.repeat(60));
console.log(`Date: ${dateStr} (${isoDate})`);
console.log(`Consignatarias to fetch: ${mapped.length}`);
console.log('');

// Parse HTML table to extract remitente entries
function parseRemitentes(html) {
  const entries = [];
  
  // Find all table rows with remitente data
  // Pattern: <TR><TD>Name</TD><TD>Localidad</TD><TD>Prov</TD><TD>EnPie</TD><TD>Muertos</TD><TD>Caidos</TD><TD>Total</TD></TR>
  const rowRegex = /<TR[^>]*VAlign[^>]*>.*?<TD[^>]*>([^<]+)<\/TD>.*?<TD[^>]*>([^<]+)<\/TD>.*?<TD[^>]*>([^<]+)<\/TD>.*?<TD[^>]*Align="Right"[^>]*>(\d+)<\/TD>/gis;
  
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const [_, remitente, localidad, prov, enPie] = match;
    const cleanRemitente = remitente.replace(/&nbsp;/g, '').trim();
    
    // Skip header and total rows
    if (cleanRemitente && 
        !cleanRemitente.toLowerCase().includes('total') && 
        !cleanRemitente.toLowerCase().includes('remitente')) {
      entries.push({
        remitente: cleanRemitente,
        localidad: localidad.replace(/&nbsp;/g, '').trim(),
        provincia: prov.replace(/&nbsp;/g, '').trim(),
        cabezas: parseInt(enPie) || 0
      });
    }
  }
  
  return entries;
}

// Fetch entries for a single consignatario with retry
async function fetchConsignatario(magId, slug, retries = 3) {
  const formData = new URLSearchParams({
    LisConsignatario: magId,
    txtFecha: dateStr
  });
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(MAG_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: formData.toString(),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const html = await response.text();
      const entries = parseRemitentes(html);
      
      return { success: true, entries };
    } catch (error) {
      if (attempt === retries) {
        return { success: false, error: error.message };
      }
      // Wait before retry (exponential backoff)
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

// Main execution
async function main() {
  let totalEntries = 0;
  let successCount = 0;
  let withDataCount = 0;
  
  for (const { magId, magName, slug } of mapped) {
    process.stdout.write(`  ${slug.padEnd(30)} `);
    
    const result = await fetchConsignatario(magId, slug);
    
    if (result.success) {
      successCount++;
      
      if (result.entries.length > 0) {
        withDataCount++;
        totalEntries += result.entries.length;
        
        // Initialize consignataria history if needed
        if (!history.consignatarias[slug]) {
          history.consignatarias[slug] = {
            magId,
            magName,
            dailyEntries: {}
          };
        }
        
        // Store today's entries
        history.consignatarias[slug].dailyEntries[isoDate] = {
          entries: result.entries,
          totalCabezas: result.entries.reduce((sum, e) => sum + e.cabezas, 0)
        };
        
        console.log(`✓ ${result.entries.length} remitentes`);
      } else {
        console.log(`- sin entradas`);
      }
    } else {
      console.log(`✗ ${result.error}`);
    }
    
    // Delay between requests to be nice to MAG server
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Update metadata
  history.lastUpdated = new Date().toISOString();
  
  // Save history
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  
  console.log('');
  console.log('='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));
  console.log(`Fetched: ${successCount}/${mapped.length}`);
  console.log(`With data: ${withDataCount}`);
  console.log(`Total remitentes: ${totalEntries}`);
  console.log(`Saved to: ${historyPath}`);
  
  // Calculate cumulative stats
  const allSlugs = Object.keys(history.consignatarias);
  const totalDays = new Set(
    allSlugs.flatMap(s => Object.keys(history.consignatarias[s].dailyEntries))
  ).size;
  
  console.log('');
  console.log('Cumulative stats:');
  console.log(`  Consignatarias tracked: ${allSlugs.length}`);
  console.log(`  Days of data: ${totalDays}`);
}

main().catch(console.error);
