/* Snapshot GSC — desglose por día, país, página, query, device. Uso interno. */
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
oauth2Client.on('tokens', (nt) => {
  if (nt.refresh_token) tokens.refresh_token = nt.refresh_token;
  tokens.access_token = nt.access_token;
  tokens.expiry_date = nt.expiry_date;
  fs.writeFileSync(path.join(__dirname, 'oauth-token.json'), JSON.stringify(tokens, null, 2));
});

const sc = google.searchconsole({ version: 'v1', auth: oauth2Client });
const siteUrl = 'sc-domain:consignatarias.com.ar';
const fmt = (d) => d.toISOString().split('T')[0];

async function q(dimensions, extra = {}) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 10); // GSC tiene lag; 10d cubre "hoy" + reciente
  const res = await sc.searchanalytics.query({
    siteUrl,
    requestBody: { startDate: fmt(start), endDate: fmt(end), dimensions, rowLimit: 25, ...extra },
  });
  return res.data.rows || [];
}

const pct = (x) => (x * 100).toFixed(1) + '%';

(async () => {
  console.log(JSON.stringify({ site: siteUrl, generado: new Date().toISOString() }));

  const byDay = await q(['date']);
  console.log('\n=== POR DÍA (últimos ~10d; el dato de hoy suele faltar por lag) ===');
  byDay.forEach((r) =>
    console.log(`${r.keys[0]}  clicks=${r.clicks}  impr=${r.impressions}  ctr=${pct(r.ctr)}  pos=${r.position.toFixed(1)}`)
  );

  const total = byDay.reduce((a, r) => ({ c: a.c + r.clicks, i: a.i + r.impressions }), { c: 0, i: 0 });
  console.log(`\nTOTAL rango: clicks=${total.c}  impressions=${total.i}`);

  const byCountry = await q(['country']);
  console.log('\n=== POR PAÍS (de dónde son) ===');
  byCountry.forEach((r) =>
    console.log(`${r.keys[0]}  clicks=${r.clicks}  impr=${r.impressions}  ctr=${pct(r.ctr)}  pos=${r.position.toFixed(1)}`)
  );

  const byDevice = await q(['device']);
  console.log('\n=== POR DISPOSITIVO ===');
  byDevice.forEach((r) => console.log(`${r.keys[0]}  clicks=${r.clicks}  impr=${r.impressions}  ctr=${pct(r.ctr)}`));

  const byPage = await q(['page']);
  console.log('\n=== TOP PÁGINAS (de dónde vinieron las impressions) ===');
  byPage.slice(0, 20).forEach((r) =>
    console.log(`impr=${String(r.impressions).padStart(5)}  clicks=${String(r.clicks).padStart(3)}  pos=${r.position.toFixed(1)}  ${r.keys[0]}`)
  );

  const byQuery = await q(['query']);
  console.log('\n=== TOP QUERIES (qué buscaron) ===');
  byQuery.slice(0, 20).forEach((r) =>
    console.log(`impr=${String(r.impressions).padStart(5)}  clicks=${String(r.clicks).padStart(3)}  ctr=${pct(r.ctr).padStart(6)}  pos=${r.position.toFixed(1)}  "${r.keys[0]}"`)
  );
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
