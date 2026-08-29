import type { Metadata } from 'next'
import Link from 'next/link'
import { getProducto } from '@/lib/productos-datos'

export const metadata: Metadata = {
  title: 'El pago no se completó',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

/**
 * Página de aterrizaje cuando Rebill rechaza o el comprador cancela.
 *
 * Existe porque los links de pago viejos declaran sólo `approved`: una tarjeta rechazada
 * dejaba a la persona varada en el checkout, sin explicación y sin señal de vuelta para
 * nosotros. El escenario más probable es una tarjeta emitida en el exterior — el propio
 * Rebill advierte que el procesamiento internacional rechaza hasta la mitad de los pagos.
 *
 * No cuenta como error del comprador ni le echa la culpa: le dice qué pasó y le deja dos
 * salidas concretas.
 */
export default async function PagoNoCompletado({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string; p?: string }>
}) {
  const { motivo, p } = await searchParams
  const producto = p ? getProducto(p) : null
  const cancelado = motivo === 'cancelado'

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold text-slate-100">
        {cancelado ? 'Cancelaste el pago' : 'El pago no se completó'}
      </h1>

      <p className="mt-4 text-base leading-relaxed text-slate-300">
        {cancelado
          ? 'No se te cobró nada. Podés volver cuando quieras.'
          : 'No se te cobró nada. El banco no autorizó la operación, y eso puede pasar por varios motivos.'}
      </p>

      {!cancelado && (
        <div className="mt-8 rounded-lg border border-slate-800 bg-slate-950/60 p-5">
          <h2 className="text-sm font-semibold text-slate-200">Lo más común</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-400">
            <li>
              · <strong className="text-slate-300">Tarjeta emitida fuera de la Argentina.</strong> El
              cobro se hace en pesos como comercio local, y muchos bancos del exterior
              rechazan ese consumo por seguridad. Suele destrabarse avisándole al banco, o
              usando una tarjeta argentina.
            </li>
            <li>· Límite de compra o saldo insuficiente para el importe.</li>
            <li>· Algún dato de la tarjeta cargado con un error.</li>
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {producto && (
          <Link
            href={producto.landing}
            className="rounded bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500"
          >
            Probar de nuevo
          </Link>
        )}
        <a
          href="mailto:agro@memola.com.ar?subject=No%20pude%20completar%20el%20pago"
          className="rounded border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:border-slate-500"
        >
          Escribinos y lo resolvemos
        </a>
        <Link
          href="/informes"
          className="px-5 py-2.5 text-sm text-slate-400 underline underline-offset-2 hover:text-slate-200"
        >
          Volver a los informes
        </Link>
      </div>

      <p className="mt-10 text-sm text-slate-500">
        Si te llegó un cobro pero no recibiste el informe, escribinos a{' '}
        <a href="mailto:agro@memola.com.ar" className="text-sky-400 underline underline-offset-2">
          agro@memola.com.ar
        </a>{' '}
        con el mail que usaste para comprar y lo destrabamos.
      </p>
    </div>
  )
}
