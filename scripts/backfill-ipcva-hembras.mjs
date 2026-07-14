#!/usr/bin/env node
/**
 * Backfill ÚNICO del % hembras nacional 2019-2025, parseando los informes
 * trimestrales de faena del IPCVA (PDFs). Puentea el hueco entre el histórico
 * mensual de MAGyP (que corta en ago-2019) y el ancla mensual actual.
 *
 * Es la MISMA métrica (faena de hembras nacional), a granularidad trimestral →
 * se une de forma continua a la serie histórica.
 *
 * Corrida única (no es cron). Requiere pdftotext. Escribe
 * src/lib/data/faena-hembras-nacional-trimestral.json.
 * URLs del listado ipcva.agrositio.com/vertodas.php?se=83 (faena y producción).
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const QEND = { 1: '03', 2: '06', 3: '09', 4: '12' } // mes de cierre del trimestre

// trimestre(1-4), año, URL. (1T2020/2T2020 sólo hay .docx → omitidos; 1T/2T/4T2025 no existen.)
const FUENTES = [
  [1, 2019, 'https://ipcva.agrositio.com/documentos/1992_1556283350_informedefaenayproduccin1trimestre2019.pdf'],
  [2, 2019, 'https://ipcva.agrositio.com/documentos/2036_1565364358_informedefaenayproduccin2trimestre2019.pdf'],
  [3, 2019, 'https://ipcva.agrositio.com/documentos/2060_1572291633_informedefaenayproduccin3trimestre2019.pdf'],
  [4, 2019, 'https://ipcva.agrositio.com/documentos/2087_1580302414_informedefaenayproduccin4trimestre2019.pdf'],
  [3, 2020, 'https://ipcva.agrositio.com/documentos/2233_1603462888_informedefaenayproduccin3trimestre2020.pdf'],
  [4, 2020, 'https://ipcva.agrositio.com/documentos/2289_1610722924_informedefaenayproduccin4trimestre2020.pdf'],
  [1, 2021, 'https://ipcva.agrositio.com/documentos/2388_1628272959_informedefaenayproduccin1trimestre2021.pdf'],
  [2, 2021, 'https://ipcva.agrositio.com/documentos/2389_1628273025_informedefaenayproduccin2trimestre2021.pdf'],
  [3, 2021, 'https://ipcva.agrositio.com/documentos/2425_1634929801_informedefaenayproduccin3trimestre2021.pdf'],
  [4, 2021, 'https://ipcva.agrositio.com/documentos/2477_1643205163_informedefaenayproduccin4trimestre2021.pdf'],
  [1, 2022, 'https://ipcva.agrositio.com/documentos/2516_1651590717_informedefaenayproduccin1trimestre2022.pdf'],
  [2, 2022, 'https://ipcva.agrositio.com/documentos/2556_1658417734_informedefaenayproduccin2trimestre2022.pdf'],
  [3, 2022, 'https://ipcva.agrositio.com/documentos/2656_1675957558_informedefaenayproduccin3t22.pdf'],
  [4, 2022, 'https://ipcva.agrositio.com/documentos/2654_1675953717_informedefaenayproduccin4t22.pdf'],
  [1, 2023, 'https://ipcva.agrositio.com/documentos/2688_1684332822_informedefaenayproduccin1t2023.pdf'],
  [2, 2023, 'https://ipcva.agrositio.com/documentos/2763_1698346238_informedefaenayproduccin2t2023.pdf'],
  [3, 2023, 'https://ipcva.agrositio.com/documentos/2764_1698346355_informedefaenayproduccin3t2023.pdf'],
  [4, 2023, 'https://ipcva.agrositio.com/documentos/2789_1706126110_informedefaenayproduccin4t2023.pdf'],
  [1, 2024, 'https://ipcva.agrositio.com/documentos/2825_1722613961_resumenfaenayproduccinipcva1t2024.pdf'],
  [2, 2024, 'https://ipcva.agrositio.com/documentos/2868_1722613659_faenayproduccinipcva2t2024resumen.pdf'],
  [3, 2024, 'https://ipcva.agrositio.com/documentos/2936_1745682479_informedefaenayproduccin3t2024.pdf'],
  [4, 2024, 'https://ipcva.agrositio.com/documentos/2937_1745682726_informedefaenayproduccin4t2024.pdf'],
  [3, 2025, 'https://ipcva.agrositio.com/documentos/2946_1764352982_informedefaenayproduccin3t2025.pdf'],
]

function extraerPct(text) {
  // Prosa: "La faena de hembras se ubicó ... en el 46.9% / 48,85% de la faena"
  // (el % puede tener 1 o 2 decimales, y el texto puede envolverse en varias líneas).
  let m = text.match(/faena de hembras se ubic[oó][^%]*?(\d{1,2}[.,]\d{1,2})\s*%/i)
  if (m) return parseFloat(m[1].replace(',', '.'))
  // Fallbacks tolerantes a variaciones de redacción.
  m = text.match(/hembras\s+represent[oó][^%]*?(\d{1,2}[.,]\d{1,2})\s*%/i)
  if (m) return parseFloat(m[1].replace(',', '.'))
  m = text.match(/(\d{1,2}[.,]\d{1,2})\s*%\s+de la faena/i)
  if (m) return parseFloat(m[1].replace(',', '.'))
  return null
}

async function main() {
  const dir = mkdtempSync(join(tmpdir(), 'ipcva-'))
  const serie = []
  const fallos = []
  for (const [q, year, url] of FUENTES) {
    const key = `${year}-Q${q}`
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'consignatarias.com.ar/1.0' } })
      if (!res.ok) { fallos.push(`${key}: HTTP ${res.status}`); continue }
      const pdf = join(dir, `${key}.pdf`)
      writeFileSync(pdf, Buffer.from(await res.arrayBuffer()))
      const txt = join(dir, `${key}.txt`)
      execFileSync('pdftotext', ['-layout', pdf, txt])
      const pct = extraerPct(readFileSync(txt, 'utf8'))
      if (pct == null) { fallos.push(`${key}: sin % hembras`); continue }
      serie.push({ mes: `${year}-${QEND[q]}`, trimestre: key, pct })
      console.log(`${key} → ${pct}%`)
    } catch (e) {
      fallos.push(`${key}: ${e.message}`)
    }
  }
  serie.sort((a, b) => a.mes.localeCompare(b.mes))

  const snapshot = {
    fuente: 'Informes trimestrales de faena y producción de carne vacuna — IPCVA',
    fuente_url: 'https://ipcva.agrositio.com/vertodas.php?se=83',
    metrica: 'porcentaje_hembras_faena_trimestral',
    descripcion: 'Participación de hembras en la faena bovina NACIONAL, trimestral. Puentea el hueco 2019-2025 del histórico mensual de MAGyP (misma métrica).',
    nota: 'Faltan 1T2020 y 2T2020 (IPCVA los publicó sólo en .docx) y 1T/2T/4T2025 (no publicados). Punto ubicado en el mes de cierre del trimestre.',
    serie,
  }
  writeFileSync('src/lib/data/faena-hembras-nacional-trimestral.json', JSON.stringify(snapshot, null, 2) + '\n')
  console.log(`\nOK — ${serie.length} trimestres escritos. Fallos: ${fallos.length ? fallos.join(' | ') : 'ninguno'}`)
}

main().catch((e) => { console.error('backfill falló:', e.message); process.exit(1) })
