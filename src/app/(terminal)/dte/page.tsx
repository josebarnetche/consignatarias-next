import { Metadata } from 'next'
import Link from 'next/link'
import { SectionBreadcrumbSchema, FAQPageSchema, HowToSchema } from '@/components/seo/JsonLd'
import { FileText, Shield, Clock, CheckCircle2, ArrowRight, Upload, AlertTriangle } from 'lucide-react'

// SEO-optimized metadata targeting "DT-e", "documento de tránsito electrónico", "guía de traslado ganado"
export const metadata: Metadata = {
  title: 'DT-e: Documento de Tránsito Electrónico | Guía Completa 2026',
  description: 'Qué es el DT-e (Documento de Tránsito Electrónico), cómo tramitarlo en SENASA, requisitos para traslado de ganado bovino en Argentina. Guía actualizada 2026.',
  keywords: [
    'DT-e',
    'documento de tránsito electrónico',
    'guía de traslado ganado',
    'DT-e SENASA',
    'documento tránsito bovino',
    'guía hacienda',
    'traslado ganado Argentina',
    'DT-e que es',
    'como sacar DT-e',
    'requisitos DT-e',
    'guía electrónica ganado',
    'documento transporte hacienda',
  ],
  openGraph: {
    title: 'DT-e: Documento de Tránsito Electrónico — Guía Completa',
    description: 'Todo lo que necesitás saber sobre el DT-e para traslado de ganado en Argentina: qué es, cómo tramitarlo, requisitos y más.',
    url: 'https://www.consignatarias.com.ar/dte',
    type: 'article',
  },
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/dte',
  },
}

// FAQ items for rich snippets - targeting high-volume search queries
const DTE_FAQ = [
  {
    question: '¿Qué es el DT-e o Documento de Tránsito Electrónico?',
    answer: 'El DT-e (Documento de Tránsito Electrónico) es el documento digital obligatorio emitido por SENASA que autoriza el traslado de ganado bovino, ovino, porcino y otras especies entre establecimientos en Argentina. Reemplaza a la antigua guía de traslado en papel y es requisito indispensable para el transporte legal de hacienda.',
  },
  {
    question: '¿Cómo se tramita un DT-e en SENASA?',
    answer: 'El DT-e se tramita online a través del Sistema de Gestión Sanitaria (SIGSA) de SENASA. El titular del establecimiento de origen debe: 1) Ingresar a sigsa.senasa.gob.ar con CUIT y clave fiscal, 2) Seleccionar "Solicitar DT-e", 3) Completar datos de origen, destino, cantidad y categoría de animales, 4) Confirmar y obtener el número de DT-e.',
  },
  {
    question: '¿Cuánto tiempo de validez tiene un DT-e?',
    answer: 'El DT-e tiene una validez de 72 horas desde su emisión para iniciar el traslado. Una vez iniciado el movimiento, el documento ampara el traslado hasta su destino final. Si no se utiliza dentro de las 72 horas, caduca y debe generarse uno nuevo.',
  },
  {
    question: '¿Qué datos contiene un DT-e?',
    answer: 'El DT-e incluye: número único de documento, fecha de emisión y movimiento, RENSPA de origen y destino, nombre del titular y establecimiento, especie animal (bovino, ovino, etc.), cantidad de cabezas por categoría, peso total estimado, motivo del traslado y datos del transportista.',
  },
  {
    question: '¿Qué pasa si traslado ganado sin DT-e?',
    answer: 'Trasladar ganado sin DT-e válido es una infracción grave. Las sanciones incluyen: decomiso de la hacienda, multas que pueden superar los $500.000, inhabilitación del establecimiento y responsabilidad penal por abigeato. Los controles se realizan en rutas y en frigoríficos.',
  },
  {
    question: '¿Cuál es la diferencia entre DT-e y DTA?',
    answer: 'El DT-e (Documento de Tránsito Electrónico) es para movimientos dentro de Argentina. El DTA (Documento de Tránsito de Animales) es el equivalente para exportación/importación de ganado entre países. Ambos son emitidos por SENASA pero para fines distintos.',
  },
  {
    question: '¿Puedo modificar un DT-e después de emitido?',
    answer: 'No, el DT-e no puede modificarse una vez emitido. Si hay errores en los datos, debe anularse el documento y generar uno nuevo antes de iniciar el traslado. SENASA permite anular DT-e no utilizados dentro de las 72 horas de vigencia.',
  },
  {
    question: '¿Necesito DT-e para mover ganado dentro de mi campo?',
    answer: 'No, el DT-e solo es obligatorio para traslados entre establecimientos con distinto RENSPA o para movimientos que impliquen circular por vía pública. Movimientos internos dentro del mismo establecimiento (mismo RENSPA) no requieren DT-e.',
  },
]

// HowTo steps for "cómo sacar DT-e" searches
const HOWTO_STEPS = [
  {
    name: 'Acceder a SIGSA',
    text: 'Ingresá a sigsa.senasa.gob.ar con tu CUIT y clave fiscal de AFIP. Si es tu primera vez, debés vincular tu establecimiento ganadero.',
  },
  {
    name: 'Seleccionar tipo de movimiento',
    text: 'Elegí "Solicitar DT-e" y seleccioná el motivo del traslado: venta, faena, invernada, cría, exposición, etc.',
  },
  {
    name: 'Completar origen y destino',
    text: 'Ingresá el RENSPA de origen (tu establecimiento) y el RENSPA de destino. El sistema valida automáticamente los datos.',
  },
  {
    name: 'Detallar la hacienda',
    text: 'Especificá especie, cantidad de cabezas por categoría (terneros, novillos, vacas, etc.) y peso total estimado.',
  },
  {
    name: 'Confirmar y obtener DT-e',
    text: 'Revisá los datos, confirmá y el sistema genera el número de DT-e. Podés imprimirlo o mostrarlo desde el celular en los controles.',
  },
]

export default function DTEPage() {
  return (
    <>
      <SectionBreadcrumbSchema section="dte" sectionName="DT-e" />
      <FAQPageSchema items={DTE_FAQ} />
      <HowToSchema
        name="Cómo tramitar un DT-e en SENASA"
        description="Guía paso a paso para obtener el Documento de Tránsito Electrónico para traslado de ganado en Argentina"
        steps={HOWTO_STEPS}
        totalTime="PT15M"
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-zinc-500 mb-6">
          <Link href="/" className="hover:text-zinc-300">Inicio</Link>
          <span className="mx-2">›</span>
          <span className="text-zinc-400">DT-e</span>
        </nav>

        {/* Hero */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <FileText className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-zinc-100">
                DT-e: Documento de Tránsito Electrónico
              </h1>
              <p className="text-zinc-400 mt-1">
                Guía completa para el traslado legal de ganado en Argentina
              </p>
            </div>
          </div>
        </header>

        {/* Quick summary */}
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-zinc-100 mb-4">¿Qué es el DT-e?</h2>
          <p className="text-zinc-400 leading-relaxed mb-4">
            El <strong className="text-zinc-200">DT-e (Documento de Tránsito Electrónico)</strong> es el documento 
            digital obligatorio emitido por <strong className="text-zinc-200">SENASA</strong> que autoriza el traslado 
            de ganado bovino, ovino, porcino y otras especies entre establecimientos en Argentina.
          </p>
          <p className="text-zinc-400 leading-relaxed">
            Reemplazó a la antigua guía de traslado en papel y es requisito indispensable para el transporte 
            legal de hacienda. Sin DT-e válido, el traslado de ganado es ilegal y puede resultar en decomiso, 
            multas y responsabilidad penal.
          </p>
        </section>

        {/* Key points */}
        <section className="grid gap-4 md:grid-cols-2 mb-10">
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-amber-400" />
              <h3 className="font-medium text-zinc-200">Validez: 72 horas</h3>
            </div>
            <p className="text-sm text-zinc-400">
              Desde la emisión hasta iniciar el traslado. Una vez en movimiento, cubre hasta destino.
            </p>
          </div>
          
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-5 h-5 text-green-400" />
              <h3 className="font-medium text-zinc-200">Emitido por SENASA</h3>
            </div>
            <p className="text-sm text-zinc-400">
              A través del Sistema de Gestión Sanitaria (SIGSA). Requiere CUIT y clave fiscal.
            </p>
          </div>
          
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
              <h3 className="font-medium text-zinc-200">100% digital</h3>
            </div>
            <p className="text-sm text-zinc-400">
              Se genera online y puede mostrarse desde el celular en los controles sanitarios.
            </p>
          </div>
          
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="font-medium text-zinc-200">Obligatorio</h3>
            </div>
            <p className="text-sm text-zinc-400">
              Sin DT-e: decomiso de hacienda, multas +$500.000 e inhabilitación.
            </p>
          </div>
        </section>

        {/* How to get DT-e */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-zinc-100 mb-6">Cómo tramitar un DT-e</h2>
          
          <div className="space-y-4">
            {HOWTO_STEPS.map((step, index) => (
              <div key={index} className="flex gap-4">
                <div className="shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 pb-4 border-b border-zinc-800 last:border-0">
                  <h3 className="font-medium text-zinc-200 mb-1">{step.name}</h3>
                  <p className="text-sm text-zinc-400">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-300">
              <strong>Tip:</strong> El trámite demora aproximadamente 15 minutos la primera vez. 
              Tené a mano el RENSPA de destino antes de empezar.
            </p>
          </div>
        </section>

        {/* DT-e content details */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-zinc-100 mb-6">¿Qué información contiene el DT-e?</h2>
          
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
              <div className="p-5">
                <h3 className="font-medium text-zinc-200 mb-3">Datos del movimiento</h3>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Número único de DT-e
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Fecha de emisión y movimiento
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Motivo del traslado
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Datos del transportista
                  </li>
                </ul>
              </div>
              
              <div className="p-5">
                <h3 className="font-medium text-zinc-200 mb-3">Datos de la hacienda</h3>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    RENSPA origen y destino
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Titular y establecimiento
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Especie y cantidad de cabezas
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Categorías y peso total
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-zinc-100 mb-6">Preguntas Frecuentes sobre DT-e</h2>
          
          <div className="space-y-4">
            {DTE_FAQ.map((item, index) => (
              <details 
                key={index} 
                className="group bg-zinc-900/30 border border-zinc-800 rounded-lg"
              >
                <summary className="flex items-center justify-between p-4 cursor-pointer text-zinc-200 font-medium hover:text-zinc-100">
                  {item.question}
                  <ArrowRight className="w-4 h-4 transform group-open:rotate-90 transition-transform text-zinc-500" />
                </summary>
                <p className="px-4 pb-4 text-sm text-zinc-400 leading-relaxed">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA Section - conversion to /mi-cuenta/guias */}
        <section className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-6 mb-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="p-4 rounded-xl bg-cyan-500/20 shrink-0">
              <Upload className="w-8 h-8 text-cyan-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-zinc-100 mb-2">
                Organizá todos tus DT-e en un solo lugar
              </h3>
              <p className="text-zinc-400 mb-4">
                Con Consignatarias.com.ar podés subir tus DT-e, extraer datos automáticamente con OCR 
                y llevar un historial completo de todas tus operaciones ganaderas.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login?next=/mi-cuenta/guias"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-900 font-medium rounded-lg transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Subir mis DT-e
                </Link>
                <Link
                  href="/planes"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-lg transition-colors"
                >
                  Ver planes PRO
                </Link>
              </div>
            </div>
          </div>
          
          {/* Feature bullets */}
          <div className="grid md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-cyan-500/20">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              Extracción automática con OCR
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              Historial completo de movimientos
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              Análisis de compras y ventas
            </div>
          </div>
        </section>

        {/* Related links */}
        <section className="border-t border-zinc-800 pt-8">
          <h3 className="text-lg font-semibold text-zinc-200 mb-4">Recursos relacionados</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/glosario"
              className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
            >
              📚 Glosario ganadero
            </Link>
            <Link
              href="/remates"
              className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
            >
              📅 Calendario de remates
            </Link>
            <Link
              href="/consignatarias"
              className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
            >
              🏢 Directorio de consignatarias
            </Link>
            <Link
              href="/mercado"
              className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
            >
              📊 Precios del mercado
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 text-xs text-zinc-600">
          <p>
            Última actualización: Marzo 2026. Esta guía es informativa. Para trámites oficiales, 
            consultá <a href="https://www.argentina.gob.ar/senasa" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-400">senasa.gob.ar</a>.
          </p>
        </footer>
      </div>
    </>
  )
}
