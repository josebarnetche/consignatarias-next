# Roadmap

**Current:** v1.192.0 (2026-08-10) — see [CHANGELOG.md](CHANGELOG.md) for the full per-version history.
**Strategic frame:** [docs/strategy/PLAN-DE-NEGOCIOS-2026.md](docs/strategy/PLAN-DE-NEGOCIOS-2026.md)
(plan de negocios v2, 36 meses — el marco canónico) + [docs/strategy/POSITIONING-THESIS.md](docs/strategy/POSITIONING-THESIS.md)
(tesis de categoría). **Dos motores de ingreso secuenciados** sobre la capa de datos libre y citable:
**Motor 1 — PRO Consignataria** (cuña de caja, meses 0–12) **financia y alimenta** →
**Motor 2 — capa de datos e índice institucional** (API/MCP, el *prize* y el moat, meses 6–36).
Techo realista (SOM 3 años, TC ARS 1.450/USD): base ~ARS 142M ≈ **USD 98k ARR** / expansivo ~ARS 370M ≈
**USD 255k ARR**. Negocio de información sectorial de alto margen y nicho, no venture-scale.
**Versioning:** [docs/VERSIONING.md](docs/VERSIONING.md) — the Enterprise API contract (v1.0.0) is the
MAJOR boundary, so the product stays on 1.x.

> The original "v1.20 — First Revenue Milestone" target was met-and-surpassed as a *build* goal: the
> platform is no longer the bottleneck. **$0 revenue is still real** — but as of v1.30 the path to the
> first dollar is **unblocked** (email-first checkout live for both B2C and Enterprise, verified to
> reach a real Rebill payment link). The remaining gate is a real test payment + the institutional
> sales motion — not more code.

---

## Próximas versiones (esperadas)

> **Nota de versionado:** los números son **indicativos**, no compromisos — el versionado es por *trains*
> de features (un train puede juntar varias) y las prioridades ceden ante la señal comercial. El orden y el
> *gate* de cada horizonte sí son firmes. `v2.0.0` queda **reservado** para un cambio *breaking* del contrato
> Enterprise API (hoy v1.0.0); mientras el contrato no rompa, el producto sigue en 1.x.

### Horizonte 1 — cerrar el loop de captura → primer peso (v1.188 → ~v1.20x) · **Motor 1**

El motor de lead-gen está vivo (v1.187) pero el revenue sigue en $0. Todo este horizonte es **convertir
la captura en caja**: instrumentar, sembrar la oferta, y cruzar el gate del primer pago real.

> **Dónde estamos de verdad (10-ago-2026, v1.192).** Los números de versión de esta tabla se cumplieron
> como *trains* pero **no con estos entregables**: v1.188–v1.192 se fueron en construir la línea de
> **campos e inmobiliaria rural**, que no estaba en el plan y salió de una señal de tráfico real
> (`/mercado/arrendamiento` es la página con más búsquedas del sitio). Lo que sigue pendiente, sin
> maquillar:
>
> - **El primer pago real de PRO nunca se verificó.** Sigue siendo el gate desde v1.30.
> - **El outreach a firmas se probó y se apagó.** 10 invitaciones enviadas, ninguna respuesta todavía.
>   Se apagó por decisión de producto: derivaba el lead a la firma en vez de quedárselo. La captación
>   pasó a infraestructura en el sitio.
> - **El MCP tiene cero adopción externa, medido.** De 624 tool-calls en 30 días: 562 son scanners
>   anónimos (cada IP llama cada tool una vez y no vuelve), 223 somos nosotros, 108 son bots de
>   monitoreo que se identifican. **Ningún usuario real recurrente.** Las 5 API keys son todas nuestras.
>   Estamos bien indexados y auditados a diario — pero estar en el catálogo no es estar en el flujo de
>   trabajo de nadie.

| Versión (esperada) | Foco | Entregable concreto |
|---|---|---|
| **v1.188** | Instrumentar el lead-gen | Funnel `open→submit→routed→won` medido en `/admin/leads`; digest semanal de leads al founder; primer **outbound a firmas** para reclamar perfil (sembrar la oferta) |
| **v1.189** | **Primer pago real** *(el gate histórico desde v1.30)* | Verificar **Rebill → webhook → activación** con un pago real de PRO Consignataria, punta a punta |
| **v1.190** | PRO Consignataria **self-serve** | Onboarding automático (reclamar → featured → recibe leads) sin intervención del founder — el "PRO v2" del plan |
| **v1.191** | Prueba B2B en el outreach | Contadores **"N productores siguen tus remates · N leads de tu zona"** en el mail y el perfil — la evidencia que cierra PRO |
| **v1.192** | 1% operacionalizado | Registrar operación cerrada → fee en la board; primeros **testimonios** de firmas |

**Gate del horizonte** *(plan §22, Días 31–90)*: **≥7 PRO pagando + ~ARS 3M MRR + 60% renueva.**
⚠️ Si tras ~50 conversaciones **<5 firmas pagan y ningún B2B paga por datos** → **pivotar** a medio/autoridad o
servicios de datos a medida (la hipótesis que puede invalidar el SaaS).

### Horizonte 2 — empaquetar el Motor 2 y el moat de datos (~v1.2xx) · **Motor 2**

Validado el pagador, profundizar el *prize* (datos / índice / API institucional):

- **`mag-lots` poblado → `/api/lots` con datos reales** (hoy 0 filas): destraba el producto Enterprise de lote.
- **API empaquetada + primer design-partner**: SLA, exports CSV/JSON, webhooks, reportes — un integrador real ejercitando el contrato.
- **Captura de resultados de remate** (precio realizado por lote/firma): el dato propietario que **supera al público** — el moat.
- **El Índice como producto**: nuevos derivados + reporte institucional pago (El Corredor → suscripción).
- **MCP con consumo real**: pasar de discovery a *calls* de un humano concreto. Medido a fondo el
  10-ago: **0 usuarios externos recurrentes** (ver nota del Horizonte 1). El cuello no es visibilidad
  —nos auditan a diario SentinelOracle, mcpbeat, verifymcp, SaSame, Airia, Chiark— sino que nadie tiene
  todavía una razón para configurarlo. El próximo paso es conseguir **uno**, de la red propia, no un
  desarrollador anónimo.

**Gate** *(Meses 4–12)*: **PMF en ≥1 línea** (retención + expansión), MRR ~USD 2.000 eq., churn <6%.

### Horizonte 3 — escala nacional e institucional (~v1.3xx+) · **Motor 2 = el prize**

- **~85 consignatarias · ~18 clientes API · sponsors.**
- **3 clientes institucionales** (banco / aseguradora / frigorífico / gobierno) pagando por la capa de datos.
- **ARR base ~USD 98k (expansivo ~USD 255k)**, break-even ~mes 33, citación IA dominante.
- **Servicios financieros/transaccionales — solo si validados**: crédito contra token-vaca, futuros/índice anticipado, tokenización (el árbol agro-financiero). *No avanzar si el dato propio no supera al público.*

**Gate** *(plan §22, Meses 13–36)*: los KPI de la etapa 4 (ver la tabla "Roadmap de 4 etapas" más abajo).

---

## Estado — v1.185 → v1.187 (2026-07-20) · primera captura de demanda (Motor 1) + hardening de ops

Primera pieza concreta del **Motor 1** que va más allá del listing: capturar demanda del productor y
convertirla en un lead ruteable, más una tanda de fixes que sacan ruido operativo diario.

- **Motor de lead-gen a performance (v1.187.0):** tabla `producer_leads` (lead ruteable con valor
  estimado y fee 1%), captura acotada a **arrendamiento** (ofrezco/busco — el único contexto donde el
  visitante busca una contraparte), ruteo por zona que prioriza firmas `featured`, y board
  `/admin/leads`. **Toda alerta de lead nuevo** (arrendamiento, pre-ofertas, consultas de perfil) llega
  al correo del founder (`LEAD_ALERT_TO`). Modelo: 1% sobre la operación cerrada, no suscripción —
  la cuña para firmas que no usan la web.
- **Hardening de ops (v1.186.1):** se eliminan los mails de fallo espurios que llegaban a diario —
  Data Freshness Alert (falso positivo por atraso del cron cruzando la medianoche ART; ahora tolera
  hoy/ayer), Scrape Auctions (carrera de `git push`, ahora rebase + reintento), y CI/deploy (errores de
  ESLint que rompían el `next build` de Vercel; regla nueva: `next lint` antes de cada push).

**Lectura:** el Motor 1 pasa de "perfil listado" a "lead en la mano del founder". El gate sigue siendo
comercial: cerrar la primera operación ruteada y cobrar el 1%.

---

## Estado — v1.160 → v1.184 (2026-07-18) · interoperabilidad + señal de demanda AI

Tramo corto de hardening de la superficie citable, con la **primera medición seria de demanda AI**:

- **SEO/crawl (v1.182.x–1.183.0):** OG a prueba de 5xx (558 páginas en GSC), robots.txt recupera crawl
  budget (1.320 noindex crawleadas), auditoría técnica ultracode (17 fixes de indexabilidad).
- **MCP interoperable y con la serie entera (v1.183.1–1.184.0):** fix de negociación de protocolo
  (clientes con versión intermedia — Claude Code — cortaban la conexión); `get_inmag_historico` pasa de
  730 días a la **serie completa 2015→** con nota automática de era Liniers/MAG y fix de un truncado
  silencioso de PostgREST. Los 18 tools verificados end-to-end.
- **Identidad v2 en previews sociales (v1.184.1):** se elimina el twitter-image v1 que cascadeaba a todo
  el sitio + 48 páginas sin og:image reciben el asset v2 por sección.
- **Medición de demanda AI (infra nueva, fuera del repo):** GA4 consultable por API (SA `ga4-reader`,
  script `~/.config/consignatarias/ga4_ai_traffic.py`). Dato al 17-jul: **canal AI Assistant = 2,45% de
  las sesiones (34/7d)** — chatgpt.com 29, copilot 4, claude.ai 1 — con **el engagement más alto del
  sitio** (55,9% vs 37,6%; claude.ai 20min). En el MCP: discovery masivo (~2k handshakes/día), consumo
  real todavía ~0 — los evaluadores ya ejercitan tools (paso previo a rankear en catálogos).

**Lectura:** los motores AI ya citan y traen el tráfico de mejor intención del sitio; el MCP está
distribuido pero aún sin consumidor final. El gate no cambió: **comercial, no técnico.**

---

## Estado — v1.139 → v1.159 (2026-07-13) · el tramo del Motor 2 (datos/índice/autoridad)

Este tramo profundizó fuerte el **Motor 2** (la capa de datos, el *prize* y el moat), sumó contenido citable
nuevo, y endureció riesgos del Motor 1. Todo en prod, con changelog.

**Motor 2 — datos, índice y autoridad (el grueso):**
- **MCP consolidado y distribuido.** De ~11 a **18 tools** con descriptions tier-A (rubro TDQS) + annotations;
  pasa los 3 checks del **spec MCP 2026-07-28** (del ~9% de servers listos); `.well-known/mcp/*`; `initialize`
  como mapa completo. Presente en los **3 índices**: registry oficial (**v1.2.0**), **Glama (quality A)** y Forge.
  Alerta de ops que avisa el **primer consumo real identificable** (el hito que separa "indexado" de "usado").
- **Índice de Liquidación** (6º de la familia, `/mercado/liquidacion` + tool MCP): **% hembras**, indicador
  adelantado de liquidación vs. retención. 3 capas honestas: Cañuelas propio (adelantado, diario, vía RPC) +
  ancla nacional actual (scraper del PDF mensual de MAGyP) + **serie nacional continua 1998-2025** (mensual
  MAGyP + backfill trimestral IPCVA, 23 PDFs parseados). Es el dato procesado citable que diferencia del spot
  gratis — consumible por web (GEO) y por IA (MCP).
- **Sanidad SENASA + Buenas Prácticas Ganaderas.** Nueva capa de dato regulatorio citado (planes, calendario
  de vacunación, requisitos de movimiento, RENSPA, DT-e) + guía BPG de 14 temas — whitespace vacío en el
  ecosistema agtech-MCP, indexable y consumible por agentes.

**Motor 1 — hardening de riesgos (auditoría por swarm):**
- **Fix del webhook Rebill:** un cliente que pagaba podía quedar sin acceso (el dedup marcaba el evento como
  procesado antes de otorgar el entitlement) → rollback del dedup ante fallo para que el retry re-procese.
- **"Prueba gratis" (falsa) removida** de 5 superficies (el checkout cobra al instante; riesgo Defensa del
  Consumidor) → copy honesto "ARS 45.000/mes, cancelás cuando quieras".
- Quick-wins de credibilidad/GEO: precios reales en `llms.txt`, cobertura corregida, sitemap, perf, correctness.

**El cuello sigue siendo comercial, no técnico.** Este tramo hizo el Motor 2 mucho más profundo y citable, pero
el gate no cambió: la **primera institución que consulte de forma recurrente e identificada** (o el primer PRO
pagando). Se resuelve vendiendo, no con más código.

---

## Estado — v1.101 → v1.138 (2026-07-11) · alineado al plan de negocios

El plan de negocios v2 (fusión, 11-jul) es ahora **el marco canónico** y reencuadra los "3 pilares" en
**2 motores secuenciados**. Los pilares no desaparecen — se ordenan por quién paga y cuándo:

| Motor | Qué | Quién paga | Ventana | Pilar(es) que lo nutren |
|---|---|---|---|---|
| **1 — PRO Consignataria** (la cuña) | Perfil verificado + remates destacados + distribución + tracking + reporte | Casas regionales/coops | **0–12m, cobrable ya** | Flywheel de remates (P3) + directorio |
| **2 — Datos e índice institucional** (el prize) | API/MCP + serie histórica USD + resultados de remate + licencias/reportes | Agtech, bancos, aseguradoras, feedlots, media, IA | **6–36m, ciclo largo** | Index family (P1) + Institutional access (P2) |

**La regla que los une:** el Motor 1 **financia y alimenta** al Motor 2 (genera caja, relaciones sectoriales
y —clave— el dato de resultados de remate que es el moat máximo). Confundir la cuña con el destino deja el
negocio en el techo acotado de PRO sola (~USD 13k ARR en el conservador de ~35 casas).

**Qué shippeó este tramo, mapeado a los motores:**
- **Motor 1 (PRO Consignataria) — endurecido para venderse.** `/planes` reescrito con PRO como producto #1
  en lenguaje llano; **activación self-serve** (`/consignatarias/activar`, sin humano en el medio, saca a
  José del cuello de botella); y el **hardening del audit de 3 sprints** (v1.138): fuente única de plan
  (`getConsignatariaPlanStatus`, featured=PRO + período válido), reporte PDF pago arreglado, schema de
  precios en ARS reales, revalidación de `/go`, **gracia hasta fin de mes al cancelar** (Rebill cancela
  inmediato/terminal, la gracia la implementamos nosotros), videos PRO revividos, `remates/hoy` en hora ART.
- **Capa de audiencia (Motor 0, gratis) — retención y señal.** Cuenta nudge-first + **economía de coins
  (karma)**: el productor gana coins usando la terminal y desbloquea el histórico INMAG sin pagar plata;
  perfil de consignataria v3 branded; tracking plan como fuente de verdad.
- **Motor 2 (datos/autoridad) — citabilidad.** Swarm GEO/AEO (+50 answer-pages, schema de citabilidad,
  `llms-full`), widget embebible del índice, y el **claim de IA verificado en vivo** (ChatGPT + Perplexity
  citan el portal) — la distribución que precede a la venta institucional.

### Roadmap de 4 etapas (del plan §22 — con criterio de avanzar/detener)

| Etapa | Foco | KPI de salida | Avanzar / Detener |
|---|---|---|---|
| **Días 1–30** | Validar el pagador inicial | 20 casas contactadas + 3 prospectos institucionales; ≥5 pilotos con compromiso | **Avanzar** si ≥5 casas aceptan piloto · **Detener** si nadie paga y no hay interés institucional |
| **Días 31–90** | Primer ingreso | **≥7 PRO pagando + 3 testimonios, 1 sponsor, 1 design-partner API; ≥ARS 3M MRR; 60% renueva** | **Avanzar** si hay MRR recurrente + 1 renovación · **Detener** si 0 cierres pagos (WTP falló) |
| **Meses 4–12** | Repetibilidad + moat de datos | PRO v2 (onboarding auto) + API empaquetada; empezar a capturar resultados de remate; MRR ~USD 2.000 eq., churn <6% | **Avanzar** si hay PMF en ≥1 línea (retención + expansión) |
| **Meses 13–36** | Escala nacional e institucional | ~85 consignatarias, ~18 API, sponsors; **ARR base ~USD 98k (expansivo ~USD 255k)**, break-even ~mes 33, 3 clientes institucionales, citación IA dominante | Servicios financieros/transaccionales **solo si** validados · **No avanzar** si el dato propio no supera al público |

> **⚠️ Hipótesis que puede invalidar TODO (test explícito a 90 días):** si tras ~50 conversaciones comerciales
> **menos de 5 consignatarias pagan** el precio piloto **y ningún cliente B2B paga por datos/API**, el mercado
> monetizable inmediato es demasiado chico → **pivotar a medio/autoridad de bajo costo o a servicios de datos/
> reportes a medida, NO seguir construyendo SaaS.**

**El cuello sigue siendo comercial, no técnico:** el producto de la cuña (Motor 1) está listo y self-serve; el
gate es el **primer pago real verificado** (Rebill→webhook→activación) y la **venta founder-led** de los pilotos.

---

## Estado — v1.76 → v1.100 (2026-07-04)

El tren de julio movió el modelo de negocio y la cara del producto:

- **Pricing API-first + retiro de PRO Usuario.** El productor va **GRATIS** (des-gate app-wide:
  `ProReveal`/`RequirePro` passthrough; /pro y /upgrade redirigen; código muerto de checkout eliminado
  en v1.98). Revenue = **Enterprise API/MCP** (Starter USD 49 / Growth USD 299 / Scale a medida) +
  **PRO Consignataria** (alcance). `/planes` reescrito por segmento.
- **MCP live** — 10 tools sobre `/api/mcp`, listado en el registry oficial como
  `ar.com.consignatarias/cattle-market`. El AI-traffic (326 referrals/mes) es el moat de autoridad.
- **Identidad v2.0 aplicada a todo el sitio** (v1.88 → v1.97): isotipo/favicons/OGs dinámicos per-slug
  (`src/lib/og/brand.tsx`), consolidación de acentos (cielo único acento), universo gráfico dentro de
  las páginas (glifos/íconos color, martillazo animado, hero-pampa) y `/overview` rediseñado como
  **home de broker** (Mi Ganado 7d + remates hoy/semana + tiles de precios).
- **El producto del productor** (v1.96 → v1.100): `/comparar` gratis y honesto ("quién remata más
  seguido"; se eliminó la promesa de medios de pago — dato que no existe); **dashboard de productor**
  (hacienda + consignatarias seguidas + próximos remates; FollowButton por fin en el perfil);
  onboarding de /cuenta (bienvenida + checklist con celebración) y **karma con arranque** (+20 por
  paso; 3 de 4 = Productor).
- **Pendientes que este tren dejó marcados:** (1) pago de prueba real Rebill (sigue siendo EL gate);
  (2) pipeline `mag-lots` en 0 filas (alimenta `/api/lots` Enterprise); (3) contador B2B
  "N productores siguen tus remates" en dashboard/outreach de consignataria (el dato ya existe:
  `user_favorites` + `remate_marks`); (4) ✅ pricing unificado
  TODO EN ARS (v1.101.0): API Starter 74.000 / Growth 451.000 / Scale a medida · Consignataria 45.000
  — dos productos separados también visualmente (API cielo / Consignataria ámbar).

---

## Estado técnico — desde v1.74.0 (2026-07-03)

Tras la auditoría de seguridad + el review general + el paso de Canon Agent (fuente de verdad del esquema + reconciliación del estado de Supabase). Detalle: `CHANGELOG.md`, `docs/PROYECTO-{A,B,C}-*.md`, `docs/REVIEW-GENERAL-2026-07-03.md`.

### ✅ Resuelto (v1.68.0 → v1.74.0)

- **Seguridad (v1.68.0):** webhooks rebill/auth **fail-closed**; cron-auth constant-time (se quitó el canal `?secret=`); RLS cerrada en `alertas`/`alerta_logs`/`subscriptions` (anon leía `api_key` en texto plano + billing); IDOR en `get_user_report_stats`; DoS de cupo en `increment_api_usage`; `email_tracking` anon PII → INSERT-only; SSRF en `webhooks/register`; `allowed_ips` enforced; rate-limiter durable; **HSTS + CSP**; checkout deja de pre-confirmar cuentas.
- **UX / retención (v1.69 → v1.73):** legibilidad; burbuja WhatsApp lead (`whatsapp_lead`); **fix del nav de la home** (anclas muertas → páginas reales); buscador por nombre; `HerramientasCTA`; form de captura de lead para firmas sin contacto; **bandeja de leads** en el dashboard.
- **Instrumentación (v1.72 → v1.73):** fix de inflación de pageviews; guard de `SinceLastVisit` (3×→1×); dedup de `pro_prompt_view` (6 componentes → 1/página) + unificado GA+ledger; **WhatsApp unificado**; `subscription_paid` sin duplicar renovaciones; eventos de recurrencia (`alert_create`/`newsletter_subscribe`/`signup`) al ledger.
- **Fuente de verdad del esquema (v1.74.0):** `src/lib/database.types.ts` (desde prod) + `check-db-refs` con enforcement en `.githooks/pre-commit`; **fix del bug** `.from('alerts')`/`.from('saved_remates')` vía `GET /api/me/activation`.
- **Reconciliación del estado de Supabase (v1.74.0):** se **aplicaron a prod las migraciones faltantes** → destrabadas **5 features que fallaban en silencio**: **DT-e** (`user_dtes`), **alertas de zona de venta** (`sell_zone_alerts`), **watch de remates** (`remate_favorites`), **followers** (`consignataria_followers`), **webhooks**. Además se arreglaron las **0 políticas de `user_favorites`** (favoritos estaba roto). Todo con RLS own-row / service-role correcto (advisor limpio, sin `USING(true)` peligroso). **Drift de esquema: 6 → 0.**

### 🔜 Next problems to solve (desde v1.74.0)

**P0 — Deuda de esquema / estado de Supabase** — *el grueso resuelto en v1.75.0:*
1. ✅/🟡 **Baseline del esquema** — `00000000_baseline_from_prod.sql` (column-level de 55 tablas, v1.75.0). **Falta** completarlo con `supabase db pull` (enums, secuencias, índices, RLS/policies) — requiere credenciales de DB.
2. ✅ **Tipar los clients con `<Database>`** — hecho (v1.75.0, los 3 clients). Destapó 38 bugs de tipo (incl. un bug de autorización real en `videos/route.ts`), todos resueltos. `.from()`/columna inválida ahora es error de compilación.
3. ✅ **`pnpm check` en CI** — `.github/workflows/ci-check.yml` (tsc + eslint + db-refs + tests) en push/PR.
4. ✅ **ALLOWLIST / TODO(canon) — cerrada** (v1.75.1→v1.75.3): `cron_state` (cron reescrito), 5 `TODO(canon)` (RPC `get_user_emails`; `medios_pago`; `webhooks/auth`), `onboarding-emails`→`auth.users` (RPCs), y **`alertas/*`→`api_keys` hasheadas** (drop de la columna api_key en texto plano). **Cero `.from('users')` en el codebase**; escape-hatches `fromUnsafe`/`requireServiceClientLegacy` eliminados. La ALLOWLIST queda solo con `increment_api_usage` (falso positivo del generador de tipos).
5. ✅/🟡 **Verificar las features reconciliadas** — data-layer OK (`sell_zone_alerts`, `webhooks`, `remate_favorites` + RPC). **Falta** con sesión logueada: `user_dtes` (subir DT-e) y `user_favorites` (seguir firma).
6. 🟡 **Cerrar el CONTRATO del API `alertas/*`** (el cambio de v1.75.3-1.75.4 fue técnico, no contractual): actualizar la **doc pública/externa** del API (header pasó a `Authorization: Bearer`), definir política de **deprecación/versionado** para cambios futuros de superficie, y una **verificación E2E** con una API key real de un plan (crear/listar/editar/borrar). El endpoint viejo estaba 100% roto (tabla `users` inexistente → 401 siempre), así que no hay consumidores que romper, pero el contrato público debe quedar alineado.

**P0 — Seguridad diferida (del hardening):**
6. `fpt_approvals` (anon `ALL USING(true)`); `increment_aperturas` (anon SECURITY DEFINER); listado público del bucket `consignataria-assets`; leaked-password protection en Auth; `SET search_path` en ~10 funciones.

**P1 — Convergencia (entropía de patrón, del review general):**
7. **Un solo service client** (`supabase.ts` vs `supabase-server.ts`).
8. **DAL como choke point** de mutaciones (hoy 4/110 rutas; 73 hacen `.from()` ad-hoc) + zod en todo POST.
9. **Contrato único de instrumentación** `track()` (converger GA + ledger).
10. **Error handler + logging central** (`withApiHandler`) — hoy 66 rutas con try/catch artesanal.

**P1 — Frontend (del review general):**
11. Partir los god-components (`DashboardClient` 1535, `ConsignatariaProfileClient` 1344) en subcomponentes.
12. Primitivos `<Button>`/`<Input>`/`<WhatsAppIcon>` + `waUrl()`; borrar huérfanos (`TrackOnMount`, `WhatsAppShare` top-level).
13. Sacar `remates.json` (450 KB) del bundle del **cliente** (props desde el server).

**P2 — Producto / retención (Proyecto B fases 2-3):**
14. ✅ "Mi Panel" del productor — `ProductorDashboard` en /dashboard (v1.99.0: hacienda + seguidas +
    próximos remates + marcas). Falta integrar DT-e ahí.
15. ✅ Alerta por **precio objetivo** — motor `price_alerts` + cron diario + captura `/api/alertas/precio`.
16. Leads v2 (estado nuevo/contactado + notificación por email a la consignataria).
17. ~~Validar el CTR del muro PRO~~ — obsoleto: PRO Usuario retirado (jul-2026); la métrica ahora es
    `tool_view` de las herramientas liberadas.

**P0 histórico (sigue vigente):** verificar `REBILL_WEBHOOK_SECRET` + correr un **pago de prueba real** — el gate de revenue está en ops, no en código.

---

## Where we are now — v1.39.0 (June 2026)

The train since v1.30: a growth/SEO/GEO push, then a full customer-journey debug, then a landing redesign.

- **Growth / SEO / GEO (v1.31 → v1.35).** CTR sprint (price-in-title), mobile perf + a11y, end-to-end
  funnel **instrumentation**, and the **"answer-block" family**: reusable extractable primitives
  (`AnswerBlock`, `DataStamp`, `CitaBlock`, `MethodologyMicroBlock`, `PriceRangeTable`) across ~84 price
  pages; new programmatic surfaces (`/precios/comparar`, quality-segments, `/mercado/origen`); the
  **INMAG entity** (Dataset `@id` + Speakable + CitaBlock on the top-impression term); machine-readable
  citation surfaces (`/precios.json` CC-BY, `llms.txt` freshness header); and an embeddable INMAG badge.
- **Customer-journey debug (v1.36 → v1.38).** A 5-agent audit traced the whole funnel. **Headline
  finding:** the money path could not confirm a sale — and the live data showed the Rebill webhook had
  **never fired** (`processed_webhook_events = 0`). Fixed (around the webhook): PRO-buyer confirmation
  (`subscription-status` read the wrong table; added an "Activando…" poller), a dead `subscription_tier`
  column, the DT-e activation dead-ends (`/dte`→`/auth` 404, `/mi-cuenta/guias` had no auth guard),
  orphan-profile claim 404s, billing-on-cancel (now honors the paid period), conversion CTAs on the
  data-only SEO pages, honest claim copy, and several P1 integrity bugs.
- **Landing redesign (v1.39).** Home cut ~18 → ~8 sections (overload feedback); the province filter +
  coverage became one interactive stylized `CoverageMap`.

**The revenue gate moved from code to ops.** The funnel is now correct end-to-end, but **P0-2 — verify
`REBILL_WEBHOOK_SECRET` + Rebill's signature encoding in prod, then run a real test payment** — is the
only thing between this funnel and its first peso. That is the single highest-leverage next action.

---

## Where we are now — v1.30.15 (June 2026)

The intelligence-infrastructure thesis is in execution. The train since v1.29:

- **Conversion unblocked (the $0 fight).** A multi-agent swarm diagnosis confirmed $0-ever was a
  *broken funnel*, not weak demand: payment sat behind a login wall (~10 accounts in 3 months despite
  +60%/wk organic traffic). Shipped **email-first checkout** (B2C `/upgrade` + Enterprise Starter):
  pay without creating an account first (user created server-side; post-payment access via magic-link).
  Also fixed the PRO-prompt copy (it sold B2B to producers), un-deadcoded the B2B $45k CTA (was gated
  on `verified` = 0 profiles), killed fabricated "47 ya lo hicieron" social proof, and added a real
  post-payment success state on `/cuenta`.
- **Pillar 2 launched + de-risked.** Institutional **access offering** on `/enterprise` — pay for the
  *access + service* (maintained, USD-normalized feed + bulk + support + our derived indices), NOT a
  license/redistribution of MAG's public series (Ley 11.723 protects compilations; redistribution
  would need MAG's authorization). The series-not-per-request model, minus the licensing claim.
  Discovery from `/metodologia`,
  `/mercado/inmag`, and the site-wide footer. Verified: returns a real `pay.rebill.com` link.
- **Pillar 1 hardened (citability).** Generated `/llms.txt` (live data, no more drift), INMAG
  `Dataset` schema freshness (`dateModified` + `variableMeasured` + distribution + publisher),
  methodology audited to v1.2 (removed fabricated figures; added the honest **~12% INMAG / ~71%
  dark-pool** coverage declaration — the credibility gate for institutional-access).
- **Reliability.** El Corredor pipeline repaired end-to-end (PDF 404 + blast-never-sent → fixed; blast
  broadened to market segments; Mayo edition sent 14/14). INMAG-$0 hydration hotfix (price now SSR'd,
  never depends solely on client JS). Mobile + desktop overflow fixes. Full cron observability
  (`/admin/ops`). Consignataria count unified to **104** everywhere. Build hotfix: an ESLint error had
  silently blocked **all** Vercel deploys since v1.29.14.

**State:** $0 revenue. Both checkout paths (B2C + Enterprise Starter) are **live and verified to reach
Rebill.** Open: the real test payment (confirms Rebill → webhook → activation end-to-end) + the
institutional sales motion.

### Since v1.30.3 — the product-depth + coverage train (v1.30.4 → v1.30.15, June 9)

With conversion unblocked, the train turned to **making PRO worth paying for** and **widening coverage**:

- **PRO Usuario suite rebuilt under one gating standard (v1.30.13).** New `<ProReveal>` soft-gate
  (free public-data hook → the *decision* behind a blurred CTA, never a hard wall/redirect) +
  `<HeroNumber>`/`<StatPill>`. All five tools reworked: **¿Vendo ahora?** (verdict + percentiles in
  **real USD** to kill the peso-inflation skew, honest per-category caveat), **Comparador**, **Neto en
  mano**, **Spread** (now gated), **Histórico/Estacionalidad**. Standard: `docs/PRO-PRODUCT-STANDARD.md`.
  → This closes the backlog item "free preview vs full lock."
- **PRO showcased, not buried (v1.30.15).** Home highlights + new **`/pro`** tour; unified `/remates`
  filter bar with removable chips (**SEO routes preserved** — filters client-side, no nav); calendar
  **multi-locality** checkbox `.ics` export; ultra-PRO welcome (premium dashboard greeting +
  post-upgrade module + polished onboarding).
- **Coverage — NEA/Corrientes (v1.30.14).** The scraper was Pampa/Litoral-biased; added isolated
  `scripts/scrapers/nea.mjs` (Reggi, Aguerre, HRE, Rosgan, ClicRural). **Corrientes future remates 4→9,
  Entre Ríos 18→71, total 554→619.** Rosgan indexed as an *attributed source*, not a republished index.
- **Organic (v1.30.12) + El Corredor current (v1.30.11).** Geo CTR sprint (title/meta + FAQ schema on
  province pages; killed "bucket" jargon) — the bottleneck is **CTR, not ranking** (organic +93% MoM at
  pos 6.4); landing pointed to the Mayo edition.
- **First active API consumer.** A real Enterprise prospect (cattle-software dev) polls `/api/precios`
  daily for herd valuation — validates the institutional-access thesis and surfaced demand for
  invernada/vientres data the INMAG faena feed doesn't carry.

---

## The thesis: 3 pillars × 3 horizons

| Pillar | What | Defensibility | Status |
|---|---|---|---|
| **1 — Proprietary Index Family** | Be the reference, own the series | Very High | **Largely built + citable** |
| **2 — Terminal & Institutional Access** | Data gravity, not features (the revenue engine) | High | **Offering live; sales motion pending** |
| **3 — Online-Auction Data Flywheel** | Own the data layer of price discovery (→ the 71% dark pool) | Highest (long) | **Wedge available; indicator pending** |

### Pillar 1 — Proprietary Index Family
**Done:** INMAG 2015→ (2,237 rows) + USD overlay, 16 MAG sub-cats, lote-level pipeline, named `/indices`
family, methodology v1.2 (honest coverage), `Dataset`/`DefinedTerm` schema, generated `llms.txt`,
citable in AI/Google.
**Next:** derivative indicators (Liquidation / Heaviness / Quality), the daily-index X/Twitter bot,
academic co-validation (Scoponi/UNS, FCV-UBA — outreach), `llms-full.txt` generated too.

### Pillar 2 — Terminal & Institutional Access  ← the revenue engine
**Done:** Enterprise API (`cnsg_live_*`, Bearer, 28-day billing, self-serve Starter via Rebill),
institutional **institutional-access offering** on `/enterprise` + discovery, email-first checkout (no login
wall), checkout verified to reach Rebill.
**Next:** the **sales motion** (outbound to banks / export frigoríficos / MATBA-ROFEX / fintech), a
**institutional-access one-pager PDF** + a **sample dataset** download (lower evaluation friction), the first
institutional dollar, `api.consignatarias.com.ar` + OpenAPI/SDKs + status page.

### Pillar 3 — Online-Auction Data Flywheel
**Available:** ~380 scraped remates as a cross-platform results layer.
**Next:** the **Online/Pantalla Cattle Indicator** (the AuctionsPlus→OYCI move) over Rosgan + scraped
remates; the **Acta-de-Cierre / self-load** feature (converts scraped → first-party auction data);
structured measurement of the **71% dark pool** (long arc). RWA / CD+W / tokenized collateral = Horizon 3.

---

## What's next — prioritized (post-v1.30)

1. **Verify revenue end-to-end (E)** — one real test payment (B2C *and* Enterprise Starter share the
   Rebill+webhook mechanism) confirming Rebill → webhook → `user_subscriptions.tier='pro'` with a
   `rebill_subscription_id`. The single gate between "can pay" and "converts." *(User action; I can't pay.)*
2. **Pillar 2 sales enablement** — institutional-access one-pager PDF + sample dataset download, then outbound.
3. **Conversion measurement** — `UpgradeConfirmTracker` (fire `pro_upgrade` only on DB confirmation,
   never on `?upgraded=true`). *(The blurred-number reveal shipped as `<ProReveal>` across the whole PRO
   suite in v1.30.13.)*
4. **Pillar 1 deepening** — derivative indicators (Liquidation/Heaviness/Quality) + daily index bot;
   academic co-sign; generated `llms-full.txt`.
5. **Pillar 3 wedge** — *NEA/Rosgan + multi-source scraping shipped (v1.30.14).* Next: turn the captured
   pantalla volume into a published **Online/Pantalla indicator**.
6. **"En vivo" streaming** — `/remates/en-vivo` is structurally empty (0 future remates carry a stream
   URL). Capture per-event YouTube: headless render for Wix sources (Arzuaga), Canal Rural channel
   resolution, consignataria streams — so the live surface actually populates.
7. **Pillar 3 core — dark-pool capture.** `auction_results` is empty; post-remate outreach gets ~0
   usable replies and there's no ingestion pipeline. Drafted: an **AI multimodal parser** (email / PDF /
   photo of the planilla → structured rows). See `docs/DRAFT-captura-resultados-remate-AI.md`.
8. **API ecosystem** — `api.consignatarias.com.ar`, OpenAPI/SDKs, public status page.
9. **Hygiene** — run `pnpm build` before pushing JSX (a lint error once blocked all deploys); and
   **tag releases** (tagging fell behind: v1.30.8 → v1.30.15 are untagged while the CHANGELOG advanced).

---

## v2.0.0 Definition (the revenue milestone — still the goal)

> Alineación con el plan de negocios: v2.0.0 = la salida de la etapa **"Meses 4–12"** del roadmap de 4
> etapas (§22, arriba) — el punto de PMF en ≥1 línea. Las etapas Días 1–30 y 31–90 son los gates previos.

**v2.0.0 = USD 2.000+ MRR across the product lines, sustained 30 days.**
- [ ] 5+ Enterprise customers paying (Starter/Growth/Scale or a institutional-access) — *1 active prospect already consuming `/api/precios` daily (cattle-software dev); not yet paying*
- [ ] 1+ PRO Consignataria paying
- ~~10+ PRO Usuario paying~~ — obsoleto: PRO Usuario retirado (jul-2026); el productor va gratis
- [ ] Total MRR ≥ USD 2.000 normalized at MEP
- [ ] ≥1 public case study / institutional reference

**The real bottleneck (updated):** not code, and no longer "the platform." The checkout paths are live.
What's missing is the **first verified dollar** (the test payment) and the **sales motion** for the
institutional-access (outbound to institutions — the highest-ACV path per both the thesis and the swarm).

---

## Backlog detail (Pillar-mapped — still-relevant future work)

> Carried from the v1.13→v1.20 plan; most build items shipped, these remain.

### Pillar 1 — Derivative indicators (was v1.16)
- [ ] `Liquidation Index` — % cabezas (VACAS Conserva Buena+Inferior) / total faenado → endpoint + chart
- [ ] `Heaviness Index` — Σ(kg_avg × head_count) / Σ(head_count)
- [ ] `Quality Premium` — Esp.Joven vs Regular novillo spread
- [ ] Each: API endpoint + landing + FAQ/Speakable schema; daily X bot ("MEMOLA Liquidation Index 67")

### Pillar 2 — API ecosystem (was v1.17) + pricing completeness (was v1.18)
- [ ] `api.consignatarias.com.ar` subdomain; OpenAPI 3.1 + Postman; Python + JS/TS SDKs (open-source the
      client, never the server); webhooks (new remate, INMAG change, alerts); public status page
- [ ] Optional "Lite" tier (USD 29) + Stripe for international cards (Argentina-only Rebill is a ceiling)
- [ ] Embeddable widgets "powered by consignatarias.com.ar" for Sociedades Rurales (distribution)

### Pillar 1/2 — Real reports + content moat (was v1.15)
- [ ] El Corredor monthly (pipeline now works) + Oráculo quarterly + INMAG historical archive zip
- [ ] Resumen semanal por email al productor (ya opt-in desde el checklist de /cuenta); download-count A/B

### Marketing / GEO (ongoing, was v1.19)
- [ ] More `/precios/[X]` long-tail landings; press outreach (La Nación campo, Bichos de Campo, agritotal)
- [ ] Monthly citation-audit re-run; expand to institutional queries

---

## Post-revenue Horizon (v2.x — the operator path, Camino B)

Only **after** the reference is unassailable (thesis Horizon 3):
- **Transaction/operator layer** — ganado.com.ar, ALyC-ganadera exploration, escrow. *Sacrifice today:
  a referenced index cannot also be a counterparty (CEPEA is never a buyer).*
- **RWA / financing rails** — miganado.com.ar / CD+W (Decreto 640/2024), tokenized cattle as collateral.
  Real ($4–5T TAM by 2030) but capital/licence-heavy — the *reward* for owning the reference, not the route.
- **Forecasting** (EWMA/seasonal-naive first), **multi-market** (Uruguay/Brasil), **white-label** for
  Memola B2B clients, eventual **strategic exit** (Aleph / S&P Global / Reuters universe).

---

## The Journey So Far (historical record)

```
v0.x  (Feb 26 – Mar 9)    Genesis → Data → SEO Foundation
v1.0  (Mar 10)             Platform Launch — 385 auctions, 77 consignatarias
v1.1-1.7 (Mar 12-16)       Public API + content (video catalogs, email automation)
v1.9.x (Mar–May)           Market Intelligence — price oracle, MAG, conversion, En Vivo, daily rebuild
v1.10-1.12 (May 12)        Three-product pricing + Enterprise API + derivatives + lote-level pipeline
v1.13.x (May 13)           28-day billing + per-user quota; slug-hang fix; API auth gate; edge redirects
v1.14.x (May 13-14)        Observability foundation + email v2 + 2 P0/5 P1 security findings closed
─────────────────────────────────────────────────────────────────────────────
v1.20→v1.27 (May)          Market data-layer fix, PRO build-out + merchandising, GEO Phase 1,
                           SEO long-tail, named index family, legal layer
v1.28.x (May 31)           Cron observability + email-cron auth fix (silent-401) + fail-safe segmentation
v1.29.0-1 (May 31)         Docs/versioning/ops maturity pass + full cron-hook coverage
v1.29.2-7 (Jun 3-4)        Conversion surfaces, mobile/desktop overflow fixes, INMAG-$0 hotfix,
                           consignataria count unified (104)
v1.29.8-14 (Jun 4)         El Corredor lead-magnet + pipeline repair, post-payment success state,
                           conversion swarm quick wins, email-first B2C checkout, citability hardening
v1.30.0-3 (Jun 4)          Pillar 2 institutional-access offering + discovery, Enterprise email-first checkout
                           + stall fix, build hotfix (unblocked deploys)
```

**Posture:** shipped-clean (0 P0/P1 open), data pipeline runs unattended (GitHub Actions crons), all
checkout paths live. The bottleneck is commercial, not technical.

---

## What We Pivoted On (historical)

The original v2.0 roadmap targeted *"first PRO Consignataria payment."* Direction changed mid-May 2026:
points-gamification killed → answer-first SEO + Enterprise self-serve; API monetization shipped early as
the real revenue lever; the transaction layer (ganado.com.ar) pushed to v2.x. The current frame
(positioning thesis, May 31) sharpens this: **own "the reference price," monetize via institutional-access,
sacrifice the transaction** until the reference is unassailable.

---

## Open Strategic Questions

1. **Test payment first** — before any more conversion code, confirm the Rebill→webhook→activation path
   with a real payment (PRO Consignataria or Enterprise; PRO Usuario ya no existe). Deferred by owner;
   gates the whole revenue story.
2. **Institutional-access go-to-market** — bespoke/sales-led (current) vs a published institutional price.
   Outbound targets: banks (cattle-collateral), export frigoríficos, MATBA-ROFEX, fintech.
3. **Lite tier (USD 29) & Stripe** — capture global devs / international cards, or stay Argentina-Rebill
   and focus on institutions? (Thesis leans institutional > self-serve dev.)
4. **Open-source the SDKs** — yes, aggressively (distribution; the server is the moat, not the client).
5. **Newsletter** ("Argentina Cattle Weekly": INMAG-USD + indicators) as lead-gen for institutional-access.

---

*Alineado al plan de negocios v2 (2 motores + roadmap de 4 etapas + hipótesis-kill 90d): 11 July 2026 (v1.138.0). Estado v1.101→v1.138 agregado.*
*Estado v1.76→v1.100 agregado: 4 July 2026. Roadmap rewritten: 4 June 2026 (v1.30.3), reframed around the positioning thesis.*
*Prior: 13 May 2026 (v1.13→v1.20 milestone plan, now historical).*
*Real bottleneck: the first verified dollar + institutional sales motion (owner-led).*
