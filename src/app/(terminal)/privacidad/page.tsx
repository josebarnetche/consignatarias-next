import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description:
    'Cómo Memola Medios S.A.S. recolecta, usa y protege tus datos personales en consignatarias.com.ar, conforme a la Ley 25.326 de Protección de Datos Personales.',
  alternates: { canonical: 'https://www.consignatarias.com.ar/privacidad' },
}

const UPDATED = '6 de julio de 2026'

export default function PrivacidadPage() {
  return (
    <div className="px-4 py-12 max-w-3xl mx-auto text-sm leading-relaxed">
      <h1 className="text-zinc-100 text-2xl font-medium mb-2">Política de Privacidad</h1>
      <p className="text-zinc-500 text-xs mb-8 font-mono">Última actualización: {UPDATED}</p>

      <div className="space-y-6 text-zinc-300">
        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">1. Responsable del tratamiento</h2>
          <p className="text-zinc-400">
            <strong className="text-zinc-200">MEMOLA MEDIOS S.A.S.</strong>, CUIT 30-71863222-2, con domicilio
            en Boulevard Dr. Arturo Humberto Illia 63, piso 2, dto. D, Nueva Córdoba, ciudad de Córdoba,
            Provincia de Córdoba, Argentina, operadora de consignatarias.com.ar, es la responsable del
            tratamiento de los datos personales que se recolecten a través del Sitio, conforme a la{' '}
            <strong className="text-zinc-200">Ley 25.326 de Protección de Datos Personales</strong> y su
            decreto reglamentario. Contacto en materia de datos personales:{' '}
            <a href="mailto:legales@memola.com.ar" className="text-sky-400 hover:underline">legales@memola.com.ar</a>.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">2. Datos que recolectamos</h2>
          <ul className="text-zinc-400 space-y-1 list-disc list-inside">
            <li>Email al suscribirte al newsletter de faena o a las alertas (alerta de precio por umbral, cierre mensual de arrendamiento).</li>
            <li>Datos de cuenta al registrarte, incluidos los que nos comparte Google al iniciar sesión con tu cuenta de Google (nombre, email y foto de perfil).</li>
            <li>Datos de facturación al contratar un plan Enterprise (API/MCP) o PRO Consignataria (procesados por el proveedor de pagos; no almacenamos números completos de tarjeta).</li>
            <li>Claves de API (API keys) y registros de uso, para usuarios Enterprise.</li>
            <li>Datos de uso y métricas: Google Analytics 4, vistas de perfil y referrals de IA (de qué motor o asistente —p. ej. ChatGPT o Copilot— proviene cada visita).</li>
            <li>Contenido que declarás en el observatorio: watchlists del intel de mercado, tu rodeo en «Mi Ganado» y las marcas de remates que seguís o publicás.</li>
            <li>Datos técnicos: dirección IP, tipo de navegador (user-agent) y registros de actividad, para seguridad, prevención de abusos y diagnóstico.</li>
          </ul>
          <p className="text-zinc-400 mt-2">
            La carga de datos es voluntaria. La negativa a proporcionar ciertos datos puede impedir el uso de
            funcionalidades que los requieran (p. ej. crear una cuenta o contratar un plan).
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">3. Finalidad y base del tratamiento</h2>
          <p className="text-zinc-400">
            Tratamos los datos para: operar el observatorio y la cuenta del usuario; guardar sus watchlists,
            su rodeo en «Mi Ganado» y sus marcas de remates; enviar el newsletter y las alertas a las que el
            usuario se suscribió (alerta de precio por umbral, cierre mensual de arrendamiento, faena) y
            comunicaciones relativas a su cuenta y a la prestación del servicio; procesar y facturar
            suscripciones; gestionar el uso de la API y del servidor MCP; prevenir fraudes y abusos; y elaborar
            métricas agregadas. El tratamiento se realiza con el consentimiento libre, expreso e
            informado del titular (arts. 5 y 6 de la Ley 25.326), prestado al crear una cuenta, suscribirse o
            contratar un plan. <strong className="text-zinc-200">No vendemos ni cedemos datos personales a
            terceros con fines publicitarios.</strong>
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">4. Datos de directorio y fuentes públicas</h2>
          <p className="text-zinc-400">
            La información de consignatarias, frigoríficos y actores del mercado publicada en el directorio
            proviene de fuentes de acceso público y oficiales (SENASA, MAGYP, registros y sitios oficiales) y
            corresponde, en su mayor parte, a datos de personas jurídicas o a información comercial pública. No
            constituye una base de datos comercializada con fines publicitarios. Las solicitudes de corrección
            o remoción de perfiles se gestionan según el{' '}
            <Link href="/aviso-legal" className="text-sky-400 hover:underline">Aviso Legal</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">5. Tus derechos (acceso, rectificación, supresión)</h2>
          <p className="text-zinc-400">
            Conforme a la Ley 25.326, el titular de los datos tiene derecho a acceder, rectificar, actualizar y
            suprimir sus datos personales, así como a oponerse a su tratamiento en los casos previstos por la
            ley. Para ejercerlos, escribí a{' '}
            <a href="mailto:legales@memola.com.ar" className="text-sky-400 hover:underline">legales@memola.com.ar</a>.
            Responderemos el acceso dentro de los 10 días corridos y la rectificación o supresión dentro de los
            5 días hábiles, conforme a los plazos legales. Podés darte de baja del newsletter y de las alertas en
            cualquier momento desde el enlace de cada email o desde tu cuenta, y solicitar la eliminación de tu
            cuenta y de los datos no sujetos a conservación legal escribiéndonos a la casilla indicada. El titular
            puede asimismo realizar denuncias o reclamos ante la <strong className="text-zinc-200">Agencia de
            Acceso a la Información Pública (AAIP)</strong>, órgano de control de la Ley 25.326.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">6. Cookies</h2>
          <p className="text-zinc-400">
            Usamos cookies estrictamente necesarias (sesión y autenticación) y cookies de analítica (Google
            Analytics). El usuario puede bloquear o eliminar las cookies desde la configuración de su navegador;
            ello puede afectar el funcionamiento de algunas funcionalidades.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">7. Encargados y transferencias internacionales</h2>
          <p className="text-zinc-400">
            Algunos datos son tratados por encargados que prestan servicios a Memola: Supabase (autenticación y
            base de datos), Vercel (hosting), Resend (emails transaccionales), el proveedor de pagos (Rebill) y
            Google Analytics (métricas). Algunos de estos proveedores pueden alojar datos fuera de la Argentina;
            en tales casos, las transferencias se realizan procurando niveles de protección adecuados conforme a
            la Ley 25.326 y a las disposiciones de la AAIP. Cada proveedor cuenta con sus propias políticas de
            privacidad.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">8. Conservación</h2>
          <p className="text-zinc-400">
            Conservamos los datos mientras la cuenta esté activa y, luego, por los plazos necesarios para
            cumplir obligaciones legales, fiscales y contables (en general, hasta 5 y 10 años según la
            obligación). Al cerrar la cuenta, el usuario puede solicitar la supresión de los datos no sujetos a
            conservación legal.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">9. Seguridad</h2>
          <p className="text-zinc-400">
            Adoptamos medidas técnicas y organizativas razonables para proteger los datos personales contra
            acceso no autorizado, pérdida o alteración. Ningún sistema es completamente infalible; en caso de
            incidente de seguridad relevante, actuaremos conforme a la normativa aplicable.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">10. Menores</h2>
          <p className="text-zinc-400">
            El Sitio está dirigido a personas mayores de edad y a profesionales del sector. No recolectamos
            deliberadamente datos de menores de edad.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">11. Cambios en esta política</h2>
          <p className="text-zinc-400">
            Podemos actualizar esta Política de Privacidad. Las modificaciones rigen desde su publicación en el
            Sitio, con indicación de la fecha de última actualización.
          </p>
        </section>
      </div>

      <p className="text-zinc-600 text-xs mt-12 flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/terminos" className="hover:text-zinc-400">← Términos y condiciones</Link>
        <Link href="/aviso-legal" className="hover:text-zinc-400">Aviso legal y descargo →</Link>
      </p>
    </div>
  )
}
