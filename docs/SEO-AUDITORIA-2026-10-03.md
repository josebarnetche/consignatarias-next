# Auditoría SEO — 2026-10-03 (v1.221.0)

**Método:**
- `pnpm build` local (~3.400 rutas).
- Rastreo de las 3.159 URLs del sitemap con user-agent de Googlebot y GPTBot.
- Lectura del código en tres frentes: indexación técnica, datos estructurados, y contenido con enlazado interno.

**Límites:** el sitio en producción y Search Console no eran accesibles desde el entorno. Lo que depende de Supabase o del tráfico real hay que confirmarlo contra www.

Informe navegable: https://claude.ai/artifact/52eyF9FF6A6vjXjhfXjCVE (privado, del owner).

## Cifras del rastreo

| Métrica | Valor |
|---|---|
| URLs en el sitemap | 3.159; 3.158 responden 200 |
| 404 | 1 (`/mercado/origen/santiago-del-estero`) |
| Canonical a la portada | 71 (`/calendario/*`) |
| Titles repetidos | 93, en 456 URLs (fichas de remate) |
| Mediana de title | 77 caracteres; 3.005 URLs con más de 65 |
| Description de más de 165 caracteres | 1.592 URLs |
| URLs del sitemap sin enlaces internos entrantes | 808 (720 fichas de remate) |
| Indexables con menos de 150 palabras | 188 |
| HTML prerenderizados con contenido detrás de `loading.tsx` | 1.965 de 2.036 |
| JSON-LD inválido | 0 |
| Imágenes sin alt | 0 |

## Prioridades

### Crítica

1. **XSS por JSON-LD sin escapar `</script>`**: arreglado en el PR #52 con `src/lib/seo/json-ld.ts`.
2. **Canonical global a la portada.** `src/app/layout.tsx` fija `alternates.canonical` y `languages` y los heredan `/calendario/*` y `/preofertas`.
   - Fix: quitarlos del layout raíz y poner canonical por página.
3. **Ternero = INMAG × 1,10** (`scripts/scrape-auctions.mjs:1963`), presentado como "referencia del MAG" en `/precios`, `/precio-del-ternero-en-pie`, `/precios/terneros`, `/mercado/terneros` y en el schema. Contradice a `/vr`.

### Alta

4. **`src/app/loading.tsx` raíz.** El HTML abre con "Cargando el mercado…" y el contenido queda en `<div hidden>`. Malo para IAs sin JS.
5. **`robots.ts` bloquea `/_next/`.** Googlebot no baja CSS/JS. Además, `/api/mcp` queda bloqueado.
6. **Fichas de remate huérfanas.** Las tarjetas llevan a la fuente o al perfil; hay que enlazar `/remates/[slug]`.
7. **Titles.**
   - Remate: agregar firma, ciudad y fecha.
   - Sufijo de marca de 25 caracteres, sin `title.absolute`.
   - Marca duplicada en varias plantillas.
8. **FAQPage invisible** en `/remates`, `/consignatarias` y unas 10 páginas más.
9. **Canibalización** de "precio del novillo/vaca/ternero hoy": entre 4 y 6 URLs por categoría y ninguna enlaza a `/vr`.
10. **Páginas flacas indexables:**
    - meses vacíos (9 de 12);
    - 87 ciudades sin próximos;
    - 78 combinaciones precio × provincia con el número nacional;
    - frigoríficos inactivos.
11. **Frigoríficos SSR por request:** la sesión se lee en el server, y la metadata viaja en el body.

### Media

- Enlaces rotos:
  - `/remates/capital-federal`, `/tucuman`, `/neuquen`, `/salta`, `/jujuy`, `/la-rioja`, `/catamarca`;
  - `/calendario`;
  - `/alertas`.
- Breadcrumbs:
  - el último ítem apunta a la home;
  - en `remates/tipo` "Remates" lleva a la home;
  - BreadcrumbList duplicado en arrendamiento y spread.
- Product/Offer sobre precios de mercado y QAPage armado a mano: markup engañoso.
- Dataset con licencia CC-BY que contradice `/licencia-datos`.
- Event:
  - sin URL única por remate;
  - sin modo mixto ni `VirtualLocation` cuando hay stream;
  - dirección vacía en 125 remates.
- Organization sin `@id`.
- `lastmod` igual al build en 1.220 URLs.
- og:title y og:url de la portada heredados en 118 URLs.
- H1:
  - el de `/precio-de-la-vaca-en-pie` sale sin número;
  - doble H1 en `/mercado/spread`;
  - `/overview` sin H1, y el logo apunta ahí.
- Home y `/vr` sin la promesa en el title; `/vr` con jerga.
- `llms.txt`:
  - pide no scrapear;
  - no lista `/vr`;
  - cifras escritas a mano.
- Robots sin OAI-SearchBot ni Claude-SearchBot.
- Bundles: `remates.json` (699 KB) y `frigorificos.json` (251 KB) en el cliente, y `images.unoptimized`.
- `/quienes-somos` sin tildes y con cifras viejas. En el nav: Expo vencida, "1.102 plantas", "104 firmas".

## Plan

- **Etapa 1 (semana):**
  - PR #52;
  - canonical;
  - robots `/_next/`;
  - `loading.tsx`;
  - ternero;
  - enlaces rotos y 404;
  - H1;
  - nav.
- **Etapa 2 (2 semanas):**
  - enlazar las fichas de remate y titles de remate;
  - umbrales de noindex, con el mismo filtro en el sitemap;
  - FAQ visibles;
  - fuera Product/Offer y QAPage, y licencia;
  - title más corto y Open Graph por página;
  - `ProvinceCluster`.
- **Etapa 3 (mes):**
  - URL canónica por categoría de precio con la banda VR;
  - titles de home y `/vr`, y landing de valuación;
  - frigoríficos estáticos;
  - datos de spread y pulso desde el server;
  - bundles más livianos;
  - `llms.txt`, robots y Bing/IndexNow;
  - `/quienes-somos`.
