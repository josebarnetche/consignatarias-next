import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  FAQPageSchema,
  SpeakableSchema,
  HowToSchema,
  DatasetSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'

export const revalidate = 86400 // daily rebuild via Vercel

const PAGE_URL = 'https://www.consignatarias.com.ar/como-se-calcula-el-canon-de-arrendamiento'

// Números vivos interpolados en build. El índice sugerido para arrendamientos rurales
// lo publica el Mercado Agroganadero (serie haciinfo000013), fechado a su última corrida.
const arr = marketPrices.arrendamientoOficial
const novillo = Math.round(marketPrices.categories.novillos.current)
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')
const arrIndexR = Math.round(arr.index)

// Ejemplo numérico reproducible: campo agrícola, 200 kg novillo/ha/año, 100 ha.
const EJ_KG_HA = 200
const EJ_HA = 100
const ejKgTotal = EJ_KG_HA * EJ_HA // 20.000 kg
const ejValor = ejKgTotal * arr.index

// HowTo — el cálculo en 4 pasos, mismo array para el schema y el bloque visible.
const PASOS = [
  {
    name: 'Acordar los kilos de novillo por hectárea',
    text: 'Las partes pactan cuántos kilos de novillo por hectárea y por año paga el arrendatario. El valor depende de la aptitud del campo: un lote agrícola de primera paga más kg/ha que un campo de invernada o de cría.',
  },
  {
    name: 'Multiplicar por la superficie',
    text: 'Se multiplican los kg de novillo por hectárea por la cantidad de hectáreas arrendadas para obtener el total de kilos de novillo del contrato por año.',
  },
  {
    name: 'Tomar el precio del novillo de referencia a la fecha de pago',
    text: `Se toma el índice o precio del kilo de novillo de referencia vigente a la fecha de cada pago —el índice sugerido para arrendamientos del Mercado Agroganadero, hoy $${fmt(arr.index)}/kg (${arr.date})—, para que el canon siga al valor real de la hacienda.`,
  },
  {
    name: 'Multiplicar kilos totales por el precio del kilo',
    text: `Se multiplican los kilos totales de novillo por el precio en pesos del kilo. Ejemplo: ${fmt(ejKgTotal)} kg × $${fmt(arr.index)} = $${fmt(ejValor)} por año.`,
  },
]

// Preguntas reales que se tipean en Google / se le preguntan a la IA. Cada respuesta
// arranca con el dato (answer-first) e interpola el número vivo fechado.
const FAQ = [
  {
    question: '¿Cuántos kg de novillo por hectárea se pagan de arrendamiento?',
    answer:
      'Depende de la aptitud del campo y la zona. Como referencia orientativa: un campo agrícola de buena aptitud suele pactarse entre 150 y 350 kg de novillo por hectárea y por año, mientras que un campo ganadero (invernada o cría) va de 40 a 120 kg/ha. Son rangos de mercado; el valor exacto lo acuerdan las partes según la calidad del lote, el acceso, la humedad y el destino productivo.',
  },
  {
    question: '¿Cuánto es el índice de arrendamiento hoy?',
    answer: `El índice sugerido para arrendamientos rurales es de $${fmt(arr.index)} por kilo de novillo (${arr.date}), según el Mercado Agroganadero (serie haciinfo000013). Es un valor de referencia del kilo de novillo que se usa para convertir a pesos los kilos pactados en el contrato a la fecha de cada pago.`,
  },
  {
    question: '¿El canon de arrendamiento se paga por adelantado?',
    answer:
      'Habitualmente sí: en los contratos de arrendamiento agrícola es común pactar el pago por adelantado (total al inicio del ciclo o en cuotas, por ejemplo un anticipo a la firma y saldos en fechas acordadas). La forma y las fechas de pago las fijan las partes en el contrato. Cuando el canon se expresa en kilos de novillo, cada cuota se convierte a pesos con el precio del kilo vigente a la fecha de ese pago, no al de la firma.',
  },
]

// Entidades citables — definiciones canónicas del vocabulario del arrendamiento en kg de novillo.
const TERMINOS = [
  {
    name: 'Canon de arrendamiento',
    description:
      'Precio que el arrendatario paga al dueño del campo por el uso y goce de la tierra durante el plazo del contrato. En el arrendamiento rural argentino suele pactarse en kilos de novillo por hectárea y por año, y se liquida en pesos multiplicando esos kilos por el precio del kilo de novillo de referencia a la fecha de pago.',
    url: PAGE_URL,
  },
  {
    name: 'Kilos de novillo por hectárea (kg novillo/ha)',
    description:
      'Unidad de medida del canon de arrendamiento: cantidad de kilos de novillo que se paga por cada hectárea y por año. Al expresar la renta en kilos de hacienda en vez de en pesos, el contrato queda indexado al valor real del ganado y protegido de la inflación.',
  },
  {
    name: 'Índice de arrendamiento del Mercado Agroganadero',
    description: `Precio de referencia del kilo de novillo que el Mercado Agroganadero publica como índice sugerido para arrendamientos rurales (serie haciinfo000013). Al ${arr.date} es de $${fmt(arr.index)}/kg. Sirve para convertir a pesos los kilos de novillo pactados en el contrato.`,
    url: 'https://www.consignatarias.com.ar/mercado/arrendamiento',
  },
  {
    name: 'Aparcería',
    description:
      'Contrato agrario distinto del arrendamiento: en la aparcería el dueño del campo y el productor comparten los frutos o utilidades de la explotación (por ejemplo un porcentaje de la cosecha o de la producción de hacienda), en lugar de pactar un canon fijo en kilos de novillo o en pesos. El aparcero asume parte del riesgo productivo; el arrendatario paga una renta cierta.',
  },
]

export const metadata: Metadata = {
  title: `Cómo se calcula el canon de arrendamiento rural (kg de novillo) — índice $${fmt(arrIndexR)}/kg`,
  description: `El canon de arrendamiento rural se calcula multiplicando los kg de novillo por hectárea acordados × las hectáreas × el precio del kilo de novillo de referencia ($${fmt(arr.index)}/kg, ${arr.date}, Mercado Agroganadero). Fórmula, ejemplo y por qué se mide en kilos de novillo.`,
  keywords: [
    'como se calcula el canon de arrendamiento rural',
    'canon de arrendamiento en kg de novillo',
    'como se calcula el arrendamiento de un campo',
    'kilos de novillo por hectarea arrendamiento',
    'indice de arrendamiento rural',
    'cuanto se paga de arrendamiento por hectarea',
    'arrendamiento rural kg novillo',
    'formula canon arrendamiento campo',
    'quintales de soja vs kg de novillo arrendamiento',
    'precio arrendamiento campo argentina',
  ],
  openGraph: {
    title: `Cómo se calcula el canon de arrendamiento rural en kilos de novillo`,
    description: `Kg de novillo/ha × hectáreas × precio del kilo de novillo ($${fmt(arr.index)}/kg, ${arr.date}). Fórmula, ejemplo numérico y por qué se mide en hacienda y no en pesos.`,
    url: PAGE_URL,
    type: 'article',
    images: [{ url: '/og-mercado.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function ComoSeCalculaElCanonDeArrendamientoPage() {
  return (
    <>
      <SectionBreadcrumbSchema
        section="como-se-calcula-el-canon-de-arrendamiento"
        sectionName="Cómo se calcula el canon de arrendamiento"
      />
      <DefinedTermSetSchema
        name="Cómo se calcula el canon de arrendamiento rural — glosario"
        description="Definiciones del vocabulario del arrendamiento rural pactado en kilos de novillo por hectárea."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Cómo se calcula el canon de arrendamiento rural en kilos de novillo"
      />
      <HowToSchema
        name="Cómo calcular el canon de arrendamiento rural en kilos de novillo"
        description="Método para calcular el canon de arrendamiento de un campo pactado en kilos de novillo por hectárea y por año."
        steps={PASOS}
      />
      <DatasetSchema
        name="Índice de arrendamiento rural (kg novillo)"
        description={`Precio del kilo de novillo de referencia para el cálculo del canon de arrendamiento rural: $${fmt(arr.index)}/kg al ${arr.date} (índice sugerido del Mercado Agroganadero, serie haciinfo000013).`}
        url={PAGE_URL}
        keywords={['arrendamiento rural', 'kg de novillo', 'canon de arrendamiento', 'índice arrendamiento', 'Mercado Agroganadero', 'Argentina']}
        dateModified={arr.date}
        creator="Mercado Agroganadero"
      />

      <article className="px-4 pt-4 pb-8 max-w-3xl mx-auto text-zinc-300 text-sm leading-relaxed">
        <nav className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-3">
          <Link href="/mercado" className="hover:text-accent transition-colors">
            Mercado
          </Link>{' '}
          / Cómo se calcula el canon de arrendamiento
        </nav>

        <h1 className="text-zinc-100 text-2xl font-medium mb-3">
          Cómo se calcula el canon de arrendamiento rural (en kilos de novillo)
        </h1>

        {/* Answer-first: primera oración = la respuesta citable a la head-query */}
        <p className="speakable-content text-zinc-200 text-base mb-4">
          El canon de arrendamiento rural se pacta en kilos de novillo por hectárea y por año: se
          multiplica los kg/ha acordados por el precio del kilo de novillo del índice de referencia,
          que hoy (<strong>{arr.date}</strong>) es de <strong>${fmt(arrIndexR)}/kg</strong> según el
          Mercado Agroganadero (haciinfo000013).
        </p>

        <p className="mb-4">
          En fórmula: <strong>kg de novillo por hectárea × hectáreas × precio del kilo de novillo =
          canon anual en pesos</strong>. Los kilos por hectárea los acuerdan las partes según la
          aptitud del campo; el precio del kilo de novillo se toma del índice de referencia a la
          fecha de cada pago. Es un índice de referencia del mercado —esta página no fija el precio—:
          cada contrato lo acuerdan el dueño del campo y el arrendatario.
        </p>

        <div className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 mb-4">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500 mb-1">
            Ejemplo
          </p>
          <p className="text-zinc-200">
            Un campo agrícola de <strong>{EJ_KG_HA} kg de novillo/ha/año</strong> sobre{' '}
            <strong>{EJ_HA} ha</strong> = {fmt(ejKgTotal)} kg × ${fmt(arr.index)} ={' '}
            <strong>${fmt(ejValor)}</strong> por año.
          </p>
          <p className="text-xxs text-zinc-500 mt-1">
            Precio del kilo de novillo de referencia: ${fmt(arr.index)}/kg (Mercado Agroganadero,{' '}
            {arr.date}). El total varía con el índice a cada fecha de pago.
          </p>
        </div>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Cómo se calcula, paso a paso</h2>
        <ol className="list-decimal list-inside space-y-2 mb-5 marker:text-accent">
          {PASOS.map((p) => (
            <li key={p.name}>
              <span className="text-zinc-200 font-medium">{p.name}.</span>{' '}
              <span className="text-zinc-400">{p.text}</span>
            </li>
          ))}
        </ol>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">
          Por qué se mide en kilos de novillo y no en pesos
        </h2>
        <p className="mb-4">
          El canon se expresa en kilos de novillo para <strong>proteger el contrato de la
          inflación</strong>. Si la renta se pactara en pesos fijos, la inflación licuaría el valor
          real que cobra el dueño del campo a lo largo del ciclo agrícola. Al fijarla en kilos de
          hacienda, el canon queda indexado al valor real del ganado: si el novillo sube, el canon en
          pesos acompaña; si baja, también. Es la forma tradicional del arrendamiento rural argentino
          justamente porque el kilo de novillo funciona como unidad de valor estable frente al peso.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Quintales de soja vs. kg de novillo</h2>
        <p className="mb-4">
          Los contratos agrícolas también suelen pactarse en <strong>quintales de soja por
          hectárea</strong> (1 quintal = 100 kg), y se liquidan multiplicando por el precio de la soja
          a la fecha de pago. La lógica es la misma que en kilos de novillo —indexar la renta a un
          bien real y no al peso— pero el commodity de referencia cambia. En zonas agrícolas de punta
          predomina el quintal de soja; en campos mixtos o ganaderos, el kilo de novillo. Algunos
          contratos combinan ambos o dejan una banda entre un piso y un techo. Elegir la unidad
          correcta importa: la soja y el novillo no se mueven igual, y esa diferencia define cuánto
          termina cobrando el dueño del campo.
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-2">Cuándo se actualiza el índice</h2>
        <p className="mb-4">
          El precio del kilo de novillo que se usa como referencia se mueve todos los días de
          operatoria del Mercado Agroganadero. El índice sugerido para arrendamientos rurales
          (haciinfo000013) está hoy en <strong>${fmt(arr.index)}/kg</strong> ({arr.date}). Lo que
          importa para el cálculo es <strong>qué valor rige a la fecha de cada pago</strong>: por eso
          conviene fijar en el contrato qué índice y qué fecha se toman para convertir los kilos a
          pesos, y dejar por escrito la fuente. Nosotros publicamos el índice actualizado a diario en{' '}
          <Link href="/mercado/arrendamiento" className="text-accent hover:text-accent-bright transition-colors">
            /mercado/arrendamiento
          </Link>
          .
        </p>

        <h2 className="text-zinc-100 text-lg font-medium mb-3">Preguntas frecuentes</h2>
        <dl className="space-y-4 mb-6">
          {FAQ.map((item) => (
            <div key={item.question}>
              <dt className="text-zinc-100 font-medium mb-1">{item.question}</dt>
              <dd className="text-zinc-400">{item.answer}</dd>
            </div>
          ))}
        </dl>

        <div className="border border-terminal-border bg-terminal-panel/40 px-panel py-3 space-y-2 mb-6">
          <p className="text-xxs font-terminal uppercase tracking-wider text-zinc-500">
            Seguir con el dato
          </p>
          <p className="text-data text-zinc-300">
            <Link href="/mercado/arrendamiento" className="text-accent hover:text-accent-bright transition-colors">
              Índice de arrendamiento rural →
            </Link>{' '}
            el precio del kilo de novillo de referencia, actualizado a diario desde el Mercado
            Agroganadero.
          </p>
          <p className="text-data text-zinc-300">
            <Link href="/mercado/arrendamiento/liniers" className="text-accent hover:text-accent-bright transition-colors">
              Arrendamiento — referencia Liniers →
            </Link>{' '}
            y{' '}
            <Link href="/mercado/arrendamiento/canuelas" className="text-accent hover:text-accent-bright transition-colors">
              Cañuelas →
            </Link>{' '}
            las dos plazas de referencia del novillo.
          </p>
          <p className="text-data text-zinc-300">
            <Link href="/mercado/novillos" className="text-accent hover:text-accent-bright transition-colors">
              Precio del novillo →
            </Link>{' '}
            serie diaria del kilo vivo (hoy ${fmt(novillo)}/kg), sobre la que se apoya el índice.
          </p>
          <p className="text-data text-zinc-300">
            <Link href="/impuesto-de-sellos-arrendamiento" className="text-accent hover:text-accent-bright transition-colors">
              Impuesto de sellos del arrendamiento →
            </Link>{' '}
            cuánto tributa el contrato una vez calculado el canon.
          </p>
          <p className="text-data text-zinc-300">
            <Link href="/glosario" className="text-accent hover:text-accent-bright transition-colors">
              Glosario del mercado ganadero →
            </Link>{' '}
            canon, aparcería, kg novillo/ha y demás términos.
          </p>
        </div>

        <p className="text-xxs text-zinc-500 border-t border-terminal-border pt-3">
          El valor publicado es un índice de referencia del mercado; cada contrato lo acuerdan las
          partes. Esta página no fija el precio del arrendamiento. Actualizado: {lastUpdate} · Índice
          de arrendamiento al {arr.date} (Mercado Agroganadero, haciinfo000013). Memola Medios S.A.S.
        </p>
      </article>
    </>
  )
}
