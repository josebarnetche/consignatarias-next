// Test CUIT query with parameters
// Run: node scripts/test-cuit-query.mjs [cuit]

const cuit = process.argv[2] || '30-71863222-2'; // Default: MEMOLA MEDIOS SAS

async function queryCuit(cuitStr) {
  // Parse CUIT: XX-XXXXXXXX-X
  const parts = cuitStr.split('-');
  if (parts.length !== 3) {
    console.error('Invalid CUIT format. Use: XX-XXXXXXXX-X');
    return;
  }
  
  const [cuit1, cuit2, cuit3] = parts;
  
  // Date range: last 365 days
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 365);
  
  const formatDate = (d) => 
    `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  
  const url = `https://www.mercadoagroganadero.com.ar/dll/hacienda2.dll/hacigraf000015?txtFECHAINI=${formatDate(start)}&txtFECHAFIN=${formatDate(end)}&txtCuit1=${cuit1}&txtCuit2=${cuit2}&txtCuit3=${cuit3}&lisTipo=0&CP=&LISTADO=SI`;
  
  console.log(`Searching CUIT: ${cuitStr}`);
  console.log(`Date range: ${formatDate(start)} to ${formatDate(end)}`);
  console.log(`URL: ${url}\n`);
  
  const res = await fetch(url);
  const html = await res.text();
  
  // Find the data table
  const tableMatch = html.match(/<Table[^>]*class="table[^"]*"[^>]*>([\s\S]*?)<\/Table>/i);
  
  if (!tableMatch) {
    // Check for "no data" message
    if (html.includes('No se encontraron') || html.includes('Sin datos') || html.includes('0 registro')) {
      console.log('No records found for this CUIT in the date range.');
    } else {
      console.log('No table found. May need different parameters or CUIT has no activity.');
      
      // Look for any results section
      const resultSection = html.match(/CABEZAS REMITIDAS|RESULTADO|LISTADO/i);
      console.log('Result markers:', resultSection ? 'found' : 'not found');
    }
    return;
  }
  
  console.log('Data found!\n');
  
  // Parse rows
  const rows = tableMatch[0].match(/<TR[^>]*>([\s\S]*?)<\/TR>/gi) || [];
  
  for (const row of rows) {
    const cells = [...row.matchAll(/<T[DH][^>]*>([\s\S]*?)<\/T[DH]>/gi)].map((m) =>
      m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
    );
    if (cells.length > 0 && cells.some(c => c.length > 0)) {
      console.log(cells.join(' | '));
    }
  }
}

queryCuit(cuit).catch(console.error);
