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
oauth2Client.on('tokens', (newTokens) => {
  if (newTokens.refresh_token) tokens.refresh_token = newTokens.refresh_token;
  tokens.access_token = newTokens.access_token;
  tokens.expiry_date = newTokens.expiry_date;
  fs.writeFileSync(path.join(__dirname, 'oauth-token.json'), JSON.stringify(tokens, null, 2));
});

const PROPERTY = 'properties/481391781';
const SITE = 'sc-domain:consignatarias.com.ar';
const analyticsdata = google.analyticsdata({ version: 'v1beta', auth: oauth2Client });
const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

const fmt = (d) => d.toISOString().split('T')[0];
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

async function ga4(startDate, endDate, dims = []) {
  const res = await analyticsdata.properties.runReport({
    property: PROPERTY,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      dimensions: dims.map((name) => ({ name })),
    },
  });
  return res.data;
}

async function gscOverall(start, end) {
  const r = await searchconsole.searchanalytics.query({
    siteUrl: SITE,
    requestBody: { startDate: fmt(start), endDate: fmt(end), dimensions: [] },
  });
  return (r.data.rows && r.data.rows[0]) || null;
}

async function main() {
  console.log('\n' + '='.repeat(64));
  console.log('  CONSIGNATARIAS — AUDIT USUARIOS + BÚSQUEDAS  (' + fmt(new Date()) + ')');
  console.log('='.repeat(64));

  // ── GA4 USERS ───────────────────────────────────────────────
  console.log('\n👤 GA4 USUARIOS (activeUsers / newUsers / sessions / pageviews)');
  console.log('-'.repeat(64));
  const windows = [
    ['Hoy', 'today', 'today'],
    ['Ayer', 'yesterday', 'yesterday'],
    ['Últimos 7d', '7daysAgo', 'today'],
    ['7d previos (8-14)', '14daysAgo', '8daysAgo'],
    ['Últimos 28d', '28daysAgo', 'today'],
    ['28d previos (29-56)', '56daysAgo', '29daysAgo'],
  ];
  for (const [label, s, e] of windows) {
    try {
      const d = await ga4(s, e);
      const row = d.rows && d.rows[0];
      if (row) {
        const m = row.metricValues.map((v) => v.value);
        console.log(`   ${label.padEnd(22)} usuarios:${String(m[0]).padStart(5)}  nuevos:${String(m[1]).padStart(5)}  sesiones:${String(m[2]).padStart(5)}  vistas:${String(m[3]).padStart(6)}`);
      } else {
        console.log(`   ${label.padEnd(22)} (sin datos)`);
      }
    } catch (err) {
      console.log(`   ${label.padEnd(22)} ERROR: ${err.message}`);
    }
  }

  // ── GA4 canales (28d) ───────────────────────────────────────
  console.log('\n📡 GA4 CANALES DE ADQUISICIÓN (Últimos 28d)');
  console.log('-'.repeat(64));
  try {
    const d = await ga4('28daysAgo', 'today', ['sessionDefaultChannelGroup']);
    if (d.rows) {
      d.rows.sort((a, b) => Number(b.metricValues[0].value) - Number(a.metricValues[0].value));
      d.rows.forEach((r) => {
        console.log(`   ${r.dimensionValues[0].value.padEnd(20)} usuarios:${String(r.metricValues[0].value).padStart(5)}  sesiones:${String(r.metricValues[2].value).padStart(5)}`);
      });
    }
  } catch (err) { console.log('   ERROR:', err.message); }

  // ── GSC 7d vs 28d ───────────────────────────────────────────
  console.log('\n🔍 GSC BÚSQUEDAS (clicks / impresiones / CTR / posición)');
  console.log('-'.repeat(64));
  const gscWindows = [
    ['Últimos 7d', daysAgo(7), new Date()],
    ['7d previos', daysAgo(14), daysAgo(7)],
    ['Últimos 28d', daysAgo(28), new Date()],
    ['28d previos', daysAgo(56), daysAgo(28)],
  ];
  for (const [label, s, e] of gscWindows) {
    try {
      const r = await gscOverall(s, e);
      if (r) {
        console.log(`   ${label.padEnd(14)} clicks:${String(r.clicks).padStart(5)}  impr:${String(r.impressions).padStart(6)}  CTR:${(r.ctr*100).toFixed(2).padStart(5)}%  pos:${r.position.toFixed(1)}`);
      } else {
        console.log(`   ${label.padEnd(14)} (sin datos)`);
      }
    } catch (err) { console.log(`   ${label.padEnd(14)} ERROR: ${err.message}`); }
  }

  // ── GSC top queries 28d ─────────────────────────────────────
  console.log('\n🔝 GSC TOP QUERIES (Últimos 28d, por clicks)');
  console.log('-'.repeat(64));
  try {
    const r = await searchconsole.searchanalytics.query({
      siteUrl: SITE,
      requestBody: { startDate: fmt(daysAgo(28)), endDate: fmt(new Date()), dimensions: ['query'], rowLimit: 20 },
    });
    if (r.data.rows) r.data.rows.forEach((row, i) => {
      console.log(`   ${String(i+1).padStart(2)}. "${row.keys[0]}" — ${row.clicks}c / ${row.impressions}i / pos ${row.position.toFixed(1)}`);
    });
  } catch (err) { console.log('   ERROR:', err.message); }

  console.log('\n' + '='.repeat(64) + '\n');
}

main();
