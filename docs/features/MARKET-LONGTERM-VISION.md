# Feature: Visión de Largo Plazo del Mercado

> **Insight #77** — Panel de mercado con perspectiva histórica (2022-presente)

## Contexto

Actualmente `/mercado/inmag` muestra ~2.5 meses de datos diarios. Los usuarios necesitan contexto histórico para:
- Entender tendencias macro
- Comparar con años anteriores
- Identificar patrones estacionales
- Tomar decisiones de compra/venta informadas

## Data Sources

| Fuente | Granularidad | Rango | Disponibilidad |
|--------|--------------|-------|----------------|
| Scraping diario | Diario | Dic 2025 → presente | ✅ Automático |
| MAGYP PDFs | Mensual | 2022 → presente | ✅ Manual/backfill |

## Arquitectura Propuesta

```
src/lib/data/
├── market-prices.json          # Diario (actual)
├── market-monthly.json         # Mensual histórico (nuevo)
└── market-categories.json      # Por categoría mensual (nuevo)

src/app/mercado/
├── inmag/
│   └── page.tsx               # Vista diaria (actual)
├── historico/
│   └── page.tsx               # Vista largo plazo (nuevo)
└── page.tsx                   # Landing con ambas vistas
```

## UI/UX

### 1. Página Principal `/mercado`

```
┌─────────────────────────────────────────────────────────┐
│  📊 MERCADO GANADERO                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │ INMAG HOY       │  │ TENDENCIA       │              │
│  │ $4,559.55       │  │ ▲ +9.5% YTD     │              │
│  │ ▲ +3.1% semanal │  │ ▲ +120% vs 2023 │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                         │
│  [Ver detalle diario]  [Ver histórico]                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2. Vista Histórica `/mercado/historico`

```
┌─────────────────────────────────────────────────────────┐
│  📈 EVOLUCIÓN DEL MERCADO (2022-2026)                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [1M] [3M] [6M] [1A] [2A] [MAX]     Por categoría ▼    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         ╭───────────╮                           │   │
│  │    ╭────╯           ╰──╮        ╭──────────╮   │   │
│  │ ───╯                    ╰───────╯          ╰── │   │
│  │ 2022      2023        2024        2025    2026 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ INSIGHTS                                         │  │
│  │ • Precio actual 120% arriba del promedio 2023   │  │
│  │ • Marzo históricamente es mes de suba (+8%)     │  │
│  │ • Terneros lideran con +15% vs novillos         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3. Comparativa por Categoría

```
┌─────────────────────────────────────────────────────────┐
│  🐄 PRECIOS POR CATEGORÍA                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Categoría      Actual    vs 2023   vs 2024   Máx Hist │
│  ─────────────────────────────────────────────────────  │
│  Terneros       $5,016    +252%     +12%      $5,200   │
│  Novillos       $4,560    +225%     +10%      $4,700   │
│  Novillitos     $4,332    +205%     +8%       $4,500   │
│  Vaquillonas    $4,104    +200%     +9%       $4,300   │
│  Vacas          $3,283    +234%     +15%      $3,400   │
│  Toros          $2,964    +185%     +5%       $3,100   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4. Patrones Estacionales

```
┌─────────────────────────────────────────────────────────┐
│  📅 ESTACIONALIDAD HISTÓRICA                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Ene  Feb  Mar  Abr  May  Jun  Jul  Ago  Sep  Oct  Nov  Dic
│  ─────────────────────────────────────────────────────  │
│   ▲    ▲    ▲    ─    ▼    ▼    ─    ▲    ─    ▼    ▲    ▲
│  +2%  +5%  +3%  -1%  -3%  -2%  +1%  +6%  -1%  -4%  +3%  +5%
│                                                         │
│  💡 Mejor época de venta: Ago-Sep, Nov-Dic             │
│  💡 Mejor época de compra: May-Jun, Oct                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Data Schema

### market-monthly.json

```json
{
  "index": "igmag",
  "name": "Índice General Mercado Agroganadero",
  "unit": "$/kg vivo",
  "source": "magyp.gob.ar",
  "series": [
    { "period": "2022-01", "value": 205.90 },
    { "period": "2022-02", "value": 225.02 },
    // ... hasta 2026-02
  ]
}
```

### market-categories.json

```json
{
  "source": "magyp.gob.ar",
  "categories": ["novillos", "novillitos", "vacas", "vaquillonas", "toros", "mej"],
  "series": [
    {
      "period": "2022-01",
      "novillos": 219.77,
      "novillitos": 235.02,
      "vacas": 170.75,
      "vaquillonas": 229.11,
      "toros": 187.55,
      "mej": 218.57
    }
    // ...
  ]
}
```

## API Endpoints

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/market/history` | Datos diarios (existente) |
| `GET /api/market/monthly` | Datos mensuales históricos |
| `GET /api/market/categories` | Precios por categoría |
| `GET /api/market/seasonal` | Patrones estacionales calculados |
| `GET /api/market/summary` | Resumen con comparativas YoY |

## Implementación

### Fase 1: Data Backfill (1 día)
- [ ] Extraer datos mensuales de MAGYP PDFs (2022-2026)
- [ ] Crear `market-monthly.json`
- [ ] Crear `market-categories.json`

### Fase 2: APIs (1 día)
- [ ] `/api/market/monthly`
- [ ] `/api/market/categories`
- [ ] `/api/market/summary`

### Fase 3: UI (2 días)
- [x] Refactor `/mercado` como landing
- [ ] Crear `/mercado/historico`
- [x] Componente `LongTermChart` (Recharts o lightweight)
- [ ] Componente `CategoryComparison`
- [x] Componente `SeasonalPattern` — 2026-03-18 (ARCHITECT)

### Fase 4: SEO (0.5 día)
- [ ] Schema markup (Dataset, FinancialProduct)
- [ ] Meta tags dinámicos
- [ ] Sitemap update

## Métricas de Éxito

- Tiempo en página `/mercado` +50%
- Páginas/sesión +20%
- Consultas SEO "precios hacienda histórico" en top 10
- Leads PRO desde `/mercado` +25%

## Dependencias

- Chart library (Recharts ya está en el proyecto)
- MAGYP PDFs accesibles

## PRO Integration

**Free:** Vista mensual, últimos 12 meses
**PRO:** 
- Histórico completo (2022+)
- Export CSV
- API access
- Alertas de precio
- Comparativas personalizadas

---

**Prioridad:** HIGH (diferenciador vs competencia)
**Esfuerzo:** ~4 días
**Valor:** Feature único en el mercado argentino
