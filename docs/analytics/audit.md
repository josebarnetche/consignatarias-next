# Auditoría de tracking — consignatarias.com.ar

> **Fase B** del trabajo de tracking. Compara el plan (`tracking-plan.json`) contra la realidad del código + los datos de GA4 (90d, cierre 2026-07-05). Metodología adaptada del skill `analytics-tracking-automation` (etapa *audit*), sin GTM.
>
> Generado 2026-07-09.

## ✅ Resuelto (2026-07-09, rama `feat/auth-gate`)

- **P0-1** `calendar_download` — ya no usa `window.gtag` crudo; pasa por `trackValueEvent('calendar_download')` → GA4 + ledger (nuevo value-event de recurrencia, peso 6). `value-events.ts` + `AddToCalendarButton.tsx`.
- **P0-2** leads ciegos — el teléfono del perfil ahora es `tel:` link con `contact_phone` (w6, + click-to-call en mobile), el email dispara `contact_email` (w6), y la web suma `contact_web` (w4). El índice de valor ya ve el lead no-WhatsApp. `ConsignatariaProfileClient.tsx`.
- **P1-6** muro PRO — removidos los params duplicados `context`/`variant` (quedan `prompt_context`/`prompt_variant`). `analytics.ts`.

Pendientes (siguiente pasada): P0-3 (verificar que el funnel de pago arranca), P1-4 (name mismatch — decisión: documentado, no se renombra para no romper series), P1-5 (legs de email muertos), P1-7 (doble fuente de `profile_view`).

## Resumen

| Estado | # | Qué significa |
|---|--:|---|
| `ok` | 28 | Instrumentado y consistente |
| `auto` | 7 | Enhanced Measurement de GA4 (no nuestro) |
| `drift` | 5 | Inconsistencia (params, nombres, o vía de disparo) |
| `dead` | 9 | Definido pero SIN emisor / sin call-site |
| `gap` | 25 | Definido y correcto, pero **no visto en 90d** (feature de bajo volumen o funnel a oscuras) |
| `new` | 1 | `account_nudge` (Fase 1, aún sin datos) |

**Chequeo de integridad:** los 39 eventos que GA4 vio en 90d matchean exactamente los 39 marcados `seen90>0` en el plan → el mapeo código↔datos es consistente.

**Dos sistemas** conviven y **no comparten taxonomía**: GA4 (`trackEvent`→gtag) y el ledger `value_events` (`trackValueEvent`/`emitValueBeacon`, con peso/grupo en `value-events.ts`). Varios de los hallazgos nacen de la fricción entre ambos.

---

## P0 — Rompen medición de valor / conversión

### 1. `calendar_download` está fuera del sistema (drift)
- **Dónde:** `src/components/ui/AddToCalendarButton.tsx:58`.
- **Qué:** dispara con `window.gtag('event', …)` **directo**, con params estilo **Universal Analytics** (`event_category`, `event_label`, `value`) en vez del helper `trackEvent`. No crashea (está guardado con `if (window.gtag)`), pero:
  - No pasa por el guard `PROD_HOSTS` del helper (depende solo de que gtag exista).
  - **No entra al ledger `value_events`** — siendo que `calendar_subscribe` SÍ es value-event de recurrencia (peso 12). Bajar un `.ics` es la misma intención de recurrencia y hoy vale 0 en el índice.
- **Fix:** reemplazar por `trackValueEvent('calendar_subscribe', …)` (o crear `calendar_download` en el registro con peso de recurrencia) y borrar los params UA.

### 2. El índice de valor está ciego a 3 tipos de lead (dead)
- **Dónde:** `contact_phone` (w6), `contact_email` (w6), `contact_web` (w4) están **definidos en `value-events.ts:42-44`** pero **nunca se emiten**.
- **Qué:** en la ficha de consignataria (`ConsignatariaProfileClient.tsx:801-810`) el teléfono es texto plano, el email es un `mailto` sin tracking, y la web dispara `trackOutboundClick` (GA4) pero **no** `trackValueEvent('contact_web')`. Resultado: el índice de valor solo "ve" el lead por WhatsApp; **subcuenta la intención de contacto** de las firmas donde el productor llama o escribe un mail (muy común en el público 45+).
- **Fix:** emitir `trackValueEvent('contact_phone'|'contact_email'|'contact_web', {entityType:'consignataria', entitySlug})` en cada link de la CARD C.

### 3. El medio del funnel de pago está a oscuras (gap)
- **Qué:** `checkout_start` (ledger w30), `checkout_redirect`, `claim_submit`, `claim_success` están instrumentados pero **0 en 90d**. Con `purchase` también en 0, **no se puede medir dónde se cae el funnel** entre ver `/planes` (106) y pagar (0).
- **Nota:** puede ser real (casi nadie llega a checkout) — pero entonces el hallazgo es *"el funnel de pago no arranca"*, que es en sí un dato. Verificar en Fase C que `checkout_start` dispara cuando se clickea pagar (que no esté roto el emisor).

---

## P1 — Confunden el análisis / dejan legs ciegos

### 4. Name mismatch GA4 ↔ ledger (drift, deliberado pero trampa)
- `sign_up` (GA4) ↔ `signup` (ledger, `analytics.ts:325`).
- `alert_subscribe` (GA4) ↔ `alert_create` (ledger, `analytics.ts:428`).
- **Impacto:** cualquiera que cruce GA4 con `value_events` por nombre de evento pierde estos dos silenciosamente. Está comentado en el código, pero no documentado fuera.
- **Fix:** o alinear nombres, o dejar asentado el mapa (ya queda en el plan). Recomendado: documentar, no romper — cambiar el nombre del ledger invalida series históricas.

### 5. Legs de retorno-por-email sin instrumentar (dead)
- `digest_open`, `digest_click`, `auction_email_click`, `watchlist_return`, `watchlist_notify_optin` tienen wrapper en `analytics.ts` pero **cero call-sites**.
- **Impacto:** toda la palanca de "traer de vuelta por email" (digest semanal, mails de subasta 0-3, aviso de watchlist) es **inmedible**. No sabés si el email trae gente.
- **Fix:** cablear en los links de los emails (querystring → handler que llame el wrapper) o quitar los wrappers muertos si la feature no existe. Decidir por leg.

### 6. Params duplicados en el muro PRO (drift)
- `pro_prompt_view`/`pro_prompt_click` emiten `prompt_context` **y** `context`, `prompt_variant` **y** `variant` (`analytics.ts:191-196, 203-207`).
- **Impacto:** ruido; dos dimensiones para lo mismo. Inofensivo pero ensucia el reporte.
- **Fix:** quedarse con `prompt_context`/`prompt_variant` (matchean el custom dim registrado) y borrar `context`/`variant`.

### 7. `profile_view` con doble fuente de verdad
- Dispara `trackProfileView` (GA4) **y** `POST /api/profile-views` (tabla `profile_views`) en `ConsignatariaProfileClient.tsx:491-494`.
- **Impacto:** dos conteos del mismo hecho (el key event #1). Pueden divergir (adblock frena GA pero no el fetch, o viceversa).
- **Fix:** definir cuál es autoritativo para reportes y reconciliar; documentar la diferencia esperada.

---

## P2 — Higiene / features de bajo volumen

### 8. 35 eventos definidos, no vistos en 90d
- Mayoría DT-e (`dte_*`, 8 eventos), claims (2), referrals (2), `milestone_share`, `widget_code_copy`, `inmag_csv_download`, `bulk_ics_export`, `remate_mark_toggle/login_prompt`, `newsletter_subscribe`, `lead_form`, `valuation_lead`.
- **Lectura:** no todos son bugs — DT-e y claims son features de bajo tráfico real. Pero conviene separar *"feature chica"* de *"emisor roto"*. Candidatos a verificar que realmente disparan (Fase C): `remate_mark_toggle` (alimenta karma), `newsletter_subscribe` (w8 recurrencia), `checkout_start`.

### 9. `account_nudge` (nuevo, Fase 1) — validar en el primer deploy
- Instrumentado y verificado en dev (toast aparece). Sin datos aún. Cuando salga a prod, chequear que `account_nudge{view,click,dismiss}` aparece y armar el embudo view→click.

---

## Candidatos a Key Event (hoy no marcados)
Los 4 key events actuales (`purchase`, `profile_view`, `outbound_click`, `auction_click`) dejan afuera señales de conversión más cercanas a la plata del modelo real:
- **`whatsapp_lead`** (lead B2B a nuestro número) — debería ser key event.
- **`alert_subscribe`** y **`calendar_subscribe`** (recurrencia = palanca #1 declarada).
- **`checkout_start`** (si el funnel de pago se activa).
- **`account_nudge` (click)** — la conversión a cuenta que estamos construyendo.

---

## Nota de método: por qué nada se ve en dev
`analytics.ts` solo dispara en `PROD_HOSTS` (`www/consignatarias.com.ar`); localhost y `*.vercel.app` se descartan a propósito (mantiene limpia la propiedad de prod). **Consecuencia:** hoy no hay forma de verificar en dev/CI que los eventos disparan. Eso es exactamente lo que resuelve la **Fase C** (modo test que fuerza el disparo + Playwright que lo afirma).
