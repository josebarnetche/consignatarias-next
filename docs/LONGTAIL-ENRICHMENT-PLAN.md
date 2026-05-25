# Long-tail Enrichment Plan — consignatarias.com.ar

> **Fecha:** 2026-05-24 · **Origen:** swarm de 4 agentes de research sobre el content audit del 18/05.
> **Objetivo:** sacar ~801 páginas de "Discovered/Crawled, not indexed" enriqueciéndolas con
> **datos reales** (no prosa) y reconectando 340 huérfanas, para capturar tráfico long-tail.

---

## TL;DR — la tesis

El problema **no es "poco texto"**, es **"datos ricos sin renderizar"**. La solución **no es generar prosa**
(eso dispara el *scaled-content-abuse* de Google — Core Update dic-2025: 87% de impacto negativo en
contenido masivo sin valor), sino **exponer datos observados reales** que ya tenemos. Esos datos
(MAG/SENASA/remates) son exactamente lo que Google premia como *information gain* en 2026.

**Mix sano (Google 2026):** ~60% datos estructurados + ~30% resumen derivado de esos datos + ~10% editorial curado. **Nunca** prosa genérica con el nombre intercambiado.

**Regla dura (memoria Jose):** datos REALES, nunca "derivados/sintéticos". Dos flags:
- El **volumen de faena por planta NO es público** (solo agregado nacional). No inventar stats por establecimiento.
- No fabricar números per-record. Los enriquecedores genuinos son el glosario/raza estáticos y los datos geo-keyed (existencias por partido).

---

## Estado actual (content audit 2026-05-18)

| Ruta | Páginas | Mediana palabras únicas | Críticas (<80) |
|---|---:|---:|---:|
| `frig-detail` | 364 | **22** | 308 |
| `remate-detail` | 352 | **46** | 328 |
| `remate-ciudad` | 116 | 72 | 67 |
| `consig-detail` | 80 | 65 | 48 |

Link graph (2026-05-18): **340 huérfanas** (cero inbound in-content), 431 débiles (<3), 128 targets rotos, 134 monoculturas de anchor, 1 página con >200 links de salida.

---

## FASE 1 — Surface de datos propios (máximo ROI, cero APIs externas)

**Insight clave del agente de código: casi todo el enriquecimiento ya está en el repo, sin renderizar.**

### 1A. Página de frigorífico — `src/app/(terminal)/frigorificos/[slug]/page.tsx`

Fuente: `src/lib/data/frigorificos-enriched.json` (364 items, 10 campos enriquecidos). Hoy renderiza CUIT + nombre + etapa. Campos muertos a surfacear:

| Campo | Uso propuesto |
|---|---|
| `grupoEmpresario` | Badge "Grupo: Minerva/JBS · Costantini · Gorina" |
| `tipo` | Badge "Exportador / Consumo interno" |
| `localidad` + `direccion` | Sección dirección completa |
| `volumenFaena` | Stat "Capacidad: N cab/día" (solo si existe; NO inventar) |
| `notas` | Sección "Operaciones": certificaciones, países de exportación, empleados, antigüedad |
| `telefono`/`email`/`web` | Bloque de contacto (NAP — alimenta schema LocalBusiness) |

SENASA (`src/lib/data/senasa-habilitados.json`, hoy PRO-gated): `propietario`, `partido`, `localidad`, `ciclos`, `actividades`. **Teasear a free** (mostrar ciclo + actividades, gatear el detalle).

### 1B. Página de remate — `src/app/(terminal)/remates/[slug]/page.tsx`

Fuente: `src/lib/data/remates.json` + `market-prices.json` + persona fields en Supabase.

| Dato | Uso propuesto | Fuente |
|---|---|---|
| `mainCategory` | Badge específico (terneros/novillos/vaca_gorda) distinto del `type` | remates.json |
| Contexto INMAG | "A la fecha del remate: novillo $X/kg (INMAG)" + % vs hoy | market-prices.json (ya en pipeline) |
| Persona consignatario | nombre, cargo, foto, bio, años de oficio, especialidad, región | Supabase `consignatarias` (seedeado, **invisible hoy**) |
| `medios_pago` | "Acepta: transferencia, cheque a N días" | Supabase `consignatarias.medios_pago` |
| Canal YouTube | Link/embed al canal del consignatario | `youtube-channels.json` |

### 1C. Página de consignataria — funciones computadas sin renderizar

Migración `20260320_remitente_history.sql` ya define funciones **calculadas pero nunca mostradas**:
- `get_top_remitentes(slug, 10, 90)` → "Top proveedores (90 días)" con cabezas
- `get_top_localidades(slug, 10, 90)` → mapa de origen de hacienda
- `get_volume_trends(slug, 90)` → tendencia semanal de volumen

**Esfuerzo:** leer campos existentes y renderizarlos. Sin llamadas externas. Mayor impacto/hora.

---

## FASE 2 — Módulos de internal-linking (enriquece Y mata huérfanas)

**Dato crítico:** `scripts/audit-link-graph.mjs` descarta `<nav>/<footer>/<aside>/<header>` a propósito (busca señal de link in-content). Los 340 huérfanos **NO se arreglan en el footer** — los fixes van **en el cuerpo**. Los mismos módulos que enriquecen las páginas thin matan los huérfanos.

Construir como **Server Components reusables**:

1. **`<Breadcrumbs>`** visibles dentro de `<main>` + `BreadcrumbList` JSON-LD. Remate: `Inicio › Remates › {Ciudad} › {Consignataria} › {Remate}`. Da 4 inbound in-content por hoja de un saque.
2. **`<RelatedAuctions>`** — secciones "En {ciudad}" · "Misma semana" · "De {tipo}" (6 cards c/u, reusa `src/components/remates/auction-card.tsx`). Esto solo rescata `/remates/fin-de-semana` y conecta cientos de hojas.
3. **`<NearbyEntities>`** — "Frigoríficos/consignatarias en {provincia}".
4. **Anchors variados desde data** dentro de los widgets (rotar `{Consignataria}` · `Remate de {tipo} en {ciudad}` · `{N} lotes · {fecha}`) → mata las 134 monoculturas. Assert: ningún anchor >60% del inbound de un target.
5. **Paginar/capear** la página con >200 links de salida (calendario/índice) a ~50-80 links/vista.
6. **Hand-wire editorial orphans** (`/el-oraculo`, `/mercado/arrendamiento`) desde las páginas que ya rankean (INMAG/precios, per GSC) con links contextuales in-body.

**Garantía ≥3 inbound:** breadcrumb + related-module en hermanos + hub que linkea hacia abajo. Lleva huérfanos→0 mecánicamente.

---

## FASE 3 — Contenido estático evergreen (alto valor, cero mantenimiento)

1. **Glosario SENASA** (keyed al campo `category` del frigorífico): qué significa Ciclo I (faena) / II (desposte) / III (frío), Tránsito Federal vs Provincial (clase C, solo intra-provincia) vs Exportación. Bloque de 2-4 frases por página. **El mayor valor-por-esfuerzo en frigoríficos.**
2. **Perfiles de raza** (keyed al campo breed del remate): Angus, Hereford, **Braford** (>60% NEA), **Brangus** — mapeados a región. Braford/Brangus pegan con el núcleo Corrientes/Mercedes. ~80-120 palabras por raza, evergreen.

Fuentes: MAGYP (definiciones clases frigorífico), Argencarne/Aapresid/Asoc. Braford (razas).

---

## FASE 4 — Schema.org

- **Remates → `Event`** (startDate, location, organizer). Google indexa eventos agresivamente (caso Eventbrite long-tail).
- **Frigoríficos → `LocalBusiness`/`Organization`** (NAP, geo, identifiers).
- **Tablas de precio → `Dataset`/`Table`**.

Extender `src/components/seo/JsonLd.tsx`.

---

## FASE 5 — Data integrity + correctness (barato, hacer temprano)

De `data-integrity-report.json` y `link-graph-report.json`:
- **9 slugs de consignataria que 404ean** en redirect de perfil (hourcade-albelo, consignataria-bh, lanusse-santillan, esteban-abelenda, etc.).
- **2 CUITs de frigorífico duplicados** (30712415130, 30708728035).
- **1 youtube key huérfana** (`hre-consignaciones-srl` no mapea a canonical).
- **128 targets internos rotos** — diff entre hrefs y `src/app/sitemap.ts` / `generateStaticParams`.
- 16 consignatarias zombie (sin remates en 60d) — decidir noindex o consolidar.

---

## FASE 6 — Datos externos pull-ables (después de agotar lo propio)

Priorizado por valor × factibilidad (agente de fuentes):

| Fuente | Dato | Acceso | Página |
|---|---|---|---|
| SENASA Existencias por partido | stock bovino por depto | CSV anual (datos.gob.ar) | remate (geo) |
| MAGYP Series de Tiempo | faena bovina mensual nacional | API JSON/CSV | frig (contexto) |
| ROSGAN precios | invernada/cría por categoría | scrape tabla | remate (lo que INMAG no cubre) |
| SMN pronóstico | clima por ciudad | feed ws2.smn.gob.ar | remate (solo futuros) |

**SKIP:** RENSPA/SISA/SIGSA (sin API, dato no apropiado para perfil). El stock por provincia ya viene del dataset de Existencias de SENASA (derivado de RENSPA).

---

## Orden de ejecución recomendado

1. **Fase 5** (data integrity / 404 / targets rotos) — barato, correctness primero.
2. **Fase 1** (surface de datos propios) — máximo impacto, cero APIs.
3. **Fase 2** (módulos related-entity + breadcrumbs) — enriquece Y mata 340 huérfanas.
4. **Fase 3** (glosario SENASA + razas) estático.
5. **Fase 4** (schema.org).
6. **Fase 6** (datos externos) + **re-correr los 4 audits** para verificar (objetivo: huérfanos→0, débiles <5%, max-anchor-share <60%, max-outbound <200, críticas thin <20%).

**Rollout:** por cohorte/template, midiendo tasa de indexación en GSC (objetivo >80%). Las hojas genuinamente vacías (sin lotes/datos): `noindex` + fuera del sitemap hasta que tengan data — no bombear links a husks.

---

## Verificación 2026-05-24 (Fase 5 + Fase 1 implementadas)

**Shipeado:** P0 data-integrity = 0 (9 slugs, 2 CUITs, youtube key, + bug de provincia del scraper y 1 remate dup). Enriquecido frig (capacidad faena + glosario ciclos + tránsito) y remate (categoría + contexto INMAG a la fecha + persona consignatario). Build SSG exit 0, tsc limpio.

**Aprendizaje clave (medido):** el `audit-content-quality.mjs` mide `unique = total − boilerplate`, donde boilerplate = 3-gramas presentes en >40% de las páginas de la ruta. **El texto explicativo idéntico en todas las páginas (glosario, prosa INMAG) se descuenta como boilerplate → no levanta el conteo de páginas thin.** Coincide con cómo Google trata near-duplicates. La palanca real es **dato único POR PÁGINA**, no prosa compartida.

**Desgateo parcial SENASA (decisión Jose 2026-05-24):** la data factual del registro SENASA (actividades, partido, localidad, ciclos, nº oficial) pasó a ser visible para usuarios free; PRO se reserva para value-add (alertas, exports, comparador, API). Es data pública; gatearla bloqueaba indexación sin monetizar bien.

**Impacto medido (frig-detail, 1090 pp):** mediana palabras únicas 48 → **78**; críticas 806 → **565** (−241). Global: CRITICAL 1385 → 1144, OK 101 → 123.

**Fix sistémico de slugs 404 (DONE 2026-05-24):** el resolver ahora **sintetiza un perfil mínimo** desde los datos del remate para cualquier consignataria con remates pero sin entrada curada → nunca más 404. Implementado con `synthesizeProfile()` en `consignataria-slugs.ts` (client-safe) + helpers `resolveConsignatariaSlug`/`getOrSynthesizeProfile` en el page server (que ya importa `rematesData`). Los sintetizados NO van al sitemap/`getAllCanonicalSlugs` (no indexamos thin auto-pages); renderizan vía `dynamicParams`. El audit reclasificó `unresolvable-slugs` (P1) → `uncurated-consignatarias` (P2). Junk `colombo-y-maliagno2` mergeado a `colombo-y-magliano` + 1 remate dup eliminado. **Estado: P0=0, P1=0, P2=3.**

**Pendiente / próxima frontera:**
- `remate-detail` sigue thin (mediana 39): el dato único por remate es escaso. Lever = módulos related con nombres específicos (Fase 2), ROSGAN por categoría, o historial de remitentes por consignataria.
- 219 frigoríficos realmente vacíos (sin SENASA ni notas).
- 22 consignatarias uncurated (P2): curar las reales (Madelán, A. Mendizábal, Lalor, Monasterio, Lartirigoyen, Arzuaga, etc.) moviéndolas a `PROFILES` para hacerlas indexables; el scraper debería mergear los `*2` junk (cyg-n-hacienda2, sociedad-agricola-ganadera-ltda2).
- Dedup canónico-aware en el scraper (evitar que variantes de grafía dupliquen auctions, como pasó con maliagno2).
- Agua Viva CUIT 30712415130: provincia (Tucumán vs Santa Fe) quedó sin verificar.

## Anti-patterns a EVITAR

- Prosa IA en bulk para llegar a un word count (el error #1 — democión garantizada).
- Template con nombre/ciudad intercambiado (doorway pattern).
- Scrapear + republicar verbatim sin capa de valor (tablas/resumen/links).
- Spikes de velocidad de publicación.
- Tratar schema como botón mágico de indexación (clarifica entidad, no sustituye valor ni links).

---

## Archivos clave

- Páginas: `src/app/(terminal)/frigorificos/[slug]/page.tsx` (568 líneas), `src/app/(terminal)/remates/[slug]/page.tsx` (596 líneas)
- Data: `src/lib/data/{frigorificos-enriched,remates,market-prices,youtube-channels,mag-remitentes-history,consignataria-persona-seed,senasa-habilitados}.json`
- DAL: `src/lib/dal/{frigorificos,consignatarias}.ts` (`getRelatedConsignatarias` ya existe)
- Componentes: `src/components/remates/auction-card.tsx` (reusar), `src/components/seo/JsonLd.tsx` (extender)
- Migraciones: `20260320_remitente_history.sql` (funciones computadas), `20260518_consignataria_persona_fields.sql` (persona), `20260519_consignataria_reviews.sql`
- Audits: `scripts/audit-{content-quality,link-graph,data-integrity,api-health}.mjs` → outputs en `scripts/.cache/`
