# consignatarias.com.ar

**La infraestructura de inteligencia del mercado ganadero argentino.**

El precio de referencia del ganado argentino, hecho dato: la **familia de índices** (INMAG diario
desde 2015, en pesos y en dólares, panel de categorías, arrendamiento, spread maíz-novillo e
**Índice de Liquidación** = % hembras), el **directorio**
de 107 consignatarias en 12 provincias y 1.110 frigoríficos cruzados contra SENASA, el **calendario**
de remates, una **API pública** y un **servidor MCP** para agentes IA (registry oficial:
`ar.com.consignatarias/cattle-market`). Datos abiertos y citables; **gratis para el productor**;
PRO Consignataria para operadores y Enterprise API/MCP para integradores.
Live: **[www.consignatarias.com.ar](https://www.consignatarias.com.ar)**.

### Campos: el valor de la tierra, medido

Relevamiento propio del **valor de la hectárea en 15 provincias y 52 zonas**, cruzando tasadores con
serie publicada, catastro provincial con modelo espacial y avisos de venta. Cada fila lleva su fuente,
su fecha y su cantidad de observaciones — y su **aptitud**, porque la tierra agrícola no se valúa con
canon ganadero: la zona núcleo vale US$18.500/ha porque produce soja, no porque críe novillos.

El tasador [`/campos/valuar`](https://www.consignatarias.com.ar/campos/valuar) cruza dos vías —lo que el
campo renta y lo que se paga en su zona— y publica el canon en **kg de novillo por hectárea**, como se
pacta, convertido a pesos con el índice del día. Dataset citable en
[`/valor-tierra.json`](https://www.consignatarias.com.ar/valor-tierra.json) (CC-BY).

> **De agregador de remates a infraestructura de inteligencia.** El directorio y el calendario son
> una superficie; la columna vertebral es la capa de datos e índices del mercado bovino argentino.
> Tesis y posicionamiento completos en [`docs/strategy/POSITIONING-THESIS.md`](docs/strategy/POSITIONING-THESIS.md).

---

## Para consignatarias

### Por qué te tiene que importar

Hoy, cuando un productor en Chaco quiere vender 500 terneros:

- Sigue WhatsApps de 20+ consignatarias para no perderse remates
- Cruza PDFs de calendarios que se actualizan tarde
- Llama a tres asesores para chequear precio
- Decide por el precio porque no tiene cómo elegir consignataria

**Esa decisión por precio te perjudica.** Vos sos el operador — tu trayectoria, tu zona, tus plazas, tu trato con los productores valen más que un par de pesos por kilo. Pero ese diferencial no aparece en ningún lado del journey.

Construimos el lado que faltaba: una pantalla única donde el productor ve **quién opera, qué especialidad, qué historial, qué dicen los productores que ya operaron con vos**. Tu calendario aparece encima del precio, no debajo.

---

### Lo que aparece en tu perfil hoy (sin que hagas nada)

Cada consignataria ya tiene una página armada con datos públicos:

- **Quién Opera** — nombre del referente, especialidad (cría / invernada / general / reproductores / lechera / mixto), región operativa, años en oficio, bio del referente, foto pública si la conseguimos
- **Historial Verificable** — remates de los últimos 90 días + frecuencia mensual, próximos confirmados, tipo dominante, plazas habituales (con el conteo por plaza)
- **Calendario anual** — mapa de calor de actividad mes por mes
- **Precios del remate** — si nos pasás los promedios de tu remate, los publicamos en tu perfil con **tu firma como fuente** (rango $/kg vivo por categoría + punto medio observado, fecha y cabezas). Indexable y citable: queda como el precio de referencia de tu plaza
- **Reseñas de productores** — lo que dicen quienes ya operaron con vos (moderadas por nuestro equipo antes de publicarse)
- **Distribución por tipo** — barra con cuántos remates de cada tipo hiciste en el año
- **YouTube embebido** — si transmitís por canal propio, las últimas transmisiones aparecen
- **Schema.org completo** — Breadcrumb · Event · LocalBusiness · ItemList · Speakable · Dataset. Tu perfil califica para rich results en Google

Buscá tu perfil en [`/consignatarias`](https://www.consignatarias.com.ar/consignatarias) y revisá qué se muestra. Si encontrás algo equivocado, el botón "Reportar error" está en cada página.

---

### Reclamar el perfil (gratis, 5 minutos)

Si querés editar lo que aparece, reclamás el perfil:

1. Buscás tu perfil en [`/consignatarias`](https://www.consignatarias.com.ar/consignatarias)
2. Click en **"Verificar y acceder"**
3. Ponés el email institucional y validamos por CUIT (modulo 11) en tiempo real
4. Magic link al email → entrás al dashboard
5. Editás teléfono, email, web, WhatsApp, descripción, subís logo. Aparece en el perfil público en ≤ 5 minutos

Lo que desbloqueás reclamando el perfil:

- Editor de auctions: creás, editás, eliminás tus propios remates desde el dashboard
- Métricas mensuales por email: el 1° de cada mes te llega un resumen de las visitas a tu perfil
- Badge **"Verificado"** en el listing del directorio
- Foto del referente + bio editable (la persona detrás del nombre)
- Editás la grilla de medios de pago, plazos, condiciones (contenido PRO Consignataria)
- Datos persona detrás del consignatario (los podés autoeditar)

**Costo:** $0. La presencia es gratis para siempre.

---

### PRO Consignataria

La versión paga para consignatarias que quieren capturar más demanda (precio vigente en
[`/planes`](https://www.consignatarias.com.ar/planes)). Incluye:

- **Badge dorado** y tratamiento visual destacado en cada remate listado
- **Listing destacado** en el directorio (perfil expandido con logo grande, alianza visual)
- **Leads directos**: cuando un productor deja una consulta en tu perfil, te llega el contacto al toque por email (PRO ve el contacto completo; sin PRO, enmascarado con opción de activar). Prioridad en el ruteo de leads de tu zona
- **Promoción por email** de cada remate publicado a +500 productores suscriptos
- **Analytics**: cuántas visitas, qué provincias, qué tipo de productor mira tu perfil
- **Landing personalizada** con tu branding (`/go/<tu-slug>`)
- **QR para catálogos** que linkean al perfil
- **Calendario sincronizable** (.ics) para tus clientes
- **Prioridad de soporte**: cualquier cambio editorial se hace en 24h

Activación en [`/planes`](https://www.consignatarias.com.ar/planes). Pago en pesos vía Rebill. Sin contrato anual.

---

### Cómo nos sostiene la data

Todo lo que aparece en tu perfil tiene una fuente verificable:

- **Calendario** se scrapea de 9 fuentes (CACG API, sitios de consignatarias, MAG) todos los días a las 14:00 ART. Los datos públicamente disponibles que dejás en tu propio sitio entran solos
- **Habilitación SENASA** (frigoríficos) cruzada mensualmente contra el registro oficial de SENASA Ciclo I/II/III
- **INMAG** desde el Mercado Agroganadero, scrapeado diariamente. 2.237 días de historia (2015 → hoy)
- **Persona detrás** se llena con datos publicados por la propia consignataria (web, redes oficiales, prensa con caption explícito). Sin invención: cuando no hay fuente clara, dejamos el campo vacío y mostramos "Reclamar perfil →"
- **Reseñas** pasan por moderación manual antes de publicarse. Una reseña por email por consignataria. Sin reseñas anónimas no verificadas

Auditamos la data con 4 scripts internos (data integrity, link graph, content quality, API health) que corren on-demand. Si algo está mal o desactualizado, hay un proceso sistemático para detectarlo.

---

## Para productores y compradores

Si lo que querés es comprar o vender hacienda:

- [`/remates/hoy`](https://www.consignatarias.com.ar/remates/hoy) · remates del día con país completo
- [`/remates/semana`](https://www.consignatarias.com.ar/remates/semana) · planificación semanal
- [`/remates/en-vivo`](https://www.consignatarias.com.ar/remates/en-vivo) · streamings activos (canal-match con YouTube)
- [`/precios`](https://www.consignatarias.com.ar/precios) · cotización diaria de las 6 categorías + INMAG
- [`/mi-ganado`](https://www.consignatarias.com.ar/mi-ganado) · **la libreta del campo**: cargá tu hacienda una vez y mirá cuánto vale **hoy al INMAG** (ARS + USD), con la variación desde tu última visita y la curva de cómo evoluciona tu rodeo en el tiempo. Gratis con tu cuenta; queda guardado y el valor se mueve solo con el mercado
- [`/mercado`](https://www.consignatarias.com.ar/mercado) · análisis de tendencia con USD blue / oficial
- [`/overview`](https://www.consignatarias.com.ar/overview) · **la terminal** — home estilo broker: mercado hoy, tu ganado valuado (7d), remates de hoy y la semana, precios por categoría
- [`/comparar`](https://www.consignatarias.com.ar/comparar) · comparador de consignatarias — actividad, frecuencia y quién remata más seguido
- [`/calendario-exportar`](https://www.consignatarias.com.ar/calendario-exportar) · exportá a tu calendario (`.ics`) los remates de **varias localidades a la vez** (checkboxes por provincia)
- [`/consignatarias`](https://www.consignatarias.com.ar/consignatarias) · grilla por región (Pampa Húmeda · Centro · Mesopotamia · NEA · NOA · Cuyo · Patagonia)
- [`/frigorificos`](https://www.consignatarias.com.ar/frigorificos) · 1.110 plantas con badge SENASA · vigente / sin verificación

**Todo gratis para el productor** (desde jul-2026 — PRO Usuario fue retirado): **¿Vendo ahora?**
(percentil de 30 y 365 días en dólares reales), **Neto en mano**, **Comparador**, **Spread**,
**estacionalidad** e histórico INMAG. Con tu cuenta gratuita sumás **Mi Ganado** (tu stock valuado
al día), seguimiento de consignatarias con aviso de remates, alertas de precio y el **karma de
productor** (checklist de arranque: con 3 de 4 pasos ya sos Productor). El que paga es el lado
institucional (API/MCP) y la consignataria (alcance), no el productor — el productor ES el valor.

**Gratis, con cuenta** (desde ago-2026 — v1.196.0). Cualquiera ve el calendario, la ficha de cada
remate, el número del día y la identidad de cada firma; el detalle pide entrar. Piden cuenta el
catálogo y el calendario de un remate, los datos de contacto de consignatarias y frigoríficos, la
serie histórica del INMAG, el resultado de las herramientas de decisión, el desglose de una
valuación de campo y cualquier descarga (CSV, PDF, `.ics`). Se entra con Google o con un mail: es
gratis y toma veinte segundos.

---

## Para integradores · API pública

Tres endpoints con Bearer auth. Pricing público en [`/enterprise`](https://www.consignatarias.com.ar/enterprise).

| Endpoint | Devuelve |
|---|---|
| `GET /api/precios` | INMAG actual + 6 categorías (`?detallado=true` da 16 sub-categorías oficiales MAG, `?historico=N` da histórico) |
| `GET /api/lots` | Lote-level transactional data (haciinfo000007) — 90 días máximo por query |

Planes:

| Plan | Cap mensual | Precio |
|---|---:|---:|
| Starter | 10.000 req | ARS 74.000/mes |
| Growth | 100.000 req | ARS 451.000/mes |
| Scale | 100K–5M req | A medida |

Facturación mensual en ARS vía Rebill (anual –15%; exterior: transferencia o USDT al equivalente).

También como **servidor MCP** para agentes IA: endpoint `https://www.consignatarias.com.ar/api/mcp`
(**23 tools**; listado en el registry oficial como `ar.com.consignatarias/cattle-market` v1.3.0, y en
Glama — quality A — y Forge). Demo animada con los datos del día en [`/mcp`](https://www.consignatarias.com.ar/mcp).
Cubre mercado (INMAG, precios por categoría, macro, **Índice de Liquidación** = % hembras), remates,
directorio de consignatarias y frigoríficos, **valuaciones** (hacienda, arrendamiento y **valor de la
hectárea por provincia y zona**), **sanidad SENASA** (calendario de vacunación, requisitos de movimiento,
RENSPA, DT-e) y **Buenas Prácticas Ganaderas** — todo con la fuente citada.
Catálogo completo de fuentes MAG en [`docs/mag-endpoints-catalogo.md`](docs/mag-endpoints-catalogo.md).

Documentación: [`/api-docs`](https://www.consignatarias.com.ar/api-docs).

---

## Por qué la plataforma existe

El mercado ganadero argentino mueve USD 15.000M+ al año y todavía corre sobre WhatsApps, PDFs y llamadas. Hay un hueco enorme entre la base productiva, los consignatarios y los frigoríficos: nadie ve la cancha entera al mismo tiempo.

Construimos esta plataforma con tres tesis simples:

1. **El consignatario importa más que el precio del día.** El precio sube y baja; quién opera, cómo opera, qué reputación tiene — eso es la decisión real.
2. **La data tiene que ser auditable.** Cada dato viene de una fuente pública verificable. Cero invención. Cuando no podemos verificar, dejamos el campo vacío.
3. **El productor decide adentro de la plataforma, no afuera.** Calendario, comparativas, reseñas, alertas, contacto directo — todo en un solo lugar.

Estamos cruzando la fase de directorio hacia la fase de infraestructura. Roadmap completo en [docs/TECHNICAL.md → Market Decision Infrastructure](./docs/TECHNICAL.md#roadmap-market-decision-infrastructure).

---

## Empezá

| Sos… | Hacé esto |
|---|---|
| Consignataria | [Buscá tu perfil en el directorio](https://www.consignatarias.com.ar/consignatarias) → click "Verificar y acceder" → 5 min |
| Frigorífico | [Buscá tu CUIT en el directorio de frigoríficos](https://www.consignatarias.com.ar/frigorificos) → click "Reclamar" |
| Productor / ranchero | Entrá a [`/remates/hoy`](https://www.consignatarias.com.ar/remates/hoy) o [`/remates/semana`](https://www.consignatarias.com.ar/remates/semana) |
| Comprador frigorífico / acopiador | [`/api-docs`](https://www.consignatarias.com.ar/api-docs) — feed estructurado de remates y precios |
| Investigador / press / partner | Reservá una reunión: [calendar.app.google/gr2BXY1ooDMki8TK7](https://calendar.app.google/gr2BXY1ooDMki8TK7) |

Errores en la data, takedown requests, sugerencias: **[agro@memola.com.ar](mailto:agro@memola.com.ar)**.

---

## Para developers

Documentación técnica completa: [**docs/TECHNICAL.md**](./docs/TECHNICAL.md).

Cubre architecture · data pipeline · sources · tech stack · pages & routes · public API · project structure · dev commands · environment variables · roadmap.

Release history: [**CHANGELOG.md**](./CHANGELOG.md).

API contract: [**/api-docs**](https://www.consignatarias.com.ar/api-docs).

---

## Quiénes operamos esto

**Memola Medios SAS** — Mercedes, Corrientes. agro@memola.com.ar.

Operadores comerciales que construyen infraestructura propietaria — no agencia, no media buyer. consignatarias.com.ar es nuestro vehículo principal en agro.

---

v1.196.0 · 2026-08-19 · [www.consignatarias.com.ar](https://www.consignatarias.com.ar) · [CHANGELOG](CHANGELOG.md) · API contract v1.0.0
