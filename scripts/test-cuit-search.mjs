// Test CUIT search endpoint to understand parameters
// Run: node scripts/test-cuit-search.mjs

async function testCuitSearch() {
  const baseUrl = 'https://www.mercadoagroganadero.com.ar/dll/hacienda2.dll/hacigraf000015';
  
  // First, get the page to see form structure
  console.log('Fetching form page...\n');
  const res = await fetch(baseUrl);
  const html = await res.text();
  
  // Extract form action and inputs
  const formMatch = html.match(/<form[^>]*action="([^"]*)"[^>]*>([\s\S]*?)<\/form>/i);
  if (formMatch) {
    console.log('Form action:', formMatch[1] || 'same page');
    
    // Find all inputs
    const inputs = formMatch[2].match(/<input[^>]*>/gi) || [];
    console.log('\nForm inputs:');
    inputs.forEach(input => {
      const name = input.match(/name="([^"]+)"/i)?.[1] || 'unnamed';
      const type = input.match(/type="([^"]+)"/i)?.[1] || 'text';
      const value = input.match(/value="([^"]+)"/i)?.[1] || '';
      console.log(`  ${name} (${type}): "${value}"`);
    });
    
    // Find selects
    const selects = formMatch[2].match(/<select[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi) || [];
    console.log('\nSelect inputs:');
    selects.forEach(select => {
      const name = select.match(/name="([^"]+)"/i)?.[1] || 'unnamed';
      const options = select.match(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)/gi) || [];
      console.log(`  ${name}:`);
      options.slice(0, 5).forEach(opt => {
        const val = opt.match(/value="([^"]*)"/i)?.[1] || '';
        const text = opt.replace(/<[^>]+>/g, '').trim();
        console.log(`    "${val}" = ${text}`);
      });
      if (options.length > 5) console.log(`    ... and ${options.length - 5} more`);
    });
  }
  
  // Look for any CUIT-related elements
  console.log('\nCUIT-related elements:');
  const cuitMatches = html.match(/cuit|CUIT|remitente|REMITENTE/gi);
  console.log('Keywords found:', cuitMatches ? [...new Set(cuitMatches)] : 'none');
  
  // Extract the date inputs
  const dateInputs = html.match(/datepicker\d|txtFecha[^"]+/gi);
  console.log('\nDate inputs:', dateInputs || 'none');
  
  // Try to find the actual search mechanism
  const buttonMatch = html.match(/<button[^>]*>([\s\S]*?)<\/button>/gi);
  console.log('\nButtons:', buttonMatch?.map(b => b.replace(/<[^>]+>/g, '').trim()) || 'none');
}

testCuitSearch().catch(console.error);
