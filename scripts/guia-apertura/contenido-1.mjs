/**
 * Guía "Cómo abrir tu consignataria de hacienda" — Partes I y II.
 *
 * El texto vive en JS y no en markdown a propósito: el PDF necesita cajas,
 * tablas y figuras con clases propias, y un markdown que después se decora con
 * regex termina siendo peor de mantener que el HTML directo.
 *
 * REGLA DE LA GUÍA: cada número que se afirma tiene fuente y fecha, o no se
 * afirma. Donde el dato es provincial o cambia por colegio, se explica CÓMO se
 * consigue en vez de inventar un peso.
 */

export const PARTE_I = {
  numero: 'I',
  titulo: 'El terreno',
  bajada:
    'Qué es exactamente el negocio, cuáles son los cuatro modelos que existen en Argentina y de dónde sale cada peso que entra.',
  capitulos: [
    {
      titulo: 'Qué es una consignataria (y qué no)',
      html: `
<p>Una consignataria de hacienda vende ganado que no es suyo. Esa frase, que parece obvia, es toda la estructura del negocio: la firma recibe hacienda de un productor, la vende al mejor precio que consigue, le cobra una comisión al productor, le cobra otra al comprador, y le transfiere al productor lo que quedó. La hacienda nunca fue de la consignataria. El riesgo de precio tampoco.</p>

<p>El Código Civil y Comercial le pone nombre a eso en los artículos 1.335 y siguientes: la consignación es un mandato sin representación. El consignatario actúa en nombre propio pero por cuenta ajena. Cuando el comprador le compra al martillero, jurídicamente le está comprando al martillero; y cuando el martillero le rinde cuentas al productor, ahí recién aparece el dueño real de la hacienda.</p>

<div class="callout">
  <div class="callout-title">La consecuencia que casi nadie ve venir</div>
  <p>El <strong>artículo 1.337</strong> es tajante: el consignatario queda <em>directamente obligado</em> hacia las personas con quienes contrata, y esas personas no tienen acción contra el consignante ni él contra ellas. Traducido: el productor no le puede reclamar al frigorífico que se llevó su hacienda. Su único deudor sos vos.</p>
  <p>Ahora bien —y acá casi todo el rubro lo cuenta al revés— eso <strong>no</strong> significa que respondas automáticamente por la insolvencia del comprador. El <strong>artículo 1.341</strong> fija la regla supletoria: sin comisión de garantía convenida, respondés por el crédito que otorgaste <em>sin la diligencia exigida por las circunstancias</em>. Es responsabilidad por mala praxis crediticia, no un seguro. Pero ojo con el <strong>1.339</strong>: si diste plazos mayores a los de uso en la plaza, o contra las instrucciones del consignante, quedás <em>directamente obligado al pago del precio</em> en el momento en que hubiera correspondido cobrarlo.</p>
  <p>De esos tres artículos sale la regla operativa más barata de todo este negocio: <strong>el plazo de pago, por escrito, en cada consignación</strong>. Es la diferencia entre discutir tu diligencia y deber la plata sin discusión. El capítulo 13 desarrolla el riesgo completo.</p>
</div>

<h3>Lo que la consignataria no es</h3>

<ul>
  <li><strong>No es un matarife.</strong> El matarife compra hacienda propia y la faena. Compra y vende por su cuenta; gana o pierde con el precio. La consignataria no toma posición de precio: gana un porcentaje pase lo que pase. Son categorías distintas en el registro nacional y, para varias especies, incompatibles entre sí.</li>
  <li><strong>No es un consignatario directo.</strong> El consignatario directo recibe hacienda del productor para faenarla y vender la carne por cuenta y orden del remitente. Es otra actividad, con otros requisitos: aceptación como usuario de cada planta faenadora, cuentas bancarias declaradas, y solo un establecimiento por especie.</li>
  <li><strong>No es un comisionista informal.</strong> El que arregla una punta de novillos entre dos vecinos y se lleva un porcentaje está haciendo, sin saberlo, una actividad que exige inscripción. Que nadie lo controle no es lo mismo que estar habilitado.</li>
  <li><strong>No es una inmobiliaria rural.</strong> Se parecen —ambas viven de la comisión y de la confianza— pero la hacienda se mueve todas las semanas y el campo se vende una vez cada diez años. El flujo de caja, la estructura y el marketing no se parecen en nada.</li>
</ul>

<h3>Las tres cosas que se venden en realidad</h3>

<p>Un productor que entrega hacienda no está comprando "el servicio de vender". Está comprando tres cosas concretas, y conviene tenerlas separadas desde el día uno porque cada una se defiende distinto:</p>

<table>
  <thead><tr><th>Lo que compra el productor</th><th>Cómo se demuestra</th><th>Qué pasa si falla</th></tr></thead>
  <tbody>
    <tr><td><strong>Precio.</strong> Que la hacienda se venda a lo que vale, no a lo que aparezca.</td><td>Compradores activos en la pista. Historial de precios por categoría.</td><td>Se va al remate de al lado y no vuelve.</td></tr>
    <tr><td><strong>Cobro.</strong> Que la plata llegue cuando se dijo que iba a llegar.</td><td>Plazo por escrito y cumplido, remate tras remate.</td><td>Se termina el negocio. No hay segunda oportunidad con este.</td></tr>
    <tr><td><strong>Papeles.</strong> Que el DT-e, la liquidación y las retenciones estén bien.</td><td>Liquidación clara, sin renglones que haya que explicar por teléfono.</td><td>Un dolor de cabeza con ARCA que el productor asocia con tu nombre.</td></tr>
  </tbody>
</table>

<p>Las tres se sostienen con operación, no con comunicación. Toda la Parte IV de esta guía es sobre cómo se comunica; nada de eso funciona si estas tres no están.</p>
`,
    },
    {
      titulo: 'Los cuatro modelos, y cuál te conviene',
      html: `
<p>"Consignataria" en Argentina describe cuatro negocios bastante distintos. Se pueden combinar —muchas firmas históricas hacen los cuatro— pero se abren de a uno, y el orden importa porque el capital que exige cada uno es muy diferente.</p>

<h3>1. Remate feria</h3>
<p>La firma tiene (o alquila) un predio ferial, junta hacienda de muchos productores, y remata una vez por mes o cada quince días. Es el modelo más visible, el que da nombre en el pueblo, y el más caro de sostener: predio habilitado por SENASA, personal de corral, balanza, sistema de pista, comida, y capital para adelantar pagos.</p>
<p><strong>Conviene si:</strong> hay zona de cría con muchos productores chicos que no tienen escala para vender solos, y no hay una feria fuerte a menos de 80 kilómetros.</p>

<h3>2. Operador en plaza concentradora</h3>
<p>La firma no tiene predio: opera en el Mercado Agroganadero de Cañuelas, en Rosgan, o en la feria de un tercero. Compra estructura ajena y aporta hacienda y compradores. Costos fijos bajos, márgenes por cabeza más finos, y dependencia de la plaza.</p>
<p><strong>Conviene si:</strong> tenés relación con productores de invernada o gordo y no querés inmovilizar capital en fierros. Es la puerta de entrada más barata al negocio.</p>

<h3>3. Venta directa campo a campo</h3>
<p>Sin remate: la firma conecta un productor que vende con un comprador que necesita, arregla precio, y cobra comisión de las dos puntas. Invernada, vientres preñados, terneros de destete. No hay pista, no hay predio, no hay público.</p>
<p><strong>Conviene si:</strong> el activo que tenés es la agenda, no la infraestructura. Es el modelo con mejor relación margen/capital y el más difícil de escalar, porque no escala más allá de las horas del que atiende el teléfono.</p>

<h3>4. Cabaña y reproductores</h3>
<p>Remates de genética, catálogo, video, sanidad certificada, a veces televisado. Comisiones más altas, volumen mucho menor, ciclo comercial anual y un componente de producción de contenido que los otros tres no tienen.</p>
<p><strong>Conviene si:</strong> ya tenés vínculo con cabañas de la zona. No es un negocio de arranque: la cabaña elige firma por trayectoria, y la trayectoria no se compra.</p>

<div class="box">
  <div class="box-title">Cómo elegir sin romanticismo</div>
  <p>Poné en una hoja: (a) cuántos productores conocés por nombre y teléfono en un radio de 100 km; (b) cuántos compradores activos conocés igual de bien; (c) cuánto capital podés inmovilizar sin necesitarlo por 90 días. Si (a) y (b) son fuertes y (c) es débil, tu modelo es venta directa o plaza ajena. Si (c) es fuerte pero (a) y (b) son débiles, no abras nada todavía: comprá tiempo trabajando para una firma que ya opere.</p>
</div>

<h3>Lo que dice el mapa real</h3>
<p>Sobre las firmas con actividad de remate relevada públicamente en el país, la concentración es geográfica y fuerte: Buenos Aires ordena el volumen, y detrás vienen Corrientes, Entre Ríos, Santa Fe y Córdoba. Antes de decidir el modelo, mirá cuántas firmas rematan hoy en tu zona y con qué frecuencia. El calendario público de remates es el mejor estudio de mercado gratis que existe: te dice quién opera, qué días, qué categoría y con qué regularidad.</p>
`,
    },
    {
      titulo: 'Cuánto mercado hay realmente',
      html: `
<p>Antes de elegir modelo conviene mirar por dónde pasa la hacienda de verdad. Los informes oficiales del sector miden, para la hacienda con destino a faena, que <strong>por remate feria pasa entre el 4,2% y el 5,3%</strong> y <strong>por el Mercado Agroganadero entre el 8% y el 11%</strong>. Todo el resto —la enorme mayoría— va por <strong>venta directa</strong>, de campo a frigorífico o de campo a campo, sin pista y sin público.</p>

<div class="alerta">
  <div class="alerta-title">Leé esto antes de tasar un predio ferial</div>
  <p>Montar la consignataria alrededor del gordo por remate feria con predio propio es montarla sobre <strong>una vigésima parte del mercado</strong>, y sobre el activo más caro de los cuatro modelos. Puede ser una gran decisión —si tenés la plaza, la zona y los productores—, pero tiene que ser una decisión tomada con este número a la vista y no con la imagen del remate del pueblo en la cabeza.</p>
</div>

<h3>El canal que crece no necesita predio</h3>
<p>El remate televisado y por streaming es de <strong>invernada</strong>, no de gordo, y no exige fierros propios: se apoya en la plataforma de un tercero. En una semana cualquiera de 2026, catorce de dieciocho remates feria relevados se transmitieron por streaming. El remate electrónico federal bate récords de cabezas por subasta. Para una firma nueva eso significa algo concreto: <strong>hay un canal en expansión cuya barrera de entrada es comercial, no de capital</strong>.</p>

<h3>Cuántos son los que ya están</h3>
<p>El padrón público del registro nacional tiene, al momento de cerrar esta edición, del orden de <strong>1.026 matrículas vigentes</strong> de <em>Consignatario y/o Comisionista de Ganados</em> y <strong>35</strong> de <em>Consignatario Directo</em>. Ese es el universo real de competidores habilitados del país. Es un número que nadie publica y que podés verificar vos mismo: el padrón es público y se consulta sin clave.</p>

<div class="box">
  <div class="box-title">El ejercicio de dimensionamiento, en cuatro renglones</div>
  <p>Antes de seguir leyendo, escribí: (1) cuántas cabezas se comercializan por año en tu zona de influencia; (2) cuántas firmas habilitadas operan ahí, según el padrón; (3) qué porcentaje de esas cabezas podrías capturar en el año tres, siendo pesimista; (4) cuántas cabezas por mes te da eso. Guardá ese número: es el que vas a contrastar contra el punto de equilibrio del capítulo 15.</p>
</div>
`,
    },
    {
      titulo: 'La capa gremial: a qué cámara pertenecés',
      html: `
<p>La v1 de esta guía no tenía este capítulo y era un hueco grande, porque la pregunta aparece apenas abrís: <em>¿de qué cámara hay que ser?</em> La respuesta corta es que no hay una: hay tres entidades nacionales, y <strong>no compiten entre sí — se reparten por tipo de operatoria</strong>.</p>

<table>
  <thead><tr><th>Entidad</th><th>A quién nuclea</th><th>Desde</th><th>Qué produce</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>CACG</strong><br>Cámara Argentina de Consignatarios de Ganado</td>
      <td>Firmas de <strong>remate feria</strong>, mercados físicos del interior, remates por TV e internet y operaciones particulares</td>
      <td>1921</td>
      <td>Boletín mensual de precios de invernada y cría de remates feria, desagregado por categoría y rango de peso, con máximo, mínimo y promedio</td>
    </tr>
    <tr>
      <td><strong>CCPP</strong><br>Centro de Consignatarios de Productos del País</td>
      <td>Las casas que operan el <strong>mercado concentrador</strong> (Liniers, hoy Cañuelas)</td>
      <td>histórica</td>
      <td>Representación en la plaza concentradora</td>
    </tr>
    <tr>
      <td><strong>CCDH</strong><br>Centro de Consignatarios Directos de Hacienda</td>
      <td>Los <strong>consignatarios directos</strong>: hacienda directo a frigorífico, sin pasar por mercado</td>
      <td>1973</td>
      <td>Índice semanal de precios de carne y hacienda</td>
    </tr>
  </tbody>
</table>

<p>Una firma con varias actividades puede estar en más de una. La regla práctica para elegir: <strong>fijate cuál publica el índice que vos vas a usar todas las semanas</strong>. Esa es la que te sirve.</p>

<h3>Lo que la cámara NO hace, y conviene saberlo antes</h3>
<ul>
  <li><strong>No habilita.</strong> Habilita el Estado, por SIOCAL. Ninguna cámara interviene en la matrícula.</li>
  <li><strong>No garantiza cobranzas.</strong> En el default de los $2.200 millones en Cañuelas ninguna cámara intervino formalmente: la solución fue negociación bilateral entre las casas y los deudores.</li>
  <li><strong>No decide en el IPCVA.</strong> Y este punto es fino: el Consejo de <em>Representantes</em> del Instituto —el que decide— se integra con entidades de productores, cámaras de la industria frigorífica y el Estado. <strong>Ninguna cámara de consignatarios lo integra.</strong> Los consignatarios tienen <em>un</em> representante en el Consejo <em>Asesor</em>, designado por acuerdo entre las cámaras, que sesiona mensualmente y cuya opinión, por la propia ley, <strong>solo tiene carácter de asesoramiento no vinculante</strong>.</li>
</ul>

<div class="callout">
  <div class="callout-title">Por qué esto importa más de lo que parece</div>
  <p>Cuando en julio de 2026 toda la cadena firmó el comunicado conjunto en defensa del IPCVA, las entidades firmantes fueron las de la producción, las de la industria y la Secretaría. <strong>Las cámaras de consignatarios no estaban entre los firmantes.</strong> El eslabón que emite las liquidaciones donde aparece el renglón del IPCVA no tiene voto en la decisión. Es un dato del mapa de poder del rubro, y explica por qué la capa gremial se discute poco y se sufre bastante.</p>
</div>

<div class="box">
  <div class="box-title">Lo que no pudimos publicar</div>
  <p>Ninguna de las tres publica cuota societaria ni estatuto, y no hay evidencia pública de que exista un mecanismo de mediación o un fondo de garantía entre socios. Que no lo encontremos publicado no prueba que no exista: preguntalo directamente antes de asociarte. Los contactos están en el anexo de vigencias.</p>
</div>
`,
    },
    {
      titulo: 'De dónde sale la plata',
      html: `
<p>Cinco fuentes de ingreso, en orden de importancia real:</p>

<table>
  <thead><tr><th>Concepto</th><th>Quién lo paga</th><th>Orden de magnitud</th><th>Nota</th></tr></thead>
  <tbody>
    <tr><td>Comisión de venta</td><td>El productor (vendedor)</td><td>Típicamente 2% a 4% sobre el monto de venta</td><td>Es el número que el productor compara. Casi nunca es donde se define la rentabilidad.</td></tr>
    <tr><td>Comisión de compra</td><td>El comprador</td><td>Suele ser del mismo orden</td><td>En remate feria es habitual cobrar las dos puntas. En venta directa se negocia.</td></tr>
    <tr><td>Gastos de venta</td><td>El productor</td><td>Ítems fijos por operación</td><td>Sellado, guías, servicios del predio, sanidad. Se rinden en la liquidación; no son ganancia, son recupero.</td></tr>
    <tr><td>Financiación</td><td>El comprador</td><td>Diferencial de plazo</td><td>Cobrar a 30 días y pagar a 7 tiene un costo financiero que alguien paga. Ver capítulo 13.</td></tr>
    <tr><td>Servicios anexos</td><td>Variable</td><td>—</td><td>Flete, hotelería de hacienda, asesoramiento, financiación de compra. Ingresos reales, riesgos distintos.</td></tr>
  </tbody>
</table>

<h3>La cuenta de una operación, con precios de hoy</h3>

<p>Números al {{FECHA_MERCADO}}, tomados del mercado de referencia:</p>

<div class="datos">
  <div class="dato"><span class="dato-label">Novillo (índice INMAG, diario)</span><span class="dato-valor">{{INMAG}}</span></div>
  <div class="dato"><span class="dato-label">Novillos (observación semanal por categoría)</span><span class="dato-valor">{{NOVILLOS}}</span></div>
  <div class="dato"><span class="dato-label">Vacas</span><span class="dato-valor">{{VACAS}}</span></div>
  <div class="dato"><span class="dato-label">Terneros</span><span class="dato-valor">{{TERNEROS}}</span></div>
</div>

<p>Tomemos un remate chico: 400 cabezas, mezcla de invernada y vacas, peso promedio 300 kg, precio promedio ponderado $4.000 por kilo vivo. El remate mueve 120.000 kilos y <strong>$480 millones</strong> de mercadería.</p>

<table>
  <thead><tr><th>Línea</th><th>Cálculo</th><th>Resultado</th></tr></thead>
  <tbody>
    <tr><td>Monto operado</td><td>400 cab × 300 kg × $4.000</td><td>$480.000.000</td></tr>
    <tr><td>Comisión de venta 3%</td><td>3% del monto</td><td>$14.400.000</td></tr>
    <tr><td>Comisión de compra 2%</td><td>2% del monto</td><td>$9.600.000</td></tr>
    <tr><td><strong>Ingreso bruto del remate</strong></td><td></td><td><strong>$24.000.000</strong></td></tr>
    <tr><td>IVA débito sobre comisiones (21%)</td><td>No es tuyo</td><td>$5.040.000</td></tr>
  </tbody>
</table>

<p>Veinticuatro millones por un remate de 400 cabezas suena a mucho hasta que se le restan la estructura, el costo financiero del descalce y los meses en que el remate junta 180 cabezas en vez de 400. El capítulo 14 arma el punto de equilibrio completo.</p>

<div class="callout">
  <div class="callout-title">El error de lectura más caro del rubro</div>
  <p>Mirar la comisión y creer que ese es el margen. La comisión es la <em>facturación</em>. El margen aparece después de estructura, cobranza fallida y costo del dinero. Hay firmas que facturan mucho y ganan poco porque financian gratis a compradores que podrían pagar al contado.</p>
</div>
`,
    },
  ],
}

export const PARTE_II = {
  numero: 'II',
  titulo: 'Habilitarse',
  bajada:
    'Los cinco trámites que separan una intención de una consignataria que puede operar. Con la normativa vigente a agosto de 2026, no la de los apuntes que circulan.',
  capitulos: [
    {
      titulo: 'La matrícula de martillero y corredor público',
      html: `
<p>El acto de rematar es un acto reglado y lo hace una persona, no una sociedad. La ley que lo rige es el Decreto-Ley 20.266/73, con la reforma que introdujo la Ley 25.028 en 1999. Lo primero que cambió esa reforma es lo que más cuesta: hoy la ley exige <strong>título universitario</strong> de Martillero y Corredor Público, expedido o revalidado en la República. No hay atajo por antigüedad ni por experiencia.</p>

<h3>Condiciones habilitantes (art. 1º y 2º)</h3>
<ul>
  <li>Ser mayor de edad y no estar comprendido en las inhabilidades del art. 2º —entre ellas, los fallidos no rehabilitados y los condenados por ciertos delitos.</li>
  <li>Poseer el título universitario correspondiente.</li>
</ul>

<h3>Requisitos de matrícula (art. 3º)</h3>
<p>Con el título en la mano, la matrícula se pide en la jurisdicción donde vas a ejercer. En la provincia de Buenos Aires eso significa el colegio departamental del domicilio; en otras provincias, el colegio provincial o el registro del poder judicial, según el régimen local. Lo que piden es sistemáticamente esto:</p>

<ul>
  <li>Título y analítico universitario.</li>
  <li>DNI con domicilio real actualizado, y en general una antigüedad mínima de residencia en la jurisdicción.</li>
  <li>Partida de nacimiento y, si corresponde, de casamiento.</li>
  <li>Informe de libre inhibición del Registro de la Propiedad Inmueble. Validez corta —del orden de 30 días—, así que se pide cerca del final.</li>
  <li>Informe de libre inhibición del Registro de la Propiedad Automotor. Misma lógica de vigencia.</li>
  <li>Certificado de antecedentes penales (Reincidencia). Validez del orden de 180 días.</li>
  <li>Certificado de juicios universales, que en PBA tramita ante la Suprema Corte provincial.</li>
  <li>Declaración jurada del formulario de colegiación, que suele exigir la firma de dos colegiados con antigüedad como testigos de la información declarada.</li>
  <li><strong>Constituir fianza</strong>, según el art. 3º inc. d) del Decreto-Ley 20.266/73 y el art. 33 inc. d) de la Ley 25.028. Puede ser real o personal, a la orden del organismo que controla la matrícula.</li>
</ul>

<div class="callout">
  <div class="callout-title">El plazo que nadie calcula: el juramento</div>
  <p>La matrícula no se activa el día que entregás la carpeta: se activa el día que jurás, y los juramentos se toman en fechas fijas —típicamente tres jornadas al año, alrededor de marzo/abril, julio/agosto y noviembre/diciembre. Entregar la carpeta en mayo puede significar rematar recién en agosto. Empezá el trámite mirando el calendario de juras, no el calendario propio.</p>
</div>

<h3>Los libros del martillero (art. 17)</h3>
<p>La ley obliga a llevar libros rubricados: <strong>Diario de Entradas</strong> (qué recibiste, de quién, para qué), <strong>Diario de Salidas</strong> (qué vendiste, a quién, en qué condiciones) y <strong>Cuentas de Gestión</strong> (la rendición a cada comitente). No es formalismo: en un conflicto con un comitente, la ausencia de libros te deja sin defensa y con la carga de la prueba encima.</p>

<h3>La consignataria puede ser una sociedad, pero necesita un martillero</h3>
<p>La sociedad factura, contrata y responde. El remate lo firma un martillero matriculado. Si el dueño del negocio no es martillero, hay dos caminos: asociarse con uno, o contratarlo. Los dos son legítimos y los dos tienen un riesgo idéntico y subestimado: la matrícula se va con la persona. Si el martillero se va, el negocio no puede rematar hasta conseguir otro. Escribí ese punto en el contrato antes del primer remate, no después del primer conflicto.</p>

<figure class="captura">
  <img src="{{IMG}}/04-colegio-martilleros-requisitos.jpg" alt="Portal de un colegio departamental de martilleros con la sección de requisitos de inscripción">
  <figcaption>Los colegios departamentales publican los requisitos y el formulario de colegiación en línea. Cambian por jurisdicción: el listado de arriba es el patrón común, pero la lista que manda es la del colegio donde te vas a matricular.</figcaption>
</figure>
`,
    },
    {
      titulo: 'La sociedad y ARCA',
      html: `
<h3>Qué figura elegir</h3>
<table>
  <thead><tr><th></th><th>Unipersonal</th><th>SRL</th><th>SAS</th></tr></thead>
  <tbody>
    <tr><td>Costo y tiempo de constitución</td><td>Mínimo</td><td>Alto</td><td>Medio</td></tr>
    <tr><td>Separación patrimonial</td><td>Ninguna</td><td>Sí</td><td>Sí</td></tr>
    <tr><td>Entrada y salida de socios</td><td>—</td><td>Trabajosa (cesión de cuotas)</td><td>Ágil</td></tr>
    <tr><td>Percepción del comprador grande</td><td>Débil</td><td>Sólida</td><td>Aceptada</td></tr>
    <tr><td>Disponibilidad plena por jurisdicción</td><td>Sí</td><td>Sí</td><td>Verificar en el registro provincial</td></tr>
  </tbody>
</table>

<p>Para una consignataria hay un argumento que pesa más que los costos: <strong>vas a manejar plata ajena</strong>. Una figura sin separación patrimonial mezcla el riesgo del negocio con la casa familiar. Salvo que arranques como comisionista puro sin manejar fondos de terceros, la unipersonal es una economía que sale cara.</p>

<h3>El alta en ARCA</h3>
<p>Lo que hay que dejar resuelto antes de tocar cualquier otro registro:</p>
<ul>
  <li><strong>CUIT y Clave Fiscal nivel 3.</strong> El nivel 3 no es opcional: el sistema de inscripción nacional (capítulo siguiente) exige ese nivel para entrar.</li>
  <li><strong>Código de actividad correcto.</strong> El registro nacional verifica que estés inscripto en el código que corresponde a la actividad que declarás. Un código mal elegido no se descubre en la inscripción: se descubre cuando te la rechazan.</li>
  <li><strong>IVA responsable inscripto y Ganancias.</strong> El Anexo I de la Resolución SAGyP 50/2025 lo exige explícitamente para algunas categorías, y para las demás lo exige la operatoria: sin IVA inscripto no podés emitir la factura de comisión que el comprador necesita.</li>
  <li><strong>Ingresos Brutos</strong> en tu provincia y <strong>Convenio Multilateral</strong> si operás en más de una. Una consignataria de frontera provincial que factura como local está armando una deuda que aparece años después con intereses.</li>
  <li><strong>Domicilio fiscal electrónico</strong> constituido y mirado. Las notificaciones llegan ahí y se dan por notificadas el día que se envían.</li>
</ul>

<figure class="captura">
  <img src="{{IMG}}/03-arca-clave-fiscal.jpg" alt="Pantalla de acceso con Clave Fiscal de ARCA">
  <figcaption>El acceso con Clave Fiscal de ARCA. Todo el circuito de habilitación nacional pasa por acá: el registro de operadores, el registro fiscal de hacienda y carnes, y la delegación de servicios al contador se hacen con esta credencial en nivel 3.</figcaption>
</figure>

<div class="box">
  <div class="box-title">Delegá los servicios antes de necesitarlos</div>
  <p>El Administrador de Relaciones de ARCA permite delegar servicios a tu contador. Hacelo el mismo día que sacás la Clave Fiscal. El momento en que descubrís que no está delegado siempre es el momento en que hay un vencimiento encima.</p>
</div>
`,
    },
    {
      titulo: 'SIOCAL: el registro nacional (ex RUCA)',
      html: `
<div class="alerta">
  <div class="alerta-title">Esto cambió DOS veces, y casi ningún material lo dice</div>
  <p><strong>Primer salto (abril de 2025).</strong> El RUCA —Registro Único de Operadores de la Cadena Agroindustrial— dejó de ser el registro de ganados y carnes. La <strong>Resolución SAGyP 50/2025</strong>, del 11 de abril de 2025, creó el <strong>SIOCAL</strong> y el SISA quedó para granos. Las inscripciones vigentes y las solicitudes en trámite se migraron sin reinscribirse.</p>
  <p><strong>Segundo salto (julio de 2026).</strong> La <strong>Resolución SAGyP 103/2026</strong>, publicada el 6 de julio de 2026, <strong>sustituyó íntegramente los Anexos I, II y III</strong> de la 50/2025. El régimen que rige hoy es el del Anexo I de la 103/2026: mantiene la denominación SIOCAL y la numeración de los puntos, <strong>excluye del sistema a los operadores del rubro lácteos</strong> y suma un requisito nuevo (punto 1.5.6). Quien cite RUCA está viejo desde 2025; quien cite los Anexos originales de la 50/2025 está viejo desde julio de 2026.</p>
</div>

<h3>Qué categoría te corresponde</h3>
<p>El Anexo I define, entre otras, estas tres, y la diferencia no es semántica:</p>
<ul>
  <li><strong>Consignatario y/o Comisionista de Ganados</strong> (punto 2.9): quien actúa, conforme los arts. 1.335 y concordantes del Código Civil y Comercial, en la compraventa de haciendas en forma directa o en mercados de ganados, locales de remate feria u otros establecimientos o locales autorizados. <em>Esta es la categoría de una consignataria.</em></li>
  <li><strong>Consignatario Directo</strong> (punto 2.5): quien recibe ganado de los productores para su faena y posterior venta de las carnes por cuenta y orden del remitente. Exige constancia de aceptación como usuario firmada por cada planta faenadora, declarar todas las cuentas bancarias de la operatoria, y acreditar inscripción en Ganancias e IVA. No admite más de un establecimiento por especie y es incompatible con Matarife Abastecedor de la misma especie.</li>
  <li><strong>Matarife Abastecedor</strong>: compra hacienda propia, la faena en planta de terceros y vende la carne. Otro negocio y otro riesgo.</li>
</ul>

<h3>Las reglas generales que conviene saber antes de entrar</h3>
<ul>
  <li>La inscripción es <strong>obligatoria para ejercer</strong> la actividad (punto 1.2).</li>
  <li><strong>No vence</strong> mientras se mantengan vigentes los requisitos que la otorgaron (punto 1.3).</li>
  <li>La solicitud se genera en línea en <strong>www.siocal.magyp.gob.ar</strong> con <strong>Clave Fiscal nivel 3</strong> (punto 1.4). El Anexo original decía <em>ruca.magyp.gob.ar</em>; el texto vigente ya nombra el dominio nuevo, y la vieja URL redirige.</li>
  <li>Todo se presenta en carácter de <strong>declaración jurada</strong>. Falsear u omitir datos no es un error administrativo.</li>
  <li>Si el análisis detecta deficiencias, te intiman a subsanarlas en <strong>10 días hábiles</strong> desde la notificación, bajo apercibimiento de archivar la solicitud sin más trámite (punto 1.6.1). Ese plazo corre desde el envío del correo, no desde que lo leés.</li>
</ul>

<figure class="captura">
  <img src="{{IMG}}/01-siocal-home.jpg" alt="Portal del SIOCAL, Sistema de información de operadores de Carnes y Lácteos">
  <figcaption>El portal del SIOCAL. "Ingreso por autogestión" abre el circuito con Clave Fiscal; el "Manual de usuario" del propio organismo es la referencia que hay que tener abierta al lado mientras se carga la solicitud.</figcaption>
</figure>

<h3>La documentación que hay que tener escaneada antes de empezar</h3>
<p>Del punto 1.5 del Anexo I, para todos los interesados:</p>
<ol>
  <li><strong>Personas jurídicas:</strong> razón social y autoridades vigentes; copia notarialmente certificada del estatuto constitutivo y sus modificatorias; y la última acta de designación de autoridades asentada en el libro de actas, en fotocopia certificada por escribano público. <strong>Personas humanas:</strong> copia del DNI.</li>
  <li><strong>Habilitación sanitaria</strong> del establecimiento o local a nombre del titular, emitida por la autoridad competente, si resulta exigible según la actividad y el ámbito de comercialización. No se exige adjuntarla para establecimientos habilitados por SENASA ni para jurisdicciones que publiquen sus habilitaciones en línea de manera actualizada.</li>
  <li><strong>Título de dominio o escritura</strong> del establecimiento si sos propietario. Si el predio no es propio, los instrumentos que acrediten posesión, tenencia o uso y goce, autenticados por escribano público o autoridad judicial.</li>
  <li><strong>Inscripción vigente ante ARCA</strong> en el código de actividad que corresponda a lo que estás pidiendo (punto 1.5.5).</li>
  <li><strong>Inscripción vigente ante el órgano de contralor societario</strong> que corresponda al tipo de persona jurídica y al ámbito de comercialización (punto 1.5.6). <strong>Este requisito NO estaba en el Anexo original</strong>: lo agregó la Res. 103/2026. En la práctica: IGJ para una sociedad porteña, el registro público provincial para el resto, y la constancia tiene que estar vigente, no la del día de la constitución.</li>
  <li><strong>Domicilio electrónico constituido</strong> y, para las actividades que lo requieran, domicilio y <strong>geolocalización</strong> de la planta o establecimiento.</li>
</ol>

<div class="callout">
  <div class="callout-title">Dónde se cae la mayoría de las solicitudes</div>
  <p>En el acta de designación de autoridades. Se presenta la copia simple, o una certificación vieja, o el acta sin el libro. Es el papel que más veces vuelve. Pedilo al escribano en el mismo trámite en que certificás el estatuto, y pedí dos copias.</p>
</div>

<h3>Después de la inscripción</h3>
<p>Aprobada la solicitud, la Dirección Nacional de Control Comercial Agropecuario emite el <strong>certificado de inscripción digital</strong>. A partir de ahí aparecés en el padrón público con tu número de matrícula y tu actividad. Ese padrón se consulta libremente: es la forma en que un comprador grande verifica que existís.</p>

<figure class="captura">
  <img src="{{IMG}}/02-siocal-padron.jpg" alt="Listado del padrón público del SIOCAL con CUIT, razón social, matrícula, actividad y provincia">
  <figcaption>El padrón público del SIOCAL. Cada fila trae CUIT, razón social, número de matrícula, actividad y provincia. Buscá acá a las firmas de tu zona antes de abrir: te dice quién está inscripto, en qué categoría y desde cuándo.</figcaption>
</figure>
`,
    },
    {
      titulo: 'El Registro Fiscal de Hacienda y Carnes, y el IVA del negocio',
      html: `
<p>Además del registro de habilitación, hay un registro <em>fiscal</em>: el <strong>Registro Fiscal de Operadores de la Cadena de Producción y Comercialización de Haciendas y Carnes Bovinas y Bubalinas</strong>, creado por la RG 3873/2016 de la entonces AFIP, hoy ARCA. Alcanza a productores, invernadores, feedlots, faenadores y —textual— consignatarios y comisionistas de hacienda bovina y bubalina.</p>

<p>La inscripción se pide con Clave Fiscal nivel 3 y su efecto es puramente económico: el registro gobierna los <strong>regímenes de retención, percepción y pago a cuenta del IVA</strong> de las operaciones de faena y comercialización. Estar adentro o afuera cambia cuánta plata te retienen en cada operación y cuánto saldo a favor acumulás.</p>

<div class="callout">
  <div class="callout-title">Por qué esto no es "un tema del contador"</div>
  <p>Un saldo a favor de IVA inmovilizado es capital de trabajo que no tenés. En un negocio que vive del descalce entre cobrar y pagar, un saldo a favor grande es exactamente el mismo problema que un comprador que no paga, con la diferencia de que a este no lo podés llamar por teléfono.</p>
</div>

<h3>Las alícuotas que tenés que tener claras</h3>
<ul>
  <li>La <strong>venta de hacienda en pie</strong> tributa IVA a la <strong>alícuota reducida del 10,5%</strong> (art. 28, Ley 23.349). Eso no se discute.</li>
  <li>Tu <strong>comisión</strong>, en cambio, sí se discute, y conviene que lo sepas antes de facturar. El criterio intuitivo —"es un servicio, va al 21%"— no es el que sostiene la doctrina fiscal para el consignatario. El <strong>Dictamen DAL 59/2002</strong> concluyó que comisiones, fletes, garantía, control y entrega, certificados y guías facturados <em>en ocasión de la comercialización de bovino en pie</em> quedan alcanzados por la alícuota reducida, con la excepción de los gastos de financiación, que son hecho imponible autónomo al 21%. El <strong>Dictamen 6/2005</strong> agrega la distinción que decide el caso: el <em>consignatario</em>, que factura a nombre propio, arrastra el 10,5%; el <em>mandatario</em>, que factura su comisión por separado, va al 21%. <strong>No copies ninguna de las dos versiones de esta guía a tu facturación</strong>: llevale los dos dictámenes a tu contador y que él defina tu encuadre por escrito. Facturar mal esto durante un año es un ajuste, no un error de tipeo.</li>
  <li>Sobre los pagos que hacés hay retenciones de <strong>Ganancias</strong> (régimen general de la RG 830) y, según jurisdicción, de <strong>Ingresos Brutos</strong>. Si sos agente de retención, retenés y depositás; no es tu plata, y el fisco no distingue entre "no la deposité" y "la usé para tapar un descubierto".</li>
</ul>

<p>El punto operativo: la liquidación al productor tiene que mostrar cada retención por separado, con su régimen y su comprobante. Una liquidación que muestra un neto sin abrir es el origen del 80% de las discusiones con comitentes.</p>
`,
    },
    {
      titulo: 'SENASA: el predio donde se concentra la hacienda',
      html: `
<p>Si vas a juntar hacienda en un lugar —remate feria, predio ferial, exposición, cualquier concentración de animales— ese lugar necesita habilitación de SENASA. La norma es la <strong>Resolución SENASA 924/2020</strong>, vigente desde fines de diciembre de 2020, que unificó los requisitos de habilitación y rehabilitación de locales de ferias, mercados concentradores y todo otro lugar de concentración de animales del territorio nacional.</p>

<h3>Documentación</h3>
<ul>
  <li>Solicitud de habilitación.</li>
  <li>Título de propiedad, contrato de alquiler u otra documentación que autorice el uso del terreno.</li>
  <li><strong>Plano o croquis a escala</strong> con la distribución del predio, el flujo de animales y la ubicación de las instalaciones.</li>
  <li>Inscripción ante ARCA (CUIT), contrato social o estatuto, o DNI del titular.</li>
  <li>Certificado de libre deuda con el organismo y pago del arancel de habilitación.</li>
</ul>

<h3>Infraestructura</h3>
<ul>
  <li>Cerco perimetral fijo y completo, sin conexión con predios linderos.</li>
  <li>Mangas adecuadas al tamaño de los animales, con piso antideslizante.</li>
  <li>Embarcadero con rampa de pendiente moderada y un tramo llano antes de la subida.</li>
  <li><strong>Corral lazareto</strong> con capacidad mínima equivalente a un porcentaje de las instalaciones.</li>
  <li>Corrales de estadía con drenaje, reparo y sombra.</li>
  <li>Bebederos y comederos de limpieza fácil.</li>
  <li>Iluminación artificial en embarcadero y manga.</li>
</ul>

<h3>Las tres obligaciones que se olvidan y generan actas</h3>
<ol>
  <li><strong>Aviso previo de 48 horas.</strong> La firma responsable del local comunica por escrito a la oficina local de SENASA, con no menos de 48 horas de anticipación, la fecha del remate o de cualquier otra concentración, para su autorización. El personal del organismo hace la inspección y la certificación, y su presencia es obligatoria desde el inicio hasta la conclusión de la actividad.</li>
  <li><strong>Vaciado, lavado y desinfección</strong> de los bebederos entre dos remates o concentraciones.</li>
  <li><strong>Rehabilitación cada dos años.</strong> La habilitación tiene vigencia de dos años y la renovación se pide dentro de los 30 días previos al vencimiento. Cambios de titularidad, razón social, cese de actividad o modificación de instalaciones se notifican dentro de los 30 días hábiles, y las modificaciones exigen inspección verificadora.</li>
</ol>

<div class="box">
  <div class="box-title">Si no vas a tener predio propio</div>
  <p>Alquilar el predio de otra firma o de la sociedad rural local es la forma normal de arrancar. Cuidado con un punto: la habilitación es del predio y de su titular. Antes de anunciar tu primer remate, pedí copia del certificado vigente y confirmá quién hace el aviso de 48 horas. Si el titular no lo hace, el remate no se autoriza, y el que va a quedar mal con 40 productores sos vos.</p>
</div>
`,
    },
    {
      titulo: '¿Puedo rematar en otra provincia?',
      html: `
<p>Es la pregunta que aparece apenas la firma cruza un límite provincial, y la respuesta corta es incómoda: <strong>la matrícula de martillero es provincial y no hay reciprocidad automática</strong>. Rematar en una jurisdicción donde no estás matriculado es una infracción, no un detalle administrativo.</p>

<p>La Ley 20.266 lo dice de entrada: quien pretenda ejercer la actividad debe inscribirse <em>en la matrícula de la jurisdicción correspondiente</em>. Cada provincia organiza esa matrícula con su propia ley y su propio colegio, y cada colegio decide bajo qué condiciones admite —o no— a un matriculado de otra provincia.</p>

<h3>Lo que hay que resolver antes de anunciar un remate afuera</h3>
<ol>
  <li><strong>Preguntá en el colegio de la provincia de destino</strong>, no en el tuyo. Es el que va a controlar y el que eventualmente labra el acta.</li>
  <li><strong>Preguntá por la figura exacta</strong>: hay jurisdicciones con matrícula plena, otras con inscripción para actuación transitoria, otras con arancel diferencial para no residentes.</li>
  <li><strong>Resolvé quién firma.</strong> La salida habitual y limpia es asociarse con un martillero matriculado en esa provincia, que firma el remate. Es más rápido que una matrícula nueva y suele ser más barato.</li>
  <li><strong>Ojo con la publicidad.</strong> Varias jurisdicciones exigen que el número de matrícula figure en toda comunicación del remate. Es el tipo de incumplimiento que se detecta con un flyer.</li>
</ol>

<div class="callout">
  <div class="callout-title">El costo de no preguntar</div>
  <p>La inscripción nacional en SIOCAL es única y vale para todo el país: eso confunde. Pero la <strong>matrícula de martillero no es nacional</strong>. Se puede estar perfectamente habilitado como consignatario ante la Nación y, aun así, no poder bajar el martillo en la provincia de al lado.</p>
</div>
`,
    },
    {
      titulo: 'Cómo se pierde todo esto',
      html: `
<p>Habilitarse es la mitad. La otra mitad es no perder la habilitación, y hasta 2026 el procedimiento no estaba escrito en ningún lado. Ahora sí.</p>

<h3>El procedimiento sancionatorio, desde junio de 2026</h3>
<p>La Res. SAGyP 89/2026, del 25 de junio de 2026, aprobó el instructivo del procedimiento administrativo para el tratamiento de infracciones ante la Dirección Nacional de Control Comercial Agropecuario. No crea obligaciones nuevas: <strong>ordena los plazos</strong>, que es justamente lo que faltaba.</p>
<table>
  <thead><tr><th>Etapa</th><th>Plazo</th></tr></thead>
  <tbody>
    <tr><td>Desde la fiscalización, para que la DNCCA archive o intime</td><td>20 días</td></tr>
    <tr><td>Para aportar información complementaria</td><td>5 días</td></tr>
    <tr><td>Para presentar el descargo formal tras la notificación</td><td><strong>10 días</strong></td></tr>
  </tbody>
</table>
<p>El descargo se presenta por correo electrónico a la dirección de legales de la DNCCA o por la plataforma de Trámites a Distancia. <strong>La notificación se practica en el domicilio electrónico registrado en SIOCAL</strong>: si nadie mira esa casilla, los plazos corren igual. Una multa firme se ejecuta judicialmente por título ejecutivo.</p>

<h3>La escala de sanciones</h3>
<p>La ley de fondo sigue siendo la Ley 21.740, que no fue derogada. Su artículo 27 fija la escala: <strong>apercibimiento, multa, suspensión o cancelación de la inscripción</strong> —con cierre del establecimiento— y <strong>decomiso</strong> de mercadería cuando no se justifique el origen lícito, haya documentación falsa o violación sanitaria. La norma permite además adicionar a la multa el beneficio ilícito obtenido.</p>

<div class="alerta">
  <div class="alerta-title">El riesgo real no es la multa</div>
  <p>El tope de multa de esa ley se actualizó por última vez en 1991, en australes, y el organismo que debía actualizarlo semestralmente se disolvió ese mismo año. En los hechos <strong>no hay un tope de multa vigente publicable</strong>. Lo que sí es concreto y devastador es lo otro: la <strong>cancelación de la inscripción</strong>. Sin matrícula nacional no hay actividad, y el negocio no cierra la persiana por una multa — cierra por quedar afuera del registro.</p>
</div>

<h3>La baja que llega sola, sin que nadie te acuse de nada</h3>
<p>Con la sustitución de los Anexos en julio de 2026, la <strong>baja automática por inactividad</strong> en el rubro carnes quedó en <strong>180 días corridos</strong>, sin intimación previa. Buena parte de la prensa contable tituló "de 90 a 180 días"; el texto anterior decía <strong>sesenta</strong>. No se duplicó: se triplicó.</p>
<p>Para una firma que se inscribe con tiempo y después tarda en arrancar —el caso típico de quien está esperando el juramento del colegio o la habilitación del predio— eso significa algo muy concreto: <strong>si pasás medio año sin registrar operaciones, la matrícula se cae sola</strong>, y hay que empezar de nuevo.</p>
`,
    },
    {
      titulo: 'El checklist maestro de apertura',
      html: `
<p>El orden importa: cada fila depende de la anterior. Copiá esta tabla y ponele fechas.</p>

<table class="checklist">
  <thead><tr><th>#</th><th>Paso</th><th>Organismo</th><th>Depende de</th><th>Plazo típico</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>Título de Martillero y Corredor Público</td><td>Universidad</td><td>—</td><td>Años. Es la restricción real del proyecto.</td></tr>
    <tr><td>2</td><td>Carpeta de colegiación + fianza</td><td>Colegio de la jurisdicción</td><td>1</td><td>Semanas de armado; certificados con vencimiento corto al final</td></tr>
    <tr><td>3</td><td>Juramento y alta de matrícula</td><td>Colegio</td><td>2</td><td>Fechas fijas: hasta 4 meses de espera</td></tr>
    <tr><td>4</td><td>Constitución de la sociedad</td><td>Registro público provincial</td><td>—</td><td>Semanas a meses según jurisdicción</td></tr>
    <tr><td>5</td><td>CUIT, Clave Fiscal nivel 3, IVA, Ganancias</td><td>ARCA</td><td>4</td><td>Días</td></tr>
    <tr><td>6</td><td>Ingresos Brutos / Convenio Multilateral</td><td>Rentas provincial / CM</td><td>5</td><td>Días</td></tr>
    <tr><td>7</td><td>Inscripción SIOCAL — Consignatario y/o Comisionista de Ganados</td><td>SAGyP · DNCCA</td><td>4, 5</td><td>Depende del análisis; 10 días hábiles para subsanar observaciones</td></tr>
    <tr><td>8</td><td>Registro Fiscal de Hacienda y Carnes (RG 3873)</td><td>ARCA</td><td>5</td><td>Días</td></tr>
    <tr><td>9</td><td>Habilitación del predio de concentración (Res. 924/2020)</td><td>SENASA</td><td>Predio disponible</td><td>Obra + inspección. Vigencia 2 años.</td></tr>
    <tr><td>10</td><td>Usuario en los sistemas sanitarios y de movimiento (DT-e)</td><td>SENASA</td><td>7, 9</td><td>Días</td></tr>
    <tr><td>11</td><td>Cuenta bancaria de la operatoria y seguros</td><td>Banco / aseguradora</td><td>4, 5</td><td>Días a semanas</td></tr>
    <tr><td>12</td><td>Libros rubricados del martillero</td><td>Registro / Colegio</td><td>3</td><td>Días</td></tr>
  </tbody>
</table>

<div class="callout">
  <div class="callout-title">La verdad sobre los plazos</div>
  <p>Si ya sos martillero matriculado y no vas a tener predio propio, del paso 4 al 12 se resuelve en cuestión de semanas. Si no tenés el título, el proyecto no arranca en meses: arranca en años, y la decisión honesta es asociarte con alguien que ya lo tenga.</p>
</div>
`,
    },
  ],
}
