// Avisa a IndexNow (Bing, Yandex, Seznam, Naver…) que cambiaron las páginas que se
// rehacen con el scrape diario. Google no usa IndexNow: para Google está el sitemap.
// La clave es pública por diseño: vive en /public/<clave>.txt y prueba que el dominio es nuestro.
// Uso: node scripts/indexnow-ping.mjs  (lo corre scrape-auctions.yml al final; nunca lo hace fallar)

const HOST = 'www.consignatarias.com.ar'
const KEY = '6321091b09e4ab0692ba4726ce24f52b'

const RUTAS = [
  '/',
  '/remates',
  '/remates/semana',
  '/remates/hoy',
  '/remates/fin-de-semana',
  '/remates/en-vivo',
  '/vr',
  '/precios',
  '/precios/hacienda-en-pie',
  '/precio-del-ternero-en-pie',
  '/mercado',
  '/mercado/inmag',
  '/mercado/arrendamiento',
  '/valuar-hacienda',
]

const body = {
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList: RUTAS.map((r) => `https://${HOST}${r}`),
}

try {
  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  })
  // 200 y 202 son éxito; 403/422 = la clave todavía no está publicada o no coincide.
  console.log(`IndexNow: ${r.status} (${body.urlList.length} URLs)`)
} catch (e) {
  console.log(`IndexNow: falló el aviso (${e})`)
}
