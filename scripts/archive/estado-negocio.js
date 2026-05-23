/**
 * estado-negocio.js — Panel único de datos de consignatarias.com.ar
 *
 * Combina las 3 fuentes en un solo reporte:
 *   1. GA4  (tráfico, usuarios, retención, canales)   — usa oauth-token.json
 *   2. GSC  (búsquedas Google)                         — usa oauth-token.json
 *   3. Supabase (cuentas, suscripciones, revenue real) — usa SERVICE_ROLE_KEY
 *
 * Requisitos:
 *   - scripts/archive/oauth-credentials.json + oauth-token.json (ya presentes)
 *   - .env.analytics.local con SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL
 *       (traer con: vercel env pull .env.analytics.local --environment=production --yes)
 *
 * Uso:  node scripts/archive/estado-negocio.js
 */
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

/* ── env loader (sin dotenv) ─────────────────────────────────── */
function loadEnv(file) {
  const out = {};
  try {
    const raw = fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');
    raw.split('\n').forEach((line) => {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').replace(/\\n/g, '').trim();
    });
  } catch (_) {}
  return out;
}
const env = loadEnv('.env.analytics.local');
const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

/* ── Google auth (GA4 + GSC) ─────────────────────────────────── */
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
const ad = google.analyticsdata({ version: 'v1beta', auth: oauth2Client });
const sc = google.searchconsole({ version: 'v1', auth: oauth2Client });
const PROPERTY = 'properties/481391781';
const SITE = 'sc-domain:consignatarias.com.ar';

const fmt = (d) => d.toISOString().split('T')[0];
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const pct = (a, b) => (b === 0 ? '   n/a' : (((a - b) / b) * 100 >= 0 ? '+' : '') + (((a - b) / b) * 100).toFixed(1) + '%');
const H = (t) => { console.log('\n' + t); console.log('-'.repeat(64)); };

async function ga4(s, e, dims = [], metrics = ['activeUsers']) {
  const r = await ad.properties.runReport({
    property: PROPERTY,
    requestBody: { dateRanges: [{ startDate: s, endDate: e }], dimensions: dims.map((n) => ({ name: n })), metrics: metrics.map((n) => ({ name: n })) },
  });
  return r.data;
}
async function gscOverall(s, e) {
  const r = await sc.searchanalytics.query({ siteUrl: SITE, requestBody: { startDate: fmt(s), endDate: fmt(e), dimensions: [] } });
  return (r.data.rows && r.data.rows[0]) || null;
}

async function main() {
  console.log('='.repeat(64));
  console.log('  CONSIGNATARIAS — ESTADO DEL NEGOCIO  (' + fmt(new Date()) + ')');
  console.log('='.repeat(64));

  /* ═══ 1. ADQUISICIÓN (GA4) ═══════════════════════════════════ */
  H('👤 USUARIOS (GA4)  activeUsers / newUsers / sessions');
  const m = ['activeUsers', 'newUsers', 'sessions'];
  const u7 = (await ga4('7daysAgo', 'today', [], m)).rows?.[0]?.metricValues.map((v) => +v.value) || [0, 0, 0];
  const u7p = (await ga4('14daysAgo', '8daysAgo', [], m)).rows?.[0]?.metricValues.map((v) => +v.value) || [0, 0, 0];
  const u28 = (await ga4('28daysAgo', 'today', [], m)).rows?.[0]?.metricValues.map((v) => +v.value) || [0, 0, 0];
  const u28p = (await ga4('56daysAgo', '29daysAgo', [], m)).rows?.[0]?.metricValues.map((v) => +v.value) || [0, 0, 0];
  console.log(`   7d   usuarios:${String(u7[0]).padStart(5)}  (${pct(u7[0], u7p[0])} vs 7d previos)`);
  console.log(`   28d  usuarios:${String(u28[0]).padStart(5)}  (${pct(u28[0], u28p[0])} vs 28d previos)`);

  H('🔁 RETENCIÓN (GA4, snapshot a ayer)');
  try {
    const r = (await ga4('yesterday', 'yesterday', [], ['active1DayUsers', 'active7DayUsers', 'active28DayUsers', 'dauPerMau'])).rows?.[0]?.metricValues.map((v) => +v.value);
    console.log(`   DAU:${r[0]}  WAU:${r[1]}  MAU:${r[2]}   stickiness DAU/MAU: ${(r[3] * 100).toFixed(1)}% (>20% sticky)`);
  } catch (e) { console.log('   error:', e.message); }
  try {
    const nr = await ga4('28daysAgo', 'today', ['newVsReturning'], ['activeUsers']);
    let nu = 0, re = 0; (nr.rows || []).forEach((x) => { if (x.dimensionValues[0].value === 'new') nu = +x.metricValues[0].value; if (x.dimensionValues[0].value === 'returning') re = +x.metricValues[0].value; });
    console.log(`   28d nuevos:${nu}  recurrentes:${re}  → recurrencia ${(re / (nu + re) * 100 || 0).toFixed(1)}%`);
  } catch (e) { console.log('   error:', e.message); }

  H('📡 CANALES (GA4, 28d)');
  try {
    const ch = await ga4('28daysAgo', 'today', ['sessionDefaultChannelGroup'], ['activeUsers', 'sessions']);
    (ch.rows || []).sort((a, b) => +b.metricValues[0].value - +a.metricValues[0].value).forEach((r) =>
      console.log(`   ${r.dimensionValues[0].value.padEnd(18)} usuarios:${String(r.metricValues[0].value).padStart(5)}`));
  } catch (e) { console.log('   error:', e.message); }

  /* ═══ 2. BÚSQUEDAS (GSC) ═════════════════════════════════════ */
  H('🔍 BÚSQUEDAS GOOGLE (GSC)  clicks / impr / CTR / pos');
  for (const [lab, s, e] of [['7d', daysAgo(7), new Date()], ['7d previos', daysAgo(14), daysAgo(7)], ['28d', daysAgo(28), new Date()], ['28d previos', daysAgo(56), daysAgo(28)]]) {
    const r = await gscOverall(s, e);
    if (r) console.log(`   ${lab.padEnd(12)} ${String(r.clicks).padStart(4)}c / ${String(r.impressions).padStart(6)}i / ${(r.ctr * 100).toFixed(2)}% / pos ${r.position.toFixed(1)}`);
  }

  /* ═══ 3. NEGOCIO (Supabase) ══════════════════════════════════ */
  if (!SUPA_KEY) {
    H('🗄️  SUPABASE');
    console.log('   ⚠️  Falta SUPABASE_SERVICE_ROLE_KEY. Correr:');
    console.log('   vercel env pull .env.analytics.local --environment=production --yes');
  } else {
    const sb = createClient(SUPA_URL, SUPA_KEY);
    const count = async (table, mod) => { let q = sb.from(table).select('*', { count: 'exact', head: true }); if (mod) q = mod(q); const { count: c } = await q; return c || 0; };

    H('🗄️  CUENTAS Y SUSCRIPCIONES (Supabase)');
    const usersTotal = await count('user_subscriptions');
    const proActive = await count('user_subscriptions', (q) => q.eq('tier', 'pro').eq('status', 'active'));
    // Pago REAL = con Rebill id (sin id = comp/invite, $0)
    const proPaid = await count('user_subscriptions', (q) => q.eq('tier', 'pro').eq('status', 'active').not('rebill_subscription_id', 'is', null));
    const apiPaid = await count('user_subscriptions', (q) => q.neq('api_tier', 'none').not('rebill_enterprise_subscription_id', 'is', null));
    const nlTotal = await count('newsletter_subscribers');
    const nlActive = await count('newsletter_subscribers', (q) => q.eq('status', 'active'));
    const ganado = await count('user_ganado');
    const apiKeys = await count('api_keys');
    const claims = await count('consignataria_claims', (q) => q.eq('status', 'pending'));
    console.log(`   Cuentas (user_subscriptions): ${usersTotal}`);
    console.log(`   PRO Usuario (tier=pro):       ${proActive}   (pagos reales c/Rebill: ${proPaid})   ← spots: ${50 - proActive}/50`);
    console.log(`   API tier pagos reales:        ${apiPaid}`);
    console.log(`   Newsletter:                   ${nlActive}/${nlTotal} activos`);
    console.log(`   Mi Ganado (lock-in):          ${ganado} usuarios`);
    console.log(`   API keys emitidas:            ${apiKeys}`);
    console.log(`   Claims pendientes (B2B):      ${claims}`);

    H('💰 SUSCRIPCIONES POR TIER (detalle)');
    const { data: subs } = await sb.from('user_subscriptions').select('tier, api_tier, status, created_at').order('created_at');
    const tally = {};
    (subs || []).forEach((s) => { const k = `${s.tier}/${s.api_tier}/${s.status}`; tally[k] = (tally[k] || 0) + 1; });
    Object.entries(tally).forEach(([k, n]) => console.log(`   ${k.padEnd(28)} ${n}`));

    H('👁️  PROFILE VIEWS (Supabase)');
    const pvTotal = await count('profile_views');
    const pv7 = await count('profile_views', (q) => q.gte('viewed_at', daysAgo(7).toISOString()));
    const pv28 = await count('profile_views', (q) => q.gte('viewed_at', daysAgo(28).toISOString()));
    console.log(`   total:${pvTotal}   7d:${pv7}   28d:${pv28}`);

    H('🔌 USO DE API (api_usage_daily, últimos 7 días con uso)');
    const { data: au } = await sb.from('api_usage_daily').select('date, request_count').order('date', { ascending: false }).limit(7);
    if (au && au.length) au.forEach((r) => console.log(`   ${r.date}  ${r.request_count} requests`));
    else console.log('   (sin uso registrado)');

    /* ── FUNNEL — la métrica que importa ── */
    H('🎯 FUNNEL DE CONVERSIÓN (28d)');
    console.log(`   Usuarios web (GA4):     ${u28[0]}`);
    console.log(`   → Cuentas creadas:      ${usersTotal}   (${(usersTotal / u28[0] * 100).toFixed(2)}% de visitantes)`);
    console.log(`   → PRO pagos REALES:     ${proPaid}   (${(proPaid / usersTotal * 100 || 0).toFixed(1)}% de cuentas)`);
    console.log(`   MRR real PRO Usuario:   $${(proPaid * 7900).toLocaleString('es-AR')}   (comps/invites no cuentan)`);
  }

  console.log('\n' + '='.repeat(64) + '\n');
}
main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
