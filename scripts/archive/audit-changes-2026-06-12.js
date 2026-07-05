/* Pull #2 — measure performance of recent changes. Read-only.
   → /tmp/audit-changes-2026-06-12.json */
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

(async () => {
  const out = {};

  // GSC: date × page, last 35 days (to bucket page groups daily)
  let rows = [], startRow = 0;
  while (true) {
    const r = (await sc.searchanalytics.query({
      siteUrl: SITE,
      requestBody: { startDate: '2026-05-06', endDate: '2026-06-10', dimensions: ['date', 'page'], rowLimit: 25000, startRow },
    })).data.rows || [];
    rows = rows.concat(r);
    if (r.length < 25000) break;
    startRow += 25000;
  }
  out.gsc_date_page = rows.map(r => ({ d: r.keys[0], p: r.keys[1].replace('https://www.consignatarias.com.ar', ''), c: r.clicks, i: r.impressions }));

  // GA4: daily conversion-ish events since May 20
  out.ga_event_daily = (await ad.properties.runReport({
    property: GA,
    requestBody: {
      dateRanges: [{ startDate: '2026-05-20', endDate: '2026-06-12' }],
      dimensions: [{ name: 'date' }, { name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['pro_prompt_view', 'pro_prompt_click', 'planes_view', 'form_start', 'form_submit', 'profile_view', 'auction_click', 'outbound_click', 'ai_referral', 'calendar_download', 'search', 'filter_apply'] } } },
      limit: 5000,
    },
  }).then(r => r.data.rows || [])).map(r => ({ d: r.dimensionValues[0].value, e: r.dimensionValues[1].value, n: +r.metricValues[0].value }));

  // GA4: landing "/" daily engagement since May 20 (landing redesign 06-09)
  out.ga_home_daily = (await ad.properties.runReport({
    property: GA,
    requestBody: {
      dateRanges: [{ startDate: '2026-05-20', endDate: '2026-06-12' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }, { name: 'engagementRate' }, { name: 'averageSessionDuration' }, { name: 'keyEvents' }],
      dimensionFilter: { filter: { fieldName: 'landingPagePlusQueryString', stringFilter: { matchType: 'EXACT', value: '/' } } },
      limit: 100,
    },
  }).then(r => r.data.rows || [])).map(r => ({ d: r.dimensionValues[0].value, s: +r.metricValues[0].value, eng: +(+r.metricValues[1].value * 100).toFixed(1), dur: +(+r.metricValues[2].value).toFixed(0), key: +r.metricValues[3].value }));

  fs.writeFileSync('/tmp/audit-changes-2026-06-12.json', JSON.stringify(out, null, 1));
  console.log('OK →', Object.entries(out).map(([k, v]) => `${k}:${v.length}`).join(' · '));
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
