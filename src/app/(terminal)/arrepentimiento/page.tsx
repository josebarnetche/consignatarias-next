import type { Metadata } from 'next'
import Link from 'next/link'
import ArrepentimientoForm from './ArrepentimientoForm'

export const metadata: Metadata = {
  title: 'Botón de Arrepentimiento',
  description:
    'Ejercé tu derecho de arrepentimiento (art. 34 Ley 24.240, Res. 424/2020) en consignatarias.com.ar: cancelá una contratación a distancia dentro de los 10 días, sin costo. Operado por Memola Medios S.A.S.',
  alternates: { canonical: 'https://www.consignatarias.com.ar/arrepentimiento' },
}

export default function ArrepentimientoPage() {
  return (
    <div className="px-4 py-12 max-w-3xl mx-auto text-sm leading-relaxed">
      <div className="mb-2 text-xxs font-terminal uppercase tracking-wider text-zinc-500">
        <Link href="/terminos" className="hover:text-zinc-300">Términos</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Botón de Arrepentimiento</span>
      </div>

      <h1 className="text-zinc-100 text-2xl font-medium mb-2">Botón de Arrepentimiento</h1>
      <p className="text-zinc-400 mb-6">
        Si contrataste un plan a distancia (PRO Consignataria o Enterprise) podés{' '}
        <strong className="text-zinc-200">arrepentirte dentro de los 10 días corridos</strong> y dejarlo sin
        efecto, <strong className="text-zinc-200">sin costo ni responsabilidad</strong>, conforme al art. 34 de
        la Ley 24.240 de Defensa del Consumidor, el art. 1110 del Código Civil y Comercial y la Resolución
        424/2020 de la Secretaría de Comercio Interior.
      </p>

      <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-5 mb-8 text-zinc-400 space-y-2">
        <p className="text-zinc-200 font-medium">Cómo ejercerlo</p>
        <p>
          1) Si tenés una suscripción activa, podés darla de baja de inmediato desde{' '}
          <Link href="/cuenta" className="text-sky-400 hover:underline">tu cuenta</Link>.
        </p>
        <p>
          2) O completá el formulario de abajo. Recibirás una confirmación por email y procesaremos la baja y,
          si correspondiere, el reintegro, en los plazos legales.
        </p>
        <p>
          3) También podés escribirnos a{' '}
          <a href="mailto:agro@memola.com.ar" className="text-sky-400 hover:underline">agro@memola.com.ar</a>{' '}
          o, para asuntos legales,{' '}
          <a href="mailto:legales@memola.com.ar" className="text-sky-400 hover:underline">legales@memola.com.ar</a>.
        </p>
      </div>

      <div className="terminal-panel">
        <div className="terminal-panel-header">Formulario de arrepentimiento</div>
        <div className="px-panel py-5">
          <ArrepentimientoForm />
        </div>
      </div>

      <p className="text-zinc-600 text-xs mt-8">
        Memola Medios S.A.S. · CUIT 30-71863222-2 ·{' '}
        <Link href="/terminos" className="hover:text-zinc-400">Términos y Condiciones</Link>
        {' · '}
        <Link href="/aviso-legal" className="hover:text-zinc-400">Aviso Legal</Link>
      </p>
    </div>
  )
}
