# GEO Citation Audit — consignatarias.com.ar
**Fecha:** 2026-05-30 · **Fase 0 del proyecto GEO** (Generative Engine Optimization)

## Qué es esto y qué NO es

Objetivo: medir, para el universo de preguntas del mercado ganadero argentino, **quién posee hoy el answer-space** (las fuentes de donde ChatGPT / Perplexity / Gemini-AI Overviews / Claude sintetizan y citan) y **dónde está parado consignatarias.com.ar**.

**Limitación honesta de método:** este audit es *web-grounded* (vía búsqueda web, que es exactamente el corpus que las AI engines indexan y citan), **no un probing en vivo** de cada engine (no hay API keys en este entorno). El probing en vivo se corre después, manualmente o vía API, con el universo de queries de abajo. La señal del answer-space web es un proxy fuerte y accionable: si no estás en el top del answer-space web, no te citan las engines.

---

## Universo de queries (backbone del audit)

8 clusters, ~40 queries representativas. Marcá con ✅/⚠️/❌ la posición del sitio.

| # | Cluster | Queries representativas |
|---|---------|------------------------|
| 1 | Precio kilo vivo / hacienda en pie hoy | "cuánto vale el novillo hoy", "precio kilo vivo novillo", "precio hacienda en pie hoy" |
| 2 | INMAG / índice (definición + valor) | "qué es el INMAG", "INMAG hoy", "índice novillo mercado agroganadero" |
| 3 | Precio Liniers / Cañuelas hoy | "precio mercado de Cañuelas hoy", "cotización Liniers hoy", "precio Liniers" |
| 4 | Remates de hacienda | "calendario remates ganaderos", "próximos remates de hacienda [provincia]", "remates en vivo hacienda" |
| 5 | Consignatarias (entidad + elección) | "consignataria de hacienda", "mejores consignatarias", "cómo elegir consignataria" |
| 6 | Frigoríficos / SENASA | "frigoríficos habilitados SENASA", "listado frigoríficos Argentina por provincia" |
| 7 | Novillo en dólares / análisis | "precio novillo en dólares", "ganado en dólares máximo histórico" |
| 8 | Arrendamiento / valuación | "cuánto cuesta arrendar campo ganadero", "índice novillo arrendamiento" |

---

## Resultados del answer-space (2026-05-30)

| Cluster | Posición del sitio | Quién posee el answer-space | Veredicto GEO |
|---------|-------------------|------------------------------|---------------|
| **2. INMAG (definición+valor)** | **#2 y #3** (página INMAG + /mercado) | Alphacast, MAG oficial, La Nación | ✅ **DOMINA** — la IA usa la definición del sitio casi textual |
| **6. Frigoríficos SENASA** | **#3** (directorio 364) | Registro oficial SENASA, MAGYP | ✅ **GANA** — único directorio citable; solo detrás de la fuente oficial |
| **1. Kilo vivo hoy** | **#4** (página INMAG) | deCampoaCampo, Agrofy, El Rural, MAGYP | ✅ **Citado**, fuerte |
| **8. Arrendamiento** | Presente (página dedicada) | — (nicho poco disputado) | ✅ **Oportunidad de dominar** (poca competencia) |
| **4. Remates** | **#6** (/remates/mes) | ClicRural, consignatarias individuales (Mondino, D'Apice, Lehmann), CACG, CCPP | ⚠️ **Presente, no dominante** — espacio fragmentado |
| **7. Novillo en dólares** | **#5** (/mercado) | **Valor Carne, Bichos de Campo, La Nación campo, Infocampo, decamponoticias** | ⚠️ **Presente** — la narrativa la ganan los medios |
| **5. Consignataria (entidad)** | **#10** (directorio 80) | **Rosgan, CACG, CCDH** (gremiales), Expoagro, MAG | ⚠️ **Débil** pese a ser su entidad-marca; + gap "cómo elegir" |
| **3. Precio Cañuelas/Liniers hoy** | **ausente** | deCampoaCampo, El Rural, Agrofy, MAG oficial, datos.gob.ar, La Nación | ❌ **GAP** — no aparece |

---

## Mapa competitivo (por tipo de answer-space)

- **Data / precios diarios:** deCampoaCampo, Agrofy News, El Rural, Alphacast, datos.gob.ar, mercadoagroganadero.com.ar (la fuente).
- **Editorial / análisis / narrativa:** Valor Carne, Bichos de Campo, La Nación (campo), Infocampo, decamponoticias.
- **Remates:** ClicRural, consignatarias individuales, CACG, CCPP, Agrofy.
- **Consignatarias (entidad/gremial):** Rosgan, CACG, CCDH.
- **Oficial / autoridad de origen:** SENASA, MAGYP, Mercado Agroganadero.

---

## Lecturas estratégicas

1. **El moat ya existe y ya se cita: data + definición + directorio.** En INMAG, frigoríficos y kilo-vivo-hoy el sitio ya es fuente citada. El fortalecimiento acá es **defensivo/lock-in**: marcar esas entidades como citables (`DefinedTerm`, identificador oficial) para clavar la cita. ROI alto, riesgo bajo.

2. **Gap de terminología "Liniers/Cañuelas" (❌→✅ fácil y de alto valor).** El sitio habla "INMAG"; el usuario y la IA dicen "precio Liniers/Cañuelas hoy". El sitio YA sabe que Cañuelas = INMAG (lo dice en su FAQ) — solo falta **contenido answer-first que ataque la frase exacta** "precio Cañuelas/Liniers hoy" y la puentee al INMAG. Es la brecha más barata de cerrar con mayor upside.

3. **La narrativa en dólares la ganan los medios — no pelear esa.** Valor Carne / Bichos de Campo / La Nación poseen el ángulo editorial ("máximo histórico en dólares"). No se les gana publicando op-eds. **Se les gana siendo la data que ELLOS (y la IA) citan**: máxima citabilidad de la serie INMAG-USD (que ya tenemos, recién mejorada). Ser la fuente, no el comentarista.

4. **"Cómo elegir consignataria" = gap de contenido sin dueño.** La IA explícitamente dijo que *no hay guía de cómo elegir*. El sitio (que se llama consignatarias.com.ar) **debería poseer** esa pregunta. Página answer-first + entidad. Convierte su debilidad (#10 en su propia categoría) en fortaleza.

5. **Remates: contestado en la cabeza, ganable en la cola.** El head term está fragmentado; el sitio puede ganar el long-tail "remates [provincia] [mes/tipo]" con mejor markup de entidad (Event schema ya existe) + freshness. No invertir en el head term todavía.

---

## Acciones priorizadas → alimentan Fase 1 (fortalecimiento)

Orden por (impacto × facilidad):

| P | Acción | Cluster que ataca | Tipo |
|---|--------|-------------------|------|
| **P0** | Página/answer-first "Precio Mercado de Cañuelas / Liniers hoy" → puentea a INMAG (capturar la frase exacta) | 3 (gap) | Contenido |
| **P0** | `DefinedTerm` schema en los 39 términos del glosario + INMAG como entidad citable con identificador MAG | 2, 1 | Schema/lock-in |
| **P1** | Markup de autor + fuente (`citation`/`isBasedOn`) en El Corredor y El Oráculo + schema de artículo | 2, 7 | Schema/autoridad |
| **P1** | Guía answer-first "Cómo elegir consignataria de hacienda" + entidad | 5 (gap) | Contenido |
| **P1** | `llms-full.txt` (dump completo citable) + extender `dateModified` a todo lo diario | todos | Técnico |
| **P2** | Maximizar citabilidad de la serie INMAG-USD (Dataset schema + endpoint citable) para ser la fuente de los medios | 7 | Schema/data |
| **P2** | Event schema + freshness en remates por provincia/mes (ganar el long-tail) | 4 | Schema |

## Loop de medición (Fase 3)
Re-correr este audit (mismo universo de queries) mensual. KPI: # de clusters donde el sitio pasa de ⚠️/❌ a ✅, y aparición en respuestas de engines (probing en vivo). Baseline hoy: **3 ✅ / 3 ⚠️ / 1 ❌ / 1 oportunidad**.
