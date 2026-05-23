const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const credentials = require('./oauth-credentials.json');
const tokens = require('./oauth-token.json');
const oauth2Client = new google.auth.OAuth2(
  credentials.installed.client_id, credentials.installed.client_secret, 'http://localhost:3333'
);
oauth2Client.setCredentials(tokens);
oauth2Client.on('tokens', (n) => {
  if (n.refresh_token) tokens.refresh_token = n.refresh_token;
  tokens.access_token = n.access_token; tokens.expiry_date = n.expiry_date;
  fs.writeFileSync(path.join(__dirname, 'oauth-token.json'), JSON.stringify(tokens, null, 2));
});

const PROPERTY = 'properties/481391781';
const ad = google.analyticsdata({ version: 'v1beta', auth: oauth2Client });

async function report(body) {
  const res = await ad.properties.runReport({ property: PROPERTY, requestBody: body });
  return res.data;
}

async function main() {
  console.log('\n' + '='.repeat(64));
  console.log('  CONSIGNATARIAS — RETENCIÓN / RECURRENCIA  (' + new Date().toISOString().split('T')[0] + ')');
  console.log('='.repeat(64));

  // ── DAU / WAU / MAU + stickiness (snapshot a 1 día) ─────────
  // Estas métricas rolling se piden con dateRange de UN día (ayer, día cerrado)
  console.log('\n📊 ACTIVOS POR VENTANA + STICKINESS (snapshot a ayer, día cerrado)');
  console.log('-'.repeat(64));
  try {
    const d = await report({
      dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
      metrics: [
        { name: 'active1DayUsers' }, { name: 'active7DayUsers' }, { name: 'active28DayUsers' },
        { name: 'dauPerMau' }, { name: 'dauPerWau' }, { name: 'wauPerMau' },
      ],
    });
    const m = d.rows[0].metricValues.map((v) => v.value);
    console.log(`   DAU (activos último 1d):  ${m[0]}`);
    console.log(`   WAU (activos últimos 7d): ${m[1]}`);
    console.log(`   MAU (activos últimos 28d):${m[2]}`);
    console.log(`   DAU/MAU (stickiness):  ${(m[3]*100).toFixed(1)}%   (>20% = muy sticky)`);
    console.log(`   DAU/WAU:               ${(m[4]*100).toFixed(1)}%`);
    console.log(`   WAU/MAU:               ${(m[5]*100).toFixed(1)}%`);
  } catch (err) { console.log('   ERROR:', err.message); }

  // ── Nuevos vs recurrentes por ventana ───────────────────────
  const wins = [['7d', '7daysAgo', 'today'], ['28d', '28daysAgo', 'today'], ['90d', '90daysAgo', 'today']];
  console.log('\n🔁 NUEVOS vs RECURRENTES (activeUsers)');
  console.log('-'.repeat(64));
  for (const [label, s, e] of wins) {
    try {
      const d = await report({
        dateRanges: [{ startDate: s, endDate: e }],
        dimensions: [{ name: 'newVsReturning' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
      });
      let nuevo = 0, recur = 0;
      (d.rows || []).forEach((r) => {
        const k = r.dimensionValues[0].value;
        const v = Number(r.metricValues[0].value);
        if (k === 'new') nuevo = v; else if (k === 'returning') recur = v;
      });
      const tot = nuevo + recur;
      const pct = tot ? (recur / tot * 100).toFixed(1) : '0.0';
      console.log(`   ${label.padEnd(4)} nuevos:${String(nuevo).padStart(5)}  recurrentes:${String(recur).padStart(5)}  → recurrencia ${pct}%`);
    } catch (err) { console.log(`   ${label}: ERROR ${err.message}`); }
  }

  // ── Cohorts semanales (retención por semana) ────────────────
  console.log('\n📆 COHORTES SEMANALES — retención (% de la cohorte que vuelve)');
  console.log('-'.repeat(64));
  try {
    const d = await ad.properties.runReport({
      property: PROPERTY,
      requestBody: {
        cohortSpec: {
          cohorts: [0, 1, 2, 3].map((i) => {
            const s = new Date(); s.setDate(s.getDate() - ((i + 1) * 7));
            const e = new Date(); e.setDate(e.getDate() - (i * 7 + 1));
            const f = (d) => d.toISOString().split('T')[0];
            return { name: `week${i}`, dimension: 'firstSessionDate', dateRange: { startDate: f(s), endDate: f(e) } };
          }),
          cohortsRange: { granularity: 'WEEKLY', startOffset: 0, endOffset: 3 },
        },
        dimensions: [{ name: 'cohort' }, { name: 'cohortNthWeek' }],
        metrics: [{ name: 'cohortActiveUsers' }],
      },
    });
    const grid = {};
    (d.data.rows || []).forEach((r) => {
      const c = r.dimensionValues[0].value;
      const w = r.dimensionValues[1].value;
      grid[c] = grid[c] || {};
      grid[c][w] = Number(r.metricValues[0].value);
    });
    console.log('   cohorte        sem0   sem1   sem2   sem3');
    Object.keys(grid).sort().forEach((c) => {
      const base = grid[c]['0000'] || grid[c]['0'] || 0;
      const cell = (w) => {
        const v = grid[c][w];
        if (v === undefined) return '   - ';
        const pct = base ? Math.round(v / base * 100) : 0;
        return `${String(v).padStart(3)}/${String(pct).padStart(2)}%`;
      };
      console.log(`   ${c.padEnd(12)} ${cell('0000')||cell('0')} ${cell('0001')} ${cell('0002')} ${cell('0003')}`);
    });
    console.log('   (formato: usuarios/% retenido respecto a la semana 0 de la cohorte)');
  } catch (err) { console.log('   ERROR cohorts:', err.message); }

  console.log('\n' + '='.repeat(64) + '\n');
}
main();
