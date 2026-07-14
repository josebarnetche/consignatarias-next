#!/usr/bin/env node
/**
 * Scraper del ancla nacional actual de % hembras en la faena.
 *
 * Fuente: Informe MENSUAL de faena y producción de carne bovina (MAGyP/DNCCA),
 * PDF de URL FIJA que se sobrescribe cada mes (~día 10). Es el sustituto vivo del
 * dataset CKAN de % hembras, congelado en 2019. Da el % hembras ACUMULADO del año
 * (YTD), no el mes puntual (que en el PDF sólo va como gráfico sin etiquetas).
 *
 * Requiere `pdftotext` (poppler-utils) en el PATH.
 * Escribe src/lib/data/faena-hembras-nacional-actual.json (el workflow lo commitea).
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const PDF_URL =
  'https://www.magyp.gob.ar/sitio/areas/bovinos/informacion_interes/informes/_archivos//000010=Faena%20y%20Producci%C3%B3n/000008_Informe_MENSUAL_de_faena_y_produccion_de_carne_bovina.pdf'
const OUTPUT = 'src/lib/data/faena-hembras-nacional-actual.json'

const num = (s) => (s ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : null)

async function main() {
  const dir = mkdtempSync(join(tmpdir(), 'faena-'))
  const pdf = join(dir, 'informe.pdf')
  const txt = join(dir, 'informe.txt')

  // 1) Descargar el PDF.
  const res = await fetch(PDF_URL, { headers: { 'User-Agent': 'consignatarias.com.ar/1.0' } })
  if (!res.ok) throw new Error(`Descarga falló: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(pdf, buf)

  // 2) PDF → texto (con layout, clave para que las tablas queden alineadas).
  execFileSync('pdftotext', ['-layout', pdf, txt])
  const text = (await import('node:fs')).readFileSync(txt, 'utf8')

  // 3) Mes del informe (ej. "Mayo de 2026").
  const mesMatch = text.match(/([A-Za-zÁÉÍÓÚáéíóúñ]+)\s+de\s+(20\d{2})/)
  const mesInforme = mesMatch ? `${mesMatch[1]} de ${mesMatch[2]}` : null

  // 4) % Hembras acumulado: línea "% Hembras   47,5%   47,0%" (año actual · año previo).
  const hemMatch = text.match(/%\s*Hembras\s+([\d.,]+)\s*%\s+([\d.,]+)\s*%/)
  const pct = hemMatch ? num(hemMatch[1]) : null
  const pctPrevio = hemMatch ? num(hemMatch[2]) : null

  // 5) Faena total acumulada (opcional): línea "Total  4.943.845  5.478.455".
  const totMatch = text.match(/Total\s+([\d.]+)\s+([\d.]+)/)
  const faenaTotal = totMatch ? num(totMatch[1] + ',0') : null

  if (pct == null) {
    console.error('No se pudo extraer el % de hembras del PDF. ¿Cambió el formato?')
    process.exit(1)
  }

  const anio = mesMatch ? mesMatch[2] : new Date().getFullYear().toString()
  const snapshot = {
    fuente: 'Informe mensual de faena y producción de carne bovina — MAGyP/DNCCA',
    fuente_url:
      'https://www.magyp.gob.ar/sitio/areas/bovinos/informacion_interes/informes/000008_Informe_MENSUAL_de_faena_y_produccion_de_carne_bovina.pdf',
    metrica: 'porcentaje_hembras_faena_acumulado_ytd',
    descripcion: `Participación de hembras en la faena bovina NACIONAL, acumulado del año a ${mesInforme ?? 'la fecha'}.`,
    mes_informe: mesInforme,
    anio,
    pct_hembras: pct,
    pct_hembras_anio_previo: pctPrevio,
    faena_total_cabezas: faenaTotal,
    actualizado: process.env.SCRAPE_DATE || null, // el workflow lo setea con la fecha UTC
  }

  writeFileSync(OUTPUT, JSON.stringify(snapshot, null, 2) + '\n')
  console.log(`OK — ${OUTPUT}: ${mesInforme} · % hembras ${pct}% (previo ${pctPrevio}%) · faena ${faenaTotal ?? 's/d'}`)
}

main().catch((e) => {
  console.error('scrape-faena-hembras-magyp falló:', e.message)
  process.exit(1)
})
