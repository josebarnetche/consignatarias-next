# Proyecto C — Fuente de verdad del esquema (Canon Agent)

> Cierra el hallazgo crítico del review general: no había fuente de verdad del esquema,
> con drift bidireccional repo↔prod que produce bugs reales que fallan en silencio.
> Fecha: 2026-07-03.

## 1. El problema (con evidencia)

El código habla con Postgres vía `.from('tabla')` / `.rpc('fn')` con **strings sin tipar**. Nada valida en compile-time que la tabla exista. Resultado: **drift bidireccional** entre el esquema del repo (migraciones) y el de producción, que produce bugs que fallan en silencio (por el patrón `catch {}` presente en todo el código de tracking/queries).

**Evidencia dura (verificada contra la DB de prod, proyecto `nyqkgorazkwcufkzxmhd`):**

- **Bug raíz — `src/components/dte/ActivationChecklist.tsx`** consultaba `.from('alerts')` y `.from('saved_remates')`: **ninguna de las dos tablas existe** (los nombres reales serían `alertas`/`remate_favorites`). Además usaba el client **anon del browser**, y aunque los nombres fueran correctos, RLS bloquea la lectura (`alertas` es service-role-only; `user_favorites` tiene RLS on sin policy). Dos bugs superpuestos → el checklist de activación nunca marcaba esos 2 pasos.

- **Drift "prod le falta lo que el repo tiene":** el escáner `check-db-refs` encontró **6 objetos** que las migraciones del repo crean pero **prod NO tiene**, con el código usándolos:
  | Objeto | refs en código | migración en repo | features afectadas |
  |---|---|---|---|
  | `user_dtes` | **17** | `20260318_user_dtes.sql` | TODO el feature DT-e (upload, historial, stats, onboarding) |
  | `remate_favorites` | 9 | `20260410_leads_and_favorites.sql` | watch/guardar remates |
  | `sell_zone_alerts` | 4 | `20260625_sell_zone_alerts.sql` | alertas de zona de venta (+ su cron) |
  | `consignataria_followers` | 3 | (view) | top-followed + DAL |
  | `webhooks` | 2 | `20260312_webhooks.sql` | registro de webhooks |
  | `increment_api_usage` | 1 | (existe en prod; el generador no lo listó — falso drift) | — |

  → Estas features **fallan en silencio en prod** hasta que se apliquen las migraciones. Nadie lo notó porque los errores se tragan.

- **Drift "no existe en ningún lado" (deuda, allowlisted):**
  - `users` (3 refs, `alertas/*` + `onboarding-emails`): el esquema de API-key legacy de `alertas` asume `public.users` con `api_key` en texto plano — **no existe ni en prod ni en migraciones**. El sistema de API-key de alertas está roto.
  - `cron_state` (2 refs, `cron/new-remate-alerts`): no existe ni en prod ni en migraciones (¿debería ser `cron_runs`?). El cron falla en silencio.

## 2. Causa raíz

**No hay una fuente de verdad del esquema, ni enforcement.** Concretamente:
1. Los clients Supabase (`supabase-server.ts`, `supabase-browser.ts`, `supabase.ts`) se instancian **sin tipos** (`createClient()` sin `<Database>`), así que `.from('cualquier_cosa')` compila.
2. Las migraciones del repo **no son la verdad de prod** — prod es un estado divergente (le faltan migraciones aplicadas, y tiene tablas que el repo no versiona, ej. `mag_*`, `market_price_snapshots`, `cron_runs`, `ops_events`).
3. Nada en CI/commit valida las referencias a tablas.

## 3. Fuentes de verdad creadas (Canonical Sources)

### `src/lib/database.types.ts`
- **Ubicación:** `src/lib/database.types.ts` (autogenerado desde el esquema de PROD).
- **Responsabilidad:** ser el snapshot tipado del esquema real de producción (tablas, vistas, columnas, funciones, enums).
- **Reemplaza a:** el conocimiento tácito de "qué tablas existen". Antes vivía solo en la cabeza de quien escribía el `.from()`.
- **Regenerar:** MCP `generate_typescript_types` o `supabase gen types typescript --project-id nyqkgorazkwcufkzxmhd`.
- **Siguiente paso (fuera de este PR):** tipar los clients (`createClient<Database>()`) para que `.from('alerts')` sea **error de compilación**. Se difirió porque tipar los 3 clients de golpe surface errores en las ~73 rutas con `.from()` ad-hoc (migración incremental).

### `scripts/check-db-refs.mjs`
- **Ubicación:** `scripts/check-db-refs.mjs` (`pnpm check:db-refs`).
- **Responsabilidad:** validar TODOS los `.from()` / `.rpc()` del código contra el esquema intendido = (prod desde los tipos) ∪ (objetos que crean las migraciones). Clasifica: OK / DRIFT (warning) / ERROR (bloquea) / ALLOWLIST (deuda documentada).
- **Reemplaza a:** "nada" — antes no existía validación. Habría cazado el bug de `ActivationChecklist` en el commit.
- **Enforcement:** corre en `.githooks/pre-commit` (bloquea el commit) y como `pnpm check`. La `ALLOWLIST` documenta la deuda conocida (`users`, `cron_state`) para que CI quede verde sin ocultar el problema.

## 4. Bug arreglado

`ActivationChecklist` ahora consume un endpoint server-side nuevo, **`GET /api/me/activation`** (`requireAuth` + `service_role`), que lee la tabla que **sí existe** (`user_favorites`): `hasSavedRemates` = siguió alguna consignataria; `hasAlerts` = con `notify_new_remate`. Se eliminaron los `.from('alerts')`/`.from('saved_remates')` del client anon. Test de regresión: `check-db-refs` (que ahora pasa) + el propio typecheck.

## 5. Plan de reconciliación

> **Actualización (v1.74.1, 2026-07-03): el paso 2 ya se ejecutó.** Se aplicaron a prod las 6 migraciones
> faltantes (`user_dtes`, `sell_zone_alerts`, `webhooks`, `remate_favorites` HARDENED, `consignataria_followers`,
> + fix de las 0 políticas de `user_favorites`), una por una, verificando RLS tras cada una y con el security
> advisor limpio al final. **Drift 6 → 0.** Versionadas en `supabase/migrations/20260703_reconcile_*.sql`.
> Quedan pendientes los pasos 1, 3 y 4.

El fix de fondo del drift "prod le falta migraciones" es **reconciliar prod contra el repo**. Es una decisión con impacto productivo, por eso se documenta en vez de aplicarse a ciegas:

1. **Baseline:** `supabase db pull` contra prod → commitear como `supabase/migrations/00000000_baseline_from_prod.sql`. Captura las tablas prod-only (`mag_*`, `market_price_snapshots`, `cron_runs`, `ops_events`, etc.).
2. **Aplicar las migraciones faltantes** (las 6 de DRIFT) a prod, **una por una y verificando**, para activar las features rotas (DT-e, alertas de zona, watch, followers, webhooks). ⚠️ Riesgo: son migraciones viejas nunca aplicadas; puede haber conflictos (ej. la doble definición de `whatsapp_clicks` que ya se detectó). NO aplicar en bloque.
3. **Resolver la deuda allowlisted:** migrar el API-key de `alertas/*` al sistema `api_keys` hasheado (elimina la dependencia de `public.users`); decidir `cron_state` (¿= `cron_runs`?).
4. **Tipar los clients** con `Database` + agregar `pnpm check` (tsc+eslint+db-refs) a un workflow de CI.

## 6. Patrón deprecado

**No usar:** `.from('tabla')` / `.rpc('fn')` sin verificar que el objeto existe en `database.types.ts`; y **no** consultar tablas con RLS desde el client anon/browser esperando leer filas de otro scope.
**Usar en su lugar:** referencias validadas por `check-db-refs` (corre en pre-commit); para datos con RLS o cross-tabla, un endpoint server-side con `service_role` (patrón `/api/me/activation`).
**Enforcement:** `.githooks/pre-commit` + `pnpm check:db-refs`. **Severidad:** alta (produce bugs silenciosos en prod).

## 7. Pendiente

- [x] **Aplicar las 6 migraciones faltantes a prod (§5.2)** — hecho en v1.74.1 (drift 6 → 0, advisor limpio).
- [ ] Verificar los 5 flujos end-to-end en prod (subir DT-e, alerta de zona, watch, follow, webhook).
- [ ] Baseline del esquema desde prod (`supabase db pull`) para versionar las ~16 tablas prod-only (§5.1).
- [ ] Tipar los clients Supabase con `<Database>` (migración incremental).
- [ ] Agregar `pnpm check` a CI (hoy solo pre-commit local).
- [ ] Vaciar la ALLOWLIST resolviendo `users` (API-key de alertas) y `cron_state`.
