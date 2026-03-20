# BATTLE #3 — Onboarding & Dashboard UX

**Fecha:** 2026-03-20 01:15
**Trigger:** José reportó que onboarding y dashboard "feels confusing"
**Resultado:** 6 generales, 25+ hallazgos, sistema de puntos diseñado

---

## RESUMEN EJECUTIVO

### Top 5 Prioridades
1. [ ] **Sistema de puntos** — 4500 pts = 1 mes PRO (VIGIL)
2. [ ] **Unificar navegación** — /mi-cuenta dentro de /dashboard (ARCHITECT)
3. [ ] **Success state claim** — Guía clara post-verificación (CLOSER/HUNTER)
4. [ ] **Empty dashboard onboarding** — Wizard "Primeros pasos" (CLOSER)
5. [ ] **Empty states pattern** — Copiar DTEHistory a otros componentes (NEXO)

---

## PULSO — Research Patterns

### Best Practices (Yelp, Google Business, Clutch)

**Must-Have:**
- [ ] Botón "Claim" visible en cada perfil no reclamado
- [ ] Email domain verification (si email = @consignataria.com → acceso instantáneo)
- [ ] WhatsApp verification (Argentina standard, mejor que email)
- [ ] Social login ("Claim con Google")
- [ ] Badge "Claimed" visible

**Phase 2:**
- [ ] Progressive access (editar mientras verifica)
- [ ] Team invites (owner puede agregar admin)
- [ ] Inactivity unclaim (90 días sin actividad)
- [ ] Document upload para edge cases

**Key Insight:** WhatsApp verification tendría mayor conversión que email en Argentina.

---

## HUNTER — Claim Flow Fixes

### Archivos a modificar:
- `src/components/claims/ClaimForm.tsx`

### Fixes específicos:

#### 1. CUIT Validation en tiempo real ✅ SHIPPED
```tsx
// Implementado en ClaimForm.tsx - 6a899ad
// Usa modulo 11 con validación de prefijos (20,23,24,27,30,33,34)
```
- [x] Implementar validateCUIT() ✅
- [x] Agregar indicador visual ✓/✗ en input ✅
- [x] Mostrar error inline "CUIT inválido" ✅

#### 2. Success State mejorado ✅ SHIPPED
- [x] Cambiar "PERFIL VERIFICADO" → "SOLICITUD ENVIADA" ✅
- [x] Agregar guía de email: "Revisá tu bandeja (y spam). El enlace expira en 1 hora." ✅
- [x] Agregar botón "Ya tengo cuenta →" ✅

#### 3. Error state que se limpia ✅ SHIPPED
- [x] Limpiar error al cambiar cualquier input ✅
- [x] 409 conflict: mostrar link a login ✅

---

## ARCHITECT — Dashboard UX

### Archivos a modificar:
- `src/app/(terminal)/layout.tsx`
- `src/app/(terminal)/dashboard/DashboardClient.tsx`
- `src/components/dte/DTEStats.tsx`
- `src/components/dte/ActivationChecklist.tsx`

### Issue #1: Navegación Fragmentada (CRÍTICO)
**Problema:** /dashboard y /mi-cuenta están desconectados

**Fix:**
- [ ] Agregar "MIS GUÍAS" y "MI PANEL" a NAV_ITEMS en layout.tsx
- [ ] Mover /mi-cuenta a route group (terminal) para layout consistente
- [ ] O crear tabs dentro de /dashboard para DTE

### Issue #2: Tab Overload
**Problema:** 6 tabs sin iconos, horizontal scroll confuso

**Fix:**
- [ ] Agregar iconos a cada tab
- [ ] Agregar descripción corta ("3 próximos", "Datos públicos")
- [ ] Considerar sidebar vertical en desktop
- [ ] Remover "ACCIONES RAPIDAS" (redundante con tabs)

### Issue #3: Empty States
**Problema:** DTEStats y ActivationChecklist devuelven null

**Fix:**
- [ ] DTEStats: mostrar CTA "Comenzá a trackear tu operación"
- [ ] ActivationChecklist: mostrar skeleton mientras carga

---

## CLOSER — Onboarding Friction

### Archivos a modificar:
- `src/components/claims/ClaimForm.tsx`
- `src/app/(terminal)/dashboard/DashboardClient.tsx`
- `src/components/onboarding/WelcomeChecklist.tsx`

### Issue #1: Dead-End Success State
- [ ] Agregar instrucciones claras post-claim
- [ ] "📧 Revisa tu email — te enviamos un enlace mágico"
- [ ] Tiempo estimado: "puede tardar 1-2 minutos"
- [ ] Botón copiar email para buscar en inbox

### Issue #2: Empty Dashboard sin contexto
**Problema:** Usuario nuevo ve "No tenes perfil verificado" y nada más

**Fix:**
- [ ] Agregar wizard "PRIMEROS PASOS" con 3 pasos visuales:
  1. Verificar perfil
  2. Completar información  
  3. Publicar remates
- [ ] Botón "Buscar mi consignataria →"

### Issue #3: WelcomeChecklist no scrollea
- [ ] "Editar perfil →" debe scrollear a la tab correspondiente
- [ ] En mobile, indicar que hay más tabs

### Issues menores:
- [ ] OnboardingPrompt usa sessionStorage (reaparece en nueva tab)
- [ ] Login page menciona features que no existen (alerts, comparador)

---

## NEXO — Empty/Loading States

### Críticos (🔴): ✅ SHIPPED
- [x] `admin/dashboard/page.tsx`: Agregar spinner de loading ✅ 09c69d1
- [x] `admin/dashboard/page.tsx`: Agregar botón "Reintentar" en error ✅ 09c69d1

### Moderados (🟡):
- [ ] `remates/RematesClient.tsx`: Mejorar empty state con icono + newsletter signup
- [ ] `consignatarias/ConsignatariasDirectoryClient.tsx`: Agregar "browse all" link
- [ ] `frigorificos/FrigorificosClient.tsx`: Agregar "Limpiar filtros" en empty state
- [ ] `comparar/CompararClient.tsx`: Agregar icono de comparación
- [ ] `dashboard/DashboardClient.tsx` (Resultados tab): Agregar beneficios de tracking

### Gold Standard a copiar:
`src/components/dte/DTEHistory.tsx` (líneas 105-155)
- Icono + headline + explicación + grid de beneficios + CTA + link soporte

---

## VIGIL — Sistema de Puntos (DISEÑO COMPLETO)

### Concepto
- 10 puntos = 1 peso
- 4,500 puntos = 1 mes PRO ($45,000 ARS)
- Puntos se acumulan por acciones que generan valor/engagement

### Tabla de Puntos

| Acción | Puntos | Rationale |
|--------|--------|-----------|
| Subir DT-e (por archivo) | 500 | High-value data |
| Subir logo | 400 | Commitment visual |
| Completar CUIT | 300 | Trust signal |
| Agregar teléfono | 200 | Contact info |
| Agregar email | 200 | Contact info |
| Agregar WhatsApp | 200 | Primary contact |
| Agregar website | 200 | Digital presence |
| Agregar descripción | 300 | Completeness |
| Crear primer remate | 800 | Core action |
| Subir resultado de remate | 500 | Engagement |
| Agregar catalog URL | 200 | Content |
| Agregar YouTube URL | 200 | Content |
| **Bonus: perfil completo** | 300 | All fields done |
| **TOTAL ALCANZABLE** | **~4,500** | = 1 mes PRO |

### Implementación

#### Database
```sql
ALTER TABLE consignatarias ADD COLUMN onboarding_points INTEGER DEFAULT 0;
ALTER TABLE consignatarias ADD COLUMN points_redeemed_at TIMESTAMP;

-- Opcional: tabla de transacciones
CREATE TABLE point_transactions (
  id SERIAL PRIMARY KEY,
  consignataria_id UUID REFERENCES consignatarias(id),
  action VARCHAR(50) NOT NULL,
  points INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Nuevo componente: ProfileProgressTracker.tsx
```
┌─────────────────────────────────────────────────────┐
│ ⭐ TU PROGRESO                         2,800 / 4,500 │
│ █████████████████████████████░░░░░░░░░░░░░░░░░░░░░  │
│                                                      │
│ ✓ Verificar perfil ................ +0 (ya hecho)   │
│ ✓ Agregar teléfono ................ +200 pts        │
│ ○ Subir logo ...................... +400 pts        │
│ ○ Subir primera DT-e .............. +500 pts        │
│ ○ Crear primer remate ............. +800 pts ⭐     │
│                                                      │
│ 🎁 1 mes PRO gratis a 4,500 pts                     │
│    [Te faltan 1,700 pts]                             │
└─────────────────────────────────────────────────────┘
```

#### Post-Redemption
- Badge: "🏆 EARLY ADOPTER" en perfil público
- Puntos se resetean, puede ganar de nuevo

### Estimación: 4-6 horas
- Componente UI: 2h
- DB schema + API: 1h
- Lógica de cálculo: 1h
- Integración + testing: 1-2h

---

## BONUS: ARCHITECT Cron

**Commits:**
- `47409da` feat(spec): Favorites/Watchlist spec
- `fcb6ed4` docs: market longterm vision status
- `9525706` docs: DTE feature status

**Next:** Implementar FAVORITES-WATCHLIST.md (3-4 días)

---

## CHECKLIST DE IMPLEMENTACIÓN

### Día 1 — Quick Wins (2-3h) ✅ COMPLETE
- [x] CUIT validation inline (HUNTER) ✅ 6a899ad
- [x] Success state mejorado (HUNTER/CLOSER) ✅ 6a899ad
- [x] Admin dashboard spinner + retry (NEXO) ✅ 09c69d1

### Día 2 — Onboarding Flow (3-4h) ✅ COMPLETE
- [x] Empty dashboard wizard "Primeros pasos" (CLOSER) ✅ ecd16d6
- [x] Empty states pattern (copiar DTEHistory) (NEXO) ✅ eb19204, 6247093, 23b796a
- [x] WelcomeChecklist scroll fix (CLOSER) ✅ 24bbaab

### Día 3-4 — Sistema de Puntos (4-6h)
- [ ] DB schema (VIGIL) — TODO: onboarding_points column, point_transactions table
- [x] ProfileProgressTracker component (VIGIL) ✅ 8fedab7
- [x] Point calculation API (VIGIL) ✅ src/lib/points.ts
- [x] Integration en dashboard (VIGIL) ✅ resumen tab, FREE tier
- [ ] Redemption flow (VIGIL) — Pending: Supabase webhook for PRO activation

### Día 5 — Navegación (2-3h)
- [ ] Unificar /mi-cuenta con /dashboard (ARCHITECT)
- [ ] Tab icons + descriptions (ARCHITECT)

### Futuro
- [ ] WhatsApp verification (PULSO)
- [ ] Favorites/Watchlist (ARCHITECT cron)
- [ ] Team invites (PULSO)

---

*Generado por BATTLE #3 — 2026-03-20 01:15*
