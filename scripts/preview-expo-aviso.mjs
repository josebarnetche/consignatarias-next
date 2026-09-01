/**
 * Renderiza el aviso de la Expo de Mercedes a un archivo HTML, para mirarlo antes
 * de enviarlo. No toca Resend ni la base: sólo arma el cuerpo con el cronograma real.
 *
 *   node scripts/preview-expo-aviso.mjs [salida.html]
 */
import { writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const salida = process.argv[2] ?? 'preview-aviso-expo.html'

// Se compila al vuelo con tsx porque el módulo de email es TypeScript y sólo
// necesitamos el builder, que es una función pura.
const script = `
import { buildExpoMercedesAvisoHtml } from './src/lib/email'
import { REMATES_EXPO, casasConfirmadas } from './src/lib/data/expo-mercedes'

const html = buildExpoMercedesAvisoHtml({
  to: 'ejemplo@consignatarias.com.ar',
  casas: casasConfirmadas().length,
  url: 'https://www.consignatarias.com.ar/remates/expo-rural-mercedes',
  remates: REMATES_EXPO.map((r) => ({
    fecha: r.fecha,
    firma: r.firma,
    cabania: r.cabania,
    hora: r.hora,
    modalidad: r.modalidad === 'fisico' ? 'en pista' : r.modalidad,
    categoria: r.categoria,
  })),
})
process.stdout.write(html)
`

writeFileSync('.preview-tmp.ts', script)
try {
  const html = execSync('npx tsx .preview-tmp.ts', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
  writeFileSync(salida, `<!doctype html><html><head><meta charset="utf-8"><title>Aviso Expo Mercedes</title></head>${html}</html>`)
  console.log(`Escrito: ${salida} (${html.length} bytes de cuerpo)`)
} finally {
  execSync(process.platform === 'win32' ? 'del .preview-tmp.ts' : 'rm -f .preview-tmp.ts', { stdio: 'ignore' })
}
