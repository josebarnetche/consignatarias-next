# Cómo cierra un intermediario — investigación para el agente de consignatarias.com.ar

*21-10-2026. Fuentes web, con URL en cada punto. Donde no encontré dato primario, lo digo.*

## 1. Cadencia de seguimiento y respuesta a cold email

- **El primer mail rinde más, pero el seguimiento junta la mayoría de las respuestas.** En la muestra de Belkins (más de 7,5 M de mails), los pasos 2 a 6 suman el 58,6% de las respuestas y el paso 1 el 41,4%. La tasa de cada mail cae a medida que avanza la secuencia: 6,94% en el segundo y 3,01% en el cuarto. https://belkins.io/blog/sales-follow-up-statistics.md · https://belkins.io/blog/sales-follow-up-statistics?frame=0
- **Hay un techo.** Con 4 mails o más, las bajas y las denuncias de spam se multiplican por más de tres (Belkins, misma fuente). Instantly recomienda 1 a 3 seguimientos en 7 a 14 días y ubica la respuesta B2B típica entre 5% y 9%. https://instantly.ai/blog/cold-email-reply-rate-benchmarks?lng=en
- **La velocidad pesa más que la cantidad de toques.** En el estudio de HBR (2.241 empresas), las que contestaron dentro de la primera hora tuvieron unas 7 veces más chances de calificar el lead que las que tardaron una hora más, y más de 60 veces más que las que tardaron un día. El 23% de las empresas nunca respondió. https://hbr.org/2011/03/the-short-life-of-online-sales-leads
- **Cómo no caer en spam.** Gmail y Yahoo piden SPF, DKIM y DMARC, baja en un clic (RFC 8058) procesada en 2 días y una tasa de spam menor al 0,3%. https://help.close.com/docs/requirements-for-bulk-email-senders · https://www.warmy.io/guides/google-yahoo-sender-requirements/
- **Lo que pide la ley argentina.** La Ley 25.326 (art. 27) y la Disp. DNPDP 4/2009 obligan a que todo mail publicitario ofrezca, a la vista, la opción de retiro o bloqueo. Si el envío no fue pedido, hay que advertir en forma destacada que es publicidad. https://abogados.com.ar/ejercicio-del-derecho-de-retiro-o-bloqueo-opt-out/2805
- *Aclaración:* casi todos los benchmarks vienen de proveedores de herramientas de outreach. No encontré datos del agro argentino.

## 2. Cómo presentar y cobrar la comisión, y cómo evitar el bypass

- **La comisión por escrito y antes de presentar a las partes es práctica estándar.** Desde el 17-08-2024, el acuerdo NAR exige en EE.UU. un acuerdo escrito con el comprador antes de mostrarle una propiedad, incluso por video en vivo. La compensación tiene que figurar de forma específica y visible, como monto fijo o porcentaje. https://www.nar.realtor/the-facts/written-buyer-agreements-101 · https://bulletins.ncrec.gov/has-the-world-exploded-the-nar-settlement-commission-law-and-rules/
- **Qué dice la ley argentina.** El CCyC (art. 1350) le da derecho a la comisión al corredor cuando el negocio se concluye por su intervención. El art. 1352 la mantiene aunque el contrato después se resuelva, y el art. 1353 la excluye si una condición suspensiva no se cumple o el contrato es nulo. Por eso la huella documental de la presentación es la prueba central. https://codigocivilonline.com.ar/etiquetas/articulo-1350/ · https://repositorio.uca.edu.ar/bitstream/123456789/20499/1/intermediacion-inmobiliaria.pdf
- **Cláusula de no elusión.** Un NDA protege la información pero no impide que las partes negocien directo. La cláusula de no elusión (NCA/NCND, muy usada en materias primas) sí lo hace. Debe definir quién es la parte presentada, el plazo, la zona y el producto. Su punto débil es que el incumplimiento es difícil de probar. https://www.upcounsel.com/ncnd · https://www.hyperstart.com/blog/non-circumvention-clause/
- **Lo que más retiene es el servicio después del match.** Las fugas son más probables cuando las mismas partes repiten operaciones y la plataforma no agrega nada después de presentarlas. Lo que retiene es el pago protegido, las garantías y la reputación. https://sharetribe.com/marketplace-glossary/disintermediation-platform-leakage · https://pubsonline.informs.org/doi/fpi/10.1287/opre.2025.2046 . Un working paper de 2023 encontró que, en una app de limpieza, se perdía como máximo 1 de cada 83 relaciones, así que el riesgo depende del mercado (citado en la misma búsqueda; no lo verifiqué en el original).
- **El caso deCampoaCampo.** Cobra comisión solo al comprador, presenta la cotización como "compromiso de compra" y su billetera deCampoPagos le da al vendedor el saldo disponible desde la liquidación. https://www.iprofesional.com/negocios/431884-es-argentino-y-tuvo-una-idea-genial-creo-mercado-libre-de-las-vacas
- **Sin fuente:** no encontré evidencia publicada de que el descuento por pronto cierre funcione en el agro. No encontré las tarifas públicas de Rosgan ni de AuctionsPlus.

## 3. Métricas para el tablero

- **Pipeline ponderado:** el valor de cada operación por la probabilidad de su etapa. Las probabilidades se calibran con el historial propio y se revisan todos los meses contra lo que efectivamente se cerró. https://forecastio.ai/blog/weighted-pipeline · https://www.pedowitzgroup.com/why-track-weighted-pipeline-value-vs.-raw-deal-value?hsLang=en
- **Velocidad de venta:** (oportunidades × tasa de cierre × ticket promedio) ÷ días de ciclo. No hay benchmark universal; se compara contra la línea de base propia. https://www.apollo.io/insights/what-is-sales-velocity
- **Tiempo en etapa y operaciones trabadas:** se marca la operación que supera 1,5× o 2× la duración media de su etapa, o que lleva 7 días o más sin actividad. Para una de las fuentes, es saludable tener menos del 20% de operaciones trabadas. https://fullenrich.com/content/sales-pipeline-metrics · https://count.co/metric/deal-velocity
- Sumar la **tasa de conversión por etapa** para ver dónde se cae el embudo (Pedowitz, arriba).

## 4. Cómo comunicar un servicio "llave en mano" con automatización atrás

- **El encuadre de deCampoaCampo:** opera con más de 160 personas y equipos comerciales en Río Cuarto, Gualeguaychú y General Mansilla. Su tecnología acompaña a esa red de personas, no la reemplaza (iProfesional, arriba). Según Dealroom, Agrofy se define igual: digitaliza la cadena de suministro que ya existe en vez de desintermediarla. https://app.dealroom.co/companies/agrofy
- **Argentina:** no hay hoy una ley específica sobre IA. Rigen el deber de información "cierta, clara y detallada" de la Ley 24.240 y el Decreto 274/2019 de Lealtad Comercial, que prohíbe la publicidad que induzca a error sobre las características del servicio. Hay proyectos para obligar a declarar el uso de IA (7045-D-2024 y 5701-D-2025); no verifiqué que alguno se haya aprobado. https://www.derechoenzapatillas.com/2025/platos-perfectos-generados-por-ia-publicidad-enganosa-o-innovacion/ · https://www4.hcdn.gob.ar/dependencias/dsecretaria/Periodo2024/PDF2024/TP2024/7045-D-2024.pdf · https://www4.hcdn.gob.ar/dependencias/dsecretaria/Periodo2025/PDF2025/TP2025/5701-D-2025.pdf
- **UE (referencia si hay contrapartes de afuera):** el art. 50 del AI Act obliga a avisar al inicio de la conversación que se está tratando con una IA, salvo que sea evidente por el contexto. Según comentaristas secundarios, rige desde el 02-08-2026. https://gdprlocal.com/eu-ai-act-article-50/
- La Ley 24.240 protege al consumidor; si aplica o no a una operación entre productores y empresas depende de cada caso. Eso queda para consultar con un abogado.

## 5. Errores que matan la confianza en el agro

- **Describir mal el lote.** AuctionsPlus no deja que el vendedor evalúe su propia hacienda: exige un evaluador acreditado que verifique genética, sanidad y fechas de servicio, porque de eso depende la confianza del comprador. https://pages.auctionsplus.com.au/about/assessor-accreditation · https://www.beefcentral.com/news/auctionsplus-online-selling-option-surges-into-focus-under-covid-19-challenges/
- **No validar quién es la contraparte.** Hay casos de compradores con identidad falsa en remates feria y de cheques falsos (230 animales recuperados), y un impago a una consignataria de Olavarría por unos $300 millones en 2025. https://www.diariouno.com.ar/policiales/ardid-bandidos-estafar-remates-feria--03102017_B1Z9TgyxSV · https://www.infocampo.com.ar/?p=333491 · https://www.lanacion.com.ar/economia/campo/estafa-investigan-una-maniobra-sin-precedentes-que-perjudico-a-una-casa-consignataria-en-300-nid08042025/
- **Contestar tarde o no contestar** (HBR, punto 1).
- **Insistir de más** (Belkins, punto 1).
- **Cambiar las condiciones ya dadas:** deCampoaCampo trata la cotización como un compromiso de compra (iProfesional).

## Reglas accionables para el agente y el tablero

1. Contestar todo lead entrante en menos de 1 hora y medir el tiempo de primera respuesta como métrica principal.
2. Hacer como máximo 4 toques por contacto (el inicial y 3 seguimientos) en unos 14 días. Al cuarto sin respuesta, la operación pasa a "dormida".
3. Poner en cada mail la baja visible y la leyenda de publicidad cuando el envío no fue pedido. Configurar SPF, DKIM, DMARC y baja en un clic, y vigilar que la tasa de spam quede por debajo del 0,3%.
4. Mantener el "ACEPTO" escrito antes de presentar a las partes, con monto o porcentaje fijo, plazo, zona y producto (estilo NCA), y archivarlo con fecha y hora como prueba del art. 1350.
5. Registrar cada presentación (quién, a quién, cuándo, qué lote) para poder probar que el negocio se concluyó por nuestra intervención.
6. Retener con servicio después de la presentación: documentación del lote, seguimiento sanitario y de DT-e, y coordinación del cobro, no solo con la cláusula.
7. No publicar ni ofrecer un lote sin una descripción verificada por un tercero o por el operador humano, y que nunca la cargue solo el vendedor.
8. Validar la identidad de la contraparte (CUIT, RENSPA, referencias) antes de presentarla. Las estafas documentadas son de identidad falsa e impago.
9. Decir con claridad en la oferta y en la firma de los mails que el seguimiento lo hace un sistema y que una persona responde por la operación. No afirmar atención humana permanente si no existe.
10. Tablero: pipeline ponderado por etapa con probabilidades recalibradas cada mes contra los cierres reales.
11. Tablero: tiempo en etapa con alerta cuando una operación supera 1,5× la media de su etapa o lleva 7 días sin actividad. Mostrar la tasa de conversión por etapa y la velocidad de venta.
12. No prometer descuentos por pronto cierre ni garantías de cobro sin respaldo: no hay evidencia del agro que los avale y una promesa incumplida rompe la confianza.
