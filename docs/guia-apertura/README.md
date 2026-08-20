# Guía paga — "Cómo abrir tu consignataria de hacienda"

Primer producto **one-time** del sitio: un PDF de 53 páginas que se vende a **ARS 100.000**
por Rebill. No otorga tier, no vence, no se cancela: se compró o no se compró.

## Las cinco piezas

| Pieza | Dónde vive |
|---|---|
| Contenido | `scripts/guia-apertura/contenido-{1,2,3}.mjs` (Partes I-II, III-IV, V + anexos) |
| Render | `scripts/guia-apertura/build.mjs` → `pnpm guia:apertura` |
| Maestro | `private/guias/abrir-una-consignataria-v1.pdf` — **nunca** en `/public` |
| Catálogo (precio, versión, páginas) | `src/lib/guias-premium.ts` |
| Entitlement | tabla `guia_purchases` (migración `20260819_guias_premium.sql`) |

## El circuito de la plata

```
/como-abrir-una-consignataria          sales page (indexable, con el mapa gratis)
   └─ ComprarGuia.tsx  → POST /api/guias-premium/checkout   { slug, email }
        └─ createGuiaPurchaseLink()  → payment-link Rebill (isSingleUse, metadata.kind='guia_purchase')
             └─ webhook /api/webhooks/rebill  Branch 3
                  ├─ upsert guia_purchases (guia_slug, email)   ← ESTE es el entitlement
                  └─ sendGuiaPurchaseDelivery()  mail con el link de descarga
                       └─ GET /api/guias-premium/[slug]/download
                            ├─ exige sesión con el MISMO email que compró
                            ├─ lee el maestro de private/guias/
                            └─ estampa "Licencia personal de <email>" al pie de cada página (pdf-lib)
```

La compra es **email-first**: no exige cuenta, igual que PRO Consignataria. Para *descargar*
sí hace falta entrar con esa casilla — el magic-link de Supabase es la prueba de que quien
descarga controla el mail que pagó. Si el comprador se loguea después, `/cuenta/guias` le
ata la compra al `user_id`.

## Edición y facturación

El producto se vende **por estar al día**, así que la edición es parte del producto:
`edicion` y `actualizacion` viven en el catálogo y se muestran en la tapa del PDF, en el
sales page y en `/cuenta/guias`. Regla: **una edición nueva no se le cobra de nuevo a
quien ya compró** — se cambia `file` en el catálogo y el mismo link entrega la versión
nueva, porque el entitlement es el email.

La **factura A la emite Memola Medios SAS (CUIT 30-71863222-2)**. El comprador puede
cargar razón social y CUIT en el checkout; van en `metadata` de Rebill y el webhook los
deja en `guia_purchases.meta.facturacion`. Consulta para emitir las pendientes:

```sql
select email, purchased_at, amount_ars, meta->'facturacion' as facturacion
from guia_purchases where status='paid' order by purchased_at desc;
```

## Regenerar el PDF

```bash
pnpm guia:apertura
```

Necesita Google Chrome instalado (Playwright lo usa con `channel: 'chrome'`, sin bajar
Chromium) e internet la primera vez, para las tipografías. El PDF sale con las fuentes
embebidas. El script imprime el total de páginas: **actualizá `pages` en
`src/lib/guias-premium.ts`** cuando cambie.

Al publicar una versión nueva:

1. Actualizá el snapshot de mercado (`MERCADO` en `build.mjs`) desde `/mercado` y su fecha.
2. Subí `VERSION` en `build.mjs` y `version`/`updatedAt` en `guias-premium.ts`.
3. Si cambia el nombre del archivo, cambiá `file` en el catálogo — los compradores viejos
   siguen entrando por el mismo link y bajan la versión nueva.

## Capturas

En `docs/guia-apertura/assets/capturas/`. Son de portales **públicos**, tomadas con la
extensión de Chrome:

| Archivo | Qué muestra |
|---|---|
| `01-siocal-home.jpg` | Portal del SIOCAL (siocal.magyp.gob.ar) |
| `02-siocal-padron.jpg` | Padrón público de operadores inscriptos |
| `03-arca-clave-fiscal.jpg` | Acceso con Clave Fiscal de ARCA |
| `04-colegio-martilleros-requisitos.jpg` | Requisitos de colegiación de un colegio departamental |

**Pendiente:** SENASA (`senasa.gob.ar`) y Trámites a Distancia (`tramitesadistancia.gob.ar`)
quedaron sin captura porque la extensión de Chrome tiene esos dominios bloqueados. Habilitando
esos sitios en la extensión se capturan y se agregan a los capítulos 8 y 6.

## Fuente de la normativa

El texto completo del Anexo I de la Res. SAGyP 50/2025 (SIOCAL) está extraído en
`docs/guia-apertura/research/res-sagyp-50-2025-anexo1-siocal.txt`. Es la fuente de los
puntos citados en el capítulo 6 — **el RUCA ya no rige para ganados y carnes**, y casi todo
el material que circula todavía explica el sistema viejo. Ese desfasaje es buena parte de
lo que justifica el precio de la guía.
