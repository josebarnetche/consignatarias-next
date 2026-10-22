import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description:
    'Cómo Memola Medios S.A.S. recolecta, usa y protege tus datos personales en consignatarias.com.ar, conforme a la Ley 25.326 de Protección de Datos Personales.',
  alternates: { canonical: 'https://www.consignatarias.com.ar/privacidad' },
}

const UPDATED = '22 de octubre de 2026'

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
            <li>Pedidos de operación (vender o comprar hacienda, ofrecer o buscar campo, pedir una tasación o escribirle a un frigorífico): nombre, email, teléfono o WhatsApp si lo dejás, CUIT y razón social cuando se piden, y los datos del pedido (categoría, cabezas, hectáreas, zona, precio pretendido, mensaje).</li>
            <li>Pedidos de compra para recibir avisos de remates: email, categoría, cantidad y provincia.</li>
            <li>Los correos que intercambiás con nosotros sobre un pedido, incluida tu respuesta a una oferta (por ejemplo, &ldquo;ACEPTO&rdquo; o &ldquo;BAJA&rdquo;), que guardamos como constancia.</li>
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
            suscripciones; gestionar el uso de la API y del servidor MCP; trabajar los pedidos de operación
            (buscar la contraparte, ofrecer el pedido sin datos de contacto, presentar a las partes y registrar el
            cierre); verificar cuando corresponde, con el CUIT y en fuentes públicas como la Central de Deudores del BCRA, los
            antecedentes de quien vende o compra antes de presentarlo; prevenir fraudes y abusos; y elaborar
            métricas agregadas. La página pública de demanda (/mercado/demanda) muestra solo rangos agregados por
            categoría y región, nunca datos de una persona. El tratamiento se realiza con el consentimiento libre, expreso e
            informado del titular (arts. 5 y 6 de la Ley 25.326), prestado al crear una cuenta, suscribirse o
            contratar un plan. <strong className="text-zinc-200">No vendemos ni cedemos datos personales a
            terceros con fines publicitarios.</strong>
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">4. Pedidos de operación: a quién se comunican tus datos</h2>
          <p className="text-zinc-400">
            Cuando dejás un pedido para vender o comprar hacienda, lo ofrecemos a posibles contrapartes{' '}
            <strong className="text-zinc-200">sin tu nombre ni tus datos de contacto</strong>: solo categoría, cantidad y zona. Tu contacto se
            comunica únicamente a la contraparte que acepta por escrito las condiciones del servicio, para que
            acuerden la operación directamente; esa es la finalidad para la que lo dejaste, y la aceptación queda
            registrada. El CUIT no se publica ni se comunica a terceros fuera de esa presentación.
          </p>
          <ul className="text-zinc-400 space-y-1 list-disc list-inside mt-2">
            <li>
              Si escribís desde la ficha de un frigorífico, tu consulta y tu contacto se envían a esa planta, que
              es a quien te dirigiste.
            </li>
            <li>
              Si dejás un pedido de compra solo para recibir avisos de remates, no te contactamos para armar una
              operación salvo que lo marques expresamente.
            </li>
            <li>
              Los pedidos que llegan a través de asistentes de IA o del servidor MCP pueden traer datos cargados
              por otra persona: no se trabajan hasta que se verifican. Para eso le enviamos un único correo al email
              cargado con un enlace para confirmar el pedido, o lo verifica una persona de nuestro equipo; si no se
              confirma, no volvemos a escribirle por ese pedido. Si recibiste un correo nuestro por un pedido que no
              hiciste, ignoralo, respondelo o escribí a{' '}
              <a href="mailto:legales@memola.com.ar" className="text-sky-400 hover:underline">legales@memola.com.ar</a>{' '}
              y lo eliminamos.
            </li>
            <li>
              Las ofertas se envían desde{' '}
              <code className="text-zinc-300 bg-zinc-900 px-1">agente@consignatarias.com</code>. Respondiendo &ldquo;BAJA&rdquo; no te escribimos más ofertas.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">5. Tratamiento automatizado</h2>
          <p className="text-zinc-400">
            Parte del trabajo de los pedidos lo hace un sistema automatizado: ordena los datos que dejaste, elige a
            qué contrapartes ofrecerlo según categoría y zona, y clasifica las respuestas por email con un modelo
            de inteligencia artificial. Ese sistema no acuerda precios, no firma nada en tu nombre y no toma
            decisiones con efectos jurídicos sobre vos: lo que requiere una decisión pasa a una persona. Podés
            pedir que tu pedido lo atienda directamente una persona escribiendo a{' '}
            <a href="mailto:legales@memola.com.ar" className="text-sky-400 hover:underline">legales@memola.com.ar</a>.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">6. Datos de directorio y fuentes públicas</h2>
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
          <h2 className="text-zinc-100 text-lg font-medium mb-2">7. Tus derechos (acceso, rectificación, supresión)</h2>
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
          <h2 className="text-zinc-100 text-lg font-medium mb-2">8. Cookies</h2>
          <p className="text-zinc-400">
            Usamos cookies estrictamente necesarias (sesión y autenticación) y cookies de analítica (Google
            Analytics). El usuario puede bloquear o eliminar las cookies desde la configuración de su navegador;
            ello puede afectar el funcionamiento de algunas funcionalidades.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">9. Encargados y transferencias internacionales</h2>
          <p className="text-zinc-400">
            Algunos datos son tratados por encargados que prestan servicios a Memola: Supabase (autenticación y
            base de datos), Vercel (hosting y acceso a modelos de IA), Anthropic (el modelo de IA que clasifica
            los correos de los pedidos), Resend (envío de emails), Hostinger (la casilla de correo que recibe las
            respuestas), el proveedor de pagos (Rebill) y Google Analytics (métricas). Los encargados tratan los
            datos solo para prestarnos el servicio. Algunos de estos proveedores pueden alojar datos fuera de la Argentina;
            en tales casos, las transferencias se realizan procurando niveles de protección adecuados conforme a
            la Ley 25.326 y a las disposiciones de la AAIP. Cada proveedor cuenta con sus propias políticas de
            privacidad.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">10. Conservación</h2>
          <p className="text-zinc-400">
            Conservamos los datos mientras la cuenta esté activa y, luego, por los plazos necesarios para
            cumplir obligaciones legales, fiscales y contables (en general, hasta 5 y 10 años según la
            obligación). Al cerrar la cuenta, el usuario puede solicitar la supresión de los datos no sujetos a
            conservación legal. Los pedidos de operación se conservan mientras estén abiertos y hasta 24 meses
            desde el último contacto; las constancias de aceptación y de las operaciones cerradas se guardan
            mientras puedan servir para facturar o defender un reclamo. Podés pedir antes la supresión de un
            pedido que no llegó a presentarse.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">11. Seguridad</h2>
          <p className="text-zinc-400">
            Adoptamos medidas técnicas y organizativas razonables para proteger los datos personales contra
            acceso no autorizado, pérdida o alteración. Ningún sistema es completamente infalible; en caso de
            incidente de seguridad relevante, actuaremos conforme a la normativa aplicable.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">12. Menores</h2>
          <p className="text-zinc-400">
            El Sitio está dirigido a personas mayores de edad y a profesionales del sector. No recolectamos
            deliberadamente datos de menores de edad.
          </p>
        </section>

        <section>
          <h2 className="text-zinc-100 text-lg font-medium mb-2">13. Cambios en esta política</h2>
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
