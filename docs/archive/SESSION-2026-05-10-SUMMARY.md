# Sesión 2026-05-10 — Síntesis operativa

> Documento de transferencia entre sesiones. Si retomás el proyecto en sesión nueva, leé esto primero.

**Fecha**: 9-10 de mayo de 2026 (sesión larga, 2 días naturales)
**Resultado central**: **El Oráculo se constituye como núcleo de valor + filtro de decisión de consignatarias.com.ar**
**Status producción**: live en https://www.consignatarias.com.ar/el-oraculo

---

## I. Lo que cambió este 9-10 de mayo

### Antes de la sesión
- consignatarias.com.ar era directorio + INMAG live + El Corredor (mensual lead magnet)
- Tracción orgánica de ~600 MAU, sin revenue
- Bibliografía descargada pero no digerida
- Brand manual + visual system completos
- Sin posicionamiento estratégico claro más allá de "Bloomberg del agro"

### Después de la sesión
- **El Oráculo** como producto + posición estratégica + filtro de decisión operativo
- 14 briefs de productos identificados, top 3 priorizados (Oráculo, Comisión, Ciclo)
- 9 PDFs canónicos digeridos por agents (5 + 7 nuevos)
- Reframe **ALyC del mercado bovino** introducido como ancla conceptual
- Pipeline de 12 meses estructurada (1 producto cada 30-45 días)
- 25 decisiones del backlog evaluadas como jurisprudencia inicial
- Stack: consignatarias.com.ar (infomercado) + miganado.com.ar (subyacente RWA) + futuro ALyC ganadero formal

---

## II. Artefactos producidos (en orden de criticidad)

### Documentos de marca y estrategia
| Archivo | Función | Estado |
|---|---|---|
| `docs/EL-ORACULO-MANIFIESTO.md` | El documento maestro · 904 líneas · 15 secciones · 149 citas | ✅ producido |
| `docs/EL-ORACULO-FRAMEWORK.md` | Filtro de decisión · 25 decisiones evaluadas · 6 preguntas operativas | ✅ producido |
| `docs/BRAND-MANUAL.md` | Actualizado con flagship + ALyC reframe + correcciones FCV-UBA + Diez 2020 | ✅ actualizado |
| `docs/BRAND-VISUAL-SYSTEM.md` | Sistema visual para producción de comercial / video / Figma | ✅ creado en sesión previa |
| `docs/EL-ORACULO-LAUNCH-COPY.md` | Twitter / LinkedIn / email warm drafts | ✅ producido |
| `docs/EL-CORREDOR-LAUNCH-COPY.md` | Drafts para El Corredor | ✅ producido |
| `docs/SESSION-2026-05-10-SUMMARY.md` | Este documento | ← acá |

### Production pipeline
| Archivo | Función |
|---|---|
| `scripts/el-oraculo/template.html` | A4 dark+mono+sky, secciones romanas, bibliografía page |
| `scripts/el-oraculo/render.py` | Markdown manifiesto → HTML → PDF (chrome headless) |
| `scripts/el-oraculo/product_image.py` | OG 1200x630 · square 1080x1080 · portrait 768x1024 |
| `scripts/el-oraculo/data-pack.json` | 1457 leaf values, 19 campos top-level, 12 métricas computadas |
| `scripts/el-oraculo/build-data-pack.py` | Generador reproducible del data pack |
| `scripts/monthly-report/render.py` | Pipeline de El Corredor (mensual) — sigue corriendo |
| `scripts/monthly-report/publish.py` | Cron mensual de El Corredor (1° de mes 17 UTC) |

### Web surface activo
- `/` — landing con bloque El Oráculo arriba + El Corredor abajo
- `/el-oraculo` — landing manifiesto · CTA descarga PDF directa (sin email)
- `/el-corredor` — landing lead magnet · CTA email para PDF mensual
- `/mercado/inmag` — INMAG live · callout sticky a El Oráculo + CTA El Corredor

### Assets servidos
| Asset | Tamaño |
|---|---|
| `public/el-oraculo/manifiesto.pdf` | 345 KB · 17 páginas |
| `public/el-oraculo/og.png` | 101 KB · 1200×630 |
| `public/el-oraculo/square.png` | 138 KB · 1080×1080 |
| `public/el-oraculo/portrait.png` | 88 KB · 768×1024 |
| `public/el-corredor/abril-2026.pdf` | 503 KB · 12 páginas |
| `public/el-corredor/cover-abril-2026.png` | 113 KB |
| `public/el-corredor/og-abril-2026.png` | 91 KB |
| `public/el-corredor/square-abril-2026.png` | 177 KB |
| `public/el-corredor/manifest.json` | manifest del lead magnet mensual |

---

## III. Reframe estratégico — el insight central

**La consignataria argentina es funcionalmente una ALyC** (Agente de Liquidación y Compensación) del mercado bovino:

| Mercado financiero | Mercado bovino |
|---|---|
| ALyC (broker + dealer + clearing + custodia + garantía) | Consignataria / corredor de hacienda |
| BYMA | MAG-Cañuelas (ex-Liniers) |
| Caja de Valores | Corral + sanitario |
| Fondo Garantía Bursátil | Fondo garantía 1% (FCV-UBA p.11) |
| CNV Resolución 731/18 | (vacío post-disolución ONCCA 2014) |

**Implicancias**:
1. consignatarias.com.ar = **infomercado** (path Bloomberg/Reuters)
2. miganado.com.ar = **subyacente tokenizado** (Decreto 640/2024 CD+W)
3. **ALyC ganadera formal** = la vacante histórica todavía no ocupada · target 24-36 meses
4. Audiencia VC/fintech entiende el sector sin necesidad de contexto agro

---

## IV. Bibliografía consolidada (al cierre)

### Descargada y leída (deep-read insights en `~/Documents/consignatarias-research/insights/`)
| Autor / año | Título corto | Path local |
|---|---|---|
| FCV-UBA · Gil/Fornieles/Demarco 2018 | Comercialización de Hacienda Vacuna | `02-inta-academia/fauba-...-2018.pdf` |
| CACG · Iriarte 2008 | Comercialización de Ganados y Carnes | `02-inta-academia/iriarte-2008-...pdf` |
| UNS · Diez 2020 | Costos de transacción SOB | `02-inta-academia/diez-2017-...pdf` (filename pendiente fix a 2020) |
| UNS-CEA · Santi & Scoponi 2018 | MEGANAR (caso Bahía Blanca 2011-2017) | `02-inta-academia/santi-scoponi-2018-...pdf` |
| UNS · Santi 2017 | MEGANAR desarrollo regional (preliminar) | `02-inta-academia/santi-2017-...pdf` |

### Descargada en esta sesión, pendiente deep-read
- Scoponi/Dias/Piñeiro 2021 (UNLP)
- Iglesias & Ghezan 2010 (INTA Cadena Carne)
- Ponti 2011 (MAGyP)
- Otaño 2005 (SAGPyA)
- Pérez 2024 (UNNE)
- Piccinini & Sereno 2014 (parcial, solo galley)
- CNDC 2017 (con tablas OCR pendiente)

### Pendiente sourcing (no descargable open access)
- Bailey, Brorsen & Fawson 1993 (paywall) → sustituto sugerido: McAfee & McMillan 1987
- Santangelo & García de la Torre 2004 (Seminario Hereford)
- Vaccarezza 2006 (SAGyP archivo)
- Bordelois & Ferreccio 1978 (AACREA biblioteca)

---

## V. Correcciones bibliográficas aplicadas

Dos correcciones surgieron de los deep-reads y se propagaron por todo el stack:

1. **FAUBA → FCV-UBA** (Facultad de Ciencias Veterinarias, no Agronomía) · autores correctos: Gil, Fornieles & Demarco (no Gil/Demarco/Fornieles)
2. **Diez 2017 → Diez 2020** · scope = Sudoeste Bonaerense (no nacional) · datos canónicos: premium Liniers-SOB +8,6% (27/05/2020)

Aplicado a: BRAND-MANUAL, BRAND-VISUAL-SYSTEM, EL-CORREDOR-LAUNCH-COPY, template.html del Corredor, render.py del Corredor, landing /el-corredor, El Corredor PDF v6 re-renderizado.

---

## VI. Top 3 productos a shippear (post-Oráculo)

### #1 La Comisión — calculadora viral
> Tesis: vender la misma vaca en SOB cuesta 3,16% del bruto en directa, 7,87% por consignatario, 8,87% por internet, 10,77% por feria (Diez 2020 Tablas 4-7).

- Calculadora interactiva: "¿cuánto te queda neto?"
- Lead magnet de altísima conversión (SEO viral)
- Effort: 2-3 semanas
- Monetización: free calculadora + paywall ranking + sub anual

### #2 El Ciclo — primer producto de suscripción
> Tesis: T/N (ternero/novillo) como leading indicator del ciclo ganadero. Ningún competidor lo publica como dashboard.

- Dashboard live + paywall serie histórica + alertas
- Effort: 3-4 semanas (requiere scraper INMAG con descomposición por categoría — verificar)
- Monetización: free dashboard + sub USD 5-15/mes

### #3 El Canal Fantasma — manifesto del 78% privado
> Tesis: 54,6% del volumen bovino opera por venta directa sin intervención (Iriarte/ONCCA 2007); es el dark pool de la commodity argentina.

- Lead magnet + paywall metodología
- Audiencia VC/fintech/reguladores
- Effort: 3-4 semanas

(Briefs completos en `~/Documents/consignatarias-research/insights/01-matrix-and-briefs.md` § B y § C)

---

## VII. Decisiones canónicas evaluadas (filtro del Oráculo)

Ver `docs/EL-ORACULO-FRAMEWORK.md` § IV para las 25 evaluadas. Highlights:

| Decisión | Veredicto | Razón |
|---|---|---|
| Producir El Corredor mensual | ✅ procede | Archivo, anclaje, autoridad |
| 10 productos sobre mismo dataset | ❌ rechazar | Reciclaje, no anclaje |
| 14 briefs research-driven | ✅ procede | Cada uno con anclaje propio |
| El Oráculo como flagship | ✅ procede primero | Funda autoridad |
| Acta de Cierre (feature consignatarias) | ❌ aplazar | Consignatarias no usan |
| Partnership con Doublespeed (a16z) | ❌ rechazar | 2 breaches públicas |
| Granos pivot ahora | ❌ rechazar | Cattle no establecido aún |
| Sponsorship banco rural | ✅ procede | Ingreso defendible si cumple voz |
| Series A ahora | ⏸ aplazar | Sin PMF ni autoridad institucional aún |
| Migración Vercel → infra propia | ❌ rechazar | Capex sin valor agregado |

---

## VIII. Vacíos honestos al cierre de la sesión

**Bibliográficos**:
- 4 PDFs descargados sin deep-read aún (Scoponi 2021, Iglesias-Ghezan, Ponti, Otaño)
- CNDC 2017 con tablas en imagen requiere OCR
- 4 fuentes inaccesibles open-access

**De data**:
- INMAG en USD pre-2017 (limitación del scraper, comienza 2024-01)
- Ratio T/N (MAG no remata terneros — necesita otra fuente)
- Share hembras en faena (serie 40.3 no desagrega por sexo)
- Padrón consignatarias actualizado (no público desde 2008)
- Volumen agregado MEGANAR

**De producto**:
- Cron mensual de El Oráculo (es manifiesto, revisión cada 6 meses — no urgente)
- Email automatizado de El Corredor: pendiente setear `EL_CORREDOR_BLAST_TOKEN` en GitHub secrets + Vercel env
- Resend `RESEND_API_KEY` en Vercel: verificar que esté seteada

**De mercado**:
- 78% privado sin observable price universe → problema de mercado, no de research
- Sin conversaciones warm con CNV / MAGyP / ALyC partners potenciales
- miganado.com.ar status real con Ricardo Ferrari pendiente sync

---

## IX. Próximas sesiones — qué hacer primero

### Sesión próxima (corta, 1-2 hs)
- Verificar deploy de El Oráculo en producción
- Quality check del PDF visual (17 páginas, content válido, bibliografía correcta)
- Verificar lint + build sin errores
- Coordinar con José los 3 inputs pendientes:
  1. status miganado.com.ar / Ferrari
  2. capital disponible Memola para Path A vs Path B
  3. contactos warm en CNV/ALyC

### Sesión media (medio día, 4-6 hs)
- Start La Comisión: calculadora interactiva con Diez Tablas 4-7
- Deep-read de los 4 PDFs descargados pendientes (Scoponi 2021, Iglesias-Ghezan, Ponti, Otaño)
- Triangulación final del 71% / 78% con fuentes oficiales

### Sesión larga (día completo, 6-8 hs)
- Producir El Stack Faltante (brief #16) — paper público + memo privado fundraising-grade
- Outreach inicial a 3-5 ALyC partners (Allaria, Adcap, Cohen, Galileo, PPI)
- Documentar conversación con CNV (si hay) para el memo

### Decisiones explícitas que necesitan input del founder
1. **Path A vs Path B vs Path C** (infomercado autofinanciado / JV con ALyC / ALyC propia)
2. **Launch público de El Oráculo** — ya está armado, falta el "go" del founder
3. **Cadencia editorial post-Corredor** — ¿el manifiesto es one-shot anual, semestral, o vive como "documento vivo"?
4. **Cómo se firma El Oráculo** — actualmente "Mesa de mercado · consignatarias.com" colectivo · ¿queremos firma con nombre real para autoridad?

---

## X. Métricas a observar (post-sesión)

| KPI | Target Day 7 | Target Day 30 |
|---|---|---|
| Descargas manifiesto.pdf | 200 | 1.000 |
| Visitantes únicos `/el-oraculo` | 800 | 3.000 |
| Conversión Oráculo → Corredor | 12% | 18% |
| Emails capturados El Corredor | 60 | 225 |
| Replies de academia citada | 1-2 | 3-5 |
| Citas en prensa especializada | 0 | 1-2 |

Si conversión Oráculo→Corredor < 8% en day 30 → el flow CTA del manifiesto al lead magnet necesita revisión.
Si descargas PDF > 2.000 en day 30 → el reframe ALyC está pegando, considerar acelerar brief #5 El MEGANAR + #9 El Garante (los más conectados al reframe).

---

## XI. Notas finales

**Lo que funcionó esta sesión**:
- Equipo de agents en paralelo (1 inventory + 4 deep-reads + downloads + cross-ref synthesizer + 3 manifiesto/framework/data-pack = 10 agents en total)
- Reglas-de-marca aplicadas estrictamente (cero épica, todo citado)
- Honestidad metodológica visible (correcciones FAUBA→FCV-UBA, Diez 2017→2020)
- Reframe ALyC emergiendo del cross-ref (no de market research)
- Compounding orgánico de artefactos durables (cada doc se referencia con los demás)

**Lo que costó más de lo esperado**:
- Push/rebase loop con commits paralelos del bot (varios rebases manuales)
- Falsos positivos del validador Vercel (workflow vs deployments-cicd)
- Convertir 6 deep-reads en briefs accionables sin perder rigor

**Lo que no tocamos pero queda en la mochila**:
- Faena de remitentes históricos (endpoint MAG no permite scraping retroactivo masivo)
- Branches preexistentes del usuario en el repo (12+ files con WIP de SEO de abril)

---

*Esta es la transferencia operativa de la sesión 2026-05-10. Si volvés en un mes, leer este doc + `docs/EL-ORACULO-FRAMEWORK.md` te recupera el contexto en 15-20 minutos.*

*Cierre · Mesa de mercado · 2026-05-10 21:15 ART*
