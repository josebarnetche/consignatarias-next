/**
 * Guía "Cómo abrir tu consignataria de hacienda" — Parte V y anexos.
 *
 * Parte V es el módulo para firmas que YA operan: auditoría de posicionamiento
 * y concepto único (método Ries & Trout, tal como se aplica en Memola), llevado
 * a la categoría "consignataria de hacienda" con ejemplo trabajado y plantillas.
 */

export const PARTE_V = {
  numero: 'V',
  titulo: 'Para la consignataria que ya existe',
  bajada:
    'Si la firma ya opera hace años y compite por precio contra la de al lado, el problema no es la comunicación: es la posición. Esta parte es el método para arreglarla.',
  capitulos: [
    {
      titulo: 'Por qué todas dicen lo mismo',
      html: `
<p>Poné una al lado de la otra las páginas o los perfiles de cinco consignatarias de cualquier provincia. Vas a leer, con mínimas variantes, estas frases:</p>

<div class="frases-genericas">
  <span>"Más de 40 años al servicio del productor"</span>
  <span>"Seriedad y confianza"</span>
  <span>"Compromiso con el campo argentino"</span>
  <span>"Su hacienda en las mejores manos"</span>
  <span>"Tradición y experiencia"</span>
</div>

<p>Cinco firmas distintas diciendo exactamente lo mismo. El resultado previsible: el productor no encuentra ninguna diferencia y decide por lo único que sí es distinto —el punto de comisión— o por costumbre. Cuando toda la categoría dice lo mismo, la categoría se comoditiza y gana el más barato. Ninguna consignataria quiere ganar por barata.</p>

<p>El problema no es que las frases sean falsas. Probablemente sean todas ciertas. El problema es que <strong>ser cierto no alcanza: hay que ser distinto en la cabeza del que decide</strong>. El posicionamiento no se hace en la empresa; se hace en la mente del productor, y ahí solo entra una idea por firma.</p>

<div class="regla">Si tu frase la puede firmar tu competidor sin cambiar una palabra, no es una posición.</div>
`,
    },
    {
      titulo: 'La auditoría: las seis preguntas',
      html: `
<p>Se contestan en orden y no se saltea ninguna. Cada respuesta condiciona la siguiente. Contestalas por escrito: lo que no se puede escribir en una línea, no existe en la cabeza de nadie.</p>

<h3>1. ¿Qué posición ocupás hoy?</h3>
<p>La respuesta la da el mercado, no el dueño. La forma honesta de averiguarlo: llamá a diez productores que <em>no</em> te consignan y preguntales con qué firma asocian cada categoría de tu zona. Anotá las respuestas literales. Después completá:</p>
<div class="plantilla">Para <span class="blank">quién</span>, somos la firma que <span class="blank">qué</span> en <span class="blank">categoría/zona</span>.</div>
<p>Si la frase no sale sin esfuerzo, la posición no existe. Eso también es un resultado.</p>

<h3>2. ¿Qué posición querés ocupar?</h3>
<p>Una sola. Tiene que estar libre en la cabeza del productor y tenés que poder defenderla con los recursos que tenés. Las dos trampas clásicas: querer la posición del líder de la plaza, y querer ser todo para todos. La segunda no es una posición ambiciosa: es la ausencia de posición.</p>

<h3>3. ¿A quién tenés que desplazar?</h3>
<p>Si para ocupar esa posición hay que enfrentar de frente al líder de la plaza, cambiá de posición. Al líder se lo rodea. Se busca su fortaleza estructural y se la da vuelta: la firma más grande es también la más lenta y la menos personal; la más tradicional es también la que no da información; la que rematá en todos lados es la que no conoce tu zona.</p>

<h3>4. ¿Tenés plata para sostenerla?</h3>
<p>Posicionar cuesta y sostenerlo cuesta más. Si los recursos no alcanzan para hacerse oír en toda la provincia, <strong>achicá el frente</strong>: un partido, una categoría, un canal. Es mejor ser el primero en la cabeza de los productores de cría de tres partidos que el cuarto en toda la provincia.</p>

<h3>5. ¿Vas a aguantar tres a cinco años?</h3>
<p>El posicionamiento es acumulativo. La firma que cambia el eje cada dieciocho meses no acumula nada. Preguntá adentro: ¿quién se va a aburrir primero?</p>

<h3>6. ¿La operación está a la altura?</h3>
<p>Si la posición elegida es "la que paga rápido", la operación tiene que pagar rápido, todos los remates, incluido el mes que un comprador se atrasa. Si la posición es "la que más sabe de cría", el que atiende el teléfono tiene que saber de cría. Auditá el desvío entre lo que la firma dice y lo que entrega, y arreglalo antes de comunicarlo.</p>

<div class="alerta">
  <div class="alerta-title">El sacrificio, que es la parte que nadie quiere hacer</div>
  <p>Terminadas las seis preguntas, escribí qué estás dispuesto a soltar. Si la respuesta es "nada", no hay posicionamiento: hay deseo. La firma que quiere ser la de invernada, la de gordo, la de cría, la de reproductores y la de campos, no va a ser ninguna. Soltar una categoría rentable para poseer otra es exactamente el precio de existir en la cabeza del productor.</p>
</div>
`,
    },
    {
      titulo: 'La escalera mental del productor',
      html: `
<p>En la cabeza de cada productor hay una escalera por categoría, con muy pocos peldaños. Cuando piensa "tengo que vender los terneros", aparecen dos o tres nombres, y raramente más. Esa escalera es el mapa real de tu mercado, y no es única: hay una escalera por categoría y otra por zona.</p>

<table>
  <thead><tr><th>Escalera</th><th>Peldaño 1</th><th>Peldaño 2</th><th>Peldaño 3</th></tr></thead>
  <tbody>
    <tr><td>Invernada en mi zona</td><td class="blank-cell"></td><td class="blank-cell"></td><td class="blank-cell"></td></tr>
    <tr><td>Gordo / faena</td><td class="blank-cell"></td><td class="blank-cell"></td><td class="blank-cell"></td></tr>
    <tr><td>Cría y vientres</td><td class="blank-cell"></td><td class="blank-cell"></td><td class="blank-cell"></td></tr>
    <tr><td>Reproductores</td><td class="blank-cell"></td><td class="blank-cell"></td><td class="blank-cell"></td></tr>
    <tr><td>Campos</td><td class="blank-cell"></td><td class="blank-cell"></td><td class="blank-cell"></td></tr>
  </tbody>
</table>

<p>Completala con nombres reales de tu plaza y marcá dónde estás. Tres lecturas posibles:</p>
<ul>
  <li><strong>Estás en el peldaño 1 de alguna escalera.</strong> Defendelo y no lo diluyas metiéndote en las otras.</li>
  <li><strong>Estás en el 2 o el 3.</strong> El movimiento no es "ser mejor que el 1": es encontrar una escalera donde puedas ser el 1, aunque sea más chica.</li>
  <li><strong>No estás en ninguna.</strong> El trabajo no es comunicar más: es elegir una escalera y ocuparla.</li>
</ul>
`,
    },
    {
      titulo: 'El créneau: los huecos que suelen estar libres',
      html: `
<p>Un créneau es un hueco en la mente del mercado. En la categoría "consignataria de hacienda" hay huecos que se repiten plaza tras plaza porque casi nadie los ocupa. Chequeá cuál está libre en la tuya:</p>

<table>
  <thead><tr><th>Hueco</th><th>Cómo suena ocupado</th><th>Qué tiene que garantizar la operación</th></tr></thead>
  <tbody>
    <tr><td><strong>El plazo de pago</strong></td><td>"A las 72 horas, siempre"</td><td>Pagar a 72 horas incluso el mes en que un comprador se atrasa. Exige capital.</td></tr>
    <tr><td><strong>La categoría</strong></td><td>"La casa de la invernada"</td><td>Compradores de invernada en pista todos los remates, y decir que no al resto.</td></tr>
    <tr><td><strong>La zona</strong></td><td>"Los que conocen el norte del partido"</td><td>Estar ahí. Visitar. Conocer los campos por nombre.</td></tr>
    <tr><td><strong>La información</strong></td><td>"Los que te muestran cómo se formó el precio"</td><td>Publicar resultados y liquidaciones legibles, siempre.</td></tr>
    <tr><td><strong>El productor chico</strong></td><td>"Desde 10 cabezas"</td><td>Aceptar lotes chicos sin castigarlos en la comisión ni en el orden de pista.</td></tr>
    <tr><td><strong>La velocidad</strong></td><td>"Te contestamos en el día"</td><td>Alguien atendiendo el teléfono de verdad, incluido el sábado.</td></tr>
  </tbody>
</table>

<div class="callout">
  <div class="callout-title">Los tres falsos huecos</div>
  <p><strong>"Somos los más serios"</strong> — no es un hueco, es lo que todos dicen. <strong>"Damos servicio integral"</strong> — no es un hueco, es la renuncia a elegir uno. <strong>"Tenemos la comisión más baja"</strong> — es un hueco, pero solo lo puede ocupar el que tiene la estructura de costos más baja de la plaza, y se pierde el día que aparece uno más barato.</p>
</div>
`,
    },
    {
      titulo: 'El concepto único: una palabra que puedas poseer',
      html: `
<p>La parte más difícil es elegir <em>una</em> idea. Sin eso, todo lo que se produzca después reproduce la dispersión. El proceso son cuatro pasos.</p>

<h3>Paso 1 — Generá 8 a 12 candidatos, desde cuatro ángulos</h3>
<ol>
  <li><strong>Antagónico al líder.</strong> Si el líder es grande, probá "cercano". Si es tradicional, probá "claro".</li>
  <li><strong>Atributo que nadie reclama</strong> en tu categoría.</li>
  <li><strong>Audiencia específica.</strong> "La casa del criador chico" define a quién es.</li>
  <li><strong>Uso o momento.</strong> "Para vender sin esperar el remate".</li>
</ol>
<p>Cada candidato: una palabra o una frase de hasta cuatro palabras. Si necesita explicación, descartalo.</p>

<h3>Paso 2 — Filtrá con seis criterios</h3>
<p>Dos fallas y el candidato se cae.</p>
<table class="filtro">
  <thead><tr><th>Candidato</th><th>Libre</th><th>Defendible</th><th>Simple</th><th>Peldaño real</th><th>Sacrificio claro</th><th>3+ años</th><th>Veredicto</th></tr></thead>
  <tbody>
    <tr><td class="blank-cell"></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
    <tr><td class="blank-cell"></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
    <tr><td class="blank-cell"></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
    <tr><td class="blank-cell"></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
    <tr><td class="blank-cell"></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  </tbody>
</table>

<h3>Paso 3 — Elegí uno</h3>
<p>Entre los sobrevivientes, gana el que combine mejor defensibilidad operativa (lo que podés probar hoy), distancia respecto del líder, y capacidad de ordenar todo lo que vas a comunicar. Si no sobrevive ninguno, el problema no es el concepto: es la categoría elegida o el sacrificio que no se aceptó.</p>

<h3>Paso 4 — Operacionalizalo</h3>
<p>Para el concepto ganador, escribí:</p>
<ul>
  <li><strong>Frase ancla</strong>, de hasta doce palabras.</li>
  <li><strong>Tres sinónimos permitidos</strong> —el mismo concepto dicho distinto— y <strong>tres antónimos prohibidos</strong>: lo que la firma no dice nunca.</li>
  <li><strong>Cómo se manifiesta</strong> en cada punto de contacto: la página, la ficha de remate, la liquidación, el mensaje de WhatsApp, el cartel del predio, lo que dice el martillero antes de abrir la pista.</li>
  <li><strong>Test de coherencia:</strong> una pregunta que toda pieza nueva tiene que pasar antes de publicarse.</li>
</ul>

<h3>Ejemplo trabajado</h3>
<div class="ejemplo">
  <p><strong>Firma:</strong> Casa Sarandí, tercera generación, remate feria mensual en una plaza donde el líder histórico es una firma con cinco predios en tres provincias.</p>
  <p><strong>Posición actual (pregunta 1):</strong> indefinida. Diez llamados y ningún productor la nombró primero en ninguna categoría; la nombraron como "los del remate del 12".</p>
  <p><strong>Escalera de invernada:</strong> 1) la firma grande, 2) una firma de la ciudad vecina, 3) Casa Sarandí.</p>
  <p><strong>Fortaleza del líder:</strong> cinco predios, mucha pista. <strong>Debilidad derivada:</strong> nadie de esa firma conoce los campos del norte del partido, y el productor chico entra al final de la pista, cuando ya se fueron los compradores.</p>
  <p><strong>Candidatos:</strong> "cercanos", "el criador chico", "pago en 72 horas", "los que te explican el precio", "la casa de la cría".</p>
  <p><strong>Sobrevivientes tras el filtro:</strong> "el criador chico" y "pago en 72 horas". El segundo se cae en <em>defendible</em>: la firma no tiene hoy el capital para garantizarlo todos los meses.</p>
  <p><strong>Concepto:</strong> <strong>el criador chico</strong>.</p>
  <p><strong>Frase ancla:</strong> <em>Desde diez cabezas, y entrás primero a la pista.</em></p>
  <p><strong>Sacrificio:</strong> soltar la pelea por los lotes grandes de invernada, que es donde está el líder y donde Casa Sarandí perdía tiempo y comisión todos los meses.</p>
  <p><strong>Congruencia operativa exigida:</strong> orden de pista que arranca por los lotes chicos; sin comisión diferencial por tamaño; el que atiende conoce cría.</p>
  <p><strong>Test de coherencia:</strong> "¿esta pieza le sirve a alguien que tiene 30 vacas?". Si no, no se publica.</p>
</div>
`,
    },
    {
      titulo: 'Reposicionar al líder de tu plaza',
      html: `
<p>No se le pelea al líder por su terreno: se lo reposiciona. Se toma la fortaleza que todos le reconocen y se muestra el costo que esa fortaleza tiene para el productor. Nunca se lo nombra.</p>

<table>
  <thead><tr><th>Fortaleza reconocida del líder</th><th>Costo que implica</th><th>Cómo suena tu posición</th></tr></thead>
  <tbody>
    <tr><td>Opera en muchas plazas</td><td>No conoce ninguna en profundidad</td><td>"Rematamos donde vivimos"</td></tr>
    <tr><td>Mueve mucho volumen</td><td>El lote chico entra último</td><td>"Acá tu lote entra primero"</td></tr>
    <tr><td>Tiene 60 años de historia</td><td>Hace las cosas como en 1990</td><td>"El precio te llega al teléfono el mismo día"</td></tr>
    <tr><td>Estructura grande</td><td>Nadie te conoce por tu nombre</td><td>"Te atiende el que remata"</td></tr>
  </tbody>
</table>

<div class="callout">
  <div class="callout-title">Dos reglas que evitan el papelón</div>
  <p><strong>Nunca nombres al competidor.</strong> Nombrarlo es hacerle publicidad y quedar como el que pelea. <strong>Nunca reclames un contraste que no puedas probar el lunes siguiente.</strong> Si decís "te atiende el que remata", tiene que atender el que remata.</p>
</div>
`,
    },
    {
      titulo: 'Plantillas para completar',
      html: `
<h3>Plantilla 1 — Diagnóstico de posicionamiento</h3>
<div class="plantilla-bloque">
  <p><strong>Firma:</strong> <span class="blank long"></span></p>
  <p><strong>Categoría (lo más específica posible):</strong> <span class="blank long"></span></p>
  <p><strong>Fecha:</strong> <span class="blank"></span></p>
  <p><strong>1. Posición en la mente del productor hoy:</strong> <span class="blank long"></span></p>
  <p><strong>Evidencia (a quién le preguntaste):</strong> <span class="blank long"></span></p>
  <p><strong>2. Posición propuesta (una sola):</strong> <span class="blank long"></span></p>
  <p><strong>3. Líder a rodear:</strong> <span class="blank"></span> · <strong>Su fortaleza:</strong> <span class="blank"></span> · <strong>Debilidad derivada:</strong> <span class="blank"></span></p>
  <p><strong>4. Frente elegido (zona / categoría / canal):</strong> <span class="blank long"></span></p>
  <p><strong>5. Compromiso temporal:</strong> <span class="blank"></span> · <strong>Quién se puede aburrir:</strong> <span class="blank"></span></p>
  <p><strong>6. Lo que la operación tiene que garantizar:</strong> <span class="blank long"></span></p>
  <p><strong>Sacrificio explícito — qué soltamos:</strong> <span class="blank long"></span></p>
</div>

<h3>Plantilla 2 — Concepto único</h3>
<div class="plantilla-bloque">
  <p><strong>Concepto:</strong> <span class="blank long"></span></p>
  <p><strong>Frase ancla (≤12 palabras):</strong> <span class="blank long"></span></p>
  <p><strong>Sinónimos permitidos:</strong> <span class="blank"></span> · <span class="blank"></span> · <span class="blank"></span></p>
  <p><strong>Antónimos prohibidos:</strong> <span class="blank"></span> · <span class="blank"></span> · <span class="blank"></span></p>
  <p><strong>Test de coherencia:</strong> <span class="blank long"></span></p>
</div>

<h3>Plantilla 3 — Congruencia por punto de contacto</h3>
<table>
  <thead><tr><th>Punto de contacto</th><th>Cómo se manifiesta el concepto</th><th>Responsable</th></tr></thead>
  <tbody>
    <tr><td>Página propia</td><td class="blank-cell"></td><td class="blank-cell"></td></tr>
    <tr><td>Ficha de remate</td><td class="blank-cell"></td><td class="blank-cell"></td></tr>
    <tr><td>Primer mensaje de WhatsApp</td><td class="blank-cell"></td><td class="blank-cell"></td></tr>
    <tr><td>Liquidación</td><td class="blank-cell"></td><td class="blank-cell"></td></tr>
    <tr><td>Lo que dice el martillero al abrir</td><td class="blank-cell"></td><td class="blank-cell"></td></tr>
    <tr><td>Cartel del predio</td><td class="blank-cell"></td><td class="blank-cell"></td></tr>
  </tbody>
</table>
`,
    },
  ],
}

export const ANEXOS = {
  numero: 'VI',
  titulo: 'Anexos',
  bajada: 'La normativa citada, el glosario y de dónde salió cada dato de esta guía.',
  capitulos: [
    {
      titulo: 'Normativa citada',
      html: `
<table>
  <thead><tr><th>Norma</th><th>Qué regula</th><th>Dónde aparece en esta guía</th></tr></thead>
  <tbody>
    <tr><td><strong>Código Civil y Comercial, arts. 1.335, 1.337, 1.339, 1.341 y 1.343</strong></td><td>Contrato de consignación: obligación directa, plazos, diligencia y comisión de garantía</td><td>Cap. 1 y definición de la categoría en SIOCAL</td></tr>
    <tr><td><strong>Decreto-Ley 20.266/73</strong></td><td>Régimen legal de martilleros</td><td>Cap. 4 — matrícula, fianza (art. 3 inc. d), libros (art. 17)</td></tr>
    <tr><td><strong>Ley 25.028</strong></td><td>Reforma del régimen de martilleros y corredores; exigencia de título universitario</td><td>Cap. 4</td></tr>
    <tr><td><strong>Resolución SAGyP 50/2025</strong> (11-abr-2025)</td><td>Crea el SIOCAL en reemplazo del RUCA para ganados y carnes</td><td>Cap. 6 — Anexo I, puntos 1.2 a 1.6 y 2.5 / 2.9</td></tr>
    <tr><td><strong>Resolución SAGyP 103/2026</strong> (BO 6-jul-2026)</td><td><strong>Sustituye íntegramente los Anexos I, II y III</strong> de la Res. 50/2025. Es el texto que rige hoy: excluye a los lácteos y agrega el requisito 1.5.6</td><td>Cap. 6 — el régimen vigente</td></tr>
    <tr><td><strong>Ley 25.507</strong></td><td>Crea el IPCVA y su régimen de aportes (art. 14: topes de alícuota; la Asamblea fija el valor)</td><td>Cap. 13 — el renglón del IPCVA</td></tr>
    <tr><td><strong>RG (AFIP) 3964/2016</strong> y manual WSLSP</td><td>Cuenta de Venta y Líquido Producto – Sector Pecuario: códigos de comprobante, de gastos y de tributos</td><td>Cap. 12 — la liquidación</td></tr>
    <tr><td><strong>Resolución SENASA 841/2025</strong></td><td>Identificación electrónica obligatoria para cerrar el DT-e desde el 1-ene-2026</td><td>Cap. 11 — DT-e</td></tr>
    <tr><td><strong>Dictámenes DAL 59/2002 y 6/2005</strong></td><td>Alícuota de IVA aplicable a la comisión y gastos del consignatario de hacienda</td><td>Cap. 7 — el IVA del negocio</td></tr>
    <tr><td><strong>RG AFIP 3873/2016</strong></td><td>Registro Fiscal de Operadores de la Cadena de Producción y Comercialización de Haciendas y Carnes Bovinas y Bubalinas</td><td>Cap. 7</td></tr>
    <tr><td><strong>Resolución SENASA 924/2020</strong></td><td>Habilitación y rehabilitación de predios feriales, mercados concentradores y lugares de concentración de animales</td><td>Cap. 8</td></tr>
    <tr><td><strong>Resolución SENASA 723/2025</strong></td><td>Documento de Tránsito electrónico (DT-e)</td><td>Cap. 11</td></tr>
    <tr><td><strong>RG AFIP 830</strong></td><td>Régimen general de retención del Impuesto a las Ganancias</td><td>Cap. 7 y 12</td></tr>
  </tbody>
</table>

<div class="alerta">
  <div class="alerta-title">Vigencia</div>
  <p>Esta guía está cerrada al {{FECHA}}. La normativa argentina del sector cambia: el propio RUCA fue reemplazado en 2025 y buena parte del material que circula todavía no lo refleja. Antes de presentar cualquier trámite, verificá la vigencia en el organismo. Esta guía es material de referencia y de método; no reemplaza el asesoramiento de un contador ni de un abogado.</p>
</div>
`,
    },
    {
      titulo: 'Glosario',
      html: `
<dl class="glosario">
  <dt>Consignación</dt><dd>Mandato sin representación: el consignatario vende en nombre propio pero por cuenta del productor.</dd>
  <dt>Comitente</dt><dd>El productor que entrega la hacienda para que se la vendan.</dd>
  <dt>DT-e</dt><dd>Documento de Tránsito electrónico. El "número de tropa" que ampara cada movimiento de hacienda. Se emite en SIGSA (SENASA).</dd>
  <dt>RENSPA</dt><dd>Registro Nacional Sanitario de Productores Agropecuarios. Identifica la relación productor–establecimiento; sin RENSPA vigente no hay movimiento.</dd>
  <dt>SIOCAL</dt><dd>Sistema de Información de Operadores de Carnes y Lácteos. Registro nacional de operadores; reemplazó al RUCA para ganados y carnes (Res. SAGyP 50/2025).</dd>
  <dt>RUCA</dt><dd>Registro Único de la Cadena Agroindustrial. Reemplazado por SIOCAL (carnes) y SISA (granos).</dd>
  <dt>MAG</dt><dd>Mercado Agroganadero de Cañuelas. Plaza concentradora de referencia; sucesor del mercado de Liniers.</dd>
  <dt>INMAG</dt><dd>Índice diario del novillo del MAG, ponderado por volumen, en pesos por kilo vivo.</dd>
  <dt>Desbaste</dt><dd>Descuento porcentual sobre el peso vivo por el ayuno y el transporte. Se pacta y se explicita en la liquidación.</dd>
  <dt>Créneau</dt><dd>Hueco libre en la mente del mercado. La posición que ninguna firma de la categoría ocupa todavía.</dd>
  <dt>Escalera mental</dt><dd>El orden en que aparecen las marcas de una categoría en la cabeza de quien decide. Tiene pocos peldaños.</dd>
</dl>
`,
    },
    {
      titulo: 'Fuentes de los datos',
      html: `
<ul class="fuentes">
  <li><strong>Precios de hacienda e índice del novillo:</strong> Mercado Agroganadero (Cañuelas), serie propia de consignatarias.com.ar. Los valores usados en los capítulos 3, 13 y 14 corresponden al {{FECHA_MERCADO}} y están publicados y actualizados a diario, sin costo, en <span class="url">consignatarias.com.ar/mercado</span>.</li>
  <li><strong>Mapa de firmas y calendario de remates:</strong> relevamiento propio publicado en <span class="url">consignatarias.com.ar/consignatarias</span> y <span class="url">/remates</span>.</li>
  <li><strong>Padrón de operadores inscriptos:</strong> padrón público del SIOCAL, Secretaría de Agricultura, Ganadería y Pesca.</li>
  <li><strong>Requisitos de matrícula:</strong> publicaciones de colegios departamentales de martilleros y corredores públicos, y el texto de las leyes 20.266 y 25.028.</li>
  <li><strong>Requisitos sanitarios y de movimiento:</strong> resoluciones de SENASA citadas en el anexo de normativa.</li>
</ul>

<div class="cierre">
  <p>Esta guía la escribió el equipo que opera <strong>consignatarias.com.ar</strong>, la infraestructura de datos del mercado ganadero argentino: índice diario del novillo desde 2015, precios por categoría, calendario de remates y el directorio de firmas del país. El módulo de marketing y posicionamiento es el método que <strong>Memola Medios SAS</strong> aplica con sus clientes del agro.</p>
  <p class="cierre-contacto">Consultas: agro@memola.com.ar</p>
</div>
`,
    },
  ],
}
