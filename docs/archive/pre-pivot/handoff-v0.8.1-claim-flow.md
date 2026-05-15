# Handoff Document: v0.8.1 Claim Flow Session (2026-03-09)

## CRITICAL WARNING: WRONG REPOSITORY

**All code in this session was written in the WRONG repository.**

| | Wrong Repo (where code lives) | Correct Repo (production) |
|---|---|---|
| **Path** | `C:\Users\Usuario\Documents\Consignatarias` | `C:\Users\Usuario\consignatarias` |
| **Git remote** | `consignatarias.git` | `consignatarias-next.git` |
| **Framework** | Next.js 14, npm | Next.js 15, pnpm, React 19 |
| **Data layer** | Supabase + Prisma (PostgreSQL, RLS) | **Pure static JSON files** (no database) |
| **Auth** | NextAuth.js (JWT, roles) | **None** |
| **Middleware** | Route protection by role | **None** |
| **Deps** | Supabase, NextAuth, Zod, Resend, Prisma, Lucide | next, react, react-dom, @vercel/analytics, @vercel/speed-insights |
| **Package manager** | npm | pnpm |
| **Latest version** | v0.8.1 (this session's commit) | v0.7.0 |
| **Deployment** | Vercel | Vercel (SSG, daily rebuild) |

**The user confirmed**: "consignatarias-next is the one" and "yes, this whole work was meant for that project all the time."

The claim flow needs to be **ported** to the correct repo. This is non-trivial due to the completely different architecture.

---

## What Was Built (in wrong repo)

### Overview
A complete consignataria profile claim flow — the core lead capture mechanism for the platform. Anyone (no account needed) submits a claim with their CUIT + email, admin reviews, and on approval the profile becomes verified.

### Commit
```
a5cdacf feat: Claim flow + transactional emails + middleware fix (v0.8.1)
```
Pushed to `origin/master` of `consignatarias.git` (wrong repo).

### 18 files changed, +1428 lines

---

## Files Created & Their Purpose

### 1. Database Migration
**File:** `supabase/migrations/20260309000001_consignataria_claims.sql`

- Adds `claimed_at` (TIMESTAMPTZ) and `claimed_by_email` (TEXT) columns to `consignatarias` table
- Creates `consignataria_claims` table:
  - `id` (UUID, PK)
  - `consignataria_id` (UUID, FK → consignatarias)
  - `claimant_email`, `claimant_name`, `claimant_phone`, `claimant_role`
  - `cuit` (TEXT, required)
  - `status` (TEXT, CHECK: pending/approved/rejected)
  - `admin_notes`, `reviewed_at`, `reviewed_by`
  - `created_at`, `updated_at` (auto-managed)
- Indexes: `idx_claims_consignataria`, `idx_claims_status`
- Unique partial index: one pending claim per email+consignataria (`idx_claims_unique_pending`)
- `update_updated_at()` trigger reused from v0.8.0 migration
- RLS enabled (no anon policies — all access via service_role in API routes)

### 2. Zod Validators
**File:** `src/lib/validators/claim.ts`

Two schemas:
- `claimSchema` — public claim submission:
  - `consignataria_id`: UUID
  - `cuit`: regex `^\d{2}-\d{7,8}-\d$` (Argentine CUIT format XX-XXXXXXXX-X)
  - `claimant_email`: email, lowercased + trimmed
  - `claimant_name`: optional, 2-100 chars
  - `claimant_phone`: optional, max 30 chars
  - `claimant_role`: optional enum (titular/socio/apoderado/administrativo/otro)
- `claimReviewSchema` — admin review:
  - `status`: enum (approved/rejected)
  - `admin_notes`: optional, max 1000 chars
- All error messages in Spanish

### 3. Email Service
**File:** `src/lib/email.ts`

- Uses Resend SDK with **lazy initialization** (singleton `getResend()`) to avoid build-time errors when `RESEND_API_KEY` is empty
- `FROM_EMAIL`: `consignatarias.com <noreply@consignatarias.com>`
- `escapeHtml()` utility prevents XSS in email templates
- 4 email functions:
  1. `sendClaimConfirmation()` → to claimant on submission
  2. `sendClaimNotificationToAdmin()` → to `ADMIN_EMAIL` env var
  3. `sendClaimApproved()` → to claimant on approval (with profile link)
  4. `sendClaimRejected()` → to claimant on rejection (with optional reason)
- All emails are fire-and-forget (`.catch()` on the promise, don't block API response)

**Credentials:**
- Resend API key: `re_7SgnsRnq_5XovoFRpnhSPS2r27oSQMfTY`
- Admin email: `agro@memola.com.ar`
- Domain: verified on Resend

### 4. Public Claim API
**File:** `src/app/api/claims/route.ts`

`POST /api/claims` — no auth required (lead capture):
1. Parses body with `claimSchema` (Zod)
2. Verifies consignataria exists via Supabase (`consignatarias.id + display_name + claimed_at`)
3. Checks not already claimed (`claimed_at IS NULL`)
4. Checks no existing pending claim for same email+consignataria
5. Inserts into `consignataria_claims`
6. Fires confirmation email to claimant + notification to admin (non-blocking)
7. Returns `201 { id: claim.id }`

Error codes: 400 (validation), 404 (not found), 409 (already claimed / duplicate pending), 500 (server error)

### 5. Admin Claims List API
**File:** `src/app/api/admin/claims/route.ts`

`GET /api/admin/claims?status=pending|approved|rejected|all` — admin only:
- Requires NextAuth session with `role === "ADMIN"`
- Queries `consignataria_claims` with joined `consignatarias(id, display_name, canonical_slug, cuit)`
- Ordered by `created_at DESC`
- Returns `{ claims: [...] }`

### 6. Admin Claim Review API
**File:** `src/app/api/admin/claims/[id]/route.ts`

`PATCH /api/admin/claims/[id]` — admin only:
- UUID validation on `[id]` param (regex check)
- Parses body with `claimReviewSchema`
- Validates claim exists and is still `pending`
- Updates claim: `status`, `admin_notes`, `reviewed_at`, `reviewed_by`
- **On approval:**
  - Sets `consignatarias.verified = true`, `claimed_at`, `claimed_by_email`
  - Updates contact fields from claim data (phone, email, cuit)
  - Auto-rejects ALL other pending claims for same consignataria
- Sends approval/rejection email to claimant (non-blocking)

### 7. Claim Form Component
**File:** `src/components/claims/claim-form.tsx`

Client component (`"use client"`) with:
- CUIT input (pattern `\d{2}-\d{7,8}-\d`, placeholder `20-12345678-9`)
- Email input (required)
- Name input (optional)
- Phone input (optional)
- Role dropdown: Titular, Socio/a, Apoderado/a, Administrativo/a, Otro
- Form states: `idle` → `submitting` → `success` / `error`
- Success: green card "Revisaremos tu solicitud en 24-72hs habiles"
- Error: red text with server error message
- Styled with Tailwind (light theme — will need dark theme adaptation for correct repo)

### 8. Claim Page
**File:** `src/app/consignatarias/[slug]/reclamar/page.tsx`

Server component:
- Fetches consignataria by slug via `getConsignatariaBySlug()`
- If already claimed (`claimed_at`), redirects to detail page
- Renders `<ClaimForm>` with consignataria ID + display name
- Has `generateMetadata()` for SEO
- Uses `lucide-react` ArrowLeft icon for back link
- `revalidate = 300` (5 min ISR)

### 9. Detail Page CTA
**File:** `src/app/consignatarias/[slug]/page.tsx` (edited)

Added amber CTA card after contact section when `!consignataria.claimed_at`:
- "Es tu consignataria?" heading
- Description text
- Link to `/consignatarias/[slug]/reclamar`
- Amber/warm color palette for visual contrast

### 10. Admin Claims Dashboard
**File:** `src/app/admin/claims/page.tsx`

Client component with:
- Status filter tabs (Pendientes / Aprobados / Rechazados / Todos)
- Data table: Consignataria, Reclamante (name/email/phone/role), CUIT (submitted vs on record), Status badge, Date
- Approve/Reject buttons on pending claims
- Reject prompts for optional rejection reason via `window.prompt()`
- Loading and empty states
- Protected by middleware (`/admin` → ADMIN role only)

### 11. Middleware Fix
**File:** `src/middleware.ts` (edited)

Bug fix: `pathname.startsWith("/consignataria")` matched both:
- `/consignataria/*` (role-protected dashboard, future)
- `/consignatarias/*` (public browsing pages)

This blocked anonymous users from browsing consignataria profiles.

Fix: Changed to `pathname.startsWith("/consignataria/")` (trailing slash)

Also added `/consignatarias` and `/api/claims` to `publicRoutes` array.

### 12. Type Updates
**File:** `src/lib/supabase-queries.ts` (edited)

Added to `ConsignatariaRow` interface:
- `claimed_at: string | null`
- `claimed_by_email: string | null`
- `cuit: string | null`
- `matricula: string | null`

### 13. Remotion Videos Updated
Three Remotion compositions had stats synced to match live DB (wrong DB, from wrong repo):
- `remotion/src/compositions/StatsShowcase.tsx` — 65 remates, 19 consignatarias, 7 provincias
- `remotion/src/compositions/Day5_WhyBeHereCarousel.tsx` — same counts
- `remotion/src/compositions/Day6_StatsStory.tsx` — same counts

**Note:** These are in the wrong repo and the counts are wrong for the production site (which has 366+ remates, 77 consignatarias, 12 provinces).

---

## Security Measures Implemented

1. **HTML injection in emails** — `escapeHtml()` function applied to all user-supplied values (`claimantName`, `cuit`, `consignatariaName`, `reason`) before inserting into HTML email templates
2. **UUID validation** — Admin PATCH route validates `[id]` param matches UUID regex before querying
3. **URL encoding** — Slug in approval email profile link uses `encodeURIComponent(slug)`
4. **Zod validation** — All API inputs validated with strict schemas, Spanish error messages
5. **CUIT format validation** — Regex `^\d{2}-\d{7,8}-\d$` prevents arbitrary strings
6. **Email normalization** — `.toLowerCase().trim()` on claimant email
7. **RLS** — Claims table has RLS enabled with no anon policies (service_role only)
8. **Duplicate prevention** — Unique partial index on (consignataria_id, claimant_email) WHERE status = 'pending'
9. **Lazy Resend init** — Prevents build failure when `RESEND_API_KEY` env var is empty

---

## What Needs to Happen for the Port

### The Correct Repo Architecture (`~/consignatarias`)

```
consignatarias-next/
├── package.json          # 3 runtime deps only (next, react, react-dom)
├── pnpm-lock.yaml        # Uses pnpm, NOT npm
├── src/
│   ├── app/
│   │   ├── page.tsx      # Landing page (reads static JSON)
│   │   ├── layout.tsx    # Root layout
│   │   ├── (terminal)/   # Route group
│   │   │   ├── layout.tsx         # Terminal header + sidebar
│   │   │   ├── overview/          # Dashboard
│   │   │   ├── remates/           # Auction listings
│   │   │   ├── consignatarias/    # Directory + profiles
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx                    # SSG profile page
│   │   │   │       └── ConsignatariaProfileClient.tsx  # Client component
│   │   │   ├── frigorificos/      # Slaughterhouse data
│   │   │   └── mercado/           # Market prices
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   ├── components/
│   │   ├── seo/JsonLd.tsx
│   │   ├── remates/      # Auction UI components
│   │   └── AnalyticsProvider.tsx
│   └── lib/
│       ├── data/
│       │   ├── remates.json              # 366+ auctions (scraper writes daily)
│       │   ├── consignataria-slugs.ts    # 77 canonical profiles (slug system)
│       │   ├── consignatarias.json       # 56 consignatarias with metadata
│       │   ├── market-prices.json
│       │   ├── frigorificos.json
│       │   └── frigorificos-summary.json
│       ├── db/
│       │   ├── schema.ts                 # TypeScript interfaces ONLY (no DB)
│       │   └── seed.ts
│       ├── ui/tokens.ts                  # Design tokens, formatDateShort()
│       └── utils/url.ts
```

### Key Architectural Differences

1. **No database** — Everything is static JSON. The claim flow REQUIRES a database (Supabase).
2. **No auth system** — No NextAuth, no sessions, no roles. Admin access needs a solution.
3. **No middleware** — No route protection. The middleware fix is irrelevant.
4. **No Zod** — Would need to be added as a dependency.
5. **No Resend** — Would need to be added as a dependency.
6. **No Supabase client** — Would need to be added as a dependency.
7. **Route group `(terminal)`** — All browsing pages are inside `src/app/(terminal)/`. The claim page and admin page need to be placed correctly.
8. **Dark terminal aesthetic** — The UI uses a dark theme with monospace fonts. The claim form (currently light Tailwind) needs restyling.
9. **Static generation** — All consignataria pages are SSG via `generateStaticParams()`. The claim form is a client component that would POST to an API route (this is compatible with SSG).
10. **No `consignataria.id`** — The static system uses string slugs as identifiers, not UUIDs. The claim flow references `consignataria_id` (UUID) which doesn't exist in the correct repo.

### Minimum Dependencies to Add

```bash
pnpm add @supabase/supabase-js resend zod
```

### Key Decisions Needed Before Porting

1. **Admin auth** — The correct repo has NO auth. Options:
   - Simple API key/secret in headers (env var `ADMIN_SECRET`)
   - Add basic NextAuth with just admin role
   - Supabase Auth
   - Password-protected admin page (client-side check against env var)

2. **Consignataria identification** — Current static system uses slugs, not UUIDs. The Supabase `consignataria_claims` table needs to reference something. Options:
   - Use canonical slug as the identifier (change `consignataria_id UUID` to `consignataria_slug TEXT`)
   - Create a `consignatarias` table in Supabase (but this duplicates the static JSON data)
   - Keep the migration as-is and ensure Supabase has a `consignatarias` table synced from JSON

3. **Route placement** — Should `/consignatarias/[slug]/reclamar` be inside the `(terminal)` route group or outside it?

4. **UI theme** — The claim form uses light Tailwind styling. The terminal uses a dark theme. Need to adapt.

5. **`claimed_at` tracking** — Where to store "this consignataria is claimed"? Options:
   - Only in Supabase (API checks at render time or form submission time)
   - Add a field to `consignataria-slugs.ts` (requires code changes when approving)
   - Check Supabase at build time and inject into static props

---

## Environment Variables Needed

```env
# Supabase (existing project: nyqkgorazkwcufkzxmhd)
NEXT_PUBLIC_SUPABASE_URL=https://nyqkgorazkwcufkzxmhd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<get from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<get from Supabase dashboard>

# Resend (already verified)
RESEND_API_KEY=re_7SgnsRnq_5XovoFRpnhSPS2r27oSQMfTY

# Admin
ADMIN_EMAIL=agro@memola.com.ar

# App URL
NEXT_PUBLIC_APP_URL=https://www.consignatarias.com.ar
```

---

## Data Counts (correct repo, production)

| Metric | Count |
|--------|-------|
| Auctions in remates.json | 366+ (fluctuates with scraper) |
| Consignataria profiles | 77 canonical (109 raw slugs) |
| Provinces | 12 |
| Frigorificos | 364 |
| Static pages generated | 87 |
| Scraper sources | 9 |

---

## Supabase Project

- **Project ref:** `nyqkgorazkwcufkzxmhd`
- **MCP configured:** `claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=nyqkgorazkwcufkzxmhd"`
- **Status:** Empty DB, no tables created yet (the migration from wrong repo was never applied to this project)

---

## Session Timeline

1. User provided 10-step plan for claim flow
2. I implemented all 10 steps in `Documents/Consignatarias` (wrong repo)
3. Added Resend email integration (4 transactional email functions)
4. Fixed Resend lazy init bug (build fails when API key is empty)
5. Security audit: HTML injection fix, UUID validation, URL encoding
6. Committed as v0.8.1, updated CHANGELOG + README
7. Synced Remotion stats (but to wrong counts)
8. Pushed to `origin/master` (wrong repo)
9. User noticed counts didn't match production → discovered wrong repo
10. Explored correct repo, confirmed completely different architecture
11. Session ended with port pending

---

## Complete Code Reference

All the code that was written lives in the wrong repo at `C:\Users\Usuario\Documents\Consignatarias` in commit `a5cdacf`. The full file contents are documented above and can be read from that repo. Key files to copy/adapt:

| Source (wrong repo) | Purpose | Port difficulty |
|---|---|---|
| `supabase/migrations/20260309000001_consignataria_claims.sql` | DB schema | Low — apply directly to Supabase |
| `src/lib/validators/claim.ts` | Zod schemas | Low — copy as-is, add `zod` dep |
| `src/lib/email.ts` | Resend emails | Low — copy as-is, add `resend` dep |
| `src/app/api/claims/route.ts` | Public API | Medium — adapt Supabase queries to match new schema |
| `src/app/api/admin/claims/route.ts` | Admin list API | High — no auth system to check against |
| `src/app/api/admin/claims/[id]/route.ts` | Admin review API | High — no auth, different data model |
| `src/components/claims/claim-form.tsx` | Form UI | Medium — restyle for dark terminal theme |
| `src/app/consignatarias/[slug]/reclamar/page.tsx` | Claim page | Medium — adapt to static slug system |
| `src/app/admin/claims/page.tsx` | Admin dashboard | High — no auth, needs dark theme |
| `src/middleware.ts` | Route fix | N/A — no middleware in correct repo |
| `src/lib/supabase-queries.ts` | Type updates | N/A — different data layer |

---

## Recommendations for Next Session

1. **Start in the correct repo**: `cd C:\Users\Usuario\consignatarias`
2. **Plan the port** — use EnterPlanMode given the architecture differences
3. **Simplest admin auth**: Use an `ADMIN_SECRET` env var checked via API header — avoids adding a full auth system
4. **Use slug as identifier** — change claims table to use `consignataria_slug TEXT` instead of `consignataria_id UUID`
5. **Keep static architecture** — only add Supabase for the claims table, not for all data
6. **Apply migration first** — run the SQL on the existing Supabase project (`nyqkgorazkwcufkzxmhd`)
7. **Test locally** — `pnpm dev` and verify the claim flow works end-to-end
