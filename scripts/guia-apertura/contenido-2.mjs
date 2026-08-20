/**
 * Guía "Cómo abrir tu consignataria de hacienda" — Partes III y IV.
 * Parte III: la operación. Parte IV: el plan de marketing digital (método Memola).
 */

export const PARTE_III = {
  numero: 'III',
  titulo: 'Operar',
  bajada:
    'El remate día por día, los papeles sanitarios, la liquidación y el único riesgo que funde consignatarias: el descalce.',
  capitulos: [
    {
      titulo: 'El remate feria, día por día',
      html: `
<p>Un remate no empieza el día del remate. Empieza treinta días antes, y lo que se hace en esos treinta días define el precio que se va a conseguir. Este es el cronograma que usan las firmas que rematan todos los meses sin sobresaltos.</p>

<table class="cronograma">
  <thead><tr><th>Momento</th><th>Qué se hace</th><th>Quién</th></tr></thead>
  <tbody>
    <tr><td><strong>D–30</strong></td><td>Se fija fecha y se publica. Se avisa a SENASA la fecha tentativa si el predio lo requiere. Se abre la lista de consignaciones.</td><td>Firma</td></tr>
    <tr><td><strong>D–25 a D–10</strong></td><td>Ronda de campo: se visita o se llama a cada productor de la zona. Se anota categoría, cantidad estimada y estado. Esta es la tarea que decide el remate.</td><td>Firma</td></tr>
    <tr><td><strong>D–15</strong></td><td>Primera pieza de difusión: fecha, lugar, hora y categorías esperadas. Sin números todavía.</td><td>Firma</td></tr>
    <tr><td><strong>D–7</strong></td><td>Cierre de consignaciones. Se arma el detalle por lote. Se confirma la nómina de compradores y se llama uno por uno a los que compran esa categoría.</td><td>Firma</td></tr>
    <tr><td><strong>D–5</strong></td><td>Publicación del detalle: cabezas por categoría, procedencia, sanidad. Es la pieza que más se comparte.</td><td>Firma</td></tr>
    <tr><td><strong>D–2</strong></td><td><strong>Aviso formal a la oficina local de SENASA</strong> (mínimo 48 horas). Sin esto, no hay remate autorizado.</td><td>Titular del predio</td></tr>
    <tr><td><strong>D–1</strong></td><td>Recepción de hacienda. Cada tropa llega con su DT-e. Pesada, clasificación por lote, marcación. Fotos y videos de corral.</td><td>Corral</td></tr>
    <tr><td><strong>D</strong></td><td>Remate. Inspección y certificación de SENASA presente de principio a fin. Registro de compradores, boletas por lote.</td><td>Martillero</td></tr>
    <tr><td><strong>D+1</strong></td><td>Emisión de DT-e de salida por comprador y destino. Carga y despacho. Publicación de resultados por categoría.</td><td>Firma</td></tr>
    <tr><td><strong>D+2 a D+5</strong></td><td>Facturación al comprador, liquidación al productor, retenciones, transferencias.</td><td>Administración</td></tr>
    <tr><td><strong>D+7</strong></td><td>Llamado a cada consignante. Precio obtenido, comparación con la plaza, propuesta para el próximo. La consignación siguiente se gana acá.</td><td>Firma</td></tr>
  </tbody>
</table>

<div class="callout">
  <div class="callout-title">La regla de los dos llamados</div>
  <p>El llamado de D–25 consigue hacienda. El llamado de D+7 consigue la hacienda del mes que viene. Las firmas que solo hacen el primero necesitan salir a buscar consignantes nuevos todos los meses; las que hacen los dos acumulan cartera. Es la diferencia entre facturar y tener negocio.</p>
</div>
`,
    },
    {
      titulo: 'DT-e, RENSPA y quién responde por qué',
      html: `
<p>Toda hacienda que se mueve necesita un <strong>DT-e</strong>, el Documento de Tránsito electrónico que reemplazó al DTA en papel. Es el "número de tropa" que ampara cada movimiento: del campo al remate, del remate al comprador, del comprador a faena. Se emite en el sistema SIGSA de SENASA.</p>

<div class="alerta">
  <div class="alerta-title">Enero de 2026 cambió el circuito</div>
  <p>Desde el <strong>1 de enero de 2026</strong> el DT-e ya no se cierra sin la <strong>lectura de los identificadores electrónicos</strong>: la tropa se arma en origen y se confirma en destino contra los números que efectivamente llegaron. La venta de caravanas visuales quedó prohibida desde diciembre de 2025, y cada identificación se declara dentro de los diez días hábiles. Cualquier descripción del circuito anterior a 2026 —y hay mucha dando vueltas— está vieja. Para vos significa una cosa concreta: <strong>si los números que bajan del camión no coinciden con los que salieron, el movimiento no cierra</strong>, y el problema aparece con la hacienda ya en tu corral.</p>
</div>

<h3>Qué hace falta para emitirlo</h3>
<ul>
  <li><strong>RENSPA vigente</strong> en origen y en destino. El RENSPA identifica la relación productor–establecimiento; sin él no hay movimiento posible.</li>
  <li>Clave fiscal de ARCA con el servicio habilitado, y CBU declarado para el pago de aranceles.</li>
  <li>Requisitos sanitarios validados por el sistema al momento de emitir: vacunación antiaftosa al día según la campaña de la zona, serología de brucelosis cuando corresponde, y barrera de garrapata si el movimiento la cruza.</li>
</ul>

<div class="alerta">
  <div class="alerta-title">El punto que te afecta directo</div>
  <p>Cuando interviene un consignatario, <strong>la autogestión del DT-e es obligatoria</strong>. Y si el trámite lo gestiona un tercero —vos, por el productor— hace falta autorización del titular del RENSPA. Traducido a operación: tenés que tener el circuito de autorizaciones resuelto <em>antes</em> del remate, no el día que la hacienda está en el corral y el camión esperando.</p>
</div>

<h3>El reparto de responsabilidades, en la práctica</h3>
<table>
  <thead><tr><th>Cosa</th><th>Responsable formal</th><th>A quién le reclaman en los hechos</th></tr></thead>
  <tbody>
    <tr><td>RENSPA vigente y existencias declaradas</td><td>El productor</td><td>El productor</td></tr>
    <tr><td>Vacunación al día</td><td>El productor / el ente sanitario local</td><td>El productor, pero la tropa que no puede moverse es tu problema del día del remate</td></tr>
    <tr><td>Emisión del DT-e de ingreso</td><td>Titular del RENSPA de origen o el consignatario autorizado</td><td>La firma</td></tr>
    <tr><td>Habilitación del predio y aviso de 48 h</td><td>Titular del local</td><td>La firma</td></tr>
    <tr><td>DT-e de salida por comprador</td><td>La firma</td><td>La firma</td></tr>
  </tbody>
</table>

<p>Los días exactos de vacunación los fija el plan local de cada ente sanitario y los límites de zonas y barreras están en los anexos de las resoluciones de SENASA. No los memorices: armá la relación con el ente de tu zona y confirmá antes de cada campaña.</p>
`,
    },
    {
      titulo: 'La consignataria como agente del fisco',
      html: `
<p>Hay una parte del trabajo que nadie te cuenta cuando abrís: <strong>una porción grande de la plata que pasa por tus manos no es tuya ni del productor — es del fisco</strong>, y vos sos quien la retiene, la percibe y la deposita. Manejarlo mal no es un error contable: es plata ajena en tu cuenta.</p>

<h3>El Registro Fiscal decide cuánto te cuesta cada operación</h3>
<p>La RG 3873 —que sigue plenamente vigente— no es un trámite: es el interruptor que define los importes de todos los regímenes de IVA de la cadena. Los valores se actualizan <strong>semestralmente, en mayo y en noviembre</strong>, y ARCA publica la tabla. Con los valores vigentes desde el 1 de mayo de 2026, el orden de magnitud es este:</p>

<table>
  <thead><tr><th>Régimen</th><th>Sujeto</th><th>Activo en el registro</th><th>Valor pleno</th></tr></thead>
  <tbody>
    <tr><td rowspan="3">Pago a cuenta</td><td>Establecimiento faenador (por cabeza apta para faena)</td><td>$9.278</td><td>$13.145</td></tr>
    <tr><td>Usuario de faena (por cabeza)</td><td>$7.414</td><td>$11.202</td></tr>
    <tr><td>Consignatario directo (por animal consignado apto para faena)</td><td>$7.414</td><td>$11.202</td></tr>
    <tr><td>Retención</td><td>Consignatario de carnes (por kg de carne)</td><td>$36</td><td>$51</td></tr>
    <tr><td>Percepción</td><td>Consignatario de hacienda, a compradores <strong>sin</strong> sujetos autorizados declarados (por cabeza)</td><td colspan="2">$535</td></tr>
  </tbody>
</table>

<div class="callout">
  <div class="callout-title">La cuenta que conviene hacer una sola vez</div>
  <p>Mirá la diferencia entre las dos columnas. Para un faenador son <strong>$3.867 más por cabeza</strong> estar afuera del registro; para un consignatario directo, <strong>$3.788 más</strong>. Sobre una tropa de 500 cabezas son casi $1,9 millones adelantados que salen de tu caja y vuelven meses después. Estar activo en el Registro Fiscal no es "cumplir": es capital de trabajo.</p>
</div>

<h3>La CBU del productor: el detalle que puede arruinar una relación</h3>
<p>En la compra de hacienda en pie hay tres situaciones posibles, y solo una es indolora:</p>
<ol>
  <li>Productor responsable inscripto, <strong>incluido en el registro y con CBU declarada</strong> → no se retiene: el IVA se deposita en su CBU.</li>
  <li>Incluido en el registro pero <strong>sin CBU declarada</strong> → se retiene <strong>la totalidad del IVA facturado</strong>.</li>
  <li><strong>No incluido</strong> en el registro → se retiene la totalidad del IVA, haya CBU o no.</li>
</ol>
<p>El productor que cae en el caso 2 o 3 se entera cuando ve su liquidación, y el que se lo explica sos vos. Convertilo en parte de tu alta de comitentes: preguntá por el registro y por la CBU <em>antes</em> del primer remate, no después de la primera discusión. Es un servicio real y no le cuesta nada a la firma.</p>

<h3>Ganancias: tu comisión tiene su propio código</h3>
<p>En el régimen general de retención de Ganancias, la comisión del consignatario no va por el código de servicios genérico: existe un <strong>código específico</strong> para "comisiones u otras retribuciones derivadas de la actividad de comisionista, rematador, consignatario y demás auxiliares de comercio", que se retiene por escala para inscriptos. Y la venta de la hacienda en sí encuadra en otro código distinto, con su propia alícuota y su propio mínimo no sujeto a retención.</p>

<div class="box">
  <div class="box-title">Llevale esto a tu contador</div>
  <p>Tres códigos distintos conviven en una misma operación: el de tu comisión, el de la venta de la hacienda y el de las locaciones de servicios de los gastos. Los mínimos no sujetos a retención de esos códigos están desactualizados hace años, así que en la práctica casi todo retiene. Que tu sistema los tenga bien cargados desde el día uno te ahorra el ajuste que aparece dos años después.</p>
</div>
`,
    },
    {
      titulo: 'La liquidación, renglón por renglón',
      html: `
<p>La liquidación es el único documento del negocio que el productor lee entero. Es también donde se pierde o se gana la confianza. Una liquidación bien hecha tiene cinco bloques y ningún renglón que necesite explicación telefónica.</p>

<h3>Primero: cómo se llama de verdad</h3>
<p>El comprobante que el consignatario le emite al vendedor se llama <strong>Cuenta de Venta y Líquido Producto – Sector Pecuario</strong>: código <strong>180</strong> si es clase A, <strong>182</strong> si es clase B. Se autoriza por el web service <strong>WSLSP</strong> de ARCA. Al comprador, en cambio, se le emite una <strong>Liquidación de Compra</strong> (códigos 183 y 185).</p>
<div class="alerta">
  <div class="alerta-title">No le digas "liquidación primaria"</div>
  <p>"Liquidación primaria" es nomenclatura del sector <strong>granos</strong> (el ex formulario C-1116 "C"). Usarla para hacienda delante de un contador del rubro te cuesta credibilidad en la primera frase. En pecuario el documento es la Cuenta de Venta y Líquido Producto.</p>
</div>

<h3>Los renglones no los inventás vos: los define ARCA</h3>
<p>El WSLSP tiene una tabla cerrada de conceptos de gasto. Es el mapa de todo lo que se le puede descontar legítimamente a un productor, y conviene tenerlo a mano porque cargar un concepto en el código equivocado es un error auditable:</p>
<table>
  <thead><tr><th>Cód.</th><th>Concepto</th><th>Cód.</th><th>Concepto</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>Fondo de garantía</td><td>9</td><td>Arancel feria</td></tr>
    <tr><td>2</td><td>Gastos de frigorífico</td><td>10</td><td>Arancel remate</td></tr>
    <tr><td>3</td><td>Guía</td><td>11</td><td>Sellos</td></tr>
    <tr><td>4</td><td>Flete</td><td>12</td><td>PSTA / DTA</td></tr>
    <tr><td>5</td><td>Derecho de registro</td><td>13</td><td>DT-e</td></tr>
    <tr><td>6</td><td><strong>IPCVA</strong></td><td>14</td><td>Caravana</td></tr>
    <tr><td>7</td><td>Servicio de faena</td><td>15</td><td>Control y entrega</td></tr>
    <tr><td>8</td><td>Etiquetado</td><td>16</td><td>Comisión</td></tr>
    <tr><td colspan="4">99 · Otros — el cajón donde termina lo que no se supo clasificar. Cuantos menos renglones tengas acá, mejor liquidación hacés.</td></tr>
  </tbody>
</table>
<p>Las retenciones y percepciones van en una tabla <em>distinta</em>, la de tributos, con su propio código por régimen: retención de Ganancias RG 830, retención y percepción de IVA de la RG 3873, Ingresos Brutos, y así.</p>

<div class="callout">
  <div class="callout-title">El detalle que ordena todo el capítulo</div>
  <p>Fijate dónde está el IPCVA: en la tabla de <strong>gastos</strong>, código 6 — no en la de tributos. No es una retención impositiva: es un gasto que se le deduce al comitente. Por eso no lleva IVA. Cargarlo como tributo, o meterlo en "Otros", es exactamente el tipo de error que un contador detecta al primer vistazo.</p>
</div>

<table>
  <thead><tr><th>Bloque</th><th>Qué muestra</th><th>Error típico</th></tr></thead>
  <tbody>
    <tr><td><strong>1. Identificación</strong></td><td>Comitente, CUIT, RENSPA, remate, fecha, DT-e de ingreso.</td><td>Omitir el DT-e: es lo que ata la liquidación a la tropa real.</td></tr>
    <tr><td><strong>2. Detalle de venta</strong></td><td>Por lote: categoría, cabezas, kilos, precio por kilo, importe. Con el desbaste aplicado y explicitado.</td><td>Mostrar un promedio en vez de lote por lote. El productor quiere ver cuál lote rindió mejor.</td></tr>
    <tr><td><strong>3. Comisión y gastos</strong></td><td>Comisión con su alícuota, y cada gasto por separado: sellado, guías, servicios del predio, sanidad, flete si corresponde.</td><td>Un renglón que dice "gastos" sin abrir. Es la línea que genera desconfianza.</td></tr>
    <tr><td><strong>4. Impuestos y retenciones</strong></td><td>IVA de la venta, IVA de la comisión, retenciones de Ganancias e Ingresos Brutos con su régimen y número de comprobante.</td><td>No entregar el comprobante de retención. El productor lo necesita para computarlo.</td></tr>
    <tr><td><strong>5. Neto y fecha de pago</strong></td><td>El neto a transferir y <strong>la fecha exacta</strong> en que se transfiere.</td><td>"A la brevedad". Nunca escribas eso.</td></tr>
  </tbody>
</table>

<div class="box">
  <div class="box-title">El test de la liquidación</div>
  <p>Mandale tu modelo de liquidación a un productor que no sea cliente y pedile que te diga, sin ayuda, cuánto le descontaron y por qué. Si tarda más de un minuto o pregunta algo, el documento está mal hecho. No es un problema de diseño: es un problema de negocio, porque cada duda es una llamada y cada llamada es una consignación en riesgo.</p>
</div>
`,
    },
    {
      titulo: 'El IPCVA: el renglón que casi nadie sabe explicar',
      html: `
<p>En la tabla de gastos del capítulo anterior hay un código 6 que dice <strong>IPCVA</strong>. Es el aporte al Instituto de Promoción de la Carne Vacuna Argentina, creado por la <strong>Ley 25.507</strong>, y todo consignatario lo va a ver aparecer en sus liquidaciones. Vale entender qué es, porque es el renglón que más preguntas del productor genera y el que peor se explica en el mostrador.</p>

<h3>Qué es y quién lo paga</h3>
<p>Lo aportan <strong>los dos lados de la cadena</strong>: el productor ganadero y la industria frigorífica, como porcentaje del valor índice de res vacuna en plaza de faena. El instituto se financia con fondos privados: no es un impuesto que recauda el Estado, es un aporte del propio sector para promocionar la carne argentina adentro y afuera.</p>

<h3>Quién lo cobra, que no es lo mismo que quién lo paga</h3>
<p>Acá está el detalle que casi nadie tiene claro, y que te saca un peso de encima: <strong>el aporte del productor lo percibe SENASA al emitir el documento sanitario que autoriza el traslado del animal con destino a faena</strong>. La propia ley lo dice: para ese caso el aporte "se liquidará y abonará en el momento en que se produzca la emisión" del documento, mediante <em>un régimen de percepción que estará a cargo de ese organismo</em>. El aporte de la industria, en cambio, va por declaración jurada mensual. Los fondos se depositan quincenalmente en una cuenta del Banco Nación a nombre del Instituto y, por ley, no pueden ser apropiados por el Tesoro.</p>
<p>Traducido a tu operación: <strong>vos no sos el agente de percepción del IPCVA</strong>. Se cobra en el DT-e. Lo que sí hacés es reflejarlo en la liquidación como gasto deducido al comitente —por eso existe el código 6— porque es plata que salió por la tropa que vendiste.</p>

<div class="alerta">
  <div class="alerta-title">El dato que nadie mira, y que puede cambiar</div>
  <p>Las alícuotas vigentes <strong>no están en la ley</strong>. El artículo 14 de la Ley 25.507 fija <em>topes</em> —hasta 0,20% por animal destinado a faena, a cargo del propietario, y hasta 0,09% por animal faenado, a cargo del frigorífico— y el valor efectivo lo decide el Instituto dentro de esos límites. Los valores que las entidades de la cadena citaron en su comunicado de julio de 2026 son <strong>0,07% el productor y 0,02% la industria</strong>: bastante por debajo del tope.</p>
  <p>Consecuencia práctica: <strong>sin tocar una coma de la ley, el aporte del productor puede casi triplicarse</strong> por decisión del Instituto. Y hay una simetría que casi nadie leyó: el artículo 21 de la misma ley ya prevé cerrar el IPCVA por decisión trienal de la Asamblea, con los bienes pasando al INTA, sin necesidad de una ley nueva. Antes de imprimir un porcentaje o un monto por cabeza en tu liquidación, <strong>confirmá el valor vigente</strong>: los importes en pesos que circulan en prensa no reconcilian entre sí, y uno de los que más se repite es en realidad la percepción de IVA de otro régimen.</p>
</div>

<h3>Las tres cosas que hay que tener claras al liquidarlo</h3>
<ol>
  <li><strong>Es un gasto, no un tributo.</strong> Va en el código 6 de la tabla de gastos del WSLSP, no en la de tributos, y por eso no lleva IVA.</li>
  <li><strong>Corresponde a la hacienda con destino a faena.</strong> En un remate feria mixto, cargarlo sobre los lotes de invernada que siguen su vida productiva es un error de liquidación. El destino lo define el DT-e.</li>
  <li><strong>Al productor hay que poder explicárselo en treinta segundos.</strong> "Es el aporte del sector a la promoción de la carne, lo pagamos productores e industria, sale de la Ley 25.507." El que no lo sabe explicar termina discutiendo un renglón que no es suyo.</li>
</ol>

<h3>Por qué te conviene entender la discusión, y no solo el renglón</h3>
<p>En agosto de 2026 el Ministerio de Desregulación y Transformación del Estado difundió un anteproyecto para reemplazar el aporte obligatorio por un <strong>arancelamiento voluntario</strong>. Toda la cadena —las entidades de la producción y las cámaras de la industria frigorífica que integran el Consejo de Representantes— firmó una declaración conjunta rechazándolo, con el argumento de que un aporte voluntario equivale, en los hechos, a la desaparición del Instituto.</p>
<p>Al consignatario esto lo toca por dos lados. Uno administrativo: si el esquema cambia, cambia un renglón de todas tus liquidaciones. El otro es más de fondo y conviene verlo: <strong>las cámaras de consignatarios integran el Consejo Asesor del IPCVA</strong>. La capa gremial del rubro no es decorativa —es donde se discute esto—, y el capítulo sobre cámaras explica en cuál te conviene estar.</p>
`,
    },
    {
      titulo: 'El descalce: cómo se funde una consignataria',
      html: `
<p>Las consignatarias no se funden por una mala comisión. Se funden por el calce de plazos. El esquema es siempre el mismo:</p>

<div class="secuencia">
  <div class="paso"><span class="paso-n">1</span> El productor entrega hacienda y espera cobrar a los pocos días del remate.</div>
  <div class="paso"><span class="paso-n">2</span> El comprador se lleva la hacienda y paga a 15, 30 o más días.</div>
  <div class="paso"><span class="paso-n">3</span> Entre una cosa y la otra hay un pozo. Ese pozo lo tapa la firma.</div>
</div>

<p>Con los precios del {{FECHA_MERCADO}}, un remate chico de 400 cabezas mueve del orden de <strong>$480 millones</strong>. Si el promedio de cobranza está 20 días por detrás del promedio de pago, la firma necesita financiar unos veinte días de ese monto, todos los meses, para siempre. No es un problema de un mes malo: es la estructura permanente del negocio.</p>

<table>
  <thead><tr><th>Palanca</th><th>Qué hace</th><th>Costo</th></tr></thead>
  <tbody>
    <tr><td>Acortar el plazo del comprador</td><td>Reduce el pozo directamente</td><td>Compradores que se van a la firma que financia</td></tr>
    <tr><td>Alargar el plazo al productor</td><td>Reduce el pozo</td><td>Consignantes que se van. Es la palanca que más caro sale.</td></tr>
    <tr><td>Capital propio</td><td>Tapa el pozo</td><td>Costo de oportunidad</td></tr>
    <tr><td>Descubierto bancario</td><td>Tapa el pozo</td><td>Tasa. Se come la comisión entera si el pozo es grande.</td></tr>
    <tr><td>Garantías del comprador (cheques, avales, seguro de crédito)</td><td>No reduce el pozo: reduce el riesgo de que no se cierre nunca</td><td>Prima, y fricción comercial</td></tr>
  </tbody>
</table>

<h3>Las seis formas concretas de perder plata</h3>
<ol>
  <li><strong>Un comprador que no paga.</strong> El productor te reclama a vos. Si el monto es grande, una sola vez alcanza.</li>
  <li><strong>Financiar sin cobrar por financiar.</strong> Dar 30 días gratis cuando el costo del dinero es alto es regalar la comisión completa.</li>
  <li><strong>Adelantar pagos para retener consignantes.</strong> Empieza como excepción y termina siendo la política de la casa.</li>
  <li><strong>Retenciones que no se depositan.</strong> Usar plata de retención como capital de trabajo. Es la más silenciosa y la que peor termina.</li>
  <li><strong>Remates que no llegan al piso.</strong> Un predio, personal y difusión que se pagan igual con 180 cabezas que con 400.</li>
  <li><strong>Saldos a favor de impuestos inmovilizados.</strong> Plata tuya que no podés usar.</li>
</ol>

<div class="callout">
  <div class="callout-title">La política de cobranza se escribe antes del primer remate</div>
  <p>Tres decisiones, por escrito, firmadas por los socios: (a) plazo máximo de pago que se le da a un comprador nuevo; (b) monto máximo expuesto por comprador; (c) qué garantía se pide a partir de qué monto. Escribirlas después de un incumplimiento es escribir una autopsia.</p>
</div>
`,
    },
    {
      titulo: 'Cuánto cuesta el equipo, y bajo qué convenio',
      html: `
<p>Antes de calcular el punto de equilibrio hay que resolver una pregunta que se contesta mal muy seguido: <strong>¿bajo qué convenio se encuadra el personal de una consignataria?</strong> La intuición dice UATRE, porque es el campo, o Sindicato de la Carne, porque es hacienda. Las dos están equivocadas.</p>

<div class="callout">
  <div class="callout-title">Es Empleados de Comercio, y está escrito en el propio convenio</div>
  <p>El CCT 130/75 nombra expresamente en su ámbito de aplicación, inciso c), a los <strong>"consignatarios de hacienda"</strong> y a los <strong>"remates-feria"</strong>. Y entre sus cámaras firmantes figuran la Cámara Argentina de Consignatarios de Ganado y el Centro de Consignatarios de Productos del País. Obra social OSECAC, entidad sindical FAECYS. No hace falta interpretar: está en el texto.</p>
</div>

<p>La consecuencia es de costo y de calendario: escalas y acuerdos salariales de comercio, aportes de comercio, y las paritarias que se actualizan varias veces al año. Si tu proyección de costos fijos usó otro convenio, está mal desde la primera fila.</p>

<h3>La dotación mínima, por modelo</h3>
<table>
  <thead><tr><th>Modelo</th><th>Quién no puede faltar</th><th>Se puede tercerizar</th></tr></thead>
  <tbody>
    <tr><td>Venta directa / operador en plaza ajena</td><td>El que opera (a menudo el dueño) + administración y liquidaciones</td><td>Contabilidad, sistema, diseño</td></tr>
    <tr><td>Remate feria en predio alquilado</td><td>Lo anterior + martillero + personal de corral el día del remate</td><td>Corral por evento, balanza, catering</td></tr>
    <tr><td>Remate feria con predio propio</td><td>Lo anterior + mantenimiento y personal permanente del predio</td><td>Menos: el predio propio es estructura fija</td></tr>
  </tbody>
</table>

<div class="box">
  <div class="box-title">El dato que no está publicado</div>
  <p>No existe ninguna fuente pública con la dotación típica de una consignataria por tamaño. Lo honesto es decirlo: para tener ese número hay que preguntárselo a tres casas de tu plaza —cuántos empleados tienen y en qué categoría los encuadran—. Es uno de los ocho llamados del anexo de vigencias, y probablemente el más útil de todos.</p>
</div>
`,
    },
    {
      titulo: 'Estructura de costos y punto de equilibrio',
      html: `
<p>Todo lo anterior se resume en una pregunta: cuántas cabezas por mes hacen falta para que esto se sostenga. La respuesta depende del modelo, y la forma de calcularla es siempre la misma.</p>

<div class="alerta">
  <div class="alerta-title">Contrastá el resultado contra el mercado, no contra tu entusiasmo</div>
  <p>Cuando tengas el número de cabezas por mes, volvé al capítulo 4 y ponelo al lado del tamaño real de tu canal: por remate feria pasa entre el 4,2% y el 5,3% de la hacienda a faena, y por el mercado concentrador entre el 8% y el 11%. Si tu equilibrio exige capturar una porción de tu zona que ninguna firma de la zona tiene hoy, el problema no es el esfuerzo comercial: es la estructura que elegiste.</p>
</div>

<h3>Paso 1 — Ordená los costos fijos mensuales</h3>
<p>Listá los tuyos con montos reales de tu plaza. Las líneas que siempre aparecen:</p>
<ul>
  <li>Sueldos y cargas: administración, corral, martillero si es contratado.</li>
  <li>Oficina, predio o alquiler del predio ajeno.</li>
  <li>Sistema de gestión y facturación, telefonía, conectividad.</li>
  <li>Honorarios: contador, abogado.</li>
  <li>Seguros y mantenimiento.</li>
  <li>Marketing (Parte IV: presupuestado, no improvisado).</li>
  <li>Costo financiero del descalce. <strong>Este es un costo fijo</strong>, aunque el balance lo muestre abajo.</li>
</ul>

<h3>Paso 2 — Calculá el ingreso por cabeza</h3>
<p>Con los precios del {{FECHA_MERCADO}} y un animal promedio de 300 kg a $4.000 por kilo, cada cabeza mueve $1.200.000. Con comisión de venta 3% más comisión de compra 2%, el ingreso bruto por cabeza es <strong>$60.000</strong>.</p>

<h3>Paso 3 — Dividí</h3>
<div class="formula">Cabezas por mes para equilibrio = Costos fijos mensuales ÷ Ingreso bruto por cabeza</div>

<table>
  <thead><tr><th>Si tus costos fijos son…</th><th>Necesitás por mes</th><th>Lectura</th></tr></thead>
  <tbody>
    <tr><td>$6.000.000</td><td>100 cabezas</td><td>Operador sin predio, estructura mínima. Alcanzable con venta directa.</td></tr>
    <tr><td>$15.000.000</td><td>250 cabezas</td><td>Oficina con dos personas. Un remate mediano por mes.</td></tr>
    <tr><td>$30.000.000</td><td>500 cabezas</td><td>Predio propio y equipo. Un remate grande o dos medianos, todos los meses.</td></tr>
  </tbody>
</table>

<div class="callout">
  <div class="callout-title">Los dos números que hay que mirar de verdad</div>
  <p><strong>Cabezas por mes</strong> y <strong>días de cobranza</strong>. El primero dice si el negocio existe; el segundo, si sobrevive. Facturación y monto operado son vanidad: se pueden duplicar bajando la comisión y alargando plazos, y ese camino termina siempre en el mismo lugar.</p>
</div>

<div class="box">
  <div class="box-title">Actualizá la cuenta con el precio de hoy</div>
  <p>Los precios de esta guía son del {{FECHA_MERCADO}}. La cuenta no cambia; los números sí, todas las semanas. El índice diario del novillo y los precios por categoría están publicados y son gratis en consignatarias.com.ar/mercado. Rehacé el equilibrio cada trimestre.</p>
</div>
`,
    },
  ],
}

export const PARTE_IV = {
  numero: 'IV',
  titulo: 'Conseguir hacienda',
  bajada:
    'El plan de marketing digital, como lo arma Memola para firmas del agro. No son "redes sociales": es el sistema por el que un productor que no te conoce termina entregándote 80 terneros.',
  capitulos: [
    {
      titulo: 'El principio: no vendés hacienda, vendés certidumbre',
      html: `
<p>Un productor que decide a quién entregar no está eligiendo un servicio. Está resolviendo una incertidumbre: <em>cuánto voy a sacar, cuándo lo voy a cobrar y con quién no me voy a arrepentir</em>. Todo el marketing de una consignataria consiste en responder esas tres preguntas antes de que las haga.</p>

<p>De ahí sale la regla que ordena todo lo que sigue:</p>

<div class="regla">Mostrá el hecho. La conclusión la saca el productor.</div>

<p>Un posteo que dice "somos su mejor opción" no mueve a nadie. Un posteo que dice "remate del 12: 412 cabezas, novillito promedio $4.620 el kilo, pago a 72 horas" hace las tres cosas al mismo tiempo: prueba precio, prueba plazo y prueba que existe la operación. El primero es publicidad; el segundo es evidencia.</p>

<h3>La secuencia real de una consignación</h3>
<div class="secuencia">
  <div class="paso"><span class="paso-n">1</span> <strong>Busca.</strong> Google, WhatsApp de un vecino, o el nombre que escuchó en la radio.</div>
  <div class="paso"><span class="paso-n">2</span> <strong>Verifica.</strong> Te googlea. Si no encuentra nada, o encuentra una página abandonada, dudó.</div>
  <div class="paso"><span class="paso-n">3</span> <strong>Compara.</strong> Mira precios de tus últimos remates contra los de la firma de al lado.</div>
  <div class="paso"><span class="paso-n">4</span> <strong>Pregunta.</strong> Escribe por WhatsApp. Acá se gana o se pierde: la velocidad de respuesta es el factor número uno.</div>
  <div class="paso"><span class="paso-n">5</span> <strong>Prueba.</strong> Manda un lote chico. Está midiendo.</div>
  <div class="paso"><span class="paso-n">6</span> <strong>Se queda.</strong> O no vuelve, y nunca te dice por qué.</div>
</div>

<p>Cada capítulo de esta parte ataca uno de esos seis pasos. Si algo que hacés no ataca ninguno, no lo hagas.</p>
`,
    },
    {
      titulo: 'Los cinco activos mínimos',
      html: `
<p>Antes de publicar nada, hay que tener cinco cosas. Sin ellas, publicar es tirar plata.</p>

<div class="alerta">
  <div class="alerta-title">Antes de elegir canal: el campo es mobile, no web</div>
  <p>Un relevamiento sobre datos del INTA y del censo nacional difundido en junio de 2026 mide que <strong>solo el 36,5% de los hogares rurales dispersos tiene internet fija</strong>, contra el 80% de los urbanos — pero <strong>el 70% de esa misma población tiene internet en el celular</strong>. Y computadora en el hogar: 58,9% urbano contra 25,9% rural. En algunas provincias del norte, la brecha supera los 40 puntos.</p>
  <p>Consecuencia directa sobre todo lo que sigue: tu productor te va a leer <strong>parado en el corral, con una mano, en un teléfono y con señal mala</strong>. Un PDF pesado, una web que tarda o un video en alta definición no son "un detalle de UX": son una pieza que no se abre.</p>
</div>

<h3>1. Una página propia que responda las tres preguntas</h3>
<p>No hace falta un sitio grande. Hace falta una página que diga: quiénes somos, qué rematamos, cuándo es el próximo remate, cómo se cobra, y un teléfono que atiende. Con el número de matrícula visible: es la prueba de que estás habilitado y lo puede verificar en el padrón público.</p>

<h3>2. La ficha de Google del negocio</h3>
<p>El productor que busca "consignataria en {tu pueblo}" ve primero el mapa. La ficha con horario, teléfono, fotos del predio y reseñas reales vale más que cualquier campaña. Es gratis y la mayoría de las firmas la tiene vacía o desactualizada.</p>

<h3>3. Presencia en el directorio de la categoría</h3>
<p>Las firmas aparecen listadas en directorios del rubro que los productores consultan para comparar. Reclamar el perfil, completar el calendario de remates y mantener los datos al día es trabajo de una tarde y te pone donde el productor está comparando.</p>

<h3>4. Un WhatsApp Business que no sea el celular del dueño</h3>
<p>Con nombre de la firma, horario, catálogo de servicios y respuestas rápidas. El número tiene que sobrevivir a que el dueño se vaya de viaje.</p>

<h3>5. Una plantilla de ficha de remate</h3>
<p>Una sola pieza, siempre igual, donde solo cambian los datos. La repetición del formato hace que se reconozca de lejos en un grupo de WhatsApp con veinte mensajes. Ver el capítulo siguiente.</p>

<div class="callout">
  <div class="callout-title">Lo que no hace falta el primer año</div>
  <p>Un logo caro, un video institucional, una app, TikTok, y una campaña de branding. Nada de eso mueve consignaciones en el año uno. Lo que las mueve es aparecer cuando buscan, responder rápido y publicar resultados reales.</p>
</div>
`,
    },
    {
      titulo: 'El calendario: qué se publica cada semana',
      html: `
<p>El error más común es publicar solo cuando hay remate. Eso es visible cuatro días por mes. El sistema que funciona tiene cuatro tipos de pieza y un calendario que no depende de la inspiración.</p>

<table>
  <thead><tr><th>Tipo</th><th>Cuándo</th><th>Qué contiene</th><th>Para qué paso sirve</th></tr></thead>
  <tbody>
    <tr><td><strong>Anuncio</strong></td><td>D–15 y D–5</td><td>Fecha, lugar, hora, categorías, cabezas estimadas</td><td>Buscar (1)</td></tr>
    <tr><td><strong>Resultado</strong></td><td>D+1</td><td>Cabezas vendidas y precio promedio por categoría. Números, no adjetivos.</td><td>Comparar (3)</td></tr>
    <tr><td><strong>Lectura de mercado</strong></td><td>Semanal, día fijo</td><td>Qué hizo el precio esta semana y qué significa para el que tiene que decidir</td><td>Verificar (2)</td></tr>
    <tr><td><strong>Corral</strong></td><td>D–1</td><td>Video corto de la hacienda que entró. Sin música, sin edición: el animal y la voz del que lo mira.</td><td>Probar (5)</td></tr>
  </tbody>
</table>

<h3>La semana tipo</h3>
<ul>
  <li><strong>Lunes:</strong> lectura de mercado. Siempre el mismo día. La regularidad es la mitad del valor.</li>
  <li><strong>Miércoles:</strong> anuncio o pieza de la firma (una operación, una zona nueva, un dato de la plaza).</li>
  <li><strong>Viernes:</strong> resultado del remate más reciente, o una ficha de hacienda disponible en venta directa.</li>
</ul>

<div class="box">
  <div class="box-title">Quién lo hace</div>
  <p>Tres piezas por semana no requieren una agencia. Requieren una persona con el teléfono, quince minutos por pieza y una plantilla. Lo que sí requiere criterio externo es el arranque: definir el formato, el tono y qué se muestra y qué no. Eso se hace una vez.</p>
</div>

<h3>La regla de los números públicos</h3>
<p>Publicar precios promedio de tus remates asusta a muchas firmas. Es exactamente al revés: el productor ya compara precios, y si los tuyos no están, compara con los de otro. Publicar el promedio por categoría —no lote por lote, no nombres de comitentes— es la forma más barata de demostrar que la hacienda se vende bien en tu pista.</p>
`,
    },
    {
      titulo: 'La ficha de remate y el video de corral',
      html: `
<h3>La ficha</h3>
<p>Una imagen, formato vertical, que se lee en tres segundos y sobrevive a ser reenviada diez veces. Jerarquía fija:</p>
<ol>
  <li><strong>Fecha y hora</strong>, en el cuerpo más grande de la pieza.</li>
  <li><strong>Cabezas y categorías.</strong> "412 cabezas · invernada y vacas".</li>
  <li><strong>Lugar</strong>, con localidad y provincia.</li>
  <li><strong>Nombre de la firma y matrícula.</strong></li>
  <li><strong>Teléfono</strong>, grande, y nada más. Un solo llamado a la acción.</li>
</ol>
<p>Mismo formato, siempre. Cambiar el diseño cada mes destruye lo único que la ficha construye: reconocimiento inmediato.</p>

<h3>El video de corral</h3>
<p>Veinte a cuarenta segundos, filmado con el teléfono en vertical, la tarde anterior al remate. La voz del que filma diciendo qué es y de dónde viene: "vaquillonas de tal establecimiento, 280 kilos promedio, entran mañana en el lote 4". Sin música. Sin logo animado. Sin filtro.</p>

<div class="callout">
  <div class="callout-title">Por qué el video crudo gana</div>
  <p>Porque el productor está evaluando si la hacienda es lo que dicen que es. Un video producido levanta la sospecha de que se está tapando algo; uno crudo, con barro y viento, es prueba. El único requisito técnico es que se vea el animal completo y se escuche la voz.</p>
</div>
`,
    },
    {
      titulo: 'WhatsApp como CRM',
      html: `
<p>El 90% de las consultas de una consignataria entran por WhatsApp y la mayoría se pierde por desorden, no por precio. El circuito mínimo:</p>

<table>
  <thead><tr><th>Momento</th><th>Acción</th><th>Regla</th></tr></thead>
  <tbody>
    <tr><td>Entra la consulta</td><td>Responder</td><td><strong>Menos de 30 minutos en horario hábil.</strong> Es el factor que más pesa en toda la Parte IV.</td></tr>
    <tr><td>Primera respuesta</td><td>Tres preguntas: qué tiene, dónde está, cuándo quiere vender</td><td>Nunca mandar precio antes de saber qué tiene.</td></tr>
    <tr><td>Calificación</td><td>Etiquetar el contacto: categoría, zona, volumen</td><td>Las etiquetas de WhatsApp Business alcanzan para los primeros 300 contactos.</td></tr>
    <tr><td>Seguimiento</td><td>Si no cerró, recontactar antes del próximo remate</td><td>Una sola vez por remate. Dos es acoso.</td></tr>
    <tr><td>Post-venta</td><td>El llamado de D+7</td><td>Con el precio obtenido en la mano.</td></tr>
  </tbody>
</table>

<h3>La lista de difusión, bien usada</h3>
<p>Una lista por categoría —invernada, gordo, cría, reproductores— y un mensaje por remate a la lista que corresponde. Mandar todo a todos es el camino más rápido a que te silencien.</p>
`,
    },
    {
      titulo: 'Qué medir y qué ignorar',
      html: `
<h3>Primero, la vara del sector — que es más baja de lo que te van a decir</h3>
<p>Conviene calibrar contra lo que realmente miden las firmas líderes, no contra lo que promete una agencia. Relevamiento de perfiles públicos de agosto de 2026:</p>
<table>
  <thead><tr><th>Canal</th><th>Lo que miden las firmas líderes</th><th>Lectura</th></tr></thead>
  <tbody>
    <tr><td><strong>Instagram</strong></td><td>Las dos casas más grandes rondan los <strong>31.000 y 32.000 seguidores</strong>. La mayoría del sector no llega a 5.000.</td><td>Es donde está la audiencia. Y la vara para una firma nueva es de miles, no de decenas de miles.</td></tr>
    <tr><td><strong>YouTube</strong></td><td>Canales de 1.900 a 4.300 suscriptores, con videos de lote que miden <strong>entre 3 y 118 vistas</strong>.</td><td>No es un canal de audiencia: es un <strong>depósito de videos de lote</strong> para linkear. Usalo como tal y no esperes alcance.</td></tr>
    <tr><td><strong>Medios del sector</strong></td><td>Los portales agro grandes están entre 100.000 y 141.000 seguidores; el canal de TV rural, en 94.000.</td><td>Salir en un medio del sector te presta una audiencia que no vas a construir sola en años.</td></tr>
  </tbody>
</table>

<div class="callout">
  <div class="callout-title">Lo que este cuadro te ahorra</div>
  <p>La frustración de los primeros seis meses. Si la casa más grande del país tiene 32.000 seguidores y sus videos de lote miden decenas de vistas, tu firma nueva con 800 seguidores y 40 vistas <strong>no está fallando</strong>: está en la escala del rubro. Lo que hay que mirar es otra cosa.</p>
</div>

<h3>Y ahora sí, qué mirar</h3>
<table>
  <thead><tr><th>Mirá esto</th><th>Ignorá esto</th></tr></thead>
  <tbody>
    <tr><td>Consultas nuevas por mes</td><td>Seguidores</td></tr>
    <tr><td>Consultas que se convierten en consignación</td><td>Likes</td></tr>
    <tr><td>Cabezas por consignante y por mes</td><td>Alcance</td></tr>
    <tr><td>Consignantes que repiten en el remate siguiente</td><td>Reproducciones de video</td></tr>
    <tr><td>Tiempo de primera respuesta en WhatsApp</td><td>Cantidad de posteos publicados</td></tr>
  </tbody>
</table>

<p>Una planilla con cinco columnas y una fila por mes alcanza. Si a los seis meses las consultas suben y las consignaciones no, el problema no está en el marketing: está en el precio, en el plazo de pago o en la respuesta.</p>
`,
    },
    {
      titulo: 'Presupuesto del año uno, en tres escenarios',
      html: `
<p>Ordenado por lo que hace falta, no por lo que se puede gastar. Los montos son de tu plaza y de tu momento: lo que fija esta tabla es el <em>reparto</em>, que es lo que casi siempre se hace mal.</p>

<div class="box">
  <div class="box-title">Un ancla de costo real, para que la palabra "ofensivo" tenga escala</div>
  <p>El tarifario oficial de la exposición agroindustrial más grande del país, edición 2026, cotiza los kits de stand llave en mano <strong>desde ARS 2.125.000 hasta ARS 37.732.500 más IVA — y eso NO incluye el alquiler del espacio</strong>. En esa misma semana, once consignatarias remataron más de 170.000 cabezas por televisión y streaming. Los dos datos juntos dicen todo: la vidriera grande existe, es cara, y el negocio que se hace ahí es de volumen. Para el año uno de una firma nueva, la partida de presencia es <em>visitar</em>, no exponer.</p>
</div>

<table>
  <thead><tr><th>Partida</th><th>Mínimo</th><th>Estándar</th><th>Ofensivo</th></tr></thead>
  <tbody>
    <tr><td>Página propia + ficha de Google + perfiles</td><td>Una vez</td><td>Una vez</td><td>Una vez, con más contenido</td></tr>
    <tr><td>Producción de piezas</td><td>Interna, con plantilla</td><td>Plantilla + apoyo externo mensual</td><td>Producción externa semanal</td></tr>
    <tr><td>Pauta digital</td><td>0</td><td>Solo alrededor de cada remate, geolocalizada</td><td>Permanente por zona y categoría</td></tr>
    <tr><td>Radio y medios locales</td><td>0</td><td>Rural del sábado</td><td>Rural + gráfica del rubro</td></tr>
    <tr><td>Presencia en exposiciones</td><td>Visita</td><td>Visita + auspicio chico</td><td>Stand</td></tr>
    <tr><td>Reparto sugerido</td><td>100% al arranque</td><td>60% producción · 30% pauta · 10% presencia</td><td>40% producción · 40% pauta · 20% presencia</td></tr>
  </tbody>
</table>

<div class="callout">
  <div class="callout-title">La regla del 1%</div>
  <p>Una consignataria que factura comisiones por X puede sostener marketing por el orden del 1% al 3% del monto operado en comisiones —no del monto operado total, que es plata ajena. Confundir esas dos bases es el error de presupuesto más frecuente del rubro, y la diferencia es de dos órdenes de magnitud.</p>
</div>

<h3>Los primeros noventa días, en orden</h3>
<ol>
  <li><strong>Días 1–15:</strong> página, ficha de Google, WhatsApp Business, perfiles en directorios del rubro. Nada de publicar todavía.</li>
  <li><strong>Días 16–30:</strong> plantillas: ficha de remate, resultado, lectura de mercado. Se definen una vez y no se tocan por un año.</li>
  <li><strong>Días 31–90:</strong> tres piezas por semana, sin faltar una. La regularidad es el activo.</li>
  <li><strong>Día 90:</strong> primera medición. Consultas, consignaciones, repetidores. Recién ahí se decide si entra pauta.</li>
</ol>
`,
    },
  ],
}
