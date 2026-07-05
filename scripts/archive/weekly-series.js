/* Fetch diario GSC (clicks/impresiones) + GA4 (sesiones/usuarios) → /tmp/weekly.json
   Para el overlay semanal (cada semana una línea, X = día de semana). Read-only. */
const fs = require('fs'), path = require('path');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const credentials = require('./oauth-credentials.json');
const tokens = require('./oauth-token.json');
const o = new OAuth2Client(credentials.installed.client_id, credentials.installed.client_secret, 'http://localhost:3333');
o.setCredentials(tokens);
o.on('tokens', (n) => { if (n.refresh_token) tokens.refresh_token = n.refresh_token; tokens.access_token = n.access_token; tokens.expiry_date = n.expiry_date; fs.writeFileSync(path.join(__dirname, 'oauth-token.json'), JSON.stringify(tokens, null, 2)); });

const sc = google.searchconsole({ version: 'v1', auth: o });
const ad = google.analyticsdata({ version: 'v1beta', auth: o });
const SITE = 'sc-domain:consignatarias.com.ar';
const GA = 'properties/481391781';

// Ventana: 11 semanas completas terminando el domingo pasado (2026-06-08). Hoy = 2026-06-09 (lunes).
const END = '2026-06-08';            // domingo pasado
const START = '2026-03-23';          // lunes, 11 semanas antes

(async () => {
  // GSC diario
  const gscRows = (await sc.searchanalytics.query({
    siteUrl: SITE,
    requestBody: { startDate: START, endDate: END, dimensions: ['date'], rowLimit: 1000 },
  })).data.rows || [];
  const gsc = gscRows.map((r) => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions }));

  // GA4 diario
  const gaRes = await ad.properties.runReport({
    property: GA,
    requestBody: {
      dateRanges: [{ startDate: START, endDate: END }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      limit: 1000,
    },
  });
  const ga = (gaRes.data.rows || []).map((r) => {
    const d = r.dimensionValues[0].value; // YYYYMMDD
    return {
      date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
      sessions: Number(r.metricValues[0].value),
      users: Number(r.metricValues[1].value),
    };
  });

  fs.writeFileSync('/tmp/weekly.json', JSON.stringify({ start: START, end: END, gsc, ga }, null, 2));
  console.log(`GSC días: ${gsc.length} · GA4 días: ${ga.length} · ${START}→${END} → /tmp/weekly.json`);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
