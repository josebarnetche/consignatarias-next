# consignatarias.com

Plataforma de inteligencia del mercado ganadero argentino. Calendario unificado de remates, directorio de frigorificos y precios de mercado.

**Live:** [www.consignatarias.com.ar](https://www.consignatarias.com.ar)

## Que es

Consignatarias.com.ar agrega datos de multiples consignatarias de hacienda en una sola interfaz estilo Bloomberg Terminal. Un productor ganadero puede ver todos los remates del pais, filtrar por provincia o tipo, y acceder al calendario completo de cada consignataria.

## Que incluye

- **442 remates** de 70 consignatarias en 12 provincias (Feb–Dic 2026)
- **70 perfiles de consignatarias** con calendario anual, heatmap y distribucion por tipo
- **364 frigorificos** con datos de SENASA/MAGYP (matricula, etapa, CUIT)
- **Precios de mercado** con indice INMAG, categorias ganaderas, USD blue/oficial
- **Remates PRO** — sistema de destacados con tratamiento visual amber/gold
- **Scraper automatico** que actualiza datos diariamente a las 14:00 ART
- **GA4** — Google Analytics integrado

## Stack

- **Next.js 15** — App Router, static generation (SSG)
- **Tailwind CSS 3.4** — Terminal dark theme con colores custom
- **TypeScript** — Strict mode
- **Vercel** — Deploy automatico, zero serverless functions
- **GitHub Actions** — Scraper diario (CACG, Colombo y Colombo, O'Farrell, Madelan, dolarapi)
- **GA4** — Google Analytics (G-6CZMZH9S6Y)

## Paginas

| Ruta | Descripcion |
|------|-------------|
| `/` | Landing page con previews de datos en vivo |
| `/overview` | Dashboard general estilo Bloomberg Terminal |
| `/remates` | Feed cronologico de remates con filtros (provincia, tipo, periodo) |
| `/consignatarias/[slug]` | Perfil de consignataria con calendario anual (~70 paginas estaticas) |
| `/frigorificos` | Directorio de 364 frigorificos con busqueda y filtros |
| `/mercado` | Precios de mercado, indice INMAG, cotizacion USD |

## Perfil de Consignataria

Cada consignataria tiene una pagina dedicada en `/consignatarias/[slug]` que incluye:

- **Header** — Nombre, provincias, plazas principales, total de remates
- **Calendario anual** — Heatmap de 12 meses mostrando densidad de remates por mes
- **Distribucion por tipo** — Barras visuales (Invernada, Cria, Reproductores, General, Especial)
- **Cronograma completo** — Remates agrupados por mes con fecha, hora, titulo, tipo, cabezas estimadas, status
- **Structured data** — BreadcrumbSchema, LocalBusinessSchema, EventSchema (Google rich results)

### Sistema de slugs canonicos

El sistema mapea 109 slugs raw (de `remates.json`) a 70 entidades unicas:

- Fusiona duplicados: `bressan` + `bressan-y-cia-s-r-l` + `bressan-y-cia-srl` → `bressan-y-cia` (103 remates combinados)
- Limpia sufijos legales de URLs (`-s-a`, `-s-r-l`, `-sa`, `-srl`)
- Slugs no canonicos → 301 redirect al canonico
- Slugs desconocidos → 404

## Remates PRO

Las consignatarias pueden destacar remates con el sistema PRO:

- Badge `★ PRO` con tratamiento visual amber/gold
- Pin al tope del feed dentro del mismo periodo
- Layout de 3 lineas con titulo y descripcion expandida
- Flag `featured: true` en el schema de remate

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
| IderCor | Remates pequenos productores Corrientes |
| Etchevehere Rural | Entre Rios, calendario anual |
| Coop. La Ganadera | Entre Rios, ferias semanales |
| Tradicion Ganadera / Porro | Villa Angela, Chaco |
| Nangapiry SA | Misiones (Fiesta del Ternero) |
| Reggi y Cia | Corrientes, Las Nacionales |
| Nestor Hugo Fuentes | La Pampa |
| Ganaderos de Formosa | Comandante Fontana |
| Expo events | Expoagro, Agroactiva, Expo Rural |

### Otros datasets

| Dataset | Registros | Fuente |
|---------|-----------|--------|
| Frigorificos | 364 | SENASA / MAGYP |
| Consignatarias | 56 | Registro publico + investigacion manual |
| Precios | INMAG + 6 categorias | dolarapi.com, datos del mercado |

## Estructura del proyecto

```
src/
├── app/
│   ├── page.tsx                        # Landing page
│   ├── layout.tsx                      # Root layout + GA4
│   ├── sitemap.ts                      # Sitemap dinamico (~140 URLs)
│   ├── globals.css                     # Terminal + landing styles
│   └── (terminal)/                     # Route group — dashboard pages
│       ├── layout.tsx                  # Terminal chrome (nav, clock)
│       ├── overview/                   # Dashboard overview
│       ├── remates/                    # Auction feed + filters
│       │   ├── page.tsx               # Server component + metadata
│       │   └── RematesClient.tsx      # Client: rows, filters, tabs
│       ├── consignatarias/
│       │   └── [slug]/                # Dynamic profile pages (~70)
│       │       ├── page.tsx           # Server: SSG, metadata, redirects, JSON-LD
│       │       └── ConsignatariaProfileClient.tsx  # Client: heatmap, rows, stats
│       ├── frigorificos/              # Frigorifico directory
│       └── mercado/                   # Market prices
├── components/
│   └── seo/JsonLd.tsx                 # Schema.org structured data components
└── lib/
    ├── data/
    │   ├── remates.json               # 442 auctions
    │   ├── consignataria-slugs.ts     # Canonical slug map (109 → 70 entities)
    │   ├── frigorificos.json          # 364 frigorificos
    │   ├── consignatarias.json        # 56 consignatarias con CUIT
    │   ├── market-prices.json         # INMAG, categorias, USD
    │   └── featured-links.json        # Curated resource links
    ├── db/
    │   ├── schema.ts                  # TypeScript interfaces (Auction, etc.)
    │   └── seed.ts                    # Data access functions
    └── utils/
        └── url.ts                     # URL normalization

scripts/
└── scrape-auctions.mjs               # Daily scraper (6 sources)

.github/workflows/
└── scrape-auctions.yml               # Cron: 14:00 ART daily
```

## Desarrollo local

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # Genera ~80 paginas estaticas
pnpm start        # Serve produccion local
```

No requiere base de datos — todos los datos se leen de archivos JSON estaticos en `src/lib/data/`.

## Scraper

El scraper corre como GitHub Action todos los dias a las 14:00 ART (17:00 UTC):

```bash
# Correr manualmente
node scripts/scrape-auctions.mjs
```

Flujo: scraper → commit automatico → Vercel rebuild → sitio actualizado.

Para ejecutarlo manualmente desde GitHub: Actions → "Scrape Auctions & Update Data" → Run workflow.

## SEO

- Sitemap dinamico con ~140 URLs (estaticas + provincias + consignatarias)
- JSON-LD structured data: Organization, WebSite, Dataset, Event, LocalBusiness, Breadcrumb
- Open Graph y Twitter Cards en todas las paginas
- Canonical URLs con redirect non-www → www (301)
- Google Analytics 4

## Arquitectura

```
[GitHub Actions] → scrape → remates.json → [git push] → [Vercel rebuild]
                                                              ↓
                                               SSG: ~80 paginas HTML estaticas
                                                              ↓
                                                    CDN edge (Vercel)
```

Todo es estatico. No hay base de datos, no hay API routes, no hay serverless functions. El build genera HTML puro que se sirve desde el edge de Vercel. Costo: $0 (Vercel Hobby). TTFB < 50ms.

## Provincias cubiertas

Buenos Aires, Chaco, Cordoba, Corrientes, Entre Rios, Formosa, La Pampa, Misiones, Neuquen, San Luis, Santa Fe, Santiago del Estero.

## Licencia

Propiedad de Memola Medios SAS. Todos los derechos reservados.
