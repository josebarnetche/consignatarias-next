import { Metadata } from 'next'
import Link from 'next/link'
import Breadcrumb from '@/components/ui/Breadcrumb'
import RenspaValidator from '@/components/sanidad/RenspaValidator'

export const metadata: Metadata = {
  title: 'Validador de RENSPA — decodificá el código de tu establecimiento | Consignatarias',
  description:
    'Pegá un RENSPA (Registro Nacional Sanitario de Productores Agropecuarios) y decodificá sus 17 caracteres (00.000.0.00000.00) en provincia, departamento, jurisdicción, establecimiento y productor. Valida la estructura al instante.',
  keywords: [
    'RENSPA', 'validar RENSPA', 'decodificar RENSPA', 'formato RENSPA', 'código RENSPA',
    'SENASA', 'establecimiento agropecuario', 'productor agropecuario', 'consulta RENSPA',
  ],
  alternates: { canonical: 'https://www.consignatarias.com.ar/renspa' },
}

export default function RenspaPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 font-sans">
      <Breadcrumb items={[{ name: 'Herramientas', href: '/calculadora' }, { name: 'Validador de RENSPA' }]} />

      <header className="mt-4 mb-6">
        <p className="text-xxs uppercase tracking-widest text-accent mb-2">Herramienta</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-white text-balance">Validador de RENSPA</h1>
        <p className="mt-3 text-zinc-400 max-w-2xl">
          Pegá un código RENSPA y te lo descompongo en sus segmentos. Se valida la estructura (17 caracteres,
          formato <span className="font-terminal text-zinc-300">00.000.0.00000.00</span>), no la vigencia.
        </p>
      </header>

      <RenspaValidator />

      {/* Qué es */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white mb-3">Qué es el RENSPA</h2>
        <p className="text-data text-zinc-400">
          El <strong className="text-zinc-200">Registro Nacional Sanitario de Productores Agropecuarios</strong> asocia
          productor + establecimiento + actividad. Es la base del sistema sanitario: sin RENSPA vigente no se registra la
          vacunación ni se emite el DT-e para mover hacienda. El código tiene 17 caracteres:
        </p>
        <ul className="mt-3 space-y-1 text-data text-zinc-300">
          <li><span className="font-terminal text-accent">PP</span> — provincia (2 dígitos)</li>
          <li><span className="font-terminal text-accent">DDD</span> — departamento o partido (3)</li>
          <li><span className="font-terminal text-accent">J</span> — jurisdicción de la oficina local (1)</li>
          <li><span className="font-terminal text-accent">EEEEE</span> — establecimiento/predio, único en el departamento (5)</li>
          <li><span className="font-terminal text-accent">RR</span> — productor dentro del predio (2)</li>
        </ul>
      </section>

      {/* Enlaces */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <a
          href="https://aps2.senasa.gov.ar/registros/faces/publico/personas/tc_productoresagropecuarios.jsp"
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-terminal border border-terminal-border bg-terminal-panel p-4 hover:border-accent transition-colors"
        >
          <h3 className="text-data font-semibold text-white group-hover:text-accent">Consultar vigencia en SENASA ↗</h3>
          <p className="mt-1 text-data text-zinc-400">Búsqueda pública de productores agropecuarios.</p>
        </a>
        <Link href="/sanidad" className="group rounded-terminal border border-terminal-border bg-terminal-panel p-4 hover:border-accent transition-colors">
          <h3 className="text-data font-semibold text-white group-hover:text-accent">Sanidad ganadera →</h3>
          <p className="mt-1 text-data text-zinc-400">Vacunación, requisitos de movimiento y DT-e.</p>
        </Link>
      </section>

      <p className="mt-8 text-xxs text-zinc-600">
        Fuente del formato: Infoleg (norma 69503) e instructivo de actualización RENSPA (MAGyP). La validación es de
        estructura; la existencia y vigencia se confirman en SENASA.
      </p>
    </div>
  )
}
