/**
 * Buenas Prácticas Ganaderas (BPG) para la producción de vacunos de carne.
 * Estructura y contenido RESUMIDOS y reescritos con atribución, basados en la
 * "Guía de Buenas Prácticas Ganaderas" de la Red BPA (Comisión de Ganadería, 2019, v1),
 * con respaldo de SENASA, INTA, IPCVA, SRA, CRA, CONINAGRO, FAA y otras entidades.
 * NO es la reproducción textual de la guía. Fuente completa en BPG_FUENTE.
 */

export const BPG_FUENTE = {
  titulo: 'Guía de Buenas Prácticas Ganaderas para la producción de ganado vacuno de carne',
  autor: 'Red BPA — Comisión de Ganadería',
  anio: '2019 (v1)',
  respaldo: 'SENASA, INTA, IPCVA, SRA, CRA, CONINAGRO, FAA, universidades y cámaras del sector',
  url: 'https://www.redbpa.org.ar/',
}

export const BPG_INTRO =
  'Las Buenas Prácticas Ganaderas (BPG) son un conjunto de prácticas para producir carne vacuna de forma ' +
  'inocua, eficiente, respetuosa del ambiente, del bienestar animal y de las personas. Ordenan y mejoran las ' +
  'acciones del establecimiento, facilitan la trazabilidad y fortalecen la comercialización a nivel regional, ' +
  'nacional e internacional. Son voluntarias, pero cada vez más demandadas por mercados y cadenas.'

export interface BpgSeccion {
  subtitulo: string
  practicas: string[]
}

export interface BpgTema {
  slug: string
  n: number
  bloque: string
  titulo: string
  resumen: string // una línea para el índice
  intro: string // "cómo armarlo" — framing de implementación
  secciones: BpgSeccion[]
}

export const BLOQUES = [
  'Las personas y la empresa',
  'La infraestructura de producción',
  'El ambiente y la producción',
  'El animal y su manejo',
] as const

export const BPG_TEMAS: BpgTema[] = [
  {
    slug: 'organizacion-empresa',
    n: 1,
    bloque: 'Las personas y la empresa',
    titulo: 'Organización de la empresa',
    resumen: 'Planificar los procesos clave, gestionarlos con registros y roles, y cerrar el ciclo evaluando resultados.',
    intro: 'La planificación es la base para ejecutar bien a futuro y la gestión es ponerla en marcha. Para armarlo: planificá los procesos clave, definí qué registrar y quién es responsable, y cerrá el ciclo evaluando lo hecho contra los objetivos.',
    secciones: [
      { subtitulo: 'Planificación', practicas: [
        'Armá un plan que cubra los procesos clave para llegar a los objetivos, integrando lo productivo, económico, financiero, ambiental, social, legal e impositivo.',
        'Estructuralo en tres etapas: diagnóstico con la información disponible, formulación de opciones y elección de la alternativa viable.',
        'Anticipá cómo impactarían variaciones de clima o economía y qué acciones tomar para no comprometer los objetivos.',
        'Cumplí los requisitos del mercado de destino cuando corresponda.',
      ]},
      { subtitulo: 'Gestión y control', practicas: [
        'Elaborá planes de ejecución con la descripción de cada proceso, un cronograma y los responsables de cada acción.',
        'Definí qué datos vas a registrar para hacer seguimiento y monitoreo de resultados parciales.',
        'Fijá los canales de comunicación entre quienes dirigen, gestionan y operan.',
      ]},
      { subtitulo: 'Resultados y aprendizajes', practicas: [
        'Al cerrar el plan, recopilá la información generada y evaluá los resultados contra los objetivos.',
        'Analizá los procesos para detectar mejoras de cara a la próxima planificación.',
      ]},
      { subtitulo: 'Documentación y trazabilidad', practicas: [
        'Mantené planes, protocolos y registros disponibles, actualizados y completos en la unidad de producción.',
        'Garantizá la trazabilidad de la información para poder seguir productos y procesos de punta a punta.',
      ]},
      { subtitulo: 'Responsabilidad social (RSE)', practicas: [
        'Definí valores que guíen la conducta y las decisiones, comunicalos e incorporalos en todos los procesos.',
        'Asegurá que las operaciones cumplan la normativa y promuevan la transparencia; garantizá calidad de vida laboral y trabajo decente.',
        'Respetá los derechos humanos: sin trabajo infantil ni discriminación, cuidando diversidad y equidad.',
        'Elegí proveedores que cumplan la normativa y estén alineados a la sustentabilidad, priorizando el desarrollo local; velá por la inocuidad y gestioná el impacto en la comunidad.',
      ]},
    ],
  },
  {
    slug: 'personal',
    n: 2,
    bloque: 'Las personas y la empresa',
    titulo: 'Personal',
    resumen: 'Responsable de seguridad y salud, evaluación de riesgos con plan de acción, contratos y roles formalizados, y capacitación.',
    intro: 'Las personas son actores clave de la actividad y la sustentabilidad. Para armarlo: designá un responsable de bienestar, seguridad y salud, evaluá los riesgos y actuá sobre ellos, formalizá contratos y roles, y capacitá.',
    secciones: [
      { subtitulo: 'Bienestar, seguridad y salud', practicas: [
        'Designá un responsable a cargo del bienestar, la seguridad y la salud de las personas; el personal debe tener libreta sanitaria al día y avisar cualquier enfermedad o herida.',
        'Proveé ropa de trabajo y elementos de protección (EPP) adecuados a la tarea, exigí su uso y guardalos separados de fitosanitarios y veterinarios.',
        'Quien manipule fitosanitarios, veterinarios o desinfectantes debe estar entrenado y contar con la ficha de seguridad del producto.',
        'Hacé una evaluación de riesgos de todo el personal y un plan de acción con protocolos por cada situación de riesgo; sumá señalización, botiquines, matafuegos y protocolos de accidentes con gente capacitada.',
      ]},
      { subtitulo: 'Registro y responsabilidades', practicas: [
        'La contratación (fija o temporal) debe cumplir la normativa, con documentación de ambas partes.',
        'Mantené registros completos de todo el personal y un organigrama con manual de responsabilidades, visible y accesible.',
        'A los servicios de terceros exigiles cobertura de riesgo y los mismos puntos de seguridad que al personal propio.',
      ]},
      { subtitulo: 'Gestión y capacitación', practicas: [
        'Definí una política de gestión que concilie los intereses de la empresa y del personal, con un plan de desarrollo laboral y comunicación efectiva.',
        'Tené un plan de capacitación integral (seguridad e higiene, ambiente, bienestar animal) para el personal actual e ingresante, con registros y evaluación de aprendizajes.',
      ]},
    ],
  },
  {
    slug: 'establecimiento',
    n: 3,
    bloque: 'La infraestructura de producción',
    titulo: 'Establecimiento ganadero',
    resumen: 'Caracterizar y gestionar el espacio físico: croquis, unidades de manejo y diseño según el bioma.',
    intro: 'El establecimiento es el espacio físico donde se desarrolla la actividad y requiere una correcta caracterización y gestión.',
    secciones: [
      { subtitulo: 'Caracterización', practicas: [
        'Contá con un mapa o croquis de ubicación que detalle apotreramiento, instalaciones, accesos, fuentes de agua, ambientes y suelos.',
        'Identificá de forma inequívoca la unidad de manejo de la superficie en producción.',
        'Diseñá el sistema de producción según el agro-ecosistema o bioma (suelo, clima, flora y fauna).',
        'Cumplí la normativa vigente para un establecimiento ganadero.',
      ]},
    ],
  },
  {
    slug: 'instalaciones',
    n: 4,
    bloque: 'La infraestructura de producción',
    titulo: 'Instalaciones, equipos y herramientas',
    resumen: 'Diseño y mantenimiento de alambrados, corrales, manga y aguadas pensados para el bienestar y la seguridad, con higiene registrada.',
    intro: 'Las instalaciones y equipos deben promover el bienestar y la seguridad de personas y animales y cuidar el ambiente. Para armarlo: diseñá según el uso y el comportamiento animal, y mantené todo higienizado y en buen estado.',
    secciones: [
      { subtitulo: 'Diseño y mantenimiento', practicas: [
        'Diseñá (o acondicioná) considerando el propósito de uso, la seguridad del operario, el comportamiento y el bienestar animal y el cuidado del ambiente; ubicá en zonas con buen drenaje y acceso.',
        'Usá equipos y herramientas según las recomendaciones del fabricante y evitando impactos sobre el bienestar animal.',
        'Implementá un plan de higiene y mantenimiento con objetivo, cronograma y protocolos, con registro de tareas y productos (aprobados por la autoridad); capacitá al personal.',
      ]},
      { subtitulo: 'Alambrados, cercos y tranqueras', practicas: [
        'Materiales sin salientes (púas, astillas, bulones, clavos) y con bordes redondeados; tranqueras perimetrales siempre cerradas.',
        'Los alambrados eléctricos deben dar un impacto adecuado para el aprendizaje del animal; verificalos periódicamente (malezas, ineficiencias).',
      ]},
      { subtitulo: 'Corrales de trabajo y de alimentación', practicas: [
        'Corrales que garanticen encierro y manejo seguro y ágil, en lugares elevados; piso antideslizante, sin pozos ni charcos, con leve pendiente en el sentido del avance.',
        'Proveé agua y sombra cuando haga falta; si hay corral de partos, cerca de las instalaciones principales.',
        'Corrales de alimentación con tamaño cómodo y pendiente para evitar encharcamiento; comederos con frente y tamaño acorde al consumo y de fácil acceso para animal y operario.',
      ]},
      { subtitulo: 'Manga, cepo, embarcadero y balanza', practicas: [
        'Interconectados como un conjunto, con salidas laterales; desplazamiento fluido y seguro, sin espacios abiertos en piso y laterales.',
        'Pisos antideslizantes y paredes ciegas (sin claroscuros ni distracciones); el cepo debe inmovilizar con cierre gradual para no golpear.',
        'La rampa del embarcadero, con pendiente adecuada y, si se puede, un tramo final horizontal.',
      ]},
      { subtitulo: 'Agua, depósitos y caminos', practicas: [
        'Sistema de almacenamiento y abastecimiento de agua según la demanda planificada (cantidad y calidad); aguadas y bebederos eficientes, con molinos y bombas mantenidos.',
        'Depósito específico de residuos alejado de instalaciones y animales; caminos y callejones abovedados y mantenidos para evitar encharcamiento y erosión.',
      ]},
      { subtitulo: 'Instalaciones para el personal', practicas: [
        'Viviendas habitables y confortables con servicios; baños, vestuarios y comedor acordes a la cantidad de personal.',
      ]},
    ],
  },
  {
    slug: 'suelo',
    n: 5,
    bloque: 'El ambiente y la producción',
    titulo: 'Suelo',
    resumen: 'Caracterizar el suelo, diagnosticar su capacidad, plan de manejo sustentable e indicadores de salud.',
    intro: 'El suelo es la base productiva: la cantidad y calidad de alimento dependen de su salud. Para armarlo: caracterizalo, diagnosticá su capacidad, hacé un plan de manejo sustentable y monitoreá indicadores para corregir el rumbo.',
    secciones: [
      { subtitulo: 'Caracterización y diagnóstico', practicas: [
        'Caracterizá el suelo juntando toda la información disponible (imágenes satelitales, muestreos, cartas de suelo, topografía, historia de manejo) para ver su potencial y sus limitantes.',
        'Evaluá el riesgo de degradación en sus tres tipos de propiedades: físicas, químicas y biológicas.',
        'Para la disponibilidad de nutrientes, seguí la guía de BPA – Cultivos Extensivos de la Red BPA.',
      ]},
      { subtitulo: 'Plan de manejo', practicas: [
        'Armá un plan de manejo según los objetivos y las condiciones agroecológicas, para reducir el riesgo de degradación; no exijas el suelo por encima de su capacidad.',
        'Definí indicadores de salud del suelo con metodología y frecuencia, registrá y analizá los resultados.',
        'Elegí técnicas de pastoreo y prácticas que conserven el suelo en todas sus propiedades.',
      ]},
    ],
  },
  {
    slug: 'agua',
    n: 6,
    bloque: 'El ambiente y la producción',
    titulo: 'Agua',
    resumen: 'Uso eficiente, prevención de contaminación y salinización, y calidad y cantidad para personas, animales y producción.',
    intro: 'El agua es un recurso indispensable: usala de forma eficiente, evitá que se contamine o salinice, y garantizá calidad, cantidad y accesibilidad para personas, animales y demás usos.',
    secciones: [
      { subtitulo: 'General', practicas: [
        'Cumplí la normativa de extracción y uso; usá el recurso eficientemente sin comprometer su disponibilidad.',
        'Preveé agua en calidad y cantidad para todo el ciclo; evitá contaminar y salinizar las fuentes; está prohibido alterar los cursos naturales.',
      ]},
      { subtitulo: 'Calidad del recurso', practicas: [
        'Identificá los riesgos de contaminación de cada fuente, diferenciando consumo humano de animal, y tomá medidas para protegerlas.',
        'Analizá la calidad del agua periódicamente (microbiológico, físico-químico, mineral) en laboratorio competente, documentá y compará con valores de referencia.',
      ]},
      { subtitulo: 'Consumo humano y animal', practicas: [
        'Garantizá agua potable accesible para las personas y señalizá las fuentes no aptas.',
        'Documentá los requerimientos de agua por categoría animal, evaluá el riesgo de no cubrir la demanda con un plan de acción, y definí y verificá la limpieza de los bebederos.',
      ]},
    ],
  },
  {
    slug: 'forrajes',
    n: 7,
    bloque: 'El ambiente y la producción',
    titulo: 'Forrajes',
    resumen: 'Manejo sustentable de las especies vegetales para consumo animal, nativas e implantadas.',
    intro: 'La gestión del forraje es el manejo de las especies vegetales destinadas al consumo animal, aprovechándolas de forma sustentable (flora nativa y exótica implantada) y contemplando la fauna del lugar.',
    secciones: [
      { subtitulo: 'General', practicas: [
        'Identificá el tipo y estado de las forrajeras de interés; estimá la oferta por estación y ajustá la carga y el manejo a lo largo del año.',
        'Planificá los fitosanitarios según BPA – Cultivos Extensivos; relevá plantas tóxicas y evitá que el ganado las consuma; contemplá la convivencia con la fauna nativa.',
      ]},
      { subtitulo: 'Vegetación nativa', practicas: [
        'Identificá la vegetación nativa para evitar su degradación y cumplí la normativa; si usás bosque o monte nativo, hacé un plan de manejo sostenible.',
        'Manejá los animales promoviendo el uso sustentable de la biodiversidad, cuidando las especies más susceptibles al pastoreo.',
      ]},
      { subtitulo: 'Producción de forrajes y fuego', practicas: [
        'En la producción de praderas y cultivos forrajeros, cumplí BPA – Cultivos Extensivos y usá pastoreo que mantenga la calidad del recurso y del suelo.',
        'Si usás fuego como herramienta, hacelo bajo prescripción de un técnico y con un plan de manejo del fuego prescripto, cumpliendo la normativa.',
      ]},
    ],
  },
  {
    slug: 'estiercol-efluentes',
    n: 8,
    bloque: 'El ambiente y la producción',
    titulo: 'Gestión de estiércol y efluentes',
    resumen: 'Evitar la contaminación de agua, napas y aire por la concentración de excretas, con un plan de tratamiento.',
    intro: 'La concentración de animales en espacios reducidos (encierres intensivos) obliga a evaluar el impacto de las excretas sobre el agua superficial, las napas y el aire (olores, vectores).',
    secciones: [
      { subtitulo: 'General', practicas: [
        'Evitá los riesgos de contaminación del agua y del suelo por estiércol y efluentes.',
        'Elaborá e implementá un plan de tratamiento que cubra recolección, almacenamiento, acondicionamiento, tratamiento y uso.',
        'Mantené el sistema de tratamiento adecuadamente aislado para evitar contaminación.',
      ]},
    ],
  },
  {
    slug: 'residuos',
    n: 9,
    bloque: 'El ambiente y la producción',
    titulo: 'Gestión de los residuos',
    resumen: 'Separar, almacenar y disponer cada tipo de residuo (domiciliarios, fitosanitarios, veterinarios, peligrosos).',
    intro: 'Una gestión adecuada de los residuos define mecanismos para su manipulación, almacenamiento y disposición final, separando correctamente cada tipo en el establecimiento.',
    secciones: [
      { subtitulo: 'General', practicas: [
        'Cumplí la normativa vigente cuando corresponda.',
        'Seguí los protocolos de los fabricantes de fitosanitarios y veterinarios para disponer de esos residuos y sus envases.',
        'Designá un área específica para almacenar los distintos tipos de residuos, acondicionada para evitar accidentes y contaminación.',
      ]},
    ],
  },
  {
    slug: 'cambio-climatico',
    n: 10,
    bloque: 'El ambiente y la producción',
    titulo: 'Adaptación y mitigación al cambio climático',
    resumen: 'Ajustar el sistema al clima (adaptación) y reducir emisiones de GEI por kilo de carne (mitigación).',
    intro: 'Hay acciones que ayudan a la adaptación (ajustar el sistema a los efectos del clima) y a la mitigación (actuar sobre las causas), bajando la intensidad de emisiones de gases de efecto invernadero por kilo de carne producido.',
    secciones: [
      { subtitulo: 'General', practicas: [
        'Promové prácticas que aumenten la productividad y la eficiencia (mejor alimentación, buenos índices de destete, más kg de carne por animal y por hectárea).',
        'Promové prácticas que incrementen el stock de carbono orgánico para mitigar los GEI.',
        'Elaborá e implementá un plan de emergencia para minimizar los efectos de desastres naturales o clima extremo.',
      ]},
    ],
  },
  {
    slug: 'manejo-rodeo',
    n: 11,
    bloque: 'El animal y su manejo',
    titulo: 'Manejo de rodeo',
    resumen: 'Plan productivo y reproductivo por escrito, unidades de manejo homogéneas, identificación y registros.',
    intro: 'El manejo del rodeo son las prácticas y decisiones sobre los animales orientadas a los objetivos productivos, contemplando el bienestar animal y el ambiente.',
    secciones: [
      { subtitulo: 'Manejo general', practicas: [
        'Considerá el comportamiento propio del bovino para minimizar el estrés en cada práctica.',
        'Implementá un plan productivo por escrito, con cronograma por unidad de manejo y responsables, complementado con el plan sanitario y el forrajero/alimenticio.',
        'Definí unidades de manejo homogéneas (origen, categoría, tamaño, estado sanitario-nutricional) y mantenelas estables para no alterar el orden social.',
        'Usá un método de identificación según normativa; registrá las prácticas y las existencias por unidad (inventario, ingresos y egresos por causa).',
        'Inspeccioná los animales con regularidad para evaluar su estado y la provisión de agua y alimento.',
      ]},
      { subtitulo: 'Manejo reproductivo', practicas: [
        'Implementá un plan reproductivo por escrito (temporada y tipo de servicio, diagnóstico de preñez, revisación de toros, atención del parto), disponible y de fácil acceso, y registrá servicio, preñez, parición y destete.',
        'Diagnosticá la entrada a primer servicio de los animales jóvenes; los toros deben pasar examen andrológico con tiempo para prever la reposición.',
        'Tras el servicio, el veterinario hace diagnóstico de preñez y revisación; mantené a las hembras próximas al parto bajo supervisión.',
        'El responsable debe estar capacitado para el parto y peri-parto; tené protocolo para crías huérfanas y desinfectá el cordón umbilical según criterio.',
      ]},
    ],
  },
  {
    slug: 'alimentacion',
    n: 12,
    bloque: 'El animal y su manejo',
    titulo: 'Alimentación',
    resumen: 'Plan de alimentación por categoría, manejo del pastoreo, calidad e inocuidad del alimento y almacenamiento.',
    intro: 'El manejo de la alimentación es clave para los objetivos productivos y pilar de la salud y el bienestar animal. Para armarlo: planificá la dieta por categoría, gestioná el pastoreo y la entrega, y cuidá la calidad, la inocuidad y el almacenamiento.',
    secciones: [
      { subtitulo: 'Manejo de la alimentación', practicas: [
        'Implementá un plan que garantice los requisitos nutricionales y la cantidad ofrecida; documentá la demanda mensual por categoría (mantenimiento + ganancia) y la oferta según forraje, granos y silajes, con su logística.',
        'Evaluá el riesgo de que la productividad forrajera sea menor y armá un plan de acción; capacitá al personal en enfermedades digestivas.',
        'Monitoreá y registrá el suministro; preveé la contaminación física, química o biológica; hacé graduales los cambios de dieta y limpiá los equipos.',
      ]},
      { subtitulo: 'Manejo del pastoreo', practicas: [
        'Planificá el pastoreo según los requerimientos y lo indicado en Forrajes, ajustándolo a los cambios estacionales; en pastoreo rotativo, disponé de callejones.',
        'Respetá el período de carencia de los fitosanitarios antes de devolver los animales al potrero.',
      ]},
      { subtitulo: 'Entrega y distribución', practicas: [
        'Usá alimentos y aditivos que cumplan la normativa (está prohibida la proteína animal); registrá composición y entrega y hacé controles de calidad en laboratorio competente.',
        'Tratá o descartá los alimentos con indicios de hongos; los granos tratados, solo con productos aprobados.',
        'Asegurá espacio de comedero suficiente con mínima competencia; hacé la "lectura de comederos" para evaluar consumo y evitá pozos delante de ellos.',
      ]},
      { subtitulo: 'Almacenamiento', practicas: [
        'Almacená los alimentos en ambientes que conserven sus propiedades, identificados y separados de otros productos para evitar contaminación cruzada.',
        'Confeccioná los forrajes conservados (fardos, rollos, silos) para lograr y mantener su máximo valor nutricional e inocuidad; preveé el ingreso de plagas.',
        'Mantené registros de ingreso, salida e inventario y gestioná los residuos del almacenamiento.',
      ]},
    ],
  },
  {
    slug: 'salud-animal',
    n: 13,
    bloque: 'El animal y su manejo',
    titulo: 'Salud animal',
    resumen: 'Plan sanitario con veterinario, prevención, bioseguridad, manejo de medicamentos con período de carencia y manejo integrado de plagas.',
    intro:
      'Un manejo sanitario adecuado mejora la eficiencia, la salud y el bienestar de los animales, la inocuidad de la carne y la comercialización. Para armarlo, trabajá sobre cuatro frentes: un plan sanitario escrito, la bioseguridad, el manejo de animales enfermos y el manejo de medicamentos.',
    secciones: [
      {
        subtitulo: 'Prevención y sanidad',
        practicas: [
          'Elaborá e implementá un plan sanitario hecho por un veterinario, para prevenir, controlar y erradicar enfermedades; que esté disponible y sea de fácil acceso.',
          'El plan debe especificar las enfermedades y los tratamientos, cumpliendo la normativa vigente, e incluir un cronograma de revisión sanitaria por unidad de manejo.',
          'Registrá las visitas del veterinario (diagnósticos, recomendaciones, tratamientos) y, en cada tratamiento, la fecha, el animal o tropa, el producto usado y su período de carencia.',
          'Designá y capacitá a un responsable de la salud y el bienestar animal del establecimiento.',
        ],
      },
      {
        subtitulo: 'Bioseguridad',
        practicas: [
          'Desalentá el ingreso de animales de sanidad desconocida o de menor estatus sanitario.',
          'Mantené a los recién llegados en cuarentena, apartados del rodeo, el tiempo que permita observarlos y detectar enfermedades; hacéles los tratamientos preventivos del plan.',
          'El semen, los óvulos y los embriones deben provenir de fuentes sanas, seguras y acreditadas.',
          'Instalaciones, equipos e instrumental veterinario limpios, desinfectados y bien mantenidos.',
        ],
      },
      {
        subtitulo: 'Manejo de animales enfermos',
        practicas: [
          'Ante síntomas de enfermedad, informá al responsable, que define las acciones y consulta al veterinario si corresponde.',
          'Contá con corrales especiales para monitorear o aislar a los animales enfermos o en observación, e identificalos.',
          'Ante la muerte de un animal, identificá la causa; si es una enfermedad de denuncia obligatoria, comunicá de inmediato a la autoridad sanitaria.',
          'Tené un protocolo documentado para disponer de restos, fetos y animales muertos, con medidas de bioseguridad.',
        ],
      },
      {
        subtitulo: 'Manejo de medicamentos',
        practicas: [
          'Usá solo medicamentos aprobados por la autoridad sanitaria; los que estén fuera del plan, bajo prescripción del veterinario.',
          'Almacenalos según la etiqueta, en envase original, en un lugar controlado y señalizado; garantizá la cadena de frío en heladera de uso exclusivo veterinario.',
          'Llevá inventario de stock y aplicá la regla PEPS (primero entra, primero sale); verificá vencimiento y estado antes de administrar.',
          'Respetá el período de carencia antes de vender o enviar a faena; si no, informá al comprador la condición y el tratamiento.',
          'Uso prudente de antimicrobianos: solo con diagnóstico correcto, respetando dosis, intervalos y duración, para no generar resistencia.',
        ],
      },
      {
        subtitulo: 'Manejo integrado de plagas',
        practicas: [
          'Identificá insectos, roedores u otros animales nocivos y las zonas de riesgo de propagación alrededor del establecimiento.',
          'Implementá un plan de manejo integrado con el menor impacto ambiental, y controlá y monitoreá las plagas relevantes.',
          'Registrá los productos y técnicas aplicados para el control de plagas.',
        ],
      },
    ],
  },
  {
    slug: 'bienestar-animal',
    n: 14,
    bloque: 'El animal y su manejo',
    titulo: 'Bienestar animal',
    resumen: 'Producir con mínimo estrés, dolor y temor: manejo calmo, buen alojamiento, procedimientos humanitarios y plan de emergencia.',
    intro:
      'El bienestar animal es un requisito esencial de las BPG. Buenas condiciones implican producir con mínimo estrés, dolor y temor; satisfacer las necesidades nutricionales, sanitarias y comportamentales; prevenir enfermedades; y manejar y sacrificar de manera humanitaria.',
    secciones: [
      {
        subtitulo: 'Personas y plan de emergencia',
        practicas: [
          'Todo el que maneja animales debe tener la idoneidad necesaria en bienestar animal, según su responsabilidad.',
          'Capacitá al personal en producción de ganado, comportamiento del bovino, bioseguridad y signos de enfermedad y de falta de bienestar (estrés, dolor, incomodidad) y cómo aliviarlos.',
          'Tené un plan de emergencia para fallas de electricidad, agua o alimento y para desastres naturales o clima extremo.',
          'Contá con un protocolo de sacrificio humanitario para animales enfermos o heridos.',
        ],
      },
      {
        subtitulo: 'Buen alojamiento',
        practicas: [
          'El ambiente físico debe adecuarse al biotipo y la raza, minimizando estrés, lesiones y transmisión de enfermedades, y facilitar el descanso y el movimiento.',
          'Preveé el riesgo de estrés térmico (calor o frío) y medidas para minimizarlo.',
          'Asigná superficie adecuada por raza, edad y estado fisiológico; buen drenaje para que los animales puedan echarse y desplazarse.',
          'Las mangas deben tener iluminación homogénea, sin sombras ni contrastes de luz.',
        ],
      },
      {
        subtitulo: 'Comportamiento y manejo',
        practicas: [
          'Permití el agrupamiento social y las interacciones positivas; evitá mezclar animales de distintas edades y características, y no los aísles innecesariamente.',
          'Conocé la zona de fuga y el punto de equilibrio; movelos calmo, sin apurarlos ni maltratarlos, con elementos que no lastimen, y limitá el uso de perros.',
          'Evitá el hacinamiento y los ruidos fuertes; los corrales de manejo son lugares de paso, no de estar (minimizá los tiempos de espera).',
          'Destetá con la metodología de menor estrés; mantené a las hembras próximas al parto bajo supervisión y en ambiente tranquilo.',
        ],
      },
      {
        subtitulo: 'Buena alimentación y buena salud',
        practicas: [
          'Acceso a comida y agua suficientes y de calidad para prevenir desórdenes metabólicos y nutricionales; considerá un período de acostumbramiento ante cambios de dieta.',
          'El ganado de mayor riesgo (recién ingresado, con antecedentes, confinado) requiere inspección más frecuente.',
          'Usá técnicas indoloras cuando sea posible; los procedimientos invasivos (descorne, castración) con técnicas humanitarias, higiene y el menor dolor, por personal capacitado.',
          'Los animales enfermos o con impedimentos deben tener trato especial, acceso a agua y alimento sin restricción, y tratamiento pronto; si no hay recuperación, eutanasia humanitaria.',
        ],
      },
    ],
  },
]

export function temaPorSlug(slug: string): BpgTema | undefined {
  return BPG_TEMAS.find((t) => t.slug === slug)
}

export function temasPorBloque(bloque: string): BpgTema[] {
  return BPG_TEMAS.filter((t) => t.bloque === bloque).sort((a, b) => a.n - b.n)
}
