const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const credentials = require('./oauth-credentials.json');
const tokens = require('./oauth-token.json');

const oauth2Client = new google.auth.OAuth2(
  credentials.installed.client_id,
  credentials.installed.client_secret,
  'http://localhost:3333'
);

oauth2Client.setCredentials(tokens);

// Auto-refresh token if needed
oauth2Client.on('tokens', (newTokens) => {
  if (newTokens.refresh_token) {
    tokens.refresh_token = newTokens.refresh_token;
  }
  tokens.access_token = newTokens.access_token;
  tokens.expiry_date = newTokens.expiry_date;
  fs.writeFileSync(
    path.join(__dirname, 'oauth-token.json'),
    JSON.stringify(tokens, null, 2)
  );
});

const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

async function main() {
  const siteUrl = 'sc-domain:consignatarias.com.ar';
  
  // Last 7 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  const formatDate = (d) => d.toISOString().split('T')[0];
  
  console.log(`\n📊 GSC Report: ${formatDate(startDate)} → ${formatDate(endDate)}\n`);
  console.log('='.repeat(60));
  
  try {
    // Overall metrics
    const overall = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: [],
      }
    });
    
    if (overall.data.rows && overall.data.rows[0]) {
      const r = overall.data.rows[0];
      console.log('\n🔥 OVERALL METRICS (Last 7 days)');
      console.log(`   Clicks: ${r.clicks}`);
      console.log(`   Impressions: ${r.impressions}`);
      console.log(`   CTR: ${(r.ctr * 100).toFixed(2)}%`);
      console.log(`   Avg Position: ${r.position.toFixed(1)}`);
    }
    
    // By day
    const byDay = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['date'],
      }
    });
    
    console.log('\n📅 BY DAY');
    console.log('-'.repeat(60));
    if (byDay.data.rows) {
      byDay.data.rows.forEach(row => {
        console.log(`   ${row.keys[0]}: ${row.clicks} clicks, ${row.impressions} impr, ${(row.ctr * 100).toFixed(1)}% CTR, pos ${row.position.toFixed(1)}`);
      });
    }
    
    // Top queries
    const topQueries = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['query'],
        rowLimit: 15,
      }
    });
    
    console.log('\n🔍 TOP QUERIES');
    console.log('-'.repeat(60));
    if (topQueries.data.rows) {
      topQueries.data.rows.forEach((row, i) => {
        console.log(`   ${i+1}. "${row.keys[0]}" — ${row.clicks} clicks, ${row.impressions} impr, pos ${row.position.toFixed(1)}`);
      });
    }
    
    // Top pages
    const topPages = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['page'],
        rowLimit: 10,
      }
    });
    
    console.log('\n📄 TOP PAGES');
    console.log('-'.repeat(60));
    if (topPages.data.rows) {
      topPages.data.rows.forEach((row, i) => {
        const page = row.keys[0].replace('https://consignatarias.com.ar', '');
        console.log(`   ${i+1}. ${page || '/'} — ${row.clicks} clicks, ${row.impressions} impr`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Report complete\n');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main();
