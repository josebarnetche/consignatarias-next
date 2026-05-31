# Versioning policy

consignatarias.com.ar usa [SemVer](https://semver.org/) — `MAJOR.MINOR.PATCH`. La versión vive
en `package.json`; la historia legible en [`CHANGELOG.md`](../CHANGELOG.md); cada release se
taguea en git como `vX.Y.Z`.

## El boundary de estabilidad es el contrato de la API Enterprise

La regla que decide `MAJOR` no es "el producto cambió mucho", sino **se rompió un contrato
publicado**. El contrato es, ante todo, la **API Enterprise** (`/api/precios`, `/api/lots`,
auth `cnsg_live_*` Bearer, formas de respuesta, cupos) y los **campos de datos públicos** que
terceros podrían estar consumiendo.

| Bump | Cuándo | Ejemplos |
|---|---|---|
| **MAJOR** (`x.0.0`) | Ruptura de un contrato publicado | quitar/renombrar un endpoint o campo de respuesta de la API; cambiar el esquema de auth; romper la forma de un dataset que terceros citan |
| **MINOR** (`1.x.0`) | Nueva superficie/feature, compatible hacia atrás | nueva página/índice, nuevo cron, **adiciones** a la API (campos/endpoints nuevos), nueva capa operativa |
| **PATCH** (`1.x.y`) | Fixes y cambios sin efecto en el usuario | bugfix, copy, SEO, docs, observabilidad, refactors internos |

**Hoy estamos en `1.x` y seguimos ahí.** El salto a `2.0.0` se reserva para la **primera ruptura
del contrato de la API/datos** — no para hitos de producto o reposicionamiento. (El reposicionamiento
"agregador → infraestructura de inteligencia" se comunica en el CHANGELOG y la estrategia, no con un
major: no rompió ninguna API.)

## Lo que NO se versiona

- **Actualización de datos diaria** (valores del INMAG, nuevos remates, scrapes). Eso es *data*,
  no *contrato* — cambia todos los días sin tocar la versión. Los commits `data: …` no bumpean.
- Contenido editorial (El Corredor mensual, posts).

## Proceso de release

1. Cambios mergeados a `main` → Vercel deploya.
2. Para un release con nombre: bump en `package.json` + entrada en `CHANGELOG.md` (con fecha y
   resumen orientado a evolución de plataforma).
3. Taguear el commit del release:
   ```bash
   git tag -a v1.29.0 -m "v1.29.0 — <título>"
   git push origin v1.29.0
   ```
4. El tag apunta al commit deployado. El CHANGELOG es la fuente legible; los tags dan trazabilidad
   git ↔ versión.

> El tagging arranca en **v1.29.0** (mayo 2026). Las versiones previas viven en el CHANGELOG; no se
> taguean retroactivamente.
