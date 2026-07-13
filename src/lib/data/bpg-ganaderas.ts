/**
 * Buenas Prácticas Ganaderas (BPG) para la producción de vacunos de carne.
 * Resumen y estructura basados en la "Guía de Buenas Prácticas Ganaderas" de la
 * Red BPA (Red de Buenas Prácticas Agropecuarias), Comisión de Ganadería, 2019 (v1),
 * con respaldo de SENASA, INTA, IPCVA, SRA, CRA, CONINAGRO, FAA y otras entidades.
 *
 * Contenido RESUMIDO y reescrito con atribución — no es la reproducción textual de
 * la guía. La fuente completa se enlaza en BPG_FUENTE.
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

export interface BpgTema {
  n: number
  titulo: string
  resumen: string
}

export interface BpgBloque {
  bloque: string
  temas: BpgTema[]
}

export const BPG_BLOQUES: BpgBloque[] = [
  {
    bloque: 'Las personas y la empresa',
    temas: [
      { n: 1, titulo: 'Organización de la empresa', resumen: 'Objetivos, planificación de la gestión y registros que ordenan la actividad y permiten mejorar.' },
      { n: 2, titulo: 'Personal', resumen: 'Condiciones laborales dignas, capacitación continua y seguridad e higiene del trabajo.' },
    ],
  },
  {
    bloque: 'La infraestructura de producción',
    temas: [
      { n: 3, titulo: 'Establecimiento ganadero', resumen: 'Ubicación, delimitación y registros del predio (incluye el RENSPA como base sanitaria).' },
      { n: 4, titulo: 'Instalaciones, equipos y herramientas', resumen: 'Diseño, mantenimiento y limpieza de mangas, corrales, aguadas y equipos, pensados para un manejo con bajo estrés.' },
    ],
  },
  {
    bloque: 'El ambiente y la producción',
    temas: [
      { n: 5, titulo: 'Suelo', resumen: 'Manejo que conserva el suelo y evita la erosión y la degradación.' },
      { n: 6, titulo: 'Agua', resumen: 'Calidad y disponibilidad de agua para el ganado; análisis periódicos.' },
      { n: 7, titulo: 'Forrajes', resumen: 'Producción y conservación de pasturas, verdeos y reservas (fardos, rollos, silos) manteniendo su valor nutricional e inocuidad.' },
      { n: 8, titulo: 'Gestión de estiércol y efluentes', resumen: 'Manejo del estiércol y los efluentes para evitar la contaminación del ambiente.' },
      { n: 9, titulo: 'Gestión de los residuos', resumen: 'Clasificación y disposición segura de residuos (envases de veterinarios y agroquímicos, plásticos, cortopunzantes).' },
      { n: 10, titulo: 'Adaptación y mitigación al cambio climático', resumen: 'Medidas frente a eventos climáticos extremos y para reducir el impacto de la producción.' },
    ],
  },
  {
    bloque: 'El animal y su manejo',
    temas: [
      { n: 11, titulo: 'Manejo de rodeo', resumen: 'Identificación, registros, servicio, destete y manejo por categorías para ordenar la producción.' },
      { n: 12, titulo: 'Alimentación', resumen: 'Dieta y agua suficientes y de calidad; espacio de comedero, lectura de comederos, controles de calidad y almacenamiento inocuo del alimento.' },
      { n: 13, titulo: 'Salud animal', resumen: 'Plan sanitario con veterinario, prevención, bioseguridad, manejo de medicamentos con período de carencia y manejo integrado de plagas.' },
      { n: 14, titulo: 'Bienestar animal', resumen: 'Producir con mínimo estrés, dolor y temor: manejo calmo, buen alojamiento, procedimientos humanitarios y plan de emergencia.' },
    ],
  },
]

// Prácticas clave destacadas (Salud y Bienestar) — resumidas de los capítulos 13 y 14.
export interface BpgDestacado {
  tema: string
  practicas: string[]
}

export const BPG_DESTACADOS: BpgDestacado[] = [
  {
    tema: 'Salud animal',
    practicas: [
      'Tener un plan sanitario elaborado por un veterinario (prevención, control y erradicación), disponible y de fácil acceso, con un cronograma de revisión por unidad de manejo.',
      'Registrar cada tratamiento: fecha, animal o tropa, producto usado y su período de carencia; y las visitas del veterinario con diagnósticos y recomendaciones.',
      'Bioseguridad: desalentar el ingreso de animales de sanidad desconocida o menor estatus, poner en cuarentena a los recién llegados, y usar semen, óvulos y embriones de fuentes acreditadas.',
      'Aislar e identificar a los animales enfermos o en tratamiento; ante muerte, identificar la causa y, si es enfermedad de denuncia obligatoria, comunicar a la autoridad sanitaria.',
      'Manejo de medicamentos: solo productos aprobados y bajo prescripción, con cadena de frío, regla PEPS (primero entra, primero sale) y respeto del período de carencia antes de vender o faenar.',
      'Uso prudente de antimicrobianos: administrarlos solo con diagnóstico y respetando dosis, intervalos y duración, para no generar resistencia.',
      'Manejo integrado de plagas (insectos, roedores) con identificación de zonas de riesgo y registro de productos y técnicas.',
    ],
  },
  {
    tema: 'Bienestar animal',
    practicas: [
      'Producir con el mínimo estrés, dolor y temor; capacitar al personal en comportamiento bovino y en los signos de enfermedad y de falta de bienestar.',
      'Manejo calmo: conocer la zona de fuga y el punto de equilibrio, mover a los animales sin gritos ni golpes, limitar el uso de perros y minimizar ruidos fuertes.',
      'Los corrales de manejo son lugares de paso, no de estar: minimizar los tiempos de espera y evitar el hacinamiento.',
      'Destetar con la metodología de menor estrés; mantener a las hembras próximas al parto bajo supervisión y en un ambiente tranquilo.',
      'Buen alojamiento: superficie adecuada por categoría, buen drenaje y mangas con iluminación homogénea, sin sombras ni contrastes que frenen el avance.',
      'Procedimientos invasivos (descorne, castración) con técnicas humanitarias, higiene y el menor dolor posible; usar técnicas indoloras cuando sea factible.',
      'Contar con un plan de emergencia (cortes de luz, agua o alimento; clima extremo) y un protocolo de sacrificio y eutanasia humanitaria.',
    ],
  },
]
