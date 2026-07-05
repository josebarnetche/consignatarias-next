/* One-shot traffic audit pull — 2026-06-12. Read-only.
   GSC + GA4 → /tmp/audit-traffic-2026-06-12.json */
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

// Windows (GSC lags ~2 days; today 2026-06-12)
const CUR_START = '2026-05-13', CUR_END = '2026-06-10';   // last 28d (within lag)
const PRV_START = '2026-04-14', PRV_END = '2026-05-12';   // prior 28d
const TREND_START = '2026-02-26';                          // since first commit

const gscQ = (body) => sc.searchanalytics.query({ siteUrl: SITE, requestBody: body }).then(r => r.data.rows || []);
const gaQ = (body) => ad.properties.runReport({ property: GA, requestBody: body }).then(r => r.data.rows || []);

(async () => {
  const out = {};

  // --- GSC ---
  out.gsc_daily = (await gscQ({ startDate: TREND_START, endDate: CUR_END, dimensions: ['date'], rowLimit: 500 }))
    .map(r => ({ d: r.keys[0], clicks: r.clicks, imp: r.impressions }));

  const mapQ = r => ({ k: r.keys[0], clicks: r.clicks, imp: r.impressions, ctr: +(r.ctr * 100).toFixed(2), pos: +r.position.toFixed(1) });

  out.queries_cur = (await gscQ({ startDate: CUR_START, endDate: CUR_END, dimensions: ['query'], rowLimit: 100 })).map(mapQ);
  out.queries_prev = (await gscQ({ startDate: PRV_START, endDate: PRV_END, dimensions: ['query'], rowLimit: 100 })).map(mapQ);
  out.pages_cur = (await gscQ({ startDate: CUR_START, endDate: CUR_END, dimensions: ['page'], rowLimit: 250 })).map(mapQ);
  out.pages_prev = (await gscQ({ startDate: PRV_START, endDate: PRV_END, dimensions: ['page'], rowLimit: 250 })).map(mapQ);
  out.devices = (await gscQ({ startDate: CUR_START, endDate: CUR_END, dimensions: ['device'], rowLimit: 10 })).map(mapQ);

  // --- GA4 ---
  // weekly continuation
  out.ga_weekly = (await gaQ({
    dateRanges: [{ startDate: '2026-03-02', endDate: '2026-06-12' }],
    dimensions: [{ name: 'yearWeek' }],
    metrics: [{ name: 'totalUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'newUsers' }],
    orderBys: [{ dimension: { dimensionName: 'yearWeek' } }], limit: 30,
  })).map(r => ({ w: r.dimensionValues[0].value, users: +r.metricValues[0].value, sessions: +r.metricValues[1].value, views: +r.metricValues[2].value, new: +r.metricValues[3].value }));

  // landing pages 28d
  out.ga_landing = (await gaQ({
    dateRanges: [{ startDate: CUR_START, endDate: '2026-06-12' }],
    dimensions: [{ name: 'landingPagePlusQueryString' }],
    metrics: [{ name: 'sessions' }, { name: 'engagementRate' }, { name: 'averageSessionDuration' }, { name: 'keyEvents' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 40,
  })).map(r => ({ p: r.dimensionValues[0].value, sessions: +r.metricValues[0].value, eng: +(+r.metricValues[1].value * 100).toFixed(1), dur: +(+r.metricValues[2].value).toFixed(0), key: +r.metricValues[3].value }));

  // events 28d
  out.ga_events = (await gaQ({
    dateRanges: [{ startDate: CUR_START, endDate: '2026-06-12' }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 50,
  })).map(r => ({ e: r.dimensionValues[0].value, n: +r.metricValues[0].value, users: +r.metricValues[1].value }));

  // channels 28d
  out.ga_channels = (await gaQ({
    dateRanges: [{ startDate: CUR_START, endDate: '2026-06-12' }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagementRate' }], limit: 20,
  })).map(r => ({ ch: r.dimensionValues[0].value, sessions: +r.metricValues[0].value, users: +r.metricValues[1].value, eng: +(+r.metricValues[2].value * 100).toFixed(1) }));

  // top pages by views 28d
  out.ga_pages = (await gaQ({
    dateRanges: [{ startDate: CUR_START, endDate: '2026-06-12' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 40,
  })).map(r => ({ p: r.dimensionValues[0].value, views: +r.metricValues[0].value, users: +r.metricValues[1].value }));

  fs.writeFileSync('/tmp/audit-traffic-2026-06-12.json', JSON.stringify(out, null, 1));
  console.log('OK →', Object.entries(out).map(([k, v]) => `${k}:${v.length}`).join(' · '));
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
