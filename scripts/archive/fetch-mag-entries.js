/**
 * Fetch MAG (Mercado Agroganadero) entry data for mapped consignatarias
 * 
 * Usage: node scripts/fetch-mag-entries.js
 * 
 * This script:
 * 1. Reads mag-consignatarios.json for MAG IDs
 * 2. Fetches entry data from MAG website
 * 3. Updates market-prices.json with consignataria entries
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const MAG_BASE = 'https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll';

// Load mappings
const magDataPath = path.join(__dirname, '../src/lib/data/mag-consignatarios.json');
const marketPath = path.join(__dirname, '../src/lib/data/market-prices.json');

const magData = require(magDataPath);
const marketData = require(marketPath);

// Get consignatarias with MAG IDs
const mapped = magData.mapping.filter(m => m.slug);

console.log('=== MAG Entry Fetcher ===');
console.log('Consignatarias con MAG ID:', mapped.length);
console.log('');

// For now, let's manually populate based on existing pattern
// The MAG website uses old ASP and requires browser to scrape

// These are the ones we can add based on existing structure:
const knownEntries = {
  // Already populated
  'saenz-valiente-bullrich': { magId: '538', hasData: true },
  'jauregui-lorda': { magId: '92', hasData: true },
  'monasterio-tattersall-s-a': { magId: '465', hasData: true },
  
  // Need to populate (placeholder structure)
  'colombo-y-colombo': { magId: '18', hasData: false },
  'campos-y-ganados': { magId: '110', hasData: false },
  'colombo-y-magliano': { magId: '165', hasData: false },
  'daniel-blanco': { magId: '24', hasData: false },
  'umc-haciendas-villaguay': { magId: '48', hasData: false },
  'alzaga-unzue-y-cia-s-a': { magId: '15', hasData: false },
  'ganadera-salliquelo-sa': { magId: '290', hasData: false },
  'gananor-pujol': { magId: '520', hasData: false },
  'hourcade-albelo-y-cia-s-a': { magId: '38', hasData: false },
  'madelan': { magId: '430', hasData: false },
  'martin-g-lalor-s-a': { magId: '389', hasData: false },
  's-l-ledesma-y-cia-s-a': { magId: '414', hasData: false },
  'wallace-hnos-s-a': { magId: '596', hasData: false },
};

// Initialize auctionDayEntries if needed
if (!marketData.auctionDayEntries) {
  marketData.auctionDayEntries = { date: new Date().toISOString().slice(0, 10), consignatarias: {} };
}
if (!marketData.auctionDayEntries.consignatarias) {
  marketData.auctionDayEntries.consignatarias = {};
}

// Report current state
console.log('=== ESTADO ACTUAL ===');
const existing = Object.keys(marketData.auctionDayEntries.consignatarias);
console.log('Con datos:', existing.join(', ') || 'ninguno');

const needData = Object.entries(knownEntries)
  .filter(([slug, info]) => !info.hasData && !marketData.auctionDayEntries.consignatarias[slug])
  .map(([slug]) => slug);
console.log('\nNecesitan datos:', needData.join(', ') || 'ninguno');

console.log('\n=== INSTRUCCIONES ===');
console.log('Para obtener datos MAG:');
console.log('1. Ir a https://www.mercadoagroganadero.com.ar');
console.log('2. Sección "Entradas por Consignatario"');
console.log('3. Seleccionar consignatario y rango de fechas');
console.log('4. Copiar datos y actualizar market-prices.json');
console.log('');
console.log('Estructura esperada:');
console.log(JSON.stringify({
  magId: "XXX",
  totalCabezas: 0,
  entries: [
    { remitente: "NOMBRE", localidad: "CIUDAD", provincia: "BUE", cabezas: 0 }
  ],
  period: "DD/MM/YYYY - DD/MM/YYYY"
}, null, 2));

// Alternative: Create placeholder entries for consignatarias without data
const createPlaceholder = process.argv.includes('--placeholder');
if (createPlaceholder) {
  console.log('\n=== CREANDO PLACEHOLDERS ===');
  needData.forEach(slug => {
    const info = knownEntries[slug];
    if (info && !marketData.auctionDayEntries.consignatarias[slug]) {
      marketData.auctionDayEntries.consignatarias[slug] = {
        magId: info.magId,
        totalCabezas: 0,
        entries: [],
        period: "Pendiente de actualización"
      };
      console.log('✓ Placeholder creado:', slug);
    }
  });
  
  // Save
  fs.writeFileSync(marketPath, JSON.stringify(marketData, null, 2));
  console.log('\n✓ market-prices.json actualizado');
}
