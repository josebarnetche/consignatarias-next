import type { Metadata } from 'next'
import Link from 'next/link'
import marketData from '@/lib/data/market-prices.json'

const APP_URL = 'https://www.consignatarias.com.ar'

export const metadata: Metadata = {
  title: 'El Oráculo — el precio que el mercado bovino argentino sigue todos los días',
  description:
    'Manifiesto fundacional de consignatarias.com.ar. INMAG como oracle del 88% del mercado, marco institucional, bibliografía citada (FCV-UBA, Iriarte/CACG, Diez/UNS, Scoponi). PDF abierto, sin email gate.',
  alternates: { canonical: `${APP_URL}/el-oraculo` },
  openGraph: {
    title: 'El Oráculo — consignatarias.com.ar',
    description:
      'El precio que el mercado bovino argentino sigue todos los días. Manifiesto fundacional.',
    url: `${APP_URL}/el-oraculo`,
    type: 'article',
    images: [
      {
        url: `${APP_URL}/el-oraculo/og.png`,
        width: 1200,
        height: 630,
        alt: 'El Oráculo — consignatarias.com.ar',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'El Oráculo — consignatarias.com.ar',
    description: 'El precio que el mercado bovino argentino sigue todos los días.',
    images: [`${APP_URL}/el-oraculo/og.png`],
  },
}

const inmag = marketData.inmag
const closeFmt = `$${Math.round(inmag.current).toLocaleString('es-AR')}`

const SECTIONS = [
  { num: 'I', title: 'Qué era Liniers', body: '1607-2018. 800km de radio. Las 5 razones de formación de precio (Iriarte cap. 6).' },
  { num: 'II', title: 'Por qué fijó el precio del 88%', body: 'La paradoja: <15% del volumen, >80% del peso en precio. Cómo y por qué (FCV-UBA p.3).' },
  { num: 'III', title: 'El cierre de 2018 y lo que vino', body: 'Mudanza a MAG-Cañuelas. INMAG como nuevo benchmark. Vacío académico post-cierre reconocido.' },
  { num: 'IV', title: 'El 88% que no tiene huella de precio', body: 'Las 4 vías sin price discovery formal. Triangulación FCV-UBA vs Iriarte ONCCA 2007.' },
  { num: 'V', title: 'La consignataria como ALyC del agro', body: 'Broker + dealer + clearing + custodia + garantía. El reframe que ningún paper nombró.' },
  { num: 'VI', title: 'INMAG hoy — el Merval del agro', body: 'Cierre diario, serie histórica, INMAG en USD reales, comparable interanual.' },
  { num: 'VII', title: 'Los indicadores que componen el oracle', body: 'INMAG cierre, variación intermensual + interanual USD, faena nacional, ratio T/N, 18 buckets reales.' },
  { num: 'VIII', title: 'Lo que está faltando — agenda 2026-2030', body: 'Continuidad académica post-2018. Captura del 78% privado. Marco regulatorio ALyC ganadera.' },
]

export default function ElOraculoLanding() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-950/20 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-sky-500/5 blur-[150px] rounded-full" />

        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-20 lg:pt-24 lg:pb-32">
          <div className="flex items-center gap-3 mb-8">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inset-0 rounded-full bg-sky-400/40 animate-ping" />
              <span className="relative rounded-full h-2.5 w-2.5 bg-sky-400" />
            </span>
            <span className="text-xs font-mono uppercase tracking-[0.22em] text-sky-400 font-semibold">
              Manifiesto fundacional · consignatarias.com
            </span>
          </div>

          <h1 className="font-mono font-bold uppercase tracking-tight text-white text-6xl md:text-8xl lg:text-9xl leading-[0.9] mb-8">
            El Oráculo
          </h1>

          <p className="text-xl md:text-2xl text-zinc-300 leading-relaxed mb-10 max-w-3xl font-mono">
            El precio que el mercado bovino argentino sigue todos los días — verificable, citable, sin épica.
          </p>

          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3 mb-10 pb-8 border-b border-zinc-800">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Snapshot</span>
            <span className="text-sm font-mono text-zinc-300">
              INMAG cierre <span className="text-white font-semibold">{closeFmt}</span>
            </span>
            <span className="text-zinc-700">·</span>
            <span className="text-sm font-mono text-zinc-300">
              Mercado no-MAG <span className="text-white font-semibold">88%</span>
            </span>
            <span className="text-zinc-700">·</span>
            <span className="text-sm font-mono text-emerald-400">
              5 fuentes canónicas citadas
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <a
              href="/el-oraculo/manifiesto.pdf"
              className="inline-flex items-center gap-2 bg-sky-400 hover:bg-sky-300 active:bg-sky-500 text-zinc-950 font-mono font-bold uppercase tracking-widest text-sm px-6 py-3 rounded transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Descargar manifiesto (PDF) →
            </a>
            <Link
              href="/mercado/inmag"
              className="inline-flex items-center gap-2 border border-zinc-700 hover:border-sky-400 text-zinc-300 hover:text-sky-400 font-mono uppercase tracking-widest text-sm px-6 py-3 rounded transition-colors"
            >
              Ver INMAG en vivo
            </Link>
          </div>

          <p className="text-xs font-mono text-zinc-500 mt-6 max-w-2xl">
            Documento abierto, sin email. La actualización mensual con datos del mes (
            <Link href="/el-corredor" className="text-sky-400 hover:text-sky-300 transition-colors">
              El Corredor
            </Link>
            ) sí requiere suscripción.
          </p>
        </div>
      </section>

      {/* SECCIONES */}
      <section className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-16 lg:py-24">
          <div className="mb-12">
            <div className="text-xs font-mono uppercase tracking-[0.22em] text-sky-400 font-semibold mb-4">
              · 8 secciones del manifiesto
            </div>
            <h2 className="text-3xl lg:text-4xl font-mono font-bold text-white tracking-tight max-w-3xl">
              Lo que vas a leer en el documento
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-px bg-zinc-800 border border-zinc-800 rounded">
            {SECTIONS.map((s) => (
              <div key={s.num} className="bg-zinc-950 p-6 hover:bg-zinc-900/50 transition-colors">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-sky-400 font-mono text-base font-semibold">§ {s.num}</span>
                  <h3 className="text-white font-mono font-semibold text-sm">{s.title}</h3>
                </div>
                <p className="text-zinc-400 text-sm font-mono leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESIS CENTRAL */}
      <section className="border-b border-zinc-800 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto px-4 py-16 lg:py-24">
          <div className="text-xs font-mono uppercase tracking-[0.22em] text-sky-400 font-semibold mb-4 text-center">
            · Reframe estratégico
          </div>
          <h2 className="text-3xl lg:text-4xl font-mono font-bold text-white tracking-tight mb-8 text-center max-w-3xl mx-auto">
            La consignataria es funcionalmente una ALyC
          </h2>

          <div className="bg-zinc-950 border border-sky-500/30 rounded p-6 lg:p-8 font-mono text-sm leading-relaxed">
            <p className="text-zinc-300 mb-4">
              Cuatro fuentes canónicas coinciden sin nombrarlo así: el corredor de hacienda argentino integra cinco
              funciones que en el mercado financiero formal están reguladas y separadas — <span className="text-sky-400">broker</span>,
              <span className="text-sky-400"> dealer</span>, <span className="text-sky-400">custodia</span>,
              <span className="text-sky-400"> clearing</span> y <span className="text-sky-400">garantía de cobro</span>.
            </p>
            <p className="text-zinc-300 mb-4">
              Pero <strong className="text-white">no existe categoría regulatoria ALyC ganadera</strong> en Argentina.
              El gremio opera con marco SENASA + AFIP fragmentado, sin capital mínimo CNV, sin reporting estandarizado.
              MAG-Cañuelas hereda el rol formador de precio de Liniers (que cerró en 2018), y el INMAG es la única
              referencia auditable del 88% del mercado que no pasa por rueda pública.
            </p>
            <p className="text-zinc-400 text-xs mt-6 pt-4 border-t border-zinc-800 italic">
              Bibliografía base: FCV-UBA (Gil/Fornieles/Demarco, 2018) · CACG (Iriarte, 2008) · UNS (Diez, 2020) ·
              UNS-CEA (Santi &amp; Scoponi, 2018) · Decreto 640/2024 · RESOL-2018-32-APN-SGA.
            </p>
          </div>
        </div>
      </section>

      {/* QUIÉNES Y QUÉ MÁS */}
      <section className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-16 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <div className="text-xs font-mono uppercase tracking-[0.22em] text-sky-400 font-semibold mb-4">
                · Quiénes
              </div>
              <h2 className="text-2xl lg:text-3xl font-mono font-bold text-white tracking-tight mb-6">
                Mesa de mercado · consignatarias.com
              </h2>
              <p className="text-zinc-300 font-mono leading-relaxed mb-4">
                Equipo de research del observatorio del mercado bovino argentino. Datos oficiales,
                metodología abierta, bibliografía citada.
              </p>
              <p className="text-zinc-400 font-mono text-sm leading-relaxed mb-6">
                Operamos consignatarias.com.ar como infraestructura informacional del sector y publicamos
                research mensual (El Corredor) + manifiestos fundacionales (este documento) + investigación
                bibliográfica continua.
              </p>
              <Link
                href="/quienes-somos"
                className="text-sky-400 hover:text-sky-300 font-mono text-sm transition-colors"
              >
                Más sobre la mesa →
              </Link>
            </div>

            <div>
              <div className="text-xs font-mono uppercase tracking-[0.22em] text-sky-400 font-semibold mb-4">
                · Productos relacionados
              </div>
              <h2 className="text-2xl lg:text-3xl font-mono font-bold text-white tracking-tight mb-6">
                Cómo continúa la lectura
              </h2>
              <ul className="space-y-4">
                <li>
                  <Link href="/el-corredor" className="block group bg-zinc-900/40 border border-zinc-800 hover:border-sky-500/40 rounded p-4 transition-colors">
                    <div className="text-sky-400 font-mono text-xs uppercase tracking-widest mb-1">Mensual</div>
                    <div className="text-white font-mono font-semibold mb-1">El Corredor</div>
                    <div className="text-zinc-400 font-mono text-xs">
                      Cierre mensual del mercado bovino argentino · 12 páginas · PDF gratis con email
                    </div>
                  </Link>
                </li>
                <li>
                  <Link href="/mercado/inmag" className="block group bg-zinc-900/40 border border-zinc-800 hover:border-sky-500/40 rounded p-4 transition-colors">
                    <div className="text-emerald-400 font-mono text-xs uppercase tracking-widest mb-1">En vivo</div>
                    <div className="text-white font-mono font-semibold mb-1">INMAG diario</div>
                    <div className="text-zinc-400 font-mono text-xs">
                      Cierre del día + serie histórica + comparable interanual USD reales
                    </div>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl lg:text-5xl font-mono font-bold text-white tracking-tight mb-6 leading-tight">
            <span className="text-sky-400">El Oráculo</span> — abierto, citable,<br />sin épica.
          </h2>
          <p className="text-zinc-400 font-mono mb-10 max-w-2xl mx-auto">
            Manifiesto fundacional del observatorio del mercado bovino argentino. Bibliografía citada,
            metodología abierta. Documento vivo, próxima revisión en sesión ordinaria de la mesa.
          </p>
          <a
            href="/el-oraculo/manifiesto.pdf"
            className="inline-flex items-center gap-2 bg-sky-400 hover:bg-sky-300 active:bg-sky-500 text-zinc-950 font-mono font-bold uppercase tracking-widest text-sm px-8 py-3.5 rounded transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Descargar PDF →
          </a>
          <p className="text-xs font-mono text-zinc-600 mt-4">
            Documento abierto · sin email · sin tarjeta
          </p>
        </div>
      </section>

      <footer className="py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-zinc-600 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400/60" />
              <span className="text-zinc-400">consignatarias.com</span>
              <span className="text-zinc-700 mx-1">·</span>
              <span>Mercado Decision Infrastructure</span>
            </div>
            <div className="flex gap-4">
              <Link href="/" className="hover:text-zinc-300 transition-colors">Sitio</Link>
              <Link href="/el-corredor" className="hover:text-zinc-300 transition-colors">El Corredor</Link>
              <Link href="/mercado/inmag" className="hover:text-zinc-300 transition-colors">INMAG en vivo</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
