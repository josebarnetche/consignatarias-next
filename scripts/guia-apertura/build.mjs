#!/usr/bin/env node
/**
 * Genera el PDF maestro de la guía paga "Cómo abrir tu consignataria de hacienda".
 *
 *   node scripts/guia-apertura/build.mjs
 *
 * Sale a `private/guias/abrir-una-consignataria-v1.pdf` — FUERA de /public a
 * propósito: es el archivo que se vende, y la ruta gated
 * (/api/guias-premium/[slug]/download) lo lee de ahí y lo estampa con el email
 * del comprador. Si alguna vez termina en /public, el producto deja de existir.
 *
 * Render: Chrome del sistema vía Playwright (channel 'chrome'), así no hace
 * falta bajar un Chromium aparte. Se arman dos PDFs y se pegan con pdf-lib:
 * la tapa a sangre (sin márgenes ni pie) y el cuerpo con márgenes y numeración.
 * Es la única forma de tener las dos cosas en un solo archivo, porque los
 * márgenes de impresión son globales por documento.
 *
 * Requiere internet la primera vez (tipografías de Google). El PDF resultante
 * las lleva embebidas: se abre igual en cualquier máquina.
 */

import { writeFile, readFile, mkdir, rm } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'
import { PDFDocument } from 'pdf-lib'

import { PARTE_I, PARTE_II } from './contenido-1.mjs'
import { PARTE_III, PARTE_IV } from './contenido-2.mjs'
import { PARTE_V, ANEXOS } from './contenido-3.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const ASSETS = path.join(ROOT, 'docs/guia-apertura/assets')
const OUT_DIR = path.join(ROOT, 'private/guias')
const OUT_FILE = path.join(OUT_DIR, 'abrir-una-consignataria-v1.pdf')
const TMP = path.join(ROOT, '.guia-build')

const VERSION = '1.1'
const EDICION = '2026'
const FECHA = '20 de agosto de 2026'

/**
 * Snapshot de mercado usado en los capítulos de economía. Es DATO, no adorno:
 * lleva fecha en el texto y el lector sabe que puede rehacer la cuenta con el
 * número del día. Al regenerar una versión nueva de la guía, actualizar esto
 * desde consignatarias.com.ar/mercado y subir la fecha.
 */
const MERCADO = {
  fecha: '19 de agosto de 2026', // el snapshot de precios; la guía cierra el 20
  inmag: '$4.212 / kg vivo',
  novillos: '$4.384 / kg · 576 cab',
  vacas: '$3.129 / kg · 1.327 cab',
  terneros: '$4.633 / kg',
}

const PARTES = [PARTE_I, PARTE_II, PARTE_III, PARTE_IV, PARTE_V, ANEXOS]

/* ------------------------------------------------------------------ */
/*  Sustituciones                                                      */
/* ------------------------------------------------------------------ */

function fill(html) {
  return html
    .replaceAll('{{IMG}}', 'capturas')
    .replaceAll('{{FECHA_MERCADO}}', MERCADO.fecha)
    .replaceAll('{{FECHA}}', FECHA)
    .replaceAll('{{INMAG}}', MERCADO.inmag)
    .replaceAll('{{NOVILLOS}}', MERCADO.novillos)
    .replaceAll('{{VACAS}}', MERCADO.vacas)
    .replaceAll('{{TERNEROS}}', MERCADO.terneros)
}

/* ------------------------------------------------------------------ */
/*  Estilos                                                            */
/* ------------------------------------------------------------------ */

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">`

const CSS = `
:root{
  --tinta:#18181b; --tinta-2:#3f3f46; --tinta-3:#71717a;
  --cielo:#0369a1; --cielo-claro:#e0f2fe;
  --linea:#d4d4d8; --papel:#ffffff; --hueso:#faf9f7;
  --ambar:#b45309; --verde:#047857;
}
*{box-sizing:border-box}
body{margin:0;color:var(--tinta);font-family:'Source Serif 4',Georgia,serif;font-size:10.5pt;line-height:1.62;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
h1,h2,h3,.mono,th,figcaption{font-family:Inter,system-ui,sans-serif}
.mono,.kicker,figcaption,th,.dato-label,.url{font-family:'JetBrains Mono',ui-monospace,monospace}

/* ---------- tapa ---------- */
.tapa{width:210mm;height:297mm;position:relative;overflow:hidden;background:#09090b;color:#fafafa;page-break-after:always}
.tapa img.fondo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55;filter:grayscale(.15) contrast(1.05)}
.tapa .velo{position:absolute;inset:0;background:linear-gradient(180deg,rgba(9,9,11,.35) 0%,rgba(9,9,11,.78) 52%,#09090b 100%)}
.tapa .contenido{position:relative;padding:26mm 22mm;height:100%;display:flex;flex-direction:column}
.tapa .marca{display:flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:11pt;letter-spacing:.02em}
.tapa .marca img{width:22px;height:22px}
.tapa .marca b{font-weight:700}
.tapa .marca .punto{color:#38bdf8}
.tapa .kicker{margin-top:auto;font-size:8.5pt;letter-spacing:.24em;text-transform:uppercase;color:#38bdf8}
.tapa h1{font-size:40pt;line-height:1.04;margin:6mm 0 0;font-weight:700;letter-spacing:-.02em}
.tapa .bajada{font-size:12.5pt;line-height:1.5;color:#d4d4d8;margin-top:7mm;max-width:135mm}
.tapa .sello{margin-top:8mm;border:1px solid #38bdf8;color:#e0f2fe;padding:3.5mm 4mm;font-family:'JetBrains Mono',monospace;font-size:8pt;line-height:1.7;letter-spacing:.02em;max-width:135mm}
.tapa .sello b{color:#38bdf8;font-weight:700}
.tapa .pie{margin-top:8mm;padding-top:5mm;border-top:1px solid #3f3f46;display:flex;justify-content:space-between;
  font-family:'JetBrains Mono',monospace;font-size:8pt;color:#a1a1aa;letter-spacing:.06em;text-transform:uppercase}

/* ---------- estructura ---------- */
.pagina{page-break-after:always}
h2.capitulo{font-size:19pt;line-height:1.2;margin:0 0 2mm;font-weight:700;letter-spacing:-.01em}
.cap-kicker{font-family:'JetBrains Mono',monospace;font-size:7.5pt;letter-spacing:.2em;text-transform:uppercase;color:var(--cielo);margin-bottom:2mm}
.cap-rule{height:2px;background:var(--tinta);width:22mm;margin:0 0 6mm}
h3{font-size:11.5pt;margin:7mm 0 2mm;font-weight:700}
p{margin:0 0 3.4mm}
ul,ol{margin:0 0 4mm;padding-left:5mm}
li{margin-bottom:1.8mm}
strong{font-weight:700}
em{font-style:italic}

/* ---------- portadilla de parte ---------- */
.parte{page-break-before:always;page-break-after:always;height:245mm;display:flex;flex-direction:column;justify-content:center;
  border-top:3px solid var(--tinta);border-bottom:3px solid var(--tinta)}
.parte .num{font-family:'JetBrains Mono',monospace;font-size:9pt;letter-spacing:.28em;color:var(--cielo);text-transform:uppercase}
.parte h2{font-size:34pt;line-height:1.05;margin:4mm 0 0;font-weight:700;letter-spacing:-.02em}
.parte .bajada{font-size:12pt;color:var(--tinta-2);margin-top:6mm;max-width:120mm;line-height:1.5}
.parte ol{margin-top:12mm;padding-left:0;list-style:none;counter-reset:c}
.parte ol li{counter-increment:c;display:flex;gap:5mm;padding:2mm 0;border-top:1px solid var(--linea);font-family:Inter,sans-serif;font-size:10pt}
.parte ol li::before{content:counter(c,decimal-leading-zero);font-family:'JetBrains Mono',monospace;color:var(--cielo);font-size:8.5pt}

/* ---------- índice ---------- */
.toc h2{font-size:22pt;margin:0 0 6mm}
.toc .parte-linea{margin-top:6mm;font-family:'JetBrains Mono',monospace;font-size:8pt;letter-spacing:.2em;text-transform:uppercase;color:var(--cielo)}
.toc ol{list-style:none;padding:0;margin:2mm 0 0}
.toc ol li{display:flex;justify-content:space-between;gap:4mm;border-bottom:1px dotted var(--linea);padding:1.6mm 0;font-family:Inter,sans-serif;font-size:10pt}

/* ---------- bloques ---------- */
/* Las tablas SÍ pueden partirse entre páginas: forzarlas enteras dejaba medias
   hojas en blanco. Lo que no se parte son los bloques cortos (callout, box, figura). */
table{width:100%;border-collapse:collapse;margin:0 0 5mm;font-size:9pt}
thead{display:table-header-group}
tr{page-break-inside:avoid}
th{background:var(--tinta);color:#fff;text-align:left;padding:2mm 2.5mm;font-size:7.5pt;letter-spacing:.08em;text-transform:uppercase;font-weight:700}
td{border-bottom:1px solid var(--linea);padding:2mm 2.5mm;vertical-align:top;line-height:1.45}
tbody tr:nth-child(even) td{background:var(--hueso)}
.blank-cell{height:8mm;background:#fff !important}

.callout{border-left:3px solid var(--cielo);background:var(--cielo-claro);padding:3.5mm 4mm;margin:0 0 5mm;page-break-inside:avoid}
.callout-title{font-family:Inter,sans-serif;font-weight:700;font-size:9.5pt;margin-bottom:1.5mm}
.callout p{margin:0;font-size:9.5pt}
.box{border:1px solid var(--linea);background:var(--hueso);padding:3.5mm 4mm;margin:0 0 5mm;page-break-inside:avoid}
.box-title{font-family:'JetBrains Mono',monospace;font-size:7.5pt;letter-spacing:.16em;text-transform:uppercase;color:var(--tinta-3);margin-bottom:2mm}
.box p{margin:0;font-size:9.5pt}
.alerta{border-left:3px solid var(--ambar);background:#fffbeb;padding:3.5mm 4mm;margin:0 0 5mm;page-break-inside:avoid}
.alerta-title{font-family:Inter,sans-serif;font-weight:700;font-size:9.5pt;margin-bottom:1.5mm;color:var(--ambar)}
.alerta p{margin:0;font-size:9.5pt}
.regla{font-family:Inter,sans-serif;font-weight:700;font-size:13pt;line-height:1.35;border-top:2px solid var(--tinta);border-bottom:2px solid var(--tinta);padding:4mm 0;margin:0 0 5mm;text-align:center}
.formula{font-family:'JetBrains Mono',monospace;font-size:9.5pt;background:var(--tinta);color:#fafafa;padding:3mm 4mm;margin:0 0 5mm;text-align:center}

.datos{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--linea);margin:0 0 5mm}
.dato{padding:2.5mm 3mm;border-right:1px solid var(--linea);border-bottom:1px solid var(--linea);display:flex;flex-direction:column;gap:1mm}
.dato-label{font-size:7pt;letter-spacing:.1em;text-transform:uppercase;color:var(--tinta-3)}
.dato-valor{font-family:Inter,sans-serif;font-size:12pt;font-weight:700}

.secuencia{margin:0 0 5mm}
.paso{display:flex;gap:3mm;align-items:baseline;border-bottom:1px solid var(--linea);padding:2mm 0;font-size:9.5pt}
.paso-n{font-family:'JetBrains Mono',monospace;color:var(--cielo);font-weight:700;font-size:8.5pt}

figure.captura{margin:0 0 5mm;page-break-inside:avoid}
figure.captura img{width:100%;border:1px solid var(--linea);display:block}
figcaption{font-size:7.5pt;color:var(--tinta-3);line-height:1.5;margin-top:1.8mm;padding-left:2mm;border-left:2px solid var(--linea)}

.frases-genericas{display:flex;flex-direction:column;gap:1.5mm;margin:0 0 5mm}
.frases-genericas span{font-family:Inter,sans-serif;font-size:11pt;color:var(--tinta-3);font-style:italic;border-left:2px solid var(--linea);padding-left:3mm}

.plantilla,.plantilla-bloque{border:1px solid var(--linea);padding:4mm;margin:0 0 5mm;page-break-inside:avoid}
.plantilla{font-family:Inter,sans-serif;font-size:11pt;text-align:center}
.plantilla-bloque p{font-size:9.5pt;margin-bottom:3mm}
.blank{display:inline-block;min-width:32mm;border-bottom:1px solid var(--tinta-3);height:4mm}
.blank.long{min-width:95mm}

.ejemplo{border:1px solid var(--tinta);padding:4mm;margin:0 0 5mm;background:var(--hueso)}
.ejemplo p{font-size:9.5pt;margin-bottom:2.2mm}

.glosario dt{font-family:Inter,sans-serif;font-weight:700;font-size:9.5pt;margin-top:3mm}
.glosario dd{margin:0.5mm 0 0;font-size:9.5pt;color:var(--tinta-2)}
.fuentes li{font-size:9.5pt}
.url{font-size:8.5pt}

.cierre{border-top:2px solid var(--tinta);margin-top:8mm;padding-top:4mm}
.cierre p{font-size:9.5pt}
.cierre-contacto{font-family:'JetBrains Mono',monospace;font-size:8.5pt;color:var(--tinta-3)}
`

/* ------------------------------------------------------------------ */
/*  HTML                                                               */
/* ------------------------------------------------------------------ */

function tapaHtml() {
  return `<section class="tapa">
  <img class="fondo" src="hero-pampa.jpg" alt="">
  <div class="velo"></div>
  <div class="contenido">
    <div class="marca"><img src="isotipo-cielo.png" alt=""><span><b>consignatarias</b><span class="punto">.</span>com</span></div>
    <div class="kicker">Guía operativa · Argentina · Edición ${EDICION}</div>
    <h1>Cómo abrir tu consignataria de hacienda</h1>
    <p class="bajada">El paso a paso completo: matrícula, SIOCAL, ARCA, SENASA, la plata que hace falta y el plan para conseguir los primeros consignantes. Más el módulo de posicionamiento para la firma que ya opera.</p>
    <div class="sello">Edición ${EDICION} · actualizada al ${FECHA}<br><b>El RUCA ya no rige para ganados y carnes: el trámite va por SIOCAL.</b></div>
    <div class="pie"><span>consignatarias.com.ar · v${VERSION}</span><span>Memola Medios SAS</span></div>
  </div>
</section>`
}

function tocHtml() {
  let n = 0
  const bloques = PARTES.map((p) => {
    const items = p.capitulos
      .map((c) => {
        n += 1
        return `<li><span>${String(n).padStart(2, '0')} · ${c.titulo}</span></li>`
      })
      .join('')
    return `<div class="parte-linea">Parte ${p.numero} — ${p.titulo}</div><ol>${items}</ol>`
  }).join('')

  return `<section class="pagina toc">
  <h2>Índice</h2>
  ${bloques}
</section>`
}

function parteHtml(parte, desde) {
  const items = parte.capitulos.map((c) => `<li>${c.titulo}</li>`).join('')
  return `<section class="parte">
  <div class="num">Parte ${parte.numero}</div>
  <h2>${parte.titulo}</h2>
  <p class="bajada">${parte.bajada}</p>
  <ol style="counter-reset:c ${desde - 1}">${items}</ol>
</section>`
}

function capituloHtml(cap, numero, parte) {
  return `<section class="pagina">
  <div class="cap-kicker">Parte ${parte.numero} · ${parte.titulo} — Capítulo ${numero}</div>
  <h2 class="capitulo">${cap.titulo}</h2>
  <div class="cap-rule"></div>
  ${fill(cap.html)}
</section>`
}

function cuerpoHtml() {
  let n = 0
  const partes = PARTES.map((parte) => {
    const desde = n + 1
    const caps = parte.capitulos
      .map((c) => {
        n += 1
        return capituloHtml(c, n, parte)
      })
      .join('\n')
    return parteHtml(parte, desde) + '\n' + caps
  }).join('\n')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">${FONTS}<style>${CSS}</style></head>
<body>${tocHtml()}${partes}</body></html>`
}

function tapaDoc() {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">${FONTS}<style>${CSS}\nbody{margin:0}</style></head>
<body>${tapaHtml()}</body></html>`
}

/* ------------------------------------------------------------------ */
/*  Render                                                             */
/* ------------------------------------------------------------------ */

const PIE = `<div style="width:100%;font-family:'JetBrains Mono',monospace;font-size:6.5pt;color:#71717a;padding:0 16mm;display:flex;justify-content:space-between">
  <span>Cómo abrir tu consignataria de hacienda · consignatarias.com.ar</span>
  <span class="pageNumber"></span>
</div>`

async function main() {
  await mkdir(TMP, { recursive: true })
  await mkdir(OUT_DIR, { recursive: true })

  // Los assets van al lado del HTML para que las rutas relativas resuelvan
  // desde file:// sin depender del cwd.
  await copiarAssets()

  await writeFile(path.join(TMP, 'tapa.html'), tapaDoc())
  await writeFile(path.join(TMP, 'cuerpo.html'), cuerpoHtml())

  const browser = await chromium.launch({ channel: 'chrome' })
  const page = await browser.newPage()

  await page.goto(`file://${path.join(TMP, 'tapa.html')}`, { waitUntil: 'networkidle' })
  const tapa = await page.pdf({ format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } })

  await page.goto(`file://${path.join(TMP, 'cuerpo.html')}`, { waitUntil: 'networkidle' })
  const cuerpo = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '16mm', right: '16mm', bottom: '16mm', left: '16mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: PIE,
  })

  await browser.close()

  // Pegado: tapa a sangre + cuerpo numerado.
  const out = await PDFDocument.create()
  for (const buf of [tapa, cuerpo]) {
    const doc = await PDFDocument.load(buf)
    const paginas = await out.copyPages(doc, doc.getPageIndices())
    paginas.forEach((p) => out.addPage(p))
  }
  out.setTitle('Cómo abrir tu consignataria de hacienda')
  out.setAuthor('consignatarias.com.ar — Memola Medios SAS')
  out.setSubject('Guía operativa para abrir y posicionar una consignataria de hacienda en Argentina')

  await writeFile(OUT_FILE, await out.save())
  await rm(TMP, { recursive: true, force: true })

  const total = out.getPageCount()
  console.log(`✓ ${OUT_FILE}`)
  console.log(`  ${total} páginas · versión ${VERSION} · datos de mercado al ${MERCADO.fecha}`)
  console.log(`  Actualizá "pages" en src/lib/guias-premium.ts a ${total}.`)
}

async function copiarAssets() {
  const destino = path.join(TMP, 'capturas')
  await mkdir(destino, { recursive: true })
  const capturas = ['01-siocal-home.jpg', '02-siocal-padron.jpg', '03-arca-clave-fiscal.jpg', '04-colegio-martilleros-requisitos.jpg']
  for (const f of capturas) {
    await writeFile(path.join(destino, f), await readFile(path.join(ASSETS, 'capturas', f)))
  }
  await writeFile(path.join(TMP, 'hero-pampa.jpg'), await readFile(path.join(ROOT, 'public/marca/hero-pampa.jpg')))
  await writeFile(path.join(TMP, 'isotipo-cielo.png'), await readFile(path.join(ROOT, 'public/marca/email/isotipo-cielo.png')))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
