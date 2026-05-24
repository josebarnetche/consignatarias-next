/**
 * send-invites.mjs — invitación ÚNICA a contactos warm para que se suscriban
 * al cierre mensual. NO los suscribe: los invita a opt-in.
 *
 * Uso:
 *   node scripts/send-invites.mjs base.csv --dry        # parsea + cuenta, no manda
 *   node scripts/send-invites.mjs base.csv --test=a@b.c # manda 1 de prueba
 *   node scripts/send-invites.mjs base.csv              # manda (capeado a DAILY)
 *   node scripts/send-invites.mjs base.csv --limit=50
 *
 * CSV: una columna `email` (o `email,nombre`). Ignora header si dice "email".
 * Idempotente: guarda los enviados en scripts/.cache/invites-sent.txt y los saltea.
 * Respeta Resend free (100/día): default 70/corrida; corré de nuevo al otro día
 * para seguir con el resto.
 */
import { readFileSync, existsSync, mkdirSync, appendFileSync } from 'fs'
import path from 'path'

const args = process.argv.slice(2)
const csvPath = args.find((a) => !a.startsWith('--'))
const dry = args.includes('--dry')
const testTo = (args.find((a) => a.startsWith('--test=')) || '').split('=')[1]
const limitArg = (args.find((a) => a.startsWith('--limit=')) || '').split('=')[1]
const DAILY = limitArg ? parseInt(limitArg, 10) : 70

if (!csvPath && !testTo) {
  console.error('Falta el CSV. Uso: node scripts/send-invites.mjs base.csv [--dry|--test=mail|--limit=N]')
  process.exit(1)
}

// env de prod (RESEND_API_KEY) antes de importar email.ts
for (const line of readFileSync('.env.analytics.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').replace(/\\n/g, '').trim()
}

const { sendSubscriptionInvite } = await import('../src/lib/email.ts')
const market = JSON.parse(readFileSync('./src/lib/data/market-prices.json', 'utf8'))
const inmagToday = market?.inmag?.current

const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

// TEST mode
if (testTo) {
  console.log(`Test → ${testTo} (INMAG hoy: ${inmagToday})`)
  console.log(await sendSubscriptionInvite(testTo, { nombre: 'Jose', inmagToday }))
  process.exit(0)
}

// Parse CSV
const rows = readFileSync(csvPath, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean)
const contacts = []
for (const row of rows) {
  const [emailRaw, nombre] = row.split(/[,;\t]/).map((s) => (s || '').trim())
  const email = (emailRaw || '').toLowerCase()
  if (!validEmail(email)) continue // saltea header y filas inválidas
  contacts.push({ email, nombre: nombre || undefined })
}
// dedupe
const seen = new Set()
const uniq = contacts.filter((c) => !(seen.has(c.email) || seen.add(c.email)))

// Idempotencia: ya enviados
const cacheDir = path.join('scripts', '.cache')
const sentFile = path.join(cacheDir, 'invites-sent.txt')
const alreadySent = new Set(existsSync(sentFile) ? readFileSync(sentFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean) : [])
const pending = uniq.filter((c) => !alreadySent.has(c.email))

console.log(`CSV: ${rows.length} filas · válidos únicos: ${uniq.length} · ya enviados: ${alreadySent.size} · pendientes: ${pending.length}`)
console.log(`INMAG hoy: ${inmagToday} · tope esta corrida: ${DAILY}`)

if (dry) {
  console.log('\n[DRY-RUN] no se manda nada. Muestra primeros 5 pendientes:')
  pending.slice(0, 5).forEach((c) => console.log('  ', c.email, c.nombre || ''))
  process.exit(0)
}

const batch = pending.slice(0, DAILY)
if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true })
let ok = 0, fail = 0
for (const c of batch) {
  const r = await sendSubscriptionInvite(c.email, { nombre: c.nombre, inmagToday })
  if (r.success) { ok++; appendFileSync(sentFile, c.email + '\n') }
  else { fail++; console.error('  fallo', c.email, r.error) }
  await new Promise((res) => setTimeout(res, 600)) // ~100/min, suave
}
console.log(`\nEnviados: ${ok} · fallos: ${fail} · quedan pendientes: ${pending.length - batch.length}`)
if (pending.length - batch.length > 0) console.log('Corré de nuevo mañana para seguir (respeta el tope de Resend).')
