import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Página no encontrada',
  description: 'La página que buscás no existe o fue movida. Navegá nuestro calendario de remates, directorio de consignatarias o frigoríficos.',
  robots: {
    index: false,
    follow: true,
  },
}

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 bg-slate-950">
      <div className="text-center max-w-md">
        {/* Error code */}
        <div className="mb-6">
          <span className="text-6xl font-mono font-bold text-zinc-700">404</span>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-semibold text-zinc-100 mb-3">
          Página no encontrada
        </h1>
        <p className="text-zinc-400 mb-8">
          La página que buscás no existe, fue movida o el enlace está incorrecto.
        </p>

        {/* Navigation options */}
        <div className="space-y-3">
          <Link
            href="/remates"
            className="block w-full px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg transition-colors"
          >
            Ver calendario de remates
          </Link>
          <Link
            href="/consignatarias"
            className="block w-full px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium rounded-lg transition-colors"
          >
            Buscar consignatarias
          </Link>
          <Link
            href="/overview"
            className="block w-full px-6 py-3 border border-zinc-700 hover:border-zinc-600 text-zinc-300 font-medium rounded-lg transition-colors"
          >
            Ir al inicio
          </Link>
        </div>

        {/* Help text */}
        <p className="text-zinc-500 text-sm mt-8">
          ¿Creés que esto es un error?{' '}
          <a
            href="mailto:soporte@consignatarias.com.ar"
            className="text-sky-400 hover:text-sky-300 underline"
          >
            Contactanos
          </a>
        </p>
      </div>
    </div>
  )
}
