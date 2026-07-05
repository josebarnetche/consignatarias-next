/* Pull #3 — forensics on /precios/* GEO decay after honesty fix (1.30.9, 2026-06-05).
   Read-only. → /tmp/audit-precios-2026-06-12.json */
const fs = require('fs'), path = require('path');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const credentials = require('./oauth-credentials.json');
const tokens = require('./oauth-token.json');
const o = new OAuth2Client(credentials.installed.client_id, credentials.installed.client_secret, 'http://localhost:3333');
o.setCredentials(tokens);
o.on('tokens', (n) => { if (n.refresh_token) tokens.refresh_token = n.refresh_token; tokens.access_token = n.access_token; tokens.expiry_date = n.expiry_date; fs.writeFileSync(path.join(__dirname, 'oauth-token.json'), JSON.stringify(tokens, null, 2)); });

const sc = google.searchconsole({ version: 'v1', auth: o });
const SITE = 'sc-domain:consignatarias.com.ar';
const q = (body) => sc.searchanalytics.query({ siteUrl: SITE, requestBody: body }).then(r => r.data.rows || []);

// Window A = before fix (05-22 → 06-04), Window B = after fix (06-05 → 06-10, plus lag-safe)
const A = { startDate: '2026-05-22', endDate: '2026-06-04' };
const B = { startDate: '2026-06-05', endDate: '2026-06-10' };
const PFILTER = { dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'includingRegex', expression: '/precios' }] }] };

(async () => {
  const out = {};
  const map = r => ({ k: r.keys[0], c: r.clicks, i: r.impressions, ctr: +(r.ctr * 100).toFixed(2), pos: +r.position.toFixed(1) });

  // /precios page-level daily (clicks, imp, avg pos)
  out.precios_daily = (await q({ startDate: '2026-05-15', endDate: '2026-06-10', dimensions: ['date'], ...PFILTER, rowLimit: 100 }))
    .map(r => ({ d: r.keys[0], c: r.clicks, i: r.impressions, pos: +r.position.toFixed(1) }));

  // queries hitting /precios — before vs after
  out.q_before = (await q({ ...A, dimensions: ['query'], ...PFILTER, rowLimit: 200 })).map(map);
  out.q_after = (await q({ ...B, dimensions: ['query'], ...PFILTER, rowLimit: 200 })).map(map);

  // page-level before vs after (which precios URLs)
  out.p_before = (await q({ ...A, dimensions: ['page'], ...PFILTER, rowLimit: 200 })).map(map);
  out.p_after = (await q({ ...B, dimensions: ['page'], ...PFILTER, rowLimit: 200 })).map(map);

  fs.writeFileSync('/tmp/audit-precios-2026-06-12.json', JSON.stringify(out, null, 1));
  console.log('OK →', Object.entries(out).map(([k, v]) => `${k}:${v.length}`).join(' · '));
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
