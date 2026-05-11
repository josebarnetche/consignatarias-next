# Data Pack — El Oráculo

Companion to `data-pack.json`. Explains qué computa cada campo, cómo se verifica, qué quedó vacío y por qué.

**Generado por**: `scripts/el-oraculo/build-data-pack.py`
**Fecha de corrida**: 2026-05-10
**Versión**: 1.0

---

## Inputs usados

| Archivo | Filas / Estructura | Fuente |
|---|---|---|
| `src/lib/data/market-prices.json` | 337 días INMAG (2024-01-03 → 2026-05-08) + categorías derivadas + USD/maíz spot | Scraping pipeline consignatarias.com.ar (mercadoagroganadero.com.ar + dolarapi + MAGYP) |
| `scripts/monthly-report/cache/usd-monthly.json` | 14 meses (2025-04 → 2026-05), USD oficial + blue + brecha | api.argentinadatos.com/v1/cotizaciones/dolares (oficial+blue) |
| `scripts/monthly-report/cache/categories-2026-04.json` | 18 buckets MAG abril 2026 con cabezas, importe, peso, avg/median/min/max | mercadoagroganadero.com.ar/haciinfo000502 |
| `/tmp/faena.json` (live API) | 24 meses faena nacional 40.3_VC_0_M_15 | apis.datos.gob.ar/series/api/series (MAGYP / DNAA) |

### Comando exacto para reproducir descarga faena

```bash
curl -sL "https://apis.datos.gob.ar/series/api/series?ids=40.3_VC_0_M_15&limit=24&sort=desc&format=json" -o /tmp/faena.json
```

(`-L` es necesario porque el endpoint redirige a la versión con trailing slash. Sin `-L` el body queda vacío.)

---

## Estructura del JSON (campo por campo)

### `inmag_series`
Toda la serie diaria desde 2024-01-03. **No** se resample ni se interpola — los huecos calendario son sábados/domingos/feriados/días sin remate. Para auditar: `n_days_observed=337`, `calendar_span_days=857`, `calendar_days_without_data=520` (≈61% del calendario sin operación, consistente con que MAG opera ~3 días/semana en promedio).

### `inmag_today`
- `close_ars_per_kg` = último valor de la serie. `var_intraday_pct` viene directo del scraper.
- `var_30d_pct` = `(close − value_30d_atras) / value_30d_atras × 100`. El builder busca el dato más reciente con `date ≤ last_day − 30d`. Hoy: **+2,26%** vs **2026-04-08** (4329,89).
- `var_yoy_nominal_pct` = mismo método con 365 días. Hoy: **+53,95%** vs **2025-05-07** (2876,19).

### `inmag_usd_oficial`
- `today_usd` = `inmag_today / usd_oficial_today` = **3,118 USD/kg vivo**.
- `trailing_12m_series` = 12 entradas (Jun 2025 → May 2026). Por cada mes: USD oficial avg, USD blue avg, brecha, INMAG ARS wavg ponderado por volumen, INMAG USD = ARS/USD oficial avg.
- `yoy_change_real_usd_pct` = (USD del último mes − USD del primer mes del trailing) / USD primer mes × 100. Resultado: **+27,46%** real en USD (Jun 2025: 2,356 → May 2026: 3,003).
- `vs_pre_2018_average_usd` = `null`. **Por qué**: `usd-monthly.json` arranca en 2025-04. Para comparar contra promedio 2017 (Liniers vivo) habría que extender el pull de api.argentinadatos.com a histórico completo. No se hizo en esta corrida — pull histórico ampliado es trabajo de otra sesión (1 query adicional con `?desde=2017-01-01`).

### `channels_split`
Triangula Fauba 2018 (71% directa, 12% MAG, 9% feria, 2% gancho) con Iriarte 2008 (54,6% directo sin intervención + 17,5% con intervención + 10,1% MAG + 9,2% feria + 1,7% gancho + 5% negro). Campo `convergencia` explica que el 71% de Fauba corresponde a 54,6%+17,5%=72,1% de Iriarte. Campo `dark_pool_pct=78` consolida el universo opaco (directa total + gancheras + negro).

### `liniers_mag_oracle_evidence`
- `max_coverage_pct_historical` = serie de hitos: 1967 pico 34%, 2001 pico moderno 20,8%, 2007 piso 10,1%, 2018 Fauba 12%.
- `radius_km_influence=800` (Iriarte p.103-104).
- `media_difusion`: 1.100 repetidoras Canal Rural + 15k visitas/día sitio Liniers (Iriarte).
- `five_reasons_price_formation`: 5 razones por las que un mercado con <15% del volumen es formador de precio. Síntesis bibliográfica.
- `premium_liniers_vs_periferia_pct=8.63`: Liniers $92,4 vs SOB $85,06 el 27/05/2020 (Diez 2020 p.29). **Punto único, no serie** — limitación declarada.

### `faena_nacional`
- `series_24m`: 24 meses ordenados cronológicamente, oldest first. Última observación: **2026-02 = 924.333 cabezas**.
- `current_yoy_pct=-10.67%`, `current_mom_pct=-9.26%`.
- `trailing_12m_total_M_cabezas=13.345` — dentro de banda canónica Fauba (11,5-15M).
- `share_hembras_pct=null` — la serie `40.3_VC_0_M_15` es total bovino, sin desglose por sexo. Para % hembras hay que usar otra serie de datos.gob.ar (por ej. `40.3_VC_F_M_15` y `40.3_VC_M_M_15` — no verificadas en esta corrida) o IPCVA mensual.
- `ratio_t_n=null` — MAG Cañuelas no remata terneros (invernada va a feria regional / Rosgan). Vacío del scraper actual.

### `consignatarias_padron`
- `iriarte_2008_total=441` con desglose provincial (BA 162, CABA 89, SF 53, CBA 50, ER 22, Corrientes 20, LP 16, "otras" 29).
- `today_estimate=null` — no hay padrón actualizado público.
- `today_pipeline_canonical_entities=70` (slugs canónicos en `consignataria-slugs.ts`). Es un subset del universo, no el censo.

### `comisiones_por_canal`
Triangula 4 fuentes con números no contradictorios (miden lados distintos del libro). Calcula también `feria_consignataria_share_of_cost_pct=55.7` (Diez 2020 p.27): en feria de terneros, la comisión consignataria es el 55,7% del costo total de transacción del productor.

### `buckets_detallados_abril_2026`
Computado del archivo `categories-2026-04.json`. **Métricas clave**:
- `total_cabezas=78647` en 18 buckets activos.
- `ars_per_kg_wavg=3528.01` — peso real ponderado: `sum(importe_ars) / sum(peso_prom_kg)`. **No** es promedio simple de los `avg` de cada bucket (que sería sesgado por buckets chicos).
- `top_5_concentration_pct=62.54%` — los 5 buckets más grandes (por cabezas) concentran 62,5% del volumen mensual de MAG. Top 5 incluye VACAS Regular (16.135 cab), VAQUILLONAS Esp h390 (11.736), NOVILLOS Esp.Joven +430 (8.397), VACAS Esp.Joven +430 (6.884), NOVILLITOS Esp h390 (6.036).
- `share_hembras_mag_pct=65.33%` — (VACAS + VAQUILLONAS) / total. Solo dentro del universo MAG, **no** es share nacional.
- `outliers_detected` = 7 buckets con `max/min ≥ 2.5x` (dispersión amplia, indica heterogeneidad). Por ej. VACAS Esp.Joven h430 con $1.700-$4.000.
- `missing_categories` = TERNEROS (no se remata en MAG Cañuelas).

### `categorias_derivadas_today`
Pasa por copia los 6 valores de `market-prices.json/categories`. Estos son derivaciones del INMAG con ratios fijos del scraper (ver `CLAUDE.md`). **Nota crítica**: comparar contra los buckets MAG reales (`buckets_detallados_abril_2026`) para validar el ratio — los porcentajes derivados pueden no coincidir con observación MAG real.

### `meganar_caso`
Caso de estudio Scoponi-Santi 2018. Operatoria 2011-04-05 → 2017-03 (6 años). Ahorro **-33,34% costos** vs feria (ARS 32.629 vs 48.944 en caso 2017). 3 consignatarios habilitados (Aberasturi, Brazzola, ACA). Volumen agregado nunca publicado — solo se conoce Brazzola individual (10.129 cab en 6 años = ~1.688/año). Razón de cierre: insuficiencia de volumen, **no** falla técnica.

### `ciclo_ganadero`
Rangos canónicos (Fauba p.15-19): stock 48-56M, faena 11,5-15M, hembras faena 40-52%, T/N 0,97-1,10. Stock 2018 SENASA = 53,9M (concentración BA 35% + SF 11% + CBA 9% = 55% top 3). Faena trailing 12m actual (13,345M) dentro de banda. Fase actual no determinable sin T/N + % hembras (vacíos declarados).

### `macro_context`
USD oficial 1420, blue 1400, brecha -1,41% (blue debajo del oficial — fenómeno de los últimos meses). Maíz FOB 234,17 USD/tn.

### `timeline_oracle`
14 eventos institucionales 1901-2026 del mercado bovino argentino. Cierra con la observación actual: INMAG 2026-05-08 = **ARS 4.427,78/kg = USD 3,118/kg vivo**.

### `limitations_disclosed`
11 limitaciones declaradas. Las más importantes para el manifiesto:
1. Sesgo pampeano de las 4 fuentes bibliográficas.
2. Vacío post-2018 (cierre Liniers).
3. 78% del volumen sin price discovery público.
4. Comparativa USD pre-2018 no hecha en esta corrida.
5. T/N no computable con scraper actual.
6. Premium Liniers/SOB es punto único.

### `compute_notes`
12 fórmulas / reglas de cómputo documentadas para reproducibilidad.

---

## Verificación cruzada de magnitudes

Spot-check sobre valores que deberían cuadrar:

| Métrica | Valor | Verificación |
|---|---|---|
| INMAG close 2026-05-08 | 4427.78 | ✓ Coincide con `market-prices.json/inmag/current` |
| INMAG USD today | 3.118 | ✓ 4427.78 / 1420 = 3,1182... |
| Brecha hoy | -1.41% | ✓ (1400-1420)/1420 = -1,408% |
| Buckets total cabezas abril | 78.647 | ✓ Suma de 18 buckets de `categories-2026-04.json` |
| Faena trailing 12m | 13,345M | ✓ Suma últimos 12 meses serie 40.3_VC_0_M_15 |
| Faena YoY 2026-02 | -10,67% | ✓ (924.333 − 1.034.684)/1.034.684 = -10,67% |

---

## Vacíos honestos (qué NO se computa y por qué)

| Métrica | Por qué quedó vacía |
|---|---|
| `inmag_usd_oficial.vs_pre_2018_average_usd` | usd-monthly.json arranca 2025-04. Requiere pull histórico ampliado de api.argentinadatos.com (1 query). |
| `faena_nacional.share_hembras_pct` | Serie `40.3_VC_0_M_15` no desglosa por sexo. Necesita serie complementaria por sexo o IPCVA. |
| `faena_nacional.ratio_t_n` | MAG Cañuelas no remata terneros. Vacío del scraper actual. |
| `consignatarias_padron.today_estimate` | Censo público no existe desde 2008. Es uno de los reports priorizados (#6 El Padrón). |
| `meganar_caso.volumen_agregado_total` | Vacío del paper Scoponi-Santi (solo publicaron Brazzola individual). |
| `liniers_mag_oracle_evidence.premium_liniers_vs_periferia_pct` (serie) | Diez 2020 es punto único 27/05/2020. Serie histórica diaria no disponible en bibliografía leída. |

---

## Cómo regenerar

```bash
cd /Users/josebarnetche/consignatarias
# (opcional) refresh faena 24m
curl -sL "https://apis.datos.gob.ar/series/api/series?ids=40.3_VC_0_M_15&limit=24&sort=desc&format=json" -o /tmp/faena.json
# rebuild data pack
python3 scripts/el-oraculo/build-data-pack.py
```

Output: `scripts/el-oraculo/data-pack.json` (~57 KB, 19 campos top-level).

---

## Restricciones respetadas

- ✓ No se modificaron archivos en `src/lib/data/` ni en `scripts/monthly-report/`.
- ✓ No se inventaron datos — todo valor vacío está marcado `null` con nota explícita.
- ✓ Precisión preservada (8,63%, 33,34%, 54,6%, etc. — sin redondeos arbitrarios).
- ✓ Cifras numéricas con `.` decimal (estándar JSON).
- ✓ Cada campo bibliográfico lleva `source` con archivo + página.
- ✓ Voz neutra de research.
