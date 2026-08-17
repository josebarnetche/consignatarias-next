/**
 * Import histórico de usuarios reales a howmuchusers.wtf.
 * Lee auth.users (id + created_at) con la service role y los manda a /v1/users/import.
 * Solo UUIDs y fechas — ningún dato personal sale del proyecto.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + HMU_SECRET_KEY (vercel env pull .env.local)
 * Uso: node --env-file=.env.local scripts/hmu-import-users.mjs [--dry-run]
 */
import { createClient } from '@supabase/supabase-js'

const DRY = process.argv.includes('--dry-run')
const clean = (v) => (v || '').trim().replace(/^"|"$/g, '')
const URL_ = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
const SVC = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)
const HMU = clean(process.env.HMU_SECRET_KEY)
if (!URL_ || !SVC || !HMU) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / HMU_SECRET_KEY')
  process.exit(1)
}
const supabase = createClient(URL_, SVC, { auth: { persistSession: false } })

const users = []
for (let page = 1; ; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
  if (error) throw error
  for (const u of data.users) users.push({ user_id: u.id, created_at: u.created_at })
  if (data.users.length < 1000) break
}
users.sort((a, b) => a.created_at.localeCompare(b.created_at))
console.log(`auth.users: ${users.length} (${users[0]?.created_at?.slice(0, 10)} → ${users.at(-1)?.created_at?.slice(0, 10)})`)
if (DRY) process.exit(0)

for (let i = 0; i < users.length; i += 1000) {
  const chunk = users.slice(i, i + 1000)
  const res = await fetch('https://howmuchusers.wtf/api/v1/users/import', {
    method: 'POST',
    headers: { Authorization: `Bearer ${HMU}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ users: chunk }),
  })
  console.log(`import ${i + 1}-${i + chunk.length}: [${res.status}] ${await res.text()}`)
}
const st = await fetch('https://howmuchusers.wtf/api/v1/status', {
  headers: { Authorization: `Bearer ${HMU}` },
})
console.log('status:', await st.text())
