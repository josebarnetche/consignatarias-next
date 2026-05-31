import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Aviso Legal y Descargo de Responsabilidad',
  description:
    'Aviso legal de consignatarias.com.ar (Memola Medios S.A.S.): información presentada "tal cual" desde fuentes públicas sin garantía, sin garantía de permanencia del sitio, y procedimiento de solicitudes de remoción a legales@memola.com.ar.',
  alternates: { canonical: 'https://www.consignatarias.com.ar/aviso-legal' },
}

const UPDATED = '31 de mayo de 2026'

export default function AvisoLegalPage() {
  return (
    <div className="px-4 py-12 max-w-3xl mx-auto text-sm leading-relaxed">
      <h1 className="text-zinc-100 text-2xl font-medium mb-2">Aviso Legal y Descargo de Responsabilidad</h1>
      <p className="text-zinc-500 text-xs mb-8 font-mono">Última actualización: {UPDATED}</p>

      <div className="space-y-6 text-zinc-300">
        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">1. Titular</h2>
          <p className="text-zinc-400">
            consignatarias.com.ar (el &ldquo;Sitio&rdquo;) es operado por{' '}
            <strong className="text-zinc-200">MEMOLA MEDIOS S.A.S.</strong>, CUIT 30-71863222-2, con domicilio
            social en Boulevard Dr. Arturo Humberto Illia 63, piso 2, dto. D, Nueva Córdoba, ciudad de Córdoba,
            Provincia de Córdoba, República Argentina. Este Aviso Legal complementa los{' '}
            <Link href="/terminos" className="text-sky-400 hover:underline">Términos y Condiciones</Link> y la{' '}
            <Link href="/privacidad" className="text-sky-400 hover:underline">Política de Privacidad</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">2. Información &ldquo;tal cual&rdquo;, sin garantía</h2>
          <p className="text-zinc-400">
            Toda la información publicada en el Sitio —incluyendo precios, el índice INMAG y sus derivados,
            series históricas, calendario de remates, perfiles de consignatarias y frigoríficos, y datos de
            habilitación— se ofrece <strong className="text-zinc-200">&ldquo;tal cual&rdquo; (&ldquo;as is&rdquo;)
            y &ldquo;según disponibilidad&rdquo;</strong>, con fines exclusivamente informativos y de referencia.
            Memola <strong className="text-zinc-200">no garantiza</strong> la exactitud, completitud, vigencia,
            actualidad, continuidad ni idoneidad de dicha información para ningún fin particular, ni que esté
            libre de errores, demoras u omisiones.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">3. Origen de la información</h2>
          <p className="text-zinc-400">
            Los datos provienen de <strong className="text-zinc-200">fuentes públicas, oficiales y de
            terceros</strong> (entre otras, SENASA, MAGYP, Mercado Agroganadero, organismos públicos y sitios
            oficiales) y de aportes de usuarios. Memola realiza una tarea lícita de recopilación,
            sistematización y análisis editorial de información de acceso público, amparada —entre otras normas—
            en el derecho de acceso a la información pública (Ley 27.275) y en que los datos, hechos y noticias
            de actualidad no están amparados por el derecho de autor (art. 28, Ley 11.723). Memola no responde
            por errores u omisiones originados en las fuentes ni por la falta de actualización de éstas.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">4. No es asesoramiento</h2>
          <p className="text-zinc-400">
            Nada en el Sitio constituye asesoramiento financiero, de inversión, comercial, contable,
            impositivo, veterinario, sanitario ni legal, ni una oferta o recomendación de compra o venta. Las
            decisiones que el usuario tome en base a la información del Sitio son de su exclusiva
            responsabilidad. Validá siempre con las fuentes oficiales y con tus asesores profesionales.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">5. Sin garantía de permanencia ni continuidad</h2>
          <p className="text-zinc-400">
            Memola <strong className="text-zinc-200">no garantiza la permanencia, disponibilidad ni continuidad
            del Sitio</strong> ni de ninguna de sus secciones, datos, indicadores, funcionalidades o de la API.
            Podemos modificar, suspender, limitar o discontinuar el Sitio o cualquier servicio, en forma total o
            parcial, en cualquier momento y sin aviso previo, sin que ello genere responsabilidad ni derecho a
            indemnización alguna, sin perjuicio de los derechos de los suscriptores pagos y de los consumidores.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">6. Limitación de responsabilidad</h2>
          <p className="text-zinc-400">
            En la máxima medida permitida por la ley, Memola y sus socios, administradores y colaboradores no
            serán responsables por daños de ninguna naturaleza (directos, indirectos, incidentales, lucro
            cesante o pérdida de chance) derivados del uso o la imposibilidad de uso del Sitio, de la confianza
            en su información, de errores u omisiones, o de su indisponibilidad o discontinuación. Esta
            limitación <strong className="text-zinc-200">no alcanza los supuestos de dolo o culpa grave</strong>{' '}
            (art. 1743 del Código Civil y Comercial) ni los derechos irrenunciables reconocidos a los
            consumidores por la Ley 24.240.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">7. Enlaces y contenidos de terceros</h2>
          <p className="text-zinc-400">
            El Sitio puede contener enlaces a sitios de terceros (consignatarias, organismos, videos, etc.).
            Memola no controla ni se responsabiliza por el contenido, las políticas ni las prácticas de dichos
            sitios.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">8. Solicitudes de remoción y corrección (takedown)</h2>
          <p className="text-zinc-400">
            Si usted es titular de un perfil, un derecho o un dato, o su representante legitimado, y considera
            que un contenido del Sitio es inexacto, está desactualizado, infringe derechos de propiedad
            intelectual o de terceros, o debe corregirse o removerse, puede solicitarlo a{' '}
            <a href="mailto:legales@memola.com.ar" className="text-sky-400 hover:underline">legales@memola.com.ar</a>.
          </p>
          <p className="text-zinc-400 mt-2">Para agilizar el trámite, incluí en tu solicitud:</p>
          <ul className="text-zinc-400 space-y-1 list-disc list-inside mt-1">
            <li>URL exacta y descripción del contenido objetado.</li>
            <li>Motivo del pedido (inexactitud, desactualización, infracción, datos personales, etc.).</li>
            <li>Tu identificación y, en su caso, acreditación de legitimación o representación.</li>
            <li>Datos de contacto para responderte.</li>
          </ul>
          <p className="text-zinc-400 mt-2">
            Analizaremos cada solicitud de buena fe y dentro de un plazo razonable, pudiendo corregir, remover o
            mantener el contenido según corresponda en derecho, y pudiendo requerir información adicional. Los
            pedidos vinculados a datos personales se rigen además por la{' '}
            <Link href="/privacidad" className="text-sky-400 hover:underline">Política de Privacidad</Link>{' '}
            (Ley 25.326).
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">9. Propiedad intelectual</h2>
          <p className="text-zinc-400">
            La base de datos, el software, el diseño, la marca, los logotipos, los índices y los contenidos
            editoriales propios del Sitio están protegidos por la Ley 11.723. Queda prohibida su reproducción,
            extracción sustancial o reutilización sistemática sin autorización escrita de Memola, sin perjuicio
            de la cita de fuente para usos legítimos e informativos.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">10. Ley aplicable y cambios</h2>
          <p className="text-zinc-400">
            Este Aviso Legal se rige por las leyes de la República Argentina y puede modificarse en cualquier
            momento; las modificaciones rigen desde su publicación. Jurisdicción: tribunales de la ciudad de
            Córdoba, salvo relación de consumo (domicilio del consumidor, Ley 24.240).
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">11. Contacto legal</h2>
          <p className="text-zinc-400">
            Asuntos legales, datos personales y solicitudes de remoción:{' '}
            <a href="mailto:legales@memola.com.ar" className="text-sky-400 hover:underline">legales@memola.com.ar</a>.
          </p>
        </section>
      </div>

      <p className="text-zinc-600 text-xs mt-12 flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/terminos" className="hover:text-zinc-400">← Términos y condiciones</Link>
        <Link href="/privacidad" className="hover:text-zinc-400">Política de privacidad →</Link>
      </p>
    </div>
  )
}
