# PRO Usuario — Reframe de Valor (diseño)

**Fecha:** 2026-06-14 · **Estado:** ✅ implementado (build limpio, 2818 páginas)
**Objetivo:** que PRO Usuario (ARS 7.900/mes) se sienta irresistible traduciendo la
estadística abstracta en **plata sobre los animales del productor**, dando una **probada
real** y reescribiendo la oferta de *feature-list* a *resultado*.

## Diagnóstico (resumen)
PRO vende hoy una caja de 5 calculadoras que hablan en percentiles. El productor piensa en
pesos por cabeza y por camión (un camión ≈ decenas de millones de ARS; PRO cuesta <0,5% de
UNA cabeza). El producto nunca muestra ese ROI, no deja probar el valor antes del muro, y la
página de oferta lista features genéricos. Detalle completo en la conversación de auditoría.

## Alcance v1 (YAGNI)
- **¿Vendo ahora?** (`/mercado/vender-ahora`) = tool insignia, reframe completo.
- **Neto en mano** (`/calculadora`) = solo framing $/camión.
- **`/upgrade`** y **`/pro`** = reescritura outcome-first + ancla de ROI en vivo.
- **Fuera de v1:** los otros 3 tools, plan anual, tier PRO Asesor, alertas/WhatsApp.

## Decisiones de diseño (validadas)

### 1. Money translation ($/cabeza → $/camión)
- ¿Vendo ahora? suma input **`cabezas`** (default por categoría; novillo→30 ≈ camión jaula).
- El gancho **gratis** se amplía a **"Valor de tu camión"** = cabezas × kg × precio público.
  Sigue gratis (es su cantidad × precio público) — es el anzuelo monetario.

### 2. Upside estacional (honesto, regla #1)
- Dentro de PRO: "Tu mejor mes histórico (X): +Y% en USD reales → **+$/cab · +$/camión**".
- **Origen:** promedio mensual del INMAG en USD reales sobre la **década** (serie 2015→).
  `gap% = promedio(mejor mes) / nivel_real_hoy − 1`, aplicado al lote.
- **Descriptivo, no predictivo.** Sello obligatorio: *"patrón histórico, no una predicción"*.
- Si hoy ≥ mejor mes (sin upside): se muestra "estás en/por encima del pico estacional"
  (refuerza vender), nunca un número negativo disfrazado.

### 3. Probada gratis — 1 veredicto completo / semana
- Un free desbloquea el análisis completo de **UNA categoría, 1 vez cada 7 días**.
- **Mecánica server-side, sin tabla nueva:** cookie httpOnly `cnsg_free_verdict` =
  `"<semanaISO>:<categoria>"` (maxAge 8 días).
  - sin cookie / otra semana → **concede** probada (payload completo + `taste:true`) y setea cookie.
  - misma semana + misma categoría → sigue mostrando (re-view de lo ya gastado).
  - misma semana + otra categoría → `locked` con teaser "Tu probada fue X. Próxima en N días".
- PRO real: sin cambios. Anónimo y free comparten la mecánica (bajo riesgo: es una probada).
- El cómputo pesado (fetch histórico) corre solo si `isPro || tasteGranted`.

### 4. `<ProReveal>` gana modo `taste`
- 3er estado además de PRO (children reales) y free (borroso+overlay):
  **`tasteUnlocked`** → children **reales** + banner "🎁 Probada gratis de esta semana" +
  footer "Próxima en N días · Desbloqueá todo con PRO". Props nuevas:
  `tasteUnlocked?: boolean`, `tasteResetDays?: number`.

### 5. Reescritura de oferta
- **`/upgrade`** outcome-first: headline = transformación ("Sabé cuánto vale tu camión y a
  quién mandárselo — antes de cargar"); **ancla ROI en vivo** (camión ≈ $X; PRO = <0,5% de
  una cabeza); las 5 tools como **decisiones** (reusa `PRO_TOOLS`); gancho de probada; precio.
- **`/pro`** hero gana el ancla $/camión + ROI y una línea de probada.

## Analytics
- Nuevo evento tipado `free_taste_unlock` (categoría) — fired client-side al recibir `taste:true`.

## Regla #1
Todo número es real (INMAG, dólar blue, serie histórica) o se omite. El upside lleva siempre
el sello "patrón histórico, no predicción".

## Archivos
- `src/app/api/vender-ahora/route.ts` — cabezas, upside estacional, taste cookie.
- `src/components/pro/ProReveal.tsx` — modo taste.
- `src/app/(terminal)/mercado/vender-ahora/VenderAhoraClient.tsx` — cabezas, $/camión, upside, banner.
- `src/lib/analytics.ts` — `trackFreeTasteUnlock`.
- `src/app/(terminal)/calculadora/CalculadoraClient.tsx` — framing $/camión.
- `src/app/(terminal)/upgrade/page.tsx` — rewrite outcome-first.
- `src/app/(terminal)/pro/page.tsx` — hero ROI + probada.
