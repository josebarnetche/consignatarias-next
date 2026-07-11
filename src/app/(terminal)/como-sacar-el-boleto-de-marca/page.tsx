import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  HowToSchema,
  FAQPageSchema,
  SpeakableSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'

export const revalidate = 86400 // rebuild diario vía Vercel

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/como-sacar-el-boleto-de-marca`

// Página de trámite: sin serie de precio. Único dato vivo = lastUpdate (sello de frescura).
const lastUpdate = marketPrices.lastUpdate

// PASOS — alimenta HowToSchema + el <ol> visible (fuente única).
const PASOS = [
  {
    name: 'Verificar el registro de marcas y señales de la provincia',
    text: 'El boleto de marca es un trámite provincial: cada provincia tiene su propio organismo (Registro de Marcas y Señales, en general dentro del Ministerio de la Producción o Asuntos Agrarios). El primer paso es identificar el registro de la jurisdicción donde está el establecimiento y consultar sus requisitos, formularios y aranceles vigentes.',
  },
  {
    name: 'Elegir un diseño de marca disponible',
    text: 'La marca a fuego es un diseño único e irrepetible dentro de la provincia. El titular propone un diseño y el registro verifica que no esté ya asignado a otro productor; si está duplicado, debe elegirse otro. La señal en la oreja sigue la misma lógica de unicidad para el ganado menor.',
  },
  {
    name: 'Presentar la documentación y los datos del titular',
    text: 'Se presenta la solicitud con los datos del titular (persona física o jurídica), CUIT/CUIL, domicilio y datos del establecimiento. Según la provincia puede requerirse constancia de inscripción en el RENSPA y documentación que acredite la titularidad o tenencia de la hacienda.',
  },
  {
    name: 'Abonar el arancel provincial',
    text: 'El trámite tiene un arancel que fija cada provincia y que suele variar entre alta, renovación y transferencia de marca. El pago se realiza ante el organismo provincial o su sistema de tasas; el comprobante forma parte del legajo del boleto.',
  },
  {
    name: 'Obtener el boleto y su vigencia',
    text: 'Aprobado el diseño y acreditado el pago, el registro emite el boleto de marca (o de señal) a nombre del titular, con un número de registro y un plazo de vigencia. Ese documento es el que acredita la propiedad de la hacienda marcada y habilita a comercializarla.',
  },
  {
    name: 'Renovar antes del vencimiento',
    text: 'El boleto tiene una vigencia limitada —habitualmente algunos años, según la provincia— y debe renovarse antes de vencer para no perder la titularidad del diseño. Conviene registrar la fecha de vencimiento y gestionar la renovación con anticipación ante el mismo registro provincial.',
  },
]

// TERMINOS — alimenta DefinedTermSetSchema (entidades citables con @id estable).
const TERMINOS = [
  {
    name: 'Boleto de marca',
    description:
      'Documento provincial que acredita la propiedad del ganado mayor (bovinos, equinos) mediante una marca a fuego registrada a nombre de un titular. Es requisito para tener y comercializar hacienda, y se tramita ante el registro de marcas y señales de cada provincia.',
    url: PAGE_URL,
  },
  {
    name: 'Marca a fuego',
    description:
      'Diseño único e irrepetible dentro de la provincia que se aplica a fuego sobre el cuero del animal para identificar a su propietario. Es el sistema tradicional de identificación de propiedad del ganado mayor y da origen al boleto de marca.',
    url: PAGE_URL,
  },
  {
    name: 'Señal',
    description:
      'Corte o marca practicada en la oreja del animal para acreditar la propiedad del ganado menor (ovinos, caprinos, porcinos). Cumple para el ganado menor la misma función que la marca a fuego para el ganado mayor y también se registra ante el organismo provincial.',
    url: PAGE_URL,
  },
  {
    name: 'Registro de marcas y señales',
    description:
      'Organismo provincial que asigna, registra y controla las marcas y señales de cada jurisdicción. Verifica que cada diseño sea único, emite el boleto a nombre del titular y gestiona altas, renovaciones, transferencias y bajas. Cada provincia tiene el suyo.',
    url: PAGE_URL,
  },
  {
    name: 'Ganado mayor / ganado menor',
    description:
      'Clasificación de la hacienda según su porte. El ganado mayor (bovinos, equinos) se identifica con marca a fuego y boleto de marca; el ganado menor (ovinos, caprinos, porcinos) se identifica con señal en la oreja. Cada uno tiene su modalidad de registro provincial.',
    url: PAGE_URL,
  },
]

// FAQ — answer-first. Mismo array en schema y en el <dl>.
const FAQ = [
  {
    question: '¿Cómo saco el boleto de marca?',
    answer:
      'El boleto de marca se saca ante el registro de marcas y señales de la provincia donde está el establecimiento. En resumen: se verifica el organismo provincial correspondiente, se elige un diseño de marca disponible (no duplicado), se presenta la documentación y los datos del titular con CUIT, se abona el arancel provincial y el registro emite el boleto con su número y vigencia. Esta página es informativa; el trámite se realiza ante el registro provincial correspondiente.',
  },
  {
    question: '¿Es obligatorio tener boleto de marca?',
    answer:
      'Sí. La marca a fuego registrada mediante boleto de marca es el instrumento que acredita la propiedad del ganado mayor y es requisito para tener y comercializar hacienda. Sin boleto vigente el productor no puede probar la titularidad de los animales ni completar operaciones de venta, que además exigen la documentación sanitaria (RENSPA, DT-e, guía) correspondiente.',
  },
  {
    question: '¿Cada cuánto se renueva el boleto de marca?',
    answer:
      'La vigencia y el plazo de renovación los fija cada provincia; habitualmente el boleto dura algunos años y debe renovarse antes de su vencimiento para conservar la titularidad del diseño. Conviene consultar la fecha exacta en el registro provincial y gestionar la renovación con anticipación, ya que el plazo varía según la jurisdicción.',
  },
  {
    question: '¿Marca y señal son lo mismo?',
    answer:
      'No. La marca a fuego identifica al ganado mayor (bovinos, equinos) y da origen al boleto de marca; la señal es un corte en la oreja que identifica al ganado menor (ovinos, caprinos, porcinos). Cumplen la misma función —acreditar la propiedad— pero sobre distintas especies, y cada una se registra ante el organismo provincial correspondiente.',
  },
]

export const metadata: Metadata = {
  title: `Cómo sacar el boleto de marca (marca y señal de ganado) — trámite ${lastUpdate.slice(0, 4)}`,
  description:
    'El boleto de marca es el documento provincial que acredita la propiedad del ganado mayor mediante una marca a fuego registrada. Paso a paso del trámite, renovación y diferencia con la señal, con derivación al registro de marcas y señales de cada provincia.',
  keywords: [
    'como sacar el boleto de marca',
    'registro de marca de ganado',
    'boleto de marca y señal',
    'marca a fuego hacienda',
    'que es el boleto de marca',
    'como registrar la marca del ganado',
    'registro de marcas y señales provincia',
    'renovar boleto de marca',
    'marca y señal ganado mayor menor',
    'tramite boleto de marca hacienda',
  ],
  openGraph: {
    title: 'Cómo sacar el boleto de marca (marca y señal de ganado)',
    description:
      'Documento provincial que acredita la propiedad del ganado mayor mediante marca a fuego registrada. Paso a paso del trámite, vigencia y renovación ante el registro provincial.',
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function ComoSacarElBoletoDeMarcaPage() {
  return (
    <>
      <SectionBreadcrumbSchema
        section="como-sacar-el-boleto-de-marca"
        sectionName="Boleto de marca"
      />
      <DefinedTermSetSchema
        name="Glosario del boleto de marca y señal"
        description="Términos del registro de marca del ganado en Argentina: boleto de marca, marca a fuego, señal, registro de marcas y señales, y ganado mayor / ganado menor."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <HowToSchema
        name="Cómo sacar el boleto de marca, paso a paso"
        description="Del registro provincial a la renovación: los seis pasos para sacar el boleto de marca (marca a fuego) del ganado en Argentina."
        steps={PASOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Cómo sacar el boleto de marca (marca y señal de ganado)"
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/glosario" className="hover:text-accent transition-colors">
            Glosario
          </Link>{' '}
          / Boleto de marca
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Cómo sacar el boleto de marca (marca y señal de ganado)
        </h1>

        {/* Answer-first: primera oración autocontenida y citable */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          El <strong>boleto de marca</strong> es el documento provincial que acredita la propiedad
          del <strong>ganado mayor</strong> mediante una <strong>marca a fuego registrada</strong>,
          y se saca ante el <strong>registro de marcas y señales</strong> de la provincia donde está
          el establecimiento. Esta página es informativa; el trámite se realiza ante el registro
          provincial correspondiente.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Qué es el boleto de marca (y la señal)
        </h2>
        <p className="mb-4">
          El boleto de marca es el instrumento que prueba de quién es la hacienda. Registra una{' '}
          <strong>marca a fuego</strong> —un diseño único e irrepetible dentro de la provincia— a
          nombre de un titular, y es requisito para tener y comercializar ganado mayor (bovinos,
          equinos). Para el <strong>ganado menor</strong> (ovinos, caprinos, porcinos) la propiedad
          se acredita con la <strong>señal</strong>, un corte registrado en la oreja del animal. En
          ambos casos el diseño es exclusivo y lo asigna el organismo provincial.
        </p>

        <h2 className="text-zinc-200 text-lg font-medium mb-2">
          Marca a fuego vs señal en la oreja
        </h2>
        <p className="mb-2">
          Marca y señal cumplen la misma función —acreditar la propiedad— pero sobre distintas
          especies y con distinta técnica:
        </p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-data border border-terminal-border">
            <thead>
              <tr className="bg-terminal-panel/60 text-zinc-400 text-xxs uppercase tracking-wider">
                <th className="text-left px-3 py-2 border-b border-terminal-border">Instrumento</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Especie</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Técnica</th>
                <th className="text-left px-3 py-2 border-b border-terminal-border">Documento</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-terminal-border/60 align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Marca a fuego</td>
                <td className="px-3 py-2 text-zinc-400">Ganado mayor (bovinos, equinos)</td>
                <td className="px-3 py-2 text-zinc-400">Diseño a fuego sobre el cuero</td>
                <td className="px-3 py-2 text-zinc-300">Boleto de marca</td>
              </tr>
              <tr className="align-top">
                <td className="px-3 py-2 text-zinc-200 font-medium">Señal</td>
                <td className="px-3 py-2 text-zinc-400">Ganado menor (ovinos, caprinos, porcinos)</td>
                <td className="px-3 py-2 text-zinc-400">Corte en la oreja</td>
                <td className="px-3 py-2 text-zinc-300">Boleto de señal</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Paso a paso del trámite</h2>
        <ol className="mb-4 space-y-3 list-none">
          {PASOS.map((p, i) => (
            <li key={p.name} className="border-l-2 border-terminal-border pl-3">
              <span className="text-accent text-xxs font-terminal uppercase tracking-wider">
                Paso {i + 1}
              </span>
              <p className="text-zinc-200 font-medium">{p.name}</p>
              <p className="text-zinc-400">{p.text}</p>
            </li>
          ))}
        </ol>
        <p className="text-xxs text-zinc-500 mb-4">
          Los pasos son una guía general: los requisitos, formularios y aranceles concretos los
          define cada provincia. El trámite oficial se realiza siempre ante el registro de marcas y
          señales de la jurisdicción correspondiente. Esta página es informativa y no gestiona el
          trámite.
        </p>

        <h2 className="text-zinc-200 text-lg font-medium mb-2">Renovación y vigencia</h2>
        <p className="mb-4">
          El boleto de marca no es perpetuo: tiene una <strong>vigencia limitada</strong> —en
          general algunos años, según la provincia— y debe renovarse antes de vencer para conservar
          la titularidad del diseño. Si el boleto vence sin renovarse, la marca puede quedar
          disponible para otro productor. Conviene anotar la fecha de vencimiento y gestionar la
          renovación con anticipación ante el mismo registro provincial; el plazo exacto y el
          arancel de renovación varían por jurisdicción.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Vínculo con RENSPA, DT-e y guía
        </h2>
        <p className="mb-4">
          El boleto de marca acredita la <strong>propiedad</strong> de la hacienda, pero no reemplaza
          la documentación <strong>sanitaria</strong> y de <strong>traslado</strong>. Para operar,
          el establecimiento debe estar inscripto en el{' '}
          <Link href="/que-es-el-renspa" className="text-accent hover:text-accent-bright transition-colors">
            RENSPA
          </Link>{' '}
          de{' '}
          <Link href="/que-es-senasa" className="text-accent hover:text-accent-bright transition-colors">
            SENASA
          </Link>
          , y cada movimiento de hacienda se ampara con el{' '}
          <Link href="/que-es-el-dte" className="text-accent hover:text-accent-bright transition-colors">
            DT-e
          </Link>{' '}
          y la{' '}
          <Link href="/que-es-la-guia-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
            guía de hacienda
          </Link>
          . Marca, RENSPA y DT-e son piezas distintas y complementarias: la primera es provincial y
          prueba de quién es el animal; las otras son nacionales y habilitan tenencia y traslado.
        </p>

        {/* FAQ visible — mismo array que el schema */}
        <h2 className="text-zinc-100 text-lg font-medium mb-2">Preguntas frecuentes</h2>
        <dl className="mb-6 space-y-3">
          {FAQ.map((f) => (
            <div key={f.question} className="border-l-2 border-terminal-border pl-3">
              <dt className="text-zinc-200 font-medium mb-1">{f.question}</dt>
              <dd className="text-zinc-400">{f.answer}</dd>
            </div>
          ))}
        </dl>

        {/* Enlazado interno denso a páginas hermanas */}
        <div className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 space-y-2">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            Seguir por acá
          </p>
          <p className="text-data text-zinc-300 flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/que-es-el-renspa" className="text-accent hover:text-accent-bright transition-colors">
              Qué es el RENSPA →
            </Link>
            <Link href="/que-es-el-dte" className="text-accent hover:text-accent-bright transition-colors">
              Qué es el DT-e →
            </Link>
            <Link href="/que-es-la-guia-de-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Qué es la guía de hacienda →
            </Link>
            <Link href="/que-es-senasa" className="text-accent hover:text-accent-bright transition-colors">
              Qué es SENASA →
            </Link>
          </p>
          <p className="text-data text-zinc-300 pt-1">
            <Link href="/vender-hacienda-guia" className="text-accent hover:text-accent-bright transition-colors">
              Guía para vender hacienda →
            </Link>{' '}
            ·{' '}
            <Link href="/como-vender-hacienda" className="text-accent hover:text-accent-bright transition-colors">
              Cómo vender hacienda →
            </Link>
          </p>
        </div>

        <footer className="mt-6 pt-4 border-t border-terminal-border text-xxs text-zinc-500">
          <p>
            El boleto de marca es un trámite provincial: los precios y comisiones que se mencionan en
            el sitio son referencia del mercado y esta página no fija precios ni tarifas. El trámite
            se realiza ante el registro de marcas y señales de la provincia correspondiente.
          </p>
          <p className="mt-1">Actualizado: {lastUpdate} · Memola Medios S.A.S.</p>
        </footer>
      </article>
    </>
  )
}
