// Regenera `src/lib/data/frigorificos-summary.json` desde `frigorificos.json`.
//
// Por qué existe: el resumen se escribió a mano en febrero de 2026 con 364 plantas y
// ahí se quedó, mientras el directorio crecía a 1.115. La home leía el resumen y el
// directorio la fuente viva, así que el mismo sitio declaraba 364 y 1.115 al mismo
// tiempo. Un archivo derivado que nadie deriva es un dato viejo con cara de dato.
//
//   node scripts/build-frigorificos-summary.mjs [--check]
//
// `--check` no escribe: sale 1 si el resumen quedó desactualizado (para CI/cron).

import { readFileSync, writeFileSync } from 'node:fs'

const ORIGEN = 'src/lib/data/frigorificos.json'
const DESTINO = 'src/lib/data/frigorificos-summary.json'

const frigorificos = JSON.parse(readFileSync(ORIGEN, 'utf-8'))

const habilitados = frigorificos.filter((f) => f.senasaActive === true)

const byProvince = {}
const byStage = {}
for (const f of frigorificos) {
  const prov = (f.province || 'SIN PROVINCIA').toUpperCase()
  byProvince[prov] = (byProvince[prov] || 0) + 1
  const stage = String(f.stage ?? '?')
  byStage[stage] = (byStage[stage] || 0) + 1
}

const topProvinces = Object.entries(byProvince)
  .map(([province, count]) => ({
    province,
    count,
    pct: Number(((count / frigorificos.length) * 100).toFixed(1)),
  }))
  .sort((a, b) => b.count - a.count)

const resumen = {
  // `total` es el directorio entero (incluye históricos sin habilitación vigente).
  // `habilitados` es el número honesto para decir "plantas SENASA".
  total: frigorificos.length,
  habilitados: habilitados.length,
  provincias: Object.keys(byProvince).length,
  generadoEl: new Date().toISOString().slice(0, 10),
  byProvince: Object.fromEntries(Object.entries(byProvince).sort((a, b) => b[1] - a[1])),
  byStage,
  topProvinces,
}

const nuevo = JSON.stringify(resumen, null, 2) + '\n'
const viejo = (() => {
  try {
    return readFileSync(DESTINO, 'utf-8')
  } catch {
    return ''
  }
})()

const sinFecha = (txt) => txt.replace(/"generadoEl": "[^"]*",?\n/, '')

if (process.argv.includes('--check')) {
  if (sinFecha(viejo) !== sinFecha(nuevo)) {
    console.error(`${DESTINO} está desactualizado: corré node scripts/build-frigorificos-summary.mjs`)
    process.exit(1)
  }
  console.log(`${DESTINO} al día (${resumen.habilitados} habilitados de ${resumen.total}).`)
} else {
  writeFileSync(DESTINO, nuevo)
  console.log(
    `${DESTINO}: ${resumen.total} indexados · ${resumen.habilitados} habilitados · ${resumen.provincias} provincias.`,
  )
}
