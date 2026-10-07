/**
 * Carga al ruteo los contactos que las plantas tienen declarados en el registro
 * APS2 de SENASA (lo que dejó `scripts/scrapers/senasa-aps2.mjs`).
 *
 * DÓNDE VAN Y POR QUÉ. A `email_ruteo` / `telefono_ruteo`, NO a `email` / `phone`:
 * esos dos se renderizan en la ficha pública y en el JSON-LD, así que cargarlos
 * ahí sería publicarle al visitante el contacto directo de la planta y perder la
 * operación. El contacto relevado sirve para que nosotros derivemos, no para que
 * el productor nos saltee.
 *
 * NO PISA NADA. Lo verificado a mano manda: si ya hay mail, teléfono o un nivel
 * de confianza cargado, se conserva y lo de SENASA sólo se suma a las notas. El
 * registro tiene direcciones viejas (casillas de arnet, sinectis), así que entra
 * como confianza "media" y sólo donde no había nada.
 *
 * Uso: node scripts/carga-contactos-senasa.mjs [--dry]
 */

import { readFileSync } from 'node:fs'

const FUENTE =
  'https://aps2.senasa.gov.ar/registros/faces/publico/establecimientos/tc_frigorificospublico.jsp'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
)
const BASE = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!BASE || !KEY) throw new Error('faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local')

const rubros = JSON.parse(readFileSync('src/lib/data/senasa-rubros.json', 'utf8'))
const dir = JSON.parse(readFileSync('src/lib/data/frigorificos.json', 'utf8'))
const padron = Array.isArray(dir) ? dir : Object.values(dir).find(Array.isArray)

const limpiar = (v) => v.replace(/,\s*$/, '').trim()
const esMail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

/**
 * Un CUIT puede tener dos plantas (dos matrículas distintas, misma firma). La
 * tabla va por CUIT, así que se fusionan en vez de que una pise a la otra: gana
 * el primer contacto y las dos fichas quedan escritas en las notas.
 */
const porCuit = new Map()
for (const p of rubros.plantas) {
  if (p.error || !p.contactos?.length) continue
  const f = padron.find((x) => String(x.matricula) === String(p.matricula))
  if (!f) continue
  const cuit = String(f.cuit).replace(/\D/g, '')
  const mail = p.contactos.filter((c) => c.tipo === 'MAIL').map((c) => limpiar(c.valor)).find(esMail)
  const tel = p.contactos.filter((c) => c.tipo === 'TELEFONO').map((c) => limpiar(c.valor))[0]
  if (!mail && !tel) continue
  const ficha = `${p.razonSocial || f.name}: ${p.contactos.map((c) => `${c.tipo}: ${limpiar(c.valor)}`).join(' | ')} — faena bovina: ${p.estadoFaenaBovina || 'sin rubro bovino'}`
  const ya = porCuit.get(cuit)
  if (ya) {
    ya.mail = ya.mail || mail
    ya.tel = ya.tel || tel
    ya.fichas.push(ficha)
  } else {
    porCuit.set(cuit, { cuit, nombre: p.razonSocial || f.name, mail, tel, fichas: [ficha] })
  }
}

const api = (path, init) =>
  fetch(`${BASE}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, ...(init?.headers || {}) },
  })

const actuales = new Map(
  (await (
    await api('frigorifico_profiles?select=cuit,display_name,email_ruteo,telefono_ruteo,notas_internas,contacto_confianza')
  ).json()).map((x) => [x.cuit, x]),
)

const hoy = new Date().toISOString().slice(0, 10)
const payload = [...porCuit.values()].map((f) => {
  const a = actuales.get(f.cuit) || {}
  const nota = `APS2 SENASA (${hoy}): ${f.fichas.join(' || ')}`
  return {
    cuit: f.cuit,
    display_name: a.display_name || f.nombre,
    email_ruteo: a.email_ruteo || f.mail,
    telefono_ruteo: a.telefono_ruteo || f.tel,
    notas_internas: a.notas_internas ? `${a.notas_internas}\n${nota}` : nota,
    contacto_fuente: FUENTE,
    contacto_verificado_at: new Date().toISOString(),
    contacto_confianza: a.contacto_confianza || 'media',
  }
})

const nuevas = payload.filter((p) => !actuales.has(p.cuit)).length
if (process.argv.includes('--dry')) {
  console.log(`${payload.length} plantas (${nuevas} nuevas). Nada escrito: --dry.`)
} else {
  const res = await api('frigorifico_profiles?on_conflict=cuit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  console.log(`${payload.length} plantas cargadas, ${nuevas} nuevas.`)
}
