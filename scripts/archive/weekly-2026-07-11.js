/* Análisis semanal — últimos 7d vs 7d previos. GA4 + GSC. Read-only, no se commitea. */
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const credentials = require('./oauth-credentials.json');
const tokens = require('./oauth-token.json');
const oauth2Client = new OAuth2Client(
  credentials.installed.client_id, credentials.installed.client_secret, 'http://localhost:3333'
);
oauth2Client.setCredentials(tokens);
oauth2Client.on('tokens', (n) => {
  if (n.refresh_token) tokens.refresh_token = n.refresh_token;
  tokens.access_token = n.access_token; tokens.expiry_date = n.expiry_date;
  fs.writeFileSync(path.join(__dirname, 'oauth-token.json'), JSON.stringify(tokens, null, 2));
});

const ad = google.analyticsdata({ version: 'v1beta', auth: oauth2Client });
const sc = google.searchconsole({ version: 'v1', auth: oauth2Client });
const PROPERTY = 'properties/481391781';
const SITE = 'sc-domain:consignatarias.com.ar';

// Ventanas: GSC tiene lag ~2-3 días, así que uso 03-jul..09-jul vs 26-jun..02-jul
const CUR_S = '2026-07-04', CUR_E = '2026-07-10';
const PRV_S = '2026-06-27', PRV_E = '2026-07-03';
// GSC (lag): 02-jul..08-jul vs 25-jun..01-jul
const GCUR_S = '2026-07-02', GCUR_E = '2026-07-08';
const GPRV_S = '2026-06-25', GPRV_E = '2026-07-01';

const pct = (a, b) => b === 0 ? (a > 0 ? '+∞' : '0') : `${a >= b ? '+' : ''}${(((a - b) / b) * 100).toFixed(1)}%`;

(async () => {
  const out = {};

  // === GA4 totales ===
  const totals = await ad.properties.runReport({
    property: PROPERTY,
    requestBody: {
      dateRanges: [
        { startDate: CUR_S, endDate: CUR_E, name: 'cur' },
        { startDate: PRV_S, endDate: PRV_E, name: 'prv' },
      ],
      metrics: [
        { name: 'sessions' }, { name: 'totalUsers' }, { name: 'newUsers' },
        { name: 'screenPageViews' }, { name: 'engagedSessions' },
        { name: 'averageSessionDuration' }, { name: 'eventCount' },
      ],
    },
  });
  out.ga4Totals = totals.data;

  // === GA4 por canal ===
  const chan = await ad.properties.runReport({
    property: PROPERTY,
    requestBody: {
      dateRanges: [
        { startDate: CUR_S, endDate: CUR_E, name: 'cur' },
        { startDate: PRV_S, endDate: PRV_E, name: 'prv' },
      ],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    },
  });
  out.ga4Channels = chan.data;

  // === GA4 top landing pages (semana actual) ===
  const lp = await ad.properties.runReport({
    property: PROPERTY,
    requestBody: {
      dateRanges: [{ startDate: CUR_S, endDate: CUR_E }],
      dimensions: [{ name: 'landingPage' }],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 20,
    },
  });
  out.ga4Landing = lp.data;

  // === GA4 diario (sesiones) para ver forma ===
  const daily = await ad.properties.runReport({
    property: PROPERTY,
    requestBody: {
      dateRanges: [{ startDate: PRV_S, endDate: CUR_E }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    },
  });
  out.ga4Daily = daily.data;

  // === GSC totales cur vs prv ===
  const gscCur = await sc.searchanalytics.query({ siteUrl: SITE, requestBody: { startDate: GCUR_S, endDate: GCUR_E } });
  const gscPrv = await sc.searchanalytics.query({ siteUrl: SITE, requestBody: { startDate: GPRV_S, endDate: GPRV_E } });
  out.gscCur = gscCur.data.rows?.[0] || null;
  out.gscPrv = gscPrv.data.rows?.[0] || null;

  // === GSC top queries (cur) ===
  const gscQ = await sc.searchanalytics.query({
    siteUrl: SITE,
    requestBody: { startDate: GCUR_S, endDate: GCUR_E, dimensions: ['query'], rowLimit: 30 },
  });
  out.gscQueries = gscQ.data.rows || [];

  // === GSC top pages (cur) ===
  const gscP = await sc.searchanalytics.query({
    siteUrl: SITE,
    requestBody: { startDate: GCUR_S, endDate: GCUR_E, dimensions: ['page'], rowLimit: 30 },
  });
  out.gscPages = gscP.data.rows || [];

  fs.writeFileSync(path.join(__dirname, 'weekly-2026-07-11.json'), JSON.stringify(out, null, 2));

  // ===== PRINT =====
  const m = out.ga4Totals.rows;
  const g = (r, i) => Number(r?.metricValues?.[i]?.value || 0);
  const cur = m.find(r => r.dimensionValues?.[0]?.value === 'date_range_0') || m[0];
  // dateRanges rows come with dimension 'dateRange' when named; fallback: two rows
  let curRow, prvRow;
  if (m.length === 2) { curRow = m[0]; prvRow = m[1]; }
  const names = ['sessions','totalUsers','newUsers','pageViews','engagedSessions','avgDur(s)','events'];
  console.log(`\n=== GA4 TOTALES  (${CUR_S}..${CUR_E}  vs  ${PRV_S}..${PRV_E}) ===`);
  names.forEach((n, i) => {
    const c = g(curRow, i), p = g(prvRow, i);
    console.log(`${n.padEnd(16)} ${String(c).padStart(9)}   prev ${String(p).padStart(9)}   ${pct(c, p)}`);
  });

  console.log(`\n=== GA4 CANALES (sesiones) ===`);
  const chRows = out.ga4Channels.rows || [];
  // pair up by channel
  const chMap = {};
  chRows.forEach(r => {
    const name = r.dimensionValues[0].value;
    const dr = r.dimensionValues[1]?.value; // date range label absent -> undefined
  });
  // simpler: run separated
  console.log('(ver JSON para desglose por canal — GA4 devuelve filas mezcladas)');

  console.log(`\n=== GA4 TOP LANDING PAGES (sem actual) ===`);
  (out.ga4Landing.rows || []).slice(0, 15).forEach(r => {
    console.log(`${String(r.metricValues[0].value).padStart(6)} ses  ${r.dimensionValues[0].value}`);
  });

  console.log(`\n=== GA4 DIARIO (sesiones / usuarios) ===`);
  (out.ga4Daily.rows || []).forEach(r => {
    console.log(`${r.dimensionValues[0].value}  ${String(r.metricValues[0].value).padStart(5)} ses  ${String(r.metricValues[1].value).padStart(5)} us`);
  });

  console.log(`\n=== GSC TOTALES (${GCUR_S}..${GCUR_E}  vs  ${GPRV_S}..${GPRV_E}) ===`);
  const gc = out.gscCur, gp = out.gscPrv;
  const gm = (o, k) => Number(o?.[k] || 0);
  console.log(`clicks       ${String(gm(gc,'clicks')).padStart(7)}   prev ${String(gm(gp,'clicks')).padStart(7)}   ${pct(gm(gc,'clicks'), gm(gp,'clicks'))}`);
  console.log(`impressions  ${String(gm(gc,'impressions')).padStart(7)}   prev ${String(gm(gp,'impressions')).padStart(7)}   ${pct(gm(gc,'impressions'), gm(gp,'impressions'))}`);
  console.log(`ctr          ${(gm(gc,'ctr')*100).toFixed(2)}%   prev ${(gm(gp,'ctr')*100).toFixed(2)}%`);
  console.log(`position     ${gm(gc,'position').toFixed(1)}   prev ${gm(gp,'position').toFixed(1)}`);

  console.log(`\n=== GSC TOP QUERIES (clicks) ===`);
  out.gscQueries.slice(0, 20).forEach(r => {
    console.log(`${String(r.clicks).padStart(4)} clk ${String(r.impressions).padStart(6)} imp  p${r.position.toFixed(1).padStart(5)}  ${r.keys[0]}`);
  });

  console.log(`\n=== GSC TOP PAGES (clicks) ===`);
  out.gscPages.slice(0, 20).forEach(r => {
    console.log(`${String(r.clicks).padStart(4)} clk ${String(r.impressions).padStart(6)} imp  ${r.keys[0].replace('https://consignatarias.com.ar','')}`);
  });

  console.log('\n→ JSON: scripts/archive/weekly-2026-07-11.json');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
