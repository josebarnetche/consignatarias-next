/**
 * Alerta de frescura de la Banda Consignatarias (vr_bandas_history).
 *
 * El 13-nov-2026 la serie se congeló una semana con todos los workflows en verde: el
 * pipeline de lotes encolaba el día equivocado y `compute-vr-bandas` recalculaba la
 * misma banda vieja sin fallar. Esta comprobación mira el DATO, no el workflow: si el
 * último punto de vr_bandas_history tiene más de MAX_DIAS_HABILES días hábiles (lun-vie)
 * de atraso respecto de hoy en Buenos Aires, sale con código 1 y una anotación ::error::
 * para que GitHub avise por mail.
 *
 * Sin dependencias (fetch a PostgREST) para que corra sin `pnpm install`.
 * Env: SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      MAX_DIAS_HABILES (default 2). Solo lectura.
 * La regla de días hábiles es la misma que diasHabilesEntre() de src/lib/mag-lots-rueda.ts.
 */
const URL_BASE = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const MAX = Number(process.env.MAX_DIAS_HABILES || 2)

if (!URL_BASE || !KEY) {
  console.log('::error::Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY para revisar la frescura de la banda.')
  process.exit(1)
}

const restarDias = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10)
}
const diaDeSemana = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}
function diasHabilesEntre(desde, hasta) {
  let n = 0
  let d = desde
  while (d < hasta) {
    d = restarDias(d, -1)
    const wd = diaDeSemana(d)
    if (wd !== 0 && wd !== 6) n++
  }
  return n
}

const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
const res = await fetch(`${URL_BASE}/rest/v1/vr_bandas_history?select=date&order=date.desc&limit=1`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
})
if (!res.ok) {
  console.log(`::error::No se pudo leer vr_bandas_history (HTTP ${res.status}).`)
  process.exit(1)
}
const [ultimo] = await res.json()
if (!ultimo?.date) {
  console.log('::error::vr_bandas_history está vacía.')
  process.exit(1)
}
const atraso = diasHabilesEntre(ultimo.date, hoy)
console.log(`Banda: último punto ${ultimo.date} · hoy (BA) ${hoy} · ${atraso} día(s) hábil(es) de atraso (máx. ${MAX}).`)
if (atraso > MAX) {
  console.log(
    `::error::La Banda Consignatarias está congelada en ${ultimo.date} (${atraso} días hábiles). ` +
      'Revisar mag_consignataria_sales_lots y la cola mag_scrape_queue; ponerse al día con ' +
      '`gh workflow run mag-lots-pipeline.yml -f ventana=14`.',
  )
  process.exit(1)
}
console.log('✓ Banda fresca.')
