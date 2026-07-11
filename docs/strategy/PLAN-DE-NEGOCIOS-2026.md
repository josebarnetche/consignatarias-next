# PLAN DE NEGOCIOS — consignatarias.com.ar (2026–2029)

**Fecha:** 2026-07-11 · **Propietario:** Memola Medios SAS · **Estado:** documento de decisión (board-level).
**Construye sobre y agudiza:** `POSITIONING-THESIS.md`, `EL-ORACULO-FRAMEWORK.md`, `ROADMAP.md`. No los contradice.
**Método:** equipo interdisciplinario (agronegocios, economía ganadera, comercialización, plataformas B2B, comportamiento del productor, finanzas de startups de información, datos/SaaS agro). Toda cifra sectorial lleva fuente, fecha y advertencia. Se distingue **hecho / inferencia / supuesto**.

> **Advertencia transversal.** La investigación primaria confirmó tres vacíos de datos que condicionan todo el plan y que hay que cerrar antes de comprometer capital grande: (1) **no existe un share de canales de comercialización oficial posterior a 2010**; (2) **no hay padrón público del número de consignatarias del país** (el universo real es el registro SIOCAL, ex-RUCA, no publicado); (3) **no hay dato del % de superficie *ganadera* bajo arrendamiento** (el 70% conocido es agrícola). Donde no hay fuente, se dice.

---

## 1. Resumen ejecutivo

consignatarias.com.ar hoy es un sitio de información ganadera con buena tracción SEO/GEO (≈5.000 sesiones/mes, ~890 clics orgánicos/semana en jul-2026, el índice INMAG ya citado por motores de IA) y una arquitectura de producto amplia: directorio de 104 consignatarias, calendario de ~380 remates, índice INMAG (serie diaria 2015→hoy en ARS y USD), hub de arrendamiento (que hoy concentra el **44% de todos los clics del sitio**), frigoríficos (1.102), calculadoras, API y servidor MCP.

**El hallazgo central del análisis es que el negocio NO está en las consignatarias como cliente ni en el productor como pagador, sino en la capa de datos.** El productor no paga (decisión ya tomada y correcta: el precio spot está commoditizado y gratis en el MAG y Agrofy). El universo de consignatarias es demasiado chico y de baja frecuencia para sostener un SaaS o un directorio premium como negocio principal. La demanda con presupuesto real es **institucional y de datos**: quien construye modelos de precio/riesgo, quien necesita una referencia verificable del valor del ganado, y —cada vez más— los agentes de IA que necesitan una fuente estructurada y citable.

**Recomendación inequívoca (desarrollada en §20):** consignatarias.com.ar debe convertirse en **la capa de datos e índice de referencia del mercado ganadero argentino** —"el precio de referencia del ganado argentino"— monetizada B2B/institucional (acceso a datos vía API + patrocinio de índices y reportes), sobre una capa pública gratuita que captura al productor y a los motores de IA como **distribución y autoridad**, no como fuente de ingresos. NO debe ser marketplace de hacienda, NO debe ser un SaaS de gestión para consignatarias, NO debe ser una terminal paga para el productor, NO debe ser un comparador con ranking (que las consignatarias percibirían como amenaza y bloquearían).

**El primer producto pago de los próximos 90 días** no es el más "estratégico" sino el más rápido en validar que la audiencia/dato tiene valor comercial: **patrocinio del índice de arrendamiento + reporte El Corredor** por un anunciante sectorial (laboratorio, nutrición, genética, banco o aseguradora), en paralelo con la conversión de un puñado de **PRO Consignataria** (ARS 45.000/mes, ya existente) para caja recurrente, y **un cliente API "design-partner" pago** para validar la disposición a pagar institucional. La hipótesis que puede matar el negocio es que **ninguna institución pague de forma significativa por el dato** y que el B2B de consignatarias sea demasiado chico: eso convertiría al proyecto en un buen medio sin pagador. Ese es el test de los próximos 90 días.

**Techo realista.** Este es un **negocio de información sectorial de alto margen y nicho**, no un cohete venture-scale. El SOM a 3 años en Argentina se estima en el orden de **USD 300k–800k de ARR** (escenario base, §15), dominado por datos institucionales + patrocinio + una línea modesta de PRO Consignataria. La optionalidad de escala (otras especies, otros países, ser LA fuente citada por IA) es real pero secundaria y solo se persigue con PMF argentino demostrado.

---

## 2. Diagnóstico del negocio actual

**Qué existe y qué valor comercial tiene realmente** (evaluado por frecuencia de uso, importancia de la decisión, disposición a pagar, costo operativo y diferenciabilidad):

| Producto | Frecuencia | Decisión que resuelve | WTP | Costo op. | Diferenciable | Veredicto |
|---|---|---|---|---|---|---|
| **Índice INMAG (serie 2015→, ARS+USD)** | Alta | Referencia de precio | Media-Alta (institucional) | Bajo | **Sí (histórico + USD)** | **★ CORE — el activo** |
| **Hub arrendamiento (índice haciinfo000013 normalizado)** | Alta (estacional) | Fijar/ajustar canon | Media | Bajo | **Sí** | **★ CORE — punta de lanza** |
| Directorio consignatarias | Media | Quién opera dónde | Baja (productor) / Media (PRO) | Medio (mantenimiento) | Parcial | Soporte + línea B2B modesta |
| Calendario de remates | Media (estacional) | Cuándo/dónde hay remate | Baja | **Alto** (scraping frágil) | Bajo (replicable) | Tráfico, no producto |
| Remates en vivo | Baja | — | Baja | Alto | Bajo | Marginal |
| Frigoríficos (1.102) | Baja | Referencia/habilitación | Baja | Bajo (dato oficial) | Bajo | SEO long-tail |
| Calculadora de hacienda | Media | Traducir precio→mi lote | Baja (gratis) | Bajo | Medio | Retención/audiencia |
| El Corredor / reportes | Semanal | Contexto de mercado | Media (patrocinio) | Medio (producción) | **Sí** | **Vehículo de patrocinio** |
| API de datos | — | Integración empresarial | **Alta (potencial, no validada)** | Bajo | **Sí** | **★ CORE — a validar** |
| Servidor MCP (IA) | — | Distribución a agentes | Indirecta (autoridad) | Bajo | **Sí (pionero)** | **★ Distribución/moat futuro** |
| PRO Consignataria (ARS 45.000/mes) | — | Visibilidad/leads | Media (a probar ROI) | Bajo (sales-led) | Parcial | Línea B2B recurrente |

**Estado financiero actual (según contexto del proyecto):** ingresos ~nulos o marginales; MCP live pero con ~0 tool-calls reales; API sin clientes de peso; PRO Usuario ARS 7.900 **retirado en jul-2026** (correcto: el productor no paga). El sitio es hoy **un activo de audiencia y autoridad sin motor de ingresos validado.** Ese es el problema a resolver, y define la prioridad de los próximos 90 días.

**Lo que el diagnóstico descarta explícitamente:** el calendario de remates —el producto más visible— es el **menos monetizable y el más caro de mantener** (scraping frágil, dato replicable, WTP baja). No confundir su tráfico con demanda. El activo defendible es la **serie histórica normalizada del índice**, no el calendario.

---

## 3. El mercado ganadero argentino (cifras ancla, con fuente)

- **Stock bovino: 51.624.909 cabezas** (existencias al 31/12/2024, SAGyP en base a SENASA). Tendencia bajista: vacunación 1ra campaña 2025 = 49,4 M (−2,4% i.a.), 3er-4to año de caída de vientres. *(Advertencia: existencias-31/12 y vacunación no son comparables directas.)*
- **Faena 2024: 13.994.116 cabezas** (SAGyP/SENASA); 2025 proyección ~13,5 M. Hembras 48,5% de faena (liquidación).
- **Producción: ~3,1 Mt res con hueso** (2024–2025, IPCVA/BCR).
- **Exportación 2025: USD 3.700 M** (récord en divisas, +22% i.a., SAGyP); ~70% del volumen a China (Consorcio ABC).
- **Consumo interno: 47,5 kg/hab/año** (parcial 2026, CICCRA) — mínimo en 20 años.
- **Productores con bovinos: 238.825** (por CUIT, SENASA 31/12/2024); 292.467 unidades RENSPA. *(El Censo 2018 contaba ~131.000 EAP; universos distintos — no mezclar.)*
- **Erogación anual del sector: USD 20.322 M** (BCR 2025); de la cual **comercialización = USD 755 M (4%)** y reposición de hacienda USD 9.954 M (49%).
- **Precio índice novillo (INMAG/MAG Cañuelas): ~$3.565/kg vivo** (oct-2025) → ~USD 2,4–2,5/kg *(depende del TC — recalcular con TC exacto)*.

**Estructura de concentración (el dato más importante para segmentar):** el **67% de los productores (<100 cabezas) posee el 10% del stock; el 4% (>1.000 cabezas) concentra el 49%** (SAGyP 2024). Por sistema: cría 66% de las UP / 56% del stock; ciclo completo 16%/18%; invernada 14%/16%; feedlot 1%/3% (~1.100 establecimientos). Geografía: Buenos Aires 37,6%; ~65% del stock en 4 provincias pampeanas; NEA 16% (creciendo, contracíclico).

**Implicancia estratégica:** la mitad del padrón son productores chicos, masivos en número pero marginales en volumen comercializable y de baja WTP y baja conectividad. El **volumen —y el dinero— está en el segmento mediano-grande y en los pocos que concentran el rodeo.** No confundir cantidad de productores con mercado monetizable (regla explícita del brief, confirmada por los datos).

---

## 4. Mapa de actores (quién paga, quién aporta dato, quién bloquea)

| Actor | Qué necesita | Qué produce (dato) | ¿Podría pagar? | ¿Podría bloquear? |
|---|---|---|---|---|
| Productor (cría/invernada/CC/feedlot) | Referencia de precio, cuándo/cómo vender | Consultas, intención | **No (audiencia)** | No |
| Consignataria | Vendedores + compradores, visibilidad | Remates, resultados, precios | Sí (modesto: PRO) | **Sí (si se siente comparada/desintermediada)** |
| Comprador / frigorífico | Descubrir oferta, series de precio | Demanda, precios de compra | Sí (datos) | No |
| Banco (área agro) | Modelos de riesgo, valuación de garantías | — | **Sí (API/datos)** | No |
| Aseguradora | Valuación de hacienda, índices | — | **Sí (API/datos)** | No |
| Media agro | Índice citable, contenido | Difusión | Sí (patrocinio/licencia) | No |
| Proveedores (labs, nutrición, genética) | Audiencia de productores | — | **Sí (patrocinio/leads)** | No |
| Desarrolladores / agentes IA | Fuente estructurada y confiable | Distribución/citas | Sí (API) | No |
| MAG Cañuelas / ROSGAN / consignatarias | — | **Fuente del dato de precio** | No | **Sí (si cortan el acceso al dato)** |
| Organismos (SENASA/SAGyP) | — | Dato oficial (frigos, stock) | No | Bajo |

**Los dos actores que pueden bloquear el crecimiento** son (a) las **consignatarias**, si perciben a la plataforma como un comparador que las ranquea o un marketplace que las desintermedia; y (b) los **dueños de la fuente de precio** (MAG, ROSGAN), si el negocio depende de scrapear su dato y ellos lo cortan. Ambos riesgos definen decisiones de diseño: la plataforma debe ser **percibida como infraestructura aliada, no como juez ni competidor**, y debe **construir serie propia** para no depender de una sola fuente scrapeada (§18).

---

## 5. Segmentación del productor (como empresario, no como categoría)

Priorizada por **valor para el negocio** (audiencia útil + relevancia del canal), no por cantidad.

| Segmento | Nº / peso | Rol comercial | Canal típico | Criterio de elección | Valor para la plataforma |
|---|---|---|---|---|---|
| **Invernador / recriador** | 14% UP, 16% stock | Compra terneros, vende gordo | Directo + pantalla (ROSGAN) + concentrador | Precio neto, relación compra/venta | **Alto** — usa índices activamente (arrendamiento, novillo, maíz) |
| **Ciclo completo profesionalizado** | 16% UP, 18% stock | Vende gordo terminado | Directo a frigo + concentrador | Neto, plazo de cobro | **Alto** — decisor de venta con datos |
| **Feedlot** | 1% UP, 3% stock, ~1.100 estab | Compra invernada, vende gordo | Directo | Relación novillo/maíz, costo financiero | **Alto** — data-hungry, márgenes volátiles |
| **Cría pampeana mediana-grande** | parte del 66% UP | Vende terneros (zafra otoño) | Remate feria + pantalla | Confianza, plazo, comisión | Medio-Alto |
| **Arrendador / propietario que cobra canon** | transversal | Cobra alquiler en kg novillo | — | Referencia verificable del índice | **Alto — el JTBD más limpio** |
| **Administrador de campos** | transversal | Decide por varios campos | Todos | Datos comparables, eficiencia | **Alto** — usuario intensivo |
| **Cabaña / genética** | ~pocos | Vende reproductores | Remates propios, exposiciones | Prestigio, difusión | Medio (patrocinio/perfil) |
| **Productor chico (<100 cab)** | 67% padrón, 10% stock | Vende poco, esporádico | Feria local, acopiador | Confianza, cercanía | **Bajo** — masivo pero no monetizable, baja conectividad (NEA/NOA) |
| **NEA / extrapampeano** | 16% stock | Cría, creciendo | Feria, pantalla | Cercanía | Medio (crecimiento) |

**Para cada segmento de valor** se documentan (resumen): objetivos productivos, estructura de costos, ciclo de caja (pico de venta en **zafra de terneros mar–may**), estacionalidad, frecuencia de operación (baja: pocas ventas grandes por año → **frecuencia de uso del productor es un riesgo estructural**, §21), y grado de confianza en precios publicados (alto en el MAG/índices, bajo en promedios genéricos).

**Regla de comportamiento validada:** el productor de zona núcleo, grande y joven adopta digital (92% usa apps según INTA, muestra sesgada a pampeana); el criador chico del NEA/NOA tiene brecha digital fuerte. **La plataforma debe diseñarse para el productor mediano-grande pampeano y el invernador/administrador**, que son la audiencia de valor, y aceptar que el productor chico es tráfico de largo plazo, no cliente.

---

## 6. Problemas priorizados (ranking por monetizabilidad, no por visibilidad)

Cada problema evaluado por severidad × frecuencia × costo económico × WTP × factibilidad técnica × ventaja competitiva posible:

**Tier 1 — resolver y monetizar (core):**
1. **No existe una referencia de precio confiable, histórica y citable para el ~90% de la hacienda que NO pasa por el mercado concentrador** (el MAG mueve solo ~8% de la faena; el resto opera "a oscuras", en directo). Este es el problema-madre: severidad alta, frecuencia alta, sin solución satisfactoria, y el único con WTP institucional. **Es el negocio.**
2. **Fijar y ajustar el canon de arrendamiento en kg de novillo/ha sin una referencia verificable y actualizada.** Severidad media-alta, frecuencia estacional-alta, WTP media, factibilidad total (ya construido), ventaja competitiva real. **Es la punta de lanza (ya es el 44% del tráfico).**
3. **Instituciones (bancos, aseguradoras, feedlots, exportadores) no tienen una serie normalizada y accesible por sistema/API para modelos de precio y riesgo.** WTP alta pero **no validada**. **El upside.**

**Tier 2 — resolver como soporte (audiencia/retención), no como negocio:**
4. Traducir el precio de mercado al valor probable de *mi* lote (calculadora) — WTP baja, gratis.
5. Decidir vender o esperar contra la estacionalidad y el costo de mantener — retención.
6. Fragmentación del calendario de remates — tráfico, alto costo, replicable.

**Tier 3 — evitar (trampa):**
7. Comparar/ranquear consignatarias — genera conflicto, riesgo de bloqueo del actor que aporta el dato. **No hacer ranking orgánico visible.**
8. Intermediar la operación (marketplace) — desintermediación → las consignatarias cortan el dato; ROSGAN ya ocupa el remate digital. **No hacer.**

**Conclusión del ranking:** el problema más visible (calendario) es el menos monetizable; el más monetizable (referencia de precio para el mercado opaco) es invisible para el usuario casual pero es el que tiene pagador institucional. El plan invierte donde está el dinero, no donde está el tráfico.

---

## 7. Jobs to Be Done (los que sostienen el negocio en negrita)

**Productor / arrendador:**
- **"Cuando arriendo o doy en arriendo un campo, necesito una referencia verificable y actualizada del novillo para fijar y ajustar el canon en kg/ha."** ← JTBD más limpio, ya servido, 44% del tráfico.
- "Cuando miro el precio de mercado, necesito traducirlo al valor probable de mi propia hacienda."
- "Cuando decido vender o esperar, necesito comparar el precio actual con la estacionalidad y mi costo de mantener el lote."

**Consignataria:**
- "Cuando un productor busca quién opera en su zona, necesito aparecer en el momento de la decisión." ← base de PRO.
- "Cuando publico un remate, necesito distribuir la información sin cargarla manualmente en varios canales."

**Institucional (el que paga de verdad):**
- **"Cuando construyo modelos de precio, riesgo o valuación de garantías ganaderas, necesito una serie normalizada, histórica y actualizada, accesible por API."**
- **"Cuando desarrollo una app o un agente de IA para el agro, necesito una fuente estructurada, confiable y citable del precio del ganado argentino."**

Los JTBD en negrita son los que tienen presupuesto. El resto construye la audiencia que da distribución y autoridad al dato.

---

## 8. Análisis competitivo (la competencia no es una plataforma)

| Competidor / sustituto | Fortaleza | Debilidad | Modelo | Amenaza |
|---|---|---|---|---|
| **Una relación de 20 años con el consignatario** | Confianza total, garantía de cobro | No escala, opaca | Comisión | **La competencia real del productor** |
| **Grupo de WhatsApp / llamada** | Inmediato, gratis, confiable | No estructurado, no citable | — | Alta (para "info", no para "dato") |
| **MAG Cañuelas / INMAG (fuente)** | Índice oficial del gordo, gratis | Solo ~8% del mercado, sin USD/histórico normalizado | Público | Es **fuente**, no competidor — aliado potencial |
| **ROSGAN** | Remate pantalla líder, 11 consignatarias, >5M cab | Es invernada, no dato/índice normalizado | Comisión | **No competir**: es el marketplace digital ya ganado |
| **Márgenes Agropecuarios** | 40 años cobrando por info, marca | Formato tradicional, no API/tiempo real | Suscripción paga | Referencia de WTP, no rival directo |
| **Agrofy / medios agro** | Audiencia enorme, precios gratis | Precio spot commoditizado, no índice propietario | Publicidad/marketplace insumos | Comoditiza el precio spot |
| **Software consignatarias (Mantis, Physis, Calipso, Eternum)** | ERP instalado, switching costs | No es dato de mercado ni audiencia | Licencia/suscripción | **No entrar acá** (mercado ocupado) |
| **BidBit / SoftSelection** | Remates online | Nicho, no dato | SaaS | Baja |

**Lecciones:** (1) la competencia principal del productor es **la confianza personal y el WhatsApp**, no un portal — por eso la plataforma no debe intentar reemplazar la relación sino **darle al productor mejor información antes/después** de esa relación. (2) El remate digital ya lo ganó ROSGAN (aliado de las consignatarias); competir ahí es suicida. (3) El precio spot está commoditizado y gratis — **el valor pago está en el dato procesado, normalizado, histórico y citable** (el modelo Márgenes/CEPEA), no en el número del día. (4) Nadie ocupa el lugar de **índice de referencia normalizado con histórico USD y API** para el mercado opaco. Ese es el créneau (coincide con `POSITIONING-THESIS.md`: CEPEA/B3 como comparable — un índice académico se volvió la capa de settlement de todo un mercado).

---

## 9. Propuesta de valor (principal en negrita, resto secundario)

**Principal — Institucional/datos:** *"La única serie normalizada, histórica (2015→) y en USD del precio del ganado argentino, accesible por API y citable como referencia — para modelos de precio, riesgo, valuación y agentes de IA."*

- **Productor (gratis, es la audiencia):** mejor decisión de venta, referencia del canon de arrendamiento, estimación del neto, alertas, historial, traducción precio→mi lote. Menor costo de búsqueda.
- **Consignataria (línea B2B modesta):** visibilidad en el momento de decisión del productor, perfil institucional verificado, distribución de remates, analítica de su plaza — **posicionada como infraestructura aliada, nunca como ranking**.
- **Comprador/frigorífico:** descubrimiento de oferta, series de precio, alertas territoriales.
- **Instituciones (el pagador):** API, histórico, análisis, índices derivados, datos para IA, reportes de mercado.

---

## 10. Modelo de plataforma (a quién subsidiar, quién paga)

Es una plataforma multi-lado, pero **no automáticamente**: la audiencia gratuita NO genera por sí sola un mercado de dos lados (regla del brief). El diseño:

- **Lado subsidiado (gratis, aporta atención y autoridad):** productores + motores de IA. Reciben datos/herramientas gratis; aportan tráfico, intención, y —los LLMs— **citas que construyen la autoridad del índice**.
- **Lado que paga:** instituciones (API/datos), sponsors (índice/reportes), consignatarias (visibilidad/PRO).
- **Efecto de red del lado del dato:** cada consignataria/fuente que aporta resultados de remate mejora la serie; cada institución que adopta el índice como referencia lo vuelve estándar (efecto CEPEA). El moat es **data + red de citación**, no la interfaz.
- **Riesgo de desintermediación:** se neutraliza NO intermediando la operación. La plataforma vive **al costado** de la transacción (dato, referencia, visibilidad), no en el medio.
- **Conflicto entre lados:** el único real es consignataria vs. transparencia (§17). Se gestiona con perfiles reclamados, derecho a réplica, y separación tajante orgánico/publicidad.

---

## 11. Modelo de ingresos (priorizado, con números)

**No presentar publicidad, SaaS, marketplace y API como prioridades simultáneas (regla del brief). Priorización:**

**P1 — Datos institucionales / API (el core, alto margen, a validar):**
- Cliente: bancos (área agro), aseguradoras, feedlots grandes, exportadores, media, devs/IA.
- Unidad: suscripción por acceso (tiers ya existentes: Starter ARS 74.000 / Growth ARS 451.000 / Scale a medida) + licencias de serie histórica + reportes a medida.
- Margen bruto: **~90%+** (dato ya producido). Costo de venta: alto (venta consultiva, ciclo largo 3–9 meses). Escalabilidad: alta. Riesgo: WTP no validada; dependencia de fuente.

**P2 — Patrocinio de índices y reportes (beachhead de caja, rápido):**
- Cliente: laboratorios, nutrición, genética, bancos, aseguradoras, maquinaria.
- Unidad: patrocinio mensual/trimestral de El Corredor + páginas de índice (arrendamiento/INMAG) + newsletter.
- Precio tentativo: **ARS 1–3 M/mes** por sponsor principal; márgen ~85%. Riesgo: cuidar la neutralidad (sponsor ≠ ranking).

**P3 — PRO Consignataria (línea B2B recurrente, universo chico):**
- Cliente: consignatarias digitalizadas regionales primero (las 45 del MAG + regionales).
- Unidad: **ARS 45.000/mes** (ya existente). Perfil verificado, destacado, distribución de remates, analítica, leads.
- Margen ~85%. Ciclo de venta medio. Techo bajo por tamaño del universo (§15).

**P4 — Servicios de datos/reportes a medida y white-label** (proyecto, alto ticket, baja frecuencia).

**Descartados como fuente primaria:** comisión transaccional (no intermediamos), financiamiento/seguros (regulatorio, prematuro), publicidad display masiva (RPM baja, audiencia chica), suscripción paga al productor (WTP nula).

Para cada fuente se define (resumen en tabla mental del equipo): cliente pagador, unidad de cobro, precio, frecuencia, margen, costo de venta, riesgo, escalabilidad, tiempo a ingreso, dependencia regulatoria y conflicto con neutralidad. **El patrón:** P2 y P3 generan caja rápida y de bajo riesgo; P1 es el negocio de verdad pero tarda y hay que validarlo.

---

## 12. Estrategia de datos (el verdadero moat)

| Dato | Fuente | Frecuencia | Confiabilidad | Riesgo legal | Valor comercial | ¿Moat? |
|---|---|---|---|---|---|---|
| **INMAG serie diaria 2015→ (ARS+USD)** | MAG + construcción propia | Diaria | Alta | Bajo (dato público, valor en la normalización) | **Alto** | **★ Sí — histórico + USD + método** |
| **Índice arrendamiento (haciinfo000013 normalizado)** | MAG | Diaria/mensual | Alta | Bajo | **Alto** | **★ Sí** |
| Índices derivados (spread, USD, categorías) | Propio | Diaria | Alta | Bajo | Alto | **★ Sí** |
| Resultados de remates (precios realizados) | Consignatarias/scraping | Por remate | Media | Medio | **Muy alto (si se logra)** | **★★ El moat máximo si se construye** |
| Calendario de remates | Scraping | Diaria | Media | Medio (ToS) | Bajo | No (replicable) |
| Frigoríficos/habilitaciones | SENASA | Baja | Alta | Bajo | Bajo | No |
| Maíz / TC / faena / exportación | Oficial | Variable | Alta | Bajo | Medio (contexto) | No solo, sí combinado |

**El data moat NO es el calendario scrapeado (replicable, regla del brief).** El moat es **la serie histórica propia, normalizada, en USD, con metodología pública y —si se logra— los precios REALIZADOS de remates** (no el orientativo). Eso último es lo que nadie tiene y lo que convierte a la plataforma en la referencia del mercado opaco. Se construye pidiendo a las consignatarias que publiquen resultados a cambio de visibilidad (intercambio de valor, no scraping) — el mismo movimiento que hizo CEPEA contactando a 6.000+ actores.

**Prioridad de datos 2026–2027:** (1) blindar y profundizar la serie propia del índice; (2) empezar a capturar **resultados de remate** vía las consignatarias PRO; (3) reducir dependencia de una sola fuente scrapeada.

---

## 13. MVP — el mínimo producto VENDIBLE (3 alternativas, se elige una)

| | **A) Consignataria** | **B) Productor** | **C) Datos/institucional** |
|---|---|---|---|
| Usuario | Consignataria regional digitalizada | Invernador/arrendador | Banco/aseguradora/feedlot/media |
| Problema | Aparecer en la decisión del productor | Fijar canon / decidir venta | Serie normalizada para modelos |
| Solución | Perfil verificado + distribución + leads | (gratis — no vendible) | API + histórico + reporte |
| Precio | ARS 45.000/mes | — | Patrocinio ARS 1–3M/mes ó API ARS 74k–451k |
| Canal | Venta directa (post-remate outreach ya existe) | — | Venta consultiva + relaciones |
| Op. manual | Onboarding, verificación | — | Entrega de datos, soporte |
| Métrica éxito | Nº PRO pagando, retención | — | 1er contrato pago, renovación |
| Riesgo | Universo chico, ROI a probar | WTP nula | Ciclo largo |
| Validación | 10 llamadas → 3 pilotos pagos | — | 1 design-partner pago |

**Elección: MVP híbrido con secuencia clara —** empezar por **C-patrocinio + A-PRO en paralelo (caja rápida, riesgo bajo)** y usar esa caja/relaciones para llegar al **C-API design-partner (validación del core)**. El producto B (productor) NO se vende: es la audiencia gratuita que hace posibles A y C. El MVP vendible del trimestre 1 es: **un paquete de patrocinio del índice de arrendamiento + El Corredor**, y **PRO Consignataria** con onboarding manual. Resuelve un problema económicamente relevante y permite cobrar aunque haya tareas manuales.

---

## 14. Go-to-market (específico del sector, no solo digital)

- **Cliente inicial ideal (ICP):** para P2, un laboratorio/nutrición/banco con presupuesto de marketing agro y necesidad de audiencia de productores mediano-grandes; para P3, la consignataria **regional digitalizada** (no la casa chica manual ni la nacional que ya tiene todo); para P1, el **área agro de un banco o una aseguradora** o un **feedlot grande data-hungry**.
- **Región inicial:** zona núcleo pampeana + Corrientes/NEA (donde el fundador tiene red real y donde está el arrendamiento ganadero). Empezar donde hay relación y densidad.
- **Canales:** venta directa a dueños/gerentes de consignatarias; **el outreach post-remate ya existente** como canal de PRO; sociedades rurales y exposiciones (Palermo, ExpoAgro, expos regionales); grupos CREA; contadores rurales (Estudio Zaracho como primer aliado/testimonio); media agro para patrocinio; **WhatsApp y newsletter** como canales de relación, no display. **No solo marketing digital** (regla del brief).
- **Oferta de entrada:** para PRO, un piloto de 60–90 días con perfil verificado + un remate destacado; para patrocinio, un paquete trimestral con métricas de audiencia; para API, un design-partner con acceso gratuito 60 días a cambio de feedback y caso.
- **Ciclo de venta:** PRO ~2–6 semanas; patrocinio ~4–8 semanas; API institucional 3–9 meses.
- **Retención/expansión:** el dato fresco y el histórico crean stickiness; expansión por más tiers de API, más índices, reportes a medida. **Programa de referidos** entre consignatarias.

---

## 15. Plan financiero 36 meses (fórmulas, supuestos, sensibilidad — no precisión inventada)

**Supuestos base (explícitos, a validar):**
- Burn actual bajo (equipo chico, infra Vercel/Supabase). Costo de datos por cliente ~marginal (dato ya producido).
- Precios: PRO ARS 45.000/mes; patrocinio ARS 1,5M/mes (base); API blend ARS 200.000/mes/cuenta (mix Starter/Growth).
- TC de referencia para normalizar a USD: ~ARS 1.400/USD (recalcular). *Todas las cifras USD son órdenes de magnitud.*

**Escenario BASE (mes 36, ARR):**
- PRO Consignataria: 40 cuentas × ARS 45.000 × 12 = **ARS 21,6M/año** (~USD 15k).
- Patrocinio: 2 sponsors × ARS 1,5M × 12 = **ARS 36M/año** (~USD 26k).
- API/datos institucional: 12 cuentas × ARS 200.000 × 12 = **ARS 28,8M/año** (~USD 20k)... 

> **Advertencia crítica de escala:** con precios en pesos y estos volúmenes, el ARR base ronda **ARS ~86M/año ≈ USD ~60–90k**. Para llegar al orden de **USD 300–800k de ARR (escenario base "ambicioso"/expansivo)** el driver NO son más PRO (universo chico) sino **contratos API/datos institucionales de ticket alto (Growth ARS 451k y Scale a medida) y licencias de serie histórica** — p.ej. 15–25 cuentas institucionales a USD 6–20k/año + 3–4 sponsors + licencias. **La sensibilidad manda: el negocio es 80% función del ticket y número de clientes institucionales, no de las consignatarias.**

**Escenarios:**
- **Conservador (m36):** ARR ~USD 60–90k. Solo PRO + 1–2 sponsors; API no despega. → negocio de subsistencia/side, break-even ajustado.
- **Base (m36):** ARR ~USD 250–400k. PRO estable + patrocinio + 10–15 cuentas API institucionales de ticket medio. → negocio de información rentable de nicho.
- **Expansivo (m36):** ARR ~USD 600–900k. El índice se vuelve referencia citada; 20+ cuentas institucionales, licencias de serie, 1 contrato ancla (banco/aseguradora/exportador) de ticket alto, expansión a otra especie/país en piloto.

**Métricas a instrumentar:** MRR/ARR, margen bruto (~85–90%), CAC por línea, LTV, payback, churn, ARPA, conversión free→pago, burn, runway, break-even, **costo de dato por cliente** (clave: debe tender a cero marginal), ingreso por empleado. **Mostrar fórmulas y sensibilidad, no precisión falsa** (regla del brief): el modelo mensual vive en planilla aparte; acá el mensaje es la **estructura y la palanca dominante (ticket institucional)**.

---

## 16. Riesgos (probabilidad × impacto × indicador temprano × mitigación)

| Riesgo | Prob. | Impacto | Indicador temprano | Mitigación |
|---|---|---|---|---|
| **Nadie institucional paga por el dato** | **Media-Alta** | **Crítico** | 0 contratos API a los 90 días | Validar con design-partner YA; pivotar a patrocinio+PRO si falla |
| WTP baja de consignatarias | Media | Alto | <3 PRO en 90 días | No depender de esta línea; posicionar como infra |
| Corte de la fuente de precio (MAG/scraping) | Media | Alto | Cambios en ToS/estructura | **Serie propia**, múltiples fuentes, acuerdos |
| Conflicto/reclamo de consignatarias (ranking) | Media | Alto | Quejas, pedidos de baja | Sin ranking visible, perfiles reclamados, derecho a réplica |
| Entrada de actor grande (Agrofy, ROSGAN, media) | Baja-Media | Alto | Lanzamiento de índice rival | Ventaja de histórico + citación IA + ser primero |
| Baja frecuencia de uso del productor | **Alta** | Medio | Retención mensual baja | Alertas, arrendamiento (estacional-recurrente), email digest |
| Error en un precio/recomendación | Media | Alto (reputación/legal) | Corrección post-publicación | Metodología pública, disclaimers, "referencia no vinculante" |
| Mercado total chico / techo bajo | **Alta** | Medio | ARR se estanca | Aceptar nicho rentable; optionalidad otras especies/países |
| Dependencia de scraping frágil (calendario) | Alta | Bajo-Medio | Rotura de scrapers | Despriorizar como producto; no invertir de más |
| Ciclo de venta institucional largo | Alta | Medio | Pipeline sin cerrar | Caja puente con P2/P3 |

**Los dos riesgos que definen el negocio:** (1) que el dato institucional no tenga pagador, y (2) que el mercado sea estructuralmente chico. Ambos se testean en los primeros 90 días.

---

## 17. Confianza y legitimidad (crítico en un mercado de relaciones)

Para que la plataforma **no sea percibida como amenaza por las consignatarias**:
- **Sin ranking orgánico visible** — comparar por datos objetivos (cobertura, frecuencia, categorías) sin "mejor/peor".
- **Separación tajante orgánico/publicidad** — el PRO/destacado se etiqueta claramente.
- **Perfiles reclamados y verificados** — la consignataria controla su perfil; **derecho a réplica**.
- **Metodología pública, fecha de actualización, corrección de errores trazable** — el índice se audita.
- **Distinción explícita estimación vs. operación real** — nunca presentar un orientativo como precio realizado.
- **Neutralidad** — la plataforma es infraestructura, no juez ni competidor.
- **Consejo asesor sectorial** — sumar figuras reconocidas (académicos UNS/FCV-UBA, algún consignatario respetado) que legitiman el índice (el movimiento CEPEA/academia).
- **Privacidad** — no exponer datos comerciales sensibles de operaciones individuales.

El mensaje a las consignatarias: *"te traemos al productor en su momento de decisión y le damos una referencia de precio que legitima tu operación; no te comparamos ni te reemplazamos."*

---

## 18. Estrategia de IA (realista, no como propuesta de valor en sí)

**Separación honesta (regla del brief):**
- **Útil hoy:** MCP/API para que agentes consulten precios/índices; ser la **fuente citada** por LLMs (ya ocurre con INMAG) → autoridad y distribución; extracción de datos de flyers/PDF/redes para poblar el calendario (baja costo de carga); detección de errores en la serie.
- **Posible pero sin valor suficiente aún:** chat ganadero de lenguaje natural como producto pago (el dato ya se sirve gratis); comparador conversacional de consignatarias (riesgo de conflicto).
- **Requiere datos inexistentes:** predicción de precios confiable (necesitaría resultados de remate que aún no se capturan); recomendación de "cuándo vender" a nivel lote.
- **Alto riesgo:** cualquier recomendación financiera/inversión (responsabilidad legal) — mantener disclaimers.

**Rol de la IA:** reduce costo de carga de datos, mejora decisiones del usuario, y —lo más valioso— **crea distribución**: ser la fuente que los agentes citan. La IA **no es la propuesta de valor**; el dato citable lo es. El MCP se mantiene como apuesta de moat de distribución, no como línea de ingreso directa a corto plazo.

---

## 19. Plan de validación primaria (90 días, preguntas no hipotéticas)

**Entrevistas (mín. 20–30), preguntas sobre la ÚLTIMA operación/decisión concreta, no "¿pagarías?":**
- **Productores** (cría, invernada, feedlot, ciclo completo, cabaña; distintas escalas; pampeana + NEA): "Contame tu última venta: cómo elegiste el canal, qué miraste de precio, qué te costó decidir, qué salió mal." "La última vez que fijaste/ajustaste un arrendamiento, ¿cómo calculaste el canon?"
- **Consignatarias** (nacionales, regionales, cooperativas, casa local, digitalizada vs. manual): "¿Cómo conseguís vendedores y compradores hoy? ¿Qué gastás en difundir un remate? ¿Qué software usás?"
- **Institucionales** (banco agro, aseguradora, feedlot grande, media, analista): "La última vez que necesitaste una serie de precios de ganado, ¿de dónde la sacaste? ¿Qué te faltó? ¿Tenés presupuesto para datos?" ← **la validación que decide el negocio.**

**Tests de venta (no encuestas):** ofrecer el paquete de patrocinio y PRO **con precio real** y medir cierres; ofrecer un design-partner de API. La validación es el cierre, no el interés declarado.

**Datos a cerrar (los vacíos de la investigación):** padrón SIOCAL de consignatarios (pedido a MAGyP/ARCA) para dimensionar el universo; precio de Márgenes Agropecuarios y software para calibrar WTP; % de arrendamiento ganadero.

---

## 20. Roadmap (4 etapas, con criterio de avanzar/detener)

**Días 1–30 — Diagnóstico y primera oferta.**
- Objetivo: validar el cliente pagador. Producto: paquete de patrocinio + PRO con precio. Cliente: 3 prospectos de cada tipo. KPI: 20+ entrevistas, 1 oferta enviada por línea. Criterio para avanzar: ≥3 conversaciones institucionales con interés real de presupuesto. **Criterio para detener/pivotar:** cero interés institucional Y <3 PRO interesadas → replantear como medio con patrocinio.

**Días 31–90 — Pilotos pagos.**
- Objetivo: primer ingreso. Producto: MVP híbrido (patrocinio + PRO + 1 API design-partner). KPI: **1er sponsor pago, 3 PRO pagando, 1 design-partner API firmado.** Criterio avanzar: ≥ARS 3M MRR combinado y una renovación/compromiso. Detener: 0 cierres pagos → la hipótesis de WTP falló, reconsiderar el negocio.

**Meses 4–12 — Expansión y moat de datos.**
- Objetivo: repetibilidad + empezar a capturar resultados de remate. Producto: automatización de onboarding PRO, primer producto de datos institucional empaquetado, más índices. KPI: 15–25 cuentas pagas totales, churn <5%/mes, primeros resultados de remate en la serie. Criterio avanzar: PMF en al menos UNA línea (retención + expansión). 

**Meses 13–36 — Escala nacional e institucional.**
- Objetivo: convertirse en la referencia citada. Producto: API robusta, contrato ancla institucional, licencias de serie histórica, consejo asesor, expansión a otra especie/país **solo con PMF argentino demostrado**. KPI: ARR base USD 250–400k, 1 contrato ancla, citación IA dominante. Servicios financieros/transaccionales **solo si fueron validados** (no antes).

---

## 21. Bibliografía (fuentes con fecha; ver §3 y anexos por dato)

SAGyP/MAGyP (Caracterización Producción Bovina 2024; faena; SIO-Carnes); SENASA (existencias, vacunación, estratificación; SIOCAL ex-RUCA); IPCVA (faena, exportación, formación de precios); INDEC (CNA 2018, conectividad); BCR (informativos 2025: stock, carnes, erogación sectorial, márgenes); Mercado Agroganadero de Cañuelas (INMAG, índice arrendamiento haciinfo000013); ROSGAN; Consorcio ABC; CICCRA; Cámara Argentina de Consignatarios de Ganado (CACG); CCDH; INTA (márgenes ciclo completo; conectividad rural 2025; adopción digital); CREA; FAUBA; Márgenes Agropecuarios; Compañía Argentina de Tierras (arrendamientos); Diez, M. (UNS, circuitos de comercialización SO bonaerense); RAPA/AAPA (estratos SENASA 2022); Dictamen DAT 77/05 (IVA comisiones). Marcos: Williamson (costos de transacción — explica por qué el consignatario existe y por qué el marketplace fracasa); Akerlof (limones — el índice reduce asimetría); Porter (5 fuerzas: poder de la fuente de dato; cadena de valor); RBV (la serie histórica como recurso valioso, raro e inimitable-en-el-tiempo); efectos de red de datos/citación; Rogers (difusión: adoptar primero el segmento pampeano tecnificado). *Comparable internacional CEPEA/B3 (Brasil): un índice académico devino la capa de settlement de todo un mercado — el playbook.*

---

## 22. RECOMENDACIÓN FINAL (inequívoca)

**Qué debe ser consignatarias.com.ar:** la **capa de datos e índice de referencia del mercado ganadero argentino** — "el precio de referencia del ganado argentino" — un negocio de información B2B/institucional de alto margen, sobre una capa pública gratuita que captura al productor y a los agentes de IA como distribución y autoridad.

**Qué NO debe intentar ser:** marketplace/intermediario de operaciones (Williamson: el consignatario existe para reducir costos de transacción que un portal no puede; ROSGAN ya ganó el remate digital); SaaS de gestión para consignatarias (mercado ocupado por Mantis/Physis/Calipso); terminal paga para el productor (WTP nula, precio spot gratis); comparador con ranking (conflicto y bloqueo del que aporta el dato); medio financiado solo por publicidad (audiencia y RPM chicos).

**Quién debe pagar y por qué:** **instituciones** (bancos, aseguradoras, feedlots grandes, exportadores, media, devs/IA) por **acceso a una serie normalizada, histórica, en USD y citable, vía API** — porque el precio spot es gratis pero **el dato procesado, histórico y confiable no existe en ningún otro lado** y lo necesitan para modelos de precio/riesgo/valuación. Secundariamente, **sponsors** por acceso a la audiencia + asociación con el índice, y **consignatarias** por visibilidad (línea modesta).

**Primer producto pago (90 días):** **paquete de patrocinio del índice de arrendamiento + reporte El Corredor** (caja rápida, valida que la audiencia/dato vale) + **PRO Consignataria** (ARS 45.000/mes, recurrente) + **un design-partner de API** (valida el core institucional).

**Cuánto debe costar:** patrocinio **ARS 1–3 M/mes**; PRO **ARS 45.000/mes**; API institucional **ARS 74.000–451.000/mes** según tier + licencias de serie a medida.

**Qué vender en los próximos 90 días:** un sponsor, tres PRO, un design-partner de API. Meta: **≥ARS 3M MRR combinado** y una renovación.

**Hipótesis que puede invalidar TODO el negocio:** que **ninguna institución pague de forma significativa por el dato** (porque el spot es gratis y el índice aún no es referencia estándar) **y** que el B2B de consignatarias sea demasiado chico y de baja WTP. Si ambas fallan, hay una audiencia gratuita sin pagador: un buen medio, no un negocio. **Test explícito a 90 días.**

**Ventaja competitiva a construir en 3 años:** ser **LA referencia de precio citada** del ganado argentino — vía (1) la serie histórica más larga, limpia y normalizada en USD, (2) la captura de **resultados de remate reales** (el dato que nadie tiene, intercambiado por visibilidad con las consignatarias), (3) citación ubicua por agentes de IA, y (4) metodología adoptada por terceros (contratos que referencian "el índice"). Data moat + red de citación. El mismo camino por el que un índice académico (CEPEA) se volvió la capa de settlement del mercado brasileño.
