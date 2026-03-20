# Feature: Prospector Tier — B2B Remitente Leads

## Status (2026-03-20)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Spec | ✅ DONE | This document |
| Phase 2: Data Model | 🔜 PENDING | Remitente extraction from DT-e |
| Phase 3: MVP UI | 🔜 PENDING | Basic dashboard for Prospectors |
| Phase 4: Monetization | 🔜 PENDING | Pricing + payment flow |

**Revenue Potential:** $500-2,000/month per Prospector subscriber

---

## Overview

Create a new subscription tier "Prospector" that gives agribusiness service providers (banks, insurance, feed suppliers, veterinary services) access to qualified B2B leads from DT-e remitente data.

**Core insight:** DT-e uploads contain remitente data (CUIT, name, location, livestock type, volume). This is high-value intent data for B2B providers targeting active livestock producers.

---

## Why This Creates Revenue

| Audience | Problem They Have | Value We Provide |
|----------|-------------------|------------------|
| **Rural Banks** | Finding creditworthy producers | Verified livestock volume = credit qualification |
| **Insurance** | Identifying active operations | Movement data = insurable activity |
| **Feed Suppliers** | Finding large-scale buyers | Volume data = purchase potential |
| **Veterinary Services** | Targeting high-head producers | Category/volume = service need |
| **Equipment Dealers** | Finding active ranches | Activity = upgrade potential |

**Key differentiator:** This is INTENT DATA, not cold lists. Remitentes are actively moving cattle = active business.

---

## Data We Capture from DT-e

From each DT-e upload, we extract:

```typescript
interface Remitente {
  cuit: string;          // Unique identifier
  name: string;          // Business name
  province: string;      // Location
  city?: string;         // More specific location
  
  // Derived from DT-e data
  livestock_types: string[];   // ['vacunos', 'ovinos', etc.]
  total_heads_30d: number;     // Activity volume (last 30 days)
  total_heads_90d: number;     // Longer trend
  transaction_count: number;   // Frequency
  last_activity_date: string;  // Recency
  
  // Value signals
  estimated_annual_value: number;  // Based on MAG prices
  activity_tier: 'small' | 'medium' | 'large' | 'enterprise';
}
```

---

## Prospector Dashboard

### Lead Discovery

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 PROSPECTOR                                                  │
│  Leads activos en los últimos 30 días                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Filtros: [Provincia ▼] [Categoría ▼] [Volumen ▼] [Buscar]    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ★ ESTANCIA SAN MARTÍN                    CUIT: 30-XXX  │   │
│  │   📍 Corrientes • Vacunos                               │   │
│  │   📊 2,450 cabezas (90d) • 8 transacciones             │   │
│  │   💰 Est. $45M ARS/año                                  │   │
│  │   🏷️ Enterprise                         [Ver detalles] │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ★ AGROPECUARIA LITORAL                   CUIT: 30-XXX  │   │
│  │   📍 Santa Fe • Vacunos, Porcinos                       │   │
│  │   📊 890 cabezas (90d) • 4 transacciones               │   │
│  │   💰 Est. $18M ARS/año                                  │   │
│  │   🏷️ Large                              [Ver detalles] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Mostrando 248 de 1,234 remitentes activos                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Lead Detail View

```
┌─────────────────────────────────────────────────────────────────┐
│  ESTANCIA SAN MARTÍN                                           │
│  CUIT: 30-XXXXXXXX-X                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📍 UBICACIÓN                                                   │
│  Provincia: Corrientes                                          │
│  Actividad: Cría y engorde                                      │
│                                                                 │
│  📊 ACTIVIDAD (últimos 90 días)                                │
│  ├─ Vacunos: 2,100 cabezas (85%)                               │
│  ├─ Terneros: 280 cabezas (12%)                                │
│  └─ Vaquillonas: 70 cabezas (3%)                               │
│                                                                 │
│  📈 TENDENCIA                                                   │
│  ├─ Q1 2026: 2,450 cabezas (+15% vs Q4 2025)                  │
│  └─ Frecuencia: Cada 11 días promedio                          │
│                                                                 │
│  💰 VALOR ESTIMADO                                              │
│  $45M ARS/año (precio promedio MAG)                             │
│                                                                 │
│  🎯 SEÑALES DE INTERÉS                                          │
│  ✓ Alto volumen consistente                                     │
│  ✓ Operación diversificada                                      │
│  ✓ Actividad creciente                                          │
│                                                                 │
│  [📞 Solicitar contacto] [📥 Exportar] [⭐ Guardar]            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pricing Strategy

### Option A: Per-Seat Subscription

| Tier | Price | Leads/Month | Features |
|------|-------|-------------|----------|
| **Starter** | $50,000 ARS/mo | 50 | Basic filters, no export |
| **Professional** | $120,000 ARS/mo | 200 | All filters, CSV export |
| **Enterprise** | $300,000 ARS/mo | Unlimited | API access, CRM integration |

### Option B: Per-Lead Credits

| Credit Pack | Price | Cost/Lead |
|-------------|-------|-----------|
| 25 credits | $25,000 ARS | $1,000/lead |
| 100 credits | $80,000 ARS | $800/lead |
| 500 credits | $300,000 ARS | $600/lead |

### Recommended: Hybrid

- Base subscription ($50,000/mo) includes 50 leads
- Additional leads at $800/each
- Enterprise: flat rate unlimited

---

## Privacy & Compliance

### What we share:
- CUIT (public business identifier)
- Business name (public)
- Province/general location
- Aggregated activity metrics (not individual transactions)
- Estimated value ranges

### What we DON'T share:
- Individual transaction details
- Specific dates/times
- Buyer information
- Exact locations/addresses
- Personal information

### Legal basis:
- CUIT is public business data
- Activity metrics are aggregated
- No personal data exposed
- B2B context only

---

## Implementation Plan

### Phase 1: Data Pipeline (3 days)
- [ ] Extract remitente data from DT-e parsing
- [ ] Create `remitentes` table with aggregated metrics
- [ ] Daily job to update activity metrics
- [ ] MAG price integration for value estimation

### Phase 2: Dashboard MVP (4 days)
- [ ] /prospector route with auth gate
- [ ] Lead list with filters (province, category, volume)
- [ ] Lead detail view
- [ ] Basic search

### Phase 3: Monetization (2 days)
- [ ] Stripe integration for Prospector tier
- [ ] Credit system for per-lead purchases
- [ ] Usage tracking and limits

### Phase 4: Go-to-Market (ongoing)
- [ ] Identify 10 potential Prospector customers (banks, insurance)
- [ ] Outreach templates
- [ ] Case study from first customer

---

## Success Metrics

| Metric | Target (6mo) |
|--------|--------------|
| Prospector subscribers | 5 |
| MRR from Prospector | $250,000 ARS (~$250 USD) |
| Leads served/month | 500 |
| Lead-to-contact rate | 30% |

---

## Competitive Moat

1. **Unique data source** — No one else has DT-e movement data
2. **Intent signal** — Active movement = active business (not stale lists)
3. **Verified activity** — Government-regulated data source
4. **Regional focus** — Deep coverage of Argentina's cattle regions
5. **Price context** — MAG integration adds value estimation

---

## Target Customers (First 10)

| Company | Type | Why They'd Buy |
|---------|------|----------------|
| Banco Nación Agro | Rural Banking | Credit qualification |
| Banco Galicia Rural | Rural Banking | Loan prospecting |
| La Segunda Seguros | Insurance | Insurable activity verification |
| San Cristóbal Seguros | Insurance | Rural portfolio expansion |
| Cargill Argentina | Feed/Grain | Large buyer identification |
| ADM | Commodities | Supply chain intelligence |
| Nutrien Ag | Agro Services | Customer prospecting |
| John Deere Financial | Equipment | Credit + sales leads |
| CNH Industrial | Equipment | Regional market intelligence |
| Bayer Animal Health | Veterinary | High-head producer targeting |

---

## Revenue Projection

**Conservative (Year 1):**
- 3 Professional subscribers × $120,000 = $360,000/mo
- 2 Starter subscribers × $50,000 = $100,000/mo
- **Total:** $460,000 ARS/mo (~$460 USD)

**Optimistic (Year 1):**
- 2 Enterprise × $300,000 = $600,000/mo
- 5 Professional × $120,000 = $600,000/mo
- 3 Starter × $50,000 = $150,000/mo
- **Total:** $1,350,000 ARS/mo (~$1,350 USD)

---

**Priority:** MEDIUM-HIGH (new revenue stream, requires DT-e adoption)
**Effort:** ~2 weeks for MVP
**ROI:** HIGH — monetizes existing data, B2B pricing power

*Spec by VIGIL suggestion, documented by JARVIS — 2026-03-20*
