/* GSC deep-dive — patrones sociológicos del productor. Uso interno. */
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const credentials = require('./oauth-credentials.json');
const tokens = require('./oauth-token.json');
const oauth2Client = new google.auth.OAuth2(credentials.installed.client_id, credentials.installed.client_secret, 'http://localhost:3333');
oauth2Client.setCredentials(tokens);
oauth2Client.on('tokens', (nt) => { if (nt.refresh_token) tokens.refresh_token = nt.refresh_token; tokens.access_token = nt.access_token; tokens.expiry_date = nt.expiry_date; fs.writeFileSync(path.join(__dirname, 'oauth-token.json'), JSON.stringify(tokens, null, 2)); });
const sc = google.searchconsole({ version: 'v1', auth: oauth2Client });
const siteUrl = 'sc-domain:consignatarias.com.ar';
const fmt = (d) => d.toISOString().split('T')[0];
const ago = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

async function q(dimensions, startDate, endDate, rowLimit = 1000, extra = {}) {
  const res = await sc.searchanalytics.query({ siteUrl, requestBody: { startDate: fmt(startDate), endDate: fmt(endDate), dimensions, rowLimit, ...extra } });
  return res.data.rows || [];
}

(async () => {
  const S28 = ago(30), E = ago(2); // 28d cerrados (evita lag)
  const queries = await q(['query'], S28, E);
  const totI = queries.reduce((a, r) => a + r.impressions, 0);
  const totC = queries.reduce((a, r) => a + r.clicks, 0);

  // --- Clasificador sociológico de intención ---
  const buckets = {
    arrendamiento: { re: /arrend/i, i: 0, c: 0, n: 0 },
    temporal_hoy: { re: /\bhoy\b|diario|actual|ahora/i, i: 0, c: 0, n: 0 },
    temporal_periodica: { re: /mensual|semanal|promedio|hist[oó]ric|anual/i, i: 0, c: 0, n: 0 },
    ancla_liniers: { re: /liniers/i, i: 0, c: 0, n: 0 },
    ancla_canuelas: { re: /ca[ñn]uelas/i, i: 0, c: 0, n: 0 },
    ancla_medios: { re: /la nacion|canal rural|clarin|infocampo|agrofy|rosgan/i, i: 0, c: 0, n: 0 },
    indice_marca: { re: /inmag|indice|[ií]ndice/i, i: 0, c: 0, n: 0 },
    categoria_vaca: { re: /vaca|vaquillona|vientre|cría|cria/i, i: 0, c: 0, n: 0 },
    categoria_invernada: { re: /invernad|ternero|recri/i, i: 0, c: 0, n: 0 },
    frigorifico: { re: /frigorific|faena|gancho|res/i, i: 0, c: 0, n: 0 },
    remate_consignataria: { re: /remate|consignatari|feria|martiller/i, i: 0, c: 0, n: 0 },
    sanidad: { re: /senasa|renspa|vacun|aftosa|sanidad|dte/i, i: 0, c: 0, n: 0 },
  };
  for (const row of queries) {
    const k = row.keys[0];
    for (const b of Object.values(buckets)) if (b.re.test(k)) { b.i += row.impressions; b.c += row.clicks; b.n++; }
  }
  console.log(`\n### 28d cerrados (${fmt(S28)} → ${fmt(E)}) — ${queries.length} queries únicas, ${totI} impr, ${totC} clicks`);
  console.log('\n=== BUCKETS SOCIOLÓGICOS (share de impresiones) ===');
  Object.entries(buckets).sort((a, b) => b[1].i - a[1].i).forEach(([name, b]) =>
    console.log(`${name.padEnd(22)} impr=${String(b.i).padStart(6)} (${(100 * b.i / totI).toFixed(1)}%)  clicks=${String(b.c).padStart(4)}  queries=${b.n}`));

  // --- Día de semana (cuándo busca el productor) ---
  const byDate = await q(['date'], S28, E);
  const dow = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const wk = Array.from({ length: 7 }, () => ({ i: 0, c: 0, d: 0 }));
  byDate.forEach((r) => { const dt = new Date(r.keys[0] + 'T12:00:00Z'); const g = wk[dt.getUTCDay()]; g.i += r.impressions; g.c += r.clicks; g.d++; });
  console.log('\n=== POR DÍA DE SEMANA (promedio/día) ===');
  wk.forEach((g, i) => console.log(`${dow[i]}  impr/día=${g.d ? Math.round(g.i / g.d) : 0}  clicks/día=${g.d ? Math.round(g.c / g.d) : 0}`));

  // --- Tendencia: 28d actual vs 28d previo ---
  const prev = await q(['query'], ago(58), ago(30), 5);
  const prevTot = (await q([], ago(58), ago(30), 1))[0] || { impressions: 0, clicks: 0 };
  const curTot = (await q([], S28, E, 1))[0] || { impressions: 0, clicks: 0 };
  console.log('\n=== TENDENCIA 28d vs 28d previo ===');
  console.log(`impresiones: ${prevTot.impressions} → ${curTot.impressions}  (${((curTot.impressions / prevTot.impressions - 1) * 100).toFixed(0)}%)`);
  console.log(`clicks:      ${prevTot.clicks} → ${curTot.clicks}  (${((curTot.clicks / prevTot.clicks - 1) * 100).toFixed(0)}%)`);

  // --- Top queries emergentes (long tail con volumen) ---
  console.log('\n=== TOP 40 QUERIES (por impresiones) ===');
  queries.sort((a, b) => b.impressions - a.impressions).slice(0, 40).forEach((r) =>
    console.log(`${String(r.impressions).padStart(5)}i ${String(r.clicks).padStart(3)}c pos${r.position.toFixed(1).padStart(4)}  "${r.keys[0]}"`));

  // --- Queries de marca propia (naming que ya nos googlean) ---
  const marca = queries.filter((r) => /consignatarias|inmag|el corredor|el oraculo/i.test(r.keys[0]));
  console.log(`\n=== QUERIES DE MARCA PROPIA (${marca.length}) ===`);
  marca.sort((a, b) => b.impressions - a.impressions).slice(0, 15).forEach((r) => console.log(`${String(r.impressions).padStart(4)}i ${String(r.clicks).padStart(3)}c  "${r.keys[0]}"`));
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
