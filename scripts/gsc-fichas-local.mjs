#!/usr/bin/env node
/**
 * gsc-fichas-local — puebla gsc_fichas desde la máquina de José (17-10-2026).
 *
 * Hace lo mismo que /api/cron/gsc-fichas, pero con el token OAuth de
 * scripts/archive/oauth-*.json (el mismo de gsc-report.mjs) en vez de la cuenta de
 * servicio: sirve para cargar la tabla HOY, antes de que exista la cuenta de
 * servicio en Vercel. Ese token vence cada 7 días (app de Google en modo testing):
 * si da invalid_grant, regenerarlo con `node scripts/gsc-auth.mjs`.
 *
 * La agregación NO se reimplementa: se importa `src/lib/gsc/fichas.ts` (y el mapa
 * de slugs) directo, con el type-stripping de Node ≥ 22.18 / 23.6. Por eso esos dos
 * módulos sólo tienen `import type` y TS borrable. Node avisa
 * MODULE_TYPELESS_PACKAGE_JSON al cargarlos: es inocuo.
 *
 *   node scripts/gsc-fichas-local.mjs --dry                 # imprime reggi + 2 fichas, no escribe
 *   node scripts/gsc-fichas-local.mjs --dry --slug=lalor    # imprime esa ficha
 *   node scripts/gsc-fichas-local.mjs                       # upsert a gsc_fichas (SUPABASE_SERVICE_ROLE_KEY)
 */
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { agregarPorFicha, crearSlugDePath, PERIODOS_GSC, ventanaGsc } from '../src/lib/gsc/fichas.ts'
import { getCanonicalSlug } from '../src/lib/data/consignataria-slugs.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const SITE = process.env.GSC_SITE || 'sc-domain:consignatarias.com.ar'
const DRY = process.argv.includes('--dry')
const SLUG_ARG = process.argv.find((a) => a.startsWith('--slug='))?.slice(7)
const ROW_LIMIT = 25000

function loadEnvLocal() {
  try {
    for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* sin .env.local */ }
}
loadEnvLocal()

const parseJson = (raw) => {
  try { return JSON.parse(raw) } catch { try { return JSON.parse(Buffer.from(raw, 'base64').toString()) } catch { return null } }
}

async function gscClient() {
  // Si ya existe la cuenta de servicio, se usa: es la misma credencial que producción.
  const sa = process.env.GSC_SERVICE_ACCOUNT_JSON && parseJson(process.env.GSC_SERVICE_ACCOUNT_JSON)
  if (sa?.client_email && sa?.private_key) {
    const jwt = new google.auth.JWT({ email: sa.client_email, key: sa.private_key.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] })
    await jwt.authorize()
    return { sc: google.searchconsole({ version: 'v1', auth: jwt }), via: 'cuenta de servicio' }
  }
  const credPath = join(HERE, 'archive/oauth-credentials.json')
  const tokPath = join(HERE, 'archive/oauth-token.json')
  if (!existsSync(credPath) || !existsSync(tokPath)) throw new Error('Sin credencial de GSC: falta GSC_SERVICE_ACCOUNT_JSON y scripts/archive/oauth-*.json')
  const cred = JSON.parse(readFileSync(credPath, 'utf8')).installed
  const o = new google.auth.OAuth2(cred.client_id, cred.client_secret, 'http://localhost:3333')
  o.setCredentials(JSON.parse(readFileSync(tokPath, 'utf8')))
  return { sc: google.searchconsole({ version: 'v1', auth: o }), via: 'token OAuth (vence cada 7 días)' }
}

async function consultarTodo(sc, dimensions, startDate, endDate) {
  const filas = []
  for (let i = 0; i < 10; i++) {
    const res = await sc.searchanalytics.query({
      siteUrl: SITE,
      requestBody: {
        startDate, endDate, dimensions, type: 'web',
        dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'contains', expression: '/consignatarias/' }] }],
        rowLimit: ROW_LIMIT, startRow: i * ROW_LIMIT,
      },
    })
    const rows = res.data.rows ?? []
    filas.push(...rows)
    if (rows.length < ROW_LIMIT) break
  }
  return filas
}

const n = (x) => Number(x).toLocaleString('es-AR')

function imprimir(f, dias, desde, hasta) {
  console.log(`\n── ${f.slug} · ${dias} días (${desde} → ${hasta})`)
  console.log(`   impresiones ${n(f.impresiones)} · clics ${n(f.clics)} · posición ${f.posicion ?? '—'}`)
  for (const c of f.consultas.slice(0, 10)) {
    console.log(`   ${String(c.impresiones).padStart(6)} impr · ${String(c.clics).padStart(3)} clics · pos ${String(c.posicion).padStart(5)}  ${c.query}`)
  }
}

async function main() {
  const { sc, via } = await gscClient()
  console.log(`GSC vía ${via} · ${SITE} · ${DRY ? 'DRY (no escribe)' : 'escribe gsc_fichas'}`)
  const slugDePath = crearSlugDePath(getCanonicalSlug)
  const db = DRY ? null : createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  if (!DRY && !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en .env.local')
  const actualizado = new Date().toISOString()

  for (const dias of PERIODOS_GSC) {
    const { desde, hasta } = ventanaGsc(dias)
    const [filasConsulta, filasPagina] = await Promise.all([
      consultarTodo(sc, ['page', 'query'], desde, hasta),
      consultarTodo(sc, ['page'], desde, hasta),
    ])
    const fichas = agregarPorFicha(filasConsulta, slugDePath, filasPagina)
    const orden = [...fichas.values()].sort((a, b) => b.impresiones - a.impresiones)
    console.log(`\n${dias} días: ${n(filasConsulta.length)} filas página×consulta · ${n(filasPagina.length)} páginas · ${fichas.size} fichas`)

    if (DRY) {
      const elegidos = SLUG_ARG
        ? [SLUG_ARG]
        : ['reggi', ...orden.map((f) => f.slug).filter((s) => s !== 'reggi').slice(0, 2)]
      for (const s of elegidos) {
        const f = fichas.get(s)
        if (f) imprimir(f, dias, desde, hasta)
        else console.log(`\n── ${s} · ${dias} días: sin impresiones en GSC`)
      }
      continue
    }

    const filas = orden.map((f) => ({
      slug: f.slug, periodo_dias: dias, desde, hasta,
      impresiones: f.impresiones, clics: f.clics, posicion: f.posicion,
      consultas: f.consultas, actualizado,
    }))
    for (let i = 0; i < filas.length; i += 500) {
      const { error } = await db.from('gsc_fichas').upsert(filas.slice(i, i + 500), { onConflict: 'slug,periodo_dias' })
      if (error) throw new Error(`upsert gsc_fichas (${dias}d): ${error.message}`)
    }
    console.log(`   ✓ ${filas.length} filas guardadas`)
  }
}

main().catch((e) => {
  const msg = e?.response?.data?.error_description || e?.message || String(e)
  console.error(`✗ ${msg}`)
  if (/invalid_grant/i.test(msg)) console.error('  El token OAuth venció: correr `node scripts/gsc-auth.mjs` y reintentar.')
  process.exit(1)
})
