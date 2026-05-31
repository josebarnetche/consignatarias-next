import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description:
    'Términos y condiciones de uso de consignatarias.com.ar, operado por Memola Medios S.A.S. Naturaleza del servicio, fuentes de datos, propiedad intelectual, suscripciones, descargo de responsabilidad y solicitudes de remoción.',
  alternates: { canonical: 'https://www.consignatarias.com.ar/terminos' },
}

const UPDATED = '31 de mayo de 2026'

export default function TerminosPage() {
  return (
    <div className="px-4 py-12 max-w-3xl mx-auto text-sm leading-relaxed">
      <h1 className="text-zinc-100 text-2xl font-medium mb-2">Términos y Condiciones de Uso</h1>
      <p className="text-zinc-500 text-xs mb-8 font-mono">Última actualización: {UPDATED}</p>

      <div className="space-y-6 text-zinc-300">
        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">1. Identificación del titular</h2>
          <p className="text-zinc-400">
            El sitio <strong className="text-zinc-200">consignatarias.com.ar</strong> (en adelante, el
            &ldquo;Sitio&rdquo;) es operado por <strong className="text-zinc-200">MEMOLA MEDIOS S.A.S.</strong>{' '}
            (Sociedad por Acciones Simplificada), CUIT 30-71863222-2, con domicilio social en Boulevard Dr.
            Arturo Humberto Illia 63, piso 2, dto. D, barrio Nueva Córdoba, ciudad de Córdoba, Provincia de
            Córdoba, República Argentina (en adelante, &ldquo;Memola&rdquo; o &ldquo;nosotros&rdquo;). Memola
            es una sociedad constituida en la República Argentina cuyo objeto social incluye, entre otras
            actividades, el desarrollo, comercialización y explotación de software y plataformas informáticas
            y la actividad editorial en cualquier soporte. Representante legal: el administrador titular de la
            sociedad. Contacto general:{' '}
            <a href="mailto:agro@memola.com.ar" className="text-sky-400 hover:underline">agro@memola.com.ar</a>.
            Asuntos legales y solicitudes de remoción:{' '}
            <a href="mailto:legales@memola.com.ar" className="text-sky-400 hover:underline">legales@memola.com.ar</a>.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">2. Aceptación de los términos</h2>
          <p className="text-zinc-400">
            El acceso o uso del Sitio implica la aceptación plena y sin reservas de estos Términos y
            Condiciones, de la <Link href="/privacidad" className="text-sky-400 hover:underline">Política de
            Privacidad</Link> y del <Link href="/aviso-legal" className="text-sky-400 hover:underline">Aviso
            Legal y Descargo de Responsabilidad</Link>, que forman parte integral de este acuerdo. Si no está
            de acuerdo con alguno de sus términos, debe abstenerse de utilizar el Sitio.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">3. Naturaleza del servicio</h2>
          <p className="text-zinc-400">
            El Sitio es un <strong className="text-zinc-200">directorio y observatorio de información</strong>{' '}
            del mercado ganadero argentino: calendario de remates, directorio de consignatarias y frigoríficos,
            e indicadores de mercado (INMAG, derivados y series históricas). Memola{' '}
            <strong className="text-zinc-200">no es</strong> consignataria, comisionista, corredor, martillero,
            agente de liquidación y compensación, entidad financiera ni parte de las operaciones de compraventa,
            remate o faena de hacienda. El Sitio no realiza intermediación en dichas operaciones ni garantiza su
            concreción. Toda operación es responsabilidad exclusiva de las partes que la celebren.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">4. Fuentes de la información y base legal del acceso</h2>
          <p className="text-zinc-400">
            La información publicada proviene, según el caso, de <strong className="text-zinc-200">fuentes
            públicas y oficiales</strong> (entre otras, SENASA, MAGYP, Mercado Agroganadero, organismos
            públicos), de fuentes de terceros, de información de acceso público difundida por las propias
            consignatarias y de aportes de los usuarios. El acceso, recopilación y difusión de información
            pública se ampara, entre otras normas, en el derecho de acceso a la información pública (Ley 27.275
            y normas concordantes) y en que los datos, hechos, noticias e informaciones de actualidad no se
            encuentran amparados por el derecho de autor (art. 28 de la Ley 11.723). Memola realiza una labor de
            recopilación, normalización, sistematización y análisis editorial de información lícitamente
            accesible, ejercida de buena fe y con cita de fuente.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">5. Información &ldquo;tal cual&rdquo; — sin garantías</h2>
          <p className="text-zinc-400">
            Toda la información del Sitio se presenta <strong className="text-zinc-200">&ldquo;tal cual&rdquo; y
            &ldquo;según disponibilidad&rdquo;</strong> (&ldquo;as is&rdquo; / &ldquo;as available&rdquo;),
            sin garantía de ningún tipo, expresa o implícita, sobre su exactitud, completitud, vigencia,
            actualidad o idoneidad para un fin determinado. Los datos pueden contener errores, demoras,
            omisiones o desactualizaciones propias de las fuentes de origen o del proceso de recopilación. Los
            indicadores y precios (incluido el INMAG) son <strong className="text-zinc-200">meramente
            informativos y de referencia</strong>, no constituyen una cotización oficial ni un compromiso de
            precio, y no deben usarse como única base para decisiones operativas, comerciales o financieras.
            El detalle del descargo de responsabilidad está en el{' '}
            <Link href="/aviso-legal" className="text-sky-400 hover:underline">Aviso Legal</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">6. No constituye asesoramiento</h2>
          <p className="text-zinc-400">
            El contenido del Sitio tiene finalidad informativa y no constituye asesoramiento financiero, de
            inversión, comercial, contable, impositivo, veterinario, sanitario ni legal. El usuario debe
            validar la información con las fuentes oficiales y con sus asesores profesionales antes de tomar
            cualquier decisión.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">7. Disponibilidad y permanencia del Sitio</h2>
          <p className="text-zinc-400">
            Memola <strong className="text-zinc-200">no garantiza la disponibilidad ininterrumpida ni la
            permanencia del Sitio</strong>, de sus secciones, datos, indicadores, funcionalidades o de la API.
            Nos reservamos el derecho de modificar, suspender, limitar o discontinuar, total o parcialmente y en
            cualquier momento, el Sitio o cualquiera de sus servicios, con o sin aviso previo, sin que ello
            genere derecho a indemnización alguna a favor del usuario, sin perjuicio de los derechos de los
            suscriptores pagos previstos en estos términos y en la normativa de defensa del consumidor.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">8. Modificación de los términos</h2>
          <p className="text-zinc-400">
            Memola puede modificar estos Términos y Condiciones, la Política de Privacidad y el Aviso Legal en
            cualquier momento. Las modificaciones rigen desde su publicación en el Sitio, con indicación de la
            fecha de última actualización. El uso del Sitio con posterioridad a la publicación implica la
            aceptación de la versión vigente. Recomendamos revisar periódicamente estos documentos.{' '}
            Tratándose de <strong className="text-zinc-200">suscripciones pagas</strong>, las modificaciones que
            afecten sustancialmente las condiciones contratadas serán comunicadas con antelación razonable,
            pudiendo el suscriptor rescindir sin penalidad si no las acepta (arts. 985 a 989 del Código Civil y
            Comercial y art. 37 de la Ley 24.240).
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">9. Propiedad intelectual</h2>
          <p className="text-zinc-400">
            La selección, organización, sistematización y presentación de los datos, la base de datos, el
            software, el diseño, la marca, los logotipos, los índices y los contenidos editoriales propios del
            Sitio (incluidos El Oráculo y El Corredor) son de titularidad de Memola o se utilizan con
            autorización, y están protegidos por la Ley 11.723 y normas concordantes. Los datos públicos
            subyacentes (precios, registros oficiales, hechos) no son objeto de apropiación. Queda prohibida la
            reproducción, extracción sustancial, scraping masivo o reutilización sistemática de la base de datos
            o del contenido del Sitio sin autorización escrita de Memola, sin perjuicio de la cita de fuente
            para usos legítimos e informativos.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">10. Cuentas, suscripciones y pagos</h2>
          <p className="text-zinc-400">
            El acceso al directorio y a los datos de mercado es, en general, libre y gratuito. Ciertas
            funcionalidades requieren suscripción paga (PRO Usuario, PRO Consignataria y Enterprise). Los pagos
            en pesos se procesan a través de Rebill y, para Enterprise, también por transferencia o USDT; Memola
            no almacena datos completos de tarjetas. Las suscripciones se renuevan automáticamente por períodos
            sucesivos salvo cancelación. El usuario puede cancelar en cualquier momento desde su cuenta, sin
            penalidad; el acceso continúa hasta el final del período ya abonado. Se reconocen los derechos del
            consumidor previstos en la Ley 24.240 de Defensa del Consumidor, incluido el{' '}
            <strong className="text-zinc-200">derecho de revocación (arrepentimiento)</strong> dentro de los 10
            días corridos para contrataciones a distancia (art. 34 de la Ley 24.240 y art. 1110 del Código Civil
            y Comercial), sin costo ni responsabilidad. El arrepentimiento y la baja de la suscripción pueden
            ejercerse de manera sencilla y gratuita desde la cuenta del usuario o escribiendo a{' '}
            <a href="mailto:agro@memola.com.ar" className="text-sky-400 hover:underline">agro@memola.com.ar</a>,
            conforme a la Resolución 424/2020 de la Secretaría de Comercio Interior.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">11. API Enterprise</h2>
          <p className="text-zinc-400">
            El acceso programático vía API está sujeto a los cupos del plan contratado y a períodos de
            facturación de 28 días. Superar el cupo devuelve{' '}
            <code className="text-zinc-300 bg-zinc-900 px-1">429 quota_exceeded</code>. No está permitido
            revender, sublicenciar ni redistribuir el acceso o los datos de la API sin acuerdo escrito. Memola
            puede suspender claves ante uso abusivo o contrario a estos términos.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">12. Conducta del usuario</h2>
          <p className="text-zinc-400">
            El usuario se obliga a usar el Sitio conforme a la ley, la buena fe y estos términos. Queda
            prohibido, entre otros: vulnerar la seguridad del Sitio, realizar accesos automatizados que
            degraden el servicio, suplantar identidad, cargar información falsa o que infrinja derechos de
            terceros, y todo uso que perjudique a Memola o a otros usuarios.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">13. Perfiles de terceros y solicitudes de remoción</h2>
          <p className="text-zinc-400">
            El Sitio puede incluir perfiles, datos o referencias de consignatarias, frigoríficos y otros
            actores elaborados a partir de información de acceso público. Si usted es titular de un perfil o
            considera que un contenido es inexacto, está desactualizado, infringe derechos o debe ser corregido
            o removido, puede solicitarlo escribiendo a{' '}
            <a href="mailto:legales@memola.com.ar" className="text-sky-400 hover:underline">legales@memola.com.ar</a>,
            indicando el contenido específico, el motivo y su acreditación de legitimación. Analizaremos cada
            solicitud de buena fe y dentro de un plazo razonable. El procedimiento detallado figura en el{' '}
            <Link href="/aviso-legal" className="text-sky-400 hover:underline">Aviso Legal</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">14. Limitación de responsabilidad</h2>
          <p className="text-zinc-400">
            En la máxima medida permitida por la legislación aplicable, Memola, sus socios, administradores y
            colaboradores no serán responsables por daños directos, indirectos, incidentales, lucro cesante o
            pérdida de chance derivados del uso o imposibilidad de uso del Sitio, de la confianza depositada en
            su información, de errores u omisiones en los datos, de la indisponibilidad o discontinuación del
            servicio, ni de decisiones tomadas en base a su contenido. Esta limitación{' '}
            <strong className="text-zinc-200">no alcanza los supuestos de dolo o culpa grave</strong> (art. 1743
            del Código Civil y Comercial de la Nación), los daños que la ley no permita limitar, ni los derechos
            irrenunciables que la Ley 24.240 reconoce a los usuarios consumidores.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">15. Indemnidad</h2>
          <p className="text-zinc-400">
            El usuario mantendrá indemne a Memola frente a reclamos de terceros derivados del uso indebido del
            Sitio o del incumplimiento de estos términos por su parte.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">16. Ley aplicable y jurisdicción</h2>
          <p className="text-zinc-400">
            Estos términos se rigen por las leyes de la República Argentina. Para toda controversia serán
            competentes los tribunales ordinarios de la ciudad de Córdoba, Provincia de Córdoba, salvo que se
            trate de una relación de consumo, en cuyo caso será competente el tribunal del domicilio del
            consumidor, siendo nula toda prórroga en su contra (art. 36 de la Ley 24.240 y art. 2654 del Código
            Civil y Comercial).
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">17. Contacto</h2>
          <p className="text-zinc-400">
            Consultas y reclamos:{' '}
            <a href="mailto:agro@memola.com.ar" className="text-sky-400 hover:underline">agro@memola.com.ar</a>.
            Asuntos legales, datos personales y remociones:{' '}
            <a href="mailto:legales@memola.com.ar" className="text-sky-400 hover:underline">legales@memola.com.ar</a>.
          </p>
        </section>
      </div>

      <p className="text-zinc-600 text-xs mt-12 flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/privacidad" className="hover:text-zinc-400">Política de privacidad →</Link>
        <Link href="/aviso-legal" className="hover:text-zinc-400">Aviso legal y descargo →</Link>
      </p>
    </div>
  )
}
