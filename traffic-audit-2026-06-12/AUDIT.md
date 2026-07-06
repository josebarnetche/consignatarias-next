# Auditoría de tráfico — 2026-06-12

Fuentes: GSC + GA4 frescos (pull `scripts/archive/audit-traffic-2026-06-12.js` → `/tmp/audit-traffic-2026-06-12.json`), Supabase prod.
Ventanas: 28d actual (13/05–10/06) vs 28d previo (14/04–12/05).

## 1. Estado del tráfico: el motor SEO funciona y está acelerando

| Métrica | Previo 28d | Actual 28d | Δ |
|---|---|---|---|
| GSC clicks | 410 | 897 | **+119%** |
| GSC impresiones | 13.540 | 32.602 | **+141%** |
| GA4 usuarios/semana | 313 (W21) | 613 (W24, parcial) | ~2× en 4 sem |
| CTR global | 3,0% | 2,2% | plano/diluido |

- **76% de las sesiones son Organic Search** (1.894/2.451) con 63% engagement — tráfico sano y calificado. Direct y Unassigned engagement bajo (~31%).
- Crecimiento = impresiones nuevas (más URLs rankeando), **no** mejora de CTR ni posición (avg pos ~6-7 estable). El upside inmediato está en cosechar lo que ya rankea.
- Drivers del salto: `/frigorificos` (+54 clicks), `/mercado/inmag` (+45), `/mercado/arrendamiento` (0→44, página nueva ganadora), hub provincias frigoríficos (+54 combinado).
- Mobile CTR 2,58% vs Desktop 1,86% pese a peor posición mobile — desktop pierde el SERP (revisar truncado de titles largos con precio + marca).

## 2. El problema NO es tráfico: es conversión (el embudo está roto)

28 días: **1.816 first visits → 9 signups (0,5%) → 0 suscripciones pagas.**

| Paso del embudo | Volumen 28d | Conversión |
|---|---|---|
| first_visit | 1.816 | — |
| pro_prompt_view | 835 (413 users) | — |
| pro_prompt_click | **7** | **0,84%** del prompt |
| planes_view | 33 | — |
| form_submit | 3 | — |
| signups (auth.users) | 9 | 0,5% de visitas |
| suscripciones | 0 | — |

- El prompt PRO se muestra a la mitad de los usuarios y lo clickea nadie → o el offer está mal, o el placement, o ambos. Coincide con la auditoría código-vs-/planes (promete features gratis y fantasma).
- **Las páginas que traen el tráfico no convierten nada:** `/mercado/arrendamiento` 228 sesiones → 1 key event; `/mercado/inmag` 170 sesiones → **0** key events. Son los landers #1 y #2 del sitio y no tienen ningún ask proporcional a la intención (gente chequeando un precio recurrente = monitoreo).
- El activo de conversión barata existe y está subusado: newsletter (28 subs totales, sistema Resend + weekly-newsletter.yml ya operativo).
- Negocio: 3 API keys, 654 ops_events/28d (API viva), 409 profile_views/28d (data para PRO Consignataria analytics ya se junta).

## 3. Cosecha SEO inmediata (striking distance, ya rankea 4–10)

| Cluster | Imp 28d | Pos | CTR | Acción |
|---|---|---|---|---|
| "inmag" / "inmag hoy" / "indice inmag" / "inmag arrendamiento" | ~1.650 | 4–7 | **0,48% en head** | CTR anómalamente bajo para pos 7 (esperable 2-3%). Meta description con variación diaria + schema Dataset/FAQ en `/mercado/inmag` + interlinking interno fuerte hacia la página |
| "precio novillo arrendamiento (hoy/mensual)" | ~600 | 6–10 | 1-2% | El title lidera con "Índice…"; las queries dicen **"precio"**. Cambiar a `Precio Novillo Arrendamiento Hoy: $X/kg` (Canal Rural rankea 1.4 en una variante — es ganable) |
| "cuánto sale una vaca viva en argentina 2026" | 99 | 6 | 1% | Content gap — página/sección FAQ nueva, esfuerzo mínimo |
| Queries CUIT crudas ("30-50673003-8", "mat_11783") | ~90 | 8-9 | 0% | Incluir CUIT formateado con guiones en title/H1 de fichas frigorífico |
| "listado frigoríficos habilitados senasa" | 67 | 5.7 | 6% | Ya funciona — reforzar `/frigorificos` como pillar (es el lander con más engagement: 411s) |

## 4. Plan de mejora inmediata (orden de impacto/esfuerzo)

**Semana 1 — capturar la demanda que ya entra (conversión):**
1. **Email-capture inline en `/mercado/inmag` y `/mercado/arrendamiento`**: "Recibí el INMAG todos los lunes en tu mail" — 400 sesiones/28d con intención de monitoreo, infra de newsletter ya existe. Es el primer escalón de la doctrina B (PRO = suscripción de monitoreo).
2. **Arreglar copy de `/planes`** (pendiente de la auditoría 09/06): dejar de prometer calculadoras/Corredor (gratis) y analytics/landing/QR (no existen). Incoherente con la tesis de credibilidad.
3. **Rehacer el pro_prompt**: 835 views→7 clicks lo condena. Cambiar el ask genérico por value prop contextual a la página (en inmag: "alertas cuando el índice cruce $X"; en arrendamiento: "seguí tu contrato") — vende monitoreo, no features.

**Semana 2 — cosechar el SERP:**
4. Title/meta de `/mercado/arrendamiento` → liderar con "Precio", no "Índice".
5. `/mercado/inmag`: meta description con dato vivo (variación del día), schema, interlinking desde fichas y páginas provincia.
6. Página/FAQ "cuánto sale una vaca en Argentina 2026" + CUITs formateados en fichas frigorífico.
7. Revisar truncado de titles en desktop (CTR desktop 28% peor que mobile).

**Decisión que destraba todo:** doctrina A vs **B (recomendada en la auditoría previa)** — PRO = monitoreo (guardar/seguir/alertar), calculadoras gratis como gancho. Los pasos 1 y 3 ya son ejecución de B. Al decidir, actualizar §8.2 del doc UADE.

**Lo que NO hace falta ahora:** más adquisición. El tráfico se duplica solo cada mes; cada semana sin conversión arreglada son ~600 usuarios calificados que se van sin dejar ni un email.
