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

> No hay ningún service account en el proyecto (se verificó en Vercel). El camino
> más simple es reusar el **token OAuth** que ya funciona, y **publicar la app OAuth**
> para que deje de caducar. (Alternativa con SA más abajo.)

**1. Publicar la app OAuth (quita la caducidad de 7 días)**
[Google Cloud Console](https://console.cloud.google.com/apis/credentials/consent) →
proyecto de la app (client id `64872477839-…`) → **OAuth consent screen** →
**Publishing status: Publish app** (de "Testing" a "In production"). Con eso el
refresh token de `oauth-token.json` no vuelve a expirar.
→ Después corré `node scripts/gsc-auth.mjs` una vez más para tener un token fresco.

**2. Secrets del repo** (GitHub → Settings → Secrets and variables → Actions):
| Secret | De dónde sale |
|---|---|
| `GSC_OAUTH_CREDENTIALS` | contenido de `scripts/archive/oauth-credentials.json` |
| `GSC_OAUTH_TOKEN` | contenido de `scripts/archive/oauth-token.json` (tras publicar + re-auth) |
| `RESEND_API_KEY` | el mismo de Vercel (Settings → Env → copiar) |
| `RESEND_FROM_EMAIL` | opcional (default `noreply@consignatarias.com`) |
| `GSC_REPORT_TO` | tu email (default `jose.barnetche19@gmail.com`) |
| `GA4_PROPERTY_ID` + `GA4_SA_KEY` | opcionales — solo si querés la sección GA4 (requiere crear un SA, ver abajo) |

Con eso `gsc-weekly-report` corre los lunes y `sitemap-resubmit` en cada deploy.

## Alternativa durable: service account
Más robusto pero más setup. En Google Cloud Console: crear un service account, habilitar
"Search Console API" + "Analytics Data API", descargar el JSON key. Su `client_email`
(`…@….iam.gserviceaccount.com`) se agrega como usuario en GSC (**Completo**, para el
re-submit) y en GA4 (Viewer). El JSON va al secret `GSC_SA_KEY` (y `GA4_SA_KEY` para GA4).
No caduca nunca. Los scripts prefieren SA si está; si no, usan el token OAuth.
