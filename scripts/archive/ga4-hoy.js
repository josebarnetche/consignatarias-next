/* GA4 — tráfico de HOY vs ayer vs lunes pasado. Read-only. No se commitea. */
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
const PROPERTY = 'properties/481391781';

const TODAY = '2026-06-08';      // lunes
const YEST  = '2026-06-07';      // domingo
const LASTM = '2026-06-01';      // lunes pasado

(async () => {
  // 1) Totales: hoy vs ayer vs lunes pasado
  const totals = await ad.properties.runReport({
    property: PROPERTY,
    requestBody: {
      dateRanges: [
        { startDate: TODAY, endDate: TODAY, name: 'hoy' },
        { startDate: YEST,  endDate: YEST,  name: 'ayer' },
        { startDate: LASTM, endDate: LASTM, name: 'lun_pasado' },
      ],
      metrics: [
        { name: 'sessions' }, { name: 'totalUsers' }, { name: 'activeUsers' },
        { name: 'screenPageViews' }, { name: 'eventCount' }, { name: 'averageSessionDuration' },
      ],
    },
  });
  console.log('=== TOTALES (hoy / ayer / lun_pasado) ===');
  const mh = totals.data.metricHeaders.map((m) => m.name);
  for (const row of totals.data.rows || []) {
    const rng = row.dimensionValues ? '' : '';
    const dr = row.dimensionValues; // none
  }
  // rows come one per dateRange when no dimensions, tagged by dateRange index
  (totals.data.rows || []).forEach((row) => {
    const idx = row.dimensionValues ? null : null;
  });
  // Simpler: print raw
  (totals.data.rows || []).forEach((r) => {
    const vals = r.metricValues.map((v, i) => `${mh[i]}=${Math.round(parseFloat(v.value))}`);
    console.log(' ', (r.dimensionValues?.[0]?.value || 'range'), '·', vals.join('  '));
  });

  // 2) Top páginas hoy
  const pages = await ad.properties.runReport({
    property: PROPERTY,
    requestBody: {
      dateRanges: [{ startDate: TODAY, endDate: TODAY }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 15,
    },
  });
  console.log('\n=== TOP PÁGINAS HOY (views · users) ===');
  (pages.data.rows || []).forEach((r) => {
    console.log(`  ${r.metricValues[0].value.padStart(4)} · ${r.metricValues[1].value.padStart(3)}  ${r.dimensionValues[0].value}`);
  });

  // 3) Canales hoy
  const ch = await ad.properties.runReport({
    property: PROPERTY,
    requestBody: {
      dateRanges: [{ startDate: TODAY, endDate: TODAY }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    },
  });
  console.log('\n=== CANALES HOY (sesiones · users) ===');
  (ch.data.rows || []).forEach((r) => {
    console.log(`  ${r.metricValues[0].value.padStart(4)} · ${r.metricValues[1].value.padStart(3)}  ${r.dimensionValues[0].value}`);
  });

  // 4) Por hora hoy (para ver curva intradía)
  const byHour = await ad.properties.runReport({
    property: PROPERTY,
    requestBody: {
      dateRanges: [{ startDate: TODAY, endDate: TODAY }],
      dimensions: [{ name: 'hour' }],
      metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }],
      orderBys: [{ dimension: { dimensionName: 'hour' } }],
    },
  });
  console.log('\n=== POR HORA HOY (hora · sesiones · views) ===');
  (byHour.data.rows || []).forEach((r) => {
    console.log(`  ${r.dimensionValues[0].value}h · ${r.metricValues[0].value} · ${r.metricValues[1].value}`);
  });
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
