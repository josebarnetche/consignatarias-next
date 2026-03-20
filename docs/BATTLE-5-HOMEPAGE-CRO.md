# BATTLE #5 — Homepage Landing Page CRO

**Fecha:** 2026-03-20
**Objetivo:** Aumentar conversiones (newsletter signups, /planes visits, claims)
**Estado actual:** ~1000 líneas, estructura sólida, pero sin "aha moment" personal

---

## DIAGNÓSTICO

### ✅ Lo que está bien
- Hero claro con propuesta de valor
- Live stats strip (INMAG, remates, frigoríficos, dólar)
- Problema → Solución bien articulado
- Features con previews interactivos
- FAQ completo (10 preguntas)
- Herramientas gratuitas destacadas
- Sección PRO para consignatarias

### 🔴 Gaps críticos

| Gap | Impacto | Esfuerzo |
|-----|---------|----------|
| Sin valor personal instantáneo | ALTO | MEDIO |
| Sin social proof (testimonios, logos) | ALTO | BAJO |
| Hero CTA genérico ("Ver próximos remates") | MEDIO | BAJO |
| Sin video/demo del producto | MEDIO | ALTO |
| Mobile: hero muy largo antes de CTA | MEDIO | BAJO |
| Sin urgencia/escasez | BAJO | BAJO |

---

## PRIORIDAD #1: Zestimate Widget (Valor Personal Instantáneo)

**El problema:** Visitante llega → ve datos generales → no hay conexión personal → se va.

**La solución:** Widget de valuación instantánea above-the-fold.

```
┌─────────────────────────────────────────────────────────┐
│  ¿Cuánto vale tu hacienda hoy?                          │
│                                                          │
│  [100    ] terneros en [Corrientes ▼]                   │
│                                                          │
│  ═══════════════════════════════════════════════════    │
│                                                          │
│  💰 Valor estimado: $8,833,260                          │
│     ($4,907/kg × 180kg × 100 cab)                       │
│                                                          │
│  📈 +6.8% vs semana pasada                              │
│                                                          │
│  [Recibir alertas de precio →]                          │
└─────────────────────────────────────────────────────────┘
```

### Implementación

**Archivo:** `src/components/landing/ValuationWidget.tsx`

```tsx
'use client';

import { useState, useMemo } from 'react';
import marketPrices from '@/lib/data/market-prices.json';

const CATEGORIES = [
  { key: 'terneros', label: 'Terneros', avgKg: 180 },
  { key: 'novillitos', label: 'Novillitos', avgKg: 280 },
  { key: 'novillos', label: 'Novillos', avgKg: 420 },
  { key: 'vaquillonas', label: 'Vaquillonas', avgKg: 320 },
  { key: 'vacas', label: 'Vacas', avgKg: 380 },
  { key: 'toros', label: 'Toros', avgKg: 550 },
];

const PROVINCES = [
  'Buenos Aires', 'Santa Fe', 'Córdoba', 'Entre Ríos', 
  'Corrientes', 'La Pampa', 'Chaco', 'Formosa', 
  'Santiago del Estero', 'San Luis'
];

export default function ValuationWidget() {
  const [category, setCategory] = useState('terneros');
  const [heads, setHeads] = useState(100);
  const [province, setProvince] = useState('Corrientes');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const calculation = useMemo(() => {
    const cat = CATEGORIES.find(c => c.key === category);
    const pricePerKg = marketPrices.categories[category]?.current || 0;
    const change = marketPrices.categories[category]?.change || 0;
    const avgKg = cat?.avgKg || 180;
    const totalValue = pricePerKg * avgKg * heads;
    const perHead = pricePerKg * avgKg;
    
    return { pricePerKg, avgKg, totalValue, perHead, change };
  }, [category, heads]);

  const fmt = (n: number) => n.toLocaleString('es-AR');

  return (
    <div className="bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-zinc-900 border border-emerald-500/30 rounded-xl p-6 md:p-8">
      <h3 className="text-lg font-medium text-zinc-100 mb-4">
        ¿Cuánto vale tu hacienda hoy?
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Cantidad</label>
          <input
            type="number"
            value={heads}
            onChange={(e) => setHeads(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-100 text-lg font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Categoría</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-100"
          >
            {CATEGORIES.map(c => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Provincia</label>
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-100"
          >
            {PROVINCES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Result */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4 mb-4">
        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
          Valor estimado
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-medium text-emerald-400 tracking-tight">
            ${fmt(calculation.totalValue)}
          </span>
          <span className={`text-sm font-mono ${calculation.change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {calculation.change > 0 ? '+' : ''}{calculation.change.toFixed(1)}%
          </span>
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          ${fmt(calculation.pricePerKg)}/kg × {calculation.avgKg}kg × {heads} cab
        </div>
      </div>

      {/* Email capture */}
      {!submitted ? (
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            // TODO: Submit to newsletter
            setSubmitted(true);
          }}
          className="flex gap-2"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-100 text-sm"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded text-sm transition-colors"
          >
            Alertas de precio
          </button>
        </form>
      ) : (
        <div className="text-sm text-emerald-400 flex items-center gap-2">
          ✓ Te avisamos cuando cambien los precios
        </div>
      )}

      <div className="text-[10px] text-zinc-600 mt-3">
        Precios INMAG actualizados. Peso promedio por categoría. Sin costo de flete ni comisión.
      </div>
    </div>
  );
}
```

### Ubicación en Homepage

Opción A: **Reemplazar** la sección "El problema" con el widget
Opción B: **Agregar** después del hero stats strip
Opción C: **Sidebar sticky** en desktop

**Recomendación:** Opción B — después de los stats, antes de "El problema"

---

## PRIORIDAD #2: Social Proof

### 2.1 Logos de consignatarias que usan la plataforma

```tsx
{/* Después del hero */}
<div className="flex items-center justify-center gap-8 py-8 opacity-60">
  <span className="text-xs text-zinc-500 uppercase tracking-widest">
    Consignatarias en la plataforma
  </span>
  {/* Logos: Rosgan, Colombo, Campos y Ganados, etc */}
</div>
```

### 2.2 Testimonios (cuando los tengas)

```tsx
<section className="max-w-4xl mx-auto px-6 py-16">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <blockquote className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-6">
      <p className="text-sm text-zinc-300 mb-4">
        "Por fin un lugar donde ver todos los remates sin tener que revisar 20 páginas distintas."
      </p>
      <footer className="text-xs text-zinc-500">
        — Productor, Entre Ríos
      </footer>
    </blockquote>
    {/* más testimonios */}
  </div>
</section>
```

### 2.3 Números que impactan (ya están, pero mejorar)

Agregar al hero:
- "X usuarios esta semana"
- "X remates consultados hoy"
- Dynamic counter de cabezas tracked

---

## PRIORIDAD #3: CTA Optimization

### Hero CTA actual
```
[Ver próximos remates] [Cómo funciona]
```

### Propuesta
```
[Ver X remates esta semana →] [Buscar mi consignataria]
```

- Más específico (número real)
- Segundo CTA para consignatarias (funnel PRO)

### Mobile Hero
- Mover CTA más arriba (actualmente hay mucho texto antes)
- Sticky CTA en mobile scroll

---

## PRIORIDAD #4: Estructura / Performance

### Problema
- 1000+ líneas en un solo archivo
- Muchas secciones que podrían lazy-load

### Solución
```
src/app/page.tsx (shell)
├── components/landing/HeroSection.tsx
├── components/landing/ValuationWidget.tsx
├── components/landing/StatsStrip.tsx
├── components/landing/ProblemSection.tsx
├── components/landing/FeaturesSection.tsx
├── components/landing/ComparisonTable.tsx
├── components/landing/FeaturedConsignatarias.tsx
├── components/landing/FAQSection.tsx
├── components/landing/FreeToolsSection.tsx
├── components/landing/ProFeaturesSection.tsx
└── components/landing/FinalCTA.tsx
```

---

## CHECKLIST DE IMPLEMENTACIÓN

### Sprint 1: Quick Wins (2-3h)
- [ ] Crear ValuationWidget.tsx
- [ ] Integrar después de stats strip
- [ ] CTA copy más específico ("Ver X remates")
- [ ] Mobile: reducir padding hero

### Sprint 2: Social Proof (2h)
- [ ] Grid de logos de consignatarias destacadas
- [ ] Counter dinámico de actividad
- [ ] Placeholder para testimonios

### Sprint 3: Refactor (3-4h)
- [ ] Separar en componentes
- [ ] Lazy load secciones below-the-fold
- [ ] Verificar Core Web Vitals

### Sprint 4: A/B Tests
- [ ] Headline variations
- [ ] CTA copy variations
- [ ] Con/sin widget de valuación

---

## MÉTRICAS DE ÉXITO

| Métrica | Actual | Target |
|---------|--------|--------|
| Newsletter signups/week | ? | +50% |
| /planes visits from homepage | ? | +30% |
| Bounce rate | ? | -20% |
| Time on page | ? | +15% |
| Claim attempts from homepage | ? | +40% |

---

## NOTAS

- El widget de valuación es el unlock principal (VIGIL lo identificó)
- No hay video/demo — considerar Loom o screen recording
- La sección PRO está bien pero muy abajo — considerar mencionarla antes
- FAQ tiene 10 items — verificar si todos son necesarios

---

*BATTLE #5 creado 2026-03-20 — Homepage = primera impresión = critical path*
