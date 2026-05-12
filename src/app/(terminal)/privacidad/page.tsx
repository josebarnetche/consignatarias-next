import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidad | Consignatarias.com.ar',
  description: 'Cómo recolectamos, usamos y protegemos tus datos personales en consignatarias.com.ar.',
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/privacidad',
  },
}

export default function PrivacidadPage() {
  return (
    <div className="px-4 py-12 max-w-3xl mx-auto text-sm leading-relaxed">
      <h1 className="text-zinc-100 text-2xl font-medium mb-2">Política de Privacidad</h1>
      <p className="text-zinc-500 text-xs mb-8 font-mono">
        Última actualización: 12 de mayo de 2026
      </p>

      <div className="space-y-6 text-zinc-300">
        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">1. Responsable del tratamiento</h2>
          <p className="text-zinc-400">
            <strong className="text-zinc-200">Memola Medios S.A.S.</strong>, CUIT
            30-71863222-2, operadora de consignatarias.com.ar, es la responsable del
            tratamiento de tus datos personales conforme a la Ley 25.326 de Protección de
            Datos Personales (Argentina).
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">2. Qué datos recolectamos</h2>
          <ul className="text-zinc-400 space-y-1 list-disc list-inside">
            <li>Email + nombre al crear cuenta o suscribirte al newsletter.</li>
            <li>Datos de facturación al contratar un plan PRO o Enterprise (procesados por Rebill, no almacenamos números de tarjeta).</li>
            <li>Datos de uso anónimos (Google Analytics 4, sin PII).</li>
            <li>Logs técnicos (IP, user-agent) para seguridad y debugging.</li>
            <li>API keys y uso de la API (para usuarios Enterprise).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">3. Para qué los usamos</h2>
          <p className="text-zinc-400">
            Operar el servicio, procesar suscripciones, enviar el newsletter al que te
            suscribiste, avisos relacionados con tu cuenta, alertas de cuota API, y
            métricas agregadas de uso. No vendemos ni cedemos tus datos a terceros para
            publicidad.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">4. Cookies</h2>
          <p className="text-zinc-400">
            Usamos cookies estrictamente necesarias (sesión, autenticación) y de
            analítica (Google Analytics). Podés bloquearlas desde tu navegador.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">5. Tus derechos</h2>
          <p className="text-zinc-400">
            Podés solicitar acceso, rectificación, cancelación o portabilidad de tus
            datos personales escribiendo a{' '}
            <a href="mailto:agro@memola.com.ar" className="text-sky-400 hover:underline">
              agro@memola.com.ar
            </a>
            . Respondemos en menos de 10 días hábiles.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">6. Conservación</h2>
          <p className="text-zinc-400">
            Mantenemos tus datos mientras tengas cuenta activa + 5 años para cumplimiento
            fiscal/contable. Al cancelar tu cuenta podés solicitar borrado completo.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">7. Procesadores</h2>
          <p className="text-zinc-400">
            Algunos datos pasan por: Supabase (auth + base de datos), Vercel (hosting),
            Resend (emails transaccionales), Rebill (pagos en ARS), Google Analytics 4
            (métricas). Todos cuentan con sus propias políticas de privacidad.
          </p>
        </section>
      </div>

      <p className="text-zinc-600 text-xs mt-12">
        <Link href="/terminos" className="hover:text-zinc-400">
          ← Términos y condiciones
        </Link>
      </p>
    </div>
  )
}
