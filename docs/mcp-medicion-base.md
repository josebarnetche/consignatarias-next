# MCP — medición base para atribuir los directorios

> Foto tomada el **22-10-2026**, el día en que se publicó la v1.9.0 en el registry oficial y se
> enviaron las altas gratis a mcpservers.org y MCP Market (ver `docs/mcp-distribucion.md`). Repetir
> la misma consulta el **19-11-2026** (4 semanas) y comparar. Son solo agregados: no hay datos personales.

## Uso semanal (`ops_events`, `event_type = 'mcp_call'`)

| Semana (lunes) | Llamadas | `tools/call` | Orígenes distintos en `tools/call` | `market_match` | `cattle_buying_request` |
|---|---|---|---|---|---|
| 21-09 | 9.955 | 623 | 49 | — | 0 |
| 28-09 | 24.332 | 1.151 | 59 | — | 0 |
| 05-10 | 21.867 | 1.640 | 74 | — | 0 |
| 12-10 | 20.164 | 1.505 | 77 | — | 0 |
| 19-10 (parcial, hasta el 22) | 8.722 | 736 | 38 | 1 (prueba propia) | 0 |

- La mayor parte de las "llamadas" son `initialize` / `tools/list` de escáneres. La métrica que importa es `tools/call`.
- La marca `probe` del clasificador de escáneres entró en v1.243.0. Antes de esa versión no hay histórico, así que hasta acá todas las llamadas cuentan como reales.

## Quién llama (últimos 7 días, `tools/call`)

| Cliente (user-agent) | Llamadas | Orígenes |
|---|---|---|
| `python-requests` | 856 | 34 |
| sin user-agent (la integración de Misiones, entre otras) | 453 | 19 |
| BrickBlueBot | 159 | 1 |
| `python-httpx` | 99 | 8 |
| claude-code (sesiones propias) | 24 | 1 |
| escáneres (MCPCheckup, rokmcp, evyAI, MCPYP, agent-collector) | ~29 | ~16 |

Las tools más usadas en 28 días son los alias en castellano: `get_indice_novillo` 882, `get_contexto_macro` 548, `get_precios_hacienda` 536 y `list_remates` 528. **No retirar los alias.**

## Leads (`producer_leads`, 28 días, por origen)

| Origen | Leads |
|---|---|
| `frigorifico` | 10 |
| `campos` | 5 |
| `demanda_compra:*` | 5 |
| `mcp:*` | 0 |

## Qué mirar el 19-11

1. Orígenes distintos en `tools/call` por semana. Es la señal de usuarios nuevos: base ~75 por semana.
2. Clientes nuevos en el user-agent (Claude, Cursor, VS Code, ChatGPT) que hoy no aparecen.
3. Llamadas a `market_match` y leads `mcp:market_match`. Base: 0.
4. Demandas con `consiente_contacto = true` (columna desde v1.244.0). Base: 0.

## Consulta

```sql
with m as (
  select created_at, metadata md from ops_events
  where event_type = 'mcp_call' and created_at >= now() - interval '28 days'
)
select date_trunc('week', created_at)::date semana,
  count(*) llamadas,
  count(*) filter (where md->>'method' = 'tools/call') tools_call,
  count(*) filter (where md->>'method' = 'tools/call' and coalesce(md->>'probe','false') <> 'true') tools_call_reales,
  count(distinct md->>'ip') filter (where md->>'method' = 'tools/call' and coalesce(md->>'probe','false') <> 'true') origenes_reales,
  count(*) filter (where md->>'tool' = 'market_match') market_match,
  count(*) filter (where md->>'tool' = 'cattle_buying_request') pedidos_compra
from m group by 1 order by 1;
```
