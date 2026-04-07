# Roadmap to v2.0.0

**Current:** v1.9.7 (April 7, 2026)
**Target:** v2.0.0 — First Revenue Milestone
**Timeline:** 6-8 weeks

---

## The Journey So Far

```
v0.x (Feb 26 - Mar 9)     Genesis → Data → SEO Foundation
v1.0 (Mar 10)             Platform Launch — 385 auctions, 77 consignatarias
v1.1-1.3 (Mar 12-14)      API Launch — 20 endpoints, lead magnets
v1.5-1.7 (Mar 14-16)      Content — Video catalogs, email automation
v1.9.0-1.9.5 (Mar 18-20)  Market Intelligence — Price oracle, MAG, onboarding
v1.9.6-1.9.7 (Apr 4-7)    Conversion Optimization — Form recovery, PRO copy
```

**40 days: 0 → 1.9.7 with 600+ users, 330+ remates, 25 API endpoints, $0 revenue.**

---

## v2.0.0 Definition

**v2.0.0 = First Paying Customer**

The version number is earned when:
- [ ] At least 1 consignataria or frigorífico pays for PRO
- [ ] Revenue > $0 (any amount)
- [ ] Payment processed through Rebill

Everything below serves this single objective.

---

## Remaining Milestones

### v1.9.8 — Points System Completion (Movement 2)
**Effort:** 4-6 hours | **Impact:** Very High

The gamification system is half-shipped. Code exists in `src/lib/points.ts` but:
- [ ] DB migration: `onboarding_points` column on consignatarias
- [ ] DB migration: `point_transactions` table
- [ ] Redemption endpoint: `/api/redeem-points`
- [ ] UI: Progress bar visible in dashboard
- [ ] UI: "Redeem for 1 month PRO" button at 4,500 pts
- [ ] Webhook: Auto-activate PRO on redemption

**Why critical:** Converts the onboarding funnel into a game. Users who complete profile + upload DT-e + create remate = invested users who experience PRO value before paying.

---

### v1.9.9 — Pricing Page Reframe (Movement 6)
**Effort:** 2 hours | **Impact:** Medium

Current `/planes` page shows $45.000/mes without context.

- [ ] Reframe: "$1.500/día" (feels 30x cheaper)
- [ ] Anchor: "Un aviso en diario = $200.000. Cartel en ruta = $150.000/mes."
- [ ] Social proof: "X consignatarias ya usan PRO" (dynamic count)
- [ ] Risk reversal: "Sin permanencia. Cancelá cuando quieras."
- [ ] ROI statement: "Un solo comprador nuevo paga el año entero."

---

### v1.9.10 — Frigorífico Monetization (Movement 4)
**Effort:** 3-4 hours | **Impact:** Medium-High

The `/frigorificos` page is #1 in traffic (241 views Q1) but generates $0.

- [ ] "Reclamar esta ficha" CTA on every frigorífico page
- [ ] Simplified claim form (2 fields: email + CUIT pre-filled)
- [ ] "Frigorífico Verificado" badge tier ($25-35K/mes)
- [ ] Contact form: "Consultar a este frigorífico" (lead gen)
- [ ] Free leads for 3 months → then convert to paid

**Revenue potential:** 5% of 364 = 18 frigoríficos × $30K = $540K/mes

---

### v1.9.11 — Watchlist & Favorites
**Effort:** 3-4 hours | **Impact:** Medium

Schema designed in v1.9.5, not implemented.

- [ ] DB migration: `user_favorites` table
- [ ] UI: Heart icon on consignataria cards
- [ ] UI: `/mi-cuenta/favoritos` page (already exists, needs wiring)
- [ ] Notifications: Email when favorited consignataria posts new remate
- [ ] Lock-in: User's watchlist = reason to return

---

### v1.9.12 — Recovery Campaigns
**Effort:** 2-3 hours | **Impact:** Medium

Form abandonment capture is live (v1.9.7). Now use it.

- [ ] Cron job: Query `form_abandonment` for unconverted emails (>24h old)
- [ ] Recovery email template: "¿Necesitás ayuda para verificar tu perfil?"
- [ ] Track: `recovery_sent_at` timestamp to prevent spam
- [ ] Mark converted when claim succeeds

---

### v1.9.13 — NEA Expansion (Movement 5)
**Effort:** Ongoing | **Impact:** Medium

37 users from NEA (40% of cattle stock). Underserved.

- [ ] Content: "Remates en Corrientes: guía completa 2026"
- [ ] Content: "Frigoríficos habilitados en Chaco"
- [ ] WhatsApp: Weekly remate image for group sharing
- [ ] Outreach: Contact 15-20 NEA consignatarias directly
- [ ] Embed: Offer calendar widget to Sociedades Rurales

---

## v2.0.0 — First Revenue

**Trigger:** First Rebill payment processed

**Likely paths:**
1. Consignataria completes points → gets free month → renews at $45K
2. Consignataria sees benefit-first prompt → clicks → pays
3. Frigorífico claims profile → offered verified badge → pays $30K
4. José closes SVB or Bressan via direct outreach

**Celebration:** 
- Changelog entry: "v2.0.0 — First Revenue"
- Case study from first customer
- Testimonial for social proof on `/planes`

---

## Post-2.0.0 Horizon

### v2.1 — PWA & Push Notifications
- Service worker for offline access
- Push notifications for new remates
- "Add to home screen" prompt

### v2.2 — Historical Price Charts
- Price trends by category over time
- Comparison: INMAG vs category vs province
- Exportable charts for reports

### v2.3 — Auction Results Database
- Post-auction price collection at scale
- Market intelligence layer
- "Remates anteriores" with actual results

### v2.4 — API Monetization
- Paid API tiers beyond free
- AgTech integration partnerships
- Micropayments via USDC (Bankr)

### v2.5 — Transaction Layer (ganado.com.ar)
- P2P livestock marketplace
- Transaction fees (1-2%)
- Integration with consignatarias directory

---

## Priority Matrix

```
                    HIGH IMPACT
                         │
     ┌───────────────────┼───────────────────┐
     │                   │                   │
     │  1.9.8 Points     │  1.9.10 Frigo     │
     │  (4-6h)           │  Monetization     │
     │                   │  (3-4h)           │
     │  1.9.9 Pricing    │                   │
     │  (2h)             │  1.9.13 NEA       │
     │                   │  (ongoing)        │
LOW  │                   │                   │ HIGH
EFFORT ──────────────────┼────────────────────EFFORT
     │                   │                   │
     │  1.9.12 Recovery  │  1.9.11 Watchlist │
     │  Emails (2-3h)    │  (3-4h)           │
     │                   │                   │
     └───────────────────┼───────────────────┘
                         │
                    LOW IMPACT
```

**Recommended sequence:** 1.9.8 → 1.9.9 → 1.9.10 → 1.9.12 → 1.9.11 → 1.9.13

---

## Success Metrics for 2.0.0

| Metric | Current (Q1) | Target (v2.0.0) |
|--------|--------------|-----------------|
| Revenue | $0 | >$0 |
| PRO customers | 0 | 1-3 |
| Frigoríficos claimed | 0 | 5-10 |
| Form completion rate | 8.3% | 30%+ |
| PRO prompt CTR | 1.1% | 5-8% |
| Points redemptions | 0 | 3-5 |
| NEA users | 37 | 80+ |
| Profiles claimed | 2 (test) | 10+ |

---

## Timeline Estimate

| Week | Milestone | Focus |
|------|-----------|-------|
| 1 | v1.9.8 | Points system completion |
| 2 | v1.9.9 + v1.9.10 | Pricing reframe + Frigorífico CTAs |
| 3 | v1.9.11 | Watchlist implementation |
| 4 | v1.9.12 | Recovery email campaigns |
| 5-6 | v1.9.13 | NEA content + outreach |
| 6-8 | **v2.0.0** | First payment |

---

## The Bottleneck

**Code is not the bottleneck. Sales is.**

The platform is feature-complete for monetization. What's missing:
- José sending first outreach messages (SVB, Bressan, ORAGON)
- First consignataria experiencing the value
- First "shut up and take my money" moment

Every feature from here optimizes conversion, but **someone has to sell**.

---

*Roadmap created: April 7, 2026*
*From: v1.9.7 → v2.0.0*
*Estimated effort: 20-30 hours of development*
*Blocker: Sales execution (José's domain)*
