# Identificar consumidores de la API (quién pega qué, y desde dónde)

> v1.121.0 (07-jul-2026). Antes solo teníamos el conteo diario por key
> (`api_usage_daily`) y el route a secas en `ops_events` — no alcanzaba para
> saber si un consumidor (p.ej. **Muu / Apesteguía**) usa `?detallado`,
> `?serie`, ni desde qué host/app. Ahora sí.

## Qué se loguea

Cada request que presenta una key **válida** deja una fila en `api_request_log`
(vía `after()` en `authenticate()`, best-effort, no bloquea la respuesta):
`method · path · query · user_agent · referer · ip · ts`. Cubre TODOS los
endpoints auth-gated (`/api/precios`, `/api/lots`, …) desde un solo lugar.

## La query que responde "¿qué es changa?"

```sql
-- Resumen de UN consumidor: paths, params, user-agents, IPs
SELECT * FROM api_consumers_summary WHERE owner_email = 'mapesteguia@gmail.com';
```

Cómo leer el resultado para el caso Muu:
- **`queries` incluye `?detallado=true`** → arma el board de mín/máx/cantidad
  con NUESTRA data → Muu (o su backend) consume la API. Fuerte señal de que
  la pantalla "Precios Hoy" es nuestra.
- **`queries` solo tiene el default / `?categoria=` / `?serie=`** → usa la API
  para otra cosa (un precio por categoría, la serie histórica) y el board de
  Muu lo arma scrapeando el MAG por su cuenta → la hipótesis de Jose.
- **`user_agents`**: un UA tipo `okhttp/…` o `Dart/…` delata una app móvil
  (Muu es nativa, app-id `deq.muu.app`). Un UA de server (`node`, `python`,
  `axios`) sugiere un backend/cron.
- **`ips`**: geolocalizá el host. Un datacenter en Rosario/GCP/AWS ≈ backend de
  Muu (Merdigan S.A., Rosario). La IP fija identifica el origen.

## Consultas útiles

```sql
-- Últimos 50 requests crudos de una key (con params y UA)
SELECT l.ts, l.path, l.query, l.user_agent, l.ip
FROM api_request_log l JOIN api_keys k ON k.id = l.api_key_id
WHERE k.prefix = 'cnsg_live_49d7' ORDER BY l.ts DESC LIMIT 50;

-- Todos los consumidores de un vistazo
SELECT prefix, key_name, owner_email, reqs, ultimo, queries, user_agents, ips
FROM api_consumers_summary ORDER BY reqs DESC;

-- Patrón intradía de una key (¿app refrescando o cron?)
SELECT date_trunc('hour', ts) AS hora, count(*)
FROM api_request_log l JOIN api_keys k ON k.id=l.api_key_id
WHERE k.prefix='cnsg_live_49d7' GROUP BY 1 ORDER BY 1 DESC LIMIT 48;
```

## Notas

- **Retención**: volumen bajísimo hoy (~32 req/día/key). Si crece, agregar un
  cron de pruning (>90 días) — por ahora innecesario.
- **Privacidad**: se guarda la IP del *caller* (un servidor/app B2B, no un
  usuario final) para poder identificar el origen del consumo. No es PII de
  navegación; es infraestructura del cliente API.
- **ops_events** sigue con su rol app-wide (latencia, status). `api_request_log`
  es el detalle fino específico de consumidores B2B.
