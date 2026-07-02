# Reporte 5-Loops — consignatarias.com.ar · 2026-07-02

Estado base: merge de seguridad `d9b6193` **desplegado y live** en prod (build verde). DB + código en sync.
Datos de comportamiento: producción Supabase, ventana últimos 30 días salvo indicación.

---

## Loop 1 — Seguridad ✅ (verificado en vivo)

- Headers live: `Strict-Transport-Security`, `Content-Security-Policy` (frame-ancestors/base-uri/object-src/upgrade-insecure-requests), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- `POST /api/webhooks/rebill` sin firma → **401** (fail-closed activo). `/api/health` → 200.
- DB: 0 políticas `USING(true)` anon en alertas/alerta_logs/subscriptions; `increment_api_usage`/`get_user_report_stats` sin EXECUTE anon; email_tracking → INSERT-only; vistas value_events → security_invoker. Todo sostenido.
- **Pendiente (decisión de producto):** `fpt_approvals` (anon ALL), `increment_aperturas` (anon EXECUTE), listado público del bucket `consignataria-assets`, activar leaked-password protection en Auth.

## Loop 2 — Tráfico profundo

- **La IA es el canal de descubrimiento dominante:** 265 referrals IA/30d → **Copilot 214, ChatGPT 51**, Gemini 1, Claude 1 (detectado 237 por referrer, 30 por utm).
- **La IA aterriza en páginas de MERCADO/PRECIO, no en perfiles:** top landing IA = `/mercado/arrendamiento` (43), `/frigorificos` (25), `/mercado/canuelas` (22), `/mercado/terneros` (8), `/` (8), `/mercado/inmag` (8), `/precios/hacienda-en-pie` (7), `/dte` (7), `/precios` (5).
- **Navegación interna concentra en ~15 perfiles:** cooperativa-guillermo-lehmann (43), bressan-y-cia (33), colombo-y-magliano (29), etchevehere-rural (28), umc-villaguay (25), sivero (24), hasenkamp (19)…
- **Volumen:** 509 profile_views/30d (~18/día, pico 40 el 22-jun). **Actividad:** pico 14:00 ART (17 UTC), fuerte 08–20 ART → productores en horario laboral/tarde.
- Limitación de dato: `profile_views.referrer` siempre es el propio sitio (nav interna); la fuente externa real solo se ve por `ai_referrals`.

## Loop 3 — UX/UI (lo que ven esos usuarios)

Perspectiva: productor frío que cae desde una respuesta de Copilot/ChatGPT, normalmente en UN perfil, en móvil, sin contexto de home.

- **Transversal (Alta):** estética "terminal" oscura, monoespaciada, `text-xxs`. Contacto, precios y CTAs están en el tipo más chico de la página → problema de legibilidad/confianza para productores mayores en el celular.
- **Perfil (Alta):** el evento-plata (contacto WhatsApp/tel/email) es el elemento más chico y tenue; WhatsApp ni siquiera es botón. → promover a botón primario full-width en el hero.
- **Perfil (Alta):** para un lander frío, arriba está vacío ("Sin remates programados" / "Los precios aparecen cuando la firma reporta…"); los 26 remates históricos + precios están muy abajo → parece muerto/desactualizado. → mostrar último remate + últimos precios en vez del empty-state.
- **Perfil (Alta):** firmas sin WhatsApp/tel (ej. Lehmann) = callejón sin salida; en móvil el sticky bar devuelve `null` si no hay whatsapp ni próxima fecha → sin acción de contacto en la página más vista. → form "pedí que te contacten" + sticky siempre visible.
- **Perfil (Media):** la página le habla a la firma, no al productor dominante ("Reclamá el perfil", "Activar PRO $45.000/mes") y choca con el muro PRO de $7.900 → dos productos PRO, dos precios, confuso. → demotar CTAs de firma a un link discreto.
- **Perfil (Media):** el muro "Medios de pago" a un anónimo muestra login de Google (OAuth), no una compra, y Google es la única opción; el copy no dice *por qué* importa para esa firma. → CTA honesto + opción email + personalizar el beneficio (plazos de pago de *esa* consignataria) con una fila de teaser.
- **Home (Media):** clara en 5s, pero el CTA primario "Acceder al Terminal" es jerga y compite con 4+ CTAs; **no hay buscador** pese a 103 firmas/361 remates (el caso típico IA es que el usuario sabe el nombre). → un CTA primario en palabras llanas + buscador por nombre/provincia arriba.
- **/planes (Media):** arranca pidiendo auto-segmentarse (toggle) antes de mostrar valor; riesgo de ver el plan de $45.000 o Enterprise USD (ancla de precio irrelevante). → default PRO Usuario, liderar con beneficio del productor, esconder Enterprise/API detrás de "¿Sos empresa?".
- **/precios (Media):** página limpia y fresca pero **dead-end de conversión** — sin ningún paso hacia una consignataria ni upsell. Es un top landing de IA sin camino al evento-plata. → CTA contextual precios→directorio/contacto + teaser PRO para histórico/CSV.

## Loop 4 — Customer Journey (embudo + fugas)

- **Conversión real (fina):** 0 suscripciones de entidad (consignatarias), 17 usuarios (16 free / 1 PRO), 2 clientes API (1 growth, 1 starter), 37 newsletter activos.
- **El embudo es una caja negra Y está roto el instrumento para verlo:**
  - `value_events` (ledger ponderado del journey): **6 filas en toda la historia**.
  - Eventos de lead (`contact_whatsapp/phone/email/web`, peso 10 = la plata): **0 registrados jamás.**
  - `form_abandonment`: **0 filas jamás.** `email_events`: **0 en 30d.**
- **Causa raíz (concreta):**
  1. Los CTAs de WhatsApp hacen POST a `/api/track/whatsapp` → inserta en tabla `whatsapp_clicks` **que NO está desplegada** → cada clic-lead se pierde en silencio (error tragado "table might not exist yet").
  2. `trackValueEvent` está cableado en solo **2 componentes** (5 eventos: live/catalog/calendar/claim/contact_whatsapp). Todo el resto del embudo (pro_prompt, planes_view, signup, checkout_start, subscription_paid, newsletter, alertas, contact_phone/email/web) **no se dispara en ningún lado**.
  3. `subscription_paid` no se emite desde el webhook de Rebill → las conversiones no quedan en el ledger.
- Consecuencia: el sistema de "índice de valor" ponderado (taxonomía + pesos + beacon) está **construido pero sin conectar** → hoy no se puede ver dónde caen los usuarios ni atribuir valor por canal (justo lo que haría medible el moat de IA).

## Loop 5 — Quick fixes (priorizados)

**P0 — Instrumentar el embudo (dejás de volar a ciegas y de perder datos):**
1. **Desplegar la tabla `whatsapp_clicks`** (código vivo la usa, DB no la tiene → se pierde cada clic-lead). *Fix de minutos, alto impacto.*
2. **Cablear `trackValueEvent`** en: muro PRO (view/click), `/planes` (view), newsletter/alerta (subscribe), checkout (start), contacto phone/email/web. El sistema ya existe; solo hay que llamarlo.
3. **Emitir `subscription_paid`** desde el webhook de Rebill (server-side) para registrar conversiones.

**P0 — Conversión en el perfil (donde está el tráfico y la plata):**
4. Contacto = **botón WhatsApp primario** full-width en el hero (no link `text-xxs`).
5. **Fallback de captura de lead** ("pedí que te contacten": nombre + tel) + sticky bar siempre visible para firmas sin contacto (hoy Lehmann = dead-end).
6. Reemplazar cards vacías (sin remates / precios) por **último remate + últimos precios** → el lander frío ve que la firma está activa.

**P1 — Alinear descubrimiento ↔ landing (la IA manda a precios/mercado):**
7. CTA contextual en `/precios` y `/mercado/*` → directorio/contacto ("¿Querés vender a este precio? Encontrá tu consignataria"). Son los #1 landings de IA y son dead-ends.
8. **Buscador por nombre/provincia** (home + global): el usuario de IA sabe el nombre y no tiene dónde tipearlo.

**P1 — Legibilidad/confianza:** subir el `text-xxs` monoespaciado de contacto/precio/CTA a tamaño legible (audiencia mayor, móvil).

**P1 — /planes:** default toggle a PRO Usuario, liderar con beneficio del productor, esconder Enterprise/API detrás de "¿Sos empresa?".

**P2 — Seguridad diferida + canales ciegos:** `fpt_approvals` (anon ALL), `increment_aperturas` (anon EXEC), listado del bucket, leaked-password Auth; arreglar `email_events`/webhook de Resend (0 eventos = engagement de email a ciegas).

---

### Lectura estratégica (1 línea)
La IA (Copilot+ChatGPT) ya te trae demanda real a páginas de precio/mercado; el negocio pierde esa demanda por (a) no medir el embudo y (b) perfiles que no convierten al lander frío en contacto. Los P0 son baratos y desbloquean tanto la visibilidad como la plata.
