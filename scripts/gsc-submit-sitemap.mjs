#!/usr/bin/env node
/**
 * Re-submite el sitemap a Google Search Console (fuerza re-fetch). Pensado para
 * correr tras cada deploy (GitHub Action on push) y también manualmente.
 *
 *   node scripts/gsc-submit-sitemap.mjs
 *
 * AUTH: service account con scope de ESCRITURA (GSC_SA_KEY o GA4_SA_KEY; el SA debe
 * tener permiso en la propiedad GSC). Fallback: token OAuth (scripts/archive/).
 */
import { google } from 'googleapis'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const SITE = process.env.GSC_SITE || 'sc-domain:consignatarias.com.ar'
const FEED = process.env.GSC_SITEMAP || 'https://www.consignatarias.com.ar/sitemap.xml'
const SCOPE = 'https://www.googleapis.com/auth/webmasters' // write

function envLocal(k) {
  if (process.env[k]) return process.env[k]
  try { const l = readFileSync(join(HERE, '../.env.local'), 'utf8').split('\n').find((x) => x.startsWith(k + '=')); return l ? l.slice(k.length + 1).replace(/^["']|["']$/g, '') : undefined } catch { return undefined }
}
const parseSA = (raw) => { try { return JSON.parse(raw) } catch { try { return JSON.parse(Buffer.from(raw, 'base64').toString()) } catch { return null } } }

async function client() {
  const saRaw = envLocal('GSC_SA_KEY') || envLocal('GA4_SA_KEY')
  const sa = saRaw && parseSA(saRaw)
  if (sa?.client_email && sa?.private_key) {
    const jwt = new google.auth.JWT({ email: sa.client_email, key: sa.private_key, scopes: [SCOPE] })
    await jwt.authorize()
    return { sc: google.searchconsole({ version: 'v1', auth: jwt }), via: 'service-account' }
  }
  const credRaw = process.env.GSC_OAUTH_CREDENTIALS || (existsSync(join(HERE, 'archive/oauth-credentials.json')) && readFileSync(join(HERE, 'archive/oauth-credentials.json'), 'utf8'))
  const tokRaw = process.env.GSC_OAUTH_TOKEN || (existsSync(join(HERE, 'archive/oauth-token.json')) && readFileSync(join(HERE, 'archive/oauth-token.json'), 'utf8'))
  if (credRaw && tokRaw) {
    const cred = JSON.parse(credRaw).installed
    const o = new google.auth.OAuth2(cred.client_id, cred.client_secret, 'http://localhost:3333')
    o.setCredentials(JSON.parse(tokRaw))
    return { sc: google.searchconsole({ version: 'v1', auth: o }), via: 'oauth-token' }
  }
  throw new Error('Sin auth de GSC con scope de escritura (ni SA ni token OAuth por env/archivo).')
}

async function main() {
  const { sc, via } = await client()
  await sc.sitemaps.submit({ siteUrl: SITE, feedpath: FEED })
  const g = await sc.sitemaps.get({ siteUrl: SITE, feedpath: FEED })
  console.log(`✓ sitemap re-submitido (${via}) · isPending: ${g.data.isPending} · errors: ${g.data.errors || 0}`)
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })
