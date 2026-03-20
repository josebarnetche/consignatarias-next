# Post-Migration Execution Checklist

**Created:** 2026-03-20
**Status:** WAITING for José to execute 3 migrations

---

## Migrations Pending

| Migration | File | Purpose |
|-----------|------|---------|
| 1. User Favorites | `20260320_user_favorites.sql` | Watchlist persistence |
| 2. Onboarding Points | `20260320_onboarding_points.sql` | Points system activation |
| 3. Remitente History | `20260320_remitente_history.sql` | Supply chain analytics |

---

## After Migration #1: User Favorites

**Immediate actions:**
1. Test favorite toggle in `/mi-cuenta/favoritos`
2. Verify RLS policies working (users only see their favorites)
3. Add sync indicator (favorites now persist across devices)

**JARVIS can execute:**
- Add toast confirmation on favorite save
- Update empty state to mention persistence
- Track favorite count in analytics

---

## After Migration #2: Onboarding Points

**Immediate actions:**
1. Test `award_points()` function with real profile
2. Verify points display in ProfileProgressTracker
3. Test `redeem_points_for_pro()` at 4500 points

**JARVIS can execute:**
- Add points award triggers (profile complete → +500)
- Add redemption button when 4500+ reached
- Track points events in analytics

**User flow:**
1. User claims profile → 500 points
2. User completes profile (logo, description, contact) → 2000 points
3. User links DT-e → 1000 points
4. User publishes remate → 500 points
5. At 4500 points → "Canjeá tu mes PRO gratis" button appears

---

## After Migration #3: Remitente History

**Immediate actions:**
1. Modify scraper to INSERT to `remitente_entries`
2. Verify data accumulation after 1 day
3. Wait 2-4 weeks for meaningful historical data

**JARVIS can execute (after data accumulates):**
- BATTLE #6 Sprint 3: Patterns page with heatmaps
- Top remitentes leaderboard
- Volume trend charts

**Scraper modification needed:**
```typescript
// In scraper, after parsing MAG data:
await supabase.from('remitente_entries').upsert(
  entries.map(e => ({
    remate_date: remateDate,
    consignataria_slug: slug,
    establecimiento: e.establecimiento,
    localidad: e.localidad,
    cabezas: e.cabezas,
    categorias: e.categorias
  })),
  { onConflict: 'remate_date,consignataria_slug,establecimiento' }
)
```

---

## Priority Order

1. **Points system** — Highest impact (gamification → activation → PRO conversion)
2. **User favorites** — Lock-in mechanism
3. **Remitente history** — Long-term differentiator (needs time to accumulate data)

---

*Document created for JARVIS to execute immediately after José runs migrations.*
