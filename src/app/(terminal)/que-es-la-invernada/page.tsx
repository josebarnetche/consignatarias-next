import { Metadata } from 'next'
import Link from 'next/link'
import {
  SectionBreadcrumbSchema,
  DefinedTermSetSchema,
  FAQPageSchema,
  SpeakableSchema,
} from '@/components/seo/JsonLd'
import marketPrices from '@/lib/data/market-prices.json'

export const revalidate = 86400 // rebuild diario vía Vercel

const BASE_URL = 'https://www.consignatarias.com.ar'
const PAGE_URL = `${BASE_URL}/que-es-la-invernada`

/* ------------------------------------------------------------------ */
/*  Número vivo: ejemplifica el margen del invernador con precios      */
/*  reales y fechados (compra ternero, vende novillo terminado).       */
/* ------------------------------------------------------------------ */
const terneroKg = Math.round(marketPrices.categories.terneros.current)
const novilloKg = Math.round(marketPrices.categories.novillos.current)
const novillitoKg = Math.round(marketPrices.categories.novillitos.current)
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')

// La cuenta del invernador: entra ternero de 180 kg, sale novillo de 450 kg.
const PESO_ENTRADA = 180
const PESO_SALIDA = 450
const kilosGanados = PESO_SALIDA - PESO_ENTRADA // 270 kg
const compraTernero = terneroKg * PESO_ENTRADA
const ventaNovillo = novilloKg * PESO_SALIDA
const margenBruto = ventaNovillo - compraTernero

/* ------------------------------------------------------------------ */
/*  Términos definidos — patrón /glosario, citables por asistentes IA  */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'Invernada',
    description:
      'Etapa del ciclo ganadero en la que un animal ya destetado (ternero o novillito) se engorda hasta alcanzar el peso de faena, ganando de 0,5 a 1 kg por día hasta llegar a los 400-500 kg del novillo terminado. Puede hacerse a campo (sobre pasturas y verdeos) o a corral (feedlot). El productor que la realiza es el invernador, y su negocio es el valor que le agrega al animal entre la compra flaco y la venta gordo.',
    url: PAGE_URL,
  },
  {
    name: 'Recría',
    description:
      'Fase intermedia entre el destete y la invernada propiamente dicha, en la que el ternero destetado crece en estructura (hueso y músculo) a un ritmo moderado —sobre pasto— antes de entrar a la etapa de engorde y terminación. En muchos planteos la recría y la invernada se solapan y se manejan como un mismo proceso continuo.',
    url: `${BASE_URL}/que-es-la-cria-y-recria`,
  },
  {
    name: 'Engorde',
    description:
      'Proceso de aumento de peso del animal por deposición de músculo y grasa, alimentándolo por encima de su mantenimiento. Es el corazón de la invernada: cuanto mayor y más eficiente es el aumento diario de peso, menor es el tiempo y el costo por kilo producido.',
  },
  {
    name: 'Terminación',
    description:
      'Etapa final del engorde en la que el animal alcanza el grado de gordura (cobertura de grasa) y el peso que demanda el frigorífico para faena. Un novillo terminado ronda los 400-500 kg de peso vivo, según la raza y el tipo comercial.',
  },
  {
    name: 'Aumento diario de peso (ADP)',
    description:
      'Kilos de peso vivo que gana un animal por día. En invernada se mueve habitualmente entre 0,5 y 1 kg/día a campo, y puede superar 1,2-1,5 kg/día a corral con dietas de alto grano. Es el indicador central de eficiencia del invernador: define cuántos días toma llevar al animal del peso de entrada al de faena.',
  },
  {
    name: 'Novillo de invernada',
    description:
      'Categoría comercial del macho castrado en proceso de engorde o ya terminado para faena. Se distingue del ternero (recién destetado, más liviano) y del novillito (macho joven en etapa intermedia). El novillo terminado es el producto final de la invernada y cotiza por kilo vivo en el Mercado Agroganadero.',
    url: `${BASE_URL}/mercado/novillos`,
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — preguntas reales; cada respuesta arranca con el dato.        */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Cuánto dura la invernada?',
    answer:
      'La invernada dura entre 12 y 24 meses cuando se hace a campo sobre pasturas y verdeos, y entre 90 y 120 días cuando se termina a corral (feedlot). El tiempo depende del aumento diario de peso: con 0,7 kg/día a campo, llevar un ternero de 180 kg a un novillo de 450 kg (270 kg de aumento) toma cerca de 385 días; a corral, con más de 1,2 kg/día, ese mismo aumento se logra en pocos meses.',
  },
  {
    question: '¿Qué come un animal de invernada?',
    answer:
      'Un animal de invernada a campo come pasturas perennes (alfalfa, festuca), verdeos de invierno y verano (avena, raigrás, sorgo, maíz) y, según el planteo, suplementación con grano o silaje. A corral (feedlot) la dieta se basa en grano —maíz o sorgo— con silaje y un núcleo proteico-mineral, buscando el mayor aumento diario de peso posible en el menor tiempo.',
  },
  {
    question: '¿Diferencia entre invernada y cría?',
    answer:
      'La cría produce el ternero (la vaca madre pare y amamanta hasta el destete); la invernada compra o recibe ese ternero destetado y lo engorda hasta el peso de faena. Son dos negocios distintos del ciclo ganadero: el criador vende terneros por kilo de destete, el invernador agrega kilos y vende el novillo terminado. En muchos campos ambas etapas se integran en el ciclo completo.',
  },
]

export const metadata: Metadata = {
  title: 'Qué es la invernada en ganadería: el engorde del ternero al novillo',
  description:
    'La invernada es la etapa del ciclo ganadero en la que un animal destetado (ternero o novillito) se engorda hasta el peso de faena, ganando 0,5 a 1 kg por día hasta los 400-500 kg del novillo terminado. Diferencia con cría y recría, campo vs. feedlot y la cuenta del invernador con precios de mercado.',
  keywords: [
    'qué es la invernada ganado',
    'que es la invernada en ganaderia',
    'invernada de ganado',
    'ciclo ganadero engorde',
    'invernador que es',
    'diferencia cria e invernada',
    'invernada a campo vs feedlot',
    'novillo de invernada',
    'aumento diario de peso ganado',
    'engorde de terneros',
  ],
  openGraph: {
    title: 'Qué es la invernada en ganadería: el engorde del ternero al novillo',
    description:
      'La invernada es la etapa del ciclo ganadero en la que el animal destetado se engorda hasta el peso de faena (400-500 kg). Cría vs. recría, campo vs. feedlot y la cuenta del invernador con precios reales.',
    url: PAGE_URL,
    type: 'article',
    images: ['https://www.consignatarias.com.ar/og.png'],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function QueEsLaInvernadaPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="que-es-la-invernada" sectionName="Qué es la invernada" />
      <DefinedTermSetSchema
        name="Invernada — el ciclo del engorde ganadero"
        description="Definiciones citables de invernada, recría, engorde, terminación, aumento diario de peso y novillo de invernada en la ganadería argentina."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Qué es la invernada en ganadería: el ciclo del engorde"
        cssSelectors={['h1', '.speakable-content']}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        {/* Title */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-6">
          Qué es la invernada en ganadería
        </h1>

        {/* Answer-first: respuesta extraíble por asistentes IA en la 1ª oración */}
        <p className="speakable-content text-zinc-300 text-base mb-6">
          La invernada es la etapa del ciclo ganadero en la que un animal ya destetado (ternero o
          novillito) se engorda hasta alcanzar el peso de faena, ganando de 0,5 a 1 kg por día hasta
          llegar a los 400-500 kg del novillo terminado.
        </p>

        <p className="text-zinc-400 mb-8">
          Es la fase que agrega kilos: el productor que la realiza —el <span className="text-zinc-300">invernador</span>—
          compra o recibe el ternero flaco al destete y lo vende gordo para faena. Su negocio está en
          el valor que suma entre esos dos momentos. A precio de mercado actual, el ternero se paga
          alrededor de ${fmt(terneroKg)}/kg vivo y el novillo terminado ${fmt(novilloKg)}/kg
          (Mercado Agroganadero, INMAG del {lastUpdate}); estos son valores de referencia del mercado,
          no precios fijados por esta página.
        </p>

        {/* Invernada vs cría vs recría */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Invernada vs cría vs recría</h2>
        <p className="text-zinc-400 mb-4">
          El ciclo ganadero se divide en tres etapas encadenadas:
        </p>
        <ul className="text-zinc-400 mb-4 space-y-2 list-disc pl-5">
          <li>
            <span className="text-zinc-300">Cría:</span> la vaca madre pare y amamanta al ternero
            hasta el destete (~6-8 meses, ~160-200 kg). El criador vende terneros por kilo de destete.
          </li>
          <li>
            <span className="text-zinc-300">Recría:</span> el ternero destetado crece en estructura
            —hueso y músculo— a ritmo moderado sobre pasto, antes de entrar al engorde propiamente
            dicho. Ver{' '}
            <Link href="/que-es-la-cria-y-recria" className="text-accent hover:text-accent-bright transition-colors">
              cría y recría
            </Link>.
          </li>
          <li>
            <span className="text-zinc-300">Invernada / engorde:</span> el animal gana kilos hasta la
            terminación y se vende como novillo (o novillito/vaquillona) para faena. Es la etapa que
            define esta página.
          </li>
        </ul>
        <p className="text-zinc-400 mb-8">
          En muchos campos las tres etapas se integran en el <span className="text-zinc-300">ciclo completo</span>:
          el mismo productor cría, recría e inverna. En otros, cada etapa es un negocio separado —el
          criador vende al invernador, y el invernador al frigorífico—.
        </p>

        {/* Invernada a campo vs a corral (feedlot) */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          Invernada a campo vs a corral (feedlot)
        </h2>
        <p className="text-zinc-400 mb-4">
          Hay dos grandes sistemas para engordar el animal, según la base de la dieta:
        </p>
        <ul className="text-zinc-400 mb-4 space-y-2 list-disc pl-5">
          <li>
            <span className="text-zinc-300">A campo (pastoril):</span> el animal engorda sobre
            pasturas perennes (alfalfa, festuca) y verdeos, con o sin suplementación. El aumento diario
            de peso ronda 0,5-1 kg/día y la invernada dura de 12 a 24 meses. Menor costo por kilo,
            pero más lento y expuesto al clima.
          </li>
          <li>
            <span className="text-zinc-300">A corral (feedlot):</span> el animal se termina en
            encierre con dieta de alto grano (maíz o sorgo + silaje + núcleo). El aumento diario supera
            1,2-1,5 kg/día y la terminación se logra en 90-120 días. Más rápido y controlado, con mayor
            costo de alimentación. Ver{' '}
            <Link href="/que-es-un-feedlot" className="text-accent hover:text-accent-bright transition-colors">
              qué es un feedlot
            </Link>.
          </li>
        </ul>
        <p className="text-zinc-400 mb-8">
          Muchos planteos combinan ambos: recría a campo para poner estructura barata y terminación a
          corral para dar la gordura final rápido.
        </p>

        {/* La cuenta del invernador */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">La cuenta del invernador</h2>
        <p className="text-zinc-400 mb-4">
          El negocio del invernador se ve en una cuenta simple: cuánto paga el animal flaco, cuánto
          cobra el animal gordo, y qué le cuesta el engorde en el medio. Con precios de mercado del{' '}
          {lastUpdate}:
        </p>
        <div className="overflow-x-auto mb-2">
          <table className="w-full text-data border border-terminal-border">
            <tbody>
              <tr className="border-b border-terminal-border/60">
                <td className="px-3 py-2 text-zinc-300">
                  Compra: ternero de {PESO_ENTRADA} kg a ${fmt(terneroKg)}/kg
                </td>
                <td className="px-3 py-2 text-right text-zinc-200">${fmt(compraTernero)}</td>
              </tr>
              <tr className="border-b border-terminal-border/60">
                <td className="px-3 py-2 text-zinc-300">
                  Venta: novillo de {PESO_SALIDA} kg a ${fmt(novilloKg)}/kg
                </td>
                <td className="px-3 py-2 text-right text-zinc-200">${fmt(ventaNovillo)}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-zinc-300">
                  Diferencia bruta (por {fmt(kilosGanados)} kg agregados)
                </td>
                <td className="px-3 py-2 text-right text-accent">${fmt(margenBruto)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xxs text-zinc-500 mb-4">
          Ternero ${fmt(terneroKg)}/kg y novillo ${fmt(novilloKg)}/kg (Mercado Agroganadero, INMAG del{' '}
          {lastUpdate}). Valores de referencia del mercado.
        </p>
        <p className="text-zinc-400 mb-8">
          Esa diferencia de ${fmt(margenBruto)} es <span className="text-zinc-300">margen bruto</span>,
          no ganancia: de ahí hay que descontar el costo de la comida (pasto o grano) durante todo el
          engorde, la sanidad, la mortandad, los fletes y el costo financiero de tener el capital
          inmovilizado meses. El invernador gana cuando el kilo que agrega le cuesta menos de lo que el
          mercado le paga por él —y por eso vigila de cerca la relación de precios entre el ternero (lo
          que compra) y el novillo (lo que vende). Como referencia intermedia, el novillito cotiza hoy
          alrededor de ${fmt(novillitoKg)}/kg.
        </p>

        {/* FAQ visible (refuerza el schema y da respuesta extraíble) */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Preguntas frecuentes</h2>
        <dl className="space-y-5 mb-8">
          {FAQ.map((item) => (
            <div key={item.question} className="border-l-2 border-zinc-700 pl-4">
              <dt className="text-accent font-medium text-base mb-1">{item.question}</dt>
              <dd className="text-zinc-400">{item.answer}</dd>
            </div>
          ))}
        </dl>

        {/* Links internos pilar-cluster */}
        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/que-es-la-cria-y-recria" className="text-zinc-500 hover:text-accent transition-colors">
            Cría y recría →
          </Link>
          <Link href="/que-es-un-feedlot" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es un feedlot
          </Link>
          <Link href="/que-es-el-destete" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es el destete
          </Link>
          <Link href="/categorias-de-hacienda" className="text-zinc-500 hover:text-accent transition-colors">
            Categorías de hacienda
          </Link>
          <Link href="/mercado/novillos" className="text-zinc-500 hover:text-accent transition-colors">
            Precio del novillo hoy
          </Link>
          <Link href="/mercado/arrendamiento" className="text-zinc-500 hover:text-accent transition-colors">
            Arrendamiento de campos →
          </Link>
          <Link href="/glosario" className="text-zinc-500 hover:text-accent transition-colors">
            Glosario ganadero
          </Link>
        </div>

        {/* Footer */}
        <p className="text-zinc-500 text-xs mt-4">
          Precios de referencia del Mercado Agroganadero; cada operación se acuerda entre las partes.
          Actualizado: {lastUpdate}. Memola Medios S.A.S.
        </p>
      </div>
    </>
  )
}
