import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, SpeakableSchema, DefinedTermSetSchema } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Glosario Ganadero — 39 Términos del Mercado',
  description: 'Glosario completo con 39 definiciones del mercado ganadero argentino: remate, consignataria, INMAG, DT-e, invernada, feedlot, Liniers, categorías de hacienda, razas y más.',
  openGraph: {
    title: 'Glosario Ganadero',
    description: 'Glosario con definiciones de terminos del mercado ganadero argentino: remate, consignataria, INMAG, invernada, cria, frigorifico y mas.',
    url: 'https://www.consignatarias.com.ar/glosario',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/glosario',
  },
}

interface GlossaryTerm {
  term: string
  definition: string
  link?: { href: string; text: string }
}

const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: 'Balanza',
    definition: 'Instrumento de pesaje utilizado en los remates para determinar el peso exacto de los animales. El precio final se calcula multiplicando el peso por el valor por kilogramo ofertado. La balanza debe estar calibrada y certificada.',
  },
  {
    term: 'Braford',
    definition: 'Raza bovina sintética originada del cruce entre Brahman y Hereford. Combina la rusticidad y adaptación al calor del cebú con la calidad carnicera del Hereford. Muy difundida en el norte argentino.',
  },
  {
    term: 'Brangus',
    definition: 'Raza bovina sintética resultado del cruce entre Brahman y Angus. Ofrece tolerancia al calor, resistencia a parásitos y buena calidad de carne. Popular en regiones subtropicales de Argentina.',
  },
  {
    term: 'Cabeza',
    definition: 'Unidad de conteo de ganado. 1 cabeza = 1 animal. Se usa para expresar el volumen de un remate o la capacidad de un establecimiento (ej. "remate de 2.000 cabezas").',
  },
  {
    term: 'Cabaña',
    definition: 'Establecimiento ganadero dedicado a la cría de reproductores de pedigree (puros de raza). Las cabañas venden toros y vientres de alta genética para mejoramiento de rodeos comerciales.',
  },
  {
    term: 'Categoría',
    definition: 'Clasificación del ganado según sexo, edad y estado reproductivo. Las principales categorías son: ternero/a, novillito/vaquillona, novillo/vaca, toro. Cada categoría tiene precios de referencia distintos.',
  },
  {
    term: 'Ciclo completo',
    definition: 'Sistema de producción ganadera que integra cría e invernada en un mismo establecimiento. El productor mantiene vacas de cría, desteta terneros y los engorda hasta peso de faena.',
  },
  {
    term: 'Consignataria',
    definition: 'Intermediario habilitado por matricula entre productores ganaderos y compradores en remates de hacienda. La consignataria organiza la subasta, garantiza la operacion y cobra una comision sobre la venta.',
    link: { href: '/consignatarias', text: 'Ver directorio de consignatarias →' },
  },
  {
    term: 'Cria',
    definition: 'Tipo de remate enfocado en ganado reproductor: vientres (vacas y vaquillonas preñadas o con cria al pie), toros y reproductores. Orientado a establecimientos que buscan mejorar o ampliar su rodeo.',
    link: { href: '/remates?tipo=cria', text: 'Ver remates de cría →' },
  },
  {
    term: 'CUIT',
    definition: 'Clave Unica de Identificacion Tributaria. Identificador fiscal argentino de 11 digitos asignado por AFIP a personas fisicas y juridicas. Se usa para identificar consignatarias y frigorificos en registros oficiales.',
  },
  {
    term: 'Frigorifico',
    definition: 'Planta procesadora de carne habilitada por SENASA para faena, desposte y/o procesamiento de productos carnicos. Cada frigorifico cuenta con un numero de establecimiento oficial y esta sujeto a inspecciones sanitarias regulares.',
    link: { href: '/frigorificos', text: 'Ver directorio de frigoríficos →' },
  },
  {
    term: 'Hacienda',
    definition: 'Termino que refiere al ganado bovino en pie (vivo), especialmente en el contexto de compraventa y remates. "Hacienda en pie" es sinonimo de ganado vivo listo para comercializar.',
  },
  {
    term: 'INMAG',
    definition: 'Indice Novillo del Mercado Agroganadero. Precio de referencia del kilogramo vivo de novillo, publicado por el Mercado Agroganadero de Liniers. Es el principal indicador de precios de la hacienda vacuna en Argentina, expresado en $/kg vivo.',
    link: { href: '/mercado/inmag', text: 'Ver precio INMAG actual →' },
  },
  {
    term: 'Invernada',
    definition: 'Tipo de remate enfocado en ganado para engorde: novillitos, terneros y vaquillonas. El comprador adquiere animales jovenes para llevarlos a peso de faena en su establecimiento (feedlot o campo).',
    link: { href: '/remates?tipo=invernada', text: 'Ver remates de invernada →' },
  },
  {
    term: 'Matricula',
    definition: 'Numero de habilitacion otorgado a consignatarias de ganado por el registro publico correspondiente. Acredita que la consignataria esta autorizada legalmente para intermediar en operaciones de compraventa de hacienda.',
  },
  {
    term: 'Novillo',
    definition: 'Bovino macho castrado de 2 o mas años de edad. Es la categoria base del indice INMAG y la principal referencia de precios del mercado ganadero argentino.',
  },
  {
    term: 'Novillito',
    definition: 'Bovino macho castrado joven, entre 1 y 2 años de edad. Se comercializa principalmente en remates de invernada para completar su engorde hasta alcanzar peso de faena.',
  },
  {
    term: 'Plaza',
    definition: 'Localidad o establecimiento donde se realiza un remate de hacienda. Puede referirse a una ciudad, un predio ferial o un mercado concentrador (ej. "plaza de Liniers", "plaza de Rosario").',
  },
  {
    term: 'Remate',
    definition: 'Evento de venta de ganado mediante subasta publica, organizado por una consignataria habilitada. Los compradores pujan por lotes de animales y el mejor postor se adjudica la compra. Puede ser presencial, televisado o por streaming.',
    link: { href: '/remates', text: 'Ver calendario de remates →' },
  },
  {
    term: 'SENASA',
    definition: 'Servicio Nacional de Sanidad y Calidad Agroalimentaria. Organismo estatal argentino que regula, controla y certifica la sanidad animal, vegetal y la inocuidad alimentaria. Habilita frigorificos, controla movimientos de hacienda y emite guias de transito.',
  },
  {
    term: 'Ternero',
    definition: 'Bovino joven de menos de 1 año de edad. Es una de las categorias mas demandadas en remates de invernada, ya que ofrece el mayor potencial de engorde.',
  },
  {
    term: 'Vaca',
    definition: 'Bovino hembra adulta. En el mercado ganadero se comercializa como vaca de descarte (para faena), vaca de cria (como vientre reproductor) o vaca con cria al pie.',
  },
  {
    term: 'Vaquillona',
    definition: 'Bovino hembra joven que aun no ha tenido su primer parto. Se comercializa tanto para invernada (engorde) como para cria (como futuro vientre reproductor).',
  },
  {
    term: 'Destete',
    definition: 'Separación del ternero de su madre, generalmente entre los 6 y 8 meses de edad. Los terneros destetados son la principal oferta en remates de invernada.',
  },
  {
    term: 'DEP',
    definition: 'Diferencia Esperada en la Progenie. Indicador genético que predice cómo se comportarán los hijos de un reproductor respecto al promedio de la raza. Se usa para selección de toros en cabañas.',
  },
  {
    term: 'DT-e',
    definition: 'Documento de Tránsito Electrónico. Documento digital obligatorio emitido por SENASA que autoriza el traslado de ganado entre establecimientos en Argentina. Reemplazó a la guía de traslado en papel y tiene validez de 72 horas desde su emisión.',
    link: { href: '/dte', text: 'Ver guía completa sobre DT-e →' },
  },
  {
    term: 'Faena',
    definition: 'Proceso de sacrificio y procesamiento del ganado en frigoríficos. La faena está regulada por SENASA y debe realizarse en plantas habilitadas. Los datos de faena son indicadores del mercado.',
    link: { href: '/frigorificos', text: 'Ver frigoríficos habilitados →' },
  },
  {
    term: 'Feria',
    definition: 'Lugar físico donde se realizan los remates ganaderos. Las ferias cuentan con corrales, mangas, balanzas y espacios para compradores. Algunas ferias tienen calendario fijo semanal o quincenal.',
  },
  {
    term: 'Feedlot',
    definition: 'Sistema de engorde intensivo a corral donde el ganado recibe alimentación balanceada (granos, silaje, núcleos vitamínicos). Permite terminar animales en menor tiempo que la invernada a campo.',
  },
  {
    term: 'Gordura',
    definition: 'Grado de terminación o engrasamiento de un animal. Se clasifica visualmente en escalas (ej. 1 a 4) y determina si está listo para faena. La gordura adecuada es clave para el precio final.',
  },
  {
    term: 'Guía',
    definition: 'Documento oficial emitido por SENASA que autoriza el traslado de hacienda entre establecimientos. Sin guía, el transporte de ganado es ilegal. Incluye datos del remitente, destinatario y sanidad.',
  },
  {
    term: 'Kilo vivo',
    definition: 'Unidad de medida estándar para la comercialización de hacienda en pie. El precio se expresa en $/kg vivo y se multiplica por el peso del animal para obtener el valor total.',
  },
  {
    term: 'Liniers',
    definition: 'Mercado de Hacienda de Liniers, ubicado en Buenos Aires. Es el principal mercado concentrador de ganado de Argentina y referencia nacional de precios. Opera diariamente con subastas públicas.',
    link: { href: '/mercado/inmag', text: 'Ver precio INMAG (referencia Liniers) →' },
  },
  {
    term: 'Lote',
    definition: 'Conjunto de animales agrupados para su venta en un remate. Los lotes se arman por categoría, peso y características similares. El comprador puja por el lote completo, no por animales individuales.',
  },
  {
    term: 'Manga',
    definition: 'Pasillo angosto por donde circula el ganado para pesaje, vacunación o embarque. En los remates, la manga permite que los animales pasen ordenadamente frente a los compradores.',
  },
  {
    term: 'Martillero',
    definition: 'Profesional habilitado que conduce la subasta, recibe las ofertas y adjudica los lotes al mejor postor. El martillero debe estar matriculado y actúa en representación de la consignataria.',
  },
  {
    term: 'Merma',
    definition: 'Pérdida de peso que sufre el ganado durante el transporte. Se expresa como porcentaje y se descuenta del peso de origen. La merma típica varía entre 2% y 6% según distancia y condiciones.',
  },
  {
    term: 'Pedigree',
    definition: 'Registro genealógico oficial de un animal de raza pura. Los animales con pedigree tienen trazabilidad completa de sus ancestros y se comercializan como reproductores a precios superiores.',
  },
  {
    term: 'Rendimiento',
    definition: 'Relación entre el peso vivo del animal y el peso de la res (carcasa). Se expresa como porcentaje: un novillo de 450 kg vivo con 58% de rendimiento produce una res de 261 kg.',
  },
  {
    term: 'Rodeo',
    definition: 'Conjunto total de animales de un establecimiento ganadero. Incluye todas las categorías: vacas, toros, terneros, novillos. "Armar rodeo" significa comprar hacienda para iniciar una explotación.',
  },
  {
    term: 'Sanidad',
    definition: 'Estado sanitario del ganado y cumplimiento del plan de vacunación obligatorio (aftosa, brucelosis, etc.). La sanidad se verifica mediante la guía de SENASA y es requisito para la comercialización.',
  },
  {
    term: 'Toro',
    definition: 'Bovino macho adulto no castrado, utilizado para reproducción. Los toros de pedigree se venden en remates de cabañas. Un toro puede servir entre 25 y 40 vacas por temporada.',
  },
  {
    term: 'Tropa',
    definition: 'Grupo de animales que se comercializan o transportan juntos. Similar a lote, pero más usado para referirse al ganado en tránsito. "Enviar una tropa" significa despachar animales a destino.',
  },
  {
    term: 'Vientre',
    definition: 'Hembra bovina apta para reproducción: vaca o vaquillona en servicio, preñada o con cría al pie. Los vientres son la base del rodeo de cría y se comercializan en remates especiales.',
  },
]

const BASE_URL = 'https://www.consignatarias.com.ar'

export default function GlosarioPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="glosario" sectionName="Glosario" />
      <DefinedTermSetSchema
        name="Glosario Ganadero Argentino"
        description="Definiciones de términos clave del mercado ganadero argentino."
        url={`${BASE_URL}/glosario`}
        terms={GLOSSARY_TERMS.map((entry) => ({
          name: entry.term,
          description: entry.definition,
          url: entry.link?.href?.startsWith('/') ? `${BASE_URL}${entry.link.href}` : undefined,
        }))}
      />
      <SpeakableSchema
        url="https://www.consignatarias.com.ar/glosario"
        headline="Glosario Ganadero — 39 Términos del Mercado"
        cssSelectors={['h1', '.glossary-term', '.glossary-definition']}
      />
      <div className="max-w-3xl mx-auto px-4 py-8 text-sm leading-relaxed">
        {/* Title */}
        <h1 className="text-zinc-100 text-2xl font-medium mb-6">Glosario Ganadero</h1>

        <p className="text-zinc-400 mb-8">
          Definiciones de los terminos mas usados en el mercado ganadero argentino:
          remates, categorias de hacienda, organismos reguladores e indicadores de precios.
        </p>

        {/* Glossary entries */}
        <dl className="space-y-6">
          {GLOSSARY_TERMS.map((entry) => (
            <div key={entry.term} className="border-l-2 border-zinc-700 pl-4">
              <dt className="text-accent font-medium text-base mb-1">{entry.term}</dt>
              <dd className="text-zinc-400">
                {entry.definition}
                {entry.link && (
                  <Link 
                    href={entry.link.href} 
                    className="block mt-2 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    {entry.link.text}
                  </Link>
                )}
              </dd>
            </div>
          ))}
        </dl>

        {/* Related links */}
        <div className="mt-10 border-t border-zinc-800 pt-4 flex flex-wrap gap-4 text-xs">
          <Link href="/calidad" className="text-zinc-500 hover:text-accent transition-colors">Calidad de datos</Link>
          <Link href="/quienes-somos" className="text-zinc-500 hover:text-accent transition-colors">Quiénes somos</Link>
          <Link href="/planes" className="text-zinc-500 hover:text-accent transition-colors">Planes</Link>
          <Link href="/remates" className="text-zinc-500 hover:text-accent transition-colors">Ver remates</Link>
        </div>

        {/* Footer */}
        <p className="text-zinc-500 text-xs mt-4">
          Ultima actualizacion: Marzo 2026. Memola Medios S.A.S. &mdash; Todos los derechos reservados.
        </p>
      </div>
    </>
  )
}
