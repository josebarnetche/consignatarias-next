# Catálogo de endpoints del MAG (Mercado Agroganadero)

> **Verificado en vivo el 2026-07-04** sondeando `mercadoagroganadero.com.ar/dll/*` y extrayendo el
> menú oficial del hub "Hacienda — Centro de datos y operaciones" (`haciinfo000001`).
> Este es el inventario completo de las fuentes de datos públicas del MAG, qué devuelve cada una,
> cuáles ya consumimos y dónde, y las oportunidades abiertas para la API/MCP.

Base URL: `https://www.mercadoagroganadero.com.ar/dll/<dll>.dll/<endpoint>`
Parámetros de rango (donde aplica): `?txtFECHAINI=dd/mm/yyyy&txtFECHAFIN=dd/mm/yyyy` (+ `&CP=&LISTADO=SI` en algunos).
Encoding: **latin-1** (no UTF-8). HTML de tablas `<TR>/<TD>` parseable por regex.

---

## Los que YA consumimos

| Endpoint | DLL | Nombre oficial | Dónde lo usamos |
|---|---|---|---|
| `haciinfo000002` | hacienda1 | Precios por Categoría (Clasificación **RUCA**) | `scrape-auctions.mjs` → `market-prices.json.categories` (6 categorías del sitio) |
| `haciinfo000003` | hacienda1 | **Entrada por Provincia** | `scrape-auctions.mjs` → `market-prices.json.provinceEntry` |
| `haciinfo000006` | hacienda1 | **Entrada por Consignatario** | `scrape-auctions.mjs` → `consignatarioEntry` + `auctionDayEntries` (datos MAG en perfiles) |
| `haciinfo000007` | hacienda1 | Analítico de ventas por consignatario (**lote-level**) | `mag-lots-pipeline.yml` → `mag_consignataria_sales_lots` → `/api/lots` ✅ pipeline revivido en v1.106.0 (cosechando) |
| `haciinfo000011` | hacienda2 | **Totales de cabezas, importes e I.N.M.A.G.** en un período | `scrape-auctions.mjs` (fuente del INMAG diario) → `market-prices.json.inmag` + `mag_inmag_history` |
| `haciinfo000013` | hacienda2 | **Índice Sugerido para Arrendamientos Rurales** (INMAG/ROFEX por día) | ✅ **v1.104.0**: `scrapeArrendamientoOficial()` → `market-prices.json.arrendamientoOficial` → MCP `calcular_arrendamiento` + `get_contexto_macro` + `/api/precios.indice_arrendamiento_oficial` |
| `haciinfo000502` | hacienda1 | Precios por Categoría **RESOL-2018-32-APN-SGA#MPYT** (16 subcategorías) | `mag-detailed-prices.yml` → `mag_prices_detailed` → `/api/precios?detallado=true` + MCP `get_precios_detallados` |

## Los que NO consumimos (oportunidades)

| Endpoint | DLL | Nombre oficial | Qué devuelve | Oportunidad |
|---|---|---|---|---|
| `haciinfo000005` | hacienda1 | **Movimientos de Hacienda** | Movimientos (ingresos/egresos) del mercado | Señal de oferta intradiaria; explorar formato |
| `haciinfo000014` | hacienda2 | **Índice General MAG en un período** | Serie del índice general por rango de fechas | Backfill/verificación cruzada del INMAG histórico |
| `haciinfo000224` | hacienda6 | **Analítico de Precios (Clasificación MAG)** | Analítico por categoría con la clasificación propia del MAG | Tercera vista de precios (RUCA vs RESOL vs MAG); enriquecer `?detallado` |
| `haciinfo000225` | hacienda6 | **Resumen de Precios (Clasificación MAG)** | Resumen agregado de la clasificación MAG | Ídem — versión resumen |
| `haciinfo000307` | hacienda6 | **Precio Novillitos 401/420 kg** | Serie Max/Mín/Prom/Mediana + cabezas + kg **desde el 9/12/2005** (era Liniers + era MAG). ⚠️ el DLL NO acepta rangos largos: pedir MES a MES | ✅ **v1.108.0**: backfill `scripts/backfill-novillitos.mjs` → `mag_novillito_history` · upkeep diario en `/api/cron/scrape-mag-detailed` · API `GET /api/precios?historico=N&serie=novillitos` |
| `hacigraf000015` | hacienda2 | Gráfico cabezas remitidas por **Remitente** | Gráfico (JS) por remitente | Dato a nivel PRODUCTOR (ver `docs/archive/BATTLE-6-REMITENTE-NETWORK.md`) |
| `hacigraf000016` | hacienda2 | Evolución precios promedios por categoría | Gráfico de evolución | Redundante con nuestra serie propia |

## Índice / navegación

| Endpoint | DLL | Qué es |
|---|---|---|
| `haciinfo000001` | hacienda1 | Hub "Hacienda — Centro de datos y operaciones" (el menú de todo lo de arriba; útil para detectar endpoints nuevos) |
| `servrema000001` | servicios1 | Página de remates del MAG |
| `haciinfo000004` | hacienda1 | Error ("Mercado de Liniers - Error 1") — legacy Liniers, muerto |

Probados y muertos (stub de 15 bytes): h1/000008-000011, h1/000013, h2/000001-000007, h2/000010, h2/000012, serie h1/0005xx (solo vive 000502).

---

## Formato de `haciinfo000013` (integrado en v1.104.0)

```
GET hacienda2.dll/haciinfo000013?txtFECHAINI=29/06/2026&txtFECHAFIN=03/07/2026
→ tabla por día: Fecha | Cab. ingresadas | Importe | Índice Arrendamiento | Variación
→ fila "Totales": cabezas, importe, índice del período
Ej. real (03/07/2026): índice 4.198,438 · período 24/06→03/07: 4.213,507
```

El índice viene con 3 decimales y coma (`4.198,438`); el parser identifica la celda por posición
(4ª no-vacía) + patrón `\d,\d{3}$`. Días sin operación no aparecen (no hay fila).

## Próximos pasos sugeridos (por valor)

1. ~~P0 — revivir `mag-lots-pipeline` (000007)~~ ✅ hecho en v1.106.0 (05-jul, sesión paralela):
   params del DLL corregidos + constraint única del upsert; la tabla cosecha (322+ filas, 2.816 jobs
   re-encolados). Siguiente: comparador por **precio logrado**.
2. ~~P1 — serie Novillitos 401/420 (000307)~~ ✅ hecho en v1.108.0 (05-jul): tabla
   `mag_novillito_history` + backfill 2005→hoy + upkeep diario + `?serie=novillitos` en la API.
3. **P2 — analítico/resumen clasificación MAG (000224/225):** tercera clasificación de precios para
   `?detallado`.
4. **P2 — movimientos de hacienda (000005):** explorar formato; posible señal de oferta.

*Actualizá este catálogo re-sondeando `haciinfo000001` (el menú del hub) — si el MAG agrega un
endpoint, aparece ahí.*
