# Reporte integral — Suite PRO Usuario, consignatarias.com.ar

## 1. Resumen ejecutivo

Se trabajó de punta a punta toda la suite de productos PRO Usuario de la terminal de mercado, unificándolos bajo **un único estándar de producto** y un **componente compartido** que materializa la estrategia comercial de gating "blando".

El estándar PRO se sostiene en tres ejes que ahora se aplican igual en todos los productos:

- **GATED (gancho gratis → premium gated):** el gancho gratuito (data pública real, con valor por sí solo) queda SIEMPRE fuera del candado y se ve incluso anónimo; la capa premium es **la decisión** (no el dato suelto) y vive dentro del gate. Nunca hay muro duro, ni redirect a `/planes`, ni login wall: el usuario free ve la **forma borrosa**, no la cifra.
- **VISTOSO:** sistema visual terminal oscuro coherente — número-hero, barras semánticas, colores semánticos fijos, paneles PRO con borde accent, estados loading/empty/error honestos, mobile-first con tap targets ≥40px.
- **ÚTIL:** cada panel PRO cierra en una **lectura accionable que cambia una decisión** ("vender / aguantar", "conviene engordar", "cobrás más rápido en X"), no en un número aislado.

Se intervinieron **5 productos** (`vender-ahora`, `comparar`, `calculadora`, `mercado/spread`, `mercado/inmag`), se creó el **componente/estándar compartido** (`src/components/pro/`) y se documentó el estándar (`docs/PRO-PRODUCT-STANDARD.md`). Build final limpio: `tsc --noEmit` y `pnpm build` ambos exit 0, **sin un solo fix de integración** entre las ediciones paralelas.

## 2. El componente / estándar compartido y por qué unifica

Antes cada producto resolvía el gating "a mano": candados `🔒` inline, paneles bespoke, `<ProUpgradePrompt variant="card">`, links sueltos a `/planes?from=…`, branching manual `session.tier === 'pro'`. Resultado: inconsistencia visual, distintos CTA, distintos comportamientos de loading y analytics dispares.

La solución fue un **barrel único** `@/components/pro` con tres piezas:

- **`<ProReveal>`** (client) — el gate reusable. Si el usuario es PRO renderiza los `children` **verbatim**; si está cargando muestra skeleton borroso **sin CTA** (evita el flash); si es free/anónimo muestra el `placeholder` (o un skeleton interno no-real) borroso + overlay con label "PRO Usuario", la frase de `benefit`, el CTA `Desbloquear con PRO — ARS $7.900/mes →` y "Sin permanencia". Redirige a `/upgrade?next=<from>` (no a `/planes`). Emite analytics `pro_prompt_view` / `pro_prompt_click` con variant `'reveal'`, contando la impresión **una sola vez** y solo a no-PRO.
- **`<HeroNumber>`** (server) — número-hero pre-formateado (`tabular-nums`), con tono semántico (`neutral/positive/warning/negative/accent`). No calcula nada: recibe el valor ya formateado.
- **`<StatPill>`** (server) — barra + valor% sobre dato **real** 0–100, con coloreo percentil por defecto (verde ≥70 / ámbar ≥40 / rojo <40), clampada.

Por qué unifica: un solo lugar define el CTA, el precio, el copy del overlay, el comportamiento de loading sin flash, la regla "el free ve la forma no el dato" y los eventos de analytics. Cambiar el precio o el copy del upsell es ahora **una edición, no cinco**. Edit colateral mínima: en `src/lib/analytics.ts` se agregó el tipo `ProPromptVariant` y se amplió el set de variantes a `'inline' | 'card' | 'reveal'` sin romper callers existentes.

## 3. Tabla por producto — VISTOSO / ÚTIL / GATED

| Producto | GATED (qué cambió) | VISTOSO | ÚTIL (la decisión) |
|---|---|---|---|
| **1. Vender ahora** (`/mercado/vender-ahora`) | Se eliminó el panel de gating bespoke (su `<Link>` + `PercentileBar` propios) y se unificó a `<ProReveal>`. Gancho gratis (Valor actual, data pública de `market-prices.json`) fuera del gate, visible anónimo. La decisión (percentiles + veredicto + lectura) dentro del gate. Render real PRO pasado como `children`; no-PRO ve skeleton no-real. | Valor por cabeza con `<HeroNumber>` (ARS neutral + USD accent, `text-3xl`). Percentiles vía `<StatPill>`. Mín/Prom/Máx 5y migrados a `<HeroNumber>`. Nueva fila de variación semanal con color semántico real. Tap targets `min-h-[40px]`, grid mobile-first. | API devuelve `veredicto: 'vender'\|'aguantar'\|'neutro'` derivado de umbrales reales de percentil, mostrado como bloque-veredicto arriba del análisis. **Fix honesto:** `precision: 'preciso'\|'indicativo'` — novillo (base INMAG) = "preciso"; resto = banner ámbar explícito (el percentil refleja dirección del mercado, no serie propia). |
| **2. Comparar** (`/comparar`) | Se eliminaron los dos candados `🔒 PRO` inline (medios de pago / días de cobro) y el `<ProUpgradePrompt variant="card">`, migrando todo a **un solo** `<ProReveal from="/comparar">` con panel "Condiciones comerciales — PRO". Tabla pública + "Mejor encaje" visibles anónimo. Blur con `placeholder` (`TermsSkeleton`) keyado a la selección, sin filtrar ni fabricar. Se sacó el viejo `/planes?from=…`. | Panel "Mejor encaje" con borde accent, `<HeroNumber tone="accent">` nombrando la recomendada + 3 `<StatPill>` por consignataria (actividad/volumen/trayectoria). "Próximos remates" a primera fila, verde si >0. Empty honesto (`s/d`, "Sin publicar"). Tap targets `min-h-[44px]`, email-capture en columna en mobile. | Score "Mejor encaje" 0–100 solo de señales reales normalizadas (actividad ×0.5 + volumen ×0.3 + trayectoria ×0.2 + nudge +4 si verificado) → veredicto "Recomendada: X · supera a Y". En PRO cierra con `fastestPayer`: "Cobrás más rápido en X — N días". Disclaimer: encaje relativo, no recomendación de inversión. |
| **3. Calculadora** (`/calculadora`) | Se eliminó el branching manual `session.tier === 'pro'` + `ProUpgradePrompt` y se unificó a `<ProReveal from="/calculadora" title="Neto en mano">`. Gancho gratis (Valor bruto estimado: cabezas, kilos, bruto ARS/USD, $/kg) fuera del gate, anónimo incluido. La decisión (neto en mano: waterfall + inputs + veredicto) dentro. No-PRO ve `NetbackPlaceholder` no-real (inputs vacíos, montos como barras, neto `$ — — —`). | Bruto y neto con `<HeroNumber>` (bruto `positive`, neto `accent`, `text-3xl sm:text-4xl`). Waterfall bruto→neto con deducciones en rojo. `<StatPill>` para reparto ("Te queda" percentil / "Se va en costos" negative). Grids mobile-first. | Veredicto dinámico según % de descuento sobre el bruto con banda honesta (≤8% sano / ≤12% al límite / >12% alto) y color semántico. La frase dice qué HACER (negociar comisión/flete, comparar consignatarias, vender más cerca de plaza). Se agregó `brutoPorKg` y `retenidoPct` derivados. |
| **4. Spread** (`/mercado/spread`) | Antes: todo gratis, sin gate. Ahora gating soft con `<ProReveal from="/mercado/spread">`. Gancho gratis (ratio spread, veredicto rentable/comprimido, 3 componentes, "Interpretación") visible anónimo e indexable — SEO intacto. La decisión ("¿Conviene engordar ahora?" + margen de seguridad) gated; free ve `DecisionPlaceholder` sin números reales. | Número-hero del spread con `font-terminal tabular-nums`. Los 3 componentes (novillo INMAG / maíz FOB / dólar) a `<HeroNumber>`. Panel PRO: dos `<HeroNumber>` semánticos (veredicto + margen) + dos `<StatPill>` (holgura percentil, maíz 73%). Estados loading/error/empty separados, cleanup `cancelled` en el fetch. | Veredicto accionable: ENGORDAR / ENGORDAR CON CAUTELA / NO INGRESAR HACIENDA según distancia real al umbral 12:1, con frase de qué hacer. Se corrigió lógica: el error se trackea explícito (antes `data===null` mezclaba loading y fallo). |
| **5. INMAG — La década completa** (`/mercado/inmag`) | Se unificaron **dos** sub-productos (estacionalidad + export CSV) al patrón `<ProReveal from="/mercado/inmag">`. Estacionalidad: heatmap 3 años + mejor/peor mes + lectura del mes en curso fuera del gate; ranking mes-a-mes de la década (z-score) dentro. CSV: se reemplazó `HistoryDownloadPro` (link amber a `/planes?from=…`) por `InmagHistoryExport` gated; PRO ve botón real a `/api/market/inmag-export` (re-valida tier server-side, defensa en profundidad); free ve la forma del dataset (columnas + recuento) borrosa. Footer ancla a `#decada-completa`. | Paneles PRO borde accent, `HeroNumber` (mejor/peor mes), `StatPill` con color por firmeza estacional, heatmap SVG reutilizado, loading Suspense (skeleton 420px), empty honesto. Mobile-first. | Cierra en decisión: "¿Qué mes históricamente conviene vender?", mejor/peor mes por promedio de z-score sobre la década, lectura del mes en curso ("por encima/debajo de su año → vender/esperar") y cierre "corré la hacienda hacia los meses verdes". Todo desde `mag_inmag_history` real, una sola query. |

## 4. Riesgos y cosas dejadas fuera por falta de data (honesto)

Aplicando la regla #1 (no inventar datos), varias mejoras quedaron deliberadamente como **etiquetado honesto** en vez de cifras fabricadas:

- **Vender ahora — sin serie histórica por categoría:** `fetchInmagUsdJoined` solo expone INMAG/novillo. Por eso el fix es el banner de precisión "indicativo", no un percentil por categoría. El `veredicto` para categorías no-novillo hereda esa naturaleza indicativa (cubierto por el banner).
- **Comparar — score heurístico, no benchmark de mercado:** los pesos (0.5/0.3/0.2, +4 verificado) son una elección de producto, documentada en el código para tunear. No hay match contra la provincia/tipo del propio productor (no existe ese input); el encaje es **relativo entre las seleccionadas**, no absoluto. `fastestPayer`/medios dependen de que la consignataria haya publicado `medios_pago` en Supabase; si falta, "Sin publicar" / "—" (sin fabricar).
- **Calculadora — banda 8%/12% es heurística de lectura, no dato de fuente:** expresada como guía de negociación. No hay fuente de "comisión promedio de mercado", así que NO se muestra; el veredicto compara contra el bruto del propio usuario. Inputs (comisión/gastos/flete) 100% editables con defaults conservadores (3%/2%/0).
- **Spread — sin margen $/cabeza real:** el JSON no trae costo de compra, ración ni conversión maíz→carne. El panel PRO se construye solo con números reales presentes (spread, umbral); "distancia al umbral" y "margen de seguridad %" son derivaciones honestas. `holgura` (0–100) es escala de lectura lineal declarada en comentario; el `73%` del maíz es la constante editorial ya existente. La API expone `meta.sources` (momentum por leg) pero `SpreadData` no lo tipa — sumar "momentum esta semana" requiere tocar la API (mejora futura, fuera de scope).
- **INMAG — exposición RSC:** `ProReveal` recibe el panel real como `children`; los números viven en el payload RSC aunque solo se rendericen a PRO (el blur es skeleton). Es el modelo inherente del componente compartido y no se modificó (regla: usarlo al pie de la letra). El **CSV sí** está doblemente protegido por el route server-side. Quedó `HistoryDownloadPro.tsx` en disco sin uso (regla no-borrar); ya no lo importa nadie.

## 5. Estado de build y archivos tocados

**Verificación final:** `tsc --noEmit` exit 0, sin errores. `pnpm build` exit 0, build de producción completo con todas las rutas prerenderizadas. **Fixes de integración necesarios: NINGUNO** — el barrel `@/components/pro` resuelve, todos los usos de props de `ProReveal`/`HeroNumber`/`StatPill` chequean, sin imports faltantes ni colisiones de nombre entre las ediciones paralelas.

**Componente / estándar compartido (nuevo):**
- `/Users/josebarnetche/consignatarias/src/components/pro/ProReveal.tsx`
- `/Users/josebarnetche/consignatarias/src/components/pro/HeroNumber.tsx`
- `/Users/josebarnetche/consignatarias/src/components/pro/StatPill.tsx`
- `/Users/josebarnetche/consignatarias/src/components/pro/index.ts` (barrel)
- `/Users/josebarnetche/consignatarias/docs/PRO-PRODUCT-STANDARD.md`

**Componentes INMAG (nuevos):**
- `/Users/josebarnetche/consignatarias/src/components/market/InmagDecadaCompleta.tsx`
- `/Users/josebarnetche/consignatarias/src/components/market/InmagSeasonalityGate.tsx`
- `/Users/josebarnetche/consignatarias/src/components/market/InmagHistoryExport.tsx`

**Modificados:**
- `/Users/josebarnetche/consignatarias/src/lib/analytics.ts` (tipo `ProPromptVariant` + variante `'reveal'`)
- `/Users/josebarnetche/consignatarias/src/app/(terminal)/mercado/vender-ahora/VenderAhoraClient.tsx`
- `/Users/josebarnetche/consignatarias/src/app/(terminal)/mercado/vender-ahora/page.tsx`
- `/Users/josebarnetche/consignatarias/src/app/api/vender-ahora/route.ts`
- `/Users/josebarnetche/consignatarias/src/app/(terminal)/comparar/CompararClient.tsx`
- `/Users/josebarnetche/consignatarias/src/app/(terminal)/calculadora/CalculadoraClient.tsx`
- `/Users/josebarnetche/consignatarias/src/app/(terminal)/mercado/spread/SpreadClient.tsx`
- `/Users/josebarnetche/consignatarias/src/app/(terminal)/mercado/inmag/page.tsx`

*Nota: `page.tsx` de vender-ahora y los directorios `debug-2026-05-30/`, `geo-audit-2026-05-30/`, más los docs/scripts sueltos (`DRAFT-captura-resultados-remate-AI.md`, `STATE-2026-05-31.md`, `scripts/archive/`), son cambios preexistentes del working tree, no producidos por este pase.*

No se hizo commit ni push (reservado a pedido explícito).

## 6. Próximos pasos (lo que no entró)

- **Serie histórica por categoría (Vender ahora):** si se carga una serie real por categoría en el data lib, reemplazar el banner "indicativo" por percentiles propios y un veredicto preciso para no-novillo.
- **Zona del productor (Comparar):** capturar provincia/tipo del propio productor para sumar una 4ta señal real al score "Mejor encaje" y pasar de encaje relativo a absoluto.
- **Momentum del spread (Spread):** tipar `change` de cada leg desde la API para sumar "momentum esta semana" al panel PRO (requiere tocar la API).
- **Benchmark de comisión (Calculadora):** si aparece una fuente real de comisión promedio de mercado, contrastar el veredicto contra benchmark en vez de solo contra el bruto del usuario.
- **Exposición RSC del gate:** evaluar a futuro un patrón donde los números PRO no viajen en el payload a no-PRO (hoy se acepta por usar el componente compartido al pie de la letra; el CSV ya está protegido server-side).
- **Limpieza:** `HistoryDownloadPro.tsx` quedó huérfano en disco; borrarlo cuando se levante la regla no-borrar.
- **Tuneo de pesos:** los pesos del score de Comparar y las bandas 8%/12% de Calculadora quedaron documentados en código para ajuste de producto con feedback real.