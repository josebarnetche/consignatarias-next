#!/usr/bin/env node
/**
 * GA4 Admin API setup script
 * Creates custom dimensions and key events for consignatarias.com.ar
 *
 * Usage:
 *   1. Create OAuth2 credentials at https://console.cloud.google.com/apis/credentials
 *      - Application type: Desktop app
 *      - Download the JSON → save as scripts/oauth-credentials.json
 *   2. Enable "Google Analytics Admin API" at https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com
 *   3. Run: node scripts/setup-ga4.mjs
 */

import { AnalyticsAdminServiceClient } from '@google-analytics/admin';
import { OAuth2Client } from 'google-auth-library';
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { URL } from 'node:url';

const PROPERTY_ID = '481391781';
const PROPERTY = `properties/${PROPERTY_ID}`;
const CREDS_PATH = new URL('./oauth-credentials.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const TOKEN_PATH = new URL('./oauth-token.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

const SCOPES = ['https://www.googleapis.com/auth/analytics.edit'];

/* ── Custom Dimensions to create ───────────────────────────────────── */
const CUSTOM_DIMENSIONS = [
  { parameterName: 'consignataria', displayName: 'Consignataria', scope: 'EVENT' },
  { parameterName: 'consignataria_slug', displayName: 'Consignataria Slug', scope: 'EVENT' },
  { parameterName: 'province', displayName: 'Provincia', scope: 'EVENT' },
  { parameterName: 'auction_type', displayName: 'Tipo Remate', scope: 'EVENT' },
  { parameterName: 'destination', displayName: 'Destino Click', scope: 'EVENT' },
  { parameterName: 'filter_type', displayName: 'Tipo Filtro', scope: 'EVENT' },
  { parameterName: 'filter_value', displayName: 'Valor Filtro', scope: 'EVENT' },
  { parameterName: 'link_type', displayName: 'Tipo Link', scope: 'EVENT' },
  { parameterName: 'is_featured', displayName: 'Es Destacado', scope: 'EVENT' },
  { parameterName: 'search_term', displayName: 'Busqueda', scope: 'EVENT' },
];

/* ── Key Events (conversions) to create ────────────────────────────── */
const KEY_EVENTS = [
  { eventName: 'auction_click', countingMethod: 'ONCE_PER_EVENT' },
  { eventName: 'outbound_click', countingMethod: 'ONCE_PER_EVENT' },
  { eventName: 'profile_view', countingMethod: 'ONCE_PER_EVENT' },
];

/* ── OAuth2 browser flow ───────────────────────────────────────────── */
async function getAuthClient() {
  if (!existsSync(CREDS_PATH)) {
    console.error(`\n❌ Missing OAuth credentials file at:\n   ${CREDS_PATH}\n`);
    console.error('Steps:');
    console.error('  1. Go to https://console.cloud.google.com/apis/credentials');
    console.error('  2. Create OAuth 2.0 Client ID → Desktop app');
    console.error('  3. Download JSON → save as scripts/oauth-credentials.json');
    console.error('  4. Enable GA Admin API: https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com');
    console.error('  5. Re-run this script\n');
    process.exit(1);
  }

  const creds = JSON.parse(readFileSync(CREDS_PATH, 'utf8'));
  const { client_id, client_secret } = creds.installed || creds.web || {};
  if (!client_id) {
    console.error('❌ Invalid credentials file format. Expected "installed" or "web" key.');
    process.exit(1);
  }

  const oauth2 = new OAuth2Client(client_id, client_secret, 'http://localhost:3847');

  // Check for cached token
  if (existsSync(TOKEN_PATH)) {
    const tokens = JSON.parse(readFileSync(TOKEN_PATH, 'utf8'));
    oauth2.setCredentials(tokens);
    // Refresh if expired
    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      const { credentials } = await oauth2.refreshAccessToken();
      oauth2.setCredentials(credentials);
      writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2));
    }
    return oauth2;
  }

  // Launch browser auth flow
  const authUrl = oauth2.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });
  console.log('\n🔗 Opening browser for Google login...\n');

  // Dynamic import for 'open'
  const { default: open } = await import('open');

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://localhost:3847');
      const authCode = url.searchParams.get('code');
      if (authCode) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h2>Auth OK — you can close this tab.</h2>');
        server.close();
        resolve(authCode);
      } else {
        res.writeHead(400);
        res.end('Missing code');
      }
    });
    server.listen(3847, () => {
      open(authUrl).catch(() => {
        console.log('Could not open browser. Open this URL manually:\n', authUrl);
      });
    });
    server.on('error', reject);
    setTimeout(() => { server.close(); reject(new Error('Auth timed out after 120s')); }, 120000);
  });

  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);
  writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log('✅ Token saved to', TOKEN_PATH);
  return oauth2;
}

/* ── Main ──────────────────────────────────────────────────────────── */
async function main() {
  console.log('━━━ GA4 Setup for consignatarias.com.ar ━━━');
  console.log(`Property: ${PROPERTY_ID}\n`);

  const authClient = await getAuthClient();
  const client = new AnalyticsAdminServiceClient({ authClient });

  // ── 1. List existing custom dimensions ──────────────────────────
  console.log('📋 Checking existing custom dimensions...');
  const [existingDims] = await client.listCustomDimensions({ parent: PROPERTY });
  const existingParams = new Set(existingDims.map(d => d.parameterName));

  // ── 2. Create missing custom dimensions ─────────────────────────
  for (const dim of CUSTOM_DIMENSIONS) {
    if (existingParams.has(dim.parameterName)) {
      console.log(`  ⏭️  ${dim.parameterName} — already exists`);
      continue;
    }
    try {
      await client.createCustomDimension({
        parent: PROPERTY,
        customDimension: {
          parameterName: dim.parameterName,
          displayName: dim.displayName,
          scope: dim.scope,
          description: `Auto-created by setup script`,
        },
      });
      console.log(`  ✅ ${dim.parameterName} — created`);
    } catch (err) {
      console.error(`  ❌ ${dim.parameterName} — ${err.message}`);
    }
  }

  // ── 3. List existing key events ─────────────────────────────────
  console.log('\n📋 Checking existing key events...');
  const [existingKeys] = await client.listKeyEvents({ parent: PROPERTY });
  const existingEventNames = new Set(existingKeys.map(k => k.eventName));

  // ── 4. Create missing key events ────────────────────────────────
  for (const ke of KEY_EVENTS) {
    if (existingEventNames.has(ke.eventName)) {
      console.log(`  ⏭️  ${ke.eventName} — already exists`);
      continue;
    }
    try {
      await client.createKeyEvent({
        parent: PROPERTY,
        keyEvent: {
          eventName: ke.eventName,
          countingMethod: ke.countingMethod,
        },
      });
      console.log(`  ✅ ${ke.eventName} — marked as key event`);
    } catch (err) {
      console.error(`  ❌ ${ke.eventName} — ${err.message}`);
    }
  }

  console.log('\n━━━ Done ━━━\n');
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
