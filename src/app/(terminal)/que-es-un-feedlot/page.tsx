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
const PAGE_URL = `${BASE_URL}/que-es-un-feedlot`

/* ------------------------------------------------------------------ */
/*  Números vivos: precio de salida (novillo), de entrada (terneros /  */
/*  novillitos) y el insumo clave del feedlot (maíz). Se interpolan    */
/*  en build; la página revalida a diario contra market-prices.json.   */
/* ------------------------------------------------------------------ */
const novillo = Math.round(marketPrices.categories.novillos.current)
const ternero = Math.round(marketPrices.categories.terneros.current)
const novillito = Math.round(marketPrices.categories.novillitos.current)
const cornUsd = marketPrices.corn.current // USD/tn (MAGYP FOB)
const usdBlue = marketPrices.usdBlue.current
const lastUpdate = marketPrices.lastUpdate
const fmt = (n: number) => n.toLocaleString('es-AR')

// Maíz en ARS/kg y relación maíz/novillo (kg de maíz que "vale" 1 kg de novillo).
const cornArsKg = Math.round((cornUsd * usdBlue) / 1000)
const relacionMaizNovillo = Math.round(novillo / cornArsKg)

// Costo de alimentación por kilo ganado, referencia con conversión ~7:1.
const CONVERSION_REF = 7
const costoAlimentoPorKg = Math.round(CONVERSION_REF * cornArsKg)

/* ------------------------------------------------------------------ */
/*  Términos definidos — patrón /glosario, citables por asistentes IA  */
/* ------------------------------------------------------------------ */
const TERMINOS = [
  {
    name: 'Feedlot',
    description:
      'Sistema intensivo de engorde a corral donde el ganado se aloja en corrales y se alimenta con una dieta balanceada rica en grano (principalmente maíz) para ganar peso a alta velocidad y llegar al peso de faena en pocos meses, en lugar de engordar a pasto en el campo.',
    url: PAGE_URL,
  },
  {
    name: 'Engorde a corral',
    description:
      'Etapa final de la producción de carne en la que el animal se termina en un corral con dieta de alta energía. Es sinónimo operativo de feedlot: reemplaza la pastura por una ración formulada para maximizar el aumento diario de peso.',
    url: PAGE_URL,
  },
  {
    name: 'Conversión alimenticia',
    description:
      'Kilos de alimento (materia seca) que el animal necesita consumir para ganar un kilo de peso vivo. En feedlot la conversión típica está entre 6:1 y 8:1: cuanto más baja, más eficiente es el engorde y menor el costo por kilo producido.',
    url: `${BASE_URL}/glosario`,
  },
  {
    name: 'Aumento diario de peso',
    description:
      'Kilos que gana el animal por día. En engorde a corral con dieta rica en grano ronda 1 a 1,5 kg/día, muy por encima del aumento a pasto, y es el indicador central de la performance del feedlot.',
    url: `${BASE_URL}/glosario`,
  },
  {
    name: 'Relación maíz/novillo',
    description:
      'Cantidad de kilos de maíz que equivalen al precio de un kilo de novillo en pie. Es el termómetro de la rentabilidad del feedlot: cuanto más alta (grano barato frente a la hacienda), más conviene engordar a corral.',
    url: `${BASE_URL}/mercado/spread`,
  },
  {
    name: 'Ración',
    description:
      'Dieta formulada que recibe el animal en el corral, compuesta por un grano energético (maíz o sorgo), un aporte de fibra (silaje, heno) y un núcleo proteico-mineral. La ración se balancea para sostener el aumento diario de peso sin trastornos digestivos.',
    url: `${BASE_URL}/glosario`,
  },
]

/* ------------------------------------------------------------------ */
/*  FAQ — preguntas reales; cada respuesta arranca con el dato.        */
/* ------------------------------------------------------------------ */
const FAQ = [
  {
    question: '¿Cuánto tiempo está un animal en feedlot?',
    answer:
      'Un animal está en feedlot entre 90 y 150 días, según el peso de entrada, la categoría y la dieta. Con un aumento diario de peso de 1 a 1,5 kg/día, un ternero o novillito que entra liviano llega al peso de faena en cerca de tres a cinco meses de encierre.',
  },
  {
    question: '¿Qué comen los animales en el feedlot?',
    answer:
      'Los animales en el feedlot comen una ración balanceada de alta energía: un grano base —principalmente maíz o sorgo—, un aporte de fibra (silaje de maíz, heno o rollo) y un núcleo proteico-mineral con aditivos. El grano es la mayor parte de la dieta porque aporta la energía que sostiene el aumento diario de peso.',
  },
  {
    question: '¿Cuánto maíz necesita?',
    answer: `Con una conversión de alrededor de 7:1, hacen falta cerca de 7 kg de ración por cada kilo de peso ganado, y el grano es la mayor parte de esa ración: un ciclo de engorde ronda cerca de una tonelada de grano por animal. A precio de mercado, el maíz cotiza US$${fmt(cornUsd)}/tn (MAGYP FOB, ${lastUpdate}) —unos $${fmt(cornArsKg)}/kg al dólar de referencia—, de modo que el costo de alimentación por kilo ganado ronda $${fmt(costoAlimentoPorKg)}, contra un novillo en pie de $${fmt(novillo)}/kg vivo (INMAG del ${lastUpdate}). Son valores de referencia del mercado, no fijados por esta página.`,
  },
]

export const metadata: Metadata = {
  title: `Qué es un Feedlot y Cómo Funciona (Engorde a Corral) — maíz US$${fmt(cornUsd)}/tn`,
  description:
    'Un feedlot es un sistema de engorde a corral donde el ganado se alimenta con una dieta rica en grano (maíz) para ganar 1 a 1,5 kg por día y llegar en pocos meses al peso de faena. Cómo funciona, cuánto cuesta, cuánto maíz consume y feedlot vs invernada a campo, con precios de mercado.',
  keywords: [
    'qué es un feedlot',
    'que es un feedlot y como funciona',
    'engorde a corral',
    'feedlot ganado',
    'cuánto cuesta engordar en feedlot',
    'cuánto tiempo está un animal en feedlot',
    'qué comen los animales en el feedlot',
    'conversión alimenticia feedlot',
    'aumento diario de peso',
    'relación maíz novillo',
    'feedlot vs invernada',
  ],
  openGraph: {
    title: 'Qué es un feedlot y cómo funciona (engorde a corral)',
    description:
      'Definición de feedlot: engorde a corral con dieta rica en maíz, 1 a 1,5 kg/día de aumento, faena en 90-150 días. Cuánto cuesta, cuánto maíz consume y comparación con la invernada a campo.',
    url: PAGE_URL,
    type: 'article',
    images: ['https://www.consignatarias.com.ar/og-image.png'],
  },
  alternates: {
    canonical: PAGE_URL,
  },
}

export default function QueEsUnFeedlotPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="que-es-un-feedlot" sectionName="Qué es un feedlot" />
      <DefinedTermSetSchema
        name="Feedlot y engorde a corral — definiciones"
        description="Definiciones citables de feedlot, engorde a corral, conversión alimenticia, aumento diario de peso, relación maíz/novillo y ración en la producción de carne argentina."
        url={PAGE_URL}
        terms={TERMINOS}
      />
      <FAQPageSchema items={FAQ} />
      <SpeakableSchema
        url={PAGE_URL}
        headline="Qué es un feedlot y cómo funciona (engorde a corral)"
        cssSelectors={['h1', '.speakable-content']}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        {/* Title */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-6">
          Qué es un feedlot y cómo funciona (engorde a corral)
        </h1>

        {/* Answer-first: respuesta extraíble por asistentes IA en la 1ª oración */}
        <p className="speakable-content text-zinc-300 text-base mb-6">
          Un feedlot es un sistema de engorde a corral donde el ganado se alimenta con una dieta rica
          en grano (principalmente maíz) para ganar peso rápido —entre 1 y 1,5 kg por día— y llegar en
          pocos meses al peso de faena.
        </p>

        <p className="text-zinc-400 mb-8">
          En vez de terminar la hacienda a pasto, el feedlot la encierra en corrales y le da una
          ración formulada de alta energía. Con eso acorta el tiempo de engorde a 90-150 días. La
          economía la manda el maíz: hoy cotiza US${fmt(cornUsd)}/tn (MAGYP FOB, {lastUpdate}) —unos $
          {fmt(cornArsKg)}/kg al dólar de referencia—, mientras el novillo de salida vale $
          {fmt(novillo)}/kg vivo y el ternero de reposición que entra al corral $
          {fmt(ternero)}/kg (INMAG del {lastUpdate}). Son precios de referencia del mercado, no fijados
          por esta página.
        </p>

        {/* Cómo funciona */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Cómo funciona el engorde a corral</h2>
        <p className="text-zinc-400 mb-4">
          El circuito es simple: se compran terneros o novillitos livianos —hoy el ternero de
          reposición ronda ${fmt(ternero)}/kg y el novillito ${fmt(novillito)}/kg (INMAG del{' '}
          {lastUpdate})—, se los agrupa por peso y categoría en corrales y se los alimenta con una
          ración balanceada varias veces por día. La dieta se arranca con más fibra y se va cargando
          de grano en el período de acostumbramiento para evitar trastornos digestivos (acidosis).
          Durante 90-150 días el animal gana 1 a 1,5 kg diarios; cuando alcanza el peso y la
          terminación (grado de gordura) buscados, sale a faena o se vende en pie a través de una
          consignataria.
        </p>

        {/* Cuánto cuesta */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Cuánto cuesta engordar en feedlot</h2>
        <p className="text-zinc-400 mb-4">
          El costo lo domina el alimento, y el termómetro es la relación maíz/novillo. Con el maíz a $
          {fmt(cornArsKg)}/kg y el novillo a ${fmt(novillo)}/kg vivo, un kilo de novillo equivale a
          unos {relacionMaizNovillo} kg de maíz ({lastUpdate}): cuanto más alta esa relación —grano
          barato frente a la hacienda—, más conviene el encierre. Con una conversión de referencia de{' '}
          {CONVERSION_REF}:1, el alimento cuesta cerca de ${fmt(costoAlimentoPorKg)} por cada kilo
          ganado, a lo que se suman sanidad, personal, estructura y financiamiento. La rentabilidad
          aparece cuando el valor del kilo producido supera ese costo total; por eso el feedlotero
          mira a diario el spread entre la hacienda y el grano.
        </p>
        <p className="text-zinc-400 mb-4">
          <Link href="/mercado/spread" className="text-accent hover:underline">
            Ver el spread hacienda-maíz actualizado →
          </Link>
        </p>

        {/* Feedlot vs invernada */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">Feedlot vs invernada a campo</h2>
        <p className="text-zinc-400 mb-4">
          La diferencia es el recurso que engorda al animal. En el feedlot la energía viene del grano
          en el corral: engorde rápido (1 a 1,5 kg/día), ciclo corto de meses, alta inversión en
          alimento e infraestructura y resultado poco sensible al clima. En la{' '}
          <Link href="/que-es-la-invernada" className="text-accent hover:underline">
            invernada a campo
          </Link>{' '}
          la energía viene de la pastura: engorde más lento, ciclo de uno a dos años, bajo costo de
          alimento pero dependencia del clima y de la disponibilidad de pasto. Muchos sistemas
          combinan ambos —recría a pasto y terminación a corral— para bajar costo sin resignar
          velocidad de salida.
        </p>

        {/* Aumento diario y conversión */}
        <h2 className="text-zinc-200 text-lg font-medium mb-3">
          Aumento diario de peso y conversión
        </h2>
        <p className="text-zinc-400 mb-8">
          Los dos indicadores que miden un feedlot son el aumento diario de peso y la conversión
          alimenticia. El aumento diario —1 a 1,5 kg/día en dieta rica en grano— dice qué tan rápido
          engorda el animal. La conversión —cuántos kilos de ración hacen falta para ganar un kilo de
          peso vivo, típicamente entre 6:1 y 8:1— dice qué tan eficiente es ese engorde: cuanto más
          baja, menor el costo por kilo producido. Ambos dependen de la genética, la categoría, la
          formulación de la ración y el manejo sanitario del corral.
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

        {/* Links internos */}
        <div className="border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/que-es-la-invernada" className="text-zinc-500 hover:text-accent transition-colors">
            Qué es la invernada →
          </Link>
          <Link href="/que-es-la-cria-y-recria" className="text-zinc-500 hover:text-accent transition-colors">
            Cría y recría
          </Link>
          <Link href="/categorias-de-hacienda" className="text-zinc-500 hover:text-accent transition-colors">
            Categorías de hacienda
          </Link>
          <Link href="/mercado/spread" className="text-zinc-500 hover:text-accent transition-colors">
            Spread hacienda-maíz
          </Link>
          <Link href="/mercado/novillos" className="text-zinc-500 hover:text-accent transition-colors">
            Precio del novillo hoy
          </Link>
          <Link href="/glosario" className="text-zinc-500 hover:text-accent transition-colors">
            Glosario ganadero
          </Link>
        </div>

        {/* Footer */}
        <p className="text-zinc-500 text-xs mt-4">
          Precios de referencia del mercado (INMAG · Mercado Agroganadero · MAGYP); la página no fija
          precios ni márgenes. Actualizado: {lastUpdate}. Memola Medios S.A.S.
        </p>
      </div>
    </>
  )
}
