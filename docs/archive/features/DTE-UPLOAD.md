# Feature: DT-e Upload & OCR (Documento de Tránsito Electrónico)

## Status (2026-03-20)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Core Upload | ✅ DONE | DTEUploader, DTEForm, OCR extraction working |
| Phase 2: History & Analytics | ✅ DONE | DTEHistory, DTEStats, MilestoneBadges, CSV export, insights |
| Phase 3: PRO Insights | 🔄 PENDING | Price tracking, performance comparisons |

**Lock-in Score:** HIGH — User-invested data, irreplaceable history, painful to leave.

## Overview

Allow consignatarias to upload their DT-e documents (livestock transit documents from SENASA).
Extract data using client-side OCR (Tesseract.js) — **$0 cost**.

## Why This Creates Lock-in

1. **User-provided data** — We don't scrape, they invest
2. **Accumulated history** — Months of transactions in one place
3. **Analytics on THEIR data** — Only they have this view
4. **Painful to leave** — Export exists but rebuilding elsewhere = hours of work

## DT-e Document Fields

| Campo | Tipo | Ejemplo |
|-------|------|---------|
| `numero_dte` | string | "24-0012345678" |
| `fecha_emision` | date | "2026-03-15" |
| `fecha_movimiento` | date | "2026-03-18" |
| `renspa_origen` | string | "04.123.0.12345/00" |
| `renspa_destino` | string | "04.789.0.67890/00" |
| `titular_origen` | string | "Juan Pérez" |
| `titular_destino` | string | "Consignataria Rosgan" |
| `establecimiento_origen` | string | "La Esperanza" |
| `establecimiento_destino` | string | "Feria Mercedes" |
| `especie` | enum | "bovino" |
| `cantidad_cabezas` | number | 150 |
| `categorias` | json | {"novillos": 80, "vaquillonas": 70} |
| `motivo` | enum | "remate" / "faena" / "invernada" / "cria" |
| `peso_total_kg` | number | 57000 |

## Technical Stack

```
Tesseract.js (v5) — Client-side OCR, runs in browser
  ↓
Regex patterns — Extract structured fields from raw text
  ↓
React Hook Form — User confirms/corrects data
  ↓
Supabase — Store in user's account
```

## User Flow

```
1. [Upload] Drop image/PDF of DT-e
2. [Processing] "Extrayendo datos..." (2-5 seconds)
3. [Review] Form pre-filled, user confirms
4. [Save] "Guardado en tu historial"
5. [Repeat] "Subir otra guía" or "Ver mi historial"
```

## Implementation

### Phase 1: Core Upload (This Sprint)

- [x] Install Tesseract.js — DONE
- [x] Create `/mi-cuenta/guias` page — DONE
- [x] Build `DTEUploader` component — DONE
- [x] Implement OCR extraction patterns — DONE (useOCR hook)
- [x] Create Supabase table `user_dtes` — DONE
- [x] Add confirmation form — DONE (DTEForm)

### Phase 2: History & Analytics

- [x] `/mi-cuenta/historial` page (integrated in /mi-cuenta/guias)
- [x] Charts: cabezas por mes, categorías (DTEStats component - CSS-based)
- [x] Milestone gamification (DTEStats - 2026-03-18)
- [x] Export to CSV — ARCHITECT 2026-03-19 (FREE tier, trust-building lock-in)
- [x] Personal Insights card — ARCHITECT 2026-03-19 (avg volume, peak month, top category, trend)
- [x] Compare periods — ARCHITECT 2026-03-19 (month/quarter/year comparisons with category breakdown)

### Phase 3: Insights (PRO)

- [ ] Price tracking (if liquidación uploaded)
- [ ] Performance vs market average
- [ ] Seasonal patterns

## Database Schema

```sql
CREATE TABLE user_dtes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  consignataria_id UUID REFERENCES consignatarias(id),
  
  -- Document data
  numero_dte TEXT UNIQUE,
  fecha_emision DATE,
  fecha_movimiento DATE,
  
  -- Origin
  renspa_origen TEXT,
  titular_origen TEXT,
  establecimiento_origen TEXT,
  
  -- Destination  
  renspa_destino TEXT,
  titular_destino TEXT,
  establecimiento_destino TEXT,
  
  -- Livestock
  especie TEXT DEFAULT 'bovino',
  cantidad_cabezas INTEGER,
  categorias JSONB,
  peso_total_kg INTEGER,
  motivo TEXT,
  
  -- Metadata
  imagen_url TEXT, -- Stored in Supabase Storage
  ocr_raw_text TEXT,
  ocr_confidence FLOAT,
  user_edited BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can only see their own DTEs
ALTER TABLE user_dtes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own DTEs" ON user_dtes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own DTEs" ON user_dtes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own DTEs" ON user_dtes
  FOR UPDATE USING (auth.uid() = user_id);
```

## OCR Extraction Patterns

```typescript
// Regex patterns for DT-e fields
const patterns = {
  numero_dte: /DT-?e?\s*N[°o]?\s*:?\s*(\d{2}[-.]?\d{10,})/i,
  renspa: /RENSPA\s*:?\s*(\d{2}\.\d{3}\.\d\.\d{5}\/\d{2})/gi,
  fecha: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
  cabezas: /(?:cantidad|cabezas|total)\s*:?\s*(\d+)/i,
  peso: /(?:peso\s*total|kg\s*total)\s*:?\s*(\d+(?:\.\d+)?)/i,
  categorias: /(novillos?|vaquillonas?|vacas?|toros?|terneros?|terneras?)\s*:?\s*(\d+)/gi,
};

// Extract all matches
function extractDTEData(rawText: string): Partial<DTE> {
  const data: Partial<DTE> = {};
  
  // Extract numero_dte
  const dteMatch = rawText.match(patterns.numero_dte);
  if (dteMatch) data.numero_dte = dteMatch[1];
  
  // Extract RENSPAs (first = origen, second = destino)
  const renspas = [...rawText.matchAll(patterns.renspa)];
  if (renspas[0]) data.renspa_origen = renspas[0][1];
  if (renspas[1]) data.renspa_destino = renspas[1][1];
  
  // Extract dates (first = emisión, second = movimiento)
  const fechas = [...rawText.matchAll(patterns.fecha)];
  if (fechas[0]) data.fecha_emision = parseDate(fechas[0][1]);
  if (fechas[1]) data.fecha_movimiento = parseDate(fechas[1][1]);
  
  // Extract cabezas
  const cabezasMatch = rawText.match(patterns.cabezas);
  if (cabezasMatch) data.cantidad_cabezas = parseInt(cabezasMatch[1]);
  
  // Extract categorias
  const categorias: Record<string, number> = {};
  for (const match of rawText.matchAll(patterns.categorias)) {
    const categoria = match[1].toLowerCase();
    const cantidad = parseInt(match[2]);
    categorias[categoria] = cantidad;
  }
  if (Object.keys(categorias).length) data.categorias = categorias;
  
  return data;
}
```

## Component Structure

```
/src/components/dte/
├── DTEUploader.tsx        # Main upload component
├── DTEPreview.tsx         # Show extracted data for confirmation
├── DTEForm.tsx            # Edit form with all fields
├── DTEHistory.tsx         # List of uploaded DTEs
├── DTEAnalytics.tsx       # Charts and insights
└── hooks/
    ├── useOCR.ts          # Tesseract.js hook
    └── useDTEs.ts         # Supabase CRUD
```

## Success Metrics

| Metric | Target |
|--------|--------|
| Upload success rate | >90% |
| OCR accuracy | >80% (user corrects rest) |
| Average DTEs per user | >5/month |
| Retention (users with >10 DTEs) | >70% |

## Timeline

| Phase | Duration | Output |
|-------|----------|--------|
| Phase 1 | 1 week | Core upload working |
| Phase 2 | 1 week | History + basic analytics |
| Phase 3 | 2 weeks | PRO insights |

---

*Feature: DTE Upload — Lock-in through user-provided data*
