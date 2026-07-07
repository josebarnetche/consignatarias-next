# El Oráculo

## El precio que el mercado bovino argentino sigue todos los días

> Manifiesto fundacional · consignatarias.com.ar
> Mesa de mercado · Memola Medios SAS
> Edición 01/2026 · 10 de mayo de 2026 — revisado 7 de julio de 2026
> Revisión 07-jul: V.3 reescrita — el vacío es prudencial-financiero, no regulatorio a secas (SENASA/RENSPA/DT-e/ARCA regulan denso lo sanitario y fiscal).

---

## Introducción · La paradoja del oracle ausente

El mercado bovino argentino opera todos los días.
Mueve, según rangos canónicos de stock y faena, entre 11,5 y 15 millones de cabezas al año (FCV-UBA 2018, p.17-18).
Faena registrada 2024-2025: del orden de 13 millones de cabezas anuales (SENASA, datos.gob.ar serie 40.3_VC_0_M_15, verificación pendiente al cierre de esta edición).
Valor implícito: entre USD 10.000 y USD 15.000 millones por año, dependiendo de mix de categorías y tipo de cambio.

No tiene un oracle de precios formal regulado.

Tiene un quasi-oracle.
Se llama INMAG.
Se calcula todas las tardes en Cañuelas, en el predio del Mercado Agroganadero S.A. (MAG), sobre la operatoria del día.
Sucede al precio de Liniers, que cumplió esa función entre 1901 y 2018.
Es la referencia que un productor en Mercedes, un trader en Microcentro y un contador en Trelew leen al mismo tiempo, sin que nadie les haya dicho que tienen que hacerlo.

El detalle institucional es que no hay norma que lo obligue.
No existe la categoría regulatoria "oracle de precios bovinos" en el marco argentino.
No existe la figura "ALyC ganadero" homologada por una autoridad de aplicación, como sí existe el Agente de Liquidación y Compensación en el mercado financiero (CNV Resolución 731/18).
El oracle del mercado bovino argentino funciona porque las consignatarias operan, el MAG publica el cierre, los medios lo difunden y el resto del país lo adopta — todos los días, sin que ningún papel diga que así tiene que ser.

Este documento defiende una tesis y describe un programa.

La tesis: **el INMAG es el único precio público auditable del mercado bovino argentino, hoy es el quasi-oracle del sector y consignatarias.com.ar es la mesa que lo lee para el resto del país**.
El programa: convertir esa lectura en infraestructura de información —con metodología abierta, cadencia diaria y archivo público, legible tanto por personas como por las máquinas y los agentes de IA que hoy consultan el dato.

Cita textual de la cátedra FCV-UBA 2018, p.3:

> "[Liniers] es el mercado formador y regulador de los precios que alcanza la hacienda para faena. Estos precios se calculan al final de cada jornada y sirven de guía para todas las transacciones de los demás sistemas de comercialización del país."

Esa función no desapareció con el cierre de Liniers en 2018.
Migró al MAG.
Se observa todos los días.
No está consolidada en bibliografía académica post-2018 (vacío E5 del inventory del workspace de research; verificación pendiente).

Por eso, el manifiesto.

---

## I. Qué era Liniers

### I.1 Origen

Mercado de Liniers, en su forma reconocible, se emplazó el 1º de mayo de 1901 en el barrio Mataderos de la ciudad de Buenos Aires, sobre 31 hectáreas (FCV-UBA 2018, p.2; Iriarte 2008, p.99).
Antecedente formal: el Cabildo de Buenos Aires creó "un corral de vacas" por resolución de octubre de 1607 (FCV-UBA 2018, p.2).

Durante el siglo XX operó como mercado nacional concentrador.
Propiedad del Estado Nacional bajo dependencia del Ministerio de Economía hasta 1991.
Privatización en 1991: pasó a ser **Mercado de Liniers S.A.**, una sociedad anónima propiedad de un grupo de 100 consignatarios fundadores; al cierre del libro Iriarte (diciembre 2008), 55 firmas seguían en actividad dentro del predio (FCV-UBA 2018, p.3; Iriarte 2008, p.99).
Operatoria física: 421 corrales de depósito, 1.975 corrales de venta, 163 personas en planta operativa (Iriarte 2008, p.99).

Resoluciones sanitarias relevantes:

- 1983 y 1985 — se prohíbe el egreso de animales del mercado con destino a engorde, por brotes de aftosa (FCV-UBA 2018, p.3).
- 1º de octubre de 1999 — Resolución 1023 de SENASA: libre egreso de animales desde Liniers y demás mercados concentradores con destino a invernada (FCV-UBA 2018, p.3).

Operatoria semanal histórica (cifras Iriarte 2008, p.99-100):

- Lunes: ~3.000 cabezas
- Martes: ~8.000
- Miércoles: 8.000-10.000
- Jueves: 1.000-3.000 (día de remates especiales: Angus, Hereford, aniversarios, beneficio)
- Viernes: 10.000-11.000 (día de mayor actividad)

Pico histórico de cobertura sobre la faena nacional: **34% en 1967** (Iriarte 2008, p.105).
Para el 2007, último año completo de Iriarte, había caído al **10,1%** (Iriarte 2008, p.105).
Cerró su operatoria física en 2018 (RESOL-2018-32 APN-SGA #MPYT, verificación pendiente sobre número exacto y texto).

### I.2 Las cinco razones por las que Liniers fijaba el precio

La cátedra FCV-UBA 2018 (p.3) enumera por qué Liniers funcionaba como oracle aunque concentrara menos del 15% del volumen físico:

1. **Cantidad de animales encerrados a diario.** Volumen mínimo viable para sostener subasta pública continua.
2. **Venta pública.** Subasta a viva voz, martillero, oferta y demanda observables.
3. **Pesada en balanza pública.** Auditada, no librada a la palabra del comprador.
4. **Amplia difusión.** Radial, televisiva, internet y escrita.
5. **Condición de mercado abastecedor del núcleo humano numéricamente más importante.** Buenos Aires + conurbano.

A esas cinco se suman, leyendo Iriarte 2008, dos rasgos institucionales no triviales:

6. **Cobrabilidad cercana al 100%.** Iriarte 2008 (p.89, 101) documenta cobrabilidad del 100% en Liniers durante los once años previos a la edición (1997-2008). En el resto del mercado de hacienda gorda, el índice fue del 99,5% sobre USD 40.000 millones transados en la década del '90. Los incobrables se concentraban estructuralmente en las operaciones directas sin intervención de consignatario.
7. **Clearing solidario.** Funcionaba un comité de inscripciones que examinaba la solvencia de los compradores; el que dejaba de cumplir no volvía a operar (Iriarte 2008, p.101).

Difusión cuantificada:

- Sitio web del Mercado de Liniers: **más de 15.000 visitas/día** (Iriarte 2008, p.103-104).
- **1.100 repetidoras de Canal Rural** difundiendo precios en tiempo real (Iriarte 2008).
- Programación radial de AM nacional con el cierre del día.

Iriarte (p.104) registra una observación sui generis:

> "Liniers no tiene equivalente mundial."

Era el último gran mercado concentrador presencial de hacienda en pie de un país desarrollado en términos cárnicos. Brasil, Estados Unidos, la Unión Europea, Australia, Uruguay habían reemplazado sus equivalentes por sistemas de price discovery descentralizado (subasta electrónica, encuestas oficiales, futuros). Argentina mantuvo Liniers operando con martillero hasta 2018.

### I.3 Operatoria interna

Dentro del predio convivían dos modalidades (Iriarte 2008, p.100):

- **Remate público (60%):** subasta abierta, a viva voz, con martillero.
- **"Venta al oído" (40%):** negociación privada después del remate, tomando como referencia los precios pagados momentos antes.

Plazos de pago (Iriarte 2008, p.100):

- 10% contado.
- El resto, con plazos de 48 horas a 25 días.

Concentración en la oferta consignataria (Iriarte 2008, p.99):

- Las 10 primeras firmas = 45% del volumen comercializado.
- Las 20 primeras = 70%.
- Las 30 primeras = 87%.
- Las 40 primeras = 95%.

Estructura de la demanda (Iriarte 2008, p.103):

- ~20 frigoríficos consumeros a nombre propio.
- Media docena de cadenas de supermercados con alcance nacional (cada vez menos hacia el final del período).
- ~200 matarifes inscriptos.
- De las 80.000-100.000 cabezas/mes que compraban los matarifes, el 80% se concentraba en cerca de un centenar.

Era un mercado oligopólico en la oferta y concentrado en la demanda. La transparencia no provenía de la atomización de los agentes — provenía del **acto público de cierre diario** y de la difusión inmediata.

### I.4 Cronología corta

| Año | Hecho | Fuente |
|---|---|---|
| 1607 | Cabildo de Buenos Aires crea "un corral de vacas" | FCV-UBA 2018, p.2 |
| 1901 (1º mayo) | Liniers se emplaza en Mataderos, 31 ha | FCV-UBA 2018, p.2; Iriarte 2008, p.99 |
| 1922 | Cámara de Subproductos Ganaderos (fija precios sebo Bolsa BA) | Iriarte 2008, p.205 |
| 1967 | Liniers alcanza máximo histórico: 34% de la faena nacional | Iriarte 2008, p.105 |
| 1972 | Inicio de series oficiales de precios | Iriarte 2008, cap.6 |
| 1978 | Resolución 1235 JNC define "Consignatario Directo" (gancheras) | Iriarte 2008, p.117 |
| 1983 y 1985 | Resoluciones que prohíben egreso para engorde por aftosa | FCV-UBA 2018, p.3 |
| 1990 | Liniers = 19,6% de la faena nacional (2,63 M cab) | Iriarte 2008, p.105 |
| 1991 | Privatización — Mercado de Liniers S.A. | FCV-UBA 2018, p.3 |
| 1995 | Liniers + Rosario = 17% del volumen comercializado | Iriarte 2008, p.1 |
| 1999 (1º oct) | Resolución 1023 SENASA: libre egreso para invernada | FCV-UBA 2018, p.3 |
| 2001 | Liniers toca 20,8% de la faena nacional (pico moderno) | Iriarte 2008, p.105 |
| 2002 | Crisis bancaria; mercados suben a 16,4% (productores prefieren cash) | Iriarte 2008, p.1 |
| 2005 (fines) | Secretaría de Comercio impone "precios sugeridos" en Liniers | Iriarte 2008, p.105 |
| 2007 | Liniers = 10,1% de la faena nacional (mínimo moderno) | Iriarte 2008, p.105 |
| 2014 | Disolución de ONCCA | Verificación pendiente |
| 2018 | Cierre operativo de Liniers; mudanza a MAG-Cañuelas | RESOL-2018-32 APN-SGA, verificación pendiente |
| 2024 (jul) | Decreto 640/2024 — marco CD+W tokenizado (RWA) | Verificación pendiente |

Lectura del timeline.
Liniers tardó 117 años en consolidarse y 11 en perder casi la mitad de su volumen (2001-2012). La intervención de la Secretaría de Comercio en 2005-2008 — los precios sugeridos — explica buena parte del deterioro: la subasta dejó de ser libre y los productores derivaron al directo (Iriarte 2008, p.105).
El cierre físico de 2018 fue el corolario, no el inicio, de un proceso de 13 años.

---

## II. Por qué Liniers fijó el precio del 88% restante

### II.1 La paradoja de cobertura

Liniers, en su mejor década moderna (1995-2005), nunca superó el 20% de la faena nacional.
En su último año documentado (2007), apenas concentró el 10,1% (Iriarte 2008, p.105).
La cifra agregada de "mercados concentradores" — Liniers + Rosario + Tucumán + Córdoba — alcanzaba el 12% del volumen total comercializado en 2007 (Iriarte 2008, p.1; FCV-UBA 2018, p.2).

Y, sin embargo, ese 12% fijaba el precio para el 88% restante.

El radio efectivo de influencia: **800 km a la redonda de la Capital Federal** (Iriarte 2008, p.103-104).

> "Los mercados ganaderos, en un radio de 800 km. de la Capital Federal, fijan sus precios arbitrándose con Liniers; los valores del ganado tienen un piso determinado por los precios pagados en Liniers, menos el flete y los gastos de comercialización." (Iriarte 2008, p.103-104)

La cita es operativa, no retórica.
La fórmula implícita: **Precio interior = Precio Liniers − flete − costos de comercialización**.
Diez 2020, doce años después, mide ese diferencial en una operación-tipo del Sudoeste Bonaerense: **+8,63% premium Liniers sobre SOB el 27/05/2020** (Diez 2020, p.29). La distancia: 660 km. La fecha: un punto único de un día.

### II.2 Por qué funcionaba

Las cinco razones de formación de precio listadas por la cátedra FCV-UBA 2018 son condiciones de price discovery, no de volumen.
Un mercado concentrador no necesita mover el 50% del país para fijar precio.
Necesita ser:

- Público.
- Auditado en tiempo real.
- Difundido masivamente.
- Operado por intermediarios con cobrabilidad institucionalizada.
- Geográficamente cercano al nodo de consumo principal.

Liniers cumplía las cinco. El directo en estancia no cumple ninguna. El remate-feria cumple parcialmente la primera (es público pero local), la tercera (difusión limitada al área de influencia del consignatario) y la cuarta. Los remates online — Rosgan, Plaza Rural, MEGANAR en su momento — cumplen las cinco a nivel técnico pero, según el diagnóstico cuádruple coincidente de FCV-UBA 2018, Iriarte 2008, Diez 2020 y Scoponi-Santi 2018, no logran masa crítica de oferta.

### II.3 El detalle del clearing

Cobrabilidad documentada (Iriarte 2008, p.89, 101):

- Liniers, últimos 11 años pre-2008: **100%**.
- Resto del mercado de hacienda gorda con intervención de consignatario (década del '90): **99,5%** sobre USD 40.000 millones transados.
- Incobrables del mercado gordo: ~USD 180 millones acumulados en una década.
- Concentración de incobrables: **directo a frigoríficos y matarifes-abastecedores, sin intervención de consignatario** (Iriarte 2008, p.89).

Esto es lo que la mesa llama, internamente, **el moat institucional del consignatario**.
No es la tecnología de subasta. No es el martillero. Es el clearing.
El productor que vende en Liniers no cobra porque el comprador es solvente. Cobra porque, si el comprador no paga, **otros consignatarios responden** vía fondo de garantía, y el comprador queda excluido del mercado (Iriarte 2008, p.101).
Esta es la lectura más importante del libro de Iriarte: el consignatario no vende precio, vende cobranza.

### II.4 Difusión como infraestructura

El precio Liniers se publicaba (Iriarte 2008):

- En el sitio web del mercado, con más de 15.000 visitas/día.
- En 1.100 repetidoras del Canal Rural.
- En AM Las Vacas y otros programas radiales.
- En los principales diarios (Clarín Rural, La Nación Campo, La Voz del Interior).

La difusión no era marketing — era infraestructura.
Sin esa cobertura, el precio Liniers no podría haber sido benchmark del país.

Lo dice FCV-UBA 2018, p.3:

> "Estos precios se calculan al final de cada jornada y sirven de guía para todas las transacciones de los demás sistemas de comercialización del país."

"Sirven de guía". No "se imponen". No "se replican".
La adopción es voluntaria pero universal — porque alternativas auditables no hay.

---

## III. El cierre de 2018 y lo que vino

### III.1 Por qué cerró Liniers

El cierre del Mercado de Liniers en 2018 obedeció a una combinación de factores que la bibliografía leída (FCV-UBA 2018, Iriarte 2008, Diez 2020, Scoponi-Santi 2018) anticipa pero no documenta como evento consumado, porque tres de los cuatro trabajos son anteriores o contemporáneos al cierre.
Los factores convergentes:

- **Densidad urbana de Mataderos.** 31 hectáreas en CABA, rodeadas de uso residencial.
- **Costos operativos crecientes.** Canon a SAGPyA, salarios, instalaciones envejecidas.
- **Lobby Cañuelas.** El proyecto de relocalización en MAG-Cañuelas, sobre 100+ hectáreas, ofrecía ventajas logísticas (acceso autopista, ruta 3).
- **Cambios de modalidad.** El directo en estancia ya movía el 71% del volumen (FCV-UBA 2018, p.2). El mercado físico, aún funcional como oracle, era operativamente innecesario para la mayoría de los participantes.
- **Intervención previa (2005-2008).** Los "precios sugeridos" de la Secretaría de Comercio habían erosionado la credibilidad del cierre como referencia libre (Iriarte 2008, p.105).

Resolución de cierre: **RESOL-2018-32 APN-SGA #MPYT** (referencia documentada en cross-reference matrix; verificación textual pendiente al cierre de esta edición).

### III.2 La continuidad en MAG-Cañuelas

El Mercado Agroganadero S.A. (MAG-Cañuelas) absorbió la operatoria.
Hereda:

- Las firmas consignatarias que operaban en Liniers (las 55 activas a 2008 más altas posteriores).
- La metodología de subasta pública con martillero.
- El cierre diario con cálculo de precio promedio ponderado.
- La difusión radial, televisiva, web.

Estrena:

- Instalaciones nuevas, mayor capacidad.
- Acceso por autopista, sin restricción urbana.
- Mejor logística de jaulas.

El precio que publica MAG-Cañuelas se conoce hoy como **INMAG — Índice del Mercado Agroganadero**.
Es el sucesor directo del precio Liniers.
Es el precio que consignatarias.com.ar publica diariamente, con serie reconstruida que empalma hacia atrás hasta 2015.

### III.3 El vacío académico post-2018

Aquí la mesa debe ser explícita.
La bibliografía académica argentina sobre el rol oracle de MAG todavía no se consolidó.
La cátedra FCV-UBA 2018 escribió antes del cierre (su edición es contemporánea pero el contenido refleja datos pre-2018).
Iriarte 2008 documentó el deterioro pre-cierre pero no vivió el evento.
Diez 2020 menciona el precio Liniers como referencia operativa el 27/05/2020 — dos años después del cierre físico — lo que sugiere que en la práctica el sector siguió llamando "precio Liniers" al precio MAG durante años (Diez 2020, p.29).
Scoponi-Santi 2018 no aborda el cierre.

CNDC 2017 (referencia citada en inventory y cross-reference matrix, no leída a fondo en esta sesión) trata el mercado pre-cierre.
Posibles fuentes 2018-2026 a verificar en próximas ediciones (verificación pendiente): Scoponi 2021 INTA, Iglesias-Ghezan 2010 INTA, Ponti 2011, Otaño 2005.

Este vacío — sin obra académica consolidada sobre la función oracle de MAG-Cañuelas — es **una de las razones por las que se publica este manifiesto**.

---

## IV. El 88% que no tiene huella de precio

### IV.1 La cuantificación

FCV-UBA 2018 (p.2) reporta el split de canales:

| Canal | % volumen 2018 | Tendencia |
|---|---|---|
| Ventas directas (en estancia, sin paso por mercado) | **71%** | en aumento |
| Mercados concentradores (Liniers + Rosario + Tucumán + etc.) | 12% | en baja relativa |
| Remates-feria | 9% | en retroceso estructural |
| Mercado de reses (al gancho) | 2% | estable |

Iriarte 2008 (p.1, Tabla 1) descompone con mayor granularidad sobre 1,3 millones de cabezas/mes en 2007:

| Canal ONCCA | % 1995 | % 2002 | % 2004 | % 2007 |
|---|---|---|---|---|
| Mercados concentradores (MM) | 17,0% | 16,4% | 16,6% | 11,9% |
| Remates-feria (RF) | 15,0% | 11,8% | 10,0% | 9,2% |
| Consignatarios Directos / Gancheras (CD) | 7,5% | 3,5% | 3,0% | 1,7% |
| Directo **sin** intervención (EE+EF) | 41,5% | 44,0% | 41,1% | **54,6%** |
| Directo **con** intervención (DI+DF) | 19,0% | 15,3% | 22,2% | 17,5% |
| Negro / no registrado | 8,3% | 9,0% | 7,0% | 5,0% |
| **Total** | 100% | 100% | 100% | 100% |

Fuente: ONCCA — Iriarte 2008, p.1.

La columna 2007 es la base bibliográfica más sólida que existe sobre composición de canales en Argentina.
El 71% de FCV-UBA 2018 es la suma de los renglones "directo sin intervención" + "directo con intervención" del Iriarte 2008 con ajuste a tendencia 2007-2018.

### IV.2 La diferencia entre "directo" y "directo sin huella"

La distinción es metodológica y crítica para storytelling.

- **Directo sin intervención (EE + EF):** productor vende directamente al frigorífico o matarife. No hay consignatario. No hay subasta. No hay difusión pública del precio. **No hay huella observable**. En 2007: **54,6% del volumen nacional** (Iriarte 2008, p.1).
- **Directo con intervención (DI + DF):** productor vende a frigorífico/matarife con consignatario actuando como agente. El precio se acuerda en privado pero el consignatario garantiza cobranza. **No hay huella pública del precio**, pero hay registro institucional. En 2007: 17,5%.
- **Negro / no registrado:** ~5% en 2007, ~78% del volumen total computando todo el subtotal "fuera de mercado público" (Iriarte 2008, p.1).

Suma "fuera de mercado público" 2007: **54,6% + 17,5% + 5% ≈ 77,1%**.
FCV-UBA 2018 reporta tendencia creciente en el directo. Estimación direccional al 2024-2026 (verificación pendiente): el subtotal "fuera de mercado público" podría estar en el 78-82% del volumen nacional.
Esto es lo que la mesa llama, internamente, **el canal fantasma**.

### IV.3 Lo que el INMAG no ve

Implicaciones del canal fantasma:

- **Arrendamientos.** Indexaciones por kilo vivo se calculan usando INMAG. Si INMAG refleja solo el 12% del volumen, el otro 88% no tiene defensa contractual contra divergencia regional.
- **Contratos forward.** Sin precio observable público, los contratos a plazo se referencian al INMAG por defecto, transfiriendo el riesgo base al productor.
- **Indexación de costos del feedlot.** El compromiso de devolución se ata al INMAG. Cualquier divergencia entre INMAG y precio realizable es asumida por el productor o el comprador, sin compensación.
- **Tributación.** La AFIP utiliza INMAG como referencia para tasación de retenciones. Sin observabilidad del precio real del 88%, hay margen de subdeclaración no auditable.
- **Crédito ganadero.** Garantías reales sobre hacienda se valúan al INMAG. Sin captura del 88% real, las garantías son sub o sobrevaluadas.

El productor que opera fuera del MAG paga el costo de la opacidad sin verlo.
El productor que opera dentro del MAG paga la comisión del consignatario y recibe a cambio cobranza + difusión pública.

### IV.4 La paradoja del oracle restringido

El INMAG es preciso para el 12% que lo compone.
Es referencia útil — pero no garantía — para el 88% que lo sigue.

Esta no es una crítica al INMAG.
Es una descripción de su cobertura.

Lo que está faltando, y la sesión 8 del workspace de research lo identifica como gap real del sector (referencia interna, no publicada), es la **captura del 78% privado**.
No con un INMAG ampliado. No con un VWAP del MAG.
Con un **observable price universe** que reconstruya, mediante buckets granulares y modelo estadístico bayesiano jerárquico, el precio real del directo.

Esa construcción excede el alcance de este manifiesto.
Lo importante, al cierre de esta edición, es nombrar el vacío.
**El precio del 78% argentino no se observa públicamente.**
Lo que el INMAG fija para el 12% es lo más cercano que hay a una referencia auditable.
El resto se opera sobre confianza, contrato bilateral y memoria institucional del consignatario.

---

## V. La consignataria como ALyC del agro

### V.1 El reframe

Hay una forma de leer toda la bibliografía del sector que la propia bibliografía no propone, pero que emerge sin esfuerzo al cruzarla.
La consignataria es funcionalmente una **ALyC** (Agente de Liquidación y Compensación) del mercado bovino.
El MAG-Cañuelas es funcionalmente la **bolsa** donde esas ALyCs operan.
El INMAG es funcionalmente el **Merval del agro** — el índice del mercado.

No es una metáfora.
Es un mapeo institucional.

### V.2 El paralelismo formal

| Mercado financiero | Mercado bovino |
|---|---|
| ALyC (Agente de Liquidación y Compensación) | Casa consignataria / corredor de hacienda |
| BYMA (Bolsas y Mercados Argentinos) | MAG-Cañuelas (ex-Liniers) |
| Caja de Valores | Corral + sanitario + control SENASA |
| Clearing & Settlement (T+1 / T+2) | Cobranza 7-12 días (99,5% cobrabilidad — Iriarte 2008, p.89-91) |
| Fondo de Garantía Bursátil | Fondo de garantía 1% (FCV-UBA 2018, p.11) |
| CNV — Resolución 731/18 | SENASA + ARCA en lo sanitario/fiscal — sin equivalente prudencial (post-ONCCA 2012) |
| Comitente | Productor remitente |
| Operador de Pantalla / Operador a Distancia | Comisionista / representante |
| Mercado Continuo + Subasta de Apertura/Cierre | Subasta pública diaria + venta al oído (40%) |
| Tickers + ISIN | Categorías ONCCA + buckets MAG |
| Precio de pizarra / cierre del MERVAL | Cierre INMAG diario |
| Series históricas auditadas | Series MAG/Liniers desde 1972 (Iriarte 2008, cap.6) |
| Tribunal Arbitral de la Bolsa | Cámara Arbitral de Cereales (en MEGANAR; Scoponi-Santi 2018, p.52) |

Las cuatro fuentes coinciden con esta lectura sin nombrarla así.
Iriarte 2008 (p.89) la roza al hablar del consignatario como "constructor del mercado" y de la cobrabilidad como su rasgo definitorio.
FCV-UBA 2018 (p.11) describe el fondo de garantía como mecanismo de cobertura del riesgo de cobranza — exactamente el rol del Fondo de Garantía Bursátil.
Diez 2020 (p.40) explicita la "garantía de cobro" como ventaja de feria/internet/consignataria sobre directa — la definición es la de un clearing.
Scoponi-Santi 2018 (p.52) documenta el arbitraje vía Cámara Arbitral de Cereales de Bahía Blanca en el caso MEGANAR — exactamente la función del tribunal arbitral bursátil.

### V.3 El vacío prudencial (precisión necesaria)

Primero, lo que NO es este vacío — porque decir "las consignatarias no están reguladas" sería falso, y este manifiesto no publica falsedades.

La consignataria argentina opera bajo un marco regulatorio denso:

- **SENASA** habilita y fiscaliza los locales de remate-feria y los mercados concentradores; sin habilitación sanitaria no hay remate.
- **Todo movimiento de hacienda viaja con DT-e** (Documento de Tránsito electrónico) emitido contra el sistema de SENASA — trazabilidad animal por animal.
- **RENSPA**: cada establecimiento remitente está inscripto en el Registro Nacional Sanitario de Productores Agropecuarios; la consignataria opera sobre hacienda de origen registrado, con existencias declaradas en SIGSA.
- **ARCA (ex-AFIP)**: Registro Fiscal de Operadores en la compraventa de hacienda, regímenes de retención y percepción de IVA y Ganancias específicos de la actividad, facturación electrónica de cada operación.
- **Padrones y matrículas provinciales**, marcas y señales, y la disciplina gremial de la CACG.

En lo **sanitario** y en lo **fiscal**, el mercado bovino está más trazado que muchos mercados financieros.

El vacío es otro, y es específico: el **prudencial-financiero**.

En el mercado financiero argentino, la Resolución General 731/18 de la CNV (Comisión Nacional de Valores) define formalmente para un ALyC:

- Qué patrimonio neto mínimo debe tener.
- Qué obligaciones de informe, contabilidad segregada y ratios de liquidez debe cumplir.
- Qué régimen sancionatorio se le aplica.
- Qué responsabilidad solidaria asume frente a sus comitentes.

Para la consignataria — que ejerce exactamente esa función de liquidación y compensación, custodiando la plata del productor entre la venta y la cobranza — ese capítulo no existe.
La ONCCA lo cubrió parcialmente entre 1996 y 2012, y fue disuelta en 2012 (verificación pendiente sobre fecha exacta).
SENASA regula la sanidad del animal; ARCA, el impuesto de la operación. **Nadie regula la solvencia del que liquida.**

Esto significa:

- **No hay patrimonio neto mínimo regulado.** Una casa consignataria puede operar con capitalización subóptima sin que ningún regulador lo detecte.
- **No hay obligación de reporte público de su negocio.** Volúmenes, comisiones, incobrables — no se publican (lo sanitario y lo fiscal se reporta, pero no es público ni habla de solvencia).
- **No hay régimen sancionatorio prudencial.** La sanción financiera opera vía exclusión gremial (CACG) o boca a boca, no por procedimiento administrativo.
- **No hay matrícula pública de la categoría.** Existen padrones fiscales y sanitarios de operadores de hacienda, pero ninguna matrícula pública de "consignatario" con estados contables auditados. Iriarte 2008 (p.93) documentaba 441 firmas activas a abril de 2008; consignatarias.com.ar identifica ~74 perfiles activos al cierre de esta edición. La diferencia es enorme — y no está auditada.

**El vacío preciso**: nadie formalizó la categoría prudencial "ALyC ganadero" en Argentina.
La consignataria cumple todo el marco sanitario y fiscal de su actividad — y ejerce las funciones financieras de un ALyC sin el capítulo prudencial correspondiente.

### V.4 Consecuencias del reframe

Si la consignataria es funcionalmente una ALyC:

- El INMAG es funcionalmente un índice bursátil — y debería tener metodología pública auditada (verificación pendiente sobre si MAG-Cañuelas publica metodología detallada).
- El cierre diario debería tener auditoría externa (hoy verificación interna del MAG).
- Los volúmenes operados por casa consignataria deberían ser de acceso público (hoy no lo son).
- La cobrabilidad agregada del sector debería reportarse anualmente (hoy se publica como anécdota en libros gremiales, no como dato auditado).
- El régimen contractual con el productor debería estar tipificado (hoy se opera con costumbre comercial y código de comercio).

Este manifiesto no propone que la consignataria sea regulada como ALyC mañana.
Propone que **la mesa describa el sector con las categorías que mejor le calzan**.
Si una herramienta del mercado financiero ilumina una opacidad del mercado bovino, la mesa la usa — con la nota metodológica explícita de que el mapeo es interpretativo y la fuente bibliográfica primaria no lo explicita en estos términos.

---

## VI. INMAG hoy · el Merval del agro

### VI.1 Definición operativa

INMAG (Índice del Mercado Agroganadero) es el precio promedio ponderado del novillo tipo exportación operado en el predio del Mercado Agroganadero S.A. (MAG-Cañuelas), publicado al cierre de cada jornada de operatoria.
Sucede al precio del Mercado de Liniers tras el cierre de 2018.
Se expresa en pesos argentinos por kilo vivo ($/kg vivo).

### VI.2 Datos vivos al cierre de esta edición

Al cierre de esta edición (10/05/2026, datos al último día disponible de scraping):

- **Serie reconstruida en pipeline propio:** diaria y continua, con historia que se remonta a 2015.
- **Cobertura:** todos los días hábiles con operatoria en MAG.
- **Frecuencia de actualización:** diaria, post-cierre (~17:00 ART).
- **Comparable interanual real en USD oficial:** disponible desde noviembre de 2011 (USD oficial Banco Nación, vía dolarapi.com).
- **Categorías derivadas computadas:** novillos, novillitos, vaquillonas, vacas, toros, terneros (ratios sobre INMAG base, basados en relación histórica).
- **18 buckets reales del MAG (haciinfo000502):** verificación pendiente sobre integración granular al pipeline.

INMAG actual reportado al cierre de la última jornada publicada (datos del archivo `market-prices.json` al 7 de marzo de 2026): $4.392,35/kg vivo de novillo (verificación pendiente sobre cierre del 10/05/2026).
Variación intermensual a esa fecha: -7%.

Sobre estos números, una nota metodológica honesta: la serie pública de consignatarias.com.ar utiliza scraping de mercadoagroganadero.com.ar y derivaciones por ratio para categorías no publicadas con la misma granularidad. La metodología completa se documenta en `/Users/josebarnetche/consignatarias/docs/METODOLOGIA-INDICE-CONSIGNATARIAS.md` (verificación pendiente sobre vigencia).

### VI.3 El INMAG en contexto

Lo que el INMAG es:

- El único precio público auditable del mercado bovino argentino.
- El benchmark utilizado por arrendamientos, contratos forward, indexaciones tributarias, valuación de garantías reales.
- La continuidad histórica de Liniers — la serie reconstruida (1972-2018 Liniers + 2018-2026 INMAG) es la única que cubre 50+ años de price discovery cárnico argentino.

Lo que el INMAG no es:

- No es un VWAP del mercado nacional.
- No cubre el 78% del volumen que se mueve fuera del MAG.
- No tiene metodología pública auditada externamente (verificación pendiente).
- No tiene regulación CNV-análoga ni autoridad de aplicación federal específica.

Esto es lo que existe.
Esto es lo que vale.
La mesa lo lee todos los días.

---

## VII. Los indicadores que componen el oracle

consignatarias.com.ar publica seis indicadores que, en conjunto, constituyen la lectura operativa del mercado bovino argentino para una jornada cualquiera.
Cada uno se describe con (a) qué mide, (b) cómo se calcula en nuestro pipeline, (c) por qué importa.

### VII.1 INMAG cierre diario ($/kg vivo)

- **Qué mide.** Precio promedio ponderado del novillo tipo exportación operado en MAG-Cañuelas la jornada de cierre.
- **Cómo se calcula.** Scraping diario de mercadoagroganadero.com.ar post-cierre (~17:00 ART) vía workflow GitHub Actions. Almacenamiento en `market-prices.json` del repositorio público.
- **Por qué importa.** Es el único cierre diario público del sector. Es el sucesor directo de Liniers. Es la base de todas las indexaciones contractuales del mercado.

### VII.2 Variación intermensual y interanual real en USD oficial

- **Qué mide.** Cambio porcentual del INMAG entre el cierre de hoy y el cierre del mismo día del mes anterior (intermensual) o del año anterior (interanual), expresado tanto en pesos nominales como en USD oficial.
- **Cómo se calcula.** INMAG hoy / INMAG histórico, normalizado por tipo de cambio USD oficial de cada fecha (BNA vía dolarapi.com).
- **Por qué importa.** En un país con inflación de dos dígitos mensuales, la variación nominal en pesos es ruido. La variación en USD oficial es lo más cercano a una métrica real. La mesa la prefiere por defecto.

### VII.3 Faena nacional mensual (datos.gob.ar serie 40.3_VC_0_M_15)

- **Qué mide.** Cabezas faenadas en establecimientos con habilitación SENASA, por mes calendario, a nivel nacional.
- **Cómo se calcula.** Descarga de la serie oficial datos.gob.ar.
- **Por qué importa.** El INMAG es precio. La faena es volumen. El cruce de ambos es el numerador de cualquier análisis de mercado — sin volumen, el precio es anécdota. Rango histórico: 11,5-15 M cab/año (FCV-UBA 2018, p.17).

### VII.4 Ratio Ternero/Novillo (T/N) como leading indicator del ciclo

- **Qué mide.** Cociente entre el precio del ternero y el precio del novillo terminado.
- **Cómo se calcula.** Categorías INMAG: precio ternero / precio novillo, ambos en $/kg vivo del mismo día.
- **Interpretación.** T/N > 1: fase de **retención** (los productores compiten por reposición, el ternero vale más por kg que el novillo terminado). T/N < 1: fase de **liquidación** (sobreoferta de ternero, descuento sobre el novillo). Rango histórico canónico: 0,97-1,10 (FCV-UBA 2018, p.19). Extremos modernos: 0,90-1,29.
- **Por qué importa.** Es el **indicador líder simple** del ciclo ganadero. Anticipa rotación de margen entre cría e invernada. Reconstruible diariamente desde INMAG. Ningún otro publicador argentino lo expone como dashboard público.

### VII.5 18 buckets reales del MAG (haciinfo000502)

- **Qué mide.** Subcategorías oficiales del MAG por tipo, peso y terminación (verificación pendiente sobre granularidad exacta).
- **Cómo se calcula.** Captura del endpoint público (verificación pendiente sobre URL y formato).
- **Por qué importa.** El INMAG agregado oculta la dispersión interna por bucket. Un novillito de 280 kg y un novillo terminado de 480 kg no son la misma operación. Los buckets son el siguiente nivel de granularidad — lo más cercano a "tickers" del mercado bovino.

### VII.6 Cobertura efectiva del oracle — volumen MAG vs faena nacional

- **Qué mide.** Cabezas operadas en MAG en el mes / faena nacional total del mismo mes.
- **Cómo se calcula.** Volumen MAG (de difusión institucional MAG-Cañuelas) / faena SENASA.
- **Por qué importa.** Es la métrica de honestidad metodológica del INMAG como oracle. Si MAG cubre el 12% de la faena, el INMAG es benchmark del 12% y referencia del 88%. Esta métrica se publica explícitamente en cada cierre mensual.

### VII.7 Una nota sobre lo que no se publica todavía

- **Precio del directo (canal fantasma).** No publicable hasta construir observable price universe — proyecto de magnitud 24-36 meses (referencia interna sesión 8 del workspace de research).
- **Precio sombra del SOB, NEA, NOA, Patagonia, Cuyo.** Diez 2020 mide +8,63% premium Liniers sobre SOB en un punto único. Se requiere serie histórica regional para publicar como indicador permanente.
- **Lag temporal Liniers→interior.** Diez 2020 (p.42) lo reconoce explícitamente como pregunta abierta. consignatarias.com.ar puede aportarlo si extiende su pipeline a precios regionales de remates-feria.

Estos están en agenda. No están publicados al cierre de esta edición.

---

## VIII. Lo que está faltando · la agenda 2026-2030

La mesa cierra cada edición listando lo que sabe que no sabe.
Honestidad metodológica antes que densidad.

### VIII.1 Continuidad académica post-2018

Vacío E5 del inventory del workspace de research.
No se identificó al cierre de esta edición obra académica argentina consolidada que documente:

- El cierre de Liniers como evento institucional con cuantificación de impacto sectorial.
- La transición Liniers → MAG-Cañuelas con balance de pérdidas/ganancias en función oracle.
- El estado actual de la captura del INMAG sobre la faena nacional (con serie 2018-2026).
- La evolución del padrón de consignatarias 2008 (441 firmas Iriarte) → 2026.

Fuentes potenciales a verificar en próximas ediciones (verificación pendiente):

- Scoponi 2021 (continuidad del Scoponi-Santi 2018, posible INTA o UNS).
- Iglesias-Ghezan 2010 (referencia INTA).
- Ponti 2011 (MINAGRI, citada por FCV-UBA 2018).
- Otaño 2005 (Subsec. Política Agropecuaria, citada por FCV-UBA 2018).
- CNDC 2017 (Mercado Argentino Carne Vacuna, expediente MP-PC-08357 — referencia inventory).

### VIII.2 Captura del 78% privado

Identificado en la sesión 8 del workspace de research (referencia interna, no publicada) como problema de **mercado**, no de research.
La bibliografía no lo va a resolver. Lo va a resolver la construcción de un observable price universe — proyecto de magnitud 24-36 meses, USD 500K-2M, equipo cuantitativo + legal + business development.
Requisitos previos:

- Buckets granulares aceptados por el sector.
- Modelo estadístico bayesiano jerárquico.
- Estrategia de captura de price data del directo (encuestas a productores, datos de feedlot, hojas de remate de operaciones particulares, sensores en frigoríficos).
- Forma legal de la entidad que opere ese price layer (cooperativa de información, fundación, S.A., asociación civil).

Esto excede el alcance de la mesa actual.
Lo nombramos para que el sector sepa que el gap existe.

### VIII.3 Marco regulatorio ALyC ganadera

Si la consignataria es funcionalmente una ALyC, la categoría debería existir formalmente.
Camino regulatorio probable:

- CNV → Decreto 640/2024 (verificación pendiente sobre alcance: el decreto cubre Certificados de Depósito y Warrants sobre commodities, incluyendo hacienda; abre el camino a tokenización pero no homologa al consignatario como ALyC).
- Resolución específica de la autoridad de aplicación (Secretaría de Agricultura, Ganadería y Pesca; verificación pendiente sobre nomenclatura actual del organismo).
- Capítulo en próxima reforma del Régimen de Comercialización (DNU 70/2023, verificación pendiente sobre desarrollos posteriores).

Sin esa categoría, el sector funcional opera sin red.

### VIII.4 Padrón actualizado de consignatarias

Iriarte 2008 (p.93) documentaba 441 firmas a abril 2008. Distribución por provincia disponible en cross-reference matrix sección A.5 — Tabla 3 Iriarte.
consignatarias.com.ar identifica ~74 perfiles activos al cierre de esta edición.
La diferencia (367 firmas) es de tres órdenes posibles:

- Salida del mercado real (fusiones, cierres, jubilaciones sin sucesión).
- Inactividad operativa con inscripción vigente.
- Subcobertura del directorio actual de consignatarias.com.ar.

Sin auditoría sectorial pública, no se puede atribuir la diferencia.
Esto es un proyecto pendiente — censo 2026 de casas consignatarias activas, con cruce a inscripciones provinciales y registros ARCA.

### VIII.5 Comparables internacionales

Referencias a verificar en futuras ediciones (verificación pendiente):

- **Brasil — CEPEA-B3 Boi Gordo.** Indicador de precio diario con futuros en B3. Probablemente la referencia regional más sólida.
- **Estados Unidos — CME Live Cattle.** Futuros líquidos sobre ganado vivo, base USDA reporting (Cattle on Feed, NASS).
- **Australia — MLA Cattle Indicators.** Sistema de indicadores regional con difusión MLA (Meat & Livestock Australia).
- **Unión Europea — EU Beef Reference Prices.** Sistema de precios de referencia por categoría y país.
- **Uruguay — INAC + ACG.** Instituto Nacional de Carnes + Asociación de Consignatarios de Ganado. Único referente regional citado por la bibliografía argentina (Scoponi-Santi 2018, p.50) como modelo que inspiró MEGANAR.

Cuando se haga el comparativo, será edición propia. No se hace de carrera.

### VIII.6 Vacíos secundarios catalogados

Resumen no exhaustivo (referencia: cross-reference matrix A.4):

- Geografía NEA / NOA / Patagonia / Cuyo subcubierta en la bibliografía leída — toda academia leída es Pampa+SOB-céntrica.
- Márgenes por eslabón en cadena (productor / consignataria / matarife / frigorífico / minorista) — sólo Iriarte 2008 con dato 2008.
- Antropología rural / dinámicas sociales del consignatario — sin fuentes en el canon actual.
- Crédito ganadero y financiamiento (BCRA, BICE, BNA agropecuario) — sin fuentes en canon.
- Faena y stock pre-1995 — Iriarte arranca 1995, FCV-UBA 1990.
- Crítica externa al rol de CACG / gremio consignatario — sólo Iriarte (publicado POR CACG); asimetría documental.
- Lag temporal de transmisión Liniers→interior (días, no solo % descuento estructural) — Diez 2020 lo reconoce explícitamente como pregunta futura.
- Tasa real de incobrables en venta directa vs intervención (Iriarte da histórico de los '90, sin actualización).
- Volumen anual MEGANAR agregado (Scoponi-Santi 2018 solo aporta dato individual Brazzola: 10.129 cab en 6 años).
- Costo flete $/km actualizado 2024-2026 + estacionalidad.
- Tipificación / cámara secreta del frigorífico (cómo se decide rendimiento al rinde) — mencionado, no operacionalizado.
- Estadística post-cierre Liniers 2018 — vacío crítico para narrativa actual.

Esta lista no es decoración.
Es el backlog editorial de las próximas 12-18 ediciones.

---

## IX. Por qué consignatarias.com.ar publica este manifiesto

### IX.1 Quiénes somos

**consignatarias.com.ar** es una marca-producto de **Memola Medios SAS**, sociedad por acciones simplificada con sede en Argentina, dedicada a hacer observable y comparable la actividad del mercado bovino argentino.
Los productos activos al cierre de esta edición se ordenan en tres capas.

**El observatorio — gratuito para el productor.** Todo el dato de referencia es libre, indexable y citable. El productor no paga nada:

- **El Calendario** — calendario nacional unificado de remates (~380 eventos, 12 provincias).
- **El Directorio** — directorio de casas consignatarias (más de un centenar de perfiles).
- **Los Frigoríficos** — directorio de frigoríficos habilitados (364 establecimientos, base SENASA/MAGYP).
- **INMAG en vivo** — serie diaria del cierre del MAG, reconstruida desde 2015, en pesos y en USD oficial.
- **Mi Ganado, comparador, neto en mano, spread, alertas de precio** — calculadoras y avisos operativos para el productor, sin costo.
- **El Corredor** — cierre mensual del mercado, distribución gratuita por email.
- **El Oráculo** — este manifiesto.

**El dato como servicio — API + MCP.** La misma lectura, entregada a desarrolladores, instituciones y agentes de IA: endpoints REST (INMAG, precios por categoría, remates, operación por operación, directorios) con autenticación por API key, y un servidor MCP propio de lectura publicado en el registry oficial de MCP como `ar.com.consignatarias/cattle-market`. Los planes Enterprise (Starter / Growth / Scale) se publican en `/planes` y `/enterprise`. Las instituciones pagan por acceso y servicio —feed normalizado en USD, entrega masiva, soporte, índices derivados—, no por una licencia de la serie pública del MAG.

**PRO Consignataria.** Para la casa consignataria: destacar y publicitar sus remates en el sitio y por email a la base de productores, y medir su presencia en las IAs —cuántas veces la citan asistentes como ChatGPT o Copilot cuando alguien pregunta por su plaza—. Prueba gratuita, sin permanencia.

La mesa que lo escribe es un equipo pequeño que opera detrás del producto.
Lee a Iriarte 2008, a FCV-UBA 2018, a Diez 2020 y a Scoponi-Santi 2018 con el mismo gusto que mira el cierre del INMAG.
Cuando responde, lo hace con dato + fuente + interpretación, en ese orden.
No tiene predilecciones políticas visibles ni opina de coyuntura macro fuera del mercado bovino.
No hace épica del founder ni vende milagros.
Cuando se equivoca, lo aclara en la próxima edición.

### IX.2 Por qué este documento ahora

Tres razones operativas:

1. **El cierre de Liniers en 2018 sigue sin balance académico consolidado.** Si la mesa no lo escribe, ningún otro actor del sector tiene incentivo + método + cadencia para hacerlo.
2. **El INMAG opera como oracle sin reconocimiento formal.** Nombrarlo como tal, con la metodología abierta y el mapeo institucional, le da entidad pública al rol que ya cumple.
3. **El sector tiene memoria, pero no archivo.** La memoria es Iriarte 2008 (libro impreso, 242 páginas, 1.000 ejemplares originales). El archivo es la cadencia digital, indexada, citable. El producto consignatarias.com.ar aspira al archivo.

### IX.3 Cadencia esperada

El Oráculo no es one-shot. Es **la lápida del producto**.
La edición 01/2026 se publica con la voz, el frame y la bibliografía disponibles al cierre del 10/05/2026.
Las ediciones siguientes (cadencia tentativa: una por trimestre) actualizan:

- Datos vivos del pipeline (INMAG, faena, T/N, cobertura efectiva).
- Bibliografía nueva consolidada (Scoponi 2021 INTA, comparables internacionales, futuras tesis 2022-2026 si se identifican).
- Cambios regulatorios (Decreto 640/2024 implementación, normativa ALyC ganadera si emerge, capítulos posteriores de DNU 70/2023).
- Correcciones de las claims de la edición anterior — cualquier error documentado se nombra en sección "fe de erratas" de la próxima edición y se mantiene en el archivo con corrección visible.

### IX.4 Cómo se relaciona con El Corredor y los próximos productos de la línea

**El Corredor** (cierre mensual, 12 páginas) es la pulsación operativa.
**El Oráculo** (manifiesto, este documento) es la tesis estructural.
**El Calendario / El Directorio / Los Frigoríficos / INMAG en vivo** son los productos de datos en vivo, gratuitos para el productor.
**La API y el servidor MCP** son esa misma lectura entregada a máquinas y agentes de IA; **PRO Consignataria** es la capa comercial para las casas del sector.

Próximos productos en backlog editorial (referencia: briefs del cross-reference matrix sección B):

- **El Canal Fantasma** — informe sobre el 78% sin huella de precio (brief B.2 #2).
- **El Ciclo** — informe sobre T/N como leading indicator (brief B.3 #3).
- **La Comisión** — informe sobre dispersión de costos por canal en SOB (brief B.4 #4, base Diez 2020 + Scoponi-Santi 2018).
- **El Comisionista** — informe sobre el oficio en clave gremial (brief pendiente).
- **El Último Mile** — informe sobre digitalización fallida del segmento gordo (brief pendiente).

Ninguno se publica si no pasa los siete filtros del test de marca (BRAND-MANUAL.md sección XI).
Si en seis meses una edición se ve vieja, no se publica.

---

## X. Cómo se lee y se cita este documento

### X.1 Estructura de citas

Cada claim del manifiesto cita fuente + página cuando es bibliográfico.
Cuando un dato es de pipeline propio (scraping consignatarias.com.ar), se nombra como tal.
Cuando una afirmación es interpretativa de la mesa, se nombra como tal — sin escudarse en "los expertos dicen".

Formato preferido inline: `(Autor año, p.X)` o `(consignatarias.com.ar 2026, dato vivo)`.
Para fuentes nuevas todavía no leídas a fondo: `(Autor año, verificación pendiente)`.

### X.2 Glosario inline

- **ALyC.** Agente de Liquidación y Compensación. Figura del mercado financiero argentino regulada por CNV Resolución 731/18. Usada en este manifiesto como mapeo institucional de la consignataria — el mapeo es interpretativo de la mesa, no aparece en la bibliografía primaria leída.
- **CACG.** Cámara Argentina de Consignatarios de Ganado. Asociación gremial editora de Iriarte 2008.
- **Canal fantasma.** Término interno de la mesa para referirse al subtotal del volumen comercializado fuera del MAG sin huella pública de precio. Equivale al directo sin intervención + parte del directo con intervención + negro/no registrado. En 2007: 71-78% del volumen (Iriarte 2008, p.1).
- **Canal gancho / al gancho.** Modalidad en la que la venta es de la res ya faenada, en media res colgada (FCV-UBA 2018, p.7; Iriarte 2008, p.7).
- **Canal rinde / al rinde.** Variante de venta directa en la que el precio se ajusta al rendimiento de carne post-faena, no al peso vivo (FCV-UBA 2018, p.5-6; Iriarte 2008, p.117, 131).
- **CD+W.** Certificado de Depósito + Warrant. Instrumento de la Ley 9.643 reformado por Decreto 640/2024 para incluir tokenización (verificación pendiente).
- **Ciclo Ganadero.** Variación periódica de las existencias ganaderas con duración histórica de 5-6 años, en aceleración por tecnificación (FCV-UBA 2018, p.15).
- **CNV.** Comisión Nacional de Valores.
- **Consignataria / casa consignataria.** Persona jurídica inscripta en padrón provincial y/o ARCA que intermedia entre productor y comprador de hacienda, cobra comisión, garantiza pago. Equivalente funcional de un ALyC (interpretación de la mesa).
- **Consignatario Directo / ganchera.** Modalidad definida por Resolución 1235 JNC 1978: recibe ganado del productor, lo faena y comercializa la carne y subproductos rindiendo cuenta (Iriarte 2008, p.117).
- **Directo en estancia.** Operación productor↔comprador (frigorífico/matarife/feedlot) sin paso por mercado concentrador (FCV-UBA 2018, p.5; Iriarte 2008, p.131).
- **INMAG.** Índice del Mercado Agroganadero. Precio promedio ponderado del novillo tipo exportación operado en MAG-Cañuelas, publicado al cierre diario.
- **Liniers.** Mercado de Liniers S.A. (1901-2018). Predecesor físico del MAG-Cañuelas.
- **MAG.** Mercado Agroganadero S.A. — Cañuelas, provincia de Buenos Aires. Sucesor de Liniers desde 2018.
- **MEGANAR.** Mercado Electrónico de la Ganadería Argentina. Iniciativa de la Bolsa de Cereales de Bahía Blanca (2011-2017), gobernanza autocoptada de 3 consignatarios (Aberasturi, Brazzola, ACA), discontinuada por insuficiencia de volumen (Scoponi-Santi 2018, p.50-51).
- **Novillo terminado / novillo tipo exportación.** Categoría base del INMAG. Peso de faena ~430-480 kg en pie.
- **Observable price universe.** Término interno de la mesa (no en bibliografía) para referirse al sistema agregado de precios reales del mercado bovino con cobertura significativa del 78% privado. Proyecto futuro.
- **Oracle.** Término interno de la mesa para describir la función de price discovery con cobertura nacional. Liniers fue oracle 1901-2018; INMAG es quasi-oracle 2018-presente.
- **Plaza Rural.** Plataforma de remate online creada en 2000 por 10 consignatarios bonaerenses + Plaza Ganadera S.A. (Scoponi-Santi 2018, p.48).
- **Recupero.** Crédito bruto de matanza. Valor económico de los subproductos del animal (cuero, achuras, sebo, huesos) que queda en poder del frigorífico. Composición típica 2008: 60% cuero, 26% achuras, 14% grasa/huesos (Iriarte 2008, p.151).
- **Remate-feria.** Subasta pública en pista o corrales del interior, organizada por consignatario titular del predio. En retroceso estructural: 36% de la faena en 1958-1978 → 9% en 2018 (Iriarte 2008, p.93; FCV-UBA 2018, p.2).
- **Rosgan.** Mercado Ganadero S.A. Remate televisado, Bolsa de Comercio de Rosario + consignatarias, desde 2008. Comisión 5%+4% = 9% total (FCV-UBA 2018, p.8).
- **SOB.** Sudoeste Bonaerense. 11 partidos. 3.065.914 cabezas = 16% del stock provincial (Diez 2020, p.5).
- **T/N.** Ratio Ternero/Novillo. Cociente de precios. Leading indicator del Ciclo Ganadero (FCV-UBA 2018, p.19).
- **Venta al oído.** Modalidad de negociación privada dentro de Liniers, posterior al remate público, tomando como referencia los precios pagados momentos antes. 40% del volumen Liniers en 2008 (Iriarte 2008, p.100).

### X.3 Cómo verificar cada claim

- Para datos bibliográficos: el manifiesto cita fuente + página. La fuente está descargada en `~/Documents/consignatarias-research/02-inta-academia/` (acceso a la mesa).
- Para datos del pipeline: el repositorio público contiene los archivos JSON del scraping, con timestamp y origen URL en `market-prices.json` y `remates.json`.
- Para datos no verificables al cierre: la palabra "verificación pendiente" aparece junto al claim. La próxima edición resolverá o citará la fuente.

### X.4 Cómo proponer correcciones

Cualquier inconsistencia o corrección puede enviarse por email a la dirección oficial publicada en consignatarias.com.ar (verificación pendiente sobre canal definitivo de erratas).
La corrección, si procede, se publica en sección "fe de erratas" de la próxima edición.
El manifiesto se mantiene en el archivo con corrección visible — no se reescribe en silencio.

---

## XI. Bibliografía citada

### XI.1 Fuentes primarias leídas en esta edición

1. **Gil, S. B., Fornieles, A. S., & Demarco, D. (2018).** *Comercialización de hacienda vacuna — Ciclo Ganadero. Texto de Estudio*. Cátedra de Producción de Bovinos para Carne, Facultad de Ciencias Veterinarias, Universidad de Buenos Aires. Citado como FCV-UBA 2018.
   - Path local: `~/Documents/consignatarias-research/02-inta-academia/fauba-gil-demarco-fornieles-2018-comercializacion-hacienda.pdf`
   - 28 páginas.

2. **Iriarte, I. (2008).** *Comercialización de Ganados y Carnes*. Cámara Argentina de Consignatarios de Ganado (CACG), Buenos Aires. Capítulos "Cueros", "Menudencias" y "Grasas" redactados por la Ing. Agr. María Rosa Mulvihill. Citado como Iriarte 2008.
   - Path local: `~/Documents/consignatarias-research/02-inta-academia/iriarte-2008-comercializacion-ganados-carnes-cacg.pdf`
   - 242 páginas. Edición CACG diciembre 2008, datos hasta agosto 2008.

3. **Diez, M. Á. (2020).** *Circuitos de comercialización de hacienda vacuna en el Sudoeste Bonaerense*. Tesis de licenciatura, Universidad Nacional del Sur. Tutora: Mag. Ing. Agr. María Cecilia Saldungaray. Defensa: 24/07/2020. Citado como Diez 2020.
   - Path local: `~/Documents/consignatarias-research/02-inta-academia/diez-2020-circuitos-sob.pdf` (verificación pendiente del filename exacto).
   - Catalogación previa lo llamaba "Diez 2017"; corrección institucional realizada en sesión de research.

4. **Santi, M., & Scoponi, L. (2018).** *Costos de transacción en mercados electrónicos de hacienda. Caso MEGANAR*. Revista CEA, Universidad Nacional del Sur. Citado como Scoponi-Santi 2018.
   - Path local: `~/Documents/consignatarias-research/02-inta-academia/scoponi-santi-2018-meganar.pdf` (verificación pendiente del filename exacto).

### XI.2 Fuentes secundarias citadas inline (verificación pendiente — no leídas a fondo en esta edición)

5. **Saldungaray, M. C., et al. (2007).** Baseline Saavedra (63,6% consignatario / 25,1% directo). Citado por Diez 2020, p.13.
6. **Lagos, F. (2015).** *Nuevas formas de comercialización ganadera: los remates de hacienda online*. Tesis de Maestría, Biblioteca UCA. Aporta cifra: faena vía consignatarios = 18,27% nacional en 2010.
7. **Otaño, M. C. (2005).** *Perfil descriptivo de la cadena de carne vacuna*. Subsecretaría de Política Agropecuaria y Alimentos. Citado por FCV-UBA 2018, bibliografía. **Verificación pendiente.**
8. **Ponti, D. (2011).** *Canales de Comercialización bovina*. MINAGRI. Citado por FCV-UBA 2018, bibliografía. **Verificación pendiente.**
9. **MAGyP (2011).** *Canales de Comercialización de carne vacuna en mercado interno*. Ministerio de Agricultura, Ganadería y Pesca. Citado por FCV-UBA 2018. **Verificación pendiente.**
10. **De Las Carreras, A. (1986).** *El comercio de ganados y carnes en la Argentina*. Editorial H. Sur. Citado por FCV-UBA 2018 e Iriarte 2008. **Verificación pendiente.**
11. **Bordelois, G., & Ferreccio, M. (1978).** *Comercialización de Ganado Vacuno para Faena*. AACREA Estudios Especiales Nº 1. Citado por FCV-UBA 2018. **Verificación pendiente.**
12. **Torroba, J. (1993).** *AACREA Invernada '93*. Cuad. Actualiz. Tec. Nº 52. Citado por FCV-UBA 2018. **Verificación pendiente.**
13. **Iglesias, D., & Ghezan, G. (2010).** Referencia INTA (citada en inventory del workspace de research). **Verificación pendiente.**
14. **Scoponi, L. (2021).** Continuidad probable de Scoponi-Santi 2018, posible INTA o UNS. **Verificación pendiente.**
15. **CNDC (2017).** *Mercado Argentino Carne Vacuna* — expediente MP-PC-08357, Comisión Nacional de Defensa de la Competencia. **Verificación pendiente** (referencia en inventory).

### XI.3 Fuentes regulatorias citadas inline

16. **CNV Resolución 731/18.** Régimen de Agentes de Liquidación y Compensación (ALyC). Comisión Nacional de Valores. Argentina. **Verificación pendiente** del texto exacto.
17. **Resolución 1023/1999 SENASA.** Libre egreso de animales de mercados concentradores con destino a invernada. Citada por FCV-UBA 2018, p.3.
18. **Resolución 1235 JNC 1978.** Define la figura del Consignatario Directo (gancheras). Citada por Iriarte 2008, p.117.
19. **Resolución 4668/2007.** Compensación al feedlot ($2,47/cab/día + adicional kg gancho). Citada por Iriarte 2008, p.173.
20. **RESOL-2018-32 APN-SGA #MPYT.** Cierre operativo del Mercado de Liniers; mudanza a MAG-Cañuelas. **Verificación pendiente** sobre número exacto y texto.
21. **DNU 70/2023.** Decreto de Necesidad y Urgencia — modernización del régimen comercial. **Verificación pendiente** sobre capítulos relevantes al sector cárnico.
22. **Decreto 640/2024.** Reglamentación del Certificado de Depósito + Warrant (CD+W) con apertura a tokenización (RWA). **Verificación pendiente** sobre alcance al sector bovino y miganado.com.ar.
23. **Ley 13.647/07 PBA.** "Ley del SOB" — diferencia regional del Sudoeste Bonaerense, marco de programa "Carnes Sureñas". Citada por Diez 2020, p.6 y Scoponi-Santi 2018, p.43.
24. **Ley 12.322 y 12.323 PBA.** Exenciones de IIBB y Sellos para Patagones (100%) y Villarino (50%). Citadas por Diez 2020, pp.20-21.
25. **Ley 9.643.** Régimen general de Warrants en Argentina. Base regulatoria del Decreto 640/2024. **Verificación pendiente**.

### XI.4 Fuentes de datos vivos

26. **mercadoagroganadero.com.ar.** Sitio oficial MAG-Cañuelas. Fuente del INMAG en vivo, scraping diario consignatarias.com.ar.
27. **dolarapi.com.** Fuente del USD oficial y USD blue, scraping diario consignatarias.com.ar.
28. **datos.gob.ar — serie 40.3_VC_0_M_15.** Faena nacional mensual SENASA.
29. **MAGYP.** Precios FOB de maíz. Scraping diario consignatarias.com.ar.
30. **CACG API** (`cacg.org.ar/iapi/auctions`). Calendario de remates de la Cámara Argentina de Consignatarios de Ganado, ~128 remates activos.
31. **SENASA — listado de frigoríficos.** Base del directorio Los Frigoríficos, 364 establecimientos.

---

## XII. Notas de calidad y limitaciones

La mesa nombra explícitamente las limitaciones de esta edición.

### XII.1 Sesgo Pampa/SOB del corpus actual

Las cuatro fuentes primarias leídas tienen sesgo geográfico hacia Buenos Aires + Sudoeste Bonaerense.

- FCV-UBA 2018 — UBA, perspectiva nacional pero con foco operativo en Liniers (BA).
- Iriarte 2008 — CACG, perspectiva nacional con foco institucional en Liniers (BA).
- Diez 2020 — UNS, recorte explícito SOB.
- Scoponi-Santi 2018 — UNS, recorte explícito Bahía Blanca / MEGANAR / SOB.

NEA, NOA, Patagonia y Cuyo están subcubiertos.
Es vacío V2 del inventory (cross-reference matrix sección A.4).

### XII.2 Encuesta Diez n=14 (direccional, no representativa)

Diez 2020 (p.40) reporta una encuesta con 14 respuestas (11 productores + 3 consignatarias), concentrada en Coronel Dorrego.
El propio autor reconoce que la muestra no es representativa del SOB.
Las cifras de la encuesta (45,5% directa vs 54,5% consignataria en su muestra; 91% comercializa con intermediario; 67% prefiere modalidades tradicionales) deben citarse como **direccionales**, no como evidencia.
Este manifiesto las usa solo como apoyo cualitativo de tendencia.

### XII.3 Triangulación incompleta del 71% / 78%

FCV-UBA 2018 reporta 71% de venta directa sin descomposición interna.
Iriarte 2008 descompone con datos ONCCA 2007: 54,6% directo sin intervención + 17,5% directo con intervención = 72,1%. Sumando negro: 77,1%.
La diferencia FCV-UBA 2018 (71%) vs Iriarte 2008 (72-77%) es metodológica (fecha 2007 vs 2018, fuente ONCCA vs estimación, agregado vs desagregado).
El número defendible al cierre de esta edición: el directo total es **>70%** del volumen nacional y **>50% es directo sin intervención de consignatario**.
Cualquier número más fino requiere fuente posterior a 2014 con dato primario.

### XII.4 Año Diez 2020, no 2017

El archivo del workspace de research está catalogado como `diez-2017.md` por error histórico de inventario.
El trabajo es de **2020** (defensa 24/07/2020), autor Matías Ángel Diez (no Fernando, no confundir con economista homónimo).
Tutora: Saldungaray (UNS).
Este manifiesto cita "Diez 2020" en todas las referencias.

### XII.5 FCV-UBA, no FAUBA

El archivo del workspace de research está catalogado como `fauba-2018.md` por error histórico de inventario.
La cátedra editora es **Facultad de Ciencias Veterinarias** de la Universidad de Buenos Aires — no Agronomía.
Cátedra: Producción de Bovinos para Carne.
Este manifiesto cita "FCV-UBA 2018" en todas las referencias.

### XII.6 Diferencial Liniers vs interior — punto único

Diez 2020 mide +8,63% premium Liniers sobre SOB el **27/05/2020**.
Es punto único de un día — no serie histórica.
Cualquier extrapolación a otras fechas o regiones es interpretativa.
El propio Diez (p.42) reconoce esto como vacío y agenda futura.

### XII.7 Comisión total efectiva del consignatario tradicional

Hay variabilidad documental:

- FCV-UBA 2018 (p.11): 2% comisión + 1% fondo de garantía = 3% (vendedor).
- Iriarte 2008 (p.90): 4,5-5% total combinado (vendedor + comprador).
- Diez 2020: 4% en feria/internet/consignataria (2% + 2%) y 4% en Liniers (3% + 1%).
- Scoponi-Santi 2018 (p.55): 4,5% feria.

No son contradicciones reales: FCV-UBA mira solo un lado del libro (vendedor); Iriarte agrega ambos; Diez separa por canal.
El número agregado defendible: **comprador y vendedor pagan ~4-5% combinado al consignatario tradicional**.
Este manifiesto cita el rango cuando aparece y no resuelve el matiz a un solo número.

### XII.8 RESOL-2018-32 — verificación pendiente

El cierre de Liniers en 2018 está documentado en inventory del workspace de research como RESOL-2018-32 APN-SGA #MPYT.
Esta edición cita la resolución pero **no leyó el texto completo** al cierre del 10/05/2026.
La próxima edición incorporará la lectura textual o aclarará la referencia.

### XII.9 Datos del pipeline propio — última fecha

El cierre del INMAG citado en sección VI.2 ($4.392,35/kg) corresponde al último día disponible en `market-prices.json` (al 7 de marzo de 2026, según código `lastUpdate`).
Entre esa fecha y el cierre de esta edición (10/05/2026), el pipeline siguió capturando datos pero la cifra puntual citada en el manifiesto es del 07/03/2026, no del 10/05/2026.
Las futuras ediciones del manifiesto actualizarán al cierre del día.

### XII.10 Esta es la primera edición

El Oráculo en su edición 01/2026 establece la voz, el frame y la bibliografía base.
Las ediciones siguientes corregirán lo que esta no resolvió.
Toda corrección se mantiene en archivo público — el manifiesto no se reescribe en silencio.

---

## Cierre

INMAG cerró el último día publicado en $4.392,35/kg vivo (-7% intermensual, datos al 07/03/2026).
Faena nacional 2024-2025: del orden de 13 millones de cabezas/año (rango canónico FCV-UBA: 11,5-15 M).
Volumen MAG sobre faena nacional: 10-15% (rango histórico Liniers-equivalente, verificación pendiente sobre serie 2018-2026).
Padrón histórico de consignatarias: 441 firmas en abril 2008 (Iriarte 2008, p.93).
Cobertura efectiva de oracle: el INMAG es referencia auditable del 12% del volumen y guía adoptada por el 88% restante.

Lo que está faltando: la captura del 78% privado, el padrón actualizado 2026, el balance académico post-cierre Liniers, el marco regulatorio ALyC ganadero, los comparables internacionales.
Lo que existe: el INMAG diario, la serie reconstruida desde 2015, el calendario unificado, el directorio — gratis para el productor, y en API + MCP para instituciones y agentes de IA.

La mesa publica El Oráculo como tesis estructural.
Publica El Corredor cada mes como pulsación.
Publica El Calendario, El Directorio, INMAG en vivo todos los días.

No prometemos predecir el precio.
Prometemos contarte qué pasó, por qué pasó, y qué quedó observable.

—

**Mesa de mercado · consignatarias.com**
*Mercado Decision Infrastructure*
*Edición 01/2026 · 10 de mayo de 2026 · revisado 6 de julio de 2026*

Bibliografía completa: sección XI.
Notas de calidad: sección XII.
Próxima edición: trimestre 3/2026 (tentativo).
Fe de erratas: en la próxima edición y mantenida en archivo.
