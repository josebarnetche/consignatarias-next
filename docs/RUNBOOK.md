# RUNBOOK — consignatarias.com.ar

> Cómo se opera la infraestructura: secrets, crons, pipeline de email, observabilidad
> e incidentes. Si algo "no anda", empezá por el playbook correspondiente abajo.

---

## 1. Plataforma

| Capa | Qué |
|---|---|
| Framework / hosting | Next.js 15 (App Router) en **Vercel**. Push a `main` → deploy de producción automático. |
| Base de datos / auth | **Supabase** (`nyqkgorazkwcufkzxmhd`). Escrituras con service-role; lectura pública vía anon + RLS. |
| Email | **Resend** (dominio verificado: `consignatarias.com`). |
| Pagos | **Rebill** (ARS) + transferencia/USDT (Enterprise). |
| Crons | **GitHub Actions** (`.github/workflows/*.yml`). `vercel.json` crons = vacío a propósito. |
| Observabilidad | `/admin/ops` (lee `ops_events` + `cron_runs`). |

**Variables de entorno / secrets:** ver [`.env.example`](../.env.example) — documenta cada una.

---

## 2. Secrets — la regla de oro

- **`CRON_SECRET`** es el secret compartido de **todos** los crons (datos y email). Los workflows
  lo mandan como `Authorization: Bearer ${{ secrets.CRON_SECRET }}`. **Debe ser idéntico en
  GitHub repo secrets y en Vercel.**
- **`ADMIN_SECRET`** está **deprecado**. Las rutas de cron de email lo aceptan por compatibilidad
  (`authorizeCron()`), pero la fuente de verdad es `CRON_SECRET`.
- **`INTERNAL_API_SECRET`** → solo para el bridge `/api/internal/cron-hook` (logging de crons).
- **`RESEND_API_KEY`** → sin esto, **todo envío de email es no-op silencioso**.
- **`API_KEY_PEPPER`** → NUNCA rotar sin invalidar todas las API keys `cnsg_live_*`.

> 🔥 **Gotcha histórico (mayo 2026):** los crons de email pedían `ADMIN_SECRET` (sin setear)
> mientras los de datos usaban `CRON_SECRET`. Resultado: emails caídos con 401 silencioso
> durante semanas, y el `curl` del workflow lo ocultaba con check verde. Fix: `authorizeCron()`
> acepta ambos + los workflows fallan en rojo ante no-2xx. **Lección: un solo secret, y los
> workflows deben fallar ruidoso.**

---

## 3. Inventario de crons

| Workflow | Schedule (UTC) | Hace | Auth | Loguea a cron_runs |
|---|---|---|---|---|
| scrape-auctions | diario 14 ART | scrapea remates + precios → commit | (script, no route) | vía cron-hook* |
| mag-detailed-prices | 15:30 ART L-V | 16 subcategorías MAG | CRON_SECRET | vía cron-hook* |
| mag-lots-pipeline | Mar/Mié/Vie | datos lote-level | CRON_SECRET | vía cron-hook* |
| backfill-inmag / backfill-usd | bajo demanda | rellena series | CRON_SECRET | vía cron-hook* |
| scrape-senasa-habilitados | mensual | padrón SENASA | (script) | vía cron-hook* |
| **weekly-newsletter** | **Lun 13 UTC** | resumen semanal de remates | CRON_SECRET | ✅ sí (trackCron) |
| **monthly-close** | **día 1, 14 UTC** | cierre INMAG mensual | CRON_SECRET | ✅ sí |
| **faena-newsletter** | **día 3, 13 UTC** | reporte de faena | CRON_SECRET | ✅ sí |
| **el-corredor-publish** | **día 1, 17 UTC** | publica + blast El Corredor | EL_CORREDOR_BLAST_TOKEN | ✅ sí |
| quota-alerts | Lun 10 ART | aviso 80% de cupo API | CRON_SECRET | vía cron-hook* |
| trial-nudges | diario | nudges fin de trial (7d/3d) | CRON_SECRET | vía cron-hook* |
| post-remate-outreach | horario | outreach post-remate a consignatarias | CRON_SECRET | vía cron-hook* |
| **(disabled)** new-remate-alerts, remate-reminders, mag-remitentes, monthly-metrics | — | en `.github/workflows/disabled/` | — | — |

\* **Crons de datos → cron-hook:** para que aparezcan en `/admin/ops`, el workflow debe reportar
inicio/fin a `/api/internal/cron-hook`. Patrón listo para pegar:

```yaml
      - name: cron-hook start
        id: cronstart
        run: |
          RUN_ID=$(curl -s -X POST "$BASE/api/internal/cron-hook" \
            -H "Authorization: Bearer ${{ secrets.INTERNAL_API_SECRET }}" \
            -H "Content-Type: application/json" \
            -d '{"workflow_name":"scrape-auctions","phase":"start"}' | jq -r .run_id)
          echo "run_id=$RUN_ID" >> $GITHUB_OUTPUT
        env: { BASE: https://www.consignatarias.com.ar }
      # ... pasos del job ...
      - name: cron-hook finish
        if: always()
        run: |
          ST="ok"; [ "${{ job.status }}" != "success" ] && ST="error"
          curl -s -X POST "https://www.consignatarias.com.ar/api/internal/cron-hook" \
            -H "Authorization: Bearer ${{ secrets.INTERNAL_API_SECRET }}" \
            -H "Content-Type: application/json" \
            -d "{\"workflow_name\":\"scrape-auctions\",\"phase\":\"finish\",\"run_id\":${{ steps.cronstart.outputs.run_id }},\"status\":\"$ST\"}"
```

Los 4 crons de email **ya** se auto-loguean (helper `trackCron`), así que no necesitan el hook.

### Disparar / verificar un cron a mano
```bash
# Disparar por GitHub Actions (recomendado — usa el secret correcto):
gh workflow run weekly-newsletter.yml
gh run list --workflow=weekly-newsletter.yml --limit 1
gh run view <run-id> --log | grep HTTP        # → "HTTP 200 — {sent:N}"

# Dry-run del cierre SIN spamear (manda 1 solo email):
curl -X POST "https://www.consignatarias.com.ar/api/cron/monthly-close?test=tu@email" \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## 4. Pipeline de email (qué recibe cada quien)

Segmentación en `src/lib/newsletter-segments.ts` — **cada `source` recibe SOLO lo que pidió**:

| Segmento | Sources | Lo manda |
|---|---|---|
| weekly (resumen semanal) | remates, reporte-semanal, homepage **+ todo source no mapeado** | weekly-newsletter |
| monthlyClose (cierre INMAG) | cierre-mensual, valuation_widget, calculadora | monthly-close |
| faena | frigorificos | faena-newsletter |
| corredor | el-corredor | el-corredor blast |
| product-only (sin emails de mercado) | exportar-datos, calendar-export, comparar-consignatarias | — |
| excluido | heartbeat-test, `test*` | — |

- **Fail-safe:** `isWeeklyRecipient()` mete cualquier source **no mapeado** (rebill, fab, manual,
  web, etc.) al digest semanal → **un suscriptor nuevo nunca queda huérfano.**
- **Tope plan free Resend:** `capForFreePlan` topea cada envío (100/día, 3000/mes; default 80).
  Si se acerca el tope → Resend Pro o batchear.
- **Bienvenida:** transaccional, al suscribirse (no es el digest).

---

## 5. Observabilidad — `/admin/ops`

- **`ops_events`** — eventos de la API (`api_call` ok/error en `/api/precios`, `/api/lots`).
- **`cron_runs`** — una fila por corrida de cron (status + metadata con `{sent,total,errors}`).
  Los 4 crons de email loguean acá; los de datos lo hacen vía cron-hook (ver §3).
- El dashboard compara contra `EXPECTED_CRONS` (en `src/lib/ops.ts`) y marca atrasados.

---

## 6. Playbooks de incidente

**"Los suscriptores no reciben emails"**
1. `/admin/ops` → ¿corrió el cron? ¿status ok y `sent>0`?
2. `gh run view <run-id> --log` → ¿HTTP 200? Si 401 → `CRON_SECRET` no coincide GH↔Vercel.
3. ¿`RESEND_API_KEY` seteada en Vercel? Sin ella, no-op silencioso.
4. Resend dashboard → bounces/suppressed. Limpiar direcciones muertas (`status='unsubscribed'`).
5. ¿El `source` del suscriptor cae en un segmento? (el fail-safe debería cubrirlo).

**"Los datos están desactualizados"** (precios/remates viejos)
1. `/admin/ops` (o GitHub Actions) → ¿corrió scrape-auctions / mag-detailed hoy?
2. Revisar el run del workflow; reintentar con `gh workflow run scrape-auctions.yml`.
3. La fuente (MAG/SENASA) puede haber cambiado su HTML → revisar el parser.

**"Errores en la API"** → `/admin/ops` filtrar `api_call` status=error; revisar `route` + `status_code`.

**Deploy / rollback** → push a `main` despliega. Rollback: revertir el commit y push, o promover un
deploy previo desde el dashboard de Vercel.

---

## 7. Release

Push a `main` → Vercel deploya. Versionado y tags: ver [`VERSIONING.md`](./VERSIONING.md).
Cada release relevante se documenta en [`CHANGELOG.md`](../CHANGELOG.md).
