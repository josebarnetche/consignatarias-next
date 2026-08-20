import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, HowToSchema, FAQPageSchema } from '@/components/seo/JsonLd'
import { getGuiaPremium, formatArs } from '@/lib/guias-premium'
import { ComprarGuia } from './ComprarGuia'

const APP_URL = 'https://www.consignatarias.com.ar'
const GUIA = getGuiaPremium('abrir-una-consignataria')!

export const metadata: Metadata = {
  title: 'Cómo Abrir una Consignataria de Hacienda — Guía 2026 Actualizada',
  description:
    'Qué hace falta para abrir una consignataria de hacienda: matrícula de martillero, inscripción en SIOCAL (ex RUCA), ARCA, habilitación SENASA del local de remate feria, capital de trabajo y clientela. El paso a paso, actualizado a 2026.',
  keywords: [
    'cómo abrir una consignataria', 'abrir consignataria de hacienda', 'poner una consignataria',
    'requisitos consignataria de hacienda', 'SIOCAL consignatario', 'RUCA consignatario de ganado',
    'matrícula martillero hacienda', 'habilitar local de remate feria',
  ],
  openGraph: {
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    title: 'Cómo Abrir una Consignataria de Hacienda — Guía 2026 Actualizada',
    description:
      'Matrícula, SIOCAL, ARCA, SENASA, capital y clientela: los seis frentes que hay que resolver para abrir una consignataria.',
    url: `${APP_URL}${GUIA.landing}`,
    type: 'article',
  },
  alternates: { canonical: `${APP_URL}${GUIA.landing}` },
}

export const revalidate = false

/** Los seis frentes. Es el esqueleto gratis: el detalle operativo está en el PDF. */
const FRENTES = [
  {
    name: 'La persona: matrícula de martillero y corredor público',
    text: 'El remate lo hace una persona matriculada, no una sociedad. Título universitario de Martillero y Corredor Público (Ley 20.266 con la reforma de la Ley 25.028), inscripción en el colegio departamental del domicilio, antecedentes penales, informes de libre inhibición, juicios universales y la fianza que exige el art. 3 inc. d) del Decreto-Ley 20.266/73. Los juramentos se toman en fechas fijas del año: si te perdés una, esperás meses.',
  },
  {
    name: 'La sociedad: figura jurídica y ARCA',
    text: 'SAS, SRL o unipersonal, con el código de actividad que corresponda, IVA responsable inscripto, Ganancias, Ingresos Brutos y Convenio Multilateral si operás en más de una provincia. Sin la inscripción vigente en ARCA con el código correcto, la inscripción nacional se cae: es requisito expreso del punto 1.5.5 del Anexo I de la Resolución SAGyP 50/2025.',
  },
  {
    name: 'El registro nacional: SIOCAL (ex RUCA)',
    text: 'Desde abril de 2025 el RUCA dejó de existir para ganados y carnes: la Resolución SAGyP 50/2025 creó el SIOCAL. La inscripción como Consignatario y/o Comisionista de Ganados es obligatoria para operar, se hace en línea con Clave Fiscal nivel 3, es gratuita y no vence mientras se mantengan los requisitos. Si te observan la solicitud, tenés 10 días hábiles para subsanar o se archiva.',
  },
  {
    name: 'La sanidad: SENASA y el local de remate feria',
    text: 'Si vas a concentrar hacienda —remate feria, predio ferial, mercado— el predio tiene que estar habilitado por SENASA bajo la Resolución 924/2020: cerco perimetral, manga, embarcadero con pendiente máxima, corral lazareto, bebederos, plano del predio. La habilitación dura dos años y cada remate se avisa a la oficina local con 48 horas de anticipación.',
  },
  {
    name: 'La plata: capital de trabajo y garantías',
    text: 'La consignataria no vive de la comisión: vive del calce entre lo que le cobra al comprador y lo que le paga al productor. Ese descalce es el negocio y es el riesgo. Hay que dimensionar cuánto capital inmoviliza cada remate, qué pasa si un comprador no paga, y cómo se cubre el descubierto sin comerse el margen.',
  },
  {
    name: 'La clientela: de dónde salen los primeros consignantes',
    text: 'Todo lo anterior es papelerío que se resuelve con plata y tiempo. Lo que decide si la consignataria existe en tres años es si consigue hacienda para vender. Ahí entra el plan de marketing digital: qué se publica, dónde aparece la firma cuando un productor busca, y cómo se convierte una consulta en una consignación.',
  },
]

const INDICE = [
  { parte: 'Parte I — El terreno', items: ['Qué es y qué no es una consignataria', 'Los cuatro modelos de negocio (feria, directo, invernada, cabaña) y cuál conviene según tu zona', 'Cómo se forma la comisión y qué queda de neto'] },
  { parte: 'Parte II — Habilitarse', items: ['Matrícula de martillero: título, colegio, fianza, juramento (con costos y plazos reales)', 'La figura societaria: SAS vs SRL vs unipersonal, cuadro comparado', 'ARCA paso a paso: alta, códigos de actividad, IVA, Ganancias, IIBB y Convenio Multilateral', 'SIOCAL: cada pantalla del trámite, la documentación exacta y los errores que hacen que te lo archiven', 'Registro Fiscal de Operadores de Hacienda y Carnes (RG 3873): por qué estar afuera te cuesta plata en cada operación', 'SENASA: habilitación del predio bajo Res. 924/2020, plano, infraestructura y el aviso de 48 horas'] },
  { parte: 'Parte III — Operar', items: ['El circuito completo de un remate feria, día por día', 'DT-e, RENSPA y guías: quién es responsable de qué', 'La liquidación al productor, renglón por renglón', 'Cobranza, plazos y el descalce financiero explicado con números', 'Los seis modos de perder plata en una consignataria (y cómo se tapan)'] },
  { parte: 'Parte IV — Conseguir hacienda', items: ['El plan de marketing digital, según cómo lo arma Memola', 'Qué publicar cada semana y quién lo produce', 'La ficha del remate: el formato que se comparte solo', 'WhatsApp como CRM: el circuito de la consulta a la consignación', 'Presupuesto de marketing para el año uno, en tres escenarios'] },
  { parte: 'Parte V — Para la que ya existe', items: ['Auditoría de posicionamiento: las seis preguntas que ordenan una firma con años de historia', 'Las escaleras mentales del productor y en cuál estás', 'Cómo se encuentra el créneau que nadie ocupa en tu zona', 'El concepto único: una palabra que la firma pueda poseer', 'Cómo se reposiciona al líder de tu plaza sin pelearle de frente', 'Plantillas para completar con tu propia firma'] },
]

const FAQS = [
  {
    question: '¿Hace falta ser martillero para abrir una consignataria de hacienda?',
    answer:
      'Para rematar, sí: el acto de remate lo realiza una persona con matrícula de martillero y corredor público habilitada en la jurisdicción. La sociedad puede ser de terceros, pero necesita al menos un martillero matriculado que firme los remates. Para operar solo como consignatario o comisionista sin remate público, la exigencia central es la inscripción en el SIOCAL.',
  },
  {
    question: '¿El RUCA sigue existiendo en 2026?',
    answer:
      'No para ganados y carnes. La Resolución SAGyP 50/2025 (abril de 2025) reemplazó el RUCA por el SIOCAL —Sistema de Información de Operadores de Carnes y Lácteos— para los rubros ganados, carnes y lácteos, y por el SISA para granos. Las inscripciones vigentes se migraron sin trámite. Buena parte del material que circula en internet todavía explica el sistema viejo.',
  },
  {
    question: '¿Cuánto cuesta inscribirse en el SIOCAL?',
    answer:
      'La inscripción no tiene arancel y no vence mientras se mantengan vigentes los requisitos que la otorgaron. El costo real del trámite es la documentación: certificaciones notariales del estatuto y del acta de designación de autoridades, y la documentación del establecimiento.',
  },
  {
    question: '¿Cuánto capital hace falta para arrancar?',
    answer:
      'Depende del modelo. Un consignatario que opera sobre plaza ajena arranca con costos fijos bajos; un remate feria propio exige predio habilitado, personal y capital para sostener el descalce entre cobranza y pago. La guía trae la estructura de costos abierta y tres escenarios de capital de trabajo con los números del mercado de hoy.',
  },
  {
    question: '¿Emiten factura A?',
    answer:
      'Sí. La factura A la emite Memola Medios SAS (CUIT 30-71863222-2), que opera consignatarias.com.ar. Al comprar podés cargar razón social y CUIT en el mismo paso, y la factura sale contra esos datos. Si te olvidaste, respondé el mail de entrega con los datos y se emite igual.',
  },
  {
    question: '¿Qué pasa cuando cambie la normativa?',
    answer:
      'La guía tiene edición y fecha en la tapa. Cuando salga una edición nueva, quien compró baja la versión actualizada desde el mismo link de su cuenta, sin volver a pagar: el acceso está atado a tu email, no a un archivo.',
  },
  {
    question: '¿La guía sirve si mi consignataria ya está funcionando?',
    answer:
      'La Parte V está escrita para eso: es una auditoría de posicionamiento y un método para definir el concepto único de una firma que ya opera. Sirve para ordenar la comunicación de una casa con décadas de historia que hoy compite por precio contra su vecina.',
  },
]

export default function ComoAbrirUnaConsignatariaPage() {
  const totalItems = INDICE.reduce((n, p) => n + p.items.length, 0)

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <SectionBreadcrumbSchema section="guias" sectionName="Guías" />
      <HowToSchema
        name="Cómo abrir una consignataria de hacienda en Argentina"
        description="Los seis frentes que hay que resolver para poner en marcha una consignataria de hacienda: matrícula, sociedad, SIOCAL, SENASA, capital y clientela."
        steps={FRENTES}
      />
      <FAQPageSchema items={FAQS} />

      <header className="mb-8">
        <div className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-2">
          Guías / Abrir una consignataria
        </div>
        <div className="inline-flex items-center gap-2 border border-accent/40 text-accent text-xxs font-terminal uppercase tracking-wider px-2.5 py-1 rounded mb-3">
          <span>Edición {GUIA.edicion}</span>
          <span className="text-zinc-600">·</span>
          <span>actualizada al {GUIA.updatedAt}</span>
        </div>
        <h1 className="text-2xl font-heading text-zinc-100 mb-3">
          Cómo abrir una consignataria de hacienda en Argentina
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">
          Hay 107 consignatarias con actividad relevada en el país. Ninguna
          publicó nunca cómo se abre una. Abajo está el mapa completo, gratis: los
          seis frentes que hay que resolver, con la normativa que rige hoy. El
          paso a paso con las pantallas de cada trámite, los números y el plan
          para conseguir los primeros consignantes está en la guía paga.
        </p>
      </header>

      {/* Lo que cambió: es la razón de que exista una edición 2026 */}
      <div className="terminal-panel border-warning/40 mb-8">
        <div className="terminal-panel-header text-warning">Por qué dice 2026</div>
        <p className="px-4 py-3 text-sm text-zinc-300 leading-relaxed">
          {GUIA.actualizacion} La mayoría del material que circula —apuntes, notas,
          instructivos— sigue explicando el registro viejo. Esta edición cita el Anexo I
          punto por punto, con la documentación exacta y los plazos que hoy rigen.
        </p>
      </div>

      {/* Los seis frentes — el valor gratis */}
      <section className="mb-10">
        <h2 className="text-lg font-heading text-zinc-100 mb-4">Los seis frentes</h2>
        <ol className="space-y-4">
          {FRENTES.map((f, i) => (
            <li key={f.name} className="terminal-panel">
              <div className="terminal-panel-header flex items-center gap-2">
                <span className="text-accent tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <span>{f.name}</span>
              </div>
              <p className="px-4 py-3 text-sm text-zinc-400 leading-relaxed">{f.text}</p>
            </li>
          ))}
        </ol>
        <p className="text-zinc-500 text-xs mt-4 leading-relaxed">
          Normativa citada: Ley 20.266 y Ley 25.028 (martilleros y corredores);
          Resolución SAGyP 50/2025 (SIOCAL, reemplaza al RUCA); Resolución SENASA
          924/2020 (habilitación de predios de concentración); RG AFIP 3873/2016
          (Registro Fiscal de Operadores de Hacienda y Carnes); arts. 1.335 y ss.
          del Código Civil y Comercial (consignación).
        </p>
      </section>

      {/* La oferta */}
      <section id="comprar" className="mb-10 scroll-mt-20">
        <div className="terminal-panel border-accent/40">
          <div className="terminal-panel-header text-accent">
            La guía completa — edición {GUIA.edicion} — {formatArs(GUIA.priceArs)}
          </div>
          <div className="px-4 py-5 grid md:grid-cols-[1fr_300px] gap-6">
            <div>
              <h2 className="text-lg font-heading text-zinc-100 mb-2">{GUIA.title}</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">{GUIA.tagline}</p>
              <ul className="text-sm text-zinc-300 space-y-2 mb-4">
                <li>· {totalItems} capítulos en cinco partes, con capturas de cada trámite.</li>
                <li>· La normativa vigente citada por artículo, no “consultá a tu contador”.</li>
                <li>· Estructura de costos y capital de trabajo con números del mercado de hoy.</li>
                <li>· Plan de marketing digital completo, con presupuesto anual en tres escenarios.</li>
                <li>· Módulo de posicionamiento para consignatarias que ya operan.</li>
                <li>· Actualizada a {GUIA.updatedAt}: SIOCAL, no RUCA.</li>
                <li>· <strong className="text-zinc-100">Factura A</strong> si la necesitás, emitida por Memola Medios SAS.</li>
              </ul>
              <p className="text-zinc-500 text-xs">
                PDF de {GUIA.pages} páginas · edición {GUIA.edicion} · versión {GUIA.version} ·
                pago único, sin suscripción.
              </p>
            </div>
            <div className="md:border-l md:border-terminal-border md:pl-6">
              <ComprarGuia slug={GUIA.slug} priceLabel={formatArs(GUIA.priceArs)} />
            </div>
          </div>
        </div>
      </section>

      {/* Índice */}
      <section className="mb-10">
        <h2 className="text-lg font-heading text-zinc-100 mb-4">Qué hay adentro</h2>
        <div className="space-y-4">
          {INDICE.map((p) => (
            <div key={p.parte} className="terminal-panel">
              <div className="terminal-panel-header">{p.parte}</div>
              <ul className="px-4 py-3 space-y-1.5">
                {p.items.map((it) => (
                  <li key={it} className="text-sm text-zinc-400 leading-relaxed">
                    · {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-10">
        <h2 className="text-lg font-heading text-zinc-100 mb-4">Preguntas frecuentes</h2>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <div key={f.question} className="terminal-panel">
              <div className="terminal-panel-header">{f.question}</div>
              <p className="px-4 py-3 text-sm text-zinc-400 leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="text-sm text-zinc-400">
        <h2 className="text-lg font-heading text-zinc-100 mb-3">Seguir leyendo</h2>
        <ul className="space-y-1.5">
          <li>
            <Link href="/que-es-una-consignataria" className="text-accent hover:underline">
              Qué es una consignataria de hacienda
            </Link>
          </li>
          <li>
            <Link href="/cuanto-cobra-de-comision-una-consignataria" className="text-accent hover:underline">
              Cuánto cobra de comisión una consignataria
            </Link>
          </li>
          <li>
            <Link href="/como-funciona-un-remate-ganadero" className="text-accent hover:underline">
              Cómo funciona un remate ganadero
            </Link>
          </li>
          <li>
            <Link href="/consignatarias" className="text-accent hover:underline">
              El directorio: las 107 consignatarias con actividad relevada
            </Link>
          </li>
        </ul>
      </section>
    </div>
  )
}
