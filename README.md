# consignatarias.com.ar

Plataforma de inteligencia del mercado ganadero argentino. Calendario unificado de remates, directorio de frigorificos y precios de mercado.

**Live:** [www.consignatarias.com.ar](https://www.consignatarias.com.ar)

## Que es

consignatarias.com.ar agrega datos de multiples consignatarias de hacienda en una sola interfaz estilo terminal en vivo. Un productor ganadero puede ver todos los remates del pais, filtrar por provincia o tipo, y acceder al calendario completo de cada consignataria.

## Que incluye

- **384+ remates** de 67 consignatarias en 10 provincias (Ene–Dic 2026)
- **74 perfiles de consignatarias** con calendario anual, heatmap y distribucion por tipo
- **Verificacion de perfiles** — los dueños pueden solicitar verificacion y gestionar su perfil
- **364 frigorificos** con datos de SENASA/MAGYP (matricula, etapa, CUIT)
- **Precios de mercado** con indice INMAG, categorias ganaderas, USD blue/oficial
- **Remates PRO** — sistema de destacados con tratamiento visual amber/gold
- **Scraper automatico** que actualiza datos diariamente a las 14:00 ART
- **GA4** — Google Analytics integrado

## Stack

- **Next.js 15** — App Router, static generation (SSG) + API routes
- **Tailwind CSS 3.4** — Terminal dark theme con colores custom
- **TypeScript** — Strict mode
- **Supabase** — PostgreSQL para consignatarias y solicitudes de verificacion
- **Resend** — Emails transaccionales (confirmacion, notificacion admin, aprobacion/rechazo)
- **Zod** — Validacion de schemas
- **Vercel** — Deploy automatico
- **GitHub Actions** — Scraper diario (CACG, Colombo y Colombo, O'Farrell, Madelan, dolarapi)
- **GA4** — Google Analytics (G-6CZMZH9S6Y)

## Paginas

| Ruta | Descripcion |
|------|-------------|
| `/` | Landing page con previews de datos en vivo |
| `/overview` | Dashboard general con mercado, remates y frigorificos |
| `/remates` | Feed cronologico de remates con filtros (provincia, tipo, periodo) |
| `/consignatarias/[slug]` | Perfil de consignataria con calendario anual (~74 paginas estaticas) |
| `/consignatarias/[slug]/verificar` | Formulario de verificacion de perfil |
| `/frigorificos` | Directorio de 364 frigorificos con busqueda y filtros |
| `/mercado` | Precios de mercado, indice INMAG, cotizacion USD |
| `/admin/claims` | Dashboard admin para revisar solicitudes de verificacion |

## Perfil de Consignataria

Cada consignataria tiene una pagina dedicada en `/consignatarias/[slug]` que incluye:

- **Header** — Nombre, provincias, plazas principales, total de remates
- **Calendario anual** — Heatmap de 12 meses mostrando densidad de remates por mes
- **Distribucion por tipo** — Barras visuales (Invernada, Cria, Reproductores, General, Especial)
- **Cronograma completo** — Remates agrupados por mes con fecha, hora, titulo, tipo, cabezas estimadas, status
- **Verificacion** — CTA "Verificar este perfil" para que los dueños reclamen su perfil
- **Structured data** — BreadcrumbSchema, LocalBusinessSchema, EventSchema (Google rich results)

## Verificacion de Perfiles

Los dueños de consignatarias pueden verificar su perfil:

1. Click en "Verificar este perfil" en la pagina del perfil
2. Completan formulario con email, nombre, CUIT, telefono y rol
3. Reciben confirmacion por email (Resend)
4. Admin revisa en `/admin/claims` (autenticacion por `ADMIN_SECRET`)
5. Al aprobar: perfil verificado, email de notificacion enviado

**API:**
- `POST /api/claims` — enviar solicitud (publico)
- `GET /api/admin/claims?status=pending` — listar solicitudes (admin)
- `PATCH /api/admin/claims/[id]` — aprobar/rechazar (admin)

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
| [Coop. Lehmann](https://www.cooperativalehmann.coop/hacienda/remates) | Santa Fe |
| [UMC Haciendas Villaguay](https://umchv.ar) | Entre Rios, Corrientes |
| [dolarapi.com](https://dolarapi.com/) | USD blue y oficial |
| [mercadoagroganadero.com.ar](https://www.mercadoagroganadero.com.ar) | INMAG ($/kg vivo) |
| [MAGYP](https://www.magyp.gob.ar) | Maiz FOB (USD/tn) |

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
    │   ├── remates.json               # 384 auctions
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
└── scrape-auctions.mjs               # Daily scraper (9 sources + CITY_PROVINCE_MAP correction)

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

Requiere `.env.local` con credenciales de Supabase, Resend y admin. Los datos de remates/frigorificos/mercado se leen de archivos JSON estaticos en `src/lib/data/`.

## Scraper

El scraper corre como GitHub Action todos los dias a las 14:00 ART (17:00 UTC):

```bash
# Correr manualmente
node scripts/scrape-auctions.mjs
```

Flujo: scraper → commit automatico → Vercel rebuild → sitio actualizado.

**Correccion de provincias:** El scraper incluye un `CITY_PROVINCE_MAP` (~70 ciudades) que corrige provincias mal asignadas por la API de CACG o entradas curadas con errores. La correccion se aplica automaticamente en cada ejecucion, antes de la deduplicacion.

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

Arquitectura hibrida: paginas estaticas (SSG) para remates, frigorificos y mercado + Supabase para consignatarias y solicitudes de verificacion + API routes para el flujo de verificacion. Costo: $0 (Vercel Hobby + Supabase Free). TTFB < 50ms.

## Provincias cubiertas

Buenos Aires, Chaco, Cordoba, Corrientes, Entre Rios, Formosa, La Pampa, Misiones, San Luis, Santa Fe.

*Nota: Neuquen y Santiago del Estero no tienen remates activos actualmente. Apareceran automaticamente cuando se agreguen remates en esas provincias.*

## Licencia

Propiedad de Memola Medios SAS. Todos los derechos reservados.
