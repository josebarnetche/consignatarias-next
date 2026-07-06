# Reporte de debug — deploy consignatarias-next

**Fecha:** 2026-05-30
**Commit deployado:** `960bd9d` (data: update auctions (439) + match videos — 2026-05-29)
**Build local reproducido:** EXIT_CODE=0 (igual que Vercel — el deploy **no falló**)
**Versión:** 1.18.0 · Next.js 15.5.12 · pnpm 10.30.2 · node 25

---

## TL;DR

El deploy **terminó exitosamente** ("Build Completed" / "Deployment completed", exit 0).
Lo que viste como "errores" son **1 error de build no-fatal + varias advertencias**. Ninguno
rompe el sitio en producción, pero conviene limpiarlos. Reproduje el build localmente y todo
coincide salvo las advertencias de Vercel-packaging (que no aparecen en `next build`).

Severidad ordenada:

| # | Issue | Severidad | ¿Rompe prod? | Nuevo en este deploy? |
|---|-------|-----------|--------------|----------------------|
| A | `/api/top-followed` — DYNAMIC_SERVER_USAGE | Media (ruido) | No | No (existe desde 22/04) |
| B | `vercel.json` → `memory` ignorado (Active CPU) | Baja | No | No |
| C | OG/twitter/apple-icon: "Unable to find source file" | Baja | No | No |
| D | 17 warnings ESLint (unused vars + 2 hooks) | Baja (higiene) | No | No |
| E | Scripts de build ignorados (sharp, etc.) por pnpm 10 | Baja | No | No |

---

## A — `/api/top-followed`: Dynamic Server Usage (el "error" del log)

**Log Vercel:**
```
Top followed API error: Error: Dynamic server usage: Route /api/top-followed
couldn't be rendered statically because it used `request.url`.
digest: 'DYNAMIC_SERVER_USAGE'
```
**Reproducido localmente:** sí (idéntico).

**Causa raíz:** `src/app/api/top-followed/route.ts` declara `export const revalidate = 3600`
(le pide a Next que la cachee/prerenderice estáticamente) **pero** dentro del handler hace
`new URL(request.url)` para leer `?limit=`. Leer `request.url` es una operación dinámica →
choca con `revalidate` → Next lanza el error al intentar prerenderizarla en build.

**Impacto real:** **ninguno en runtime.** La ruta se sirve dinámica igual y el único consumidor
(`src/components/ui/TopFollowed.tsx`, fetch del lado del cliente) funciona. El `revalidate=3600`
**no tiene efecto** y solo ensucia el log de build. Existe desde el commit `f926a7e` (22/04/2026),
no es nuevo de este deploy.

**Es la única ruta con este patrón** (verifiqué `revalidate` + lectura de request/searchParams en
todo `src/app/api` → solo aparece esta).

**Fix propuesto (1 línea):** reemplazar `export const revalidate = 3600` por
`export const dynamic = 'force-dynamic'`. La ruta ya cachea vía header
`Cache-Control: s-maxage=3600, stale-while-revalidate=86400`, así que no se pierde caching de CDN.

---

## B — `vercel.json`: setting `memory` ignorado

**Log Vercel:**
```
Warning: Provided `memory` setting in `vercel.json` is ignored on Active CPU billing.
You can safely remove this setting from your configuration.
```
**Causa:** Vercel migró a facturación **Active CPU** (CPU activo + memoria provisionada +
invocaciones), donde el `memory` fijo por función ya no aplica. `vercel.json` tiene `"memory"`
en 5 bloques de `functions`.

**Fix propuesto:** quitar las claves `"memory"` de `vercel.json`, conservando `maxDuration`
(eso sí sigue aplicando).

---

## C — "Unable to find source file" (OG / twitter / apple-icon)

**Log Vercel:**
```
WARNING: Unable to find source file for page /(terminal)/consignatarias/[slug]/twitter-image-19c3d9/route ...
WARNING: ... /(terminal)/consignatarias/[slug]/opengraph-image-19c3d9/route ...
WARNING: ... /apple-icon/route ...
WARNING: ... /(terminal)/remates/[slug]/opengraph-image-1yas3k/route ...
```
**NO se reproduce en `next build` local** → es de la capa de empaquetado de `vercel build`.

**Causa:** los archivos fuente existen (`opengraph-image.tsx`, `twitter-image.tsx`,
`apple-icon.tsx`), pero Next genera nombres de ruta con **hash** (`opengraph-image-19c3d9/route`)
para desambiguar. Vercel intenta mapear ese nombre hasheado a un archivo `*.tsx` y no lo
encuentra. **Consecuencia:** el `functions` glob de `vercel.json`
(`src/app/**/opengraph-image.tsx`) podría no aplicarse a esas rutas → no se aplica el
`maxDuration: 30` (el `memory` ya es ignorado por B de todos modos).

**Impacto real:** mínimo. Las imágenes OG se generan bien. Solo podrían correr con el
`maxDuration` por defecto (300s) en vez de 30s. Es una advertencia conocida de Vercel + rutas
de imagen dinámicas con `generateStaticParams`.

**Opciones:** (a) dejarlo (cosmético), o (b) quitar los globs de OG/twitter de `functions` en
`vercel.json` si ya no aportan (dado que memory se ignora y maxDuration 300 default es aceptable
para generación de imágenes).

---

## D — 17 warnings de ESLint (no bloquean build)

Todos son `@typescript-eslint/no-unused-vars` (variables/imports sin usar) salvo 2 de
`react-hooks/exhaustive-deps`. **No fallan el build** (son warnings). Archivos:

- `consignatarias/[slug]/ConsignatariaProfileClient.tsx` — `useState` sin usar
- `consignatarias/[slug]/page.tsx` — `getAllCanonicalSlugs` sin usar
- `frigorificos/[slug]/page.tsx` — `isHabilitadoVigente` sin usar
- `login/FounderUrgency.tsx` — `setData`, `setVisible` sin usar
- `mercado/inmag-dolares/page.tsx` — `usdSeries`, `arsSeries` sin usar
- `mi-ganado/MiGanadoClient.tsx` — **hook**: dependencia faltante `prices.inmag` en useMemo (línea 249)
- `planes/SocialProofToast.tsx` — `setSignups` sin usar
- `remates/RematesClient.tsx` — `setFeaturedSlugs` sin usar
- `remates/anteriores/page.tsx` — `normalizeUrl` sin usar
- `remates/en-vivo/page.tsx` — `getCanonicalSlug` sin usar
- `api/cron/mag-lots-worker/route.ts` — `stripTags` sin usar
- `api/vender-ahora/route.ts` — `createAdminClient` sin usar
- `page.tsx` — `todayEnVivo` sin usar
- `components/AnimatedPrice.tsx` — `easeOutSuperSlow` sin usar
- `components/charts/InteractivePriceChart.tsx` — **hook**: objeto `padding` recreado cada render (línea 78/164)

> Nota: el de `MiGanadoClient` (dependencia faltante en useMemo) y el de `InteractivePriceChart`
> (objeto recreado) son los únicos con potencial impacto funcional sutil (re-render / valor
> stale); el resto es puro lint cosmético.

---

## E — Scripts de build ignorados por pnpm 10

**Log:** `Ignored build scripts: core-js, protobufjs, sharp, tesseract.js, unrs-resolver`

pnpm 10 bloquea postinstall scripts por defecto. **No es problema aquí** porque
`next.config.js` tiene `images: { unoptimized: true }` → Next no usa `sharp` para optimizar.
La generación de OG usa satori/resvg (no sharp). Si en el futuro se activa optimización de
imágenes o se usa OCR (tesseract), habría que `pnpm approve-builds`.

---

## Plan de fix recomendado (mínimo, sin tocar comportamiento)

1. **A** — `src/app/api/top-followed/route.ts`: `revalidate = 3600` → `dynamic = 'force-dynamic'`.
   Elimina el error del log. (1 línea)
2. **B** — `vercel.json`: quitar claves `"memory"` de los 5 bloques `functions`. Elimina el warning.
3. **D (opcional)** — limpiar los 17 unused vars + arreglar los 2 hooks. Mejora higiene.
4. **C / E** — dejar como están (cosméticos / no aplican). Documentado por si reaparecen.

**Nada de esto es urgente ni rompe producción.** El sitio está sano. Son mejoras de limpieza.
