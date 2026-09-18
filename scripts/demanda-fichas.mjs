#!/usr/bin/env node
/**
 * Demanda por ficha: cuánta gente miró cada planta y cuántas consultas dejó.
 *
 * POR QUÉ EXISTE
 * Al 17-sep-2026, 1.843 personas distintas miraron 696 fichas de frigoríficos en 30 días y
 * 657 miraron 103 fichas de consignatarias. En toda la historia hubo **un** perfil
 * reclamado. No es un problema de tráfico: es que la firma no se entera de que existe esa
 * demanda, y nosotros no tenemos con qué probárselo.
 *
 * Este script convierte la medición en un número por CUIT/slug que después la ficha puede
 * mostrar y el equipo comercial puede citar en una llamada: "el mes pasado N personas
 * miraron su planta y M dejaron una consulta que no pudimos derivarle".
 *
 * POR QUÉ ESCRIBE UN JSON Y NO CONSULTA LA BASE EN EL BUILD
 * Porque `SUPABASE_SERVICE_ROLE_KEY` está sólo en el entorno Production de Vercel: toda
 * página estática que consulte la base durante el build funciona en producción y voltea el
 * build de cualquier rama (fue la causa del 100% de los deploys fallados hasta el commit
 * 8d106bbf). El patrón sano del repo es el mismo de `remates.json`: un workflow consulta,
 * commitea el JSON, y el sitio lee el archivo.
 *
 *   node scripts/demanda-fichas.mjs            # escribe src/lib/data/demanda-fichas.json
 *   node scripts/demanda-fichas.mjs --dry      # sólo imprime el resumen
 *
 * PRIVACIDAD: se publican AGREGADOS (cuántas visitas, cuántas consultas). Nunca el nombre,
 * teléfono ni mail de quien consultó — eso es del dueño del lead y no sale del panel.
 */
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const OUT = join(ROOT, 'src/lib/data/demanda-fichas.json')
const DIAS = 30
/** Piso de visitas para publicar el número: con 3 visitas el dato no dice nada y expone ruido. */
const MINIMO_PUBLICABLE = 8

function loadEnvLocal() {
  try {
    for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    /* en CI no hay .env.local */
  }
}

async function main() {
  loadEnvLocal()
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('ERROR: faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const db = createClient(url, key, { auth: { persistSession: false } })
  const desde = new Date(Date.now() - DIAS * 864e5).toISOString()

  // 1. Visitas por ficha. Se cuentan SESIONES distintas, no eventos: tres scrolls de la
  //    misma persona no son tres interesados.
  const vistas = new Map() // path -> Set(session)
  for (let pagina = 0; ; pagina++) {
    const { data, error } = await db
      .from('value_events')
      .select('path, session_id')
      .gte('created_at', desde)
      .or('path.like./frigorificos/%,path.like./consignatarias/%')
      .range(pagina * 1000, pagina * 1000 + 999)
    if (error) throw new Error(`value_events: ${error.message}`)
    if (!data?.length) break
    for (const r of data) {
      if (!r.path || !r.session_id) continue
      // Sólo fichas individuales: /frigorificos/<cuit> y /consignatarias/<slug>.
      if (!/^\/(frigorificos\/\d{11}|consignatarias\/[a-z0-9-]+)$/.test(r.path)) continue
      if (!vistas.has(r.path)) vistas.set(r.path, new Set())
      vistas.get(r.path).add(r.session_id)
    }
    if (data.length < 1000) break
  }

  // 2. Consultas dejadas en la ficha (el lead sigue siendo nuestro: acá sólo se cuenta).
  const consultas = new Map()
  const { data: leads, error: eLeads } = await db
    .from('producer_leads')
    .select('source, created_at')
    .gte('created_at', desde)
  if (eLeads) throw new Error(`producer_leads: ${eLeads.message}`)
  for (const l of leads || []) {
    const m = /^frigorifico:(\d{11})/.exec(l.source || '')
    if (m) {
      const p = `/frigorificos/${m[1]}`
      consultas.set(p, (consultas.get(p) || 0) + 1)
    }
  }

  // Slugs canónicos de firma, para descartar las páginas de PROVINCIA.
  // `/consignatarias/<slug>` sirve dos cosas distintas: la ficha de una firma y el listado
  // provincial (`/consignatarias/buenos-aires` = "64 activas con remates"). La expresión
  // de arriba no las distingue, así que la primera versión de este JSON publicó
  // "buenos-aires" como si fuera una consignataria con 23 visitas.
  const { data: firmas, error: eFirmas } = await db.from('consignatarias').select('canonical_slug')
  if (eFirmas) throw new Error(`consignatarias: ${eFirmas.message}`)
  const slugsFirma = new Set((firmas || []).map((f) => f.canonical_slug).filter(Boolean))

  const fichas = {}
  for (const [path, sesiones] of vistas) {
    const visitas = sesiones.size
    if (visitas < MINIMO_PUBLICABLE) continue
    const clave = path.replace(/^\/(frigorificos|consignatarias)\//, '')
    // Una página de provincia no es una ficha: no tiene dueño a quien mostrarle su demanda.
    if (path.startsWith('/consignatarias') && !slugsFirma.has(clave)) continue
    fichas[clave] = {
      tipo: path.startsWith('/frigorificos') ? 'frigorifico' : 'consignataria',
      visitas,
      consultas: consultas.get(path) || 0,
    }
  }

  const salida = {
    generado: new Date().toISOString(),
    ventanaDias: DIAS,
    minimoPublicable: MINIMO_PUBLICABLE,
    totales: {
      fichasConDato: Object.keys(fichas).length,
      fichasVistas: vistas.size,
      visitas: [...vistas.values()].reduce((s, v) => s + v.size, 0),
      consultas: [...consultas.values()].reduce((s, v) => s + v, 0),
    },
    fichas,
  }

  console.error(
    `fichas vistas: ${salida.totales.fichasVistas} · con dato publicable (>=${MINIMO_PUBLICABLE}): ${salida.totales.fichasConDato} · visitas: ${salida.totales.visitas} · consultas: ${salida.totales.consultas}`,
  )
  const top = Object.entries(fichas)
    .sort((a, b) => b[1].visitas - a[1].visitas)
    .slice(0, 10)
  for (const [k, v] of top) console.error(`  ${String(v.visitas).padStart(4)} visitas · ${v.consultas} consultas · ${v.tipo} ${k}`)

  if (process.argv.includes('--dry')) return
  writeFileSync(OUT, JSON.stringify(salida, null, 2) + '\n')
  console.error(`→ ${OUT}`)
}

main().catch((e) => {
  console.error('ERROR:', e?.message || e)
  process.exit(1)
})
