#!/usr/bin/env node
/**
 * Re-autoriza el acceso al API de Google Search Console (OAuth).
 * Los refresh tokens de apps Google en modo "testing" caducan a los 7 días → cuando
 * los scripts de GSC dan `invalid_grant`, correr esto para renovar el token.
 *
 *   node scripts/gsc-auth.mjs
 *
 * Abre (o imprime) la URL de consent de Google; al aprobar, Google redirige a
 * http://localhost:3333/?code=... — este proceso captura el code, lo canjea por
 * tokens y los guarda en scripts/archive/oauth-token.json. No expone secretos.
 */
import { google } from 'googleapis'
import { createServer } from 'node:http'
import { readFileSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const CRED = join(HERE, 'archive/oauth-credentials.json')
const TOKEN = join(HERE, 'archive/oauth-token.json')
const PORT = 3333
const REDIRECT = `http://localhost:${PORT}`
const SCOPE = ['https://www.googleapis.com/auth/webmasters.readonly']

const cred = JSON.parse(readFileSync(CRED, 'utf8')).installed
const oauth2 = new google.auth.OAuth2(cred.client_id, cred.client_secret, REDIRECT)

const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // fuerza un refresh_token nuevo
  scope: SCOPE,
})

console.log('\n1) Abrí esta URL y aprobá el acceso (tu cuenta con GSC de consignatarias.com.ar):\n')
console.log('   ' + authUrl + '\n')
console.log('2) Esperando el redirect en ' + REDIRECT + ' ...\n')
try { spawn('open', [authUrl], { stdio: 'ignore', detached: true }).unref() } catch { /* imprimir alcanza */ }

const server = createServer(async (req, res) => {
  const code = new URL(req.url, REDIRECT).searchParams.get('code')
  if (!code) { res.writeHead(400).end('Sin code en la request.'); return }
  try {
    const { tokens } = await oauth2.getToken(code)
    // preservar refresh_token viejo si Google no manda uno nuevo
    let prev = {}
    try { prev = JSON.parse(readFileSync(TOKEN, 'utf8')) } catch { /* primera vez */ }
    const merged = { ...prev, ...tokens }
    if (!merged.refresh_token) throw new Error('Google no devolvió refresh_token (revocá el acceso en myaccount.google.com y reintentá).')
    writeFileSync(TOKEN, JSON.stringify(merged, null, 2))
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<h2>✓ Token de GSC guardado.</h2><p>Ya podés cerrar esta pestaña y volver a la terminal.</p>')
    console.log('✓ Token guardado en scripts/archive/oauth-token.json')
    console.log('  Probalo con: node scripts/archive/fetch-gsc.js\n')
  } catch (e) {
    res.writeHead(500).end('Error: ' + e.message)
    console.error('✗ ' + e.message)
  } finally {
    setTimeout(() => { server.close(); process.exit(0) }, 500)
  }
})
server.listen(PORT)
