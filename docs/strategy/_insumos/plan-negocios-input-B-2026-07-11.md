# Plan de negocios - consignatarias.com.ar

Fecha: 11 de julio de 2026  
Horizonte: 36 meses  
Alcance: Argentina, mercado bovino, informacion de mercado, consignatarias y datos B2B.

## 1. Resumen ejecutivo

La recomendacion es inequivoca: **consignatarias.com.ar debe convertirse en la capa neutral de informacion, distribucion comercial y datos estructurados del mercado ganadero argentino**, con productores gratis, consignatarias pagando por alcance medible y empresas pagando por datos/API. No debe intentar ser, en los proximos 36 meses, un marketplace transaccional ni una herramienta completa de administracion de rodeos.

El negocio prioritario no es publicidad pura, ni SaaS generico, ni suscripcion masiva a productores. El modelo principal debe ser un **hibrido B2B con dos motores secuenciados**:

1. **Primer motor, meses 0-12: PRO Consignataria / Alcance de remates.** Perfil verificado, remates destacados, distribucion a productores, tracking de consultas, QR/landing y reporte mensual. Primer precio: **ARS 45.000/mes por 90 dias**, con revision a ARS 75.000-120.000 cuando se demuestre ROI por remate, lead o visita calificada.
2. **Segundo motor, meses 6-36: datos empresariales, API/MCP y reportes institucionales.** Planes desde **ARS 74.000/mes** para integraciones chicas y **ARS 451.000/mes** para clientes que usen series, webhooks, reportes y soporte. Este motor tiene mayor margen y defensibilidad, pero ciclo de venta mas largo.

La audiencia gratuita de productores es necesaria, pero no debe confundirse con cliente pagador. El productor usa informacion para decisiones importantes, pero su disposicion real a pagar por datos generales es baja si la decision final sigue apoyada en el consignatario de confianza, WhatsApp, llamadas y referencias personales. La audiencia gratuita crea demanda para las consignatarias, mejora el dato de comportamiento y construye autoridad para vender API y reportes.

El principal activo actual no es una funcionalidad aislada. Es la combinacion de:

- 104 perfiles canonicos de consignatarias en el producto.
- 735 remates indexados en datos locales; 283 programados desde el 11 de julio de 2026.
- 1.102 frigorificos en el directorio local.
- INMAG actualizado al 10 de julio de 2026: ARS 4.141,85/kg vivo, fuente MAG, segun `src/lib/data/market-prices.json`.
- 3.439 usuarios GA4 en los ultimos 30 dias y 1.075 en los ultimos 7 dias, segun `docs/ga4-growth-2026-07-09.json`.
- 2.595 clicks GSC en 28 dias al 5 de julio de 2026, dominados por busquedas de precio de novillo para arrendamiento e INMAG, segun `docs/gsc-data-2026-07-08.json`.

La debilidad tambien es clara: parte de los datos actuales son incompletos o no verificables comercialmente. De 735 remates, solo 166 tienen cabezas estimadas. El directorio crudo mezcla consignatarias, exportadoras y otros actores. El historico de resultados de remates todavia no es suficiente para comparar neto final, performance por plaza o calidad real del servicio. Por eso el "data moat" no puede ser scraping: debe ser **normalizacion + verificacion + resultados + trazabilidad metodologica + adopcion por actores pagadores**.

## 2. Diagnostico del negocio actual

### Producto existente observado

El producto actual ya cubre mas que un directorio. En el repo aparecen rutas y componentes para:

- Directorio de consignatarias y perfiles individuales.
- Calendario de remates, remates por provincia, ciudad, tipo, hoy, manana, semana y mes.
- Remates en vivo y videos.
- Precios de hacienda por categoria, INMAG, historicos, comparadores, spread y novillo en dolares.
- Arrendamientos ganaderos e indice de novillo para canon.
- Frigorificos habilitados y perfiles.
- Calculadora de valor estimado, vender ahora, alertas y dashboard de productor.
- Reportes como "El Corredor".
- Planes de pago.
- PRO Consignataria.
- API REST, OpenAPI, claves, cuotas, webhooks y MCP.
- Claims/verificacion de perfiles, reviews, leads y tracking de WhatsApp.

### Evaluacion critica por producto

| Activo | Frecuencia de uso | Decision que resuelve | WTP probable | Costo operativo | Diferenciacion | Veredicto |
|---|---:|---:|---:|---:|---:|---|
| Calendario de remates | Alta semanal | Donde mirar/vender/comprar | Baja productor, media consignataria | Medio por carga/normalizacion | Media | Base de audiencia y PRO Consignataria |
| Directorio de consignatarias | Media | Quien opera en zona | Baja productor, media consignataria | Medio | Media si verificado | Debe ser infraestructura, no producto aislado |
| Perfiles verificados | Media | Confianza y contacto | Media consignataria | Medio-alto por verificacion | Alta si hay claims reales | Producto pago inicial |
| Remates destacados/distribucion | Alta para casas activas | Mas asistencia y consultas | Alta si hay leads | Medio | Alta con audiencia segmentada | Primer producto vendible |
| Precios INMAG/categorias | Alta | Referencia diaria | Baja productor, media B2B | Medio | Media; fuente publica | Gratis como autoridad; pago para API/historico/soporte |
| Calculadora valor hacienda | Media-baja episodica | Traduce precio a lote propio | Baja individual | Bajo | Media | Captura de leads/alertas, no core pago |
| Arrendamiento ganadero | Alta busqueda | Canon y referencia contractual | Baja usuario final, media instituciones | Bajo | Alta SEO | Audiencia y sponsorship/reportes |
| Comparador de consignatarias | Baja-media | Reducir riesgo de eleccion | Media productor, sensible politicamente | Alto | Alta si hay datos reales | Hacerlo descriptivo, no ranking agresivo |
| Reviews/reputacion | Media | Confianza | Media consignataria, baja productor | Alto moderacion/legal | Alta | Solo con controles estrictos |
| API/MCP | Baja en usuarios, alta valor cliente | Integracion y modelos | Alta B2B | Medio-alto soporte | Alta si data estable | Segundo motor, no unico motor inicial |
| Newsletter/El Corredor | Media | Recordacion y lectura de mercado | Baja directa, alta patrocinio | Medio editorial | Media | Canal comercial y sponsor |
| Remates en vivo | Alta puntual | Ver oferta | Baja | Alto si streaming propio | Baja frente a YouTube/Rosgan | Agregar, no operar streaming |
| SaaS CRM consignatarias | Diaria si adoptado | Gestion de contactos/remates | Alta si reemplaza planillas | Alto venta/onboarding | Media-alta | Fase 2; no MVP inicial |
| Marketplace/intermediacion | Alta valor economico | Operacion completa | Alta si liquida | Muy alto legal/confianza | Alta | No antes de PMF informativo |
| Mi ganado/admin rodeo | Media | Control productivo | Media en empresas | Muy alto producto | Baja por competidores | No foco |

### Diagnostico de traccion

La traccion actual es de descubrimiento e informacion, no todavia de comunidad cerrada ni de software operativo. La evidencia interna mas relevante:

- GA4 al 9 de julio de 2026: ultimos 30 dias, 3.439 usuarios; ultimos 7 dias, 1.075 usuarios.
- GSC al 5 de julio de 2026: 28 dias, 2.595 clicks, 141.137 impresiones, posicion media 6,49.
- Las queries lideres son "precio novillo para arrendamiento hoy", "precio novillo arrendamiento mensual", "indice novillo arrendamiento", "inmag".

Inferencia: hoy el sitio es fuerte como **referencia de precio/arrendamiento** y empieza a ser util como directorio. Todavia no prueba por si solo demanda transaccional ni disposicion masiva de productores a pagar. Si se fuerza un paywall al productor, se destruiria una ventaja de distribucion antes de monetizarla.

## 3. Mercado ganadero argentino: lectura operativa

La cadena bovina argentina combina produccion extensiva, ciclos biologicos largos, alta heterogeneidad regional, fuerte informalidad relacional y formacion de precios fragmentada. La informacion publica existe, pero esta dispersa entre MAG, SENASA, IPCVA, consignatarias, remates, camaras, medios y contactos privados.

Fuentes institucionales usadas:

- SENASA publica estadisticas bovinas oficiales; la caracterizacion publica accesible en su pagina de bovinos esta fechada al 31 de diciembre de 2021. Es util para estructura, pero no debe usarse como cifra actual sin actualizar.
- Mercado Agroganadero de Canuelas publica precios, categorias e informacion de mercado. Es una fuente central para referencia de gordo e INMAG, pero no representa toda la hacienda argentina.
- IPCVA publica estadisticas, informes y analisis de faena, consumo, exportaciones y mercado. Sirve para contexto de ciclo y demanda.
- INDEC/CNA aporta estructura agropecuaria y establecimientos, pero el CNA 2018 no describe automaticamente el universo comercial actual de 2026.
- CREA, en su Outlook Ganadero 2026, compila datos SAGyP/IPCVA/INDEC y proyecta escenario 2026. Es una fuente privada-institucional util para ciclo y lectura empresaria, pero no reemplaza datos oficiales primarios.
- BCRA sirve como fuente macro/financiera para variables monetarias, tipo de cambio y tasas cuando se modelen precios en ARS; en este plan financiero se usa USD real como unidad simplificadora para no fabricar precision inflacionaria.

### Hechos, inferencias y supuestos

| Tipo | Afirmacion | Fuente/limitacion |
|---|---|---|
| Hecho local | El producto tiene 104 perfiles canonicos y 735 remates en datos locales. | Repo, `consignataria-slugs.ts`, `remates.json`, 11-jul-2026. |
| Hecho local | 166 de 735 remates tienen cabezas estimadas; total reportado en esos casos: 535.547 cabezas. | Repo, `remates.json`; cobertura parcial. |
| Hecho local | INMAG local al 10-jul-2026: ARS 4.141,85/kg vivo. | `market-prices.json`; fuente declarada MAG. |
| Hecho oficial | SENASA publica estadistica bovina por sector; pagina disponible con corte 31-dic-2021. | SENASA; limitacion temporal. |
| Hecho de producto | La pagina comercial ya define productor gratis, PRO Consignataria a ARS 45.000/mes y API Starter/Growth. | `PlanesToggle.tsx`, 11-jul-2026. |
| Hecho sectorial | CREA Outlook Ganadero 2026 informa que la faena 2025 en cabezas cayo 2,31% vs. 2024 y que el peso medio subio de 228 a 232 kg; tambien muestra recuperacion del consumo bovino a 49 kg/hab. | CREA, dic-2025/Outlook 2026, fuentes SAGyP/IPCVA/INDEC; presentacion, no dataset primario. |
| Inferencia | El productor hoy llega mas por precio/arrendamiento que por busqueda directa de consignataria. | GSC 28 dias; query mix. |
| Supuesto base | Hay 250-400 casas/operadores con actividad comercial suficiente para pagar promocion/remates en Argentina. | Estimacion operacional; validar con camaras, registros y scraping. |
| Supuesto base | 60-90 clientes PRO Consignataria en 36 meses son alcanzables si hay prueba de ROI. | Derivado de cobertura actual y venta directa; no verificado. |

## 4. Mapa de actores de la cadena

| Actor | Informacion que necesita | Informacion que produce | Decision | Costos de busqueda/asimetria | Puede pagar | Puede bloquear |
|---|---|---|---|---|---|---|
| Cria | Precio ternero, calendario, clima, sanidad, demanda | Oferta de terneros, tactos, destete | Vender, recriar, retener | Alto: precio local vs publicado | Bajo-medio | Bajo |
| Recria | Precio compra/venta, pasto, maiz, kilo ganado | Peso, categoria, consumo | Comprar invernada, vender a feedlot | Medio-alto | Medio | Bajo |
| Invernada | Ternero, maiz, gordo, plazo | Lotes terminados | Margen compra/venta | Alto | Medio | Bajo |
| Feedlot | Maiz, gordo, reposicion, financiamiento | Demanda de invernada, gordo | Compra y venta semanal | Alto | Medio-alto | Medio |
| Cabanas | Reproductores, remates, reputacion | Catalogos, genealogia | Venta de reproductores | Alto por confianza | Medio | Bajo |
| Consignatarias | Productores vendedores, compradores, precios, remates | Calendario, condiciones, resultados | Captar y vender | Alto por confianza territorial | Alto | Alto |
| Remates/mercados | Oferta, demanda, precios | Resultados y volumen | Concentrar liquidez | Medio | Medio | Alto |
| Compradores | Oferta por categoria/zona | Compras y precios pagados | Abastecer | Alto si disperso | Medio | Medio |
| Frigorificos | Oferta, precios, habilitaciones, trazabilidad | Faena, demanda, precios internos | Compra/faena/exportacion | Alto | Alto | Medio |
| Matarifes/abastecedores | Gordo, plaza, flete | Demanda diaria | Compra | Alto | Medio | Bajo |
| Transporte | Origen-destino, categoria, volumen | Disponibilidad y tarifa | Flete | Medio | Bajo-medio | Bajo |
| Veterinarios/sanidad | RENSPA, planes sanitarios, movimientos | Servicios y datos sanitarios | Asesorar | Medio | Bajo-medio | Bajo |
| Bancos | Valuacion, riesgo, ciclos, garantia | Lineas de credito | Financiar | Alto | Alto | Bajo |
| Aseguradoras | Valor hacienda, riesgo, ubicacion | Polizas/siniestros | Asegurar | Alto | Medio-alto | Bajo |
| Organismos publicos | Stock, movimientos, faena, precios | Datos oficiales | Regular | Medio | No como cliente principal | Alto |
| Proveedores info/medios | Datos, audiencia, fuentes | Noticias/reportes | Publicar | Medio | Medio | Medio |

## 5. Segmentacion del productor ganadero

No hay un "productor promedio" monetizable. Hay decisiones, ciclos y confianza diferentes.

| Segmento | Objetivo/caja | Comercializa | Canales | Criterios de consignataria | Tecnologia/confianza | WTP por consignatarias.com.ar |
|---|---|---|---|---|---|---|
| Cria | Destete, preñez, caja estacional; vende ternero/vaca descarte | Terneros, vacas, toros | Feria, directo, pantalla | Confianza, compradores de invernada, plazo | WhatsApp alto; herramientas simples | Bajo directo; alto como audiencia para consignatarias |
| Invernador | Margen compra/venta y costo kilo | Compra ternero, vende gordo/recriado | Directo, feria, consignataria | Precio neto, plazo, flete | Usa precios y planillas | Medio si herramienta decide compra/venta |
| Ciclo completo | Optimiza stock y ventas | Varias categorias | Mixto | Servicio integral | Mas planificacion | Medio |
| Feedlot | Rotacion alta, maiz, abastecimiento | Compra invernada, vende gordo | Directo, MAG, consignataria | Precio, velocidad, cobranza | Mayor adopcion | Medio-alto para datos/API/reportes, no app generica |
| Cabanas | Reputacion y remates especiales | Toros, vientres, genetica | Remates especiales, eventos | Audiencia y prestigio | Digital medio-alto | Medio para promocion puntual |
| Pequenos | Liquidez y confianza personal | Pocos lotes | Consignatario local, feria | Relacion, ayuda documental | WhatsApp/telefono | Muy bajo pago directo |
| Medianos | Mejor neto sin perder confianza | Lotes recurrentes | Feria/pantalla/directo | Precio, plazo, seriedad | WhatsApp + buscador | Bajo-medio, pero valiosos como leads |
| Empresas profesionalizadas | Control de margen y benchmarking | Volumen regular | Licitacion, directo, consignatarias | Datos, transparencia, gestion | Mayor adopcion | Medio-alto por reportes/API |
| Administradores | Reportar a propietario | Segun campo | Consignatarias conocidas | Trazabilidad de decision | Digital medio | Medio si genera reportes |
| Arrendatarios/propietarios | Canon ligado a novillo | No siempre comercializa | Consultas de referencia | Fuente verificable | Busqueda web alta | Bajo individual; alto sponsorship/legal/reportes |
| NEA | Distancias, categorias, calidad heterogenea | Cria, invernada, reproductores | Feria regional, consignataria local | Cobertura territorial | WhatsApp alto | Alto valor informativo, bajo pago directo |
| Pampeana | Mayor densidad y competencia | Gordo/invernada | MAG, feria, directo | Precio neto y liquidez | Digital medio-alto | Mejor para datos/comparacion |
| Extrapampeana | Distancia/flete pesa mas | Mixto | Local/regional | Logistica y confianza | Variable | Bajo-medio |
| Alta adopcion tech | Benchmark y automatizacion | Varias | Digital + contactos | Datos verificables | API/dashboard | Medio-alto |
| Baja adopcion tech | Resolver por persona | Varias | Telefono/WhatsApp | Confianza historica | Baja | Casi nulo pago directo |

Conclusion: el productor es usuario critico para generar demanda y datos, pero el cliente pagador inicial debe ser la consignataria o empresa que ya tiene presupuesto comercial, operativo o institucional.

## 6. Funcionamiento real de las consignatarias

La consignataria no es un simple intermediario reemplazable por un boton. Cumple funciones economicas que combinan confianza, informacion, liquidez, garantia y operatoria:

- Capta productores vendedores mediante relacion personal, agentes, presencia territorial y reputacion.
- Tasa lotes y clasifica categorias con informacion incompleta.
- Decide canal: feria, pantalla, streaming, directo, MAG, remate especial.
- Convoca compradores y concentra demanda.
- Arma catalogos, lotes, condiciones y logistica.
- Maneja documentacion, DT-e, liquidacion, cobro, plazos, comisiones, gastos y fletes.
- Puede financiar comprador o adelantar fondos al vendedor.
- Absorbe o gestiona riesgo de cobranza.
- Sostiene reputacion y confianza de largo plazo.

### Que puede digitalizarse

| Proceso | Digitalizable | Comentario |
|---|---:|---|
| Publicacion de remates | Alta | Ya hay datos y calendario; falta integracion automatica. |
| Distribucion a audiencia | Alta | Email/WhatsApp/QR/alertas medibles. |
| Perfil institucional | Alta | Claims, verificacion, datos, fotos, condiciones. |
| Captura de consultas | Alta | Form, WhatsApp tracking, CRM simple. |
| Resultados de remate | Media-alta | Requiere incentivo y estandar. |
| Tasacion de lote | Media | Herramienta orientativa; decision humana queda. |
| Comparacion de consignatarias | Media | Debe evitar ranking opaco/conflictivo. |
| Cobranza/garantia | Baja-media | Requiere contrato, riesgo, capital y confianza. |
| Reemplazar consignatario | Baja | La relacion personal es parte del producto. |

La estrategia correcta es **potenciar y medir a las consignatarias**, no intentar desplazarlas. El sitio puede comparar atributos verificables, pero no debe prometer "elegimos por vos" hasta tener datos de resultados, plazos, comisiones y reputacion auditables.

## 7. Problemas priorizados

Ranking por severidad, frecuencia, posibilidad tecnica, WTP y ventaja competitiva.

| Rank | Problema | Usuario afectado | Pagador probable | Severidad/frecuencia | WTP | Datos necesarios | Riesgo | Veredicto |
|---:|---|---|---|---|---|---|---|---|
| 1 | Consignatarias necesitan que mas productores vean sus remates | Consignataria | Consignataria | Alta/alta | Alta si hay medicion | Remates, audiencia, clicks, leads | Bajo-medio | Vender ahora |
| 2 | Calendario fragmentado de remates | Productor/comprador | Consignataria, sponsor | Media/alta | Media indirecta | Remates normalizados | Medio datos | Core gratis |
| 3 | Falta de datos estructurados para empresas/IA | Agtech, bancos, medios, frigorificos | Empresa | Media/media | Alta | API, historicos, SLA | Medio legal/fuente | Segundo motor |
| 4 | Precio publicado no traduce neto final del lote | Productor | Consignataria/empresa | Alta/episodica | Baja directa | Categoria, kg, flete, gastos, comision | Medio por error | Herramienta gratuita + lead |
| 5 | Dificultad para saber quien opera en cada zona | Productor | Consignataria | Media/media | Media | Directorio verificado | Bajo | Perfil verificado |
| 6 | Falta de reputacion verificable | Productor/consignataria | Consignataria | Alta pero sensible | Media | Reviews, claims, moderacion | Alto legal | Fase controlada |
| 7 | Falta de resultados comparables | Todos | Empresas/consignatarias | Alta/media | Alta si historico | Resultados, cabezas, precios, categorias | Alto acceso | Moat a construir |
| 8 | Dependencia de WhatsApp y planillas | Consignatarias pequenas | Consignataria | Media/alta | Media | CRM simple | Medio adopcion | Fase 2 |
| 9 | Incertidumbre de vender o esperar | Productor | Productor/empresa | Alta/episodica | Baja-media | Precios, costos, estacionalidad | Alto recomendacion | Informativo, no asesor financiero |
| 10 | Leads para frigorificos/proveedores | Compradores/proveedores | Empresas | Media/media | Media | Audiencia segmentada | Medio neutralidad | Fase 2-3 |

Problema mas visible no es igual a mas monetizable. "Precio de novillo para arrendamiento" trae trafico, pero no necesariamente pago directo. "Distribuir remates y medir interesados" tiene menos glamour, pero es cobrable en 90 dias.

## 8. Jobs to Be Done

### Productor

- Cuando tengo un lote para vender, necesito saber que opciones de consignataria y canal tengo en mi zona para reducir el riesgo de vender mal sin romper mi relacion de confianza.
- Cuando miro precios MAG/INMAG, necesito traducirlos a mi categoria, peso, flete, comision y plazo para estimar el neto.
- Cuando decido vender o esperar, necesito una referencia historica y estacional, pero no quiero que una web reemplace a mi consignatario.
- Cuando arriendo un campo, necesito una referencia trazable del novillo para justificar el canon.
- Cuando pruebo una consignataria nueva, necesito senales verificables: actividad, remates, cobertura, datos de contacto, condiciones y reputacion.

### Consignataria

- Cuando organizo un remate, necesito que mas productores y compradores correctos lo vean sin cargar la informacion en diez canales.
- Cuando un productor busca quien opera en su zona, necesito aparecer con informacion confiable, actualizada y medible.
- Cuando compito contra casas grandes, necesito demostrar actividad, especialidad y cobertura, no solo nombre.
- Cuando pago publicidad, necesito saber visitas, consultas, WhatsApp clicks y remates promovidos.
- Cuando recibo consultas, necesito no perderlas en WhatsApp disperso y poder hacer seguimiento.

### Empresa compradora/institucional

- Cuando analizo el mercado, necesito datos normalizados, con fuente, fecha, definicion y limitaciones.
- Cuando construyo modelos de riesgo/precio, necesito series por API, no PDFs ni scraping fragil.
- Cuando desarrollo una app/agente de IA, necesito endpoints estables, cuotas, historial, soporte y permisos claros.

## 9. Competencia y sustitutos

La competencia principal no es otra startup. Es una combinacion de llamadas, WhatsApp, rematadores, sitios propios, medios y fuentes oficiales.

| Sustituto/competidor | Fortaleza | Debilidad | Amenaza | Respuesta |
|---|---|---|---|---|
| Relacion personal con consignatario | Confianza maxima | Poco comparable, dependiente de persona | Muy alta | Complementar, no reemplazar |
| WhatsApp/grupos | Rapido y ubicuo | Desorden, poca memoria, no indexa | Muy alta | Integrar links, alertas, QR y seguimiento |
| Sitios de consignatarias | Fuente directa | Fragmentados, distintos formatos | Alta | Agregacion + trafico de vuelta |
| Rosgan/pantallas | Marca y volumen | Cobertura parcial, foco propio | Alta | Indexar/calendario/resultados, no competir frontal |
| Mercado Agroganadero | Referencia de precios | Representa plaza especifica | Alta como fuente | Citar, enriquecer, no apropiarse |
| IPCVA/medios agro | Autoridad/editorial | No resuelven remate/localidad | Media | Datos estructurados y herramientas |
| Radios rurales | Confianza regional | No estructurado | Media | Alianzas/promocion |
| Software ganadero/ERP | Gestion diaria | No resuelve visibilidad de remates | Media | Integracion/API |
| Marketplaces agro | Transaccion | Necesitan confianza/liquidez | Media-alta | No entrar hasta validar data y confianza |
| Consultores/CREA/veterinarios | Confianza profesional | Escala limitada | Media | Canal de validacion y distribucion |

## 10. Propuesta de valor

### Propuesta principal

**Para consignatarias:** "Que tus remates y tu casa aparezcan cuando el productor esta mirando el mercado, con contactos medibles y una presencia verificada que no depende de que te encuentren en un flyer viejo."

### Propuestas secundarias

Para productores:

- Menor costo de busqueda.
- Calendario unificado.
- Precios con fuente y fecha.
- Estimacion de valor/neto orientativo.
- Alertas y seguimiento.
- Comparacion descriptiva, no ranking opaco.

Para compradores y frigorificos:

- Descubrimiento de oferta.
- Calendario y alertas por provincia/tipo.
- Datos de precios/categorias.
- Directorio de operadores y frigorificos.

Para instituciones/empresas:

- API/MCP con fuentes, historicos, endpoints, cuotas y soporte.
- Reportes semanales/mensuales.
- Licencias de datos y dashboards.
- Integraciones/white label cuando exista contrato y SLA.

## 11. Modelo de plataforma

| Lado | Valor recibido | Accion esperada | Aporta | Incentivo | Debe pagar | Conflicto |
|---|---|---|---|---|---|---|
| Productores | Informacion gratis, alertas, herramientas | Consultar, seguir, preguntar | Comportamiento, leads, reviews | Mejor decision | No al inicio | Privacidad/confianza |
| Consignatarias | Visibilidad, leads, reputacion, analitica | Reclamar perfil, cargar/remitir remates | Datos de remates/resultados | Mas demanda | Si | Temor a comparacion |
| Compradores | Oferta y calendario | Seguir remates/categorias | Demanda, clicks | Mejor abastecimiento | Parcial | Desintermediacion |
| Frigorificos | Datos y oferta | Consumir API/reportes | Demanda/precios | Compra/riesgo | Si | Sensibilidad comercial |
| Bancos/seguros | Series, indices, valorizacion | API/licencia | Casos de uso | Riesgo/credito | Si | Responsabilidad |
| Medios | Datos citables | Citar/embed | Distribucion | Contenido | Sponsor/licencia | Apropiacion |
| Desarrolladores/IA | Endpoints/MCP | Integrar | Uso/API logs | Menos scraping | Si desde volumen | Commoditizacion |

Subsidio correcto: productor gratis y lectura publica gratis. Pagadores: consignatarias por demanda medible; empresas por datos, soporte, historico y licencia.

## 12. Arquitectura de ingresos priorizada

### 1. PRO Consignataria / Alcance

- Cliente: consignatarias activas, casas regionales, cooperativas, sociedades rurales con remates.
- Unidad: suscripcion mensual + eventualmente fee por campana/remate destacado.
- Precio inicial: ARS 45.000/mes por 90 dias; objetivo 12 meses: ARS 75.000-120.000 segun audiencia/leads.
- Margen bruto: 75-90% si la carga se automatiza; baja si hay operacion manual pesada.
- CAC: bajo-medio con venta directa founder-led, llamadas y WhatsApp.
- Riesgo: no demostrar ROI; baja audiencia regional; datos desactualizados.
- Escalabilidad: media; requiere soporte y relacion sectorial.
- Tiempo a ingreso: inmediato.

### 2. Datos empresariales/API/MCP

- Cliente: agtech, apps, analistas, bancos, aseguradoras, frigorificos, medios, consultoras.
- Unidad: plan mensual, licencia anual, reportes y soporte.
- Precios actuales del producto: Starter ARS 74.000/mes; Growth ARS 451.000/mes; Scale a medida.
- Margen bruto: alto, pero soporte/datos/SLAs suben costo.
- CAC: medio-alto; requiere prueba tecnica y confianza.
- Riesgo: mercado chico, fuente publica, scraping bloqueado, falta de resultados exclusivos.
- Escalabilidad: alta si hay historico y SLA.
- Tiempo a ingreso: 2-6 meses para cuentas serias.

### 3. Patrocinios/reportes

- Cliente: bancos, seguros, laboratorios, nutricion, genetica, medios, remates especiales.
- Unidad: sponsor de reporte, newsletter, indice, seccion o vertical.
- Precio tentativo: USD 300-1.500/mes segun audiencia; mayor con reportes institucionales.
- Riesgo: puede dañar neutralidad si no se separa editorial/publicidad.
- Uso: secundario, no core.

### 4. Leads/campanas

- Cliente: consignatarias, frigorificos, proveedores.
- Unidad: lead calificado o campana por remate.
- Precio tentativo: ARS 5.000-25.000 por lead calificado o ARS 30.000-100.000 por remate/campana cuando haya volumen.
- Riesgo: calidad de lead y privacidad.
- Uso: evolucion natural de PRO Consignataria.

### 5. Servicios transaccionales/financieros

- No prioritario antes de 24-36 meses.
- Requiere licencias, contratos, gestion de riesgo, cobranza, cumplimiento y confianza institucional.
- Solo avanzar si la plataforma ya tiene datos de resultados, reputacion y demanda suficiente.

## 13. Alternativas estrategicas evaluadas

| Alternativa | Atractivo | Riesgo | Prioridad |
|---|---:|---:|---:|
| Medio/portal con publicidad | Bajo-medio | CPM bajo, trafico insuficiente | Baja |
| Directorio premium | Medio | Poco valor aislado | Media como parte de PRO |
| Generacion de oportunidades para consignatarias | Alto | Requiere medicion | Alta |
| SaaS para consignatarias | Medio-alto | Onboarding pesado | Media fase 2 |
| Terminal de precios para productores | Medio | Baja WTP | Gratis/freemium blando |
| Comparador de consignatarias | Alto usuario, sensible | Conflicto sectorial | Cuidado, descriptivo |
| Marketplace/intermediario | Alto teorico | Confianza/legal/capital | No ahora |
| Inteligencia de mercado por suscripcion | Alto B2B | Necesita dato diferencial | Alta fase 2 |
| API datos | Alto margen | Mercado acotado/ciclo largo | Alta, segundo motor |
| Infraestructura IA/MCP | Estrategica | Puede ser feature no negocio | Soporte de API |
| Leads para otros proveedores | Medio | Neutralidad | Fase 2 |
| Administracion de rodeos | Bajo para foco | Mercado competido | No |
| Finanzas/seguros | Alto futuro | Regulatorio | Fase 3 |
| Modelo hibrido | Alto | Riesgo de dispersion | Seleccionado, secuenciado |

## 14. Estrategia de datos

| Dato | Fuente | Frecuencia | Confiabilidad | Valor comercial | Riesgo | Moat potencial |
|---|---|---:|---:|---:|---:|---:|
| Calendario remates | Sitios casas, scrapers, carga propia | Diario/semanal | Media | Alto para consignatarias/compradores | Medio scraping | Media si normalizado |
| Consignatarias | Curacion propia, claims, registros | Continua | Media-alta si verificado | Alto PRO | Bajo-medio | Alta con claims/reputacion |
| Localidad/provincia | Normalizacion propia | Continua | Media | Medio | Bajo | Media |
| Categorias/precios | MAG/mercado | Dia de remate | Alta para esa plaza | Alto B2B | Medio fuente | Media sin historico propio |
| INMAG | MAG | Dia de mercado | Alta para referencia | Alto | Medio | Media-alta con USD/metodo |
| Cabezas anunciadas | Flyers/sitios/carga | Por remate | Baja-media | Alto | Medio | Alta si mejora cobertura |
| Resultados remates | Casas, PDFs, carga, OCR | Por remate | Baja inicial | Muy alto | Alto legal/acceso | Muy alta |
| Compradores | Solo si acuerdos | Operacion | Sensible | Alto | Alto privacidad | Alta, no ahora |
| Frigorificos/habilitaciones | SENASA/MAGyP | Periodica | Alta oficial | Medio B2B | Bajo | Media |
| Plazos/comisiones | Declaracion/verificacion | Periodica | Media | Alto productor | Alto sensibilidad | Alta si verificable |
| Clima/maiz/USD/faena/exportaciones | APIs oficiales/mercado | Diario/mensual | Media-alta | Medio-alto | Bajo-medio | Baja por commodity |
| Arrendamientos | INMAG/metodologia | Mensual/diario | Media | Alto audiencia | Bajo | Media |
| Reputacion | Reviews/claims | Continua | Baja sin moderacion | Alto | Alto legal | Alta si auditada |
| Consultas usuarios | First-party analytics | Continua | Alta propia | Alto | Alto privacidad | Alta |

**Verdadero data moat:** resultados normalizados de remates + actividad verificada por consignataria + comportamiento de busqueda/consulta + metodologia publica. Scraping por si solo no es moat; cualquier actor puede copiarlo o bloquearlo. El moat es que las casas quieran cargar, corregir y mostrar datos porque reciben demanda medible.

## 15. Estrategia de inteligencia artificial

Util actualmente:

- Extraccion de flyers, PDFs y posteos para remates.
- Clasificacion de categorias, provincia, localidad y tipo.
- Deteccion de duplicados/errores.
- Consultas en lenguaje natural sobre precios, remates, frigorificos y arrendamiento via MCP.
- Generacion de alertas explicadas y reportes borrador con fuente.

Posible pero no core:

- Asistente de productor para "vendo o espero".
- Comparacion automatica de consignatarias.
- Prediccion de precios.
- Recomendaciones por lote.

Alto riesgo:

- Consejos financieros o comerciales personalizados sin datos completos.
- Ranking de consignatarias por "mejor resultado" sin resultados auditados.
- Inferir reputacion de opiniones no verificadas.

La IA debe reducir costo operativo y ampliar distribucion. No debe ser la propuesta de valor principal. La frase correcta no es "IA ganadera", sino "dato ganadero estructurado y confiable, usable por personas, sistemas y agentes".

## 16. Producto minimo vendible

### Alternativa A: centrada en consignatarias

- Usuario: dueno/gerente de consignataria regional con remates frecuentes.
- Problema: necesita mas productores/compradores mirando sus remates y un perfil confiable.
- Solucion: perfil verificado + remates destacados + distribucion email + QR + tracking de WhatsApp/leads + reporte mensual.
- Precio: ARS 45.000/mes piloto 90 dias.
- Canal: llamada directa, WhatsApp, remates, sociedades rurales.
- Operacion manual: alta al inicio; se justifica para aprender.
- Metrica: 10 casas piloto, 70% activas al mes 3, al menos 1 consulta medible por remate promocionado.
- Riesgo: audiencia insuficiente o no segmentada.
- Validacion: vender antes de construir CRM completo.

### Alternativa B: centrada en productores

- Usuario: productor mediano/invernador/administrador.
- Problema: saber valor probable/neto y momento de venta.
- Solucion: alertas + calculadora avanzada + historico + reporte.
- Precio: ARS 5.000-15.000/mes o gratis con sponsor.
- Riesgo: baja WTP; decision sigue pasando por consignatario.
- Veredicto: no como primer producto pago.

### Alternativa C: datos empresariales

- Usuario: agtech, frigorifico, banco, app, analista.
- Problema: necesita datos normalizados por API.
- Solucion: API/MCP + historicos + webhooks + soporte.
- Precio: ARS 74.000/mes Starter; ARS 451.000/mes Growth.
- Riesgo: ciclo largo y necesidad de SLA.
- Veredicto: vender en paralelo, pero no depender de esto en los primeros 90 dias.

**Eleccion:** Alternativa A como primer producto vendible; Alternativa C como segundo carril comercial; Alternativa B como audiencia gratuita y generador de senales.

## 17. Go-to-market

### Cliente inicial ideal

Consignataria regional con:

- 2 o mas remates por mes.
- Presencia web/WhatsApp imperfecta.
- Necesidad de captar productores fuera de su circulo inmediato.
- Capacidad de responder consultas rapido.
- Dueño/gerente accesible.
- Disposicion a mostrar datos basicos y actualizar remates.

Regiones iniciales recomendadas:

1. Buenos Aires interior y La Pampa: volumen, competencia y busqueda.
2. Entre Rios/Corrientes: el repo ya muestra cobertura de remates y oportunidad NEA.
3. Cordoba/Santa Fe: densidad y feedlot/invernada.

### Oferta de entrada

"Piloto 90 dias: cada remate tuyo publicado, destacado y distribuido; perfil verificado; QR para catalogo; reporte mensual con visitas, clicks y consultas. ARS 45.000/mes. Si no hay actividad medible en 60 dias, se pausa sin penalidad."

### Canales

- Llamadas directas a duenios/gerentes.
- WhatsApp con captura del perfil actual y remates ya indexados.
- Visitas a remates/ferias.
- Sociedades rurales y cooperativas.
- Martilleros y representantes territoriales.
- Newsletter "El Corredor".
- Referidos: un mes sin cargo por casa referida que active 90 dias.
- Alianzas con medios/radio rural para reportes de remates.

### Objeciones y respuesta

| Objecion | Respuesta |
|---|---|
| "Mis clientes ya me conocen" | No vendemos reemplazo; medimos demanda incremental y presencia cuando productores buscan precios/remates. |
| "No quiero ranking" | Perfil descriptivo, metodologia publica y separacion de publicidad/ranking organico. |
| "No tengo tiempo de cargar" | Carga asistida inicial; luego WhatsApp/email o plantilla simple. |
| "No se si trae clientes" | Piloto con reporte mensual, UTM, WhatsApp clicks y leads. |
| "Es caro" | Comparar contra un aviso, flyer o remate con baja asistencia; ARS 45.000 es precio de aprendizaje. |

## 18. Confianza y legitimidad

Reglas no negociables:

- Mostrar fuente, fecha y alcance de cada dato.
- Separar ranking organico de perfil destacado/pago.
- Derecho a replica y correccion visible.
- Perfiles reclamados con verificacion de identidad/cargo.
- Reviews moderadas, con rol del remitente y sin publicar acusaciones no verificables.
- No publicar "mejor consignataria" sin metodologia y datos suficientes.
- Diferenciar precios observados, precios estimados y resultados reales.
- Politica de privacidad para leads, IPs y consultas.
- Consejo asesor informal: 3 consignatarias regionales, 2 productores, 1 economista ganadero, 1 abogado/compliance agro.

Como evitar ser percibido como amenaza: vender "alcance y confianza verificable", no "te vamos a rankear". La comparacion debe empezar por hechos: actividad, zonas, tipos de remate, datos de contacto, calendario, condiciones declaradas y fuentes. El score reputacional, si existe, debe llegar tarde y con explicacion.

## 19. TAM, SAM y SOM

No se calcula multiplicando productores por suscripcion. Se construye desde unidades de gasto ya existentes o razonablemente presupuestables.

### Variables verificadas o internas

- 104 perfiles canonicos en producto.
- 735 remates locales; 283 programados desde 11-jul-2026.
- 166 remates con cabezas estimadas, 535.547 cabezas reportadas en esos casos.
- 500 suscriptores newsletter hardcoded en `PLATFORM_STATS`.
- 3.439 usuarios ultimos 30 dias.

### Supuestos de mercado

- Consignatarias/operadores comercialmente relevantes alcanzables: 250-400.
- Casas con disposicion a pagar por promocion medible en 36 meses: 35-150 segun escenario.
- Clientes API/enterprise potenciales en Argentina: 20-80 entre agtech, medios, consultoras, bancos, aseguradoras, frigorificos y apps.
- Sponsors/reportes: 5-25 marcas con presupuesto sectorial si la audiencia y autoridad crecen.

### Escenarios de ingresos mensuales al mes 36

| Escenario | PRO Consignataria | API/datos | Sponsors/reportes/leads | MRR mes 36 | Lectura |
|---|---:|---:|---:|---:|---|
| Conservador | 35 clientes x USD 45 = USD 1.575 | USD 1.500 | USD 500 | USD 3.575 | No alcanza escala; requiere costos muy bajos o pivot |
| Base | 85 clientes x USD 65 = USD 5.525 | USD 3.283 | USD 3.000 | USD 11.808 | Break-even liviano cerca de mes 34-36 |
| Expansivo | 150 clientes x USD 80 = USD 12.000 | USD 10.800 | USD 8.000 | USD 30.800 | Negocio rentable y financiable |

Advertencia: las cifras son supuestos operativos en USD reales para evitar distorsion inflacionaria. Los cobros pueden ser en ARS ajustados mensualmente.

## 20. Modelo financiero mensual base, 36 meses

Supuestos base:

- Precio promedio PRO Consignataria sube de USD 45 a USD 65 equivalente.
- API incluye Starter, Growth y un Scale chico desde mes 20.
- Sponsors/reportes arrancan cuando hay prueba de audiencia y continuidad.
- Costos incluyen desarrollo, datos, soporte, ventas, marketing, editorial, legal, admin y viajes.
- No incluye sueldos completos de equipo grande; es modelo lean/founder-led.

| Mes | Consignatarias pagas | API clientes eq. | Ingresos USD | Costos USD | Neto USD |
|---:|---:|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 | 3.500 | -3.500 |
| 2 | 1 | 0 | 45 | 4.000 | -3.955 |
| 3 | 3 | 0 | 135 | 4.500 | -4.365 |
| 4 | 5 | 1 Starter | 274 | 5.000 | -4.726 |
| 5 | 8 | 1 Starter | 409 | 5.000 | -4.591 |
| 6 | 10 | 2 Starter | 548 | 5.500 | -4.952 |
| 7 | 13 | 2 Starter + 1 Growth | 982 | 6.000 | -5.018 |
| 8 | 15 | 3 Starter + 1 Growth | 1.121 | 6.200 | -5.079 |
| 9 | 18 | 3 Starter + 1 Growth | 1.256 | 6.500 | -5.244 |
| 10 | 20 | 4 Starter + 1 Growth | 1.395 | 6.700 | -5.305 |
| 11 | 22 | 4 Starter + 1 Growth | 1.535 | 6.900 | -5.365 |
| 12 | 25 | 4 Starter + 1 Growth | 1.995 | 7.000 | -5.005 |
| 13 | 28 | 5 Starter + 1 Growth | 2.184 | 7.400 | -5.216 |
| 14 | 31 | 5 Starter + 1 Growth | 2.349 | 7.600 | -5.251 |
| 15 | 34 | 5 Starter + 2 Growth | 2.813 | 7.900 | -5.087 |
| 16 | 37 | 6 Starter + 2 Growth | 3.027 | 8.100 | -5.073 |
| 17 | 41 | 6 Starter + 2 Growth | 3.297 | 8.300 | -5.003 |
| 18 | 45 | 6 Starter + 2 Growth | 4.467 | 8.500 | -4.033 |
| 19 | 48 | 7 Starter + 2 Growth | 4.681 | 8.700 | -4.019 |
| 20 | 51 | 7 Starter + 3 Growth + 1 Scale chico | 5.828 | 9.000 | -3.172 |
| 21 | 54 | 8 Starter + 3 Growth + 1 Scale chico | 6.057 | 9.200 | -3.143 |
| 22 | 57 | 8 Starter + 3 Growth + 1 Scale chico | 6.237 | 9.300 | -3.063 |
| 23 | 59 | 8 Starter + 3 Growth + 1 Scale chico | 6.657 | 9.400 | -2.743 |
| 24 | 60 | 8 Starter + 3 Growth + 1 Scale chico | 7.389 | 9.500 | -2.111 |
| 25 | 62 | 9 Starter + 3 Growth + 1 Scale | 7.758 | 9.600 | -1.842 |
| 26 | 64 | 9 Starter + 4 Growth + 1 Scale | 8.177 | 9.700 | -1.523 |
| 27 | 66 | 9 Starter + 4 Growth + 1 Scale | 8.477 | 9.800 | -1.323 |
| 28 | 68 | 10 Starter + 4 Growth + 1 Scale | 8.846 | 9.900 | -1.054 |
| 29 | 70 | 10 Starter + 4 Growth + 1 Scale | 9.126 | 10.000 | -874 |
| 30 | 72 | 10 Starter + 4 Growth + 1 Scale | 9.306 | 10.000 | -694 |
| 31 | 74 | 11 Starter + 4 Growth + 1 Scale | 9.635 | 10.100 | -465 |
| 32 | 76 | 11 Starter + 5 Growth + 1 Scale | 10.114 | 10.200 | -86 |
| 33 | 78 | 11 Starter + 5 Growth + 1 Scale | 10.444 | 10.300 | 144 |
| 34 | 80 | 12 Starter + 5 Growth + 1 Scale | 10.823 | 10.400 | 423 |
| 35 | 83 | 12 Starter + 5 Growth + 1 Scale | 11.318 | 10.500 | 818 |
| 36 | 85 | 12 Starter + 5 Growth + 1 Scale | 11.808 | 10.500 | 1.308 |

### Metricas objetivo base

| Metrica | Mes 12 | Mes 24 | Mes 36 |
|---|---:|---:|---:|
| MRR | USD 1.995 | USD 7.389 | USD 11.808 |
| ARR run-rate | USD 23.940 | USD 88.668 | USD 141.696 |
| Margen bruto | 75-80% | 78-83% | 80-85% |
| CAC PRO Consignataria | USD 100-250 | USD 150-300 | USD 200-350 |
| CAC API | USD 500-2.000 | USD 800-3.000 | USD 1.000-4.000 |
| Churn mensual cons. | 4-7% | 3-5% | 2-4% |
| Churn mensual API | 3-5% | 2-3% | 1-2% |
| Payback PRO | 3-6 meses | 3-5 meses | 3-5 meses |
| Payback API | 6-12 meses | 5-10 meses | 4-8 meses |

### Sensibilidad

- Si PRO Consignataria queda en USD 35 equivalente y no sube, el escenario base pierde aproximadamente USD 2.550/mes al mes 36.
- Si no se consiguen 3 clientes Growth o 1 Scale, el mes 36 cae por debajo de break-even.
- Si la audiencia no supera 10.000 usuarios/mes con segmentacion ganadera, los patrocinios son accesorios, no motor.
- Si los datos de resultados de remates no se incorporan, la API queda mas expuesta a sustitucion por scraping de fuentes publicas.

## 21. Riesgos

| Riesgo | Prob. | Impacto | Indicador temprano | Mitigacion |
|---|---:|---:|---|---|
| Datos incompletos/desactualizados | Alta | Alto | Reclamos, remates duplicados | SLA interno de datos, fuentes visibles, correccion facil |
| No demostrar ROI a consignatarias | Media | Alto | Baja conversion piloto->pago | Medir leads/clicks, reportes simples, prueba 90 dias |
| Baja WTP productor | Alta | Medio | Pocos pagos usuario | Productor gratis; monetizar B2B |
| Ciclo API largo | Alta | Medio-alto | Demos sin cierre | Starter tecnico + casos concretos + referencia |
| Scrapers bloqueados | Media | Alto | Falla fuentes | Carga propia, acuerdos, cache, fuentes alternativas |
| Conflicto por rankings | Media | Alto | Quejas de casas | Metodologia, descriptivo, derecho a replica |
| Responsabilidad por recomendaciones | Media | Alto | Uso de "vendo ahora" como consejo | Disclaimer, no asesoramiento financiero, rangos |
| Privacidad/leads | Media | Alto | Reclamos PII | Consentimiento, minimizacion, RLS, retencion |
| Competidor institucional | Media | Alto | Camara/medio lanza directorio | Moat de datos, claims, distribucion |
| Mercado chico | Media | Alto | CAC > LTV | Precios B2B, costos lean, foco regional |
| Concentracion ingresos | Media | Medio | 2 clientes = >40% MRR | Diversificar cons/API/sponsors |
| Falta resultados remates | Alta | Alto | No hay comparacion real | Producto de carga/acta cierre con incentivo |
| Resistencia cultural | Alta | Medio | No claims, baja respuesta | Vender como complemento, usar referentes |

## 22. Plan de investigacion primaria

### Muestra minima en 45 dias

- 20 productores: cria, invernada, ciclo completo, feedlot, cabanas, pequenos, medianos, empresas, NEA, pampeana y extrapampeana.
- 15 consignatarias: nacionales, regionales, cooperativas, locales, digitalizadas y manuales.
- 10 otros actores: compradores, frigorificos, bancos, aseguradoras, sociedades rurales, veterinarios, CREA/asesores, medios.

### Guia productores

Preguntar por hechos recientes, no hipoteticos:

- Contame la ultima venta de hacienda: categoria, canal, consignataria, fecha, plazo, por que ese canal.
- Que alternativas evaluaste y cuales descartaste.
- Como supiste si el precio fue bueno.
- Que costo/gasto te sorprendio en la liquidacion.
- Cuando fue la ultima vez que buscaste precio online; que hiciste despues.
- Que informacion no le darias a una plataforma.
- Que tendria que pasar para consultar una consignataria nueva.
- Cual fue el ultimo error comercial y cuanto costo.
- Que presupuesto ya pagas: asesor, software, informe, grupo, publicidad, comision.

### Guia consignatarias

- Ultimo remate: como se difundio, cuanto costo, que funciono.
- Como captan productores nuevos.
- Donde pierden tiempo cargando datos.
- Que consultas llegan por WhatsApp y como se siguen.
- Que informacion no quieren publicar.
- Como miden si un remate tuvo buena convocatoria.
- Cuanto gastan por mes en flyers, redes, medios, radio, web, sistemas.
- Que aceptarian pagar si trae consultas medibles.
- Que les daria miedo de una comparacion publica.

### Guia empresas/API

- Que dato consumen hoy y como.
- Que scraping/planilla quieren dejar de mantener.
- Frecuencia, criticidad y tolerancia a error.
- Presupuesto actual en datos/reportes/software.
- Requisitos de licencia, SLA, soporte, historico.
- Que endpoint justificaria pagar este mes.

## 23. Roadmap

### Primeros 30 dias

- Objetivo: validar pagador inicial y oferta.
- Producto: PRO Consignataria piloto.
- Cliente: 20 casas contactadas, 5 pilotos pagos o con compromiso firmado.
- Precio: ARS 45.000/mes.
- KPI: conversion llamada->demo >25%; demo->piloto >20%; 100% remates publicados.
- Responsable: founder/comercial + data ops.
- Recursos: lista de 50 casas, script, one-pager, reporte demo.
- Avanzar si: 5 casas aceptan piloto.
- Detener/modificar si: ninguna casa paga o todas piden solo gratis.

### Dias 31 a 90

- Objetivo: probar ROI y retencion.
- Producto: perfil verificado, remates destacados, email, QR, WhatsApp tracking, reporte mensual.
- Cliente: 10-15 casas piloto.
- KPI: 70% publican remates; 1+ accion medible por remate; 60% renueva.
- Recursos: soporte manual, plantilla de carga, dashboard simple.
- Avanzar si: al menos 7 pagos activos y 3 testimonios/casos.
- Modificar si: clicks/leads no llegan o la carga manual consume demasiado.

### Meses 4 a 12

- Objetivo: pasar de piloto a producto repetible.
- Producto: PRO Consignataria v2 + API Starter/Growth + reporte patrocinable.
- Cliente: 25 consignatarias, 5 API, 1 sponsor.
- KPI: MRR USD 2.000 equivalente; churn <6%; datos de remates >90% frescos.
- Recursos: inside sales, data QA, automatizacion de carga, legal basico.
- Avanzar si: hay MRR recurrente y uso API real.
- Modificar si: PRO no demuestra ROI o API no cierra ningun cliente pago.

### Meses 13 a 36

- Objetivo: escalar nacionalmente y construir data moat.
- Producto: resultados de remates, historicos, API/licencias, reportes, CRM liviano.
- Cliente: 85 consignatarias, 18 API, sponsors/reportes.
- KPI: USD 10k+ MRR, break-even, 40% de remates con resultados/cabezas, 3 clientes institucionales.
- Recursos: ventas sectoriales, responsable datos, soporte, asesor ganadero, legal.
- Avanzar a financieros/transaccional solo si: hay datos de resultados, confianza, contratos y partner regulado.
- No avanzar si: datos propios no superan fuentes publicas.

## 24. Recomendacion final

### Que deberia ser

consignatarias.com.ar debe ser **la infraestructura neutral de informacion, distribucion y datos del mercado de remates/consignatarias de hacienda en Argentina**. La compania debe ganar primero la posicion de fuente confiable y util, y despues monetizar esa posicion con B2B.

### Que no deberia intentar ser

- No debe ser un marketplace transaccional en los primeros 24 meses.
- No debe cobrarle al productor por informacion general en esta etapa.
- No debe construir un ERP ganadero completo.
- No debe prometer rankings de "mejor consignataria" sin datos de resultados.
- No debe vender IA como producto principal.
- No debe vivir de publicidad programatica.

### Quien deberia pagar y por que

1. **Consignatarias**, porque necesitan demanda, visibilidad, confianza y medicion de sus remates.
2. **Empresas/instituciones**, porque necesitan datos normalizados, historicos, API, soporte y licencia.
3. **Sponsors sectoriales**, solo como ingreso secundario, porque quieren llegar a una audiencia ganadera contextual.

### Primer producto pago

**PRO Consignataria - Alcance de remates y perfil verificado.**

Debe incluir:

- Perfil reclamado/verificado.
- Remates destacados.
- Distribucion por email/newsletter y, luego, alertas segmentadas.
- Tracking de WhatsApp/clicks/leads.
- QR para catalogos y remates.
- Reporte mensual simple.

Precio inicial recomendado: **ARS 45.000/mes por 90 dias**, cobrable ya porque coincide con el producto existente y el nivel de audiencia actual. Objetivo: subir a **ARS 75.000-120.000/mes** al probar consultas medibles y segmentacion.

### Que vender en los proximos 90 dias

- 10 pilotos PRO Consignataria.
- 2 pilotos API Starter/Growth con clientes que ya tengan caso tecnico.
- 1 sponsorship de "El Corredor" o seccion de arrendamiento si no compromete neutralidad.

### Hipotesis que podria invalidar el negocio

Si, despues de 90 dias y 50 conversaciones comerciales, menos de 5 consignatarias aceptan pagar aunque sea el precio piloto, y si ningun cliente B2B acepta pagar por datos/API, entonces el mercado monetizable inmediato es demasiado chico o la propuesta no resuelve una urgencia real. En ese caso, el proyecto deberia pivotear a medio/autoridad de bajo costo o vender servicios de datos/reportes a medida, no seguir construyendo producto SaaS.

### Ventaja competitiva a construir en tres anos

La ventaja no sera "tenemos muchas paginas". Debe ser:

1. Base normalizada y fresca de remates y consignatarias.
2. Perfiles reclamados/verificados.
3. Resultados de remates y actividad historica por casa/zona/categoria.
4. Audiencia gratuita de productores con intencion real.
5. API/MCP con metodologia, licencia, logs y soporte.
6. Reputacion institucional por transparencia metodologica.

En una frase: **ser la fuente que productores consultan, consignatarias corrigen y empresas integran**.

## 25. Bibliografia y fuentes

### Producto y datos internos

- `src/lib/data/consignataria-slugs.ts`: 104 perfiles canonicos.
- `src/lib/data/remates.json`: 735 remates; conteos y cabezas estimadas parciales al 11-jul-2026.
- `src/lib/data/frigorificos.json`: 1.102 frigorificos en directorio local.
- `src/lib/data/market-prices.json`: INMAG y precios locales actualizados al 10-jul-2026.
- `docs/ga4-growth-2026-07-09.json`: usuarios GA4.
- `docs/gsc-data-2026-07-08.json`: clicks, impresiones y queries GSC.
- `src/app/(terminal)/planes/PlanesToggle.tsx`: precios actuales de PRO Consignataria y API.
- `docs/strategy/POSITIONING-THESIS.md`: tesis interna previa, usada como insumo y cuestionada.

### Fuentes sectoriales y oficiales

- SENASA, estadisticas bovinas: https://www.argentina.gob.ar/senasa/mercados-y-estadisticas/estadisticas/animal-estadisticas/bovinos. Alcance: Argentina; pagina institucional con cortes historicos, visible con datos 2021; limitacion: no usar como cifra actual 2026 sin dataset actualizado.
- Mercado Agroganadero, precios por categorias/detalle: https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000502. Alcance: operaciones/plaza MAG; limitacion: no representa todo el mercado bovino argentino.
- IPCVA, estadisticas e informes: https://ipcva.agrositio.com/estadisticas.php y https://ipcva.agrositio.com/vertext2.php?id=2953. Alcance: mercado argentino de carne vacuna; limitacion: segun informe y periodo.
- INDEC, Censo Nacional Agropecuario 2018: https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-8-87. Alcance: estructura agropecuaria; limitacion: censo 2018, no describe por si solo el mercado comercial 2026.
- ROSGAN: https://www.rosgan.com.ar/. Alcance: remates ganaderos televisados/online y mercado de referencia; limitacion: cobertura parcial y operador propio.
- CREA, Outlook Ganadero 2026: https://media.contenidoscrea.org.ar/adjuntos/334/documentos/000/010/0000010468.pdf. Alcance: Argentina, escenario ganadero 2026; metodologia: compila y analiza fuentes SAGyP, IPCVA, INDEC y mercado; limitacion: documento de outlook, no base primaria completa.
- Banco Central de la Republica Argentina, principales variables: https://www.bcra.gob.ar/PublicacionesEstadisticas/Principales_variables.asp. Alcance: variables macro/financieras argentinas; uso recomendado: deflactar, dolarizar o actualizar precios en ARS; limitacion: no es fuente sectorial ganadera.
- FAO, market information and early warning: https://www.fao.org/markets-and-trade/areas-of-work/market-information-and-early-warning/en/. Uso: marco sobre informacion de mercado; limitacion: global, no especifico Argentina.
- World Bank, ICT/agriculture and market information systems: usar como marco conceptual internacional; aplicar con cautela a Argentina por diferencias institucionales y de adopcion.

### Fuentes que deben completarse en investigacion primaria/secundaria

Este plan no debe presentarse como due diligence bibliografica cerrada. Antes de levantar capital o firmar contratos institucionales, falta documentar con fuentes primarias actualizadas: registro/cantidad de consignatarias activas, camaras sectoriales, gasto publicitario real de casas de remate, gasto en software de consignatarias, uso digital por segmento productor, datos de financiamiento ganadero bancario y condiciones reales de comisiones/plazos. Las fuentes a completar incluyen camaras de consignatarios, sociedades rurales, FAUBA/universidades nacionales, repositorios academicos argentinos y BID sobre digitalizacion agropecuaria.

### Marcos teoricos aplicados

- Williamson: costos de transaccion explican por que confianza, cobranza y garantia no desaparecen con una web.
- Akerlof/asimetria: reputacion y verificacion reducen riesgo de seleccionar mal consignataria o lote.
- Teoria de agencia: consignataria actua por cuenta del productor pero puede tener incentivos propios; transparencia debe ser cuidadosa.
- Rochet-Tirole y plataformas multi-lado: subsidiar productores puede tener sentido si otro lado paga; no alcanza tener trafico.
- Difusion de innovaciones: adopcion ganadera sera gradual; empezar con complementos a WhatsApp/relaciones.
- Porter: sustituto principal es relacion personal; barrera esta en datos/verificacion, no UI.
- RBV: recurso valioso, raro y dificil de imitar = resultados verificados + red de casas + historico propio.
- Lean Startup: validar con ventas reales a consignatarias antes de construir SaaS completo.
