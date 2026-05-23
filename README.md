# consignatarias.com.ar

**Donde aparecés cuando un productor argentino busca dónde rematar su hacienda.**

Directorio + market intelligence + API pública para el mercado ganadero argentino. Cubrimos 80 consignatarias canónicas en 12 provincias, 1.092 frigoríficos cruzados contra el registro SENASA, INMAG diario desde 2015 y USD blue desde 2011. Live: **[www.consignatarias.com.ar](https://www.consignatarias.com.ar)**.

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

### PRO Consignataria · ARS 45.000/mes

La versión paga para consignatarias que quieren capturar más demanda. Incluye:

- **Badge dorado** y tratamiento visual destacado en cada remate listado
- **Listing destacado** en el directorio (perfil expandido con logo grande, alianza visual)
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
- [`/consignatarias`](https://www.consignatarias.com.ar/consignatarias) · grilla por región (Pampa Húmeda · Centro · Mesopotamia · NEA · NOA · Cuyo · Patagonia)
- [`/frigorificos`](https://www.consignatarias.com.ar/frigorificos) · 1.092 plantas con badge SENASA · vigente / sin verificación

**PRO Usuario · ARS 7.900/mes.** Acceso a medios de pago de cada consignataria, verificación SENASA expandida, filtros avanzados, archivo histórico INMAG, descargas premium (El Corredor, El Oráculo). Activación en [`/planes`](https://www.consignatarias.com.ar/planes).

---

## Para integradores · API pública

Tres endpoints con Bearer auth. Pricing público en [`/enterprise`](https://www.consignatarias.com.ar/enterprise).

| Endpoint | Devuelve |
|---|---|
| `GET /api/precios` | INMAG actual + 6 categorías (`?detallado=true` da 16 sub-categorías oficiales MAG, `?historico=N` da histórico) |
| `GET /api/lots` | Lote-level transactional data (haciinfo000007) — 90 días máximo por query |

Planes:

| Plan | Cap mensual | Rate limit | Precio |
|---|---:|---:|---:|
| Starter | 1.000 req | 30 / min | USD 99 |
| Growth | 50.000 req | 300 / min | USD 500 |
| Scale | 100K–5M req (slider) | 5.000 / min | USD 700–7.500 |

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

v1.18.0 · 2026-05-20 · [www.consignatarias.com.ar](https://www.consignatarias.com.ar)
