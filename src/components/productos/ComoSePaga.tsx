import Link from 'next/link'

/**
 * ComoSePaga — el bloque de pago, compartido por todos los sales pages.
 *
 * POR QUÉ ESTÁ EN UN SOLO LUGAR
 * Lo que se promete sobre el pago es lo primero que se rompe cuando hay varias páginas
 * diciendo cada una lo suyo. Acá vive una sola versión, y cambia en un solo archivo.
 *
 * SOBRE LOS MEDIOS DE PAGO — lo que se afirma y por qué
 * La integración cobra con `paymentMethods: [{ methods: ['card'], currency: 'ARS' }]`
 * (`src/lib/rebill.ts`): **tarjeta, en pesos**. No hay transferencia, billetera ni efectivo
 * habilitados hoy; si se habilitan, se agregan acá.
 *
 * Sobre tarjetas emitidas en el exterior: Rebill procesa como comercio local argentino, y
 * su propia documentación advierte que el procesamiento internacional puede rechazar hasta
 * la mitad de los pagos. Por eso **no se promete que funcione cualquier tarjeta del
 * mundo**: se dice que el cobro es local en pesos y que una tarjeta del exterior depende de
 * que su banco autorice un consumo en Argentina. Prometer lo otro deja al comprador varado
 * en un rechazo del que ni siquiera nos enteramos.
 */
export function ComoSePaga({ precio, modalidad }: { precio: string; modalidad: 'suscripcion' | 'compra-unica' }) {
  return (
    <section className="my-10 rounded-lg border border-slate-800 bg-slate-950/60 p-6" id="como-se-paga">
      <h2 className="text-lg font-semibold text-slate-100">Cómo se paga</h2>

      <ol className="mt-5 space-y-4">
        {[
          {
            n: 1,
            t: 'Dejás tu email',
            d: 'Es la llave de tu compra: con ese mail entrás después a bajar el informe cuantas veces quieras. No hace falta crear una cuenta antes.',
          },
          {
            n: 2,
            t: 'Pagás con tarjeta',
            d: `${precio}, en pesos. Te lleva a la pantalla de Rebill, nuestro procesador de pagos. Los datos de la tarjeta los recibe Rebill: nosotros no los vemos ni los guardamos.`,
          },
          {
            n: 3,
            t: 'Volvés al sitio con el informe disponible',
            d: 'La compra queda registrada al instante. Además te mandamos un mail con el enlace.',
          },
          {
            n: 4,
            t: 'Lo bajás cuando quieras',
            d:
              modalidad === 'compra-unica'
                ? 'El PDF sale con tu email impreso. Queda en tu cuenta para siempre: no vence, no se renueva y no se cancela porque no es una suscripción.'
                : 'Mientras la suscripción esté activa. Se cancela cuando quieras, sin llamar a nadie.',
          },
        ].map((p) => (
          <li key={p.n} className="flex gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sky-700 text-sm font-semibold text-sky-400">
              {p.n}
            </span>
            <div>
              <p className="font-medium text-slate-200">{p.t}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-400">{p.d}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-7 grid gap-5 border-t border-slate-800 pt-6 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Con qué se puede pagar</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-400">
            <li>· Tarjeta de crédito — Visa, Mastercard y American Express</li>
            <li>· Tarjeta de débito</li>
            <li>· En cuotas, si tu banco las ofrece para ese importe</li>
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            El cobro se hace en pesos argentinos, como comercio local. Una tarjeta emitida en
            el exterior puede usarse, pero la aprobación depende de que el banco emisor
            autorice un consumo en Argentina. Si te rechaza,{' '}
            <a href="mailto:agro@memola.com.ar" className="text-sky-400 underline underline-offset-2">
              escribinos
            </a>{' '}
            y lo resolvemos por otra vía.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-200">Factura</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Si necesitás factura A para computar el gasto, cargás razón social y CUIT en el
            mismo paso de la compra. La emite <strong className="text-slate-300">Memola Medios S.A.S.</strong>{' '}
            (CUIT 30-71863222-2). Si no la pedís, la compra sigue igual.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Tenés derecho de arrepentimiento por 10 días corridos.{' '}
            <Link href="/arrepentimiento" className="text-sky-400 underline underline-offset-2">
              Cómo ejercerlo
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  )
}
