# PLAN DE NEGOCIOS — consignatarias.com.ar (2026–2029) · v2 (fusión)

**Fecha:** 2026-07-11 · **Propietario:** Memola Medios SAS · **Estado:** documento de decisión (board-level).
**Construye sobre y agudiza:** `POSITIONING-THESIS.md`, `EL-ORACULO-FRAMEWORK.md`, `ROADMAP.md`. No los contradice.
**Origen:** fusión de dos planes independientes del 11-jul-2026. De uno se toma la **investigación sectorial con fuentes**, el filo estratégico (tesis del precio de referencia / data-moat) y la kill-hypothesis; del otro, las **cifras internas exactas del producto**, el **modelo financiero mes a mes**, las guías de entrevista, la tabla de objeciones y la **secuencia de motores (PRO Consignataria como cuña de caja)**. La síntesis resuelve la única contradicción entre ambos (ver §0).

> **Advertencia transversal.** Persisten tres vacíos de datos que condicionan el plan y hay que cerrar antes de comprometer capital grande: (1) **no existe share de canales de comercialización oficial posterior a 2010**; (2) **no hay padrón público del número de consignatarias del país** (el universo real es el registro SIOCAL, ex-RUCA, no publicado); (3) **no hay dato del % de superficie *ganadera* bajo arrendamiento** (el 70% conocido es agrícola). Donde no hay fuente, se dice. Se distingue **hecho / inferencia / supuesto**.

---

## 0. La decisión, resuelta (síntesis de las dos apuestas)

Los dos planes originales identifican **los mismos dos motores** (B2B consignatarias + datos institucionales) y difieren solo en la **secuencia**. Este v2 los reconcilia:

- **Motor 1 — cuña de caja (meses 0–12): PRO Consignataria.** Es lo único **cobrable en 90 días con el producto que ya existe** (perfil verificado + remates destacados + distribución + tracking de leads + reporte). Su universo es chico y su techo es bajo, pero genera caja, relaciones sectoriales y —clave— **el dato de resultados de remate** que alimenta el moat.
- **Motor 2 — el verdadero prize (meses 6–36): capa de datos e índice de referencia.** API/MCP + serie histórica normalizada en USD + patrocinio de índices/reportes. Alto margen, defensible, ciclo de venta largo, WTP institucional **no validada**. Es donde está el techo real y el moat.
- **La regla que los une:** **el Motor 1 financia y alimenta al Motor 2.** PRO Consignataria no es el destino; es la cuña que paga la construcción de la posición de "precio de referencia del ganado argentino" (la tesis de `POSITIONING-THESIS.md`, comparable CEPEA/B3). Si se confunde la cuña con el destino, el negocio se queda en su techo bajo (~USD 15–30k ARR de PRO sola).

**Recomendación inequívoca (desarrollada en §22):** consignatarias.com.ar debe ser **la infraestructura neutral de información y datos del mercado ganadero argentino, con el índice de referencia como activo central** — productor gratis (audiencia + autoridad + dato de comportamiento), consignatarias pagando por alcance medible (cuña), empresas e instituciones pagando por datos/API/licencias (prize). **NO** marketplace transaccional, **NO** SaaS/ERP completo de gestión, **NO** terminal paga al productor, **NO** comparador con ranking agresivo, **NO** vivir de publicidad programática.

**Techo realista.** Es un **negocio de información sectorial de alto margen y nicho**, no venture-scale. SOM a 3 años en Argentina: escenario **base ~USD 140k ARR / expansivo ~USD 370k ARR** (§20), con optionalidad de escala (otras especies/países, ser LA fuente citada por IA) solo si hay PMF argentino demostrado.

---

## 1. Resumen ejecutivo

consignatarias.com.ar es hoy un **activo de audiencia y autoridad sin motor de ingresos validado**. Tiene tracción real de descubrimiento e información —fuerte como referencia de precio/arrendamiento— pero aún no prueba demanda transaccional ni disposición masiva del productor a pagar.

**Evidencia interna (verificada en el repo, 11-jul-2026):**
- **104 perfiles canónicos** de consignatarias (`consignataria-slugs.ts`).
- **735 remates** indexados; **283 programados** desde hoy; **166 con cabezas estimadas** (suma 535.547 cab) — cobertura parcial (`remates.json`).
- **1.102 frigoríficos** en el directorio (`frigorificos.json`).
- **INMAG $4.141,85/kg vivo** (fuente MAG) y **índice arrendamiento $4.198/kg** (`market-prices.json`).
- **Tráfico:** ~3.439 usuarios GA4 (30d) / ~1.075 (7d); **GSC 28d: ~890 clics/sem, ~2.595 clics acumulados**, posición media ~6,2. Queries líderes: "precio novillo para arrendamiento hoy", "índice novillo arrendamiento", "inmag". **El hub de arrendamiento concentra el 44% de todos los clics.**

**La tesis central:** el negocio NO está en el productor como pagador (WTP nula, precio spot gratis en el MAG/Agrofy) ni exclusivamente en las consignatarias (universo chico, frecuencia baja). El productor es la **audiencia** que da distribución y autoridad. La consignataria es la **cuña de caja**. El dinero de largo plazo y el moat están en el **dato institucional**: quien construye modelos de precio/riesgo/valuación y —cada vez más— los agentes de IA que necesitan una fuente estructurada y citable. El activo defendible no es el calendario scrapeado (replicable, caro) sino **la serie histórica normalizada + los resultados de remate verificados**.

**Debilidad honesta:** parte del dato actual es incompleto (solo 166/735 remates con cabezas; el directorio crudo mezcla actores) y el histórico de resultados aún no alcanza para comparar neto/performance por plaza. Por eso el data-moat es **normalización + verificación + resultados + trazabilidad metodológica + adopción por pagadores**, no scraping.

---

## 2. Diagnóstico del producto actual (qué monetiza y qué no)

Evaluado por frecuencia, importancia de la decisión, WTP, costo operativo y diferenciabilidad:

| Activo | Frec. | Decisión | WTP | Costo op. | Diferenciable | Veredicto |
|---|---|---|---|---|---|---|
| **Índice INMAG (serie 2015→, ARS+USD)** | Alta | Referencia de precio | Media-Alta (B2B) | Bajo | **Sí (histórico+USD+método)** | **★ CORE — el activo** |
| **Hub arrendamiento (haciinfo000013 normalizado)** | Alta (estacional) | Fijar/ajustar canon | Media | Bajo | **Sí** | **★ CORE — punta de lanza (44% del tráfico)** |
| **Perfil verificado + remates destacados + distribución** | Alta (casas activas) | Más asistencia/consultas | **Alta si hay leads** | Medio | Alta con audiencia | **★ Primer producto vendible (cuña)** |
| API / MCP | Baja usuarios, alto valor | Integración/modelos/IA | **Alta (no validada)** | Medio-alto (soporte) | Alta si dato estable | **★ Segundo motor (el prize)** |
| El Corredor / reportes | Semanal | Contexto de mercado | Media (patrocinio) | Medio | Sí | Vehículo de patrocinio/sponsor |
| Directorio consignatarias | Media | Quién opera dónde | Baja/Media | Medio | Parcial (si verificado) | Infraestructura, no producto aislado |
| Calendario de remates | Alta | Dónde vender/comprar | Baja | **Alto (scraping frágil)** | Bajo (replicable) | Base de audiencia, NO producto pago |
| Calculadora / vender-ahora | Media | Traducir precio→mi lote | Baja (gratis) | Bajo | Medio | Captura de leads, no core pago |
| Frigoríficos (1.102) | Baja | Referencia/habilitación | Baja | Bajo (oficial) | Bajo | SEO long-tail |
| Comparador de consignatarias | Baja-Media | Reducir riesgo de elección | Media, **políticamente sensible** | Alto | Alta si hay datos reales | **Descriptivo, NO ranking agresivo** |
| Reviews / reputación | Media | Confianza | Media | Alto (moderación/legal) | Alta | Solo con controles estrictos, fase 2 |
| Marketplace / intermediación | Alta valor | Operación completa | Alta si liquida | **Muy alto (legal/confianza/capital)** | Alta | **NO antes de PMF informativo** |
| Mi Ganado / admin rodeo | Media | Control productivo | Media | Muy alto (producto) | Baja (competidores) | No foco |

**PRO Usuario ARS 7.900 retirado en jul-2026** (correcto: el productor no paga). **El producto más visible (calendario) es el menos monetizable y el más caro de mantener** — no confundir tráfico con demanda.

---

## 3. Mercado ganadero argentino (cifras ancla, con fuente)

- **Stock bovino: 51.624.909 cabezas** (existencias 31/12/2024, SAGyP en base a SENASA). Vacunación 1ra campaña 2025 = 49,4 M (−2,4% i.a.), 3er-4to año de caída de vientres.
- **Faena 2024: 13.994.116 cab** (SAGyP); 2025 ~13,5 M. Hembras 48,5% de faena (liquidación). *CREA Outlook 2026: faena 2025 −2,31% i.a., peso medio 228→232 kg, consumo ~49 kg.*
- **Producción ~3,1 Mt res con hueso** (IPCVA/BCR); **exportación 2025 USD 3.700 M** (récord, +22%, SAGyP), ~70% a China (Consorcio ABC); **consumo interno 47,5 kg/hab** (parcial 2026, CICCRA) — mínimo en 20 años.
- **Productores con bovinos: 238.825** (por CUIT, SENASA 31/12/2024); 292.467 unidades RENSPA. *(Censo 2018: ~131.000 EAP — universos distintos, no mezclar.)*
- **Erogación anual del sector: USD 20.322 M** (BCR 2025); comercialización = USD 755 M (4%); reposición de hacienda USD 9.954 M (49%).
- **Precio índice novillo (MAG): ~$3.565/kg vivo** (oct-2025) → ~USD 2,4–2,5/kg *(depende del TC — recalcular)*.

**Concentración (el dato que manda para segmentar):** **67% de los productores (<100 cab) posee el 10% del stock; el 4% (>1.000 cab) concentra el 49%** (SAGyP 2024). Sistemas: cría 66% UP/56% stock; ciclo completo 16%/18%; invernada 14%/16%; feedlot 1%/3% (~1.100 estab). Geografía: Bs. As. 37,6%; ~65% en 4 provincias pampeanas; NEA 16% (creciendo).

**Comercialización — el dato más importante (y su límite):** última foto oficial (ex-ONCCA 2010): **venta directa ~80%, mercado concentrador ~12%, remate feria ~7,6%**; la pantalla no figura desagregada. Tendencia posterior: **más directo, menos feria/concentrador** (evidencia académica regional UNS: venta directa sin intermediario pasó de 25% a 45% entre 2007 y 2020). Volúmenes duros: **MAG Cañuelas 1,20 M cab (2024) / 1,11 M (2025) = ~8% de la faena** (45 firmas consignatarias); **ROSGAN >5 M acumulado, ~400–500k/año, invernada** (11 firmas socias). **Comisión ~3% + 1% garantía al vendedor** (o 5%+imp según otra fuente), 4% comprador; **costo total de venta: directo ~4,5–7,9%, concentrador ~9,3–14%**. Estacionalidad: zafra de terneros en otoño (**mar–may**).

**Implicancia:** la mitad del padrón son productores chicos, masivos en número pero marginales en volumen y de baja WTP/conectividad (brecha digital NEA/NOA). El volumen y el dinero están en el **mediano-grande y el invernador/feedlot/administrador**. No confundir cantidad de productores con mercado monetizable.

---

## 4. Mapa de actores (quién paga, quién aporta dato, quién bloquea)

| Actor | Necesita | Produce (dato) | ¿Paga? | ¿Bloquea? |
|---|---|---|---|---|
| Productor (cría/inv./CC/feedlot) | Referencia de precio, cuándo/cómo vender | Consultas, intención, leads | **No (audiencia)** | No |
| Consignataria | Vendedores + compradores, visibilidad, medición | Remates, resultados, condiciones | **Sí (cuña: PRO)** | **Sí (si se siente comparada/desintermediada)** |
| Comprador / frigorífico | Descubrir oferta, series | Demanda, precios pagados | Sí (datos) | Medio |
| Banco (área agro) | Modelos de riesgo, valuación de garantías | — | **Sí (API/datos)** | No |
| Aseguradora | Valuación de hacienda, índices | Pólizas/siniestros | **Sí (API/datos)** | No |
| Media agro | Índice citable, contenido | Difusión | Sí (patrocinio/licencia) | Medio (apropiación) |
| Proveedores (labs/nutrición/genética) | Audiencia de productores | — | **Sí (patrocinio/leads)** | No |
| Devs / agentes IA | Fuente estructurada y confiable | Distribución/citas | Sí (API desde volumen) | No |
| MAG / ROSGAN / consignatarias | — | **Fuente del precio** | No | **Sí (si cortan el dato)** |
| Organismos (SENASA/SAGyP) | — | Dato oficial | No como cliente | Alto (regulatorio) |

**Los dos que pueden bloquear el crecimiento:** las **consignatarias** (si perciben ranking/desintermediación) y los **dueños de la fuente de precio** (si el negocio depende de scrapear su dato). Ambos definen decisiones de diseño: infraestructura aliada (no juez ni competidor) + serie propia (no depender de una sola fuente scrapeada).

---

## 5. Segmentación del productor (por valor para el negocio, no por cantidad)

| Segmento | Peso | Rol comercial | Canal | Criterio de elección | Valor para la plataforma |
|---|---|---|---|---|---|
| **Invernador / recriador** | 14% UP, 16% stock | Compra terneros, vende gordo | Directo + pantalla + concentrador | Precio neto, relación compra/venta | **Alto — usa índices activamente** |
| **Ciclo completo profesionalizado** | 16% UP, 18% stock | Vende gordo terminado | Directo + concentrador | Neto, plazo | **Alto — decisor con datos** |
| **Feedlot** | 1% UP, 3%, ~1.100 estab | Compra invernada, vende gordo | Directo | Novillo/maíz, costo financiero | **Alto — data-hungry, márgenes volátiles** |
| **Arrendador / propietario (canon)** | transversal | Cobra alquiler en kg novillo | — | Referencia verificable del índice | **Alto — el JTBD más limpio (44% tráfico)** |
| **Administrador de campos** | transversal | Decide por varios campos | Todos | Datos comparables, trazabilidad | **Alto — usuario intensivo** |
| **Cría pampeana mediana-grande** | parte del 66% UP | Vende terneros (zafra otoño) | Feria + pantalla | Confianza, plazo, comisión | Medio-Alto |
| **Empresa ganadera profesionalizada** | pocos, alto volumen | Volumen regular | Licitación/directo | Datos, benchmarking | **Alto — reportes/API** |
| **Cabaña / genética** | pocos | Vende reproductores | Remates especiales, expos | Prestigio, difusión | Medio (patrocinio/perfil) |
| **Productor chico (<100 cab)** | 67% padrón, 10% stock | Vende poco, esporádico | Feria local, acopiador | Confianza, cercanía | **Bajo — masivo pero no monetizable** |
| **NEA / extrapampeano** | 16% stock, creciendo | Cría, invernada | Feria regional | Cobertura territorial | Medio (crecimiento, baja conectividad) |

**Adopción digital:** 92% usa apps (INTA, muestra sesgada a pampeana núcleo); 67% conectividad regular/mala; brecha fuerte en NEA/NOA y chicos. **Diseñar para el mediano-grande pampeano + invernador/administrador**; el chico es tráfico de largo plazo, no cliente. **Conclusión:** el productor es usuario crítico para generar demanda y dato, pero el pagador inicial es la **consignataria o la empresa que ya tiene presupuesto**.

---

## 6. Funcionamiento real de las consignatarias (qué se digitaliza y qué no)

La consignataria combina confianza, información, liquidez, garantía y operatoria: capta vendedores (relación/territorio/reputación), tasa y clasifica, decide canal, convoca compradores y concentra demanda, arma catálogos/logística, maneja documentación/DT-e/liquidación/cobro/comisiones/fletes, puede financiar o adelantar, absorbe riesgo de cobranza, y sostiene reputación de largo plazo.

| Proceso | Digitalizable | Comentario |
|---|---|---|
| Publicación de remates | **Alta** | Ya hay datos/calendario; falta integración automática |
| Distribución a audiencia | **Alta** | Email/WhatsApp/QR/alertas medibles ← **la cuña PRO** |
| Perfil institucional | **Alta** | Claims, verificación, condiciones |
| Captura de consultas | **Alta** | Form, WhatsApp tracking, CRM simple |
| **Resultados de remate** | **Media-alta** | **Requiere incentivo y estándar ← el moat** |
| Tasación de lote | Media | Orientativa; decisión humana queda |
| Comparación de consignatarias | Media | **Evitar ranking opaco/conflictivo** |
| Cobranza / garantía | Baja-media | Requiere contrato, capital, confianza |
| Reemplazar al consignatario | **Baja** | La relación personal ES parte del producto |

**Estrategia correcta: potenciar y medir a las consignatarias, no desplazarlas.** Williamson (costos de transacción): la confianza, la garantía de cobranza y la formación de precio no desaparecen con un botón — por eso el marketplace fracasa y ROSGAN (aliado de las casas) ya ganó el remate digital.

---

## 7. Problemas priorizados (por monetizabilidad, no por visibilidad)

| Rank | Problema | Pagador probable | Sev./frec. | WTP | Veredicto |
|---|---|---|---|---|---|
| **1** | Consignatarias necesitan que más productores vean sus remates (con medición) | Consignataria | Alta/alta | **Alta si hay ROI** | **Vender ahora (cuña)** |
| **2** | No existe referencia de precio confiable, histórica y citable para el ~90% que NO pasa por el concentrador | Institución/media | Alta/alta | Alta (no validada) | **El negocio de largo plazo** |
| **3** | Fijar/ajustar el canon de arrendamiento sin referencia verificable | Productor/institución | Media-alta/estacional | Media | **Punta de lanza (ya servida)** |
| **4** | Falta de datos estructurados para empresas/IA (API) | Empresa/dev | Media/media | Alta | Segundo motor |
| 5 | Precio publicado no traduce el neto final del lote | Consignataria/empresa | Alta/episódica | Baja directa | Herramienta gratis + lead |
| 6 | Saber quién opera en cada zona | Consignataria | Media/media | Media | Perfil verificado |
| 7 | Falta de resultados comparables por plaza | Empresas/consignatarias | Alta/media | Alta si histórico | **Moat a construir** |
| 8 | Dependencia de WhatsApp/planillas (casas chicas) | Consignataria | Media/alta | Media | CRM simple, fase 2 |
| — | Comparar/ranquear consignatarias | — | — | — | **Evitar ranking visible (conflicto)** |
| — | Intermediar la operación (marketplace) | — | — | — | **No (desintermediación → cortan dato)** |

El problema más visible (calendario/arrendamiento) trae tráfico; el más monetizable a corto (distribuir remates medibles) tiene menos glamour pero es cobrable en 90 días; el más monetizable a largo (referencia de precio del mercado opaco) es donde está el techo.

---

## 8. Jobs to Be Done (los que sostienen el negocio en negrita)

**Productor / arrendador:** **"Cuando arriendo un campo, necesito una referencia verificable y actualizada del novillo para fijar y ajustar el canon en kg/ha."** · "Cuando miro precios MAG/INMAG, necesito traducirlos a mi categoría/peso/flete/comisión/plazo para estimar el neto." · "Cuando decido vender o esperar, necesito referencia histórica y estacional, sin que una web reemplace a mi consignatario." · "Cuando pruebo una consignataria nueva, necesito señales verificables: actividad, remates, cobertura, condiciones, reputación."

**Consignataria:** **"Cuando organizo un remate, necesito que más productores y compradores correctos lo vean sin cargar la info en diez canales."** · "Cuando compito contra casas grandes, necesito demostrar actividad, especialidad y cobertura." · "Cuando pago publicidad, necesito medir visitas, consultas, WhatsApp clicks, leads."

**Institucional (el que paga de verdad a largo):** **"Cuando construyo modelos de precio/riesgo/valuación, necesito una serie normalizada, histórica, en USD, por API — no PDFs ni scraping frágil."** · **"Cuando desarrollo una app o un agente de IA, necesito una fuente estructurada, confiable y citable del precio del ganado argentino."**

---

## 9. Competencia y sustitutos (la competencia no es una plataforma)

| Sustituto/competidor | Fortaleza | Debilidad | Respuesta |
|---|---|---|---|
| **Relación de 20 años con el consignatario** | Confianza máxima, garantía | No comparable, dependiente de persona | **Complementar, no reemplazar** |
| **WhatsApp / grupos / llamada** | Inmediato, ubicuo, gratis | Desordenado, no indexa, sin memoria | Integrar links, alertas, QR, seguimiento |
| **MAG Cañuelas / INMAG (fuente)** | Índice oficial del gordo, gratis | Solo ~8% del mercado, sin USD/histórico normalizado | **Citar, enriquecer, no apropiarse — aliado** |
| **ROSGAN** | Remate pantalla líder, 11 casas, >5M cab | Es invernada; foco propio | **No competir frontal**: indexar/resultados |
| **Márgenes Agropecuarios** | 40 años cobrando por info, marca | Formato tradicional, no API/tiempo real | Referencia de WTP; complementar con dato vivo/API |
| **Agrofy / medios agro** | Audiencia enorme, precios gratis | Comoditiza el spot | Dato estructurado + índice propietario + herramientas |
| **Software consignatarias (Mantis/Physis/Calipso/Eternum)** | ERP instalado, switching costs | No es dato de mercado ni audiencia | **No entrar acá**; integrar/API |
| **Radios rurales / IPCVA / cámaras** | Confianza/autoridad regional | No resuelven remate/localidad | Alianzas, datos estructurados |

**Lecciones:** la competencia real del productor es **la confianza personal y el WhatsApp**, no un portal; el remate digital ya lo ganó ROSGAN; el precio spot está commoditizado y gratis → **el valor pago está en el dato procesado, normalizado, histórico y citable** (modelo Márgenes/CEPEA). Nadie ocupa el lugar de **índice de referencia normalizado con histórico USD y API** para el mercado opaco. Ese es el créneau.

---

## 10. Propuesta de valor (principal en negrita)

**Principal — Consignataria (cuña) e Institucional (prize):**
- **Consignataria:** *"Que tus remates y tu casa aparezcan cuando el productor está mirando el mercado, con contactos medibles y una presencia verificada — no depender de que te encuentren en un flyer viejo."*
- **Institucional:** *"La única serie normalizada, histórica (2015→) y en USD del precio del ganado argentino, por API y citable — para modelos de precio, riesgo, valuación y agentes de IA."*
- **Productor (gratis, es la audiencia):** menor costo de búsqueda, calendario unificado, referencia del canon, estimación del neto, alertas, historial, comparación **descriptiva** (no ranking).
- **Comprador/frigorífico:** descubrimiento de oferta, alertas por zona/tipo, series de precio.
- **Sponsors:** audiencia ganadera contextual + asociación con el índice (secundario).

---

## 11. Modelo de plataforma (a quién subsidiar, quién paga)

Plataforma multi-lado, pero **no automáticamente**: la audiencia gratuita NO genera por sí sola un mercado de dos lados.

| Lado | Recibe | Aporta | ¿Paga? | Conflicto |
|---|---|---|---|---|
| Productores | Info/alertas/herramientas gratis | Comportamiento, leads, intención | **No (subsidiado)** | Privacidad/confianza |
| Motores de IA | Dato estructurado/citable | **Citas → autoridad del índice** | **No (subsidiado)** | Commoditización |
| Consignatarias | Visibilidad, leads, analítica | **Remates + resultados** | **Sí (cuña)** | Temor a comparación |
| Compradores/frigoríficos | Oferta, series | Demanda, precios | Parcial/Sí | Desintermediación |
| Bancos/aseguradoras | Series, índices, valuación | Casos de uso | **Sí (prize)** | Responsabilidad |
| Medios/devs | Dato citable, endpoints | Distribución | Sponsor/Sí desde volumen | Apropiación |

**Subsidiar:** productor + IA (dan atención y autoridad). **Cobrar:** consignatarias (demanda medible) y empresas (datos/soporte/histórico/licencia). El **riesgo de desintermediación** se neutraliza **no intermediando**: la plataforma vive al costado de la transacción (dato, referencia, visibilidad), no en el medio. El efecto de red del dato: cada casa que carga resultados mejora la serie; cada institución que adopta el índice lo vuelve estándar (efecto CEPEA).

---

## 12. Arquitectura de ingresos priorizada (con números)

**No presentar publicidad, SaaS, marketplace y API como prioridades simultáneas. Priorización y secuencia:**

**1) PRO Consignataria / Alcance (cuña, meses 0–12):** cliente = casas regionales/cooperativas con remates. Unidad = suscripción mensual (+ fee por campaña/remate destacado eventual). Precio: **ARS 45.000/mes por 90 días**, objetivo 12m **ARS 75.000–120.000** al probar ROI. Margen 75–90% si se automatiza la carga. CAC bajo-medio (venta directa founder-led). Riesgo: no demostrar ROI; universo chico. Tiempo a ingreso: inmediato.

**2) Datos empresariales / API / MCP (prize, meses 6–36):** cliente = agtech, bancos, aseguradoras, feedlots, frigoríficos, media, consultoras. Unidad = plan mensual + licencia anual + reportes + soporte. Precios existentes: **Starter ARS 74.000 / Growth ARS 451.000 / Scale a medida**. Margen ~90% (soporte/SLA lo baja). CAC medio-alto, ciclo 2–9 meses. Riesgo: WTP no validada, dependencia de fuente. Escalabilidad alta.

**3) Patrocinios / reportes (caja secundaria rápida):** cliente = labs, nutrición, genética, bancos, seguros, media. Unidad = sponsor de El Corredor / índice / newsletter. Precio: **USD 300–1.500/mes** (mayor con reportes institucionales) — orden ARS 1–3 M/mes para sponsor principal. Riesgo: cuidar neutralidad (sponsor ≠ ranking).

**4) Leads / campañas (evolución de PRO):** ARS 5.000–25.000 por lead calificado o ARS 30.000–100.000 por remate/campaña cuando haya volumen. Riesgo: calidad de lead, privacidad.

**5) Servicios transaccionales/financieros:** **no prioritario antes de 24–36 meses**; requiere licencias, capital, cobranza, cumplimiento. Solo con datos de resultados + reputación + demanda probadas.

**Descartados como fuente primaria:** comisión transaccional (no intermediamos), publicidad display masiva (RPM baja), suscripción paga al productor (WTP nula).

---

## 13. Estrategia de datos (el verdadero moat)

| Dato | Fuente | Confiab. | Valor comercial | ¿Moat? |
|---|---|---|---|---|
| **INMAG serie diaria 2015→ (ARS+USD)** | MAG + construcción propia | Alta | **Alto** | **★ Sí (histórico+USD+método)** |
| **Índice arrendamiento normalizado** | MAG (haciinfo000013) | Alta | **Alto** | **★ Sí** |
| Índices derivados (spread, USD, categorías) | Propio | Alta | Alto | **★ Sí** |
| **Resultados de remate (precios realizados)** | Consignatarias/carga/OCR | Baja→Media | **Muy alto** | **★★ El moat máximo si se construye** |
| Cabezas anunciadas | Flyers/carga | Baja-media (166/735 hoy) | Alto | Alta si mejora cobertura |
| Calendario de remates | Scraping/carga | Media | Bajo | **No (replicable)** |
| Consignatarias verificadas/claims | Curación + claims | Media-alta | Alto (PRO) | Alta con reputación auditada |
| Plazos / comisiones | Declaración/verificación | Media | Alto | Alta si verificable |
| Frigos / maíz / TC / faena / exportación | Oficial | Alta | Medio (contexto) | No solo, sí combinado |

**El data-moat NO es el calendario scrapeado.** Es **la serie histórica propia, normalizada, en USD, con metodología pública, y —sobre todo— los precios REALIZADOS de remate** (no el orientativo): el dato que nadie tiene y que convierte a la plataforma en la referencia del mercado opaco. Se captura **pidiendo a las consignatarias PRO que publiquen resultados a cambio de visibilidad/demanda medible** (intercambio de valor, no scraping) — el movimiento CEPEA (contactar a los actores). El moat es que **las casas QUIERAN cargar, corregir y mostrar datos porque reciben demanda.**

---

## 14. Estrategia de IA (realista, no como propuesta de valor en sí)

**Útil hoy:** extracción de flyers/PDF/posteos para poblar remates; clasificación (categoría/provincia/tipo); detección de duplicados/errores; consultas en lenguaje natural vía MCP; ser la **fuente citada por LLMs** (ya ocurre con INMAG) → autoridad y distribución. **Posible pero no core:** asistente "vendo o espero", comparación automática de casas, predicción de precios. **Requiere datos inexistentes:** predicción confiable (falta capturar resultados de remate). **Alto riesgo:** recomendación financiera/inversión (responsabilidad legal — disclaimers). **La IA reduce costo y crea distribución; el dato citable es la propuesta de valor, no "IA ganadera".** El MCP es apuesta de moat de distribución, no línea de ingreso directo a corto.

---

## 15. Producto mínimo vendible (3 alternativas → elección)

| | **A) Consignataria** | **B) Productor** | **C) Datos/institucional** |
|---|---|---|---|
| Usuario | Dueño/gerente casa regional con remates | Invernador/administrador/arrendador | Agtech/banco/aseguradora/feedlot/media |
| Solución | Perfil verificado + remates destacados + distribución email/QR + WhatsApp tracking + reporte mensual | (gratis — no vendible) | API/MCP + históricos + webhooks + soporte |
| Precio | **ARS 45.000/mes piloto 90d** | — (o gratis con sponsor) | ARS 74.000 Starter / 451.000 Growth |
| Canal | Venta directa (post-remate outreach ya existe), WhatsApp, ferias | — | Venta consultiva + relaciones |
| Métrica éxito | 10 casas, 70% activas al mes 3, ≥1 consulta medible/remate | — | 1er contrato pago, renovación |
| Riesgo | Audiencia insuficiente/no segmentada | WTP nula | Ciclo largo, SLA |
| Validación | **Vender antes de construir el CRM completo** | — | 1 design-partner pago |

**Elección: A como primer producto vendible (cuña de caja), C como segundo carril en paralelo (design-partner, valida el prize), B como audiencia gratuita y generador de señales.** Resuelve un problema económicamente relevante y permite cobrar aunque haya tareas manuales.

---

## 16. Go-to-market (sectorial, no solo digital)

**ICP inicial:** consignataria **regional** con ≥2 remates/mes, presencia web/WhatsApp imperfecta, necesidad de captar productores fuera de su círculo, dueño/gerente accesible, dispuesta a mostrar datos y actualizar remates. (No la casa chica manual ni la nacional que ya tiene todo.)

**Regiones:** (1) Bs. As. interior + La Pampa (volumen/competencia/búsqueda); (2) Entre Ríos/Corrientes (el repo ya cubre remates NEA + red del fundador); (3) Córdoba/Santa Fe (densidad, feedlot/invernada).

**Oferta de entrada:** *"Piloto 90 días: cada remate tuyo publicado, destacado y distribuido; perfil verificado; QR para catálogo; reporte mensual con visitas, clicks y consultas. ARS 45.000/mes. Si no hay actividad medible en 60 días, se pausa sin penalidad."*

**Canales:** llamadas directas a dueños/gerentes; **el outreach post-remate ya existente**; visitas a remates/ferias; sociedades rurales y cooperativas; martilleros/representantes; newsletter El Corredor; **referidos** (un mes sin cargo por casa referida que active 90 días); alianzas con media/radio rural; contadores rurales (Estudio Zaracho como aliado/testimonio). **No solo marketing digital.** Ciclo de venta: PRO ~2–6 sem; patrocinio ~4–8 sem; API 3–9 meses.

**Objeciones:**

| Objeción | Respuesta |
|---|---|
| "Mis clientes ya me conocen" | No vendemos reemplazo; medimos demanda incremental cuando los productores buscan precios/remates |
| "No quiero ranking" | Perfil descriptivo, metodología pública, separación publicidad/orgánico |
| "No tengo tiempo de cargar" | Carga asistida inicial; luego WhatsApp/email o plantilla simple |
| "No sé si trae clientes" | Piloto con reporte mensual: UTM, WhatsApp clicks, leads |
| "Es caro" | vs. un aviso/flyer/remate con baja asistencia; ARS 45.000 es precio de aprendizaje |

---

## 17. Confianza y legitimidad (crítico en un mercado de relaciones)

Reglas no negociables: mostrar **fuente/fecha/alcance** de cada dato; **separar orgánico de destacado/pago**; **derecho a réplica y corrección visible**; perfiles reclamados con verificación de identidad/cargo; reviews moderadas (rol del remitente, sin acusaciones no verificables); no publicar "mejor consignataria" sin metodología y resultados; **diferenciar precio observado / estimado / resultado real**; privacidad de leads/IPs/consultas; **consejo asesor sectorial** (3 consignatarias regionales, 2 productores, 1 economista ganadero, 1 abogado/compliance — legitima el índice, movimiento CEPEA/academia).

**Cómo no ser percibido como amenaza:** vender *"alcance y confianza verificable"*, no *"te vamos a rankear"*. La comparación empieza por hechos (actividad, zonas, tipos de remate, condiciones declaradas, fuentes); el score reputacional, si existe, llega tarde y con explicación. Mensaje a las casas: *"te traemos al productor en su momento de decisión y le damos una referencia que legitima tu operación; no te comparamos ni te reemplazamos."*

---

## 18. TAM / SAM / SOM (bottom-up, no productores × suscripción)

**Verificado/interno:** 104 perfiles; 735 remates (283 futuros); 166 con cabezas (535.547); ~500 suscriptores newsletter; ~3.439 usuarios/30d.

**Supuestos de mercado (a validar):** consignatarias/operadores comercialmente relevantes alcanzables **250–400** (⚠️ el MAG tiene 45 firmas; el número nacional no es público — pedir padrón SIOCAL); casas dispuestas a pagar promoción medible en 36m **35–150** según escenario; clientes API/enterprise potenciales en Argentina **20–80** (agtech, medios, consultoras, bancos, aseguradoras, frigoríficos, apps); sponsors **5–25** marcas con presupuesto sectorial.

**Advertencia de escala (la que ata todo):** con un universo de ~250–400 consignatarias, **PRO Consignataria sola tiene techo bajo** (~USD 15–30k ARR). Para pasar de ahí, el driver **no** son más PRO sino **contratos API/datos institucionales de ticket alto (Growth/Scale) + licencias de serie histórica + sponsors**. El negocio es 80% función del **ticket y número de cuentas institucionales**, no de las consignatarias.

---

## 19. Modelo financiero mensual, 36 meses (fórmulas + escenarios + sensibilidad)

**Supuestos (explícitos, en USD reales para no fabricar precisión inflacionaria; cobros pueden ser ARS ajustados):** PRO sube de USD 45 a USD 65 equivalente; API incluye Starter/Growth y un Scale chico desde mes ~20; sponsors arrancan con audiencia probada; costos = desarrollo + datos + soporte + ventas + marketing + editorial + legal + admin + viajes; modelo **lean/founder-led** (sin equipo grande). Break-even base en **~mes 33**.

**Trayectoria base (hitos):**

| Mes | Consig. pagas | API eq. | Ingresos USD | Costos USD | Neto USD |
|---:|---:|---|---:|---:|---:|
| 3 | 3 | 0 | 135 | 4.500 | −4.365 |
| 6 | 10 | 2 Starter | 548 | 5.500 | −4.952 |
| 12 | 25 | 4 Starter + 1 Growth | 1.995 | 7.000 | −5.005 |
| 18 | 45 | 6 Starter + 2 Growth | 4.467 | 8.500 | −4.033 |
| 24 | 60 | 8 Starter + 3 Growth + 1 Scale chico | 7.389 | 9.500 | −2.111 |
| 30 | 72 | 10 Starter + 4 Growth + 1 Scale | 9.306 | 10.000 | −694 |
| **33** | **78** | **11 Starter + 5 Growth + 1 Scale** | **10.444** | **10.300** | **+144 ← break-even** |
| 36 | 85 | 12 Starter + 5 Growth + 1 Scale | 11.808 | 10.500 | +1.308 |

**Escenarios (MRR mes 36):** Conservador **~USD 3.575** (35 PRO + poco API → no alcanza escala, requiere costos muy bajos o pivot) · Base **~USD 11.808** (ARR run-rate ~**USD 142k**, break-even ~mes 33) · Expansivo **~USD 30.800** (ARR ~**USD 370k**; 150 PRO + API fuerte + sponsors → rentable y financiable).

**Métricas objetivo (base):** MRR m12/24/36 = USD 2.0k/7.4k/11.8k; margen bruto 75→85%; CAC PRO USD 100–350 / API USD 500–4.000; churn PRO 2–7% / API 1–5%; payback PRO 3–6m / API 4–12m; **costo de dato por cliente → marginal** (clave del margen).

**Sensibilidad (la palanca dominante):** si PRO queda en USD 35 y no sube → base pierde ~USD 2.550/mes al m36. Si no se cierran 3 Growth o 1 Scale → el m36 cae bajo break-even. Si la audiencia no supera ~10.000 usuarios/mes segmentados → el patrocinio es accesorio, no motor. **Si no se incorporan resultados de remate → la API queda expuesta a sustitución por scraping de fuentes públicas.** ⚠️ Además: llegar a **85 consignatarias pagas es agresivo** contra un universo de ~250–400 — es el supuesto más frágil del modelo; validar el padrón SIOCAL y la conversión real en los pilotos.

---

## 20. Riesgos (prob. × impacto × indicador temprano × mitigación)

| Riesgo | Prob. | Impacto | Indicador temprano | Mitigación |
|---|---|---|---|---|
| **Nadie institucional paga por el dato** | **Media-Alta** | **Crítico** | 0 contratos API a 90d | Design-partner YA; apoyarse en PRO+patrocinio |
| **No demostrar ROI a consignatarias** | Media | Alto | Baja conversión piloto→pago | Medir leads/clicks, reporte simple, prueba 90d |
| Universo consignatarias chico / techo bajo | **Alta** | Medio-Alto | ARR se estanca | Aceptar nicho; el prize es el dato institucional |
| Corte de la fuente de precio (MAG/scraping) | Media | Alto | Cambios ToS/estructura | **Serie propia**, múltiples fuentes, acuerdos |
| Baja WTP del productor | Alta | Medio | Pocos pagos | Productor gratis; monetizar B2B |
| Ciclo de venta API largo | Alta | Medio | Demos sin cierre | Starter técnico + casos + caja puente PRO |
| Conflicto por rankings | Media | Alto | Quejas/pedidos de baja | Sin ranking visible, réplica, metodología |
| Falta de resultados de remate | **Alta** | Alto | No hay comparación real | Producto de carga/acta de cierre con incentivo |
| Responsabilidad por recomendaciones | Media | Alto | Uso de "vendo ahora" como consejo | Disclaimer, rangos, no asesoramiento financiero |
| Baja frecuencia de uso del productor | **Alta** | Medio | Retención mensual baja | Alertas, arrendamiento (estacional-recurrente), digest |
| Competidor institucional (cámara/media/ROSGAN) | Media | Alto | Lanzan índice/directorio rival | Moat de histórico + citación IA + ser primero |
| Concentración de ingresos | Media | Medio | 2 clientes = >40% MRR | Diversificar PRO/API/sponsors |
| Privacidad/leads (PII) | Media | Alto | Reclamos | Consentimiento, minimización, RLS, retención |

**Los dos riesgos que definen el negocio:** que el dato institucional no tenga pagador, y que el mercado sea estructuralmente chico. Ambos se testean en 90 días.

---

## 21. Plan de investigación primaria (45 días, preguntas sobre hechos, no hipótesis)

**Muestra mínima:** 20 productores (cría, invernada, CC, feedlot, cabañas, chicos, medianos, empresas, NEA/pampeana/extrapampeana); 15 consignatarias (nacionales, regionales, cooperativas, locales, digitalizadas y manuales); 10 otros (compradores, frigoríficos, bancos, aseguradoras, sociedades rurales, veterinarios, CREA, media).

**Productor (última operación real):** "Contame tu última venta: categoría, canal, casa, fecha, plazo, por qué ese canal / qué alternativas descartaste / cómo supiste si el precio fue bueno / qué gasto te sorprendió en la liquidación / la última vez que buscaste precio online, qué hiciste después / qué información NO le darías a una plataforma / qué presupuesto ya pagás (asesor, software, informe, grupo, publicidad, comisión) / la última vez que fijaste un arrendamiento, cómo calculaste el canon."

**Consignataria:** "Último remate: cómo lo difundiste, cuánto costó, qué funcionó / cómo captás productores nuevos / dónde perdés tiempo cargando datos / consultas por WhatsApp: cómo las seguís / qué NO querés publicar / cómo medís si un remate tuvo buena convocatoria / cuánto gastás/mes en flyers/redes/medios/radio/web/sistemas / qué pagarías si trae consultas medibles / qué te daría miedo de una comparación pública."

**Empresa/API:** "Qué dato consumís hoy y cómo / qué scraping/planilla querés dejar de mantener / frecuencia, criticidad, tolerancia a error / presupuesto actual en datos/reportes/software / requisitos de licencia/SLA/soporte/histórico / qué endpoint justificaría pagar este mes."

**Datos a cerrar:** padrón SIOCAL de consignatarios; precio de Márgenes Agropecuarios y del software de consignatarias (calibrar WTP); % de arrendamiento **ganadero**; estudio con ponderación de criterios de elección de canal.

---

## 22. Roadmap (4 etapas, con criterio de avanzar/detener)

**Días 1–30 — Validar el pagador inicial.** Producto: PRO Consignataria piloto + primeras conversaciones institucionales. Cliente: 20 casas contactadas + 3 prospectos institucionales. KPI: llamada→demo >25%, demo→piloto >20%, ≥5 pilotos con compromiso, ≥3 conversaciones institucionales con interés de presupuesto real. **Avanzar si** ≥5 casas aceptan piloto. **Detener/pivotar si** ninguna paga y no hay interés institucional.

**Días 31–90 — Primer ingreso.** Producto: perfil verificado + remates destacados + email/QR + WhatsApp tracking + reporte mensual; 1 API design-partner; 1 sponsor de El Corredor/arrendamiento. KPI: **≥7 PRO pagando + 3 testimonios, 1 sponsor pago, 1 design-partner API firmado; ≥ARS 3M MRR combinado; 60% renueva.** **Avanzar si** hay MRR recurrente + una renovación. **Detener/pivotar si** 0 cierres pagos → la hipótesis de WTP falló.

**Meses 4–12 — Repetibilidad + moat de datos.** Producto: PRO v2 (onboarding automatizado) + API Starter/Growth empaquetada + reporte patrocinable; empezar a capturar resultados de remate. Cliente: ~25 consignatarias, ~5 API, 1 sponsor. KPI: MRR ~USD 2.000 eq., churn <6%, remates >90% frescos, primeros resultados en la serie. **Avanzar si** hay PMF en al menos una línea (retención + expansión).

**Meses 13–36 — Escala nacional e institucional.** Producto: resultados de remate + históricos + API/licencias + reportes + CRM liviano + consejo asesor. Cliente: ~85 consignatarias, ~18 API, sponsors. KPI: ARR base ~USD 142k (expansivo ~370k), break-even ~mes 33, 40% de remates con resultados, 3 clientes institucionales, citación IA dominante. **Servicios financieros/transaccionales solo si fueron validados** (datos de resultados + reputación + partner regulado). **No avanzar si** el dato propio no supera a las fuentes públicas.

---

## 23. Bibliografía (fuentes con fecha; detalle por dato en §3)

**Interno (repo, 11-jul-2026):** `consignataria-slugs.ts` (104 perfiles); `remates.json` (735 remates, 166 con cabezas=535.547); `frigorificos.json` (1.102); `market-prices.json` (INMAG $4.141,85; arrendamiento $4.198); `docs/ga4-growth-2026-07-09.json`; `docs/gsc-data-2026-07-08.json`; `PlanesToggle.tsx` (precios PRO/API); `POSITIONING-THESIS.md`.

**Sectorial/oficial:** SAGyP/MAGyP (Caracterización Producción Bovina 2024; faena; SIO-Carnes); SENASA (existencias, vacunación, estratificación; SIOCAL ex-RUCA); IPCVA (faena, exportación, formación de precios); INDEC (CNA 2018, conectividad); BCR (informativos 2025: stock, carnes, erogación, márgenes); MAG Cañuelas (INMAG, haciinfo000013); ROSGAN; Consorcio ABC; CICCRA; CACG; CCDH; INTA (márgenes ciclo completo; conectividad rural 2025; adopción digital); CREA (Outlook Ganadero 2026); FAUBA; Márgenes Agropecuarios; Compañía Argentina de Tierras (arrendamientos); Diez M. (UNS, circuitos de comercialización SO bonaerense); RAPA/AAPA (estratos SENASA 2022); Dictamen DAT 77/05 (IVA comisiones); BCRA (macro); FAO/Banco Mundial (marco de sistemas de información de mercado, aplicar con cautela a Argentina).

**Faltan por completar (antes de levantar capital/firmar institucional):** padrón/cantidad de consignatarias activas (SIOCAL); gasto publicitario real de las casas; gasto en software de consignatarias; uso digital por segmento; financiamiento ganadero bancario; comisiones/plazos reales verificados.

**Marcos aplicados:** Williamson (costos de transacción → por qué el marketplace falla y el consignatario persiste); Akerlof/asimetría (el índice y la verificación reducen el "limón"); teoría de agencia (la casa actúa por el productor pero tiene incentivos propios → transparencia cuidadosa); Rochet-Tirole / plataformas multi-lado (subsidiar al productor solo si otro lado paga; tráfico ≠ demanda); Rogers (difusión gradual → empezar como complemento a WhatsApp/relaciones); Porter (sustituto principal = relación personal; barrera = datos/verificación, no UI); RBV (recurso valioso/raro/inimitable = resultados verificados + red de casas + histórico propio); Lean Startup (validar con ventas reales antes de construir el SaaS). *Comparable: CEPEA/B3 Brasil — un índice académico devino la capa de settlement de todo un mercado.*

---

## 24. RECOMENDACIÓN FINAL (inequívoca)

**Qué debe ser:** la **infraestructura neutral de información y datos del mercado ganadero argentino, con el índice de referencia como activo central** — "el precio de referencia del ganado argentino". Gana primero la posición de fuente confiable y útil (con la audiencia gratuita del productor + la citación de IA), y la monetiza B2B en dos motores secuenciados: **PRO Consignataria como cuña de caja (0–12m)** y **datos/API institucionales como el prize y el moat (6–36m)**. El motor 1 financia y alimenta al motor 2.

**Qué NO debe ser:** marketplace transaccional (Williamson; ROSGAN ya ganó el remate digital); SaaS/ERP completo de gestión (ocupado: Mantis/Physis/Calipso); terminal paga al productor (WTP nula, spot gratis); comparador con ranking agresivo (conflicto → bloqueo de la fuente); medio de publicidad programática (audiencia y RPM chicos); IA como producto principal (es palanca, no propuesta).

**Quién paga y por qué:** (1) **Consignatarias** — necesitan demanda, visibilidad y medición de sus remates (cuña, cobrable ya). (2) **Empresas/instituciones** (bancos, aseguradoras, feedlots, exportadores, media, devs/IA) — necesitan una serie normalizada, histórica, en USD y citable, por API, que **no existe en ningún otro lado** (el prize, el margen y el moat). (3) **Sponsors** — audiencia ganadera contextual + asociación con el índice (secundario).

**Primer producto pago:** **PRO Consignataria — Alcance de remates + perfil verificado** (perfil reclamado/verificado, remates destacados, distribución email/newsletter, tracking WhatsApp/clicks/leads, QR de catálogo, reporte mensual). En paralelo: **1 design-partner de API** (valida el prize) y **1 sponsor de El Corredor / arrendamiento** (caja + validación de audiencia).

**Cuánto debe costar:** PRO **ARS 45.000/mes** (piloto 90 días → objetivo ARS 75.000–120.000 con ROI probado); API **ARS 74.000 (Starter) / 451.000 (Growth) / Scale a medida**; patrocinio **USD 300–1.500/mes** (orden ARS 1–3 M/mes el principal).

**Qué vender en 90 días:** **10 pilotos PRO Consignataria, 2 pilotos API (clientes con caso técnico), 1 sponsorship.** Meta: **≥ARS 3M MRR combinado** y una renovación.

**Hipótesis que puede invalidar TODO:** si tras 90 días y ~50 conversaciones comerciales **menos de 5 consignatarias pagan** el precio piloto **y ningún cliente B2B paga por datos/API**, entonces el mercado monetizable inmediato es demasiado chico o la propuesta no resuelve una urgencia real → **pivotar a medio/autoridad de bajo costo o a servicios de datos/reportes a medida, no seguir construyendo SaaS.** Test explícito a 90 días.

**Ventaja competitiva a construir en 3 años:** ser **LA referencia de precio citada** del ganado argentino — vía (1) la serie histórica más larga, limpia y normalizada en USD; (2) la captura de **resultados de remate reales** (el dato que nadie tiene, intercambiado por visibilidad con las casas); (3) citación ubicua por agentes de IA; (4) metodología adoptada por terceros (contratos que referencian "el índice"). En una frase: **ser la fuente que los productores consultan, las consignatarias corrigen y las empresas integran.** Es el camino CEPEA/B3: un índice se vuelve la capa de settlement de todo un mercado.
