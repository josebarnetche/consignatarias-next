# Universo de marca — auditoría de aplicación y mapa de oportunidades

> **2026-07-06.** Barrido completo de `src/app` (89 páginas) + `src/components`.
> Puntaje global al auditar: **5,5 / 10**. → **IMPLEMENTADO EN v1.114.0 (06-jul)**: las 60
> oportunidades ejecutadas (23 empty states, 21 heros/fondos, 31 emails, loading/error, 14
> componentes, assets deployados). Este doc queda como registro del mapa y del patrón de auditoría.
> Assets fuente en `marca/` (gitignorado); deployados en `public/marca/`.

## Puntaje por dimensión

| Dimensión | Nota | Evidencia |
|---|---|---|
| Identidad base (logo, favicon, tipografía, paleta) | **9/10** | Isotipo/lockup correctos en nav+footer; favicon transparente (06-jul); JetBrains Mono y paleta carbón/cielo impecables en todo el sitio |
| Sistema de acentos | **9/10** | Consolidación v1.88: cielo único acento, semánticos respetados, doctrina en `tokens.ts` |
| OGs / compartibles | **8/10** | OG dinámicos per-slug con marca (`src/lib/og/brand.tsx`) — cubren cientos de URLs |
| Iconografía aplicada | **3/10** | `iconos-color`/`glifos-color` solo en overview, mercado, precios, /mcp y 404 — **7 archivos de 89 páginas** |
| Ilustración / renders (universo emocional) | **2/10** | Solo hero-pampa (landing) y feat-mcp + alambrado (/mcp). Los otros **11 renders feat-\*, 25 linocuts del relato y 8 ilu-c-\* están sin deployar siquiera** |
| Empty states / momentos vacíos | **1/10** | Solo el 404 tiene marca; ~23 empty states de texto pelado |
| Emails | **0/10** | `email.ts` (2.094 líneas): ni un solo logo/imagen en ningún template |
| Estados de sistema (loading/error) | **0/10** | No existe ningún `loading.tsx` ni `error.tsx` en todo `src/app` |

**Global: 5,5/10.** La marca está perfecta *como sistema* (color, tipo, logo, tokens) y casi ausente
*como universo* (ilustración, íconos, celebración, atmósfera) fuera de las 5 superficies estrella.

---

## Las 60 oportunidades (archivo → qué hay → qué va)

### A. Empty states (23) — resolubles YA con los íconos deployados

| # | Archivo | Hoy | Asset |
|---|---|---|---|
| 1 | `mi-cuenta/favoritos/page.tsx:166` | "Todavía no seguís ninguna consignataria" (Star de lucide) | `casa-remates` |
| 2 | `dashboard/DashboardClient.tsx:848` | "Todavía no hay leads." | `buscador-lupa` |
| 3 | `dashboard/DashboardClient.tsx:1285` | "No hay remates cargados todavía." | `martillo` |
| 4 | `cuenta/api-keys/ApiKeysClient.tsx:213` | "Todavía no generaste ninguna API key." | `agente-ia` |
| 5 | `admin/ops/page.tsx:257` | "Nadie cargó hacienda todavía" | `glifo-novillo` |
| 6 | `admin/ops/page.tsx:314` | "No hay registros de crons aún" | `onda` |
| 7 | `admin/claims/page.tsx:113` | "No hay solicitudes" | `guia-dte` |
| 8 | `admin/suscriptores/page.tsx:170` | "No hay suscriptores reales aún" | `campana` |
| 9 | `components/dte/DTEHistory.tsx:228` | "Tu historial está vacío" | `guia-dte` |
| 10 | `components/video/VideoGallery.tsx:65` | "No hay videos disponibles" | `onda` |
| 11 | `components/welcome/WelcomeHero.tsx:112` | "Tu perfil todavía no registró vistas." | `buscador-lupa` |
| 12 | `components/calendario/MultiSelectList.tsx:65` | "No hay remates programados para este filtro." | `calendario` |
| 13 | `components/MagPulse.tsx:119` | "Todavía registrando operaciones…" | `onda` |
| 14 | `components/market/InmagDecadaCompleta.tsx:36` | "Todavía no hay serie suficiente…" | `indice` |
| 15 | `frigorificos/FrigorificosClient.tsx:563` | "No se encontraron frigoríficos" | `frigorifico` |
| 16 | `remates/fin-de-semana/page.tsx:341` | "No hay remates programados" | `calendario` |
| 17 | `remates/mes/[mes]/page.tsx:268` | "No hay remates programados para {mes}" | `calendario` |
| 18 | `remates/ciudad/[ciudad]/page.tsx:228` | "No hay remates registrados en {ciudad}" | `casa-remates` |
| 19 | `remates/tipo/[tipo]/page.tsx:246` | "No hay remates de {tipo}" | `martillo` |
| 20 | `remates/_views/RematesProvinceView.tsx:491` | "No hay remates registrados en {prov}" | `martillo` |
| 21 | `remates/RematesClient.tsx:1038` | "No hay remates para este período" | `calendario` |
| 22 | `components/landing/ConsignatariaSearch.tsx:61` | "Sin resultados" | `buscador-lupa` |
| 23 | `remates/[slug]/[tipo]/page.tsx:245` + `precios/[categoria]/[provincia]/page.tsx:361` | "No hay remates de…" | `martillo` |

→ **Patrón a extraer**: componente `<EmptyState icon copy cta>` (estilo del 404) y reemplazar los 23.

### B. Section-pages sin hero/fondo de marca (21)

| # | Página | Asset (fuente `marca/`) |
|---|---|---|
| 24 | `mercado/pulso` | fondo `onda` sutil o render `feat-remates-vivo` |
| 25 | `mercado/internacional` | `ilu-c-tropa-aerea` o pattern `rel-*` |
| 26 | `mercado/spread` | `feat-inmag-vivo` + ícono `indice` |
| 27 | `mercado/inmag` (MarketHero sin imagen) | `feat-inmag-vivo` de fondo |
| 28 | `mercado/arrendamiento` | `feat-arrendamiento` + pattern alambrado (`rel-04`) |
| 29 | `mercado` (index) | banda `hero-pampa` o pattern `rel-*` |
| 30 | `login` (cero marca) | isotipo + `martillazo.svg` o `hero-pampa` lateral |
| 31 | `el-oraculo` | renders del Oráculo (ya generados en `marca/renders`) |
| 32 | `dte` | `feat-guias` + `guia-dte` |
| 33 | `calculadora` | `bascula` / `dolar-billete` |
| 34 | `exportar` | `feat-archivo-historico` |
| 35 | `calendario-exportar` | `calendario` |
| 36 | `cuenta/reportes` | `indice` / `guia-dte` |
| 37 | `enterprise` | `feat-api` + `agente-ia` |
| 38 | `api-docs` | `feat-api` + `agente-ia` |
| 39 | `remates/en-vivo` | `feat-remates-vivo` como hero |
| 40 | `quienes-somos` (100% texto) | `ilu-c-corral-cenital`, `hero-arreo`, `marca-fuego` |
| 41 | `planes` | `casa-remates` (card ámbar) + `agente-ia` (cards cielo) |
| 42 | `consignatarias` (directorio) | `feat-buscador` / `feat-perfiles` |
| 43 | `mercado/vender-ahora` | `feat-vendo-ahora` |
| 44 | páginas SEO texto-only (`glosario`, `preguntas-frecuentes`, `metodologia`, `calidad`, `como-elegir-consignataria`) | pictogramas por término + `ilu-c-*` de cabecera |
| 44b | `mercado/novillo-historico` | render `feat-archivo-historico` o `ilu-c-luna` de fondo del hero |

### C. Emails (1 sistémica, vale por 10)

| # | Qué |
|---|---|
| 45 | `src/lib/email.ts` — **ningún template tiene identidad visual**. Header con isotipo (hosteado en `public/marca/email/`) + pie con wordmark. Mapeo: sell-zone→`alerta`, price-alert→`indice`, remate-reminder→`calendario`, digest→`casa-remates`, welcome→`martillazo` estático |

### D. Estados de sistema (2)

| # | Qué |
|---|---|
| 46 | **No existe `loading.tsx` ni `error.tsx` en todo `src/app`** → crear globales con marca: loading = `onda` pulsando (el pulso de la sonda del manual); error = `buscador-lupa` estilo 404 |

### E. SVG genéricos → pictogramas propios (5+)

| # | Archivo | Hoy | Va |
|---|---|---|---|
| 47 | `components/Paywall.tsx:99` | candado heroicon | pictograma acceso (37 en fuente) |
| 48 | `mi-cuenta/favoritos:164` | Star de lucide | pictograma seguir |
| 49 | `components/HerramientasCTA.tsx` | 4 cards solo texto | `bascula`/`glifo-novillo`/`alerta`/`dolar-billete` |
| 50 | `RematesFilterBar`, `FollowButton`, `AddToCalendarButton` | heroicons | `calendario`/pictogramas |
| — | (35 archivos con heroicons inline detectados por grep — revisar 1×1) | | |

### F. Componentes UI con marca (7)

| # | Componente | Idea |
|---|---|---|
| 51 | `ui/Badge` + `badges/ProBadge` | isotipo como sello |
| 52 | `landing/CoverageMap` | glifos/casa-remates por provincia |
| 53 | `landing/SinceLastVisit` | `onda`/`campana` |
| 54 | familia signup (`NewsletterSignup`, `PriceAlertSignup`, `SellZoneAlertSignup`, `ArrendamientoLiquidacionSignup`, `PriceThresholdAlertSignup`, `CierreMensualSubscribe`) | `campana`/`alerta` + renders `feat-newsletter`/`feat-alertas` |
| 55 | `ConsignatariaShowcase` ×2 | `casa-remates` |
| 56 | onboarding (`WelcomeChecklist`, `ProfileProgressTracker`, `OnboardingPrompt`) | `guia-dte` + glifos de progreso |
| 57 | `dte/MilestoneBadges` + `SocialProofStats` | pictogramas de hito |

### G. Patterns y renders sin deployar (el tesoro dormido)

| # | Qué |
|---|---|
| 58 | Patterns linocut (`rel-04` alambrados, `rel-09` ondas, `rel-14` postes, `rel-20` caravanas, `rel-24` guarda-C) como fondos sutiles en `planes`, `enterprise`, `el-corredor`, `mercado` index, `quienes-somos`, `/pro` |
| 59 | **Los 12 renders `feat-*` no están en `public/`** — deployar y mapear 1:1 (tabla en B). Extender `marca/deploy_assets_web.py` |
| 60 | Ilustraciones `ilu-c-*` (8) para editoriales: `metodologia`, `indices`, `reporte-semanal`, `el-oraculo`, `quienes-somos` |

---

## Orden de ataque sugerido

1. **`<EmptyState>` component + los 23 empty states** (assets ya deployados, cero generación).
2. **`loading.tsx` + `error.tsx` globales** (2 archivos, patrón del 404).
3. **Deploy de los 12 renders `feat-*`** (extender `deploy_assets_web.py`) → heros de las 12 tools/secciones mapeadas.
4. **Header/footer de marca en emails** (1 refactor en `email.ts`, toca todos los templates).
5. **HerramientasCTA + familia signup** (los CTAs más vistos).
6. Patterns como fondos (`planes`, `enterprise`, `quienes-somos`).
7. Barrido heroicons → pictogramas (35 archivos, gradual).
