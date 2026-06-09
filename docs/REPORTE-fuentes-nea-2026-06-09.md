# Reporte — Swarm de fuentes NEA/Corrientes + en-vivo para consignatarias.com.ar

## 1. Resumen

El scraper de `consignatarias.com.ar` venía **sesgado al Pampa/Litoral** (Buenos Aires, Santa Fe sur, Córdoba): las consignatarias grandes y los agregadores que ya tenía cargados resuelven bien la zona núcleo pero dejaban a **Corrientes y al resto del NEA** prácticamente sin cobertura. Este swarm relevó 9 fuentes con foco regional y enchufó las viables al pipeline existente vía un módulo aislado (`nea.mjs`).

Resultado del self-test (corrida real, hoy 2026-06-07):

- **84 remates NEA nuevos** entrando al merge.
- Desglose por provincia: **ENTRE RIOS 61, CORRIENTES 13, SANTA FE 5, BUENOS AIRES 3, CHACO 1, FORMOSA 1**.
- **13 de Corrientes** + **68 del resto del NEA** (ER + SF + Chaco + Formosa, excluyendo BA) — exactamente el hueco que el scraper no cubría.
- **1 remate con stream YouTube en vivo** capturado (el de Ildarraz desde Chajarí, 12/6).
- Las 5 fuentes implementadas degradan limpio a `[]` ante error; ninguna inventa datos.

El grueso del volumen NEA lo aporta **ClicRural** (63, agregador multi-firma) — y se confirmó que sus 61 de Entre Ríos son reales (General Ramírez, Gualeguay, Villa Elisa, etc.), un dato que el recon original solo había muestreado en Corrientes.

## 2. Fuentes candidatas

| Fuente | Viable | Qué aporta | Estado |
|---|---|---|---|
| **ClicRural (cartelera)** | Sí | Agregador multi-firma server-rendered (~205 remates país), filtrable a provincias NEA (25/22/27/32/26). Aporta el grueso: 63 remates. | **Implementada** (`scrapeClicRural`) — filtra a NEA, descarta cards `PRUEBA`. |
| **Rosgan / RosganNet** | Sí | JSON API público (`remates_api_qry.xml?_limit=5000`), 456 remates históricos+futuros, incluye `url_streaming`. Complemento de cabaña/genética + algunos streams. | **Implementada** (`scrapeRosgan`) — 16 remates, filtra futuros + provincia por sufijo, rescata YT por venue NEA. |
| **HRE (Rodríguez Ega)** | Sí | JSON API limpia (almoby/Django REST), fuerte en Corrientes+Entre Ríos, `url_streaming` por remate. | **Implementada** (`scrapeHRE`) — 1 remate; cachea `/provincias`, resuelve UTC→ART −3h. |
| **Reggi & Cía** | Sí | HTML server-rendered (white-label rural.com.uy), 4 próximos todos en Corrientes. | **Implementada** (`scrapeReggi`) — 4 remates Corrientes. |
| **Aguerre SRL** | Sí | Tribe REST (`/wp-json/tribe/events/v1/events`), JSON limpio. Carga los eventos tarde (sobre la fecha). | **Implementada** (`scrapeAguerre`) — 0 hoy (degradó a `[]` correctamente; endpoint OK, sin eventos futuros cargados). |
| **Arzuaga y Cía.** | Sí (técnicamente) | Una firma, un remate televisado por vez, con link YouTube live embebido. Wix JS-rendered. | **Descartada (TODO)** — requiere headless que el runtime de `fetch` no soporta; su remate ya aparece vía ClicRural cuando está cargado. No se inventan datos. |
| **Gananor Pujol** | Sí | Vive en ClicRural (empresa id 1238). Fuerte en Corrientes/Las Nacionales/Goya, estacional. | **Cubierta indirectamente** por `scrapeClicRural` (mismo backend; filtro por organiza) — no se hizo scraper dedicado. |
| **Negocios de Hacienda** | **No** | API clicrural excelente, pero las 154 subastas son **100% Uruguay** (Escritorio Dutra). El `.com.ar` es solo branding. | **Descartada** — cobertura geográfica nula para NEA (no por barrera técnica). |
| **CCPP** | **No** | Sitio caído/parkeado (BAEHOST), URL 404 hace +6 años. Histórico 2019 era 100% Buenos Aires. | **Descartada** — sin endpoint vivo y, aun reviviendo, fuera del foco NEA. |

## 3. Gap en-vivo (streaming)

El hueco de en-vivo era doble: pocas fuentes exponen una URL de stream **por remate** (varias solo dan el canal institucional de YouTube, que no sirve para linkear el evento).

Quién sí trae `youtubeUrl` utilizable:

- **HRE** — `url_streaming` por remate (se completa cerca de la fecha; el próximo aún sin cargar).
- **Rosgan** — `url_streaming` poblado en 333/456 registros; normalizado a `youtube.com/live|watch|embed`.
- **Aguerre** — link de stream parseado por regex desde la `description` (cuando existe).
- **Arzuaga** — tiene el live embebido, pero quedó sin implementar por el bloqueo headless.

Mejora real medida hoy: **1 remate con stream en vivo** capturado (Ildarraz desde Chajarí, 12/6, vía Rosgan). El número es bajo **por estacionalidad/anticipación**, no por el código: las firmas cargan la URL de transmisión recién sobre la fecha del remate, así que el `youtubeUrl` se irá poblando solo en las corridas diarias previas a cada evento. La infraestructura para capturarlo ya está en las 3 fuentes con API.

## 4. Integración

**Módulo nuevo:** `/Users/josebarnetche/consignatarias/scripts/scrapers/nea.mjs` — aislado, exporta `async function scrapeNEA()`. Replica localmente los helpers del monolito (`fetchText`/`fetchJSON`/`slugify`/`isValidDate`/`normalizeProvince`/`todayISO`/`statusForDate` + inferencia de `type`/`mainCategory`) y devuelve objetos con la forma exacta de `remates.json` (incluido `status` por fecha). Cada fuente va en su función con `try/catch → []`.

**Wiring (3 ediciones mínimas en** `/Users/josebarnetche/consignatarias/scripts/scrape-auctions.mjs`**):**
1. `import { scrapeNEA } from "./scrapers/nea.mjs";`
2. `scrapeNEA()` agregado al `Promise.all` del runner + `...nea` en `allScraped` → entra al `deduplicateAuctions` existente (key = `date | slug-normalizado | localidad`).
3. 3 slugs single-firm (`reggi-y-cia`, `aguerre-srl`, `hre`) sumados al set `scrapableSlugs` para que las copias curadas viejas de esas firmas se reemplacen en vez de duplicarse.

**Convenciones:** `source:'tv'` para pantalla/streaming/televisado, `'web'` para feria/listado. `youtubeUrl` donde la fuente lo expone.

**Cómo se testea:** `node /Users/josebarnetche/consignatarias/scripts/scrapers/nea.mjs` — corre las 5 fuentes, imprime conteo por fuente/provincia, cuántos con stream, y un sample de 6. No escribe archivos.

**Falta para producción:**
- Correr el pipeline completo (`scrape-auctions.mjs`) — **no se ejecutó** la corrida monolítica end-to-end.
- Revisar el **diff de `remates.json`** tras esa corrida (verificar merge/dedupe contra los datos curados existentes; confirmar que los 3 slugs single-firm reemplazan y no duplican).
- Commit/push: **no se hicieron** (se respetó "sin commit").

## 5. Riesgos

- **Aguerre / HRE cargan tarde:** los endpoints son sólidos pero los eventos futuros aparecen con poca anticipación → el rinde diario depende de la cadencia de carga de cada firma, no del scraper. Requiere **poll diario** (cron) para no perderlos.
- **Arzuaga sin cubrir directo:** depende de que su remate televisado aparezca en ClicRural; si alguna vez no se replica ahí, ese live de YouTube se pierde hasta que se implemente headless.
- **ClicRural — selectores por label de texto y provincia como ID numérico:** el mapa de IDs (25=Corrientes, etc.) y los labels (`Fecha :`, `Organiza :`, `Lugar :`) están hardcodeados; un rediseño del portal rompe el parser. HTML pesado (~808KB) por corrida.
- **`estimatedHeads` y `mainCategory`** casi nunca vienen explícitos en los listados → quedan en `null` o inferidos por keywords del título; precisión limitada.
- **Rosgan timezone/derivación de provincia:** la provincia se infiere del sufijo de `ubicacion_remate` (`,Cts/SF/ER`); sufijos no contemplados caen fuera. Streams solo se rescatan para venues NEA conocidos vía keyword map (puede dejar afuera venues nuevos).
- **Dedupe entre agregador y firma:** Gananor (y otras firmas que viven en ClicRural) podrían colisionar con un eventual scraper dedicado; hoy se confía en la key de `deduplicateAuctions` — conviene validar el diff antes de productivizar.
- **Sin verificación end-to-end:** el self-test del módulo está verde, pero el merge real contra `remates.json` no se corrió; ahí pueden aparecer colisiones de dedupe o mapeos de provincia no anticipados.