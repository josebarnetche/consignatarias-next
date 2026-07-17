#!/usr/bin/env node
/**
 * Pipeline de la serie histórica RELACIÓN MAÍZ/NOVILLO (kg de maíz por kg de
 * novillo vivo). Dos pasos, con datos 100% reales:
 *
 *   1. node scripts/backfill-corn-fob.mjs      → corn-fob-historico.json (MAGyP FOB mensual)
 *   2. node scripts/build-maiz-novillo.mjs     → imprime el SQL de join (abajo)
 *      Correr ese SQL en la base (MCP execute_sql o psql) une el maíz con:
 *        - novillo INMAG mensual  (mag_inmag_history)
 *        - dólar blue venta mensual (usd_blue_history)
 *      ratio = (INMAG_ars / blue) / (maíz_usd_tn / 1000)   [= /mercado/spread]
 *   3. node scripts/build-maiz-novillo.mjs --wrap ratio.json  → maiz-novillo-historico.json
 *      (envuelve el resultado del SQL con metadata)
 *
 * Se hace por SQL y no por el cliente supabase-js porque el service key nuevo
 * (formato sb_secret_) no autentica bien contra PostgREST desde este entorno;
 * MCP/psql sí. La serie sólo se refresca ~mensual, no es un cron caliente.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const CORN = new URL('../src/lib/data/corn-fob-historico.json', import.meta.url)
const OUT = new URL('../src/lib/data/maiz-novillo-historico.json', import.meta.url)

function emitSQL() {
  const corn = JSON.parse(readFileSync(CORN, 'utf8')).serie
  const values = corn.map((p) => `('${p.mes}',${p.usd_tn})`).join(',')
  return `with corn(mes,usd_tn) as (values ${values}),
inmag as (select to_char(date,'YYYY-MM') mes, avg(inmag_value) v from mag_inmag_history where date>='2015-01-01' group by 1),
blue as (select to_char(date,'YYYY-MM') mes, avg(venta) v from usd_blue_history where date>='2015-01-01' group by 1)
select c.mes, round(((i.v/b.v)/(c.usd_tn/1000.0))::numeric,2) as ratio
from corn c join inmag i using(mes) join blue b using(mes) order by c.mes;`
}

function wrap(ratioPath) {
  const serie = JSON.parse(readFileSync(ratioPath, 'utf8')).map((r) => ({ mes: r.mes, ratio: Number(r.ratio) }))
  serie.sort((a, b) => a.mes.localeCompare(b.mes))
  writeFileSync(OUT, JSON.stringify({
    metrica: 'Relación maíz/novillo: kilos de maíz que se compran con 1 kg de novillo vivo. Serie mensual.',
    metodo: 'Novillo INMAG (ARS/kg) convertido a USD con el dólar blue (venta), dividido por el maíz FOB (USD/kg). Mismo cálculo que /mercado/spread; promedios mensuales.',
    fuentes: 'Novillo: INMAG · Mercado Agroganadero (Cañuelas). Maíz: FOB MAGyP (posición HS 1005). Dólar: blue venta.',
    umbral_referencia: 12,
    cobertura: `2015-01 a ${serie[serie.length - 1].mes}, mensual`,
    actualizado: new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10),
    serie,
  }, null, 2))
  console.log(`maiz-novillo-historico.json ← ${serie.length} meses (${serie[0].mes} → ${serie[serie.length - 1].mes})`)
}

const wrapIdx = process.argv.indexOf('--wrap')
if (wrapIdx !== -1) wrap(process.argv[wrapIdx + 1])
else console.log(emitSQL())
