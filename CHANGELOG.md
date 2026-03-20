# Changelog

All notable changes to consignatarias.com.ar are documented in this file.

Format: [Semantic Versioning](https://semver.org/) with feature descriptions focused on platform evolution.

---

## [1.9.3] — 2026-03-20

### Onboarding & Dashboard UX Overhaul

Complete redesign of the new user experience and empty states across the platform.

#### Points System (Gamification)
- **Point Values**: 10 pts = 1 peso, 4500 pts = 1 month PRO free
- **ProfileProgressTracker**: Visual progress bar with percentage toward free PRO month
- **Action Suggestions**: Clickable next steps that route to relevant dashboard tabs
- **Point Breakdown**: Expandable view showing all earning opportunities
- **Redemption Flow**: Early adopter badge + PRO activation (pending: DB + webhook)

#### Claim Flow Improvements
- **CUIT Validation**: Real-time validation using Argentina's modulo 11 algorithm with visual ✓/✗ feedback
- **Success State**: Clear post-submission guidance with email instructions and spam folder reminder
- **Error Recovery**: 409 conflict now shows login link instead of dead-end message

#### Empty Dashboard Wizard
- New users now see a 3-step "Getting Started" guide instead of blank screen
- Step 1 (active): Verify your profile with clear CTAs
- Step 2-3 (greyed): Complete information, Publish auctions
- Footer explains benefits of verified profile

#### Empty States Redesign
Unified empty state pattern across all listing pages:
- **Remates**: Calendar icon + filter clear + newsletter signup CTA
- **Consignatarias Directory**: Search icon + dynamic query message + clear button
- **Frigoríficos Table**: Building icon + clear all filters button
- **Comparar**: Chart icon + directional guidance to sidebar
- **Dashboard Resultados**: Analytics icon + benefits grid (prices, trends, comparisons)

#### Other Improvements
- Admin dashboard: Loading spinner and retry button on error
- WelcomeChecklist: Button now scrolls to edit section properly
- Copy improvements throughout onboarding flow

---

## [1.9.2] — 2026-03-19

### DTE Period Comparison

Analytics feature allowing users to compare their DTE (livestock movement) activity across time periods.

#### Features
- Compare month vs month, quarter vs quarter, or year vs year
- Visual change indicators with +/-% and color coding
- Category breakdown showing side-by-side livestock types
- Natural language insights ("Your February was +45% vs January")
- Collapsible UI to reduce noise for new users

#### Purpose
Creates user investment in accumulated data — seeing historical trends encourages continued platform usage.

---

## [1.9.1] — 2026-03-19

### Internal Linking & Conversion Optimization

#### SEO Improvements
- Cross-links between consignataria profiles
- City quick-links on province pages
- City-to-province navigation breadcrumbs

#### Conversion Features
- Dynamic founder spots scarcity counter
- DTE data export (CSV)
- WhatsApp share analytics tracking

---

## [1.9.0] — 2026-03-18

### Price Oracle & MAG Integration

#### Market Data
- Real-time INMAG index integration ($/kg live weight)
- 6 cattle category prices from Mercado Agroganadero
- Price display on consignataria profiles with MAG data

#### Onboarding Stack
- Complete activation funnel: Welcome → DT-e upload → PRO conversion
- Profile completion checklist with progress tracking
- Onboarding prompts for first-time users

#### SEO Landing Pages
- `/remates/hoy` — Today's auctions
- `/remates/manana` — Tomorrow's auctions
- Full PRO conversion tracking funnel

---

## [1.7.2] — 2026-03-16

### Post-Remate Outreach System

Automated email outreach to consignatarias after their auctions to collect official results.

#### Features
- Automatic detection of completed auctions (+3-5h after scheduled time)
- Professional email requesting price averages and head counts
- 83% email coverage (71 of 86 consignatarias)
- Outreach log to prevent duplicate emails

---

## [1.7.1] — 2026-03-15

### SEO Expansion & Dynamic OG Images

#### Province + Type Combo Pages
- 35 new landing pages combining province and auction type
- Example: `/remates/buenos-aires/invernada`

#### Dynamic OG Images
- Auto-generated social share images for consignataria profiles
- Modern card design with logo, stats, and branding

#### External Resources
- Curated links section on consignataria profiles
- Links to official websites, social media, catalogs

---

## [1.7.0] — 2026-03-15

### Video Catalogs

Automated YouTube integration linking auction livestreams to consignataria profiles.

#### Features
- 15 YouTube channels mapped with resolved channel IDs
- Automated video matching based on auction date and location
- VideoGallery component with modal player
- Featured video badges for highlighted content
- ~14,500 combined subscriber reach

#### Technical
- Daily video matcher runs in GitHub Actions
- VideoObject schema for SEO
- Lazy loading for performance

---

## [1.5.0] — 2026-03-14

### Email Marketing Automation

#### Newsletter System
- Weekly newsletter with upcoming auctions summary
- PRO auctions highlighted with special treatment
- Province/type filtering (foundation for alerts)

#### Transactional Emails
- Resend integration with verified domain
- Terminal-style HTML templates
- Pre-auction reminders (daily cron)

---

## [1.3.0] — 2026-03-14

### API Completion

#### New Endpoints (20 total)
- Consignataria ranking by auction count
- PDF report generation
- Full OpenAPI spec at `/api/openapi.json`

#### B2B SEO
- Dataset schema markup
- API documentation page at `/api-docs`

---

## [1.2.0] — 2026-03-13

### Lead Magnets & Tools

#### 5 Free Tools (`/herramientas`)
- Livestock calculator (estimate lot value)
- Auction calendar (weekly/monthly view)
- Weekly market report (PDF download)
- Price comparator (by category and date)
- Data export (CSV/JSON)

#### Glossary Expansion
- 38 livestock industry terms
- DefinedTermSet schema for AI search

---

## [1.1.0] — 2026-03-12

### Subasto API Launch

Public REST API for Argentina's cattle market.

#### 11 Initial Endpoints
- Upcoming auctions, today's auctions, statistics
- Full-text search with filters
- Calendar view, highlighted auctions
- Market prices, health checks

#### Integration Features
- Webhook registration
- Persistent alert subscriptions
- Rate limiting for free tier

---

## [1.0.0] — 2026-03-10

### Platform Launch

Full-featured cattle auction directory and market intelligence platform.

#### Core Features
- 385 auctions from 77 consignatarias
- 364 frigoríficos from SENASA registry
- Daily market prices (INMAG, USD, corn)
- 10 province landing pages

#### User Features
- Profile verification (trust-first, auto-approve)
- Owner dashboard with auction CRUD
- Rebill payment integration for PRO tier
- Magic link authentication

#### Technical
- Next.js 15 with SSG (552 static pages)
- Supabase PostgreSQL (10 tables)
- Daily scraper (9 sources via GitHub Actions)
- Full JSON-LD schema coverage

---

## [0.9.x] — 2026-03-09 to 2026-03-10

### Pre-Launch Development

- 0.9.9: AI SEO (robots.txt, FAQ schema, glossary)
- 0.9.8: Logo upload, data quality page, monthly metrics
- 0.9.7: Trust-first onboarding, auction CRUD
- 0.9.5: SaaS foundation (Rebill, DAL, analytics)
- 0.9.2: Frigorifico detail pages, auction results
- 0.9.1: FrigoConnect (claims + 126 enriched profiles)
- 0.9.0: SEO overhaul (homepage, provinces, E-E-A-T)

---

## [0.8.x] — 2026-03-09

### Verification System

- 0.8.3: Province accuracy fix (CITY_PROVINCE_MAP)
- 0.8.1: Supabase integration, claims system, admin dashboard

---

## [0.7.0] — 2026-03-08

### SEO Foundation

- JSON-LD structured data (Organization, Event, LocalBusiness)
- Dynamic sitemap generation
- Open Graph and Twitter Card meta tags
- 9th scraper source added

---

## [0.6.0] — 2026-03-07

### Terminal Redesign

- New visual language with glass panels
- Dark theme with accent colors
- Consistent typography and spacing

---

## [0.5.0] — 2026-03-07

### Consignataria Profiles

- 70 static profile pages with canonical slug system
- Calendar heatmap and type distribution charts
- Google Analytics 4 integration

---

## [0.4.0] — 2026-03-06

### Monetization Foundation

- PRO auction system with visual treatment
- Amber/gold highlighting for featured listings

---

## [0.3.0] — 2026-02-26

### Automation

- Daily scraper via GitHub Actions
- Live market data integration
- Platform identity established

---

## [0.2.0] — 2026-02-26

### Data Expansion

- 277 auctions from 15+ sources
- Multi-source data normalization

---

## [0.1.0] — 2026-02-26

### Genesis

- Initial commit with 92 auctions
- 364 frigoríficos from SENASA
- Basic dashboard structure

---

## [0.0.0] — 2026-02-26

### Project Start

- `npx create-next-app`
- Data collection began
- Architecture decisions made

---

*Built by Memola Medios SAS. One human, one AI, 22 days.*
