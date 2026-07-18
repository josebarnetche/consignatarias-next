# Reportes SEO / Tráfico (Search Console + GA4)

Automatización de monitoreo. Dos piezas, ambas en `.github/workflows/`:

| Workflow | Cuándo | Qué hace |
|---|---|---|
| `sitemap-resubmit.yml` | en cada push a `main` (tras ~4 min de deploy) | re-submite el sitemap a GSC (fuerza re-fetch de la versión nueva) |
| `gsc-weekly-report.yml` | lunes 10:00 ART | genera `reports/gsc/YYYY-Www.{md,json}`, los commitea, y **emailea el resumen** |

Los reportes quedan versionados acá (`YYYY-Www.md` por semana + `latest.md`). Corré manual con:

```bash
node scripts/gsc-report.mjs            # genera + guarda + emailea
node scripts/gsc-report.mjs --no-email # solo genera + guarda
node scripts/gsc-submit-sitemap.mjs    # re-submite el sitemap
```

## Setup (una vez) — para que corra durable en CI

La automatización usa un **service account** (no el token OAuth, que caduca a los 7 días
en apps "testing"). El SA de GA4 ya existe; hay que **darle acceso a GSC** y **subir los
secrets a GitHub**.

**1. Dar acceso del service account a GSC**
En [Search Console](https://search.google.com/search-console) → propiedad
`consignatarias.com.ar` → **Configuración → Usuarios y permisos → Agregar usuario**:
- Pegá el `client_email` del service account de GA4 (está en el JSON `GA4_SA_KEY`).
- Permiso: **Completo** (necesario para `sitemaps.submit`; para solo el reporte alcanza "Restringido").

**2. Secrets del repo** (GitHub → Settings → Secrets and variables → Actions):
| Secret | Valor |
|---|---|
| `GA4_SA_KEY` | el JSON del service account (o el mismo `GSC_SA_KEY`) |
| `GA4_PROPERTY_ID` | property id numérico de GA4 (ej. `123456789`) |
| `RESEND_API_KEY` | key de Resend (mismo del resto del sitio) |
| `RESEND_FROM_EMAIL` | opcional (default `noreply@consignatarias.com`) |
| `GSC_REPORT_TO` | destinatario(s) del email, coma-separados (default `jose.barnetche19@gmail.com`) |

Ya con eso, `gsc-weekly-report` corre solo los lunes y `sitemap-resubmit` en cada deploy.

## Alternativa: token OAuth (no durable)
Si no querés service account, los scripts caen al token OAuth
(`scripts/archive/oauth-token.json`, renovable con `node scripts/gsc-auth.mjs`), pero
**caduca cada ~7 días** salvo que publiques la app OAuth a "Producción" en Google Cloud
Console. Para CI, el service account es lo recomendado.
