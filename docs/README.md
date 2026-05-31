# docs/ — índice

Documentación de **consignatarias.com.ar**, la infraestructura de inteligencia del mercado
ganadero argentino. Punto de partida: el [README](../README.md) (producto) y el
[CHANGELOG](../CHANGELOG.md) (historia de releases).

---

## 🎯 Estrategia y posicionamiento
| Doc | Qué |
|---|---|
| [strategy/POSITIONING-THESIS.md](strategy/POSITIONING-THESIS.md) | Tesis de posicionamiento: "el precio de referencia del ganado argentino", fundada en la innovación global del nicho (CEPEA, USDA, MLA/AuctionsPlus). 3 pilares + roadmap. |
| [strategy/CITATION-AUDIT.md](strategy/CITATION-AUDIT.md) | GEO citation audit: dónde el sitio posee el answer-space de las AI engines vs los gaps. |
| [strategy/SEO-OPPORTUNITIES.md](strategy/SEO-OPPORTUNITIES.md) | Oportunidades de SEO programático (templates geo×categoría, históricas, malla interna). |
| [EL-ORACULO-FRAMEWORK.md](EL-ORACULO-FRAMEWORK.md) | Framework de decisión de El Oráculo (filtro de 6 preguntas, jurisprudencia interna). |
| [EL-ORACULO-MANIFIESTO.md](EL-ORACULO-MANIFIESTO.md) | Manifiesto fundacional (fuente de la página `/el-oraculo`). |

## ⚙️ Ingeniería y operación
| Doc | Qué |
|---|---|
| [TECHNICAL.md](TECHNICAL.md) | Referencia técnica / arquitectura: pipeline de datos, SSG, tablas, API. |
| [RUNBOOK.md](RUNBOOK.md) | Operación: secrets, inventario de crons, pipeline de email, observabilidad (`/admin/ops`), playbooks de incidente. |
| [VERSIONING.md](VERSIONING.md) | Política de versionado (SemVer; el contrato de la API Enterprise es el boundary). |
| [`../.env.example`](../.env.example) | Todas las variables de entorno / secrets, documentadas. |
| [decisions/](decisions/) | Registro de decisiones (ADR-style). |

## 📊 Metodología de datos
| Doc | Qué |
|---|---|
| [METODOLOGIA-INDICE-CONSIGNATARIAS.md](METODOLOGIA-INDICE-CONSIGNATARIAS.md) | Metodología de la familia de índices (cómo se calculan, fuentes, ponderaciones). Respaldo público de `/indices` y `/metodologia`. |

## 🎨 Marca y editorial
| Doc | Qué |
|---|---|
| [BRAND-MANUAL.md](BRAND-MANUAL.md) | Manual de marca. |
| [BRAND-VISUAL-SYSTEM.md](BRAND-VISUAL-SYSTEM.md) | Sistema visual. |

## 🗄️ Archivo
[archive/](archive/) — audits fechados, launch copy, handoffs y planes ya ejecutados o superados.
Se conservan por trazabilidad; no son la fuente de verdad actual.

---

## Convenciones
- **Evergreen** (estrategia, técnica, runbook, metodología, marca) vive en `docs/`.
- **Fechado / de sesión / superado** se mueve a `docs/archive/`.
- Cada cambio relevante de producto se registra en el [CHANGELOG](../CHANGELOG.md) y, según
  [VERSIONING.md](VERSIONING.md), puede taguearse como release.
