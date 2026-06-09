# Reporte UX integral — consignatarias.com.ar

## 1. Resumen ejecutivo

Se ejecutó un rediseño UX coordinado sobre **4 frentes PRO** del producto, partiendo de un brief de dirección de diseño único cuyo norte fue que cada vista se sienta **parte del mismo terminal oscuro**: una sola acción primaria por vista, datos exclusivamente de fuentes reales (regla #1: si falta el dato, estado vacío honesto, nunca un número fabricado), mobile-first con tap targets ≥40px, y reuso del sistema (`@/components/pro`, utilidades de `globals.css`, tokens de `tailwind.config`) antes de inventar componentes.

La regla de color transversal se mantuvo sin desviaciones en los 4 frentes:
- **accent (sky #38bdf8)** = PRO / interactivo / foco
- **amber/dorado** = atención, gamificación, B2B-consignataria
- **rojo** = en-vivo, exclusivamente
- **verde (positive)** = logrado / a-favor

**Estado de cierre: verde.** `npx tsc --noEmit` → exit 0 y `pnpm build` → exit 0 (compila y genera todas las rutas, incluida la nueva `/pro` y todas las `/remates/*`). Apareció **un único choque de integración** (Frente 1, prop `children` faltante en `<ProReveal>`), resuelto con una edición mínima al primer intento. No se hizo commit ni push.

| Frente | Vista | Componentes nuevos | Resultado |
|---|---|---|---|
| 1 — Showcase PRO | Home + nueva `/pro` | `showcase/` (4 archivos) | Sección PRO "tibia" reemplazada por highlights con jerarquía por borde + tour PRO completo |
| 2 — Reorg remates | `/remates` | `remates/RematesFilterBar.tsx` | Filtros dispersos unificados en una sola barra + chips removibles |
| 3 — Calendario multi | `/calendario-exportar` | `calendario/` (2 archivos) | De export por filtros a selección múltiple agrupada por provincia/localidad |
| 4 — Bienvenida ultra-PRO | `/dashboard` | `welcome/` (4 archivos) | Bienvenida sobria de terminal con dato real líder + próximos pasos |

---

## 2. Detalle por frente

### Frente 1 — Showcase PRO (home + `/pro`)

**Qué se hizo**
- Config canónica de las 5 herramientas PRO (`showcase/proTools.ts`) como fuente única para home y `/pro`, con helper `upgradeHref()`.
- Sección de highlights PRO en la home (`ProHighlights.tsx`, server component): **1 card HERO** ("¿Vendo ahora?", borde accent, `lg:col-span-2 lg:row-span-2`, `HeroNumber` con INMAG del día) + **4 paneles neutros** (Neto, Comparador, Spread, Histórico). Cada card muestra solo dato público real + `<ProBadge>` accent marcando la capa premium, con micro-línea free→PRO.
- Wrapper `ProTourReveal.tsx` sobre `<ProReveal>`: placeholder skeleton **no-real** (forma de la decisión —chip veredicto + 2 barras + línea de lectura, cero números); para PRO activo muestra confirmación verde "Abrir la herramienta".
- Nueva página `/pro` (tour PRO Usuario): hero + 5 secciones numeradas (panel free real | reveal gated) + tira de honestidad ("lo que no prometemos") + CTA final. Todas las cifras reales del día. Metadata + canonical + breadcrumb schema. Alta en `sitemap.ts` (priority 0.8, weekly).

**Decisiones de diseño**
- Jerarquía **por borde, no por saturación**: el contraste de borde (accent vs neutro) ES la jerarquía.
- Color disciplinado: accent = PRO/interactivo/badge; verde/rojo solo semánticos (cambio INMAG, spread vs umbral, estado PRO-activo); sin amber (reservado a consignataria/gamificación).
- Una acción primaria por vista: home → "Ver el tour PRO"; `/pro` → "Desbloquear PRO".
- Gate reutilizado: el tour usa `<ProReveal>` real, así analytics/blur/CTA quedan idénticos al resto del producto.

**Honestidad de datos (criterio explícito)**
- Spread recalculado con la misma fórmula del API real (`(inmag/usdBlue)/(corn/1000)` → 13,7:1 hoy sobre umbral 12:1), no hardcodeado.
- El card "Histórico" **no afirma año de inicio**: `market-prices.json` solo trae ventana 2024→ (349 filas), pero el tool real cubre la década (2237 filas 2015→). Derivar "2024→" de ese JSON habría subdeclarado la oferta; se usó el label cualitativo "la década completa en CSV" y se muestra INMAG de hoy como número real.

**Antes → después**
- Antes: sección "Para Usuario PRO" con 4 cards de copy estático, sin dato real ni jerarquía.
- Después: 1 hero con dato vivo + 4 paneles neutros con dato público real y teaser honesto del gate, más una página `/pro` dedicada y crawlable.

---

### Frente 2 — Reorganización de filtros de `/remates`

**Qué se hizo**
- Componente nuevo `remates/RematesFilterBar.tsx`, 100% controlado (estado y handlers viven en `RematesClient`, entran por props) y que **nunca navega**.
- Las superficies de filtro antes dispersas (3 tabs período, toggle En Vivo, buscador, dropdown Provincia, dropdown Tipo, LIMPIAR, FILTROS+ PRO, EXPORTAR PRO, y una fila de pills separada) se consolidaron en **una sola barra** en orden izq→der: `[ tabs período ] · [ En Vivo rojo ] | [ buscar ] [ Provincia ▾ ] [ Tipo ▾ ] [ LIMPIAR ] [ FILTROS+ PRO ] [ EXPORTAR PRO ]`, con `flex-wrap` para mobile.
- Debajo, **una fila de chips removibles** unifica el feedback de filtros aplicados (antes era un bloque duplicado de pills + solo el botón LIMPIAR).

**Decisiones de diseño**
- **Faceta = control con estado on/off visible**: faceta activa toma `border-accent text-accent bg-accent/5` (mismo lenguaje que el tab de período activo), incluso la flecha del dropdown vira a sky; inactiva = zinc-400.
- Jerarquía respetada: período sigue siendo **tabs** (navegación temporal, por encima de las facetas); En Vivo es la **única faceta roja** (toggle binario con contador real `enVivoCount`).
- Chips: accent para provincia/tipo/búsqueda, rojo (con punto pulsante) solo para En Vivo, cada uno con "×" en hit-area; incluye conteo de resultados a la derecha (`tabular-nums`).
- PRO intacto: FILTROS+ y EXPORTAR conservan el badge ámbar PRO para no-PRO y el redirect a `/upgrade?next=/remates` (o `/login`).
- Accesibilidad/mobile: `min-h-[40px]` en mobile, `role="tab"`/`aria-selected`, `aria-pressed`, `aria-label` por control.

**SEO aditivo (crítico)**
- No se tocó ninguna ruta (`/remates/[slug]`, `/ciudad/[ciudad]`, `/tipo/[tipo]`, `/mes/[mes]`, `hoy`, etc.) ni los quick-links SSR de `page.tsx`. La barra filtra **client-side** el dataset ya cargado por SSR; no navega al activar facetas, preservando el HTML crawlable. Todas las facetas pasan por `trackFilterApply(faceta, valor)`.

**Antes → después**
- Antes: filtros repartidos en dos superficies (barra tabs+filtros y fila de pills aparte), feedback de "qué está aplicado" solo vía el botón LIMPIAR.
- Después: una barra coherente + fila de chips removibles que unifica todo el feedback de estado.

---

### Frente 3 — Calendario multi-localidad (`/calendario-exportar`)

**Qué se hizo**
- Cambio de flujo: de **"una localidad → .ics"** a **"tildá N localidades agrupadas por provincia → un único .ics con TODOS sus remates"**.
- `calendario/multiSelectUtils.ts` (helper del frente): `localidadKey()`/`localidadLabel()` (deriva localidad de `location` "Ciudad, Provincia" con NFD + strip de acentos, espejando el `normalizeCity` de `/remates/ciudad` → "SAN JUSTO" y "San Justo" se fusionan), `buildLocalidadTree()` (árbol provincia → localidad con conteos reales A→Z), `matchesSelection()`, y `buildIcal()` que genera el VCALENDAR en cliente **campo por campo idéntico** a `/api/calendario/ical/route.ts` (mismos UID, DTSTART/DTEND +3h, SUMMARY, DESCRIPTION, GEO, CATEGORIES, escape).
- `calendario/MultiSelectList.tsx`: lista de checkboxes terminal con 3 niveles —"Seleccionar todos" (con estado **indeterminado**), header por provincia (`font-heading uppercase tracking-widest`, indeterminado/parcial `n/total`), y filas por localidad con conteo. Checkbox custom (`w-4 h-4`, `bg-accent border-accent` al marcar, dash al indeterminado — **nunca** el azul nativo del browser). Hit-areas ≥40px. Estado vacío honesto.
- `CalendarExportClient.tsx` reescrito: los pre-filtros (provincia/tipo/período-días) ahora **acotan la lista seleccionable** (un `useEffect` poda de la selección las localidades que dejan de existir al cambiar el pre-filtro); card hero accent con dos `<HeroNumber>` ("Remates seleccionados" + "Disponibles en el filtro", dato real); **barra de selección sticky** abajo (patrón MobileStickyCTA) con "N remates", subtexto de localidades, única acción primaria `Exportar selección (.ics)` (`terminal-btn-primary`, **deshabilitada si 0**) y link secundario "Limpiar". Export por **Blob client-side**; mantiene guardado opcional de email en `/api/newsletter`.

**Decisiones de diseño**
- **No se tocó el API route** (`/api/calendario/ical/route.ts` espera `provincia` única; multi-localidad por URL hubiera requerido reescribir el contrato). El .ics se genera en cliente reusando la misma lógica → restricción de tocar solo `calendario-exportar/` + helper respetada.
- Localidad = `location.split(',')[0]` normalizado (el dataset no tiene campo "localidad" propio); agrupación por `province` (campo canónico ya uppercased).
- Accent = PRO/interactivo/foco en toda la vista; sin amber/rojo (no aplica gamificación ni en-vivo). Una sola acción primaria.

**Verificación de datos**: validado contra `remates.json` real (194 remates próx. 30d, 11 provincias, BA con 55 localidades; merge de casing confirmado).

**Antes → después**
- Antes: export server-side por filtros (provincia/tipo/días) → suscripción por URL.
- Después: selección granular agrupada con seleccionar-todo/por-grupo/individual, conteos honestos y descarga de archivo .ics consistente con el API.

---

### Frente 4 — Bienvenida ultra-PRO (`/dashboard`)

**Qué se hizo**
- `welcome/welcome-utils.ts` (helpers que **nunca fabrican dato**): `formatVigencia` (ISO → "31 de julio de 2026" es-AR, `null` si no parsea), `resolveGreetingName` (nombre real o fallback a email, jamás inventa), `greetingByHour` ("Buen día/Buenas tardes/noches" en vos).
- `welcome/WelcomeHero.tsx`: panel de saludo + estado de cuenta que lidera con **UN dato real** (`<HeroNumber tone="accent">` de vistas de perfil 30d) + `<StatPill>` del percentil vs país. Borde accent (es el card hero de la vista). Estados vacíos honestos: sin verificar → "Verificá tu perfil para empezar a medir vistas"; verificado sin vistas → "Tu perfil todavía no registró vistas"; sin percentil → "El ranking nacional aparece cuando tu perfil acumula vistas".
- `welcome/ProActivatedModule.tsx`: módulo post-`/upgrade` que conserva el micro-momento (spinner accent "Pago recibido — activando…" → confirmación verde `positive` "Bienvenido a PRO" con vigencia). Lista "Esto desbloqueaste" (4 capacidades reales, sin números) + "Empecemos por esto": checklist de próximos pasos donde el primer pendiente se resalta como acción primaria, cada paso navega a su destino real.
- Tocados: `dashboard/DashboardClient.tsx` (reemplazó el toast amber post-upgrade por `<ProActivatedModule>` accent; `<WelcomeHero>` como primer elemento del tab Resumen; deriva `proConfirming`/`proNextSteps` de datos reales de sesión; **badge de tier amber → accent (sky)**; panel "TU IMPACTO" pasó a borde neutro para que WelcomeHero sea el único card hero). `onboarding/WelcomeChecklist.tsx` (header "BIENVENIDO" → "COMPLETÁ TU PERFIL" para evitar colisión, ítems pendientes tappables ≥40px). `onboarding/ProfileProgressTracker.tsx` (tap targets ≥40px).

**Decisiones de diseño**
- Color: accent = marca PRO en todo el dashboard; amber reservado a gamificación FREE y badge dorado de consignataria; verde solo para el momento "PRO activado".
- Un solo card hero por vista (WelcomeHero); TU IMPACTO quedó neutro como panel secundario.
- Tono: directo, operativo, "vos" rioplatense, sin exclamaciones de más ("Bienvenido a PRO. Tu suscripción está activa hasta el {fecha}. Empecemos por esto:"). **Recibido = orientado, no festejado.**

**Antes → después**
- Antes: toast amber genérico post-pago + checklist con header "BIENVENIDO" colisionante; tier en amber.
- Después: card hero con dato real líder, módulo de activación con micro-momento verde, próximos pasos accionables, tier en accent.

---

## 3. Qué quedó fuera / requiere tu criterio

Decisiones subjetivas o de producto que **no** se tomaron sin tu confirmación:

1. **`OnboardingPrompt.tsx` (Frente 4)** — quedó intacto: tiene un `return null` hard-coded (línea 19) deshabilitado a propósito desde 2026-03-28 ("DTE feature not mature"). Reactivarlo sería revertir una decisión de producto deliberada. **Tu criterio**: ¿se reactiva el prompt DTE o sigue dormido?
2. **Saludo sin nombre de persona (Frente 4)** — no hay `display_name` separado en la sesión Supabase; el único nombre humano real es `consignataria/frigorifico.display_name`. Para usuarios sin perfil verificado el saludo cae al email (honesto). **Tu criterio**: ¿capturar un nombre de persona en el registro? `WelcomeHero` ya lo aceptaría vía `displayName`.
3. **Conteo de consignatarias (Frente 1)** — `ProHighlights` usa `getAllProfiles().length` real (104); el layout del terminal lo tiene hardcodeado a 104 en un `useState` aparte. Hoy están en sync, pero son dos fuentes. **Tu criterio**: ¿unificar a una sola fuente para que no se desincronicen?
4. **Card "Histórico" (Frente 1)** — se evitó afirmar "2024→" (lo único derivable del JSON de la home) porque el tool real cubre 2015→. Se usó label cualitativo "la década completa en CSV". **Tu criterio**: ¿exponer el rango exacto cuando la home tenga acceso al dataset completo?
5. **Panel de filtros avanzados (Frente 2)** — el rango de fechas / cabezas mín. (PRO) se dejó como sub-superficie propia debajo de la barra, no dentro del componente nuevo, para mantener archivos disjuntos. Los chips cubren las facetas simples; el panel avanzado se muestra solo al togglear. **Tu criterio**: ¿está bien que las facetas avanzadas no generen chips, o querés feedback de chip también ahí?
6. **Quick-toggle En Vivo del strip de stats desktop (Frente 2, ~línea 883)** — preexistente, se dejó sin tocar para que el cambio fuera quirúrgico; nota: **ese no llama a `trackFilterApply`** (sí lo hace el toggle de la barra nueva). **Tu criterio**: ¿unificar para no perder analytics de ese toggle?
7. **Email opcional en calendario (Frente 3)** — la vista de export se mantuvo **pública** (capta email vía `/api/newsletter`), sin gating PRO, porque ya lo era. **Tu criterio**: confirmá que el export multi no debe quedar detrás del paywall.

---

## 4. Estado de build + archivos

**Verificación final**
- `npx tsc --noEmit` → **exit 0** (limpio).
- `pnpm build` → **exit 0** (compila + genera todas las rutas).

**Choque de integración encontrado y resuelto (1)**
- `src/components/showcase/ProTourReveal.tsx:54` pasaba a `<ProReveal>` solo `placeholder`, pero `ProReveal` requiere `children` (obligatoria) → `TS2741: Property 'children' is missing…`. Tanto tsc como build fallaban ahí.
- **Arreglo (1 edición mínima)**: se agregó `<DecisionSkeleton />` como `children`. Es seguro: el componente cortocircuita el caso PRO antes de llegar a `<ProReveal>` (devuelve su propio panel "PRO activo"), por lo que ese `children` es inalcanzable; pasar el skeleton no-real satisface el tipo y respeta la regla #1 (cero datos fabricados). Resuelto al 1er intento.

**Verificación SEO de rutas**
- Rutas `/remates` intactas, ninguna borrada. En sitemap: `/remates`, `/remates/hoy`, `/manana`, `/semana`, `/fin-de-semana`, `/anteriores`, `/en-vivo`, `/remates/[slug]`, `/remates/tipo/[tipo]`, `/remates/ciudad/[ciudad]`, `/remates/mes/[mes]`, combos provincia+tipo.
- Ruta nueva `/pro` registrada en `src/app/sitemap.ts:288`.

**Archivos creados**
- `src/components/showcase/proTools.ts`
- `src/components/showcase/ProHighlights.tsx`
- `src/components/showcase/ProTourReveal.tsx`
- `src/app/(terminal)/pro/page.tsx`
- `src/components/remates/RematesFilterBar.tsx`
- `src/components/calendario/multiSelectUtils.ts`
- `src/components/calendario/MultiSelectList.tsx`
- `src/components/welcome/welcome-utils.ts`
- `src/components/welcome/WelcomeHero.tsx`
- `src/components/welcome/ProActivatedModule.tsx`
- `src/components/welcome/index.ts`

**Archivos tocados**
- `src/app/page.tsx`
- `src/app/sitemap.ts`
- `src/app/(terminal)/remates/RematesClient.tsx`
- `src/app/(terminal)/calendario-exportar/CalendarExportClient.tsx`
- `src/app/(terminal)/dashboard/DashboardClient.tsx`
- `src/components/onboarding/WelcomeChecklist.tsx`
- `src/components/onboarding/ProfileProgressTracker.tsx`

**git status (resumen)** — 7 modificados (` M`) + untracked nuevos (`src/app/(terminal)/pro/`, `src/components/calendario/`, `src/components/remates/RematesFilterBar.tsx`, `src/components/showcase/`, `src/components/welcome/`). **No se hizo commit ni push.**

---

## 5. Próximos pasos

1. **Decidir los 7 puntos de criterio de la sección 3** (especialmente: DTE prompt, captura de nombre de persona, unificación del conteo de consignatarias y del toggle En Vivo sin tracking).
2. **QA visual en dispositivo real** — recorrer las 4 vistas en mobile (tap targets ≥40px, sticky bars, chips removibles, checkboxes terminal) y en desktop; confirmar que la disciplina de color (accent/amber/rojo/verde) se lee correctamente.
3. **Verificar `/pro` en analytics** — que `trackFilterApply` y el gate `<ProReveal>` reporten igual que el resto del producto; revisar que el tour aparezca en GSC tras la alta en sitemap.
4. **Commit por frente** (sugerido, para historial limpio): 4 commits namespaced (`showcase/`, `remates/`, `calendario/`, `welcome/`) + 1 de integración (fix `ProTourReveal` + sitemap). Hoy **no hay commit/push**; queda a tu orden.
5. **Smoke test del .ics multi-localidad** — importar un archivo generado en Google Calendar / Apple Calendar y confirmar que UID/DTSTART/+3h/GEO se ven idénticos a la suscripción por URL del API.
6. **Limpieza de untracked ajenos** — el árbol tiene untracked no relacionados a este trabajo (`debug-2026-05-30/`, `geo-audit-2026-05-30/`, `scripts/archive/*`, `docs/DRAFT-*`, `docs/STATE-*`); decidir si entran al `.gitignore` o se versionan aparte.