# Reporte de sprint — Crecimiento orgánico geo de consignatarias.com.ar

**Fecha:** 2026-06-07
**Sitio:** consignatarias.com.ar
**Alcance:** Bloque A (cambios de riesgo bajo, ya aplicados) + roadmap geo
**Estado del build:** `BUILD_EXIT=0`, "Compiled successfully", 2.717/2.717 páginas estáticas generadas, sin errores. `npx tsc --noEmit` → `TSC_EXIT=0`. Sin commit/push.

---

## 1. Resumen ejecutivo

El sitio ya está en página 1 de Google para sus consultas clave: en los últimos 28 días (2026-05-08 → 06-05) acumuló **765 clicks / 33.191 impresiones / CTR 2,3% / posición media 6,4**, con un crecimiento de +93% en clicks y +91% en impresiones vs. el período anterior. La conclusión que ordena todo el sprint: **el cuello de botella no es el ranking, es el CTR.** Tenemos las impresiones; no estamos convirtiendo el clic.

La evidencia es nítida en GSC. Las páginas-provincia de frigoríficos concentran mucho volumen con CTR pobre: `/frigorificos/buenos-aires` 2.397 impresiones a 1,1%, `/frigorificos/santa-fe` 969 a 2,1%. En el extremo opuesto, las páginas-provincia de remates convierten al 7-10% (Corrientes 7,1%, Entre Ríos 8,4%, La Pampa 10,2%) pero con pocas impresiones. La fórmula que funciona —**geo + número real + señal de actualidad ("hoy"/2026) + intención de búsqueda en el title**— ya está probada; faltaba aplicarla donde está el volumen desperdiciado y replicarla preventivamente en el resto de los silos.

El sprint atacó eso con cinco cambios de riesgo bajo, todos de copy / metadata / schema / internal-link, sin lógica de negocio nueva y **sin un solo número inventado**: cada cifra sale de una variable ya calculada en el archivo (conteos del directorio: `provinceFrigorificos.length`, `provinceAuctions.length`, `consignatarias.size`, `count`) o de `market-prices.json` (novillo $4.236/kg, INMAG, fecha 2026-06-07). Se sumó además `FAQPageSchema` a los silos que no lo tenían (frigoríficos, remates, consignatarias-provincia) para disputar el AI Overview que hoy solo gana `/precios`, y se cerró el loop de internal-linking precio↔remate↔frigorífico en `ProvinceCluster`.

Quedó deliberadamente fuera de esta tanda todo lo que requiere verificación de datos o rutas nuevas (expandir `/precios` de 13→22 provincias, hub `/provincias`, Speakable/Dataset): es el backlog del bloque B.

---

## 2. Cambios realizados (bloque A — aplicados y con build verde)

| Archivo | Qué cambió | Por qué | Riesgo |
|---|---|---|---|
| `src/components/seo/ProvinceCluster.tsx` | Se agregó `PRECIOS_SLUGS` (Set de los 13 slugs que soporta `/precios`, derivado de `PROVINCE_SLUGS`). Nuevo link geo de precio `{ key:'precio', href:'/precios/novillos/${slug}', label:'Precio del novillo en ${name}' }` insertado en `allLinks` **solo si** `slug ∈ PRECIOS_SLUGS` (evita 404). Se conservó el link a `/mercado`. Tipo del array ampliado a `Silo \| 'mercado' \| 'precio'`. | Cierra el loop precio↔remate↔frigorífico en el activo central de internal-linking. Antes el cluster solo enlazaba a `/mercado` genérico; ahora distribuye autoridad hacia la landing geo de precio, que es la pieza que alimenta el AI Overview. Toca 1 archivo pero impacta los 4 silos → ROI máximo. | Bajo |
| `src/app/(terminal)/frigorificos/_views/FrigorificoProvinceView.tsx` | **title:** `…· {N} Plantas SENASA/MAGYP` → `Frigoríficos en {X}: {N} Plantas Habilitadas SENASA/MAGYP (2026)`. **description:** reescrita con la intención al frente (`¿Dónde faenar en {X}? {N} frigoríficos… ciclo I/II/III… actualizado en 2026.`). **H1:** `Frigoríficos en {X}` → `Frigoríficos habilitados en {X}: {N} plantas`. Nuevo `FAQPageSchema` aditivo (3 Q&A: conteo, explicación del ciclo I/II/III vía `STAGE_LABELS`, dónde faenar). | Es el silo de mayor volumen con peor CTR (≈3.366 impresiones a 1-2%). Anteponer geo+número e inyectar la intención real de búsqueda ("dónde faenar") es la palanca directa de CTR. El FAQ disputa el AI Overview geo. Sin teléfonos ni capacidades de faena (no existen en `frigorificos.json`). | Bajo |
| `src/app/(terminal)/remates/_views/RematesProvinceView.tsx` | Imports nuevos: `marketPrices` y `FAQPageSchema`. En metadata: `novillo = Math.round(categories.novillos.current)` (=4.236), `fecha = lastUpdate` (=2026-06-07). **title:** `Remates Ganaderos en {X} 2026` → `Remates en {X}: {N} en calendario · Novillo $4.236/kg (INMAG)`. **description:** ahora incluye `{N} remates`, `{consignatarias.size} consignatarias` y precio INMAG con fecha. Nuevo `FAQPageSchema` (3 Q&A: cantidad de remates/próximos/consignatarias, top 6 consignatarias, tipos vía `TYPE_LABELS`). | Estas páginas ya convierten 7-10%; la palanca acá es **volumen de impresiones**, no rewrite agresivo. Sumar el precio vivo INMAG (referencia nacional, etiquetada como tal = honesto) y el conteo agrega ganchos numéricos a la SERP. El FAQ captura long-tail "¿qué remates hay en X?". | Bajo |
| `src/app/(terminal)/consignatarias/_views/ProvinceView.tsx` | **title:** `Consignatarias en {X} \| {N} Consignatarias de Hacienda` → `Consignatarias en {X}: {N} Activas con Remates 2026`. **description:** reescrita (`{N} consignatarias… perfiles, contacto y próximos remates… actualizado a diario.`). Nuevo `FAQPageSchema` (2 Q&A: cuántas operan vía `entries`/`totalRemates`/`totalUpcoming`, top 6 de `entries`). | Replicación preventiva de la fórmula numérica que ya rinde en remates, sobre un silo que aún no tiene volumen fuerte pero lo tendrá. Igualar el patrón FAQ que gana AI Overview. | Bajo |
| `src/app/(terminal)/consignatarias/[slug]/page.tsx` | **Solo en la rama SIN `customSEO`** de `generateMetadata`: se derivó `primaryProvince` de `provinces` (ya en scope), title-cased con helper inline. Fallback `{displayName} — Calendario de Remates` → `{displayName} — Consignataria de Hacienda{geo}` (geo = ` en {Provincia}` o vacío). La rama `customSEO` (lehmann/sivero) quedó intacta. | Recupera perfiles de marca con CTR 0% (hasenkamp, colombo en pos 8-10) cuyo title default no tenía geo. Esfuerzo mínimo, sin pisar los titles ya curados que rinden. | Bajo |

**Por qué los 5 no entran en conflicto:** los cambios son aditivos en cada archivo (title + description + un schema nuevo + un link), nunca dos ediciones de la misma línea con valores distintos. Donde una estrategia pedía solo título y otra título+precio, se tomó el superset.

**No se tocó** (todo backlog B): expansión de `/precios` 13→22, `sitemap.ts`, Speakable/Dataset, hub `/provincias`, `LocalBusiness` schema.

---

## 3. Metas de KPI

Baselines reales de GSC (28d, 2026-05-08 → 06-05). Targets tomados del piso más conservador de las estrategias. Medición con los scripts existentes `gsc-organico.js` (GSC) y `ga4-hoy.js` (GA4).

| # | KPI | Baseline real | Target | Horizonte | Cómo se mide |
|---|---|---|---|---|---|
| 1 | CTR `/frigorificos/buenos-aires` | 1,1% (2.397 impr, ~27 clicks/28d, pos ~7) | 3,0% (~72 clicks) | 28d post-deploy | `gsc-organico.js` filtrado por page, comparativa 28d |
| 2 | CTR `/frigorificos/santa-fe` | 2,1% (969 impr, ~20 clicks/28d) | 4,0% (~39 clicks) | 28d post-deploy | `gsc-organico.js` por page |
| 3 | CTR silo frigoríficos-provincia (agregado) | ~1,3% ponderado (~3.366 impr) | 3,0% ponderado | 28d post-deploy | `gsc-organico.js`, agregado por patrón `/frigorificos/*` |
| 4 | Impresiones silo frigoríficos-provincia | ~3.366 impr/28d | +15% | 56d | `gsc-organico.js`, suma de impresiones del patrón |
| 5 | Clicks `/remates/[prov]` (corrientes+entre-ríos+la-pampa+resto) | ~49 clicks/28d, CTR 7-10% | +30% (~64 clicks), CTR ≥7% | 56d | `gsc-organico.js`, suma del patrón `/remates/*` |
| 6 | Impresiones patrón `/precios/[cat]/[prov]` | query faro "vaca viva 2026" pos 5,3; cluster ~100-174 impr c/u | +40% del cluster | 56d | `gsc-organico.js`, patrón `/precios/*` (gana del link entrante de ProvinceCluster) |
| 7 | Páginas con `FAQPageSchema` en remates+consignatarias-provincia (Rich Results) | 0 | ≥26 válidas (13+13) | 28d | GSC → Mejoras → Resultados enriquecidos / Preguntas frecuentes |
| 8 | CTR perfiles consignataria con CTR 0% (hasenkamp, colombo) | 0% en pos 8-10 (title sin geo) | >5% (≥1 clic/perfil) | 28d | `gsc-organico.js` por page de perfil |
| 9 | Queries geo en top-3 (frigoríficos/remates/consignatarias [prov]) | silos pos 6-9, sin FAQ rich result | ≥5 queries en top-3 + aparición FAQ/AI Overview | 56d | `gsc-organico.js` por query + spot-check manual SERP |
| 10 | Clicks orgánicos geo totales (4 silos provincia) | ~110 clicks/28d | +40% (~155) | 56d | `gsc-organico.js`, suma de los 4 patrones |

> Lectura de la tabla: KPIs 1-3 y 8 son la apuesta de CTR (resultado esperado a 28d, mismo deploy); KPIs 4-6 y 10 son volumen compuesto (56d, dos ciclos de re-crawl); KPI 7 es la validación técnica de que Google reconoció el FAQ schema nuevo.

---

## 4. Backlog geo (próximos pasos — mayor esfuerzo / riesgo medio)

Ordenado por dependencia. **B1 es bloqueante de B4 y condiciona B3.**

**B1 — Expandir `/precios` de 13 → 22 provincias.**
`src/app/(terminal)/precios/[categoria]/[provincia]/page.tsx`. Agregar 9 provincias a `PROVINCES` → 6 categorías × 9 = **54 URLs nuevas** del patrón que ya rankea (pos 5,3). No es copy: requiere (a) **verificar que `existencias-bovinas.json` tiene las 9 provincias** (la página lo lee; si falta una, degrada a `null`), y (b) **justificar los km a Cañuelas** (input del modelo `regionalBasis`, alimenta el "estimado en origen" público, no pueden ser inventados a ojo). Es trabajo de datos + verificación. Al hacerlo: sincronizar `ProvinceCluster` (13→22) y `sitemap.ts`.
*Nota de verificación pendiente:* las estrategias asumen datos SENASA para 22-23 provincias en `existencias-bovinas.json`; **no fue verificado en este sprint.** Es el primer chequeo antes de ejecutar B1.

**B2 — Speakable + Dataset schema en `/precios/[cat]/[prov]`.**
Render de `SpeakableSchema` + `DatasetSchema` con `dateModified=lastUpdate` para que el AI Overview cite el $/kg con fecha+fuente. Riesgo bajo, pero **depende de confirmar que esos componentes existen en `JsonLd.tsx`** (no verificado en esta sesión). Reforzar title/meta con `lastUpdate` + `basis.localEstimate` (estimado en origen como segundo número citable).

**B3 — Hub `/provincias` (ruta nueva).**
`src/app/(terminal)/provincias/page.tsx` (new) + `sitemap.ts` + link desde nav/silos. `CollectionPage` + `BreadcrumbList` listando las provincias con conteos reales, enlazando a cada silo existente (filtrando 404). Da el link entrante consistente a `/remates/[prov]` y `/consignatarias/[prov]` que hoy solo tienen del sitemap. Es la pieza estructural de mayor esfuerzo; verificar SSG con `pnpm build`.

**B4 — Endurecer `ProvinceCluster` a fuente-de-verdad de existencia por silo.**
Props `hasRemates`/`hasConsignatarias` (o cálculo interno vía `provinceSlugsWithAuctions()` / `rematesProvinceSlugsWithAuctions()`, ambos ya exportados) para no pintar links a 404, y expandir a 22 slugs para que las **9 provincias solo-frigoríficos** (Salta, Jujuy, Mendoza, Catamarca, La Rioja, San Juan, Río Negro, Chubut, Santa Cruz) dejen de ser huérfanas geo. Acoplado a B1: no expandir slugs sin que existan las páginas destino.

**B5 — `LocalBusiness` en lugar de `Organization` en `ProvinceConsignatariasSchema`.**
Cambiar `@type` de cada item a `LocalBusiness` + `address {addressRegion, addressCountry:'AR'}`. Riesgo bajo, mejora estructural; agrupable con el resto del refactor de schema.

KPIs que dependen del backlog (no del bloque A): páginas `/precios` indexables 78→132 (B1, al deploy SSG); páginas-provincia huérfanas en ProvinceCluster 9→0 (B4); citas del $/kg en AI Overview con Speakable/Dataset (B2, 60-90d, spot-check mensual).

---

## 5. Cómo medir el resultado en 14-28 días

1. **Re-deploy y re-indexación.** Confirmar deploy en producción. En GSC, usar **Inspección de URL → Solicitar indexación** para 3-4 páginas faro (`/frigorificos/buenos-aires`, `/frigorificos/santa-fe`, `/remates/corrientes`, `/consignatarias/[prov]` de mayor volumen) para acelerar el re-crawl del nuevo title/description.

2. **Día 0 — congelar baseline.** Correr `gsc-organico.js` (ventana 28d actual) y guardar el snapshot. Es el punto de comparación; los targets de la tabla 3 son contra estos números exactos.

3. **Día 14 — chequeo temprano (señal, no veredicto).**
   - Validación técnica del FAQ: GSC → **Mejoras → Preguntas frecuentes / Resultados enriquecidos**. Buscar que aparezcan páginas de remates y consignatarias-provincia como válidas (KPI 7). Si a 14d hay 0, revisar el render del schema.
   - Spot-check manual de SERP: buscar "frigoríficos habilitados buenos aires", "remates corrientes", "consignatarias [prov]" y verificar que el title nuevo (con número/año/precio) ya se muestra. Si Google aún muestra el title viejo, el re-crawl no terminó: esperar.

4. **Día 28 — veredicto de CTR (apuesta principal).** Correr `gsc-organico.js` y comparar contra el baseline del día 0, **por página**, para los KPIs 1, 2, 3 y 8. El CTR es la métrica que debe moverse a 28d porque el cambio es de title/description (Google lo aplica apenas re-indexa). Si el CTR de frigoríficos no subió de ~1-2% hacia ~3%, el title nuevo no está resonando con la query → iterar copy.

5. **Día 56 — volumen compuesto.** Segundo ciclo de re-crawl. Correr `gsc-organico.js` para KPIs 4, 5, 6 y 10 (impresiones y clicks agregados por patrón). Acá se ve si el internal-link nuevo de `ProvinceCluster` traccionó impresiones hacia `/precios/*` (KPI 6) y si el conjunto geo creció +40% (KPI 10).

6. **Tráfico y conversión (GA4).** Correr `ga4-hoy.js` en paralelo para confirmar que el clic extra se traduce en sesiones reales y eventos de valor (clics a WhatsApp / contacto en las páginas-provincia), no solo en impresiones de GSC.

**Criterio de éxito del sprint:** a 28d, CTR de los silos frigoríficos-provincia subiendo claramente hacia el target (apuesta principal) + FAQ schema reconocido en GSC. A 56d, +40% en clicks orgánicos geo agregados. Si el CTR no se mueve a 28d con el title ya re-indexado, la hipótesis de copy se refuta y se itera antes de invertir en el backlog B.