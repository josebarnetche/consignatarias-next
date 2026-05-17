import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description: 'Términos y condiciones de uso de consignatarias.com.ar. Información sobre el uso del directorio, datos publicados y suscripciones.',
  alternates: {
    canonical: 'https://www.consignatarias.com.ar/terminos',
  },
}

export default function TerminosPage() {
  return (
    <div className="px-4 py-12 max-w-3xl mx-auto text-sm leading-relaxed">
      <h1 className="text-zinc-100 text-2xl font-medium mb-2">Términos y Condiciones</h1>
      <p className="text-zinc-500 text-xs mb-8 font-mono">
        Última actualización: 12 de mayo de 2026
      </p>

      <div className="space-y-6 text-zinc-300">
        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">1. Sobre el servicio</h2>
          <p className="text-zinc-400">
            Consignatarias.com.ar es un directorio de remates ganaderos, consignatarias y
            frigoríficos de Argentina, operado por <strong className="text-zinc-200">Memola Medios S.A.S.</strong>{' '}
            (CUIT 30-71863222-2). Los datos del directorio provienen de fuentes públicas
            (SENASA, MAGYP, sitios oficiales de consignatarias) y de aportes de los propios
            usuarios. No somos parte de las operaciones de compraventa.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">2. Uso del sitio</h2>
          <p className="text-zinc-400">
            El acceso al directorio es libre. Algunas funcionalidades premium requieren
            suscripción paga (PRO Usuario, PRO Consignataria, Enterprise). El uso del sitio
            implica aceptación de estos términos.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">3. Datos del mercado</h2>
          <p className="text-zinc-400">
            Los precios INMAG, calendario de remates y datos de mercado se actualizan
            automáticamente desde fuentes oficiales. Son meramente informativos y no
            constituyen asesoramiento financiero ni comercial. Validá siempre antes de
            tomar decisiones operativas.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">4. Suscripciones y pagos</h2>
          <p className="text-zinc-400">
            Procesamos pagos a través de Rebill (Argentina) y, para Enterprise, transferencia
            bancaria o USDT. Las suscripciones se renuevan automáticamente cada mes salvo
            cancelación. Podés cancelar en cualquier momento desde tu cuenta sin penalidad —
            el acceso PRO continúa hasta el final del período pago.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">5. API Enterprise</h2>
          <p className="text-zinc-400">
            El acceso programático vía API está sujeto a los cupos mensuales del plan
            contratado. Superar el cupo devuelve <code className="text-zinc-300 bg-zinc-900 px-1">429 quota_exceeded</code>.
            Te avisamos por email al llegar al 80%. No revendas la API sin acuerdo escrito.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">6. Limitación de responsabilidad</h2>
          <p className="text-zinc-400">
            El servicio se ofrece &ldquo;tal cual&rdquo;. No garantizamos disponibilidad ininterrumpida
            ni precisión absoluta de los datos. No somos responsables por pérdidas derivadas
            de decisiones tomadas en base a información del sitio.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">7. Contacto</h2>
          <p className="text-zinc-400">
            Para consultas o reclamos:{' '}
            <a href="mailto:agro@memola.com.ar" className="text-sky-400 hover:underline">
              agro@memola.com.ar
            </a>
            .
          </p>
        </section>
      </div>

      <p className="text-zinc-600 text-xs mt-12">
        <Link href="/privacidad" className="hover:text-zinc-400">
          Política de privacidad →
        </Link>
      </p>
    </div>
  )
}
