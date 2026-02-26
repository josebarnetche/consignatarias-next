# Ganado Terminal

Plataforma de inteligencia de mercado ganadero para Argentina. Agrega remates, frigoríficos y precios de mercado de múltiples fuentes en un dashboard unificado.

**Live:** [consignatarias.com.ar](https://consignatarias.com.ar)

## Qué incluye

- **412 remates** de 86 consignatarias en 12 provincias (Feb–Dic 2026)
- **364 frigoríficos** con datos de SENASA/MAGYP (matrícula, etapa, CUIT)
- **Precios de mercado** con índice INMAG, categorías ganaderas, USD blue/oficial
- **Scraper automático** que actualiza datos diariamente a las 14:00 ART

## Stack

- [Next.js 15](https://nextjs.org/) — App Router, static generation
- [Tailwind CSS 3](https://tailwindcss.com/) — Terminal-style dark theme + landing page
- [Vercel](https://vercel.com/) — Deploy automático en cada push
- [GitHub Actions](../../actions) — Scraper diario (CACG, Colombo y Colombo, O'Farrell, Madelan, dolarapi)

## Páginas

| Ruta | Descripción |
|------|-------------|
| `/` | Landing page con preview de datos en vivo |
| `/overview` | Dashboard general estilo Bloomberg Terminal |
| `/remates` | Feed de remates con filtros por provincia, tipo, categoría y período |
| `/frigorificos` | Directorio de 364 frigoríficos con búsqueda y filtros |
| `/mercado` | Precios de mercado, índice INMAG, cotización USD |

## Fuentes de datos

### Remates (scraper diario)
| Fuente | Cobertura |
|--------|-----------|
| [CACG](https://cacg.org.ar/remates) (API) | Nacional — ~128 remates |
| [Colombo y Colombo](https://www.colomboycolombo.com.ar/remates) | Buenos Aires, Santa Fe, Corrientes |
| [O'Farrell](https://www.ivanofarrell.com.ar/remates) | Chaco, Santiago del Estero |
| [Madelan](https://www.madelan.com.ar/proximos) | NEA (streaming) |
| [dolarapi.com](https://dolarapi.com/) | USD blue y oficial |

### Datos curados (manuales)
| Fuente | Datos |
|--------|-------|
| IderCor | Remates pequeños productores Corrientes |
| Etchevehere Rural | Entre Ríos, calendario anual |
| Coop. La Ganadera | Entre Ríos, ferias semanales |
| Tradición Ganadera / Porro | Villa Ángela, Chaco |
| Nangapiry SA | Misiones (Fiesta del Ternero) |
| Reggi y Cía | Corrientes, Las Nacionales |
| Nestor Hugo Fuentes | La Pampa |
| Ganaderos de Formosa | Comandante Fontana |
| Expo events | Expoagro, Agroactiva, Expo Rural |

### Frigoríficos
- SENASA / MAGYP — Registro de establecimientos habilitados

## Desarrollo local

```bash
pnpm install
pnpm dev
```

Abre [localhost:3000](http://localhost:3000). No requiere base de datos — todos los datos se leen de archivos JSON estáticos en `src/lib/data/`.

## Scraper

El scraper corre como GitHub Action todos los días a las 14:00 ART (17:00 UTC):

```bash
# Correr manualmente
node scripts/scrape-auctions.mjs
```

Flujo: scraper → commit automático → Vercel rebuild → sitio actualizado.

Para ejecutarlo manualmente desde GitHub: Actions → "Scrape Auctions & Update Data" → Run workflow.

## Estructura del proyecto

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout (Inter font)
│   ├── globals.css                 # Terminal + landing styles
│   └── (terminal)/                 # Route group — dashboard pages
│       ├── layout.tsx              # Terminal chrome (nav, clock)
│       ├── overview/page.tsx       # Dashboard overview
│       ├── remates/page.tsx        # Auction feed + filters
│       ├── frigorificos/page.tsx   # Frigorífico directory
│       └── mercado/page.tsx        # Market prices
├── components/remates/
│   ├── auction-card.tsx            # Auction card component
│   ├── remates-filters.tsx         # Province/type/category filters
│   ├── time-tabs.tsx               # Hoy / 7 días / Pasados tabs
│   ├── market-dashboard.tsx        # 4 market indicator cards
│   └── community-block.tsx         # Featured links section
├── lib/
│   ├── data/                       # Static JSON data files
│   │   ├── remates.json            # 412 auctions
│   │   ├── frigorificos.json       # 364 frigoríficos
│   │   ├── consignatarias.json     # 56 consignatarias
│   │   ├── market-prices.json      # INMAG, categorías, USD
│   │   ├── frigorificos-summary.json
│   │   └── featured-links.json
│   └── db/
│       ├── schema.ts               # TypeScript types
│       └── seed.ts                 # Data access functions
scripts/
└── scrape-auctions.mjs             # Daily scraper (6 sources)
.github/workflows/
└── scrape-auctions.yml             # Cron job: 14:00 ART daily
```

## Provincias cubiertas

Buenos Aires, Chaco, Córdoba, Corrientes, Entre Ríos, Formosa, La Pampa, Misiones, Neuquén, San Luis, Santa Fe, Santiago del Estero.

## Licencia

MIT
