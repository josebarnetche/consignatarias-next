# Analytics — tracking plan, auditoría y verificación

Trabajo de tracking sobre el instrumentado de consignatarias.com.ar. Metodología adaptada del skill `analytics-tracking-automation` (analyze → schema → audit → verify), **sin GTM**: el sitio usa `gtag.js` directo (`src/lib/analytics.ts`) + un ledger propio de valor (`value_events`, definido en `src/lib/value-events.ts`).

## Los archivos

| Archivo | Fase | Qué es |
|---|---|---|
| [`tracking-plan.json`](./tracking-plan.json) | **A** | Fuente de verdad: los ~55 eventos custom (+ auto de GA4), con dónde se disparan, params, si son key event, su peso/grupo en el ledger, y cuántos se vieron en GA4 (90d). |
| [`audit.md`](./audit.md) | **B** | Auditoría priorizada (P0/P1/P2): drift, eventos muertos, gaps y candidatos a key event. |
| `../../e2e/analytics.spec.ts` | **C** | Test que afirma que los eventos críticos disparan. |
| `../../playwright.config.ts` | **C** | Config del runner. |

## Dos sistemas de eventos (importante)

1. **GA4** — `trackEvent()` → `gtag('event', …)`. Solo dispara en `PROD_HOSTS` (`www/consignatarias.com.ar`); localhost y previews se descartan a propósito.
2. **Ledger de valor** — `trackValueEvent()`/`emitValueBeacon()` → beacon a `/api/track/event` → tabla `value_events`. Cada evento tiene un **peso** (proximidad a la plata) definido server-side en `value-events.ts`. Índice de valor = Σ count×peso.

⚠️ **No comparten taxonomía en 2 casos** (ver audit.md P1-4): `sign_up`(GA4)=`signup`(ledger), `alert_subscribe`(GA4)=`alert_create`(ledger).

## Hallazgos top de la auditoría

- **P0** — `calendar_download` usa `window.gtag` crudo (bypassa helper + ledger); el índice de valor está **ciego a leads por teléfono/email/web** (`contact_phone/email/web` definidos con peso pero nunca emitidos); el medio del funnel de pago (`checkout_start`…`purchase`) está en 0.
- **P1** — name mismatches GA4↔ledger; legs de retorno-por-email sin instrumentar (`digest_*`, `auction_email_click`); params duplicados en el muro PRO; `profile_view` con doble fuente de verdad.

## Cómo verificar el tracking (Fase C)

En dev/CI los eventos **no** disparan (guardados en `PROD_HOSTS`). Para poder verificarlos, `analytics.ts` tiene un **hook de modo-test**: si `window.__CNSG_TRACK_TEST__ === true` (seteado por el harness ANTES de cargar la página), cada evento que pasa por `trackEvent` se acumula en `window.__cnsgEvents`. Es puramente aditivo — en producción el flag nunca se setea, cero efecto.

Verificado en vivo (2026-07-09): en `/calculadora`, calcular captura `calculadora_calculate` + `account_nudge` con sus params.

### Correr el suite (install de una sola vez)

```bash
npm i -D @playwright/test
npx playwright install chromium
npx playwright test                       # levanta pnpm dev solo si hace falta
E2E_BASE_URL=https://www.consignatarias.com.ar npx playwright test   # contra prod (ojo: dispara a GA4 real)
```

Sugerido agregar a `package.json`: `"test:e2e": "playwright test"`.

> Nota: `calendar_download` NO aparece en la captura del helper a propósito — usa `window.gtag` crudo (drift P0-1). Cuando se arregle, sumar su assert al spec.

## Qué NO se hizo (y por qué)

- **No se migró a GTM.** No aporta al stack (gtag directo) y sumaría OAuth de escritura + telemetría de un tercero. El valor de la skill era la *metodología* (plan + verificación), no la herramienta.
- **No se instaló Playwright en deps.** Es una decisión de dependencia; queda el spec listo y el comando de install documentado.
