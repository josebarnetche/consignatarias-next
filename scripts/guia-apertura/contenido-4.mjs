/**
 * Guía "Cómo abrir tu consignataria de hacienda" — Parte VI (el riesgo) y Anexo de vigencias.
 *
 * Esta parte nace del hallazgo central de la investigación de agosto de 2026: el
 * agujero de la v1 no era de información sino de encuadre. El riesgo de una
 * consignataria no es "un problema de caja" —así lo contaba la v1— sino un
 * problema de DERECHO, con cuatro artículos del Código que definen quién termina
 * poniendo la plata, y una serie de casos reales, con nombre y expediente, que
 * muestran cómo se ejecuta ese riesgo en la práctica.
 */

export const PARTE_VI = {
  numero: 'VI',
  titulo: 'El riesgo',
  bajada:
    'Quién pone la plata cuando el comprador no paga. Cuatro artículos del Código, seis defaults con nombre y fecha, y cómo se cobra por un riesgo que hoy la mayoría asume gratis.',
  capitulos: [
    {
      titulo: 'Quién pone la plata cuando el comprador no paga',
      html: `
<p>Este es el capítulo que separa una consignataria que dura de una que no. Y empieza con una mala noticia: no hay un seguro, no hay un fondo de garantía del mercado, y no hay nadie más en la fila. Hay cuatro artículos del Código Civil y Comercial, y conviene leerlos en orden.</p>

<h3>Art. 1.337 — Sos principal, no intermediario</h3>
<p>Textual: <em>"El consignatario queda directamente obligado hacia las personas con quienes contrata, sin que éstas tengan acción contra el consignante, ni éste contra aquéllas."</em></p>
<p>Dos consecuencias, las dos incómodas. La primera: el productor que te entregó la hacienda <strong>no puede demandar al frigorífico</strong> que se la llevó. No tiene acción. Su único deudor sos vos. La segunda: vos tampoco tenés acción del consignante contra el comprador; el vínculo con el comprador es tuyo y de nadie más.</p>
<p>Esto desarma de entrada la frase que se escucha en todos los mostradores del país —"yo soy un intermediario"—. Jurídicamente no lo sos. Contratás en nombre propio.</p>

<h3>Art. 1.341 — Pero no sos un seguro</h3>
<p>Acá casi todo el rubro lo cuenta al revés, y la diferencia vale millones. La regla supletoria es que el consignatario responde por el crédito otorgado a terceros <strong>sin la diligencia exigida por las circunstancias</strong>. Es responsabilidad por mala praxis crediticia, no responsabilidad objetiva por la insolvencia del comprador.</p>
<p>Traducido a la discusión que vas a tener algún día: si le vendiste a un comprador que verificaste, con historial, dentro de un límite razonable, y ese comprador quebró, tenés una defensa. Si le vendiste el 40% del remate a una razón social de seis meses porque pagaba dos puntos más, no la tenés.</p>

<h3>Art. 1.339 — El plazo te puede condenar solo</h3>
<p>Textual: <em>"El consignatario se presume autorizado a otorgar los plazos de pago que sean de uso en la plaza. Si otorga plazos contra las instrucciones del consignante, o por términos superiores a los de uso, está directamente obligado al pago del precio o de su saldo en el momento en que hubiera correspondido."</em></p>
<p>Es la trampa más común y la más silenciosa. Le diste 60 días a un comprador en una plaza donde se paga a 30: ya no importa si el comprador paga o no. Le debés la plata al productor <strong>el día que hubiera correspondido cobrarla</strong>. Sin discusión de diligencia, sin defensa.</p>

<div class="regla">De los tres artículos sale la práctica más barata de todo este negocio: el plazo de pago, por escrito, en cada consignación.</div>

<p>No hace falta un contrato de veinte páginas. Alcanza con un renglón en la orden de consignación que diga a qué plazo se autoriza a vender, firmado por el productor. Ese renglón convierte una obligación directa en una discusión sobre diligencia, y esa es toda la diferencia.</p>

<h3>Art. 1.343 — Y si querés, podés vender la garantía</h3>
<p>El Código prevé expresamente que además de la retribución ordinaria se convenga otra <strong>"de garantía"</strong>: convenida, corren por cuenta del consignatario los riesgos de la cobranza y queda directamente obligado a pagar al consignante el precio en los plazos convenidos. Es el <em>del credere</em> de toda la vida, y el capítulo siguiente muestra que el mercado ya lo cobra —solo que muchas firmas lo regalan sin saberlo.</p>

<div class="callout">
  <div class="callout-title">Lo que estos cuatro artículos significan para tu operación</div>
  <p>Que el riesgo de crédito de tu negocio no lo definís vos con una política interna: te lo define el Código según lo que hayas puesto por escrito y según la diligencia que puedas probar. Todo lo que sigue en esta parte es cómo se construye esa prueba antes de necesitarla.</p>
</div>
`,
    },
    {
      titulo: 'Seis defaults con nombre, fecha y monto',
      html: `
<p>Nada de esto es hipotético. Estos son los casos publicados entre 2021 y 2026. Están acá con su fuente porque los patrones se repiten y se reconocen: leerlos es la forma más barata de aprenderlos.</p>

<table>
  <thead><tr><th>Caso</th><th>Cuándo</th><th>Magnitud</th><th>Qué enseña</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>GAEC SRL</strong><br>La Pampa, Santa Fe, Córdoba, Corrientes</td>
      <td>2020-2021</td>
      <td>+$160 a $200 millones</td>
      <td>Compró hacienda en cuatro provincias con cheques sin fondos. Al operar <strong>no registraba cheques rechazados ni deudas en el BCRA</strong>. Entraba por llamada de corredores locales. Terminó con prisión preventiva para dos integrantes.</td>
    </tr>
    <tr>
      <td><strong>Ecoser SA / Tivey Partners</strong></td>
      <td>2021-2022</td>
      <td>$225 millones · 237 cheques</td>
      <td>La escalada perfecta: enero 2021 una jaula, mayo 150 novillos, junio 336, julio 882, agosto 1.666, septiembre 1.954. El 24 de septiembre empezaron los rechazos. Textual de la crónica: el consignatario <em>había</em> chequeado la situación financiera, pero <strong>al ser una razón social nueva no figuraba en el registro de deudores</strong>.</td>
    </tr>
    <tr>
      <td><strong>Palumbo y Prida</strong><br>Mercado Agroganadero</td>
      <td>sep-2024</td>
      <td>$2.200 millones</td>
      <td>Dos matarifes, y la deuda repartida entre <strong>alrededor de una docena de casas</strong>. Se resolvió por negociación privada: plan de pago en seis o diez cuotas con garantías reales. <strong>El mercado no aportó fondo de garantía</strong>: la solución fue bilateral.</td>
    </tr>
    <tr>
      <td><strong>CARFRIC / Cooperativa "Familias Argentinas"</strong></td>
      <td>concurso 19-dic-2025</td>
      <td>26.445 cabezas · ~$4.000 millones</td>
      <td>Faena a través de una cooperativa sin capital propio. De 466 cheques emitidos por la cooperativa <strong>se levantaron 8</strong>. Entre los damnificados, una consignataria por $360 millones.</td>
    </tr>
    <tr>
      <td><strong>Frigorífico General Pico</strong><br>La Pampa</td>
      <td>concurso 31-mar-2026</td>
      <td>1.152 cheques · +$15.800 millones</td>
      <td>La cronología es la lección: la deuda empezó a acumularse en <strong>noviembre de 2025</strong>, al 24 de enero ya tenía 1.033 cheques rechazados, y concursó el 31 de marzo. La faena cayó de 600 a 50 cabezas por día.</td>
    </tr>
    <tr>
      <td><strong>GISISA / Andelino Fernández</strong><br>Patagonia</td>
      <td>abr-may 2026</td>
      <td>429 cheques · ~$5.000 millones a productores</td>
      <td>Llegó a controlar <strong>~50% de la hacienda del norte patagónico</strong> pagando hasta 10% por encima de la referencia. Primer cheque rechazado el 28 de abril; a fin de mayo, 429. Damnificados en tres provincias.</td>
    </tr>
  </tbody>
</table>

<h3>Los cuatro patrones que se repiten</h3>
<ol>
  <li><strong>La razón social nueva es un punto ciego, no una tranquilidad.</strong> El BCRA solo muestra historia; una sociedad de seis meses tiene el legajo perfecto porque no tiene legajo. GAEC y Tivey usaron exactamente eso.</li>
  <li><strong>La escalada es el aviso.</strong> Ningún estafador empieza grande. Empieza chico, paga impecable dos o tres veces, y después multiplica el volumen. Un comprador que en cuatro meses pasa de una jaula a 1.900 novillos no es un buen cliente: es una alarma.</li>
  <li><strong>El que paga arriba de mercado te está comprando el juicio.</strong> GISISA pagaba hasta 10% por encima de la referencia. Nadie regala 10% por gusto: lo hace para que le entregues sin preguntar.</li>
  <li><strong>Hay meses de aviso antes del default formal.</strong> General Pico dejó de pagar en noviembre y concursó en marzo: cinco meses. Los cheques rechazados en el BCRA aparecen mucho antes que el concurso. La pregunta no es si se puede ver venir, es si alguien lo está mirando.</li>
</ol>

<div class="alerta">
  <div class="alerta-title">La concentración es la exposición</div>
  <p>El denominador común de los casos grandes no es el fraude: es que un solo comprador llegó a representar una porción enorme de la operación. Poné un límite de exposición por comprador —un porcentaje del remate y un monto máximo— y escribilo antes de que aparezca el cliente que te lo va a hacer romper.</p>
</div>
`,
    },
    {
      titulo: 'Cobrar por el riesgo que ya estás tomando',
      html: `
<p>Si vas a responder por la cobranza, cobrala. Hay tres capas que existen por separado y que casi nadie junta:</p>

<div class="secuencia">
  <div class="paso"><span class="paso-n">1</span> <strong>La figura legal.</strong> El art. 1.343 del Código prevé la comisión "de garantía".</div>
  <div class="paso"><span class="paso-n">2</span> <strong>El renglón fiscal.</strong> El WSLSP de ARCA tiene el código de gasto <strong>1 — FONDO DE GARANTIA</strong>. El Fisco ya previó que ese concepto se factura.</div>
  <div class="paso"><span class="paso-n">3</span> <strong>La práctica de plaza.</strong> Hay ferias que ya lo desagregan en su reglamento público.</div>
</div>

<h3>Cómo se ve desagregado, en un reglamento real de plaza</h3>
<table>
  <thead><tr><th>Al vendedor</th><th>%</th><th>Al comprador</th><th>%</th></tr></thead>
  <tbody>
    <tr><td>Comisión</td><td>2,00</td><td>Comisión</td><td>2,00</td></tr>
    <tr><td>Garantía</td><td>2,00</td><td>Fondo compensatorio</td><td>1,50</td></tr>
    <tr><td>Sistema informático de terceros</td><td>1,00</td><td>Control y entrega</td><td>0,50</td></tr>
    <tr><td>Gastos de ley</td><td>—</td><td></td><td></td></tr>
    <tr><td><strong>Total</strong></td><td><strong>5,00</strong></td><td><strong>Total</strong></td><td><strong>4,00</strong></td></tr>
  </tbody>
</table>

<p>Leelo dos veces, porque cambia la forma de mirar tu propio tarifario: <strong>la comisión pura del rematador es 2%</strong>. El otro 3% es prima de riesgo y sistema. La firma que anuncia "5% de comisión" y no desagrega está cobrando lo mismo y comunicando peor; la que cobra 3% "todo incluido" y responde por la cobranza está regalando el del credere.</p>

<h3>El contraste que conviene tener presente</h3>
<p>Rosgan —el remate electrónico federal— cobra 5% al comitente vendedor y 4% al comprador, sin desdoblar el del credere. Y su reglamento operativo dice, textual, que <strong>el mercado no garantiza en modo alguno el cumplimiento de las obligaciones a cargo de los compradores</strong>. Lo que sí prevé: límites de compra por comprador, exigencia de garantías bancarias o avales de SGR, entrega de cheque de pago diferido avalado dentro de los tres días hábiles, y multa contractual del 10% del precio de la hacienda subastada ante incumplimiento.</p>
<p>Ese menú es el estado del arte publicado del sector, y está disponible para cualquier firma: límite por comprador, garantía por encima de cierto monto, aval de SGR con foco rural, y una multa escrita.</p>

<h3>Lo que NO te cubre</h3>
<ul>
  <li><strong>El seguro de caución no cubre la falta de pago.</strong> Las coberturas de crédito puramente financiero están fuera del ramo caución en Argentina. Si alguien te ofrece "una caución para que te paguen", leé la póliza dos veces.</li>
  <li><strong>El mercado no es garante.</strong> Lo dijo Cañuelas en los hechos en 2024 y lo dice Rosgan por escrito en su reglamento.</li>
  <li><strong>La cámara tampoco.</strong> En el caso de los $2.200 millones ninguna cámara intervino formalmente en la solución: fue negociación bilateral.</li>
</ul>

<div class="box">
  <div class="box-title">Una nota de honestidad sobre este capítulo</div>
  <p>Los porcentajes de arriba salen de reglamentos publicados de plaza y del reglamento de Rosgan. Son los únicos verificables. La comisión efectiva por región y por tipo de operación —MAG, venta directa a frigorífico, cabaña— no está publicada por nadie: si te la dicen con seguridad, te la están estimando. Pedila por teléfono a tres firmas de tu zona antes de fijar la tuya.</p>
</div>
`,
    },
    {
      titulo: 'Due diligence del comprador: la rutina de diez minutos',
      html: `
<p>El art. 1.341 te pide diligencia. Esto es cómo se construye la prueba de que la tuviste, y cuesta diez minutos por comprador nuevo.</p>

<table>
  <thead><tr><th>Paso</th><th>Qué mirás</th><th>Qué te dice</th></tr></thead>
  <tbody>
    <tr><td><strong>1. Central de deudores del BCRA</strong></td><td>Situación crediticia y cheques rechazados</td><td>Es necesario pero <strong>no suficiente</strong>: una razón social nueva sale limpia. Que esté limpio no prueba nada; que esté sucio decide solo.</td></tr>
    <tr><td><strong>2. Fecha de constitución</strong></td><td>Antigüedad de la sociedad y de la inscripción</td><td>Menos de dos años + volumen creciente = el patrón exacto de GAEC y Tivey.</td></tr>
    <tr><td><strong>3. Padrón SIOCAL</strong></td><td>Que esté inscripto y en qué actividad</td><td>Es público y gratis. Un matarife que no figura, o figura en otra actividad, es una conversación antes de entregar.</td></tr>
    <tr><td><strong>4. Registro Fiscal de Hacienda y Carnes</strong></td><td>Si está incluido y activo</td><td>Estar afuera le cuesta plata en cada operación (ver el capítulo del fisco). El que aceptó ese costo, o no puede entrar, o no le importa.</td></tr>
    <tr><td><strong>5. Referencias de plaza</strong></td><td>Dos llamados a colegas que ya le vendieron</td><td>Es el filtro que más ha evitado defaults en este rubro, y no está en ningún sistema.</td></tr>
    <tr><td><strong>6. Límite inicial</strong></td><td>Monto y porcentaje del remate</td><td>Escrito antes de la primera operación, no después de la tercera.</td></tr>
  </tbody>
</table>

<h3>El monitoreo, que es lo que casi nadie hace</h3>
<p>La due diligence de alta no sirve de nada si después no se mira. Tres rutinas mensuales de cinco minutos:</p>
<ul>
  <li><strong>Recorrer la central de deudores de tus compradores activos.</strong> Los cheques rechazados aparecen meses antes del concurso: General Pico tenía 1.033 en enero y concursó en marzo.</li>
  <li><strong>Mirar tu propia concentración.</strong> Qué porcentaje de tu operación del mes se llevó tu comprador más grande. Si pasa el límite que escribiste, cortá antes de que la respuesta sea "pero es nuestro mejor cliente".</li>
  <li><strong>Escuchar el precio.</strong> El comprador que empieza a pagar sistemáticamente por encima de la referencia no está siendo generoso. La referencia diaria está publicada y es gratis: usala como termómetro de tus propios compradores, no solo de tus ventas.</li>
</ul>

<h3>Si igual pasa: qué se pide y qué no</h3>
<ul>
  <li><strong>Medidas cautelares.</strong> En el caso GISISA los acreedores pidieron en tribunales inhibición general de bienes, congelamiento de cuentas y <strong>suspensión del RENSPA del deudor</strong> para evitar que siguiera moviendo hacienda. Esa última es específica del rubro y no está en ningún manual de abogado generalista.</li>
  <li><strong>Restitución en la quiebra: cuidado con lo que te prometan.</strong> El art. 138 de la Ley de Concursos permite pedir la restitución de bienes entregados al fallido <em>por título no destinado a transferirle el dominio</em> —consignación, depósito, comodato—. En una compraventa el dominio se transfirió con la entrega, y ese caso va por el art. 139, con requisitos mucho más estrictos. En la práctica, el vendedor concurre como acreedor. Que nadie le prometa a un productor que va a recuperar hacienda que ya se vendió.</li>
</ul>

<div class="callout">
  <div class="callout-title">El impuesto al cheque, que sí es plata que se recupera</div>
  <p>Un dato de gestión que casi nadie aprovecha: las cuentas usadas <strong>en forma exclusiva</strong> por consignatarios de ganado para mover fondos de terceros están exentas del impuesto sobre los créditos y débitos (Decreto 897/2021, instrumentado por RG 5145/2022). El requisito es separar las cuentas: fondos de terceros por un lado, fondos propios —tus comisiones— por otro. Ojo con un detalle de vigencia: esas normas exigen estar inscripto y activo en el RUCA, que ya no existe. Hoy eso se lee SIOCAL, pero confirmalo con tu contador antes de reclamar la exención.</p>
</div>
`,
    },
  ],
}

export const ANEXO_VIGENCIAS = {
  numero: 'VII',
  titulo: 'Vigencias, y qué confirmar antes de operar',
  bajada:
    'Qué cambió en los últimos dieciocho meses, qué está en disputa hoy, y la lista honesta de lo que esta guía no puede responder por vos.',
  capitulos: [
    {
      titulo: 'Los dieciocho meses que cambiaron el tablero',
      html: `
<p>Si algo justifica que esta guía tenga edición y fecha en la tapa, es esta tabla. Todo lo de abajo pasó entre enero de 2025 y agosto de 2026, y casi nada de esto está reflejado en el material que circula.</p>

<table>
  <thead><tr><th>Cuándo</th><th>Qué pasó</th><th>Qué te cambia</th></tr></thead>
  <tbody>
    <tr><td><strong>11-abr-2025</strong></td><td>Res. SAGyP 50/2025: nace el SIOCAL, muere el RUCA</td><td>La matrícula nacional cambia de nombre y de sistema. Todo instructivo que diga RUCA quedó viejo.</td></tr>
    <tr><td><strong>19-sep-2025</strong></td><td>Res. SENASA 723/2025: marco único de certificación del transporte</td><td>El DT-e como documento obligatorio de todo movimiento, con obligaciones expresas del transportista.</td></tr>
    <tr><td><strong>3-nov-2025</strong></td><td>Res. SENASA 841/2025: identificación electrónica</td><td>Voluntaria hasta el 31-dic-2025. Desde el 1-ene-2026, <strong>sin lectura de RFID no se cierra el DT-e</strong>.</td></tr>
    <tr><td><strong>dic-2025</strong></td><td>Prohibida la venta de caravanas visuales</td><td>El circuito de identificación pasa a ser electrónico de punta a punta.</td></tr>
    <tr><td><strong>1-ene-2026</strong></td><td>Res. 40/2026: se derogan normas de faena de la ex Junta Nacional de Carnes</td><td>Se elimina el libro de movimientos de carne vigente desde 1982; todo pasa a registro digital.</td></tr>
    <tr><td><strong>1-may-2026</strong></td><td>ARCA actualiza los valores de la RG 3873</td><td>Cambian los importes de pago a cuenta, retención y percepción por cabeza. Se actualizan cada mayo y noviembre.</td></tr>
    <tr><td><strong>12-jun-2026</strong></td><td>Res. SAGyP 81/2026: se elimina el Registro de Operadores Lácteos</td><td>El fundamento oficial es que sin régimen sancionatorio el control es "jurídicamente inviable".</td></tr>
    <tr><td><strong>25-jun-2026</strong></td><td>Res. SAGyP 89/2026: procedimiento sancionatorio escrito</td><td>Por primera vez hay plazos claros: 20 días para archivar o intimar, 10 días para el descargo.</td></tr>
    <tr><td><strong>6-jul-2026</strong></td><td><strong>Res. SAGyP 103/2026: se sustituyen los tres Anexos del SIOCAL</strong></td><td>Rige un texto nuevo. Salen los lácteos, aparece el requisito 1.5.6 y cambia el plazo de baja por inactividad.</td></tr>
    <tr><td><strong>ago-2026</strong></td><td>Anteproyecto de aporte voluntario al IPCVA</td><td>En disputa abierta. Toda la cadena firmó en contra el 27-jul-2026.</td></tr>
  </tbody>
</table>

<div class="alerta">
  <div class="alerta-title">El dato que la prensa contable publicó mal</div>
  <p>Con la sustitución de los Anexos, la baja automática de la matrícula por inactividad en el rubro carnes pasó a <strong>180 días corridos</strong>. Buena parte de la prensa especializada tituló "de 90 a 180 días". El texto anterior decía <strong>sesenta</strong> para carnes: no se duplicó, se triplicó. Si tu firma se inscribe y después pasa medio año sin operar, se cae sola.</p>
</div>
`,
    },
    {
      titulo: 'Lo que esta guía no puede responder por vos',
      html: `
<p>Un producto pago se define tanto por lo que afirma como por lo que se niega a inventar. Esta es la lista de lo que investigamos y <strong>no</strong> pudimos cerrar con fuente pública, con el camino concreto para que lo cierres vos. Ninguna de estas respuestas está publicada: todas se consiguen con un llamado.</p>

<table>
  <thead><tr><th>Qué falta</th><th>Por qué no está</th><th>A quién se le pregunta</th></tr></thead>
  <tbody>
    <tr><td><strong>Alícuota de IVA de tu comisión</strong></td><td>Los Dictámenes DAL 59/2002 y 6/2005 sostienen la alícuota reducida para el consignatario que factura a nombre propio, contra el criterio intuitivo del 21%. Los textos primarios están en bases pagas.</td><td>Tu contador, con acceso a Errepar o La Ley. Que lo defina <strong>por escrito</strong> antes de tu primera factura.</td></tr>
    <tr><td><strong>Comisión efectiva de tu plaza</strong></td><td>Solo están publicadas las de Rosgan y las de un par de ferias bonaerenses. NEA, NOA, Cuyo y la venta directa a frigorífico no publican nada.</td><td>Cinco llamados a firmas de tu región. Preguntá también si es sobre kilo vivo o kilo gancho.</td></tr>
    <tr><td><strong>Reglamento y aranceles del MAG</strong></td><td>No está publicado: ni el padrón, ni el cupo, ni la garantía exigida, ni el plazo de pago del comprador.</td><td>Administración del Mercado Agroganadero de Cañuelas.</td></tr>
    <tr><td><strong>Cuota de las cámaras</strong></td><td>Ninguna de las tres publica monto ni estatuto.</td><td>CACG, CCDH o CCPP, según tu operatoria (ver el capítulo de la capa gremial).</td></tr>
    <tr><td><strong>Arancel de matrícula y monto de la fianza</strong></td><td>Varía por colegio y por provincia, y casi ninguno lo publica. El único dato hallado es de 2000 y solo para CABA.</td><td>El colegio departamental donde te vas a matricular.</td></tr>
    <tr><td><strong>Aranceles de SENASA para el predio ferial</strong></td><td>Los montos viven en anexos PDF del Boletín Oficial, no en el texto de la resolución.</td><td>La oficina local de SENASA, al presentar la solicitud.</td></tr>
    <tr><td><strong>Alícuotas de IIBB de tu provincia</strong></td><td>Cambian todos los años con cada ley impositiva, y el encuadre de la intermediación pecuaria no es uniforme.</td><td>Tu contador, con la ley impositiva del año en curso.</td></tr>
    <tr><td><strong>Escala salarial vigente</strong></td><td>El encuadre es Empleados de Comercio (ver el capítulo del equipo), pero la escala se actualiza varias veces al año.</td><td>La escala del mes, publicada por FAECYS.</td></tr>
  </tbody>
</table>

<div class="callout">
  <div class="callout-title">Cómo usar esta lista</div>
  <p>Son ocho llamados. Hechos en una semana, te dan los números exactos de tu plaza —que valen más que cualquier promedio nacional— y te construyen, de paso, las primeras ocho relaciones del negocio. Un consignatario que arranca sin haber hablado con su colegio, su cámara y tres colegas de plaza no arrancó: solo se inscribió.</p>
</div>
`,
    },
  ],
}
